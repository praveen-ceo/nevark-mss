import uuid
from typing import List, Optional

import structlog
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.client import Client, ClientContact
from app.schemas.client import ClientCreate, ClientUpdate

log = structlog.get_logger(__name__)


def _base_query():
    return select(Client).options(selectinload(Client.contacts))


async def list_clients(
    db: AsyncSession,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[Client]:
    q = _base_query()
    if search:
        s = f"%{search}%"
        q = q.where(
            or_(
                Client.name.ilike(s),
                Client.industry.ilike(s),
                Client.email.ilike(s),
                Client.city.ilike(s),
            )
        )
    q = q.order_by(Client.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_client(db: AsyncSession, client_id: uuid.UUID) -> Client:
    result = await db.execute(_base_query().where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise ValueError("Client not found")
    return client


async def create_client(db: AsyncSession, data: ClientCreate) -> Client:
    existing = await db.scalar(
        select(func.count()).where(Client.name == data.name, Client.is_active.is_(True))
    )
    if existing:
        raise ValueError(f"Active client '{data.name}' already exists")

    client = Client(id=uuid.uuid4(), **data.model_dump())
    db.add(client)
    await db.commit()
    log.info("client.created", name=data.name)
    return await get_client(db, client.id)


async def update_client(
    db: AsyncSession, client_id: uuid.UUID, data: ClientUpdate
) -> Client:
    client = await get_client(db, client_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    await db.commit()
    log.info("client.updated", client_id=str(client_id))
    return await get_client(db, client_id)


async def delete_client(db: AsyncSession, client_id: uuid.UUID) -> None:
    client = await get_client(db, client_id)
    client.is_active = False
    await db.commit()
    log.info("client.deactivated", client_id=str(client_id))
