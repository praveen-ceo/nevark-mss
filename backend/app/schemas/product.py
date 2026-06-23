from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.enums import ProductCategory, ProductStatus, ProductStream


class ProductCreate(BaseModel):
    name: str
    product_code: str
    category: ProductCategory
    stream: ProductStream
    status: ProductStatus = ProductStatus.ACTIVE
    description: Optional[str] = None
    launch_date: Optional[date] = None
    revenue_generated: Optional[Decimal] = None
    units_sold: Optional[int] = None
    active_units: Optional[int] = None
    total_customers: Optional[int] = None
    product_owner_id: Optional[UUID] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError("Product name must be at least 2 characters.")
        return v.strip()

    @field_validator("product_code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if not v or len(v.strip()) < 2:
            raise ValueError("Product code must be at least 2 characters.")
        return v.strip().upper()

    @field_validator("revenue_generated")
    @classmethod
    def validate_revenue(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Revenue cannot be negative.")
        return v

    @field_validator("units_sold", "active_units", "total_customers")
    @classmethod
    def validate_non_negative_int(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Value cannot be negative.")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_code: Optional[str] = None
    category: Optional[ProductCategory] = None
    stream: Optional[ProductStream] = None
    status: Optional[ProductStatus] = None
    description: Optional[str] = None
    launch_date: Optional[date] = None
    revenue_generated: Optional[Decimal] = None
    units_sold: Optional[int] = None
    active_units: Optional[int] = None
    total_customers: Optional[int] = None
    product_owner_id: Optional[UUID] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 2:
            raise ValueError("Product name must be at least 2 characters.")
        return v.strip() if v else v

    @field_validator("product_code")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 2:
            raise ValueError("Product code must be at least 2 characters.")
        return v.strip().upper() if v else v

    @field_validator("revenue_generated")
    @classmethod
    def validate_revenue(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Revenue cannot be negative.")
        return v

    @field_validator("units_sold", "active_units", "total_customers")
    @classmethod
    def validate_non_negative_int(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Value cannot be negative.")
        return v


class ProductOwnerBrief(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    job_title: Optional[str] = None
    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: UUID
    name: str
    product_code: str
    category: ProductCategory
    stream: ProductStream
    status: ProductStatus
    description: Optional[str] = None
    launch_date: Optional[date] = None
    revenue_generated: Optional[Decimal] = None
    units_sold: Optional[int] = None
    active_units: Optional[int] = None
    total_customers: Optional[int] = None
    product_owner_id: Optional[UUID] = None
    product_owner: Optional[ProductOwnerBrief] = None
    is_active: bool
    model_config = {"from_attributes": True}


class CategoryStat(BaseModel):
    category: ProductCategory
    label: str
    total: int
    active: int
    revenue: Optional[Decimal] = None


class ProductStats(BaseModel):
    total_products: int
    active_products: int
    total_customers: int
    total_revenue: Optional[Decimal] = None
    by_category: List[CategoryStat]
