"""Supabase Storage service."""
from __future__ import annotations

import uuid as _uuid

import structlog
from fastapi import UploadFile
from supabase import create_client, Client

from app.core.config import settings

log = structlog.get_logger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _client


def ensure_bucket() -> None:
    client = get_client()
    try:
        buckets = client.storage.list_buckets()
        names = [b.name for b in buckets]
        if settings.MINIO_BUCKET_NAME not in names:
            client.storage.create_bucket(
                settings.MINIO_BUCKET_NAME,
                options={"public": False},
            )
            log.info("storage.bucket_created", bucket=settings.MINIO_BUCKET_NAME)
    except Exception as exc:
        log.error("storage.bucket_ensure_failed", error=str(exc))
        raise RuntimeError(f"Supabase Storage bucket error: {exc}") from exc


def _build_object_key(
    file_name: str,
    related_type: str | None = None,
    related_id: str | None = None,
) -> str:
    """Build deterministic object key: {prefix}/{uuid}_{filename}"""
    prefix = f"{related_type}/{related_id}" if related_type and related_id else "general"
    safe_name = file_name.replace(" ", "_")
    return f"{prefix}/{_uuid.uuid4()}_{safe_name}"


async def upload_file(
    file: UploadFile,
    related_type: str | None = None,
    related_id: str | None = None,
) -> tuple[str, int, str]:
    """
    Upload file to Supabase Storage.
    Returns (object_key, file_size, content_type).
    """
    client = get_client()
    content = await file.read()
    size = len(content)
    content_type = file.content_type or "application/octet-stream"
    object_key = _build_object_key(file.filename or "upload", related_type, related_id)

    try:
        client.storage.from_(settings.MINIO_BUCKET_NAME).upload(
            path=object_key,
            file=content,
            file_options={"content-type": content_type},
        )
        log.info("storage.uploaded", key=object_key, size=size)
    except Exception as exc:
        log.error("storage.upload_failed", error=str(exc))
        raise RuntimeError(f"Upload failed: {exc}") from exc

    return object_key, size, content_type


def get_presigned_url(object_key: str, expires_minutes: int = 15) -> str:
    """Return a signed URL valid for `expires_minutes`."""
    client = get_client()
    expires_seconds = expires_minutes * 60
    try:
        res = client.storage.from_(settings.MINIO_BUCKET_NAME).create_signed_url(
            path=object_key,
            expires_in=expires_seconds,
        )
        url = res.get("signedURL") or res.get("signedUrl") or ""
        if not url:
            raise RuntimeError("Empty signed URL returned from Supabase Storage")
        return url
    except RuntimeError:
        raise
    except Exception as exc:
        log.error("storage.presign_failed", key=object_key, error=str(exc))
        raise RuntimeError(f"Presign failed: {exc}") from exc


def delete_object(object_key: str) -> None:
    client = get_client()
    try:
        client.storage.from_(settings.MINIO_BUCKET_NAME).remove([object_key])
        log.info("storage.deleted", key=object_key)
    except Exception as exc:
        log.warning("storage.delete_failed", key=object_key, error=str(exc))
        # Non-fatal — DB soft-delete proceeds regardless
