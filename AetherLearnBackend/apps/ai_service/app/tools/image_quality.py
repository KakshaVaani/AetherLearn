from __future__ import annotations

from io import BytesIO

from PIL import Image


def check_image_quality(content: bytes) -> list[str]:
    warnings: list[str] = []
    with Image.open(BytesIO(content)) as image:
        width, height = image.size
    if width < 640 or height < 480:
        warnings.append("Image resolution is low; small handwriting may be unclear.")
    return warnings


def resize_image(content: bytes, max_side: int = 1600) -> bytes:
    with Image.open(BytesIO(content)) as image:
        image.thumbnail((max_side, max_side))
        output = BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()
