# Import all models so Alembic can detect them via Base.metadata
from app.models.base import Base  # noqa: F401

from app.models.auth import Permission, Role, User, role_permissions, user_roles  # noqa: F401
from app.models.employee import Attendance, Department, Employee, LeaveRequest  # noqa: F401
from app.models.client import Client, ClientContact  # noqa: F401
from app.models.project import Milestone, Project, ProjectAssignment, ProjectTask  # noqa: F401
from app.models.finance import Expense, Invoice, InvoiceItem, Payment  # noqa: F401
from app.models.settings import FinanceSettings  # noqa: F401
from app.models.purchase_order import POItem, PurchaseOrder  # noqa: F401
from app.models.contract import Contract, ContractRisk  # noqa: F401
from app.models.document import Document, DocumentCategory  # noqa: F401
from app.models.ai import AIChatMessage, AIChatSession  # noqa: F401
from app.models.prediction import (  # noqa: F401
    PaymentRiskPrediction,
    ProjectDelayPrediction,
    RevenuePrediction,
)
from app.models.system import ActivityLog, AuditLog, Notification  # noqa: F401

__all__ = ["Base"]
from app.models.product import Product  # noqa: F401
