import random
import uuid
from typing import List, Optional

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.auth import Role, User, user_roles
from app.models.employee import Department, Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

log = structlog.get_logger(__name__)


def _base_query():
    return select(Employee).options(
        selectinload(Employee.user),
        selectinload(Employee.department),
    )


async def _generate_code(db: AsyncSession) -> str:
    from datetime import date as _date
    year = _date.today().year
    for _ in range(20):
        code = f"EMP{year}{random.randint(1000, 9999)}"
        n = await db.scalar(select(func.count()).where(Employee.employee_code == code))
        if not n:
            return code
    raise RuntimeError("Could not generate unique employee code")


async def list_employees(
    db: AsyncSession,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Employee]:
    q = _base_query()
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                Employee.first_name.ilike(s),
                Employee.last_name.ilike(s),
                Employee.job_title.ilike(s),
            )
        )
    q = q.order_by(Employee.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_employee(db: AsyncSession, employee_id: uuid.UUID) -> Employee:
    result = await db.execute(
        _base_query().where(Employee.id == employee_id)
    )
    emp = result.scalar_one_or_none()
    if emp is None:
        raise ValueError("Employee not found")
    return emp


async def create_employee(db: AsyncSession, data: EmployeeCreate) -> Employee:
    # Email uniqueness check
    existing = await db.scalar(select(func.count()).where(User.email == data.email))
    if existing:
        raise ValueError(f"Email {data.email} is already registered")

    # Create linked user account
    user = User(
        id=uuid.uuid4(),
        email=data.email,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.flush()

    # Assign role if provided
    if data.role:
        role_obj = await db.scalar(
            select(Role).where(Role.name == data.role, Role.is_active.is_(True))
        )
        if role_obj:
            await db.execute(
                user_roles.insert().values(user_id=user.id, role_id=role_obj.id)
            )
        else:
            log.warning("employee.create.role_not_found", role=data.role)

    code = await _generate_code(db)
    emp = Employee(
        id=uuid.uuid4(),
        user_id=user.id,
        employee_code=code,
        first_name=data.first_name,
        last_name=data.last_name,
        job_title=data.job_title,
        department_id=data.department_id,
        employment_type=data.employment_type.value if hasattr(data.employment_type, "value") else data.employment_type,
        hire_date=data.hire_date,
        phone=data.phone,
        address=data.address,
        salary=data.salary,
    )
    db.add(emp)
    await db.commit()
    log.info("employee.created", code=code, email=data.email, role=data.role)
    return await get_employee(db, emp.id)


async def update_employee(
    db: AsyncSession,
    employee_id: uuid.UUID,
    data: EmployeeUpdate,
) -> Employee:
    emp = await get_employee(db, employee_id)

    if data.full_name is not None:
        emp.user.full_name = data.full_name

    fields = data.model_dump(exclude={"full_name"}, exclude_none=True)
    for field, value in fields.items():
        setattr(emp, field, value)

    await db.commit()
    log.info("employee.updated", employee_id=str(employee_id))
    return await get_employee(db, employee_id)


async def deactivate_employee(db: AsyncSession, employee_id: uuid.UUID) -> None:
    emp = await get_employee(db, employee_id)
    emp.is_active = False
    emp.user.is_active = False
    await db.commit()
    log.info("employee.deactivated", employee_id=str(employee_id))
