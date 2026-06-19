"""reshape notifications table

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop old indexes
    op.drop_index("ix_notifications_user_id",   table_name="notifications")
    op.drop_index("ix_notifications_is_read",   table_name="notifications")
    op.drop_index("ix_notifications_user_read", table_name="notifications")

    # 2. Drop columns no longer needed
    op.drop_column("notifications", "type")
    op.drop_column("notifications", "read_at")
    op.drop_column("notifications", "message")

    # 3. Rename user_id → recipient_id + make nullable
    op.alter_column(
        "notifications", "user_id",
        new_column_name="recipient_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # 4. Rename related_type → entity_type + make NOT NULL (backfill 'system' first)
    op.execute("UPDATE notifications SET related_type = 'system' WHERE related_type IS NULL")
    op.alter_column(
        "notifications", "related_type",
        new_column_name="entity_type",
        existing_type=sa.String(50),
        nullable=False,
    )

    # 5. Rename related_id → entity_id
    op.alter_column(
        "notifications", "related_id",
        new_column_name="entity_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # 6. Rename message → body (already dropped above as TEXT NOT NULL — re-add as nullable)
    op.add_column("notifications", sa.Column("body", sa.Text(), nullable=True))

    # 7. Alter title length 500 → 255
    op.alter_column(
        "notifications", "title",
        existing_type=sa.String(500),
        type_=sa.String(255),
        nullable=False,
    )

    # 8. Add CHECK constraint on entity_type
    op.create_check_constraint(
        "ck_notifications_entity_type",
        "notifications",
        "entity_type IN ('task','project','finance','document','employee','system')",
    )

    # 9. New indexes
    op.create_index("ix_notifications_recipient_id",    "notifications", ["recipient_id"])
    op.create_index("ix_notifications_recipient_read",  "notifications", ["recipient_id", "is_read"])
    op.create_index("ix_notifications_created_at",      "notifications", ["created_at"])

    # 10. Drop notification_type_enum (only if no other table uses it)
    op.execute("DROP TYPE IF EXISTS notification_type_enum")


def downgrade() -> None:
    op.drop_index("ix_notifications_created_at",     table_name="notifications")
    op.drop_index("ix_notifications_recipient_read", table_name="notifications")
    op.drop_index("ix_notifications_recipient_id",   table_name="notifications")
    op.drop_constraint("ck_notifications_entity_type", "notifications", type_="check")
    op.drop_column("notifications", "body")

    op.alter_column("notifications", "title", existing_type=sa.String(255), type_=sa.String(500))

    op.alter_column(
        "notifications", "entity_id",
        new_column_name="related_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.alter_column(
        "notifications", "entity_type",
        new_column_name="related_type",
        existing_type=sa.String(50),
        nullable=True,
    )
    op.alter_column(
        "notifications", "recipient_id",
        new_column_name="user_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.execute("CREATE TYPE notification_type_enum AS ENUM ('info','success','warning','error')")
    op.add_column("notifications", sa.Column("read_at", sa.String(50), nullable=True))
    op.add_column("notifications", sa.Column("message", sa.Text(), nullable=False, server_default=""))
    op.add_column(
        "notifications",
        sa.Column(
            "type",
            postgresql.ENUM(name="notification_type_enum", create_type=False),
            nullable=False,
            server_default="info",
        ),
    )
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "is_read"])
    op.create_index("ix_notifications_is_read",   "notifications", ["is_read"])
    op.create_index("ix_notifications_user_id",   "notifications", ["user_id"])
