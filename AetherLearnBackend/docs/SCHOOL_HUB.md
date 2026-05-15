# School Hub

Use:

```bash
docker compose -f infra/docker-compose.school-hub.yml up --build
```

Hub mode sets `SCHOOL_HUB_MODE=true` and routes AI to local hub/Ollama where
available. Trace must show `runtime=local-hub` or `runtime=ollama`,
`localOnly=true`, and `hostedApiUsed=false`.
