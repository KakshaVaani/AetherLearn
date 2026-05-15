# Deployment

Expose only the API Gateway publicly. Internal services, MongoDB, NATS, Redis,
and object storage should be on private networks.

Required production secrets:

- `INTERNAL_SERVICE_SECRET`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- runtime keys such as `GEMINI_API_KEY` only if hosted AI is enabled

Run indexes before traffic and seed only when demo data is explicitly enabled.
