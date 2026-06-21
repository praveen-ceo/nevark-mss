from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

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
    # Revenue is Optional — set to None server-side when caller lacks products.view_revenue
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
    # Revenue Optional — masked for non-revenue roles
    revenue: Optional[Decimal] = None


class ProductStats(BaseModel):
    total_products: int
    active_products: int
    total_customers: int
    # Revenue Optional — masked for non-revenue roles
    total_revenue: Optional[Decimal] = None
    by_category: List[CategoryStat]
