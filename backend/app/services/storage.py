"""MinIO storage service."""
from __future__ import annotations

import io
import uuid as _uuid
from datetime import timedelta

import structlog
from fastapi import UploadFile
from minio import Minio
from minio.error import S3Error

from app.core.config import settings

log = structlog.get_logger(__name__)

_client: Minio | None = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
    return _client


def ensure_bucket() -> None:
    client = get_client()
    try:
        if not client.bucket_exists(settings.MINIO_BUCKET_NAME):
            client.make_bucket(settings.MINIO_BUCKET_NAME)
            log.info("storage.bucket_created", bucket=settings.MINIO_BUCKET_NAME)
    except S3Error as exc:
        log.error("storage.bucket_ensure_failed", error=str(exc))
        raise RuntimeError(f"MinIO bucket error: {exc}") from exc


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
    Upload file to MinIO.
    Returns (object_key, file_size, content_type).
    """
    client = get_client()
    content = await file.read()
    size = len(content)
    content_type = file.content_type or "application/octet-stream"
    object_key = _build_object_key(file.filename or "upload", related_type, related_id)

    try:
        client.put_object(
            settings.MINIO_BUCKET_NAME,
            object_key,
            io.BytesIO(content),
            length=size,
            content_type=content_type,
        )
        log.info("storage.uploaded", key=object_key, size=size)
    except S3Error as exc:
        log.error("storage.upload_failed", error=str(exc))
        raise RuntimeError(f"Upload failed: {exc}") from exc

    return object_key, size, content_type


def get_presigned_url(object_key: str, expires_minutes: int = 15) -> str:
    """Return a pre-signed GET URL valid for `expires_minutes`."""
    client = get_client()
    try:
        return client.presigned_get_object(
            settings.MINIO_BUCKET_NAME,
            object_key,
            expires=timedelta(minutes=expires_minutes),
        )
    except S3Error as exc:
        log.error("storage.presign_failed", key=object_key, error=str(exc))
        raise RuntimeError(f"Presign failed: {exc}") from exc


def delete_object(object_key: str) -> None:
    client = get_client()
    try:
        client.remove_object(settings.MINIO_BUCKET_NAME, object_key)
        log.info("storage.deleted", key=object_key)
    except S3Error as exc:
        log.warning("storage.delete_failed", key=object_key, error=str(exc))
        # Non-fatal — DB soft-delete proceeds regardless
