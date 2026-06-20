"""Extend notifications entity_type CHECK to include 'leave'

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-20
"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_notifications_entity_type", "notifications", type_="check")
    op.create_check_constraint(
        "ck_notifications_entity_type",
        "notifications",
        "entity_type IN ('task','project','finance','document','employee','system','leave')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_notifications_entity_type", "notifications", type_="check")
    op.create_check_constraint(
        "ck_notifications_entity_type",
        "notifications",
        "entity_type IN ('task','project','finance','document','employee','system')",
    )
