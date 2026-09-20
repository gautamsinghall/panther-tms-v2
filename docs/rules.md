# PantherTMS — Development Rules

These rules apply to any human or AI coding agent working on this repository.
`prd.md` defines *what*, `architecture.md` defines *how it's structured*, this file
defines *how we work*.

## 1. Source of Truth Order
1. Actual code in the repository (always wins).
2. `docs/AI_TMS_KNOWLEDGE_BASE.md` (once it exists) — living product knowledge.
3. `prd.md` / `architecture.md` / `design.md` — intent, may lag reality.
4. General TMS/SaaS domain knowledge — lowest priority, never overrides the above.

If code and docs disagree, **fix the docs**, don't silently trust stale docs.

## 2. Do-Not-Invent Principle
When implementing or documenting a feature:
- Never invent a route, permission, role, business rule, status, field, or API
  behavior that hasn't actually been decided/implemented.
- If a requirement is ambiguous (see PRD §11 Open Questions), stop and flag it
  rather than guessing a plausible-sounding behavior.
- Mark anything not yet verified as `UNKNOWN / NEEDS VERIFICATION` in docs/comments
  rather than presenting a guess as fact.

## 3. Multi-Tenancy Safety (non-negotiable)
- Every query in tenant-scoped code must run against the resolved tenant's DB
  session — never accept a tenant id from the client body/query params as the
  source of truth; always derive it from the authenticated session/subdomain.
- No endpoint may join or query across two tenant databases.
- Any new background job must carry tenant context explicitly (don't rely on
  ambient/global state).
- Code review checklist item: "Could this leak data across tenants?" — must be
  answered before merge for anything touching DB access.

## 4. Module Structure Consistency
- Every backend module follows: `router.py`, `service.py`, `schemas.py`,
  `models.py` (or references shared tenant models) — same shape as
  `architecture.md` §4.
- Every frontend module page follows the shared `DataTable`/`Form` components —
  no bespoke tables/forms per module unless justified in a PR description.
- Naming: use the exact module/feature names from `prd.md` §7 in code, routes, and
  UI labels (e.g. `GR/LR Booking`, not an invented rename), unless a naming change
  is explicitly agreed and then updated in `prd.md` too.

## 5. RBAC & Entitlement Rules
- Every new endpoint must declare its required permission explicitly; no
  "implicitly open" endpoints.
- Every new UI-visible feature must be gated by the same permission check as its
  backend endpoint (never trust hiding-in-UI alone).
- Plan-entitlement checks and RBAC checks are separate concerns — don't conflate
  "not on this plan" with "not permitted for this role" in error messages or code.

## 6. API Design
- REST resource-oriented paths under `/api/v1/{module}/...`.
- Request/response bodies validated with Pydantic schemas; no raw dict passthrough.
- Errors return a consistent shape: `{ "error_code": str, "message": str, "details": ... }`.
- Breaking changes to an existing endpoint require a version bump or additive
  migration path — never silently change a response shape in place.

## 7. Database & Migrations
- All schema changes go through Alembic migrations, applied identically to every
  tenant DB (control DB and tenant-template DB have separate migration chains).
- No manual/ad-hoc schema edits directly on a database.
- Money fields use fixed-point/decimal types, never floats.
- Every table gets `created_at`/`updated_at`; soft-delete (`is_active`/`deleted_at`)
  preferred over hard delete for financial/audit-relevant records (vouchers, LR/GR).

## 8. Security
- Secrets only via environment variables / Dokploy secret store — never committed.
- All Razorpay webhook payloads verified via signature before processing.
- Passwords hashed (bcrypt/argon2); JWTs short-lived with refresh rotation.
- File uploads (POD images, vehicle docs) validated by type/size and stored in
  Cloudflare R2, never on local disk in production.

## 9. Testing
- New business logic (workflows, state transitions, ledger posting, entitlement
  checks) needs unit tests before being considered done.
- Multi-tenancy isolation gets explicit regression tests (attempt cross-tenant
  access must fail).
- Financial modules (Accounts/Statements) need reconciliation tests (e.g. ledger
  entries sum to zero per voucher).

## 10. Git & PR Workflow
- Branch per feature/module task; PR description references the relevant `phases.md`
  item.
- Commits scoped and descriptive (`transport: add GR/LR booking status transitions`).
- No direct commits to `main`; PRs require the multi-tenancy + RBAC checklist above.

## 11. Knowledge Base Discipline (for the future AI agent)
Once a module/feature/workflow/permission/route/status changes:
1. Review `docs/AI_TMS_KNOWLEDGE_BASE.md` (create if this is the first module built).
2. Update only the affected sections — never bulk-regenerate and risk destroying
   verified knowledge.
3. Re-check related sections (navigation map, glossary, workflows, permissions) for
   contradictions introduced by the change.
4. Mark new/uncertain info `INFERRED` or `UNKNOWN / NEEDS VERIFICATION`; upgrade to
   `VERIFIED` once confirmed against running code/tests.
5. Add a line to the knowledge base's changelog section.
This step is part of "done," not an optional follow-up.

## 12. Design Consistency
- Follow `design.md` for color tokens, spacing, typography, and table/form
  patterns — no per-page one-off styling.
- Any new shared UI pattern (e.g. a new kind of status badge) gets added to the
  shared component library, not copy-pasted per module.
