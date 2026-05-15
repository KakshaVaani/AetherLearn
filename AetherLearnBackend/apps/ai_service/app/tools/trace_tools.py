from __future__ import annotations

from shared_schemas import GemmaTrace, RuntimeMode, SchemaStatus


def create_trace(
    runtime: RuntimeMode, model: str, latency_ms: int, *, fallback: bool = False
) -> GemmaTrace:
    return GemmaTrace(
        runtime=runtime,
        model=model,
        local_only=runtime in {RuntimeMode.MOCK, RuntimeMode.OLLAMA, RuntimeMode.LOCAL_HUB},
        hosted_api_used=runtime == RuntimeMode.GEMINI,
        latency_ms=latency_ms,
        schema_status=SchemaStatus.FALLBACK if fallback else SchemaStatus.PASSED,
        fallback_used=fallback,
    )
