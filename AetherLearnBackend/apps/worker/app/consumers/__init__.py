async def handle_sync_event(event):
    return {"handled": True, "eventId": event.event_id}
