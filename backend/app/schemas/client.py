import re
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class ContactBrief(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_primary: bool
    model_config = {"from_attributes": True}


class ClientCreate(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("tax_id")
    @classmethod
    def validate_gst(cls, v):
        if v and not re.fullmatch(
            r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$",
            v.upper()
        ):
            raise ValueError("Invalid GSTIN")
        return v.upper()
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.fullmatch(r"^[6-9]\d{9}$", v):
         raise ValueError("Invalid phone number")
        return v

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("tax_id")
    @classmethod
    def validate_gst(cls, v):
        if v and not re.fullmatch(
            r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$",
            v.upper()
        ):
            raise ValueError("Invalid GSTIN")
        return v.upper()
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not re.fullmatch(r"^[6-9]\d{9}$", v):
         raise ValueError("Invalid phone number")
        return v


class ClientResponse(BaseModel):
    id: UUID
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    contacts: List[ContactBrief] = []
    model_config = {"from_attributes": True}
