"""Add products table

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enum types
    op.execute("""
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category_enum') THEN
        CREATE TYPE product_category_enum AS ENUM
        ('technologies','fashion_boutiques','logistics','foods','systems');
    END IF;
END $$;
""")

    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_stream_enum') THEN
            CREATE TYPE product_stream_enum AS ENUM
            ('b2b','b2c','saas','marketplace','services','other');
        END IF;
    END $$;
    """)

    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status_enum') THEN
            CREATE TYPE product_status_enum AS ENUM
            ('active','inactive','discontinued','upcoming','beta');
        END IF;
    END $$;
    """)

    op.create_table(
        "products",
        # PK + audit + soft-delete (mirrors BaseModel)
        sa.Column("id",         postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("is_active",  sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by", postgresql.UUID(as_uuid=True), nullable=True),
        # Product fields
        sa.Column("name",         sa.String(255), nullable=False),
        sa.Column("product_code", sa.String(100), nullable=False),
        sa.Column("category", postgresql.ENUM(
    "technologies", "fashion_boutiques", "logistics", "foods", "systems",
    name="product_category_enum",
    create_type=False,
), nullable=False),

sa.Column("stream", postgresql.ENUM(
    "b2b", "b2c", "saas", "marketplace", "services", "other",
    name="product_stream_enum",
    create_type=False,
), nullable=False),

sa.Column("status", postgresql.ENUM(
    "active", "inactive", "discontinued", "upcoming", "beta",
    name="product_status_enum",
    create_type=False,
), nullable=False, server_default="active"),
        sa.Column("description",       sa.Text(), nullable=True),
        sa.Column("launch_date",       sa.Date(), nullable=True),
        sa.Column("revenue_generated", sa.Numeric(18, 2), nullable=True),
        sa.Column("units_sold",        sa.BigInteger(), nullable=True),
        sa.Column("active_units",      sa.BigInteger(), nullable=True),
        sa.Column("total_customers",   sa.BigInteger(), nullable=True),
        sa.Column("product_owner_id",  postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
        # Constraints
        sa.UniqueConstraint("product_code", name="uq_products_code"),
    )

    op.create_index("ix_products_category", "products", ["category"])
    op.create_index("ix_products_status",   "products", ["status"])
    op.create_index("ix_products_owner_id", "products", ["product_owner_id"])


def downgrade() -> None:
    op.drop_index("ix_products_owner_id", table_name="products")
    op.drop_index("ix_products_status",   table_name="products")
    op.drop_index("ix_products_category", table_name="products")
    op.drop_table("products")
    op.execute("DROP TYPE IF EXISTS product_status_enum")
    op.execute("DROP TYPE IF EXISTS product_stream_enum")
    op.execute("DROP TYPE IF EXISTS product_category_enum")
