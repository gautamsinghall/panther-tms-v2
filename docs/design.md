# PantherTMS — Design System

Goal: a consistent, professional, data-dense but readable SaaS UI across all 12
modules — one visual language, not a per-module patchwork.

## 1. Stack
- Next.js + TypeScript, Tailwind CSS, shadcn/ui as the component primitive layer
  (buttons, inputs, dialogs, dropdowns) customized to the tokens below.
- Icons: a single consistent icon set (e.g. lucide) throughout — no mixing sets.

## 2. Design Tokens

### Color
Define as CSS variables so theming (light/dark, future white-label) is centralized.
```
--color-bg
--color-surface        /* cards, tables */
--color-border
--color-text-primary
--color-text-secondary
--color-primary        /* brand action color */
--color-primary-hover
--color-success         /* delivered, paid, active */
--color-warning         /* pending, in-transit */
--color-danger          /* overdue, cancelled, rejected */
--color-info
```
Status colors are semantic and reused everywhere a status badge appears (LR status,
invoice status, subscription status, trip status) — never invent a new color per
module for the same *meaning* (e.g. "pending" is always `--color-warning`).

### Typography
- One typeface family, one scale: `xs/sm/base/lg/xl/2xl` — headings use `lg`–`2xl`,
  body/table text uses `sm`/`base`.
- Numeric/tabular data (amounts, quantities) uses tabular-figure alignment so
  columns line up.

### Spacing & Layout
- 4px base spacing unit; consistent page padding and card padding across modules.
- Standard page layout: page title + primary action button (top), filter bar,
  table/content area, pagination.

## 3. Core Patterns (shared components — build once, reuse everywhere)

### DataTable
Used for every register/list screen (LR Booking Register, Ledger, Vehicle list,
etc.):
- Sticky header, sortable columns, column-level filter where relevant, pagination
  or infinite scroll (pick one and stay consistent), row-level actions menu
  (view/edit/void/etc. gated by permission), status column rendered as a badge
  using the semantic status colors, empty state, loading skeleton state.
- Consistent density: comfortable by default, with an optional compact mode for
  power users doing heavy data entry (accounts staff).

### Forms
- Single shared form layout: label above field, inline validation message below,
  required-field marker, grouped sections for long forms (e.g. Job Creation,
  Vehicle master) with clear section headers rather than one long unbroken form.
- Primary action (Save/Submit) bottom-right (or sticky footer on long forms),
  secondary action (Cancel) beside it.
- Disabled fields (e.g. non-editable after a status transition) are visually
  distinct, with a tooltip explaining *why* it's disabled — this also feeds the
  future AI knowledge base's "why can't I edit this" answers.

### Status Badges
- Small pill component, color per §2 semantics, consistent capitalization
  (e.g. "In Transit", not "IN_TRANSIT" in the UI even if that's the DB value).

### Dashboards (Home Module)
- Card-based KPI tiles (Business Overview, Financial Analysis, Fleet & Operations,
  Own Fleet) using the same card component as the rest of the app — charts use a
  single charting library consistently.

## 4. Navigation
- Left sidebar, grouped by module per `prd.md` §7, collapsible groups, active-state
  highlighting, module/feature items hidden entirely (not just disabled) when the
  user lacks entitlement or permission — a locked-but-visible-with-upgrade-prompt
  state is used only for plan-entitlement locks, never for RBAC locks (RBAC-locked
  items are simply not shown).

## 5. Responsiveness
- Desktop-first (this is an operations-heavy back-office product), but core flows
  (viewing statuses, approving something, checking a report) must remain usable on
  tablet width. Full mobile-first redesign is out of scope for now.

## 6. Accessibility & Consistency Checklist (apply per new screen)
- Color is never the only signal (status badges also carry text).
- Every icon-only button has a tooltip/aria-label.
- Table and form components are reused, not recreated, for every new module page.
- New patterns get added to this document and the shared component library before
  being used a second time — no silent one-off styling drift.
