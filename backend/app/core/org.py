# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : org.py
# Author  : Development Team
# Created : 2026-09-07 18:00:00
# ============================================================

"""Organisational hierarchy utilities for Enhancement 1 dashboard filtering.

Design decision — application-level traversal:
  All departments are loaded in a single query. Python BFS then resolves the
  complete set of descendant IDs for a given root. This avoids recursive SQL
  CTEs, is trivially fast for expected hierarchy sizes (< 200 departments),
  and produces zero N+1 queries.
"""
from __future__ import annotations

import uuid
from collections import defaultdict, deque
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Department
from app.models.enums import DepartmentType


async def load_all_departments(db: AsyncSession) -> list[Department]:
    """Return all active departments in one query."""
    result = await db.execute(
        select(Department).where(Department.is_active.is_(True))
    )
    return list(result.scalars().all())


def collect_descendant_ids(
    depts: list[Department],
    root_id: uuid.UUID,
) -> set[uuid.UUID]:
    """BFS traversal from *root_id* over the in-memory *depts* list.

    Returns the root_id itself plus all descendant IDs.
    Zero database queries — caller must supply the full department list
    (obtained via load_all_departments).
    """
    children_map: dict[Optional[uuid.UUID], list[uuid.UUID]] = defaultdict(list)
    id_set: set[uuid.UUID] = {d.id for d in depts}

    for dept in depts:
        children_map[dept.parent_id].append(dept.id)

    if root_id not in id_set:
        return set()

    result: set[uuid.UUID] = set()
    queue: deque[uuid.UUID] = deque([root_id])
    while queue:
        current = queue.popleft()
        result.add(current)
        for child_id in children_map.get(current, []):
            if child_id not in result:
                queue.append(child_id)
    return result


def is_descendant_of(
    depts: list[Department],
    candidate_id: uuid.UUID,
    ancestor_id: uuid.UUID,
) -> bool:
    """Return True if *candidate_id* is equal to or a descendant of *ancestor_id*.

    Used to validate that a business_unit_id belongs to the selected group_id.
    """
    descendant_ids = collect_descendant_ids(depts, ancestor_id)
    return candidate_id in descendant_ids


def build_dept_tree(depts: list[Department]) -> list[Department]:
    """Return only root departments (parent_id IS NULL) from the list.

    The full tree structure is built in the schema layer by nesting children.
    """
    return [d for d in depts if d.parent_id is None]


def get_groups(depts: list[Department]) -> list[Department]:
    """Return only departments explicitly classified as GROUP.

    Enhancement 1 revision: untyped root departments are NOT inferred as groups.
    Only records with department_type = GROUP appear in the Group selector.
    """
    return [d for d in depts if d.department_type == DepartmentType.GROUP]


def get_business_units(
    depts: list[Department],
    group_id: Optional[uuid.UUID] = None,
) -> list[Department]:
    """Return departments classified as BUSINESS_UNIT.

    If *group_id* is supplied, restricts to business units that are
    descendants of that group.
    """
    bus = [d for d in depts if d.department_type == DepartmentType.BUSINESS_UNIT]
    if group_id is None:
        return bus
    group_descendants = collect_descendant_ids(depts, group_id)
    return [d for d in bus if d.id in group_descendants]
