from datetime import date
from decimal import Decimal
from typing import List, Literal, Optional
from uuid import UUID

import re

from pydantic import BaseModel, field_validator, model_validator

import app.models.enums

_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$")
_PAN_RE   = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_IFSC_RE  = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


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

    @field_validator("company_gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v and not _GSTIN_RE.match(v.upper()):
            raise ValueError("Invalid GSTIN — must be 15 characters (e.g. 27AAPFU0939F1ZV).")
        return v.upper() if v else v

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v: Optional[str]) -> Optional[str]:
        if v and not _PAN_RE.match(v.upper()):
            raise ValueError("Invalid PAN — must be 10 characters (e.g. ABCDE1234F).")
        return v.upper() if v else v

    @field_validator("bank_ifsc")
    @classmethod
    def validate_ifsc(cls, v: Optional[str]) -> Optional[str]:
        if v and not _IFSC_RE.match(v.upper()):
            raise ValueError("Invalid IFSC — must be 11 characters (e.g. HDFC0001234).")
        return v.upper() if v else v

    @field_validator("payment_terms")
    @classmethod
    def validate_payment_terms(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Payment terms cannot be negative.")
        return v

    @field_validator("cgst_rate", "sgst_rate", "igst_rate")
    @classmethod
    def validate_gst_rates(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("GST rates cannot be negative.")
        return v


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
    payment_method: app.models.enums.PaymentMethod
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
    payment_method: app.models.enums.PaymentMethod
    reference: Optional[str] = None
    status: app.models.enums.PaymentStatus
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


    @model_validator(mode="after")
    def validate_invoice(self):
        if not self.items:
            raise ValueError(
                "Invoice must contain at least one item"
            )

        if self.due_date < self.issue_date:
            raise ValueError(
                "Due date cannot be before issue date"
            )

        if self.discount_amount < 0:
            raise ValueError(
                "Discount cannot be negative"
            )

        return self


class InvoiceUpdate(BaseModel):
    status: Optional[app.models.enums.InvoiceStatus] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    place_of_supply: Optional[str] = None
    gstin: Optional[str] = None
    discount_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    status: app.models.enums.InvoiceStatus
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
    category: app.models.enums.ExpenseCategory
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
    category: Optional[app.models.enums.ExpenseCategory] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    date: Optional["date"] = None
    description: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: UUID
    category: app.models.enums.ExpenseCategory
    amount: Decimal
    currency: str
    date: date
    description: Optional[str] = None
    receipt_url: Optional[str] = None
    status: app.models.enums.ExpenseStatus
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


# ---------------------------------------------------------------------------
# Project Finance Summary
# ---------------------------------------------------------------------------

class ProjectFinanceSummary(BaseModel):
    project_id: UUID
    project_name: str
    project_code: str
    client_name: Optional[str] = None
    project_value: Optional[Decimal] = None      # Project.budget
    total_invoiced: Decimal = Decimal("0")        # SUM(Invoice.total_amount)
    total_received: Decimal = Decimal("0")        # SUM(Invoice.paid_amount)
    pending_amount: Decimal = Decimal("0")        # total_invoiced - total_received
    gst_amount: Decimal = Decimal("0")            # SUM(Invoice.tax_amount)
    expenses: Decimal = Decimal("0")              # SUM(Expense.amount) approved+reimbursed
    estimated_profit: Decimal = Decimal("0")      # total_received - expenses
    invoice_count: int = 0
    payment_count: int = 0
