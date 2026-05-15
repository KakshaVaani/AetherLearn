class NotificationService:
    def __init__(self, notifications):
        self.notifications = notifications

    async def create(self, data: dict):
        return await self.notifications.create(data)

    async def list_user(self, user_id: str):
        return await self.notifications.list_for_user(user_id)

    async def read(self, notification_id: str):
        return await self.notifications.read(notification_id)
