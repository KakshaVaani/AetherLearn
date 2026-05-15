def true_wins_merge(server: dict, client: dict) -> dict:
    merged = dict(server)
    for key, value in client.items():
        if isinstance(value, bool):
            merged[key] = bool(server.get(key)) or value
        else:
            merged[key] = value
    return merged
