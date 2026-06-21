from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DBDep
from app.schemas.ai_chat import ChatRequest, ChatResponse
import app.services.ai_chat as svc

router = APIRouter()

# ---------------------------------------------------------------------------
# RBAC — which intents each role may access
# ---------------------------------------------------------------------------
_ALL = {
    "revenue_summary", "pending_payments", "project_finance",
    "active_projects", "pending_tasks", "attendance_today",
    "product_performance", "top_clients", "gst_summary", "general_help",
}

_FINANCE = {"revenue_summary", "pending_payments", "project_finance",
            "top_clients", "gst_summary", "general_help"}

_TECH = {"active_projects", "pending_tasks", "product_performance",
         "attendance_today", "general_help"}

_MANAGER = {"active_projects", "pending_tasks", "attendance_today",
            "product_performance", "general_help"}

_EMPLOYEE = {"pending_tasks", "attendance_today", "general_help"}

ROLE_INTENTS: dict[str, set[str]] = {
    "super_admin":     _ALL,
    "admin":           _ALL,
    "ceo":             _ALL,
    "cfo":             _FINANCE,
    "finance_manager": _FINANCE,
    "cto":             _TECH,
    "project_manager": _TECH,
    "manager":         _MANAGER,
    "hr_manager":      {"attendance_today", "general_help"},
    "employee":        _EMPLOYEE,
    "viewer":          {"general_help"},
}

def _allowed_intents(roles: list[str]) -> set[str]:
    allowed: set[str] = set()
    for role in roles:
        allowed |= ROLE_INTENTS.get(role, {"general_help"})
    return allowed or {"general_help"}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, db: DBDep, current_user: CurrentUser):
    try:
        role_names = [r.name for r in current_user.roles]
        allowed    = _allowed_intents(role_names)
        intent     = svc.detect_intent(body.message)

        # Downgrade to general_help if role cannot access the detected intent
        if intent not in allowed:
            intent = "general_help"

        # Employee-scoped intents pass the user_id so service filters to own data
        is_employee_only = "employee" in role_names and not any(
            r in role_names for r in ("super_admin","admin","ceo","cto","cfo","manager","hr_manager","project_manager","finance_manager")
        )
        scoped_user_id: str | None = str(current_user.id) if is_employee_only else None

        if intent == "revenue_summary":
            answer, data = await svc.fetch_revenue_summary(db)
        elif intent == "pending_payments":
            answer, data = await svc.fetch_pending_payments(db)
        elif intent == "project_finance":
            answer, data = await svc.fetch_project_finance(db)
        elif intent == "active_projects":
            answer, data = await svc.fetch_active_projects(db)
        elif intent == "pending_tasks":
            answer, data = await svc.fetch_pending_tasks(db, scoped_user_id)
        elif intent == "attendance_today":
            answer, data = await svc.fetch_attendance_today(db, scoped_user_id)
        elif intent == "product_performance":
            answer, data = await svc.fetch_product_performance(db)
        elif intent == "top_clients":
            answer, data = await svc.fetch_top_clients(db)
        elif intent == "gst_summary":
            answer, data = await svc.fetch_gst_summary(db)
        else:
            answer, data = svc.general_help()

        return ChatResponse(answer=answer, intent=intent, data=data)

    except Exception as exc:
        raise HTTPException(500, detail=f"AI service error. {type(exc).__name__}: {exc}")
