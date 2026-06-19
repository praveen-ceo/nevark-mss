from datetime import date
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.enums import (
    ExpenseCategory,
    ExpenseStatus,
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
)


# ---------------------------------------------------------------------------
# Briefs (reused as nested)
# ---------------------------------------------------------------------------

class ClientBrief(BaseModel):
    id: UUID
    name: str
    model_config = {"from_attributes": True}


class ProjectBrief(BaseModel):
    id: UUID
    name: str
    code: str
    model_config = {"from_attributes": True}


class EmployeeBrief(BaseModel):
    id: UUID
    employee_code: str
    first_name: str
    last_name: str
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Finance Settings
# ---------------------------------------------------------------------------

class FinanceSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    pan: Optional[str] = None
    company_gstin: Optional[str] = None
    state_code: Optional[str] = None
    cgst_rate: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    igst_rate: Optional[Decimal] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    invoice_prefix: Optional[str] = None
    default_sac: Optional[str] = None
    payment_terms: Optional[int] = None
    default_currency: Optional[str] = None


class FinanceSettingsResponse(BaseModel):
    id: UUID
    company_name: Optional[str] = None
    company_address: Optional[str] = None
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    pan: Optional[str] = None
    company_gstin: Optional[str] = None
    state_code: Optional[str] = None
    cgst_rate: Decimal = Decimal("9")
    sgst_rate: Decimal = Decimal("9")
    igst_rate: Decimal = Decimal("18")
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    invoice_prefix: str = "NVK"
    default_sac: str = "998314"
    payment_terms: int = 30
    default_currency: str = "INR"
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Invoice Items
# ---------------------------------------------------------------------------

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: Decimal
    unit_price: Decimal
    sort_order: int = 0

    @field_validator("quantity", "unit_price")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class InvoiceItemResponse(BaseModel):
    id: UUID
    description: str
    quantity: Decimal
    unit_price: Decimal
    amount: Decimal
    sort_order: int
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------

class PaymentCreate(BaseModel):
    amount: Decimal
    payment_date: date
    payment_method: PaymentMethod
    reference: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class PaymentResponse(BaseModel):
    id: UUID
    amount: Decimal
    payment_date: date
    payment_method: PaymentMethod
    reference: Optional[str] = None
    status: PaymentStatus
    notes: Optional[str] = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

class InvoiceCreate(BaseModel):
    client_id: UUID
    project_id: Optional[UUID] = None
    issue_date: date
    due_date: date
    currency: str = "INR"
    notes: Optional[str] = None
    place_of_supply: Optional[str] = None
    gstin: Optional[str] = None          # client GSTIN if available
    discount_amount: Decimal = Decimal("0")
    items: List[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    place_of_supply: Optional[str] = None
    gstin: Optional[str] = None
    discount_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    status: InvoiceStatus
    issue_date: date
    due_date: date
    subtotal: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Optional[Decimal] = None        # computed: total - paid
    currency: str
    notes: Optional[str] = None
    # GST
    cgst_rate: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    igst_rate: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    place_of_supply: Optional[str] = None
    gstin: Optional[str] = None
    supply_type: Optional[Literal["intrastate", "interstate"]] = None  # derived
    # Relations
    client: Optional[ClientBrief] = None
    project: Optional[ProjectBrief] = None
    items: List[InvoiceItemResponse] = []
    payments: List[PaymentResponse] = []
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

class ExpenseCreate(BaseModel):
    project_id: Optional[UUID] = None
    category: ExpenseCategory
    amount: Decimal
    currency: str = "INR"
    date: date
    description: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class ExpenseUpdate(BaseModel):
    category: Optional[ExpenseCategory] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    date: Optional[date] = None 
    description: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: UUID
    category: ExpenseCategory
    amount: Decimal
    currency: str
    date: date
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: ExpenseStatus
    rejection_reason: Optional[str] = None
    project: Optional[ProjectBrief] = None
    employee: Optional[EmployeeBrief] = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class InvoiceStatusCount(BaseModel):
    status: str
    count: int
    total: Decimal


class FinanceDashboard(BaseModel):
    revenue_collected: Decimal      # SUM of paid invoices total_amount
    pending_amount: Decimal         # SUM of sent invoices outstanding
    overdue_amount: Decimal         # SUM of overdue invoices outstanding
    total_expenses: Decimal         # SUM of approved+reimbursed expenses
    net_profit: Decimal             # revenue_collected - total_expenses
    invoice_counts: List[InvoiceStatusCount] = []
    draft_count: int = 0
    sent_count: int = 0
    paid_count: int = 0
    overdue_count: int = 0
