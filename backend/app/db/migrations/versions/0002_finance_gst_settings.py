"""finance gst columns and settings table

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-18 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Add GST columns to invoices
    # ------------------------------------------------------------------
    op.add_column("invoices", sa.Column("cgst_rate",       sa.Numeric(5, 2),   nullable=True))
    op.add_column("invoices", sa.Column("sgst_rate",       sa.Numeric(5, 2),   nullable=True))
    op.add_column("invoices", sa.Column("igst_rate",       sa.Numeric(5, 2),   nullable=True))
    op.add_column("invoices", sa.Column("cgst_amount",     sa.Numeric(15, 2),  nullable=True))
    op.add_column("invoices", sa.Column("sgst_amount",     sa.Numeric(15, 2),  nullable=True))
    op.add_column("invoices", sa.Column("igst_amount",     sa.Numeric(15, 2),  nullable=True))
    op.add_column("invoices", sa.Column("place_of_supply", sa.String(100),     nullable=True))
    op.add_column("invoices", sa.Column("gstin",           sa.String(20),      nullable=True))

    # ------------------------------------------------------------------
    # 2. Create finance_settings table
    # ------------------------------------------------------------------
    op.create_table(
        "finance_settings",
        # BaseModel columns
        sa.Column("id",           postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("is_active",    sa.Boolean(),                  nullable=False, default=True),
        sa.Column("deleted_at",   sa.DateTime(timezone=True),    nullable=True),
        sa.Column("created_at",   sa.DateTime(timezone=True),    server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at",   sa.DateTime(timezone=True),    server_default=sa.func.now(), nullable=False),
        sa.Column("created_by",   postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("updated_by",   postgresql.UUID(as_uuid=True), nullable=True),
        # Company details
        sa.Column("company_name",    sa.String(255), nullable=True),
        sa.Column("company_address", sa.Text(),      nullable=True),
        sa.Column("company_email",   sa.String(255), nullable=True),
        sa.Column("company_phone",   sa.String(20),  nullable=True),
        sa.Column("pan",             sa.String(10),  nullable=True),
        # GST
        sa.Column("company_gstin", sa.String(20),    nullable=True),
        sa.Column("state_code",    sa.String(5),     nullable=True),
        sa.Column("cgst_rate",     sa.Numeric(5, 2), nullable=False, server_default="9"),
        sa.Column("sgst_rate",     sa.Numeric(5, 2), nullable=False, server_default="9"),
        sa.Column("igst_rate",     sa.Numeric(5, 2), nullable=False, server_default="18"),
        # Bank
        sa.Column("bank_name",    sa.String(255), nullable=True),
        sa.Column("bank_account", sa.String(50),  nullable=True),
        sa.Column("bank_ifsc",    sa.String(20),  nullable=True),
        sa.Column("bank_branch",  sa.String(255), nullable=True),
        # Invoice settings
        sa.Column("invoice_prefix",   sa.String(10), nullable=False, server_default="NVK"),
        sa.Column("default_sac",      sa.String(20), nullable=False, server_default="998314"),
        sa.Column("payment_terms",    sa.Integer(),  nullable=False, server_default="30"),
        sa.Column("default_currency", sa.String(3),  nullable=False, server_default="INR"),
    )


def downgrade() -> None:
    op.drop_table("finance_settings")

    for col in [
        "cgst_rate", "sgst_rate", "igst_rate",
        "cgst_amount", "sgst_amount", "igst_amount",
        "place_of_supply", "gstin",
    ]:
        op.drop_column("invoices", col)
