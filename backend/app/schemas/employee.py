from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID
from pydantic import field_validator
import re
from pydantic import BaseModel, EmailStr

from app.models.enums import EmploymentType


class DepartmentBrief(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    is_active: bool
    model_config = {"from_attributes": True}


class EmployeeCreate(BaseModel):
    # Linked user account
    email: EmailStr
    full_name: str
    password: str = "Nevark@2025"
    # Employee record
    first_name: str
    last_name: str
    job_title: Optional[str] = None
    department_id: Optional[UUID] = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    hire_date: date
    phone: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[Decimal] = None
    # Optional role assignment (role name, e.g. "employee", "hr_manager")
    role: Optional[str] = None

    @field_validator("full_name", "first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.fullmatch(r"^[6-9]\d{9}$", v):
            raise ValueError("Invalid mobile number")
        return v


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None          # propagated to user.full_name
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    job_title: Optional[str] = None
    department_id: Optional[UUID] = None
    employment_type: Optional[EmploymentType] = None
    hire_date: Optional[date] = None
    termination_date: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    salary: Optional[Decimal] = None
    is_active: Optional[bool] = None

    @field_validator("full_name", "first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must contain at least 2 characters")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.fullmatch(r"^[6-9]\d{9}$", v):
            raise ValueError("Invalid mobile number")
        return v


class EmployeeResponse(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    job_title: Optional[str] = None
    employment_type: EmploymentType
    hire_date: date
    termination_date: Optional[date] = None
    phone: Optional[str] = None
    salary: Optional[Decimal] = None
    department: Optional[DepartmentBrief] = None
    user: UserBrief
    is_active: bool
    model_config = {"from_attributes": True}
