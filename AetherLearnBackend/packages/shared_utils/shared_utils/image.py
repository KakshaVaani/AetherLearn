from __future__ import annotations

from io import BytesIO

from PIL import Image, UnidentifiedImageError

from .errors import ImageTooLargeError, UnsupportedImageTypeError

SUPPORTED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def validate_image_upload(content: bytes, mime_type: str, max_mb: int) -> dict[str, int | str]:
    if mime_type not in SUPPORTED_IMAGE_TYPES:
        raise UnsupportedImageTypeError("Unsupported image type", {"mimeType": mime_type})
    max_bytes = max_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise ImageTooLargeError("Image is too large", {"maxMb": max_mb})
    try:
        with Image.open(BytesIO(content)) as image:
            width, height = image.size
            image.verify()
    except UnidentifiedImageError as exc:
        raise UnsupportedImageTypeError("Invalid image data") from exc
    return {"mimeType": mime_type, "bytes": len(content), "width": width, "height": height}
