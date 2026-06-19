from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DBDep
from app.schemas.analytics import DashboardAnalytics
from app.services import analytics as svc

router = APIRouter()


@router.get("/dashboard", response_model=DashboardAnalytics)
async def get_dashboard(db: DBDep, _: CurrentUser):
    try:
        return await svc.get_dashboard(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
