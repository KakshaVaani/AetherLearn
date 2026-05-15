from __future__ import annotations

from shared_schemas import RuntimeMode

from .ollama_adapter import OllamaAdapter


class LocalHubAdapter(OllamaAdapter):
    name = "local-hub"
    runtime = RuntimeMode.LOCAL_HUB
