# Database Ownership

Each service owns one MongoDB database:

- `aetherlearn_auth`
- `aetherlearn_school`
- `aetherlearn_lessons`
- `aetherlearn_ai`
- `aetherlearn_assignments`
- `aetherlearn_commons`
- `aetherlearn_review`
- `aetherlearn_sync`
- `aetherlearn_exports`
- `aetherlearn_notifications`
- `aetherlearn_storage`

Run `uv run python scripts/create_indexes.py` to create indexes.
