from fastapi import APIRouter

from app.api.v1.routes.analytics import router as analytics_router
from app.api.v1.routes.attendance import router as attendance_router
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.clients import router as clients_router
from app.api.v1.routes.documents import router as documents_router
from app.api.v1.routes.employees import router as employees_router
from app.api.v1.routes.finance import router as finance_router
from app.api.v1.routes.notifications import router as notifications_router
from app.api.v1.routes.projects import router as projects_router
from app.api.v1.routes.tasks import router as tasks_router
from app.api.v1.routes.products import router as products_router

router = APIRouter()

router.include_router(auth_router,          prefix="/auth",          tags=["auth"])
router.include_router(employees_router,     prefix="/employees",     tags=["employees"])
router.include_router(attendance_router,    prefix="/attendance",    tags=["attendance"])
router.include_router(clients_router,       prefix="/clients",       tags=["clients"])
router.include_router(projects_router,      prefix="/projects",      tags=["projects"])
router.include_router(finance_router,       prefix="/finance",       tags=["finance"])
router.include_router(tasks_router,         prefix="/tasks",         tags=["tasks"])
router.include_router(documents_router,     prefix="/documents",     tags=["documents"])
router.include_router(analytics_router,     prefix="/analytics",     tags=["analytics"])
router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
router.include_router(products_router,      prefix="/products",      tags=["products"])
