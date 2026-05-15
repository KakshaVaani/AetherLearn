from __future__ import annotations

from pydantic import BaseModel


class UserCreated(BaseModel):
    user_id: str
    role: str
    email: str


class UserLoggedIn(BaseModel):
    user_id: str


class UserRoleChanged(BaseModel):
    user_id: str
    old_role: str
    new_role: str


class UserProfileUpdated(BaseModel):
    user_id: str


class UserDeactivated(BaseModel):
    user_id: str
