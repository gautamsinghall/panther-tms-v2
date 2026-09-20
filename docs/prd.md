# PantherTMS — Product Requirements Document (PRD)

## 1. Document Info
- **Product**: PantherTMS (multi-tenant SaaS Transport Management System)
- **Version**: 0.1 (initial scope)
- **Owner**: Parth
- **Status**: Draft — foundation for coding-agent-driven development
- **Companion docs**: `architecture.md`, `rules.md`, `phases.md`, `design.md`

## 2. Product Summary
PantherTMS is a SaaS product sold to transport/logistics companies ("tenants"). Each
tenant runs their own isolated instance of the TMS (own data, own users, own branding
touches) under a subdomain (e.g. `abc.panthertms.com`), while PantherTMS as a business
manages tenants, plans, billing, and platform-wide operations from a central control
plane.

Users within a tenant manage day-to-day transport operations: bookings (LR/GR),
vehicle and driver management, trip execution, accounting/invoicing, GST/e-invoicing,
fleet costs and maintenance, and business reporting — all from one system.

## 3. Goals
- Give small/medium transport companies a single system to replace spreadsheets,
  WhatsApp coordination, and disconnected billing tools.
- Support multiple independent companies (tenants) on shared infrastructure with
  strict data isolation.
- Monetize via subscription plans (Free/Pro/Business/Enterprise) with feature and
  usage locking enforced by entitlements.
- Produce a codebase clean and well-documented enough that a **future AI support
  agent** can be layered on top without needing to reverse-engineer the app (see
  §9 and `phases.md` Phase 7).

## 4. Non-Goals (for this scope)
- Building the AI chat agent itself, RAG/embeddings, vector DB, or MCP tools.
  (Only the *knowledge base foundation* for it — see §9.)
- Native mobile apps (mobile-responsive web only, for now).
- Multi-country tax compliance (India/GST-first).

## 5. Target Users
- **Transport company admins/owners** — manage the whole account, users, billing.
- **Operations/booking staff** — create jobs, LR/GR, hire challans, track vehicles.
- **Accounts staff** — invoicing, vouchers, ledgers, GST, e-invoicing.
- **Fleet managers** — vehicle health, documents, tyres, repair & service, trip P&L.
- **Drivers** (limited/future) — status updates via lightweight access, if in scope later.
- **PantherTMS platform admins** — manage tenants, plans, billing, support.

## 6. Multi-Tenancy & Plans
- One PantherTMS account = one tenant/company; a tenant may itself represent a
  **group of companies** (see General Module → Group Company) sharing one
  subscription.
- Subscription tiers: **FREE / PRO / BUSINESS / ENTERPRISE**, each with entitlement
  limits (e.g. number of users, vehicles, invoices/month, modules enabled).
- Billing via **Razorpay** using **autopay/subscriptions**; webhook-driven
  entitlement updates (upgrade/downgrade/grace period/suspension on payment failure).
- **Feature locking**: admins can grant/restrict modules and features per employee
  (RBAC), independent of plan-level entitlement locking.

## 7. Modules & Features
The product is organized into the following modules. Each is detailed further in
`architecture.md` (data model) and will get its own section in
`docs/AI_TMS_KNOWLEDGE_BASE.md` once implemented.

### 7.1 Home
Business overview dashboard, financial analysis summary, fleet & operations snapshot,
own-fleet snapshot, HR attendance (external module link/integration).

### 7.2 General (master data)
Consignee, Consigner, Location (Country/State/Location, pickup & drop), Industry,
Designation, Group Company, Unit, Method of Packing.

### 7.3 Transport (core operations)
Vehicle Owner, Market Vehicle, Company Vehicle, Manage Driver, Job Creation
(precedes LR/GR booking), GR/LR Booking, Hire Challan, FASTag Tracking, GPS Tracking,
SIM Tracking, Update E-Way, Arrival Report, Truck Hiring Note, POD Records.

### 7.4 Transport Reports
Invoice Register, LR Client-Wise, LR Booking Register, Unused GR/LR Series,
Hire Challan Register, Pending HC Report, Unbilled Reports, Arrival Report Register.

### 7.5 E-Invoicing (GST IRN)
Generate IRN, IRN Generated list, Cancel IRN, Get E-Invoice by IRN,
Get Taxpayer Details.

### 7.6 Accounts
General Purchase, Normal Purchase, Proforma Invoice, General Invoice,
Transport Invoice, Credit Note, Debit Note, Receipt Voucher, Payment Voucher
(+ ATH/BTH variants), General Voucher, Contra Voucher.

### 7.7 Misc (accounting masters)
Primary Group, Group in Primary, Subgroup in Group, Employee Master, Charge Head,
Tax Category, Void Voucher.

### 7.8 Reports (financial)
Daybook, Ledger, Trial Balance, Balance Sheet, Profit & Loss, Sales Register,
Purchase Register, Bank Reconciliation, Special Report.

### 7.9 Statements
GST Output, GST Input, O/S Debtor, O/S Creditor, TDS Payable Report,
TDS Return Report, Opening Balance Details.

### 7.10 Fleet Management
Trip Expense, Trip Advance, FASTag Expense, Pending Trip Expense, Vehicle Health,
Vehicle Documents & Service, Vehicle Current Status, Truck-Wise P&L,
Trip Expense Register, Tyre Management, Repair & Service.

### 7.11 Settings
Series Category, View/Add Series Master, Admin Setting, User, User Activity.

### 7.12 Profile
Change Password, User Account, Branch, Company Setting, Email Settings,
Monthly P&L (all branches / all clubbed companies) — options differ for admin
vs employee.

## 8. Roles & Permissions (baseline)
- **Platform Owner/Admin** — manages tenants, plans, platform billing.
- **Company Admin** (per tenant) — full access; creates employees; assigns feature
  access per employee/role; sees cross-branch data.
- **Employee (role-based)** — sees only assigned modules/features; cannot see
  restricted data (e.g. other branches, other companies in the group).
- Exact role → module → permission → action matrix is finalized during
  implementation and recorded in `docs/AI_TMS_KNOWLEDGE_BASE.md` (never invented
  ahead of the real RBAC implementation).

## 9. Forward-Looking: AI Support Agent Knowledge Base
A future phase adds an AI agent that helps users navigate the TMS, explains fields/
workflows, troubleshoots, and (eventually) reads live data via tools/MCP. This PRD
does **not** include building that agent now. It does require that, from the module/
workflow implementation phases onward, the team maintains
`docs/AI_TMS_KNOWLEDGE_BASE.md` as a living, code-verified source of truth (structure,
rules, and update discipline defined in `phases.md` Phase 7 and `rules.md` §"Knowledge
Base Discipline"). Nothing in that file may be invented — unverifiable details are
marked `UNKNOWN / NEEDS VERIFICATION`.

## 10. Success Metrics (initial)
- Tenant can fully complete a Job → LR/GR → Dispatch → Delivery → POD → Invoice
  cycle without leaving the product.
- Accounts module ties out (Daybook/Ledger/Trial Balance) for a seeded tenant.
- A new tenant can sign up, pick a plan, pay via Razorpay autopay, and get a working
  subdomain instance without manual intervention.
- Feature/module locking correctly reflects plan entitlement and per-employee RBAC.

## 11. Open Questions
- Exact list of Enterprise-only vs Pro-only features per plan — TBD during Phase 6.
- HR Attendance: confirm "external module" means a third-party integration vs a
  built module — TBD before Home Module dashboard work.
- GPS/SIM/FASTag tracking: confirm external provider(s)/APIs to integrate — TBD
  before Transport Module tracking work.
