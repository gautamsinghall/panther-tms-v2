# PantherTMS — Delivery Phases

Each phase should end in a working, demoable increment. A phase is not "done" until
its `rules.md` §11 knowledge-base update step is complete for anything it built.

## Phase 0 — Foundation & Infra
- Repo scaffold: `frontend/`, `backend/`, `docs/` per `architecture.md`.
- Docker-compose local dev: Postgres, Redis, backend, frontend.
- Control-plane DB schema: tenants, plans, entitlements (empty/skeleton).
- Tenant provisioning script: create tenant DB + run tenant-template migrations.
- Subdomain routing working locally (Traefik or local equivalent) → resolves to a
  seeded demo tenant.
- Base auth: login/logout/JWT, one seeded Company Admin user.
- Shared frontend shell: layout, sidebar (static for now), shared `DataTable`/`Form`
  components per `design.md`.
- **Exit criteria**: can log into `demo.panthertms.local`, see an empty dashboard
  shell, and hit at least one authenticated API endpoint.

## Phase 1 — General Module (master data) + RBAC skeleton
- Consignee, Consigner, Location, Industry, Designation, Group Company, Unit,
  Method of Packing — full CRUD.
- Real RBAC model implemented (roles, permissions, module/feature assignment UI
  for Company Admin).
- Sidebar becomes permission-driven.
- **Exit criteria**: Company Admin can create an employee, restrict them to a
  subset of General Module features, and the employee's UI reflects that.

## Phase 2 — Transport Module (core operations)
- Vehicle Owner, Market Vehicle, Company Vehicle, Manage Driver.
- Job Creation → GR/LR Booking → Hire Challan chain with real status transitions.
- Arrival Report, Truck Hiring Note, POD Records.
- FASTag/GPS/SIM tracking: stub/integration-point only if no provider is chosen yet
  (mark `UNKNOWN / NEEDS VERIFICATION` per PRD §11 until resolved).
- Update E-Way Bill (manual entry first; API integration if/when decided).
- Transport Reports module (Invoice Register, LR Client-Wise, LR Booking Register,
  Unused GR/LR Series, Hire Challan Register, Pending HC Report, Unbilled Reports,
  Arrival Report Register) built against real data from this phase.
- **Exit criteria**: full Job → LR/GR → Dispatch → Arrival → POD flow works
  end-to-end for a seeded tenant, and its reports return real data.

## Phase 3 — Accounts, Misc & E-Invoicing
- Misc masters first: Primary Group, Group in Primary, Subgroup in Group, Employee
  Master, Charge Head, Tax Category.
- Accounts: General/Normal Purchase, Proforma/General/Transport Invoice, Credit/
  Debit Note, Receipt/Payment Voucher (+ ATH/BTH), General/Contra Voucher, Void
  Voucher — all posting to ledger entries.
- E-Invoicing module (Generate/Cancel IRN, IRN list, Get E-Invoice by IRN, Get
  Taxpayer Details) integrated with chosen GSP (GST Suvidha Provider) — mark
  provider choice as an open item until confirmed.
- **Exit criteria**: a Transport Invoice can be created, an IRN generated for it
  (or stubbed if GSP not yet chosen), and it appears correctly in ledger reports.

## Phase 4 — Reports & Statements
- Daybook, Ledger, Trial Balance, Balance Sheet, Profit & Loss, Sales Register,
  Purchase Register, Bank Reconciliation, Special Report.
- Statements: GST Output/Input, O/S Debtor/Creditor, TDS Payable/Return Report,
  Opening Balance Details.
- **Exit criteria**: Trial Balance ties out for a seeded tenant with Phase 2–3 data.

## Phase 5 — Fleet Management
- Trip Expense, Trip Advance, FASTag Expense, Pending Trip Expense.
- Vehicle Health, Vehicle Documents & Service, Vehicle Current Status.
- Truck-Wise P&L, Trip Expense Register, Tyre Management, Repair & Service.
- Home Module dashboards (Business Overview, Financial Analysis, Fleet &
  Operations, Own Fleet) now have real data to summarize.
- **Exit criteria**: a vehicle's full trip-expense-to-P&L view is accurate for a
  seeded tenant.

## Phase 6 — Billing, Plans & Feature Locking
- Plan definitions (Free/Pro/Business/Enterprise) with entitlement limits in the
  control DB.
- Razorpay subscription creation, autopay, webhook handling, entitlement sync.
- Signup → plan selection → payment → tenant provisioning flow (self-serve).
- Entitlement-based module/feature locking wired into every module built so far.
- Settings module (Series Category/Master, Admin Setting, User, User Activity) and
  Profile module (Change Password, User Account, Branch, Company Setting, Email
  Settings, Monthly P&L) completed here since they depend on billing/branch
  concepts.
- **Exit criteria**: a new company can sign up, pay via Razorpay autopay, and use
  a plan-appropriate subset of the product without manual setup.

## Phase 7 — AI Knowledge Base Foundation (per the uploaded spec)
- Create `docs/AI_TMS_KNOWLEDGE_BASE.md` by inspecting the *actual* repository
  built in Phases 0–6 (routes, models, RBAC, forms, workflows, statuses, APIs,
  errors) — following the full structure and rules given in the original brief
  (sections: Overview, Glossary, Roles/Permissions, Navigation Map, Module
  Knowledge, Form/Field Knowledge, Workflows, Status Transitions, Business Rules,
  API Knowledge, Error/Troubleshooting Knowledge, NL→Navigation mapping, User
  Question Knowledge, Static vs Dynamic Info, Future AI Tools/MCP Requirements,
  AI Agent Behavior Rules, Knowledge Source Priority, Code Traceability, Knowledge
  Confidence, Living Document Rule, Changelog).
- No chatbot/LLM integration/RAG/MCP server built in this phase — knowledge only.
- From this phase onward, every subsequent change follows the living-document
  update loop in `rules.md` §11.
- **Exit criteria**: the knowledge base accurately and verifiably describes the
  real, running product, with all gaps explicitly marked
  `UNKNOWN / NEEDS VERIFICATION`.

## Phase 8 — AI Support Agent (future, out of current scope)
- LLM integration, retrieval over the knowledge base, MCP/tools for live data
  (get LR status, get vehicle info, etc.), chat UI inside the product.
- Explicitly deferred — do not start until Phase 7 is stable and the product
  surface is no longer changing rapidly.
