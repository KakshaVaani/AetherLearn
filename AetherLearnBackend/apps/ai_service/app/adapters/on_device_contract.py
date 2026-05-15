from __future__ import annotations

from shared_utils.errors import AiRuntimeUnavailableError


class OnDeviceContract:
    async def analyze_on_device(self, *_args, **_kwargs):
        raise AiRuntimeUnavailableError(
            "On-device generation is a future contract and is not faked"
        )
