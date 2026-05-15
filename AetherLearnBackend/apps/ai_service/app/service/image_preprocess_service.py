from __future__ import annotations

import base64

from ..tools.image_quality import check_image_quality, resize_image


def preprocess_image(content: bytes) -> dict:
    resized = resize_image(content)
    return {
        "imageBytesB64": base64.b64encode(resized).decode("ascii"),
        "qualityWarnings": check_image_quality(content),
    }
