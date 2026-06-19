import uuid
from datetime import date
from typing import List, Optional

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import MilestoneStatus, TaskStatus
from app.models.project import Milestone, ProjectTask
from app.schemas.tasks import MilestoneCreate, MilestoneUpdate, TaskCreate, TaskUpdate

log = structlog.get_logger(__name__)


def _base_task_query():
    return select(ProjectTask).options(
        selectinload(ProjectTask.project),
        selectinload(ProjectTask.assignee),
    )


def _base_milestone_query():
    return select(Milestone).options(
        selectinload(Milestone.project),
    )


async def list_tasks(
    db: AsyncSession,
    project_id: Optional[uuid.UUID] = None,
    status: Optional[TaskStatus] = None,
    assignee_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[ProjectTask]:
    q = _base_task_query().where(ProjectTask.is_active == True)
    if project_id:
        q = q.where(ProjectTask.project_id == project_id)
    if status:
        q = q.where(ProjectTask.status == status)
    if assignee_id:
        q = q.where(ProjectTask.assignee_id == assignee_id)
    q = q.order_by(ProjectTask.due_date.asc().nulls_last(), ProjectTask.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_task(db: AsyncSession, task_id: uuid.UUID) -> ProjectTask:
    result = await db.execute(_base_task_query().where(ProjectTask.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise ValueError("Task not found")
    return task


async def create_task(db: AsyncSession, data: TaskCreate) -> ProjectTask:
    task = ProjectTask(
        id=uuid.uuid4(),
        project_id=data.project_id,
        assignee_id=data.assignee_id,
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
        estimated_hours=data.estimated_hours,
    )
    db.add(task)
    await db.commit()
    log.info("task.created", title=data.title)
    return await get_task(db, task.id)


async def update_task(db: AsyncSession, task_id: uuid.UUID, data: TaskUpdate) -> ProjectTask:
    task = await get_task(db, task_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    await db.commit()
    return await get_task(db, task_id)


async def deactivate_task(db: AsyncSession, task_id: uuid.UUID) -> None:
    task = await get_task(db, task_id)
    task.is_active = False
    await db.commit()
    log.info("task.deactivated", task_id=str(task_id))


async def get_dashboard(db: AsyncSession):
    from app.schemas.tasks import TaskDashboard
    today = date.today()

    rows = await db.execute(
        select(ProjectTask.status, func.count(ProjectTask.id))
        .where(ProjectTask.is_active == True)
        .group_by(ProjectTask.status)
    )
    counts = {row[0]: row[1] for row in rows.all()}

    overdue_count = await db.scalar(
        select(func.count(ProjectTask.id))
        .where(ProjectTask.is_active == True)
        .where(ProjectTask.due_date < today)
        .where(ProjectTask.status != TaskStatus.DONE)
    )

    total = sum(counts.values())
    return TaskDashboard(
        total=total,
        completed=counts.get(TaskStatus.DONE, 0),
        in_progress=counts.get(TaskStatus.IN_PROGRESS, 0),
        overdue=overdue_count or 0,
        todo=counts.get(TaskStatus.TODO, 0),
        blocked=counts.get(TaskStatus.BLOCKED, 0),
    )


async def list_milestones(
    db: AsyncSession,
    project_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 200,
) -> List[Milestone]:
    q = _base_milestone_query().where(Milestone.is_active == True)
    if project_id:
        q = q.where(Milestone.project_id == project_id)
    q = q.order_by(Milestone.due_date.asc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_milestone(db: AsyncSession, milestone_id: uuid.UUID) -> Milestone:
    result = await db.execute(_base_milestone_query().where(Milestone.id == milestone_id))
    ms = result.scalar_one_or_none()
    if ms is None:
        raise ValueError("Milestone not found")
    return ms


async def create_milestone(db: AsyncSession, data: MilestoneCreate) -> Milestone:
    ms = Milestone(
        id=uuid.uuid4(),
        project_id=data.project_id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status=MilestoneStatus.PENDING,
    )
    db.add(ms)
    await db.commit()
    log.info("milestone.created", title=data.title)
    return await get_milestone(db, ms.id)


async def update_milestone(db: AsyncSession, milestone_id: uuid.UUID, data: MilestoneUpdate) -> Milestone:
    ms = await get_milestone(db, milestone_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(ms, field, value)
    await db.commit()
    return await get_milestone(db, milestone_id)


async def complete_milestone(db: AsyncSession, milestone_id: uuid.UUID) -> Milestone:
    ms = await get_milestone(db, milestone_id)
    if ms.status == MilestoneStatus.COMPLETED:
        raise ValueError("Milestone is already completed")
    ms.status = MilestoneStatus.COMPLETED
    ms.completed_at = date.today()
    await db.commit()
    log.info("milestone.completed", milestone_id=str(milestone_id))
    return await get_milestone(db, milestone_id)
