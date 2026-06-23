from __future__ import annotations

import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class ProfileResponse(BaseModel):
    """Flat profile — no ORM relationships, safe for async serialization."""
    model_config = ConfigDict(from_attributes=False)

    # User fields
    user_id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool

    # Employee fields (None if user has no employee record)
    employee_id: Optional[UUID] = None
    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[UUID] = None
    department_name: Optional[str] = None


class ProfileUpdate(BaseModel):
    """All fields optional — only provided fields are updated."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = None
    address: Optional[str] = None
    job_title: Optional[str] = Field(None, max_length=200)
    department_id: Optional[UUID] = None

    @field_validator("full_name", "first_name", "last_name", mode="before")
    @classmethod
    def strip_and_reject_blank(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            if v == "":
                raise ValueError("Name fields must not be empty if provided.")
        return v

    @field_validator("phone", mode="before")
    @classmethod
    def validate_phone(cls, v: object) -> object:
        if v is None:
            return v
        if isinstance(v, str) and v.strip() == "":
            return None
        pattern = r"^[6-9]\d{9}$"
        if not re.match(pattern, str(v)):
            raise ValueError(
                "Phone must be a valid Indian mobile number (10 digits starting with 6-9)."
            )
        return v


# ---------------------------------------------------------------------------
# Password change
# ---------------------------------------------------------------------------

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, description="Minimum 8 characters")
    confirm_password: str = Field(..., min_length=1)

    @field_validator("confirm_password", mode="after")
    @classmethod
    def passwords_match(cls, v: str, info: object) -> str:
        data = getattr(info, "data", {})
        if "new_password" in data and v != data["new_password"]:
            raise ValueError("new_password and confirm_password do not match.")
        return v


class PasswordChangeResponse(BaseModel):
    message: str
