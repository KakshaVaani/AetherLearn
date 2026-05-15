# Testing

Commands:

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy .
uv run pytest
uv run pytest tests/integration
uv run python scripts/smoke_test.py
```

The unit suite validates schemas, trace honesty, HMAC signatures, password/JWT
security, event contracts, image validation, `.kvpack`, ObjectIds, and sync
merge rules.
