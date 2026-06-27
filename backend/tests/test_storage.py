"""Tests for the image upload storage service."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.services.storage import save_upload, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE


def _make_upload_file(content: bytes, filename: str = "test.png", content_type: str = "image/png"):
    mock = MagicMock()
    mock.content_type = content_type
    mock.filename = filename
    mock.read = AsyncMock(return_value=content)
    return mock


async def test_save_upload_png():
    file = _make_upload_file(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, "logo.png", "image/png")
    url = await save_upload(file, subdir="test")
    assert url.startswith("/uploads/test/")
    assert url.endswith(".png")


async def test_save_upload_jpeg():
    file = _make_upload_file(b"\xff\xd8\xff\xe0" + b"\x00" * 100, "photo.jpg", "image/jpeg")
    url = await save_upload(file, subdir="test")
    assert url.endswith(".jpg")


async def test_save_upload_rejects_unsupported_type():
    file = _make_upload_file(b"fake", "file.gif", "image/gif")
    url = await save_upload(file, subdir="test")
    assert url.endswith(".gif")

    file_bad = _make_upload_file(b"fake", "file.txt", "text/plain")
    with pytest.raises(ValueError, match="Unsupported image type"):
        await save_upload(file_bad)


async def test_save_upload_rejects_oversized():
    large = b"\x00" * (MAX_IMAGE_SIZE + 1)
    file = _make_upload_file(large, "big.png", "image/png")
    with pytest.raises(ValueError, match="too large"):
        await save_upload(file)


async def test_save_upload_no_subdir():
    file = _make_upload_file(b"\x89PNG" + b"\x00" * 10, "test.png", "image/png")
    url = await save_upload(file)
    assert url.startswith("/uploads/")
    assert "/uploads/test/" not in url


def test_allowed_image_types_includes_common():
    assert "image/jpeg" in ALLOWED_IMAGE_TYPES
    assert "image/png" in ALLOWED_IMAGE_TYPES
    assert "image/webp" in ALLOWED_IMAGE_TYPES


def test_max_image_size_is_5mb():
    assert MAX_IMAGE_SIZE == 5 * 1024 * 1024
