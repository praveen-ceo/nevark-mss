# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : finance.py
# Author  : Development Team
# Created : 2026-09-05 15:08:00
# ============================================================

import random
import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ExpenseStatus, InvoiceStatus, ProjectStatus
from app.models.finance import Expense, Invoice, InvoiceItem, Payment
from app.models.project import Project
from app.models.settings import FinanceSettings
from app.schemas.finance import (
    ExpenseCreate,
    ExpenseUpdate,
    FinanceSettingsUpdate,
    InvoiceCreate,
    InvoiceItemCreate,
    InvoiceUpdate,
    PaymentCreate,
)

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Base queries
# ---------------------------------------------------------------------------

def _base_invoice_query():
    return select(Invoice).options(
        selectinload(Invoice.client),
        selectinload(Invoice.project),
        selectinload(Invoice.items),
        selectinload(Invoice.payments),
    )


def _base_expense_query():
    return select(Expense).options(
        selectinload(Expense.project),
        selectinload(Expense.employee),
    )


# ---------------------------------------------------------------------------
# Finance Settings
# ---------------------------------------------------------------------------

async def get_settings(db: AsyncSession) -> Optional[FinanceSettings]:
    result = await db.execute(
        select(FinanceSettings).where(FinanceSettings.is_active == True).limit(1)
    )
    return result.scalar_one_or_none()


async def upsert_settings(db: AsyncSession, data: FinanceSettingsUpdate) -> FinanceSettings:
    settings = await get_settings(db)
    if settings is None:
        settings = FinanceSettings(
            id=uuid.uuid4(),
            invoice_prefix="NVK",
            default_sac="998314",
            payment_terms=30,
            default_currency="INR",
            cgst_rate=Decimal("9"),
            sgst_rate=Decimal("9"),
            igst_rate=Decimal("18"),
        )
        db.add(settings)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return settings


# ---------------------------------------------------------------------------
# Invoice number generation
# ---------------------------------------------------------------------------

async def _generate_invoice_number(db: AsyncSession, prefix: str) -> str:
    year = date.today().year
    for _ in range(30):
        seq = random.randint(1000, 9999)
        number = f"{prefix}-{year}-{seq}"
        n = await db.scalar(
            select(func.count()).where(Invoice.invoice_number == number)
        )
        if not n:
            return number
    raise RuntimeError("Could not generate unique invoice number")


# ---------------------------------------------------------------------------
# GST computation
# ---------------------------------------------------------------------------

def _compute_gst(subtotal: Decimal, settings: FinanceSettings, place_of_supply: Optional[str]):
    """
    Intrastate  → CGST + SGST (company state_code == place_of_supply)
    Interstate  → IGST only
    Returns dict of rate/amount fields to merge into Invoice.
    """
    company_state = (settings.state_code or "").strip().upper()
    supply_state = (place_of_supply or "").strip().upper()

    intrastate = bool(company_state and supply_state and company_state == supply_state)

    if intrastate:
        cgst_rate = Decimal(str(settings.cgst_rate))
        sgst_rate = Decimal(str(settings.sgst_rate))
        cgst_amount = (subtotal * cgst_rate / 100).quantize(Decimal("0.01"))
        sgst_amount = (subtotal * sgst_rate / 100).quantize(Decimal("0.01"))
        tax_amount = cgst_amount + sgst_amount
        return {
            "cgst_rate": cgst_rate,
            "sgst_rate": sgst_rate,
            "igst_rate": None,
            "cgst_amount": cgst_amount,
            "sgst_amount": sgst_amount,
            "igst_amount": None,
            "tax_rate": cgst_rate + sgst_rate,
            "tax_amount": tax_amount,
            "supply_type": "intrastate",
        }
    else:
        igst_rate = Decimal(str(settings.igst_rate))
        igst_amount = (subtotal * igst_rate / 100).quantize(Decimal("0.01"))
        return {
            "cgst_rate": None,
            "sgst_rate": None,
            "igst_rate": igst_rate,
            "cgst_amount": None,
            "sgst_amount": None,
            "igst_amount": igst_amount,
            "tax_rate": igst_rate,
            "tax_amount": igst_amount,
            "supply_type": "interstate",
        }


# ---------------------------------------------------------------------------
# Invoice CRUD
# ---------------------------------------------------------------------------

async def list_invoices(
    db: AsyncSession,
    status: Optional[InvoiceStatus] = None,
    client_id: Optional[uuid.UUID] = None,
    project_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Invoice]:
    q = _base_invoice_query()
    if status:
        q = q.where(Invoice.status == status)
    if client_id:
        q = q.where(Invoice.client_id == client_id)
    if project_id:
        q = q.where(Invoice.project_id == project_id)
    if search:
        s = f"%{search}%"
        q = q.where(Invoice.invoice_number.ilike(s))
    q = q.where(Invoice.is_active == True).order_by(Invoice.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_invoice(db: AsyncSession, invoice_id: uuid.UUID) -> Invoice:
    result = await db.execute(
        _base_invoice_query().where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise ValueError("Invoice not found")
    return invoice


async def create_invoice(db: AsyncSession, data: InvoiceCreate) -> Invoice:
    settings = await get_settings(db)
    if settings is None:
        raise ValueError("Finance settings not configured. Create settings first via PUT /finance/settings.")

    prefix = settings.invoice_prefix or "NVK"
    invoice_number = await _generate_invoice_number(db, prefix)

    # Compute line items subtotal
    subtotal = Decimal("0")
    items_data: List[InvoiceItemCreate] = data.items
    if not items_data:
        raise ValueError("Invoice must have at least one line item")
    for item in items_data:
        subtotal += (Decimal(str(item.quantity)) * Decimal(str(item.unit_price))).quantize(Decimal("0.01"))

    discount = Decimal(str(data.discount_amount))
    taxable = subtotal - discount
    gst = _compute_gst(taxable, settings, data.place_of_supply)
    total = (taxable + gst["tax_amount"]).quantize(Decimal("0.01"))

    invoice = Invoice(
        id=uuid.uuid4(),
        client_id=data.client_id,
        project_id=data.project_id,
        invoice_number=invoice_number,
        status=InvoiceStatus.DRAFT,
        issue_date=data.issue_date,
        due_date=data.due_date,
        subtotal=subtotal,
        tax_rate=gst["tax_rate"],
        tax_amount=gst["tax_amount"],
        discount_amount=discount,
        total_amount=total,
        paid_amount=Decimal("0"),
        currency=data.currency or settings.default_currency or "INR",
        notes=data.notes,
        place_of_supply=data.place_of_supply,
        gstin=data.gstin,
        cgst_rate=gst["cgst_rate"],
        sgst_rate=gst["sgst_rate"],
        igst_rate=gst["igst_rate"],
        cgst_amount=gst["cgst_amount"],
        sgst_amount=gst["sgst_amount"],
        igst_amount=gst["igst_amount"],
    )
    db.add(invoice)
    await db.flush()

    for idx, item in enumerate(items_data):
        amount = (Decimal(str(item.quantity)) * Decimal(str(item.unit_price))).quantize(Decimal("0.01"))
        db.add(InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            amount=amount,
            sort_order=item.sort_order if item.sort_order else idx,
        ))

    await db.commit()
    log.info("invoice.created", number=invoice_number)
    return await get_invoice(db, invoice.id)


async def update_invoice(db: AsyncSession, invoice_id: uuid.UUID, data: InvoiceUpdate) -> Invoice:
    invoice = await get_invoice(db, invoice_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(invoice, field, value)
    await db.commit()
    log.info("invoice.updated", invoice_id=str(invoice_id))
    return await get_invoice(db, invoice_id)


async def delete_invoice(db: AsyncSession, invoice_id: uuid.UUID) -> None:
    invoice = await get_invoice(db, invoice_id)
    if invoice.status in (InvoiceStatus.PAID, InvoiceStatus.PARTIAL):
        raise ValueError("Cannot deactivate a paid or partially paid invoice")
    invoice.is_active = False
    await db.commit()
    log.info("invoice.deactivated", invoice_id=str(invoice_id))


async def send_invoice(db: AsyncSession, invoice_id: uuid.UUID) -> Invoice:
    invoice = await get_invoice(db, invoice_id)
    if invoice.status != InvoiceStatus.DRAFT:
        raise ValueError(f"Only DRAFT invoices can be sent. Current status: {invoice.status.value}")
    invoice.status = InvoiceStatus.SENT
    await db.commit()
    log.info("invoice.sent", invoice_id=str(invoice_id))
    return await get_invoice(db, invoice_id)


async def add_payment(db: AsyncSession, invoice_id: uuid.UUID, data: PaymentCreate) -> Invoice:
    invoice = await get_invoice(db, invoice_id)
    if invoice.status in (InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT):
        raise ValueError(f"Cannot record payment for invoice in {invoice.status.value} status")

    payment = Payment(
        id=uuid.uuid4(),
        invoice_id=invoice_id,
        amount=data.amount,
        payment_date=data.payment_date,
        payment_method=data.payment_method,
        reference=data.reference,
        notes=data.notes,
        status="completed",
    )
    db.add(payment)
    await db.flush()

    # Recalculate paid_amount from all payments
    total_paid_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.invoice_id == invoice_id)
    )
    total_paid = total_paid_result.scalar_one_or_none() or Decimal("0")
    invoice.paid_amount = Decimal(str(total_paid)).quantize(Decimal("0.01"))

    total = Decimal(str(invoice.total_amount))
    if invoice.paid_amount >= total:
        invoice.status = InvoiceStatus.PAID
    elif invoice.paid_amount > 0:
        invoice.status = InvoiceStatus.PARTIAL

    await db.commit()
    log.info("payment.recorded", invoice_id=str(invoice_id), amount=str(data.amount))
    return await get_invoice(db, invoice_id)


# ---------------------------------------------------------------------------
# Auto-invoice from completed project
# ---------------------------------------------------------------------------

async def auto_invoice_from_project(db: AsyncSession, project_id: uuid.UUID) -> Invoice:
    # Load project with client
    from app.models.client import Client
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.client))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise ValueError("Project not found")
    if project.status != ProjectStatus.COMPLETED:
        raise ValueError(
            f"Project must be COMPLETED to auto-generate invoice. Current status: {project.status.value}"
        )
    if not project.client_id:
        raise ValueError("Project has no client assigned. Assign a client before generating invoice.")
    if not project.budget:
        raise ValueError("Project has no budget set. Set a budget before generating invoice.")

    # Guard: no active non-cancelled invoice already linked to this project
    existing = await db.scalar(
        select(func.count())
        .where(Invoice.project_id == project_id)
        .where(Invoice.is_active == True)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    if existing:
        raise ValueError("An active invoice already exists for this project.")

    settings = await get_settings(db)
    if settings is None:
        raise ValueError("Finance settings not configured. Create settings first via PUT /finance/settings.")

    prefix = settings.invoice_prefix or "NVK"
    invoice_number = await _generate_invoice_number(db, prefix)

    subtotal = Decimal(str(project.budget)).quantize(Decimal("0.01"))
    discount = Decimal("0")
    taxable = subtotal - discount

    # Use client's tax_id as GSTIN if available
    client_gstin = project.client.tax_id if project.client else None
    # place_of_supply: use client city/state as proxy for V1 (requires manual override for compliance)
    place_of_supply = None

    gst = _compute_gst(taxable, settings, place_of_supply)
    total = (taxable + gst["tax_amount"]).quantize(Decimal("0.01"))

    today = date.today()
    due_date = today + timedelta(days=settings.payment_terms or 30)

    invoice = Invoice(
        id=uuid.uuid4(),
        client_id=project.client_id,
        project_id=project.id,
        invoice_number=invoice_number,
        status=InvoiceStatus.DRAFT,
        issue_date=today,
        due_date=due_date,
        subtotal=subtotal,
        tax_rate=gst["tax_rate"],
        tax_amount=gst["tax_amount"],
        discount_amount=discount,
        total_amount=total,
        paid_amount=Decimal("0"),
        currency=project.currency or settings.default_currency or "INR",
        notes=f"Auto-generated invoice for project: {project.name} ({project.code})",
        place_of_supply=place_of_supply,
        gstin=client_gstin,
        cgst_rate=gst["cgst_rate"],
        sgst_rate=gst["sgst_rate"],
        igst_rate=gst["igst_rate"],
        cgst_amount=gst["cgst_amount"],
        sgst_amount=gst["sgst_amount"],
        igst_amount=gst["igst_amount"],
    )
    db.add(invoice)
    await db.flush()

    db.add(InvoiceItem(
        id=uuid.uuid4(),
        invoice_id=invoice.id,
        description=f"{project.name} — Professional Services (SAC: {settings.default_sac or '998314'})",
        quantity=Decimal("1"),
        unit_price=subtotal,
        amount=subtotal,
        sort_order=0,
    ))

    await db.commit()
    log.info("invoice.auto_generated", project_id=str(project_id), number=invoice_number)
    return await get_invoice(db, invoice.id)


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

async def list_expenses(
    db: AsyncSession,
    status: Optional[ExpenseStatus] = None,
    project_id: Optional[uuid.UUID] = None,
    employee_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Expense]:
    q = _base_expense_query()
    if status:
        q = q.where(Expense.status == status)
    if project_id:
        q = q.where(Expense.project_id == project_id)
    if employee_id:
        q = q.where(Expense.employee_id == employee_id)
    q = q.where(Expense.is_active == True).order_by(Expense.date.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_expense(db: AsyncSession, expense_id: uuid.UUID) -> Expense:
    result = await db.execute(
        _base_expense_query().where(Expense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    if expense is None:
        raise ValueError("Expense not found")
    return expense


async def create_expense(
    db: AsyncSession, data: ExpenseCreate, employee_id: uuid.UUID
) -> Expense:
    expense = Expense(
        id=uuid.uuid4(),
        employee_id=employee_id,
        project_id=data.project_id,
        category=data.category,
        amount=data.amount,
        currency=data.currency or "INR",
        date=data.date,
        description=data.description,
        status=ExpenseStatus.PENDING,
    )
    db.add(expense)
    await db.commit()
    log.info("expense.created", employee_id=str(employee_id), amount=str(data.amount))
    return await get_expense(db, expense.id)


async def approve_expense(
    db: AsyncSession, expense_id: uuid.UUID, approver_id: uuid.UUID
) -> Expense:
    expense = await get_expense(db, expense_id)
    if expense.status != ExpenseStatus.PENDING:
        raise ValueError(f"Only PENDING expenses can be approved. Current: {expense.status.value}")
    expense.status = ExpenseStatus.APPROVED
    expense.approved_by = approver_id
    await db.commit()
    log.info("expense.approved", expense_id=str(expense_id))
    return await get_expense(db, expense_id)


async def reject_expense(
    db: AsyncSession, expense_id: uuid.UUID, reason: str
) -> Expense:
    expense = await get_expense(db, expense_id)
    if expense.status != ExpenseStatus.PENDING:
        raise ValueError(f"Only PENDING expenses can be rejected. Current: {expense.status.value}")
    expense.status = ExpenseStatus.REJECTED
    expense.rejection_reason = reason
    await db.commit()
    log.info("expense.rejected", expense_id=str(expense_id))
    return await get_expense(db, expense_id)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

async def get_dashboard(
    db: AsyncSession, 
    dept_ids: set | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    """Finance KPI aggregation for the dashboard.

    Parameters
    ----------
    dept_ids:
        When provided, restricts invoice metrics to projects whose
        department_id is in dept_ids, and expense metrics to employees
        whose department_id is in dept_ids.
        Projects with NULL department_id are excluded from filtered
        invoice metrics — this is by design; unattributed projects
        cannot be reliably assigned to an organisational unit.
        When None (default), all records are included (global view).
    """
    from app.schemas.finance import FinanceDashboard, InvoiceStatusCount
    from app.models.project import Project
    from app.models.employee import Employee

    # ------------------------------------------------------------------
    # Revenue collected: sum of paid invoices
    # ------------------------------------------------------------------
    rev_q = (
        select(func.sum(Invoice.total_amount))
        .where(Invoice.status == InvoiceStatus.PAID)
        .where(Invoice.is_active == True)
    )
    if start_date and end_date:
        rev_q = rev_q.where(Invoice.issue_date >= start_date).where(Invoice.issue_date <= end_date)
        
    if dept_ids is not None:
        rev_q = (
            rev_q
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    revenue_result = await db.execute(rev_q)
    revenue_collected = Decimal(str(revenue_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    # ------------------------------------------------------------------
    # Pending: outstanding on sent invoices
    # ------------------------------------------------------------------
    pend_q = (
        select(func.sum(Invoice.total_amount - Invoice.paid_amount))
        .where(Invoice.status == InvoiceStatus.SENT)
        .where(Invoice.is_active == True)
    )
    if start_date and end_date:
        pend_q = pend_q.where(Invoice.issue_date >= start_date).where(Invoice.issue_date <= end_date)
        
    if dept_ids is not None:
        pend_q = (
            pend_q
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    pending_result = await db.execute(pend_q)
    pending_amount = Decimal(str(pending_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    # ------------------------------------------------------------------
    # Overdue
    # ------------------------------------------------------------------
    over_q = (
        select(func.sum(Invoice.total_amount - Invoice.paid_amount))
        .where(Invoice.status == InvoiceStatus.OVERDUE)
        .where(Invoice.is_active == True)
    )
    if start_date and end_date:
        over_q = over_q.where(Invoice.issue_date >= start_date).where(Invoice.issue_date <= end_date)
        
    if dept_ids is not None:
        over_q = (
            over_q
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    overdue_result = await db.execute(over_q)
    overdue_amount = Decimal(str(overdue_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    # ------------------------------------------------------------------
    # Expenses: approved + reimbursed
    # Filtered by employee.department_id when dept_ids provided.
    # ------------------------------------------------------------------
    exp_q = (
        select(func.sum(Expense.amount))
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
    )
    if start_date and end_date:
        exp_q = exp_q.where(Expense.date >= start_date).where(Expense.date <= end_date)
        
    if dept_ids is not None:
        exp_q = (
            exp_q
            .join(Employee, Employee.id == Expense.employee_id)
            .where(Employee.department_id.in_(dept_ids))
        )
    expense_result = await db.execute(exp_q)
    total_expenses = Decimal(str(expense_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    net_profit = (revenue_collected - total_expenses).quantize(Decimal("0.01"))

    # ------------------------------------------------------------------
    # Invoice counts by status (always global — used for badge counts only)
    # ------------------------------------------------------------------
    counts_q = (
        select(Invoice.status, func.count(Invoice.id), func.sum(Invoice.total_amount))
        .where(Invoice.is_active == True)
    )
    if start_date and end_date:
        counts_q = counts_q.where(Invoice.issue_date >= start_date).where(Invoice.issue_date <= end_date)
        
    # Apply dept filter for counts if we have it, although E1 made it "always global" for counts? 
    # Wait, the code says "Invoice counts by status (always global — used for badge counts only)".
    # So I will NOT apply dept_ids, but I SHOULD apply date if a date filter is selected to respect date semantics.
    # Actually, E1 says "always global", let's apply the date filter to keep badges consistent with the date.
    
    counts_result = await db.execute(
        counts_q.group_by(Invoice.status)
    )
    invoice_counts = [
        InvoiceStatusCount(status=row[0].value, count=row[1], total=Decimal(str(row[2] or 0)))
        for row in counts_result.all()
    ]

    status_map = {ic.status: ic.count for ic in invoice_counts}

    return FinanceDashboard(
        revenue_collected=revenue_collected,
        pending_amount=pending_amount,
        overdue_amount=overdue_amount,
        total_expenses=total_expenses,
        net_profit=net_profit,
        invoice_counts=invoice_counts,
        draft_count=status_map.get("draft", 0),
        sent_count=status_map.get("sent", 0),
        paid_count=status_map.get("paid", 0),
        overdue_count=status_map.get("overdue", 0),
    )



async def get_finance_trends(
    db: AsyncSession, 
    dept_ids: set | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    from sqlalchemy import text
    from app.schemas.finance import FinanceTrends, MonthlyRevenue, CashFlowPoint
    from app.models.employee import Employee
    from app.models.enums import PaymentStatus

    today = date.today()

    # -----------------------------------------------------------------------
    # 2. Monthly revenue
    # -----------------------------------------------------------------------
    if start_date and end_date:
        # Custom range: show all months covered by the range
        months_back = 0
        cursor = end_date.replace(day=1)
        start_month = start_date.replace(day=1)
        
        # Guard against absurdly large ranges in UI by capping it to e.g. 60 months
        while cursor >= start_month and months_back < 60:
            months_back += 1
            if cursor.month == 1:
                cursor = cursor.replace(year=cursor.year - 1, month=12)
            else:
                cursor = cursor.replace(month=cursor.month - 1)
                
        month_start = start_month
        if months_back == 0:
            months_back = 1
            month_start = end_date.replace(day=1)
    else:
        # Frozen E1 behaviour
        months_back = 6
        month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
        for _ in range(months_back - 1):
            month_start = (month_start - timedelta(days=1)).replace(day=1)

    rev_q = (
        select(
            func.date_trunc("month", Invoice.issue_date).label("mo"),
            func.sum(Invoice.total_amount).label("rev"),
        )
        .where(Invoice.status == InvoiceStatus.PAID)
        .where(Invoice.is_active == True)
    )
    if start_date and end_date:
        # For the chart, we must include all data up to the end_date month,
        # but also bound it so it matches the custom range calculation.
        # However, custom range month buckets should span month_start to end_date.
        rev_q = rev_q.where(Invoice.issue_date >= month_start).where(Invoice.issue_date < end_date + timedelta(days=1))
    else:
        rev_q = rev_q.where(Invoice.issue_date >= month_start)
        
    if dept_ids is not None:
        rev_q = (
            rev_q
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    rev_rows = await db.execute(
        rev_q.group_by(text("mo")).order_by(text("mo"))
    )
    rev_map = {row.mo.date().replace(day=1): row.rev for row in rev_rows.all()}

    exp_q = (
        select(
            func.date_trunc("month", Expense.date).label("mo"),
            func.sum(Expense.amount).label("exp"),
        )
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
    )
    
    if start_date and end_date:
        exp_q = exp_q.where(Expense.date >= month_start).where(Expense.date < end_date + timedelta(days=1))
    else:
        exp_q = exp_q.where(Expense.date >= month_start)
        
    if dept_ids is not None:
        exp_q = (
            exp_q
            .join(Employee, Employee.id == Expense.employee_id)
            .where(Employee.department_id.in_(dept_ids))
        )
    exp_rows = await db.execute(
        exp_q.group_by(text("mo")).order_by(text("mo"))
    )
    exp_map = {row.mo.date().replace(day=1): row.exp for row in exp_rows.all()}

    monthly_revenue: list[MonthlyRevenue] = []
    cursor = month_start
    for _ in range(months_back):
        rev = rev_map.get(cursor, 0) or 0
        exp = exp_map.get(cursor, 0) or 0
        monthly_revenue.append(MonthlyRevenue(
            month=cursor.strftime("%b %Y"),
            revenue=rev,
            expenses=exp,
            profit=rev - exp,
        ))
        nxt = cursor.replace(day=28) + timedelta(days=4)
        cursor = nxt.replace(day=1)

    # -----------------------------------------------------------------------
    # 2b. Enhancement 7: Cash Flow Forecasting
    # -----------------------------------------------------------------------
    current_month_start = today.replace(day=1)
    base_month_3 = (current_month_start - timedelta(days=1)).replace(day=1)
    base_month_2 = (base_month_3 - timedelta(days=1)).replace(day=1)
    base_month_1 = (base_month_2 - timedelta(days=1)).replace(day=1)
    
    query_start = min(month_start, base_month_1)
    if start_date and end_date:
        query_end = max(end_date + timedelta(days=1), current_month_start)
    else:
        query_end = (current_month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        
    cf_in_q = (
        select(
            func.date_trunc("month", Payment.payment_date).label("mo"),
            func.sum(Payment.amount).label("inflow"),
        )
        .where(Payment.status == PaymentStatus.COMPLETED)
        .where(Payment.payment_date >= query_start)
        .where(Payment.payment_date < query_end)
    )
    if dept_ids is not None:
        cf_in_q = (
            cf_in_q
            .join(Invoice, Invoice.id == Payment.invoice_id)
            .join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )
    cf_in_rows = await db.execute(cf_in_q.group_by(text("mo")))
    inflow_map = {row.mo.date().replace(day=1): row.inflow for row in cf_in_rows.all() if row.mo}

    cf_out_q = (
        select(
            func.date_trunc("month", Expense.date).label("mo"),
            func.sum(Expense.amount).label("outflow"),
        )
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
        .where(Expense.date >= query_start)
        .where(Expense.date < query_end)
    )
    if dept_ids is not None:
        cf_out_q = (
            cf_out_q
            .join(Employee, Employee.id == Expense.employee_id)
            .where(Employee.department_id.in_(dept_ids))
        )
    cf_out_rows = await db.execute(cf_out_q.group_by(text("mo")))
    outflow_map = {row.mo.date().replace(day=1): row.outflow for row in cf_out_rows.all() if row.mo}

    cash_flow: list[CashFlowPoint] = []
    
    cf_cursor = month_start
    for _ in range(months_back):
        inf = float(inflow_map.get(cf_cursor, 0) or 0)
        outf = float(outflow_map.get(cf_cursor, 0) or 0)
        cash_flow.append(CashFlowPoint(
            month=cf_cursor.strftime("%b %Y"),
            inflow=inf,
            outflow=outf,
            net_cash=inf - outf,
            is_forecast=False
        ))
        cf_cursor = (cf_cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
        
    base_inf_1 = float(inflow_map.get(base_month_1, 0) or 0)
    base_out_1 = float(outflow_map.get(base_month_1, 0) or 0)
    base_inf_2 = float(inflow_map.get(base_month_2, 0) or 0)
    base_out_2 = float(outflow_map.get(base_month_2, 0) or 0)
    base_inf_3 = float(inflow_map.get(base_month_3, 0) or 0)
    base_out_3 = float(outflow_map.get(base_month_3, 0) or 0)
    
    total_base = base_inf_1 + base_out_1 + base_inf_2 + base_out_2 + base_inf_3 + base_out_3
    forecast_available = total_base > 0
    
    if forecast_available:
        avg_inf = (base_inf_1 + base_inf_2 + base_inf_3) / 3.0
        avg_out = (base_out_1 + base_out_2 + base_out_3) / 3.0
        
        fc_cursor = current_month_start
        for _ in range(3):
            cash_flow.append(CashFlowPoint(
                month=fc_cursor.strftime("%b %Y"),
                inflow=avg_inf,
                outflow=avg_out,
                net_cash=avg_inf - avg_out,
                is_forecast=True
            ))
            fc_cursor = (fc_cursor.replace(day=28) + timedelta(days=4)).replace(day=1)

    return FinanceTrends(
        monthly_revenue=monthly_revenue,
        cash_flow=cash_flow,
        forecast_available=forecast_available
    )


# ---------------------------------------------------------------------------
# Project Finance Summary
# ---------------------------------------------------------------------------

async def get_all_projects_finance_summary(db: AsyncSession):
    from app.schemas.finance import ProjectFinanceSummary

    # 1. All active projects with client eager-loaded
    proj_result = await db.execute(
        select(Project)
        .options(selectinload(Project.client))
        .where(Project.is_active == True)
        .order_by(Project.name)
    )
    projects = list(proj_result.scalars().all())
    if not projects:
        return []

    project_ids = [p.id for p in projects]

    # 2. Invoice aggregates grouped by project_id (single query)
    inv_agg_result = await db.execute(
        select(
            Invoice.project_id,
            func.coalesce(func.sum(Invoice.total_amount), 0).label("total_invoiced"),
            func.coalesce(func.sum(Invoice.paid_amount), 0).label("total_received"),
            func.coalesce(func.sum(Invoice.tax_amount), 0).label("gst_amount"),
            func.count(Invoice.id).label("invoice_count"),
        )
        .where(Invoice.project_id.in_(project_ids))
        .where(Invoice.is_active == True)
        .group_by(Invoice.project_id)
    )
    inv_map = {row.project_id: row for row in inv_agg_result.all()}

    # 3. Expense aggregates grouped by project_id (single query)
    exp_agg_result = await db.execute(
        select(
            Expense.project_id,
            func.coalesce(func.sum(Expense.amount), 0).label("expenses"),
        )
        .where(Expense.project_id.in_(project_ids))
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
        .group_by(Expense.project_id)
    )
    exp_map = {row.project_id: Decimal(str(row.expenses)) for row in exp_agg_result.all()}

    # 4. Payment counts via invoice join (single query)
    pay_agg_result = await db.execute(
        select(
            Invoice.project_id,
            func.count(Payment.id).label("payment_count"),
        )
        .join(Payment, Payment.invoice_id == Invoice.id)
        .where(Invoice.project_id.in_(project_ids))
        .where(Invoice.is_active == True)
        .group_by(Invoice.project_id)
    )
    pay_map = {row.project_id: row.payment_count for row in pay_agg_result.all()}

    # 5. Merge all four result sets in Python — zero N+1
    summaries = []
    for p in projects:
        inv = inv_map.get(p.id)
        total_invoiced = Decimal(str(inv.total_invoiced if inv else 0)).quantize(Decimal("0.01"))
        total_received = Decimal(str(inv.total_received if inv else 0)).quantize(Decimal("0.01"))
        gst_amount     = Decimal(str(inv.gst_amount     if inv else 0)).quantize(Decimal("0.01"))
        invoice_count  = inv.invoice_count if inv else 0
        expenses       = exp_map.get(p.id, Decimal("0")).quantize(Decimal("0.01"))
        payment_count  = pay_map.get(p.id, 0)
        pending        = (total_invoiced - total_received).quantize(Decimal("0.01"))
        profit         = (total_received - expenses).quantize(Decimal("0.01"))
        summaries.append(ProjectFinanceSummary(
            project_id=p.id,
            project_name=p.name,
            project_code=p.code,
            client_name=p.client.name if p.client else None,
            project_value=Decimal(str(p.budget)).quantize(Decimal("0.01")) if p.budget else None,
            total_invoiced=total_invoiced,
            total_received=total_received,
            pending_amount=pending,
            gst_amount=gst_amount,
            expenses=expenses,
            estimated_profit=profit,
            invoice_count=invoice_count,
            payment_count=payment_count,
        ))
    return summaries


async def get_project_finance_summary(db: AsyncSession, project_id: uuid.UUID):
    from app.schemas.finance import ProjectFinanceSummary

    proj_result = await db.execute(
        select(Project)
        .options(selectinload(Project.client))
        .where(Project.id == project_id)
    )
    p = proj_result.scalar_one_or_none()
    if p is None:
        raise ValueError("Project not found")

    total_invoiced = Decimal(str(await db.scalar(
        select(func.coalesce(func.sum(Invoice.total_amount), 0))
        .where(Invoice.project_id == project_id)
        .where(Invoice.is_active == True)
    ) or 0)).quantize(Decimal("0.01"))

    total_received = Decimal(str(await db.scalar(
        select(func.coalesce(func.sum(Invoice.paid_amount), 0))
        .where(Invoice.project_id == project_id)
        .where(Invoice.is_active == True)
    ) or 0)).quantize(Decimal("0.01"))

    gst_amount = Decimal(str(await db.scalar(
        select(func.coalesce(func.sum(Invoice.tax_amount), 0))
        .where(Invoice.project_id == project_id)
        .where(Invoice.is_active == True)
    ) or 0)).quantize(Decimal("0.01"))

    invoice_count = await db.scalar(
        select(func.count(Invoice.id))
        .where(Invoice.project_id == project_id)
        .where(Invoice.is_active == True)
    ) or 0

    expenses = Decimal(str(await db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.project_id == project_id)
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
    ) or 0)).quantize(Decimal("0.01"))

    payment_count = await db.scalar(
        select(func.count(Payment.id))
        .join(Invoice, Invoice.id == Payment.invoice_id)
        .where(Invoice.project_id == project_id)
        .where(Invoice.is_active == True)
    ) or 0

    pending = (total_invoiced - total_received).quantize(Decimal("0.01"))
    profit  = (total_received - expenses).quantize(Decimal("0.01"))

    return ProjectFinanceSummary(
        project_id=p.id,
        project_name=p.name,
        project_code=p.code,
        client_name=p.client.name if p.client else None,
        project_value=Decimal(str(p.budget)).quantize(Decimal("0.01")) if p.budget else None,
        total_invoiced=total_invoiced,
        total_received=total_received,
        pending_amount=pending,
        gst_amount=gst_amount,
        expenses=expenses,
        estimated_profit=profit,
        invoice_count=invoice_count,
        payment_count=payment_count,
    )


# ---------------------------------------------------------------------------
# Accounts Receivable
# ---------------------------------------------------------------------------

async def get_accounts_receivable(
    db: AsyncSession,
    dept_ids: set | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    from app.schemas.finance import AccountsReceivableReport, ClientARSummary
    from app.models.client import Client
    from app.models.project import Project

    # Base query for invoices that are AR
    q = (
        select(
            Client.id.label("client_id"),
            Client.name.label("client_name"),
            Invoice.due_date,
            (Invoice.total_amount - Invoice.paid_amount).label("outstanding")
        )
        .select_from(Invoice)
        .join(Client, Client.id == Invoice.client_id)
        .where(Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE]))
        .where(Invoice.is_active == True)
        .where((Invoice.total_amount - Invoice.paid_amount) > 0)
    )

    if start_date and end_date:
        q = q.where(Invoice.issue_date >= start_date).where(Invoice.issue_date <= end_date)

    if dept_ids is not None:
        q = (
            q.join(Project, Project.id == Invoice.project_id)
            .where(Project.department_id.in_(dept_ids))
        )

    result = await db.execute(q)
    rows = result.all()

    total_outstanding = Decimal("0")
    total_overdue = Decimal("0")
    aging_not_due = Decimal("0")
    aging_1_30 = Decimal("0")
    aging_31_60 = Decimal("0")
    aging_60_plus = Decimal("0")

    client_map = {}

    today = date.today()

    for row in rows:
        outstanding = Decimal(str(row.outstanding))
        total_outstanding += outstanding

        # Aging
        days_diff = (today - row.due_date).days
        is_overdue = days_diff > 0

        if is_overdue:
            total_overdue += outstanding
            if days_diff <= 30:
                aging_1_30 += outstanding
            elif days_diff <= 60:
                aging_31_60 += outstanding
            else:
                aging_60_plus += outstanding
        else:
            aging_not_due += outstanding

        # Client grouping
        if row.client_id not in client_map:
            client_map[row.client_id] = {
                "client_id": row.client_id,
                "client_name": row.client_name,
                "total_outstanding": Decimal("0"),
                "overdue_amount": Decimal("0")
            }
        
        client_map[row.client_id]["total_outstanding"] += outstanding
        if is_overdue:
            client_map[row.client_id]["overdue_amount"] += outstanding

    by_client = []
    for c in client_map.values():
        by_client.append(ClientARSummary(
            client_id=c["client_id"],
            client_name=c["client_name"],
            total_outstanding=c["total_outstanding"].quantize(Decimal("0.01")),
            overdue_amount=c["overdue_amount"].quantize(Decimal("0.01"))
        ))
    
    # Sort by total outstanding desc
    by_client.sort(key=lambda x: x.total_outstanding, reverse=True)

    return AccountsReceivableReport(
        total_outstanding=total_outstanding.quantize(Decimal("0.01")),
        total_overdue=total_overdue.quantize(Decimal("0.01")),
        aging_not_due=aging_not_due.quantize(Decimal("0.01")),
        aging_1_30_days=aging_1_30.quantize(Decimal("0.01")),
        aging_31_60_days=aging_31_60.quantize(Decimal("0.01")),
        aging_60_plus_days=aging_60_plus.quantize(Decimal("0.01")),
        by_client=by_client
    )


# ---------------------------------------------------------------------------
# Accounts Payable (Employee Reimbursements)
# ---------------------------------------------------------------------------

async def get_employee_payables(
    db: AsyncSession,
    dept_ids: set | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    from app.schemas.finance import AccountsPayableReport, EmployeeAPSummary
    from app.models.employee import Employee

    q = (
        select(
            Employee.id.label("employee_id"),
            Employee.first_name,
            Employee.last_name,
            func.sum(Expense.amount).label("total_owed")
        )
        .select_from(Expense)
        .join(Employee, Employee.id == Expense.employee_id)
        .where(Expense.status == ExpenseStatus.APPROVED)
        .where(Expense.is_active == True)
        .group_by(Employee.id, Employee.first_name, Employee.last_name)
    )

    if start_date and end_date:
        q = q.where(Expense.date >= start_date).where(Expense.date <= end_date)

    if dept_ids is not None:
        q = q.where(Employee.department_id.in_(dept_ids))

    result = await db.execute(q)
    rows = result.all()

    total_owed = Decimal("0")
    by_employee = []

    for row in rows:
        amt = Decimal(str(row.total_owed)).quantize(Decimal("0.01"))
        total_owed += amt
        name = f"{row.first_name} {row.last_name}".strip()
        by_employee.append(EmployeeAPSummary(
            employee_id=row.employee_id,
            employee_name=name,
            total_owed=amt
        ))
    
    by_employee.sort(key=lambda x: x.total_owed, reverse=True)

    return AccountsPayableReport(
        total_owed=total_owed.quantize(Decimal("0.01")),
        by_employee=by_employee
    )
