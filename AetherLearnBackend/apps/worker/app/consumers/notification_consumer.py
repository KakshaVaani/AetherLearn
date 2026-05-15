async def handle_notification_event(event):
    return {"handled": True, "eventId": event.event_id}
