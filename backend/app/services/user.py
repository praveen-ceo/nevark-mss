from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password, verify_password
from app.models.auth import User
from app.models.employee import Employee
from app.schemas.user import (
    PasswordChangeRequest,
    PasswordChangeResponse,
    ProfileResponse,
    ProfileUpdate,
)


# ---------------------------------------------------------------------------
# Internal helper — fetch Employee with department eagerly loaded
# ---------------------------------------------------------------------------

async def _fetch_employee(db: AsyncSession, user_id: uuid.UUID) -> Optional[Employee]:
    """Return the Employee row linked to user_id, with department selectinloaded."""
    result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(
            Employee.user_id == user_id,
            Employee.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Build flat ProfileResponse — no lazy loads
# ---------------------------------------------------------------------------

def _build_profile(user: User, emp: Optional[Employee]) -> ProfileResponse:
    dept_id = None
    dept_name = None
    if emp is not None and emp.department is not None:
        dept_id = emp.department.id
        dept_name = emp.department.name

    return ProfileResponse(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        employee_id=emp.id if emp else None,
        employee_code=emp.employee_code if emp else None,
        first_name=emp.first_name if emp else None,
        last_name=emp.last_name if emp else None,
        phone=emp.phone if emp else None,
        address=emp.address if emp else None,
        job_title=emp.job_title if emp else None,
        department_id=dept_id,
        department_name=dept_name,
    )


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

async def get_my_profile(db: AsyncSession, user: User) -> ProfileResponse:
    """Return the current user's profile."""
    emp = await _fetch_employee(db, user.id)
    return _build_profile(user, emp)


async def update_my_profile(
    db: AsyncSession, user: User, data: ProfileUpdate
) -> ProfileResponse:
    """
    Update User and/or Employee fields from the provided data.
    Only fields explicitly set (not None) are written.
    """
    patch = data.model_dump(exclude_none=True)

    # ── Update User fields ────────────────────────────────────────────────
    if "full_name" in patch:
        user.full_name = patch["full_name"]
    if "email" in patch:
        # Check uniqueness
        existing = await db.scalar(
            select(User).where(User.email == patch["email"], User.id != user.id)
        )
        if existing:
            raise ValueError("Email address is already in use by another account.")
        user.email = str(patch["email"])

    # ── Update Employee fields ────────────────────────────────────────────
    emp_fields = {"first_name", "last_name", "phone", "address", "job_title", "department_id"}
    emp_patch = {k: v for k, v in patch.items() if k in emp_fields}

    emp: Optional[Employee] = None
    if emp_patch:
        emp = await _fetch_employee(db, user.id)
        if emp is None:
            raise ValueError(
                "No employee record found for this account. "
                "Contact an administrator to link your employee profile."
            )
        for field, value in emp_patch.items():
            setattr(emp, field, value)

    await db.commit()

    # Re-fetch employee (department may have changed) — avoid stale state
    emp = await _fetch_employee(db, user.id)
    return _build_profile(user, emp)


async def change_my_password(
    db: AsyncSession, user: User, data: PasswordChangeRequest
) -> PasswordChangeResponse:
    """Verify current password, hash new password, persist."""
    if not verify_password(data.current_password, user.hashed_password):
        raise ValueError("Current password is incorrect.")

    user.hashed_password = hash_password(data.new_password)
    await db.commit()

    return PasswordChangeResponse(message="Password changed successfully.")
