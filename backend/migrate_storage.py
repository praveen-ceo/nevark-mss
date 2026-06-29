#!/usr/bin/env python3
"""
One-time migration: copy all objects from local MinIO → Supabase Storage.

Run from the backend/ directory AFTER filling in SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY in your .env file.

Usage:
    pip install minio          # temporary — only needed for this script
    python migrate_storage.py

The script is idempotent: re-running it will skip objects already present
in Supabase Storage and only upload missing ones.
"""

import os
import sys

from dotenv import load_dotenv

load_dotenv()

# ── Supabase (from .env) ─────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = os.environ.get("MINIO_BUCKET_NAME", "nevark-mss")

# ── MinIO local dev defaults ──────────────────────────────────────────────────
# Override via env vars if your local setup uses different credentials.
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"

# ── Pre-flight checks ────────────────────────────────────────────────────────
if not SUPABASE_URL or SUPABASE_URL.startswith("https://[YOUR"):
    sys.exit(
        "ERROR: SUPABASE_URL is not set in .env.\n"
        "       Add: SUPABASE_URL=https://[your-project-ref].supabase.co"
    )

if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY.startswith("[YOUR"):
    sys.exit(
        "ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in .env.\n"
        "       Get it from: Supabase Dashboard → Project Settings → API → service_role"
    )

try:
    from minio import Minio
    from minio.error import S3Error
except ImportError:
    sys.exit(
        "ERROR: minio package not installed.\n"
        "       Run: pip install minio"
    )

try:
    from supabase import create_client
except ImportError:
    sys.exit(
        "ERROR: supabase package not installed.\n"
        "       Run: pip install -r requirements.txt"
    )


# ── Migration ────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"Source : MinIO @ {MINIO_ENDPOINT}  bucket={BUCKET}")
    print(f"Target : Supabase Storage @ {SUPABASE_URL}  bucket={BUCKET}")
    print()

    # Connect
    minio = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE,
    )

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Ensure bucket exists in Supabase (create if missing)
    try:
        existing_buckets = [b.name for b in supabase.storage.list_buckets()]
        if BUCKET not in existing_buckets:
            supabase.storage.create_bucket(BUCKET, options={"public": False})
            print(f"Created Supabase Storage bucket: {BUCKET}\n")
        else:
            print(f"Supabase Storage bucket already exists: {BUCKET}\n")
    except Exception as exc:
        sys.exit(f"ERROR: Could not connect to Supabase Storage: {exc}")

    # Check MinIO bucket exists
    try:
        if not minio.bucket_exists(BUCKET):
            sys.exit(f"ERROR: MinIO bucket '{BUCKET}' does not exist.")
    except S3Error as exc:
        sys.exit(f"ERROR: Could not connect to MinIO: {exc}")

    # List all objects in MinIO
    try:
        objects = list(minio.list_objects(BUCKET, recursive=True))
    except S3Error as exc:
        sys.exit(f"ERROR: Could not list MinIO objects: {exc}")

    if not objects:
        print("MinIO bucket is empty — nothing to migrate.")
        return

    total = len(objects)
    print(f"Found {total} object(s) in MinIO.\n")

    ok = 0
    skipped = 0
    failed = 0
    failed_keys: list[str] = []

    for i, obj in enumerate(objects, 1):
        key = obj.object_name
        size_kb = round((obj.size or 0) / 1024, 1)
        print(f"[{i:>3}/{total}] {key} ({size_kb} KB)", end=" ... ", flush=True)

        try:
            # Download from MinIO
            response = minio.get_object(BUCKET, key)
            content = response.read()
            response.close()
            response.release_conn()

            # Get content-type from MinIO object metadata
            stat = minio.stat_object(BUCKET, key)
            content_type = stat.content_type or "application/octet-stream"

            # Upload to Supabase Storage
            # upsert="true" allows re-runs without duplicate errors
            supabase.storage.from_(BUCKET).upload(
                path=key,
                file=content,
                file_options={"content-type": content_type, "upsert": "true"},
            )
            print(f"OK  [{content_type}]")
            ok += 1

        except Exception as exc:
            err_str = str(exc).lower()
            if "already exists" in err_str or "duplicate" in err_str or "23505" in err_str:
                print("SKIP (already in Supabase)")
                skipped += 1
            else:
                print(f"FAIL — {exc}")
                failed += 1
                failed_keys.append(key)

    # ── Summary ──────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print(f"Migration complete")
    print(f"  Migrated : {ok}")
    print(f"  Skipped  : {skipped}  (already existed in Supabase)")
    print(f"  Failed   : {failed}")

    if failed_keys:
        print()
        print("Failed objects:")
        for k in failed_keys:
            print(f"  - {k}")
        print()
        print("Re-run the script to retry failed objects.")
    else:
        print()
        print("All objects are now in Supabase Storage.")
        print("You can stop the local MinIO container.")


if __name__ == "__main__":
    main()
