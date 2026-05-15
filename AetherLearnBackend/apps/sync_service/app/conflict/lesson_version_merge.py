def choose_latest_version(server: dict, client: dict) -> dict:
    return client if int(client.get("version", 0)) > int(server.get("version", 0)) else server
