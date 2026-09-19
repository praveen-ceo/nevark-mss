# ============================================================
# Nevark Technologies Pvt. Ltd.
# All rights reserved © 2026 Nevark Technologies.
# Unauthorized use, reproduction, or distribution of this
# code is strictly prohibited.
# Module  : 0006_project_dept_and_dept_type.py
# Author  : Development Team
# Created : 2026-09-07 18:00:00
# ============================================================

"""Add department_type to departments and department_id to projects

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-07

Changes:
  - departments.department_type  (nullable enum: group | business_unit | department)
  - departments index ix_departments_type
  - projects.department_id       (nullable UUID FK → departments.id ON DELETE SET NULL)
  - projects index ix_projects_department_id

Both columns are nullable. No existing rows are modified.
Existing projects with NULL department_id are valid and remain in the global
(no-filter) dashboard view; they are excluded from organisation-filtered
project/finance metrics — this is the authoritative documented behaviour.

Downgrade path cleanly removes both columns, their indexes, and the enum type.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create the department_type_enum PostgreSQL enum type
    # ------------------------------------------------------------------
    op.execute("""
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_type_enum') THEN
        CREATE TYPE department_type_enum AS ENUM ('group', 'business_unit', 'department');
    END IF;
END $$;
""")

    # ------------------------------------------------------------------
    # 2. Add department_type column to departments (nullable)
    # ------------------------------------------------------------------
    op.add_column(
        "departments",
        sa.Column(
            "department_type",
            postgresql.ENUM(
                "group", "business_unit", "department",
                name="department_type_enum",
                create_type=False,  # already created above
            ),
            nullable=True,
        ),
    )

    # ------------------------------------------------------------------
    # 3. Index on departments.department_type
    #    (matches ORM: ix_departments_type)
    # ------------------------------------------------------------------
    op.create_index("ix_departments_type", "departments", ["department_type"])

    # ------------------------------------------------------------------
    # 4. Add department_id FK column to projects (nullable)
    # ------------------------------------------------------------------
    op.add_column(
        "projects",
        sa.Column(
            "department_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    # ------------------------------------------------------------------
    # 5. Foreign key constraint: projects.department_id → departments.id
    # ------------------------------------------------------------------
    op.create_foreign_key(
        "fk_projects_department_id",
        "projects",
        "departments",
        ["department_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # ------------------------------------------------------------------
    # 6. Index on projects.department_id
    #    (matches ORM: ix_projects_department_id)
    # ------------------------------------------------------------------
    op.create_index("ix_projects_department_id", "projects", ["department_id"])


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Reverse in exact opposite order of upgrade
    # ------------------------------------------------------------------

    # 6. Drop project department index
    op.drop_index("ix_projects_department_id", table_name="projects")

    # 5. Drop foreign key constraint
    op.drop_constraint("fk_projects_department_id", "projects", type_="foreignkey")

    # 4. Drop department_id column from projects
    op.drop_column("projects", "department_id")

    # 3. Drop department type index
    op.drop_index("ix_departments_type", table_name="departments")

    # 2. Drop department_type column from departments
    op.drop_column("departments", "department_type")

    # 1. Drop the enum type
    op.execute("DROP TYPE IF EXISTS department_type_enum")
