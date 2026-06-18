import random
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import ProjectStatus
from app.models.project import Project, ProjectTask, Milestone
from app.schemas.project import ProjectCreate, ProjectUpdate

log = structlog.get_logger(__name__)


def _base_query():
    return select(Project).options(
        selectinload(Project.client),
        selectinload(Project.tasks),
        selectinload(Project.milestones),
    )


async def _generate_code(db: AsyncSession) -> str:
    from datetime import date as _date
    year = _date.today().year
    for _ in range(20):
        code = f"PRJ{year}{random.randint(1000, 9999)}"
        n = await db.scalar(select(func.count()).where(Project.code == code))
        if not n:
            return code
    raise RuntimeError("Could not generate unique project code")


async def list_projects(
    db: AsyncSession,
    search: Optional[str] = None,
    status: Optional[ProjectStatus] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Project]:
    q = _base_query()
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(Project.name.ilike(s), Project.code.ilike(s), Project.description.ilike(s))
        )
    if status:
        q = q.where(Project.status == status)
    q = q.order_by(Project.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_project(db: AsyncSession, project_id: uuid.UUID) -> Project:
    result = await db.execute(_base_query().where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise ValueError("Project not found")
    return project


async def create_project(db: AsyncSession, data: ProjectCreate) -> Project:
    code = data.code or await _generate_code(db)

    existing = await db.scalar(select(func.count()).where(Project.code == code))
    if existing:
        raise ValueError(f"Project code '{code}' already exists")

    project = Project(
        id=uuid.uuid4(),
        name=data.name,
        code=code,
        description=data.description,
        client_id=data.client_id,
        status=data.status,
        priority=data.priority,
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget,
        currency=data.currency,
    )
    db.add(project)
    await db.commit()
    log.info("project.created", code=code, name=data.name)
    return await get_project(db, project.id)


async def update_project(
    db: AsyncSession, project_id: uuid.UUID, data: ProjectUpdate
) -> Project:
    project = await get_project(db, project_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    log.info("project.updated", project_id=str(project_id))
    return await get_project(db, project_id)


async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> None:
    project = await get_project(db, project_id)
    project.is_active = False
    await db.commit()
    log.info("project.deactivated", project_id=str(project_id))
