import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DBDep
from app.models.enums import ExpenseStatus, InvoiceStatus
from app.schemas.finance import (
    ExpenseCreate,
    ExpenseResponse,
    FinanceDashboard,
    FinanceSettingsResponse,
    FinanceSettingsUpdate,
    InvoiceCreate,
    InvoiceResponse,
    InvoiceUpdate,
    PaymentCreate,
)
from app.services import finance as svc

router = APIRouter()


# ---------------------------------------------------------------------------
# Finance Settings
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=FinanceSettingsResponse)
async def get_settings(db: DBDep, _: CurrentUser):
    settings = await svc.get_settings(db)
    if settings is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finance settings not configured yet. Use PUT /finance/settings to create.",
        )
    return settings


@router.put("/settings", response_model=FinanceSettingsResponse)
async def upsert_settings(data: FinanceSettingsUpdate, db: DBDep, _: CurrentUser):
    try:
        return await svc.upsert_settings(db, data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Settings update failed: {type(exc).__name__}: {exc}",
        )


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------

@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    db: DBDep,
    _: CurrentUser,
    status: Optional[InvoiceStatus] = Query(None),
    client_id: Optional[uuid.UUID] = Query(None),
    project_id: Optional[uuid.UUID] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    invoices = await svc.list_invoices(
        db, status=status, client_id=client_id,
        project_id=project_id, search=search, skip=skip, limit=limit,
    )
    return [_enrich_invoice(inv) for inv in invoices]


@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(data: InvoiceCreate, db: DBDep, _: CurrentUser):
    try:
        inv = await svc.create_invoice(db, data)
        return _enrich_invoice(inv)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create failed: {type(exc).__name__}: {exc}",
        )


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return _enrich_invoice(await svc.get_invoice(db, invoice_id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(invoice_id: uuid.UUID, data: InvoiceUpdate, db: DBDep, _: CurrentUser):
    try:
        return _enrich_invoice(await svc.update_invoice(db, invoice_id, data))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Update failed: {type(exc).__name__}: {exc}",
        )


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(invoice_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        await svc.delete_invoice(db, invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/invoices/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(invoice_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        return _enrich_invoice(await svc.send_invoice(db, invoice_id))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post("/invoices/{invoice_id}/payments", response_model=InvoiceResponse)
async def add_payment(invoice_id: uuid.UUID, data: PaymentCreate, db: DBDep, _: CurrentUser):
    try:
        return _enrich_invoice(await svc.add_payment(db, invoice_id, data))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment failed: {type(exc).__name__}: {exc}",
        )


@router.post(
    "/invoices/from-project/{project_id}",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def auto_invoice_from_project(project_id: uuid.UUID, db: DBDep, _: CurrentUser):
    try:
        inv = await svc.auto_invoice_from_project(db, project_id)
        return _enrich_invoice(inv)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auto-invoice failed: {type(exc).__name__}: {exc}",
        )


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------

@router.get("/expenses", response_model=List[ExpenseResponse])
async def list_expenses(
    db: DBDep,
    _: CurrentUser,
    status: Optional[ExpenseStatus] = Query(None),
    project_id: Optional[uuid.UUID] = Query(None),
    employee_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return await svc.list_expenses(
        db, status=status, project_id=project_id,
        employee_id=employee_id, skip=skip, limit=limit,
    )


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(data: ExpenseCreate, db: DBDep, current_user: CurrentUser):
    try:
        # Resolve employee_id from current user
        from sqlalchemy import select
        from app.models.employee import Employee
        result = await db.execute(
            select(Employee).where(Employee.user_id == current_user.id)
        )
        employee = result.scalar_one_or_none()
        if employee is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Current user is not linked to an employee record.",
            )
        return await svc.create_expense(db, data, employee.id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Create failed: {type(exc).__name__}: {exc}",
        )


@router.put("/expenses/{expense_id}/approve", response_model=ExpenseResponse)
async def approve_expense(expense_id: uuid.UUID, db: DBDep, current_user: CurrentUser):
    try:
        from sqlalchemy import select
        from app.models.employee import Employee
        result = await db.execute(
            select(Employee).where(Employee.user_id == current_user.id)
        )
        employee = result.scalar_one_or_none()
        if employee is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not linked to employee record.")
        return await svc.approve_expense(db, expense_id, employee.id)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.put("/expenses/{expense_id}/reject", response_model=ExpenseResponse)
async def reject_expense(
    expense_id: uuid.UUID,
    db: DBDep,
    _: CurrentUser,
    reason: str = Query(..., description="Rejection reason"),
):
    try:
        return await svc.reject_expense(db, expense_id, reason)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=FinanceDashboard)
async def get_dashboard(db: DBDep, _: CurrentUser):
    try:
        return await svc.get_dashboard(db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dashboard failed: {type(exc).__name__}: {exc}",
        )


# ---------------------------------------------------------------------------
# Internal helper — enrich invoice with computed fields not in ORM
# ---------------------------------------------------------------------------

def _enrich_invoice(inv) -> dict:
    from decimal import Decimal
    from app.schemas.finance import InvoiceResponse

    paid = Decimal(str(inv.paid_amount or 0))
    total = Decimal(str(inv.total_amount or 0))
    outstanding = (total - paid).quantize(Decimal("0.01"))

    # Derive supply_type
    supply_type = None
    if inv.cgst_rate is not None and inv.cgst_rate > 0:
        supply_type = "intrastate"
    elif inv.igst_rate is not None and inv.igst_rate > 0:
        supply_type = "interstate"

    data = InvoiceResponse.model_validate(inv)
    data.outstanding_amount = outstanding
    data.supply_type = supply_type
    return data
