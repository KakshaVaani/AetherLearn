from .progress_merge import true_wins_merge


def resolve_conflict(operation_type: str, server: dict, client: dict) -> dict:
    if operation_type == "UPDATE_PROGRESS":
        return true_wins_merge(server, client)
    return server | {"conflictWarning": "Server state kept; manual review may be needed."}
