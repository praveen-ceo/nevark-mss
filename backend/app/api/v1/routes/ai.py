from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DBDep
from app.schemas.ai_chat import ChatRequest, ChatResponse
import app.services.ai_chat as svc

router = APIRouter()

# ---------------------------------------------------------------------------
# RBAC — maps role → allowed intent set
# ---------------------------------------------------------------------------
_FINANCE_INTENTS = {
    "revenue_this_month", "total_revenue",
    "pending_invoices", "overdue_invoices",
    "top_clients", "finance_summary", "gst_summary",
}
_PROJECT_INTENTS = {
    "active_projects", "delayed_projects",
    "top_projects", "pending_tasks",
    "project_summary", "project_finance", "product_performance",
}
_HR_INTENTS = {
    "employee_count", "attendance_today", "absent_today",
}
_GENERAL = {"general_ai"}

_ALL_INTENTS = _FINANCE_INTENTS | _PROJECT_INTENTS | _HR_INTENTS | _GENERAL

ROLE_INTENTS: dict[str, set[str]] = {
    "super_admin":     _ALL_INTENTS,
    "admin":           _ALL_INTENTS,
    "ceo":             _ALL_INTENTS,
    "cfo":             _FINANCE_INTENTS | _GENERAL,
    "finance_manager": _FINANCE_INTENTS | _GENERAL,
    "cto":             _PROJECT_INTENTS | _HR_INTENTS | _GENERAL,
    "project_manager": _PROJECT_INTENTS | _GENERAL,
    "manager":         _PROJECT_INTENTS | _HR_INTENTS | _GENERAL,
    "hr_manager":      _HR_INTENTS | _GENERAL,
    # Employee: own tasks / own attendance only (scoped in service)
    "employee":        {"pending_tasks", "attendance_today"} | _GENERAL,
    "viewer":          _GENERAL,
}


def _allowed_intents(roles: list[str]) -> set[str]:
    allowed: set[str] = set()
    for role in roles:
        allowed |= ROLE_INTENTS.get(role, _GENERAL)
    return allowed or _GENERAL


def _is_employee_only(roles: list[str]) -> bool:
    """True when the user has only the 'employee' role (no elevated role)."""
    elevated = {
        "super_admin", "admin", "ceo", "cto", "cfo",
        "manager", "hr_manager", "project_manager", "finance_manager",
    }
    return "employee" in roles and not any(r in elevated for r in roles)


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, db: DBDep, current_user: CurrentUser):
    try:
        role_names = [r.name for r in current_user.roles]
        allowed    = _allowed_intents(role_names)
        intent     = svc.detect_intent(body.message)

        # Unauthorised intent → polite refusal
        if intent not in allowed:
            # If general business question, route to general_ai (which IS always allowed)
            if intent == "general_ai" or not svc.is_business_or_mss_question(body.message):
                answer, data = await svc.general_ai_response(body.message)
                return ChatResponse(answer=answer, intent="general_ai", data=data)
            return ChatResponse(
                answer=(
                    "You do not have permission to view this business data. "
                    "Please contact the administrator if you need access."
                ),
                intent=intent,
                data=[],
            )

        # Employee-scoped: filter tasks / attendance to own records
        scoped_uid: str | None = str(current_user.id) if _is_employee_only(role_names) else None

        # ── Dispatch ──────────────────────────────────────────────────────
        if intent == "revenue_this_month":
            answer, data = await svc.fetch_revenue_this_month(db)

        elif intent == "total_revenue":
            answer, data = await svc.fetch_total_revenue(db)

        elif intent == "pending_invoices":
            answer, data = await svc.fetch_pending_invoices(db)

        elif intent == "overdue_invoices":
            answer, data = await svc.fetch_overdue_invoices(db)

        elif intent == "top_clients":
            answer, data = await svc.fetch_top_clients(db)

        elif intent == "top_projects":
            answer, data = await svc.fetch_top_projects(db)

        elif intent == "active_projects":
            answer, data = await svc.fetch_active_projects(db)

        elif intent == "delayed_projects":
            answer, data = await svc.fetch_delayed_projects(db)

        elif intent == "employee_count":
            answer, data = await svc.fetch_employee_count(db)

        elif intent == "attendance_today":
            answer, data = await svc.fetch_attendance_today(db, scoped_uid)

        elif intent == "absent_today":
            answer, data = await svc.fetch_absent_today(db)

        elif intent == "pending_tasks":
            answer, data = await svc.fetch_pending_tasks(db, scoped_uid)

        elif intent == "finance_summary":
            answer, data = await svc.fetch_finance_summary(db)

        elif intent == "project_summary":
            answer, data = await svc.fetch_project_summary(db)

        elif intent == "document_summary":
            answer, data = await svc.fetch_document_summary(db)

        elif intent == "gst_summary":
            answer, data = await svc.fetch_gst_summary(db)

        elif intent == "project_finance":
            answer, data = await svc.fetch_project_finance(db)

        elif intent == "product_performance":
            answer, data = await svc.fetch_product_performance(db)

        else:  # general_ai
            answer, data = await svc.general_ai_response(body.message)

        return ChatResponse(answer=answer, intent=intent, data=data)

    except Exception as exc:
        raise HTTPException(500, detail=f"AI service error. {type(exc).__name__}: {exc}")
