# PantherTMS — Architecture

## 1. Tech Stack (finalized)
| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript |
| Backend | Python, FastAPI |
| Primary DB | PostgreSQL (one DB per tenant + one control DB) |
| Cache/Queue broker | Redis |
| Background jobs | Arq (Redis-based worker queue) |
| Reverse proxy / routing | Traefik |
| Deployment orchestration | Dokploy |
| Hosting | Single Hostinger VPS (initial scale) |
| Object storage | Cloudflare R2 (documents, POD images, vehicle docs) |
| Payments | Razorpay (subscriptions/autopay + webhooks) |
| Messaging (optional) | WhatsApp Cloud API (notifications) |

> Note: PostgreSQL is the finalized choice over MySQL for JSONB, per-tenant schema/DB
> management, and Row-Level-Security options. If a task input suggests MySQL, treat
> PostgreSQL as authoritative unless explicitly changed by the product owner.

## 2. Multi-Tenancy Model
- **Control-plane DB** (single, shared): tenants, subscription plans, entitlements,
  billing/invoices, platform admins, tenant provisioning status, audit of
  cross-tenant events.
- **Per-tenant DB** (one PostgreSQL database per tenant): all operational data for
  that company — General/Transport/Accounts/Reports/Fleet/Settings modules.
- **Tenant resolution**: subdomain-based (`{tenant}.panthertms.com`). Middleware
  resolves subdomain → tenant record (control DB) → tenant DB connection string,
  then routes the request with a per-request DB session bound to that tenant.
- **Group Company** (General Module) is a within-tenant concept — multiple
  companies under one subscription share the same tenant DB, distinguished by a
  `company_id`/branch scoping column, not by separate databases.
- **Isolation guarantees**: no cross-tenant query paths in application code;
  connection pooling keyed by tenant; secrets/DB credentials never shared across
  tenants; backups per-tenant-DB.

## 3. High-Level Request Flow
```
Browser (tenant.panthertms.com)
   │
   ▼
Traefik (TLS termination, routing)
   │
   ▼
Next.js (SSR/CSR pages, calls backend API)
   │
   ▼
FastAPI (auth, RBAC, business logic)
   │            │
   ▼            ▼
Tenant DB    Control DB (tenant/plan/billing lookups)
   │
   ▼
Redis (cache, session, rate-limit) + Arq workers (async jobs: e-invoicing calls,
PDF/report generation, notification sending, Razorpay webhook processing)
```

## 4. Backend Structure (FastAPI)
```
backend/
  app/
    core/            # config, security, tenancy middleware, db session factory
    control/         # control-plane models & routers (tenants, plans, billing)
    tenant_db/       # per-tenant models, migrations (Alembic, per-tenant)
    modules/
      general/
      transport/
      transport_reports/
      einvoicing/
      accounts/
      misc/
      reports/
      statements/
      fleet/
      settings/
      profile/
      home/
    auth/            # login, JWT/session, RBAC dependency injection
    integrations/
      razorpay/
      einvoice_gsp/     # GST e-invoicing service provider client
      gps_provider/
      fastag_provider/
      whatsapp/
    workers/          # Arq task definitions
    schemas/          # pydantic request/response schemas per module
  alembic/
```
Each module = router + service + schema + models, following the same shape so the
future knowledge base can document modules consistently (see `rules.md`).

## 5. Frontend Structure (Next.js + TS)
```
frontend/
  app/
    (auth)/
    (dashboard)/
      home/
      general/
      transport/
      transport-reports/
      einvoicing/
      accounts/
      misc/
      reports/
      statements/
      fleet/
      settings/
      profile/
  components/
    ui/            # shared design-system primitives (see design.md)
    tables/        # shared table component(s) for consistent table design
    forms/
  lib/
    api-client.ts
    auth.ts
    permissions.ts
  types/
```
- One shared **DataTable** and one shared **Form** system used everywhere, so all
  modules look and behave consistently (per the "professional, consistent design"
  requirement).
- Sidebar navigation is data-driven from the permission/module map returned by the
  backend (`/me/navigation`), not hardcoded per role.

## 6. Auth, RBAC & Feature Locking
- JWT-based auth (access + refresh), scoped to a tenant (tenant id embedded/derived
  from subdomain, validated against token).
- RBAC model: `Role → Module → Permission (view/create/edit/delete/approve) → Action`.
  Company Admin can create custom roles/employee-level overrides.
- **Two independent locking layers**:
  1. **Entitlement locking** (plan-based): control DB says which modules/limits the
     tenant's plan allows; enforced centrally (middleware/dependency), UI hides
     locked modules and shows upgrade prompts.
  2. **RBAC locking** (employee-based): tenant admin restricts which of the
     entitled modules/features a given employee can use.
- Every protected endpoint declares required permission; a single dependency checks
  both entitlement and RBAC before executing.

## 7. Payments (Razorpay)
- Razorpay Subscriptions API for recurring autopay billing per plan.
- Webhook endpoint (`/webhooks/razorpay`) handles: subscription activated, charged,
  payment failed, cancelled, plan changed → updates control-DB entitlements.
- Grace-period logic for failed payments before feature lock-down.
- Idempotent webhook processing (store Razorpay event id, dedupe).

## 8. Async/Background Work (Arq + Redis)
Use background jobs for: E-Invoicing IRN generation calls, PDF generation (invoices,
LR/GR, reports), bulk report exports, WhatsApp/notification sends, Razorpay webhook
follow-up actions, scheduled reports (e.g. daily P&L).

## 9. Data Model Notes (per module — high level)
- **Transport core chain**: `Job` → `LR/GR` → `HireChallan` (if hired vehicle) →
  `Trip` (status machine) → `ArrivalReport`/`POD` → linked `TransportInvoice`.
- **Accounts** follows double-entry ledger principles: `Voucher` (typed:
  purchase/invoice/credit-debit note/receipt/payment/general/contra) posts to
  `LedgerEntry` rows under `PrimaryGroup → Group → Subgroup → Account`.
- **Fleet**: `Vehicle` has `TripExpense`, `TripAdvance`, `Document/Service` records,
  `Tyre` records, `RepairService` records; `TruckWisePnL` is a derived/reporting
  view, not a source table.
- Exact schemas are implemented and documented module-by-module in
  `docs/AI_TMS_KNOWLEDGE_BASE.md` as they're built — this file stays high-level.

## 10. Environments & Deployment
- Dokploy manages app deployments (frontend, backend, workers) on the VPS; Traefik
  handles TLS + subdomain routing including wildcard `*.panthertms.com`.
- Environments: local dev (docker-compose: postgres, redis, backend, frontend),
  staging tenant, production.
- Secrets via Dokploy/VPS env management — never committed to the repo.

## 11. Observability
- Structured logging (request id, tenant id) from FastAPI.
- User Activity module doubles as an in-product audit log (Settings → User Activity).
- Basic uptime/error monitoring on VPS (tool TBD — Phase 0 setup task).
