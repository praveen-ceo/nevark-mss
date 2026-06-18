# Nevark MSS — ER Relationships

---

## Module Map

```
AUTH ──────────────────────────────────────────────────────────
  users          ←M2M→  roles          ←M2M→  permissions
  users          ──1─→  employees

EMPLOYEE ─────────────────────────────────────────────────────
  departments    ←self→  departments   (parent_id, hierarchical)
  departments    ──M─→   employees     (manager_id, deferred FK)
  employees      ──1─→   users
  employees      ──M─→   departments   (department_id)
  employees      ──1─→   attendance    (1:N)
  employees      ──1─→   leave_requests (1:N, employee_id + approved_by)

CLIENT ───────────────────────────────────────────────────────
  clients        ──1─→   client_contacts  (1:N)
  clients        ──1─→   projects         (1:N)
  clients        ──1─→   invoices         (1:N)
  clients        ──1─→   contracts        (1:N)

PROJECT ──────────────────────────────────────────────────────
  projects       ──1─→   project_tasks       (1:N, self-ref parent_id)
  projects       ──1─→   project_assignments (1:N)
  projects       ──1─→   milestones          (1:N)
  projects       ──1─→   invoices            (1:N)
  projects       ──1─→   expenses            (1:N)
  projects       ──1─→   contracts           (1:N)
  projects       ──1─→   project_delay_predictions (1:1)
  employees      ──M2M→  projects            (via project_assignments)
  employees      ──1─→   project_tasks       (assignee_id)

FINANCE ──────────────────────────────────────────────────────
  invoices       ──1─→   invoice_items        (1:N)
  invoices       ──1─→   payments             (1:N)
  invoices       ──1─→   payment_risk_predictions (1:1)
  employees      ──1─→   expenses             (employee_id + approved_by)

PURCHASE ORDERS ──────────────────────────────────────────────
  purchase_orders ──1─→  po_items             (1:N)

CONTRACTS ────────────────────────────────────────────────────
  contracts      ──1─→   contract_risks       (1:N)

DOCUMENTS ────────────────────────────────────────────────────
  document_categories ←self→ document_categories (parent_id, hierarchical)
  document_categories ──1─→  documents            (1:N)
  documents      — polymorphic ref → project|client|contract|employee|invoice
                   (related_type + related_id, no hard FK)

AI ───────────────────────────────────────────────────────────
  users          ──1─→   ai_chat_sessions     (1:N)
  ai_chat_sessions ──1─→ ai_chat_messages     (1:N, ordered by created_at)

PREDICTIONS ──────────────────────────────────────────────────
  invoices       ──1─→   payment_risk_predictions  (1:1)
  projects       ──1─→   project_delay_predictions (1:N, latest wins)
  revenue_predictions    (no FK — aggregate model output)

SYSTEM ───────────────────────────────────────────────────────
  users          ──1─→   notifications        (1:N)
  users          ──1─→   audit_logs           (1:N, nullable — system ops)
  users          ──1─→   activity_logs        (1:N, nullable — system ops)
```

---

## Key FK Cascade Rules

| Relationship                        | ondelete      | Reason                                      |
|-------------------------------------|---------------|---------------------------------------------|
| user_roles / role_permissions       | CASCADE       | Junction rows are meaningless without parent |
| attendance → employees              | CASCADE       | Attendance is owned by employee              |
| leave_requests → employees          | CASCADE       | Leave is owned by employee                  |
| client_contacts → clients           | CASCADE       | Contacts are owned by client                |
| project_tasks → projects            | CASCADE       | Tasks are owned by project                  |
| invoice_items → invoices            | CASCADE       | Items are owned by invoice                  |
| po_items → purchase_orders          | CASCADE       | Items are owned by PO                       |
| contract_risks → contracts          | CASCADE       | Risks are owned by contract                 |
| ai_chat_messages → ai_chat_sessions | CASCADE       | Messages are owned by session               |
| payment_risk_predictions → invoices | CASCADE       | Prediction is owned by invoice              |
| project_delay_predictions → projects| CASCADE       | Prediction is owned by project              |
| employees → users                   | RESTRICT      | User must not be deleted while employed     |
| invoices → clients                  | RESTRICT      | Client must not be deleted with invoices    |
| payments → invoices                 | RESTRICT      | Invoice must not be deleted with payments   |
| expenses → employees                | RESTRICT      | Employee must not be deleted with expenses  |
| departments.manager_id → employees  | SET NULL      | Manager reassignment on delete (deferred FK)|
| employees.department_id → depts     | SET NULL      | Department reassignment on delete           |
| projects.client_id → clients        | SET NULL      | Project survives client deletion            |
| invoices.project_id → projects      | SET NULL      | Invoice survives project deletion           |

---

## Circular FK Resolution

`departments.manager_id` → `employees.id`  
`employees.department_id` → `departments.id`

**Resolution:** `use_alter=True` on `departments.manager_id` + named constraint
`fk_departments_manager_id`. Migration creates `departments` without the FK,
creates `employees`, then adds the FK with `op.create_foreign_key()`.

---

## Polymorphic References (no hard FK)

| Table      | Columns                       | Resolves to                                   |
|------------|-------------------------------|-----------------------------------------------|
| documents  | related_type, related_id      | project \| client \| contract \| employee \| invoice |
| notifications | related_type, related_id   | any entity                                    |
| audit_logs | table_name, record_id         | any table                                     |

---

## Indexes Summary

All tables have composite index on (`is_active`) and/or (`created_at`) where
high-read volume is expected. Additional indexes:

- `users`: email (unique), is_active
- `employees`: department_id, employment_type
- `attendance`: (employee_id, date), date
- `leave_requests`: employee_id, status, (start_date, end_date)
- `projects`: client_id, status, priority
- `project_tasks`: project_id, assignee_id, status, parent_id
- `invoices`: client_id, project_id, status, due_date
- `payments`: invoice_id, status, payment_date
- `expenses`: project_id, employee_id, status, date
- `contracts`: client_id, project_id, status, end_date
- `audit_logs`: user_id, (table_name, record_id), action, created_at
- `notifications`: user_id, is_read, (user_id, is_read)
