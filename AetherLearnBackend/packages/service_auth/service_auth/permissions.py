from __future__ import annotations

from collections.abc import Iterable

from shared_schemas import UserRole
from shared_utils.errors import ForbiddenError, UnauthorizedError

from .user_context import UserContext


def require_auth(context: UserContext | None) -> UserContext:
    if context is None:
        raise UnauthorizedError("Authentication required")
    return context


def require_role(context: UserContext | None, roles: Iterable[str | UserRole]) -> UserContext:
    context = require_auth(context)
    allowed = {str(role.value if isinstance(role, UserRole) else role) for role in roles}
    if context.role not in allowed:
        raise ForbiddenError(
            "Insufficient role", {"required": sorted(allowed), "actual": context.role}
        )
    return context


def require_teacher(context: UserContext | None) -> UserContext:
    return require_role(context, [UserRole.TEACHER, UserRole.EDUCATOR, UserRole.SCHOOL_ADMIN])


def require_student(context: UserContext | None) -> UserContext:
    return require_role(context, [UserRole.STUDENT])


def require_reviewer(context: UserContext | None) -> UserContext:
    return require_role(context, [UserRole.REVIEWER, UserRole.PLATFORM_ADMIN])


def require_platform_admin(context: UserContext | None) -> UserContext:
    return require_role(context, [UserRole.PLATFORM_ADMIN])


def require_teacher_for_class(
    context: UserContext | None, teacher_ids: Iterable[str]
) -> UserContext:
    context = require_teacher(context)
    if context.user_id not in set(teacher_ids) and context.role != UserRole.SCHOOL_ADMIN:
        raise ForbiddenError("Teacher is not assigned to this class")
    return context


def require_student_enrollment(
    context: UserContext | None, student_ids: Iterable[str]
) -> UserContext:
    context = require_student(context)
    if context.user_id not in set(student_ids):
        raise ForbiddenError("Student is not enrolled")
    return context


def require_student_lesson_assignment(
    context: UserContext | None, assigned_student_ids: Iterable[str]
) -> UserContext:
    return require_student_enrollment(context, assigned_student_ids)


def require_lesson_owner(context: UserContext | None, owner_id: str) -> UserContext:
    context = require_auth(context)
    if context.user_id != owner_id and context.role not in {
        UserRole.SCHOOL_ADMIN,
        UserRole.PLATFORM_ADMIN,
    }:
        raise ForbiddenError("Lesson owner required")
    return context


def require_commons_published(visibility: str, status: str) -> None:
    if visibility != "commons" or status != "published":
        raise ForbiddenError("Commons lesson is not published")
