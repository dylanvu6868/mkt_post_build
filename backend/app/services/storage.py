import os
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


async def save_upload(file: UploadFile, subdir: str = "") -> str:
    """Save an uploaded image and return its public URL path.

    Returns a relative path like ``/uploads/landing/abc123.webp`` that can
    be served by FastAPI StaticFiles or prepended with the API base URL.
    """
    mime = file.content_type or "image/jpeg"
    if mime not in ALLOWED_IMAGE_TYPES:
        raise ValueError(f"Unsupported image type: {mime}")

    data = await file.read()
    if len(data) > MAX_IMAGE_SIZE:
        raise ValueError("Image too large (max 5MB)")

    ext = mime.split("/")[-1]
    if ext == "jpeg":
        ext = "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"

    dest_dir = UPLOAD_DIR / subdir if subdir else UPLOAD_DIR
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / filename
    dest.write_bytes(data)

    url_path = f"/uploads/{subdir}/{filename}" if subdir else f"/uploads/{filename}"
    return url_path
