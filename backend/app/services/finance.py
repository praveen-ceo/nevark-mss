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

async def get_dashboard(db: AsyncSession):
    from app.schemas.finance import FinanceDashboard, InvoiceStatusCount

    # Revenue collected: sum of paid invoices
    revenue_result = await db.execute(
        select(func.sum(Invoice.total_amount))
        .where(Invoice.status == InvoiceStatus.PAID)
        .where(Invoice.is_active == True)
    )
    revenue_collected = Decimal(str(revenue_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    # Pending: sum of outstanding on sent invoices
    pending_result = await db.execute(
        select(func.sum(Invoice.total_amount - Invoice.paid_amount))
        .where(Invoice.status == InvoiceStatus.SENT)
        .where(Invoice.is_active == True)
    )
    pending_amount = Decimal(str(pending_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    # Overdue
    overdue_result = await db.execute(
        select(func.sum(Invoice.total_amount - Invoice.paid_amount))
        .where(Invoice.status == InvoiceStatus.OVERDUE)
        .where(Invoice.is_active == True)
    )
    overdue_amount = Decimal(str(overdue_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    # Expenses: approved + reimbursed
    expense_result = await db.execute(
        select(func.sum(Expense.amount))
        .where(Expense.status.in_([ExpenseStatus.APPROVED, ExpenseStatus.REIMBURSED]))
        .where(Expense.is_active == True)
    )
    total_expenses = Decimal(str(expense_result.scalar_one_or_none() or 0)).quantize(Decimal("0.01"))

    net_profit = (revenue_collected - total_expenses).quantize(Decimal("0.01"))

    # Counts by status
    counts_result = await db.execute(
        select(Invoice.status, func.count(Invoice.id), func.sum(Invoice.total_amount))
        .where(Invoice.is_active == True)
        .group_by(Invoice.status)
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
