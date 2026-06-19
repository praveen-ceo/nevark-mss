from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.clients import router as clients_router
from app.api.v1.routes.employees import router as employees_router
from app.api.v1.routes.finance import router as finance_router
from app.api.v1.routes.projects import router as projects_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(employees_router, prefix="/employees", tags=["employees"])
router.include_router(clients_router, prefix="/clients", tags=["clients"])
router.include_router(projects_router, prefix="/projects", tags=["projects"])
router.include_router(finance_router, prefix="/finance", tags=["finance"])
