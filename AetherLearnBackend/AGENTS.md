# AetherLearn Agent Notes

This repository is Python-only. Use FastAPI, Pydantic v2, PyMongo async
(`pymongo.asynchronous.AsyncMongoClient`), nats.py, uv, Ruff, mypy, and pytest.

Public clients talk only to `apps/api_gateway`. Internal calls must use the
HMAC service-auth headers from `packages/service_auth`. Services own their own
MongoDB databases and must not query another service database directly.
