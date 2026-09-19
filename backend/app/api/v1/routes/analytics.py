# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : analytics.py
# Author  : Development Team
# Created : 2026-09-05 15:08:00
# ============================================================

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import CurrentUser, DBDep
from app.schemas.analytics import DashboardAnalytics
from app.services import analytics as svc

router = APIRouter()


@router.get("/dashboard", response_model=DashboardAnalytics)
async def get_dashboard(
    db: DBDep,
    _: CurrentUser,
    group_id: Optional[uuid.UUID] = Query(
        None,
        description=(
            "Filter by Group department ID. Only departments explicitly classified "
            "as department_type='group' are valid Group selectors. "
            "Includes all descendant Business Units and Departments."
        ),
    ),
    business_unit_id: Optional[uuid.UUID] = Query(
        None,
        description=(
            "Filter by Business Unit department ID. "
            "When group_id is also supplied, this BU must be a descendant of that group; "
            "an invalid combination returns HTTP 422."
        ),
    ),
    start_date: Optional[date] = Query(None, description="Start date for range filter"),
    end_date: Optional[date] = Query(None, description="End date for range filter"),
):
    """Return dashboard analytics, optionally filtered by organisational unit and date range.

    Filtering behaviour:
      - No parameters   → global view (all records, current behaviour)
      - group_id only   → metrics scoped to the group and all its descendants
      - business_unit_id only → metrics scoped to the BU and all its descendants
      - both supplied   → business_unit_id must belong to group_id (422 otherwise)
      - start_date/end_date → scoped to date bounds (AND semantic with org filter)

    Known limitations:
      - Recent Activity feed remains global regardless of filter.
      - Projects with NULL department_id are excluded from filtered
        project/finance metrics but included in the global view.
      - Untyped departments (department_type = NULL) are not treated as Groups
        or Business Units; filtering by their ID resolves only their own records.
    """
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date cannot be after end_date")
    
    try:
        return await svc.get_dashboard(
            db,
            group_id=group_id,
            business_unit_id=business_unit_id,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {exc}")
