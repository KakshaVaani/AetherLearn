# AI Runtime

Runtime modes:

- `gemini`: hosted Gemini/Gemma-compatible API, server-side API key
- `ollama`: local Ollama runtime
- `local-hub`: school hub runtime, local-only trace
- `mock`: deterministic development/runtime fallback
- `auto`: local hub, Gemini, Ollama, then mock if fallback is allowed

Gemma Trace records runtime, model, latency, schema status, fallback use,
hosted API use, local-only status, image metadata, warnings, and confidence
notes. Mock output never pretends to be Gemma output.
