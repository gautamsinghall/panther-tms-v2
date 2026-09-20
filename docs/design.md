# PantherTMS — UI/UX Design System
Version: 1.0
Purpose: This document is the visual and interaction source of truth for PantherTMS frontend work from this point onward.

---

## 1. Product Experience Goal

PantherTMS is an operational TMS, not a marketing dashboard.

The interface should feel:

- clean
- calm
- professional
- fast
- predictable
- information-dense without feeling crowded
- easy for an operations employee to learn in one sitting
- trustworthy for financial and transport data

The core UX principle is:

> **Make the next business action obvious and make the current state impossible to misunderstand.**

The UI should reduce clicks, reduce cognitive load, and keep users inside the operational workflow.

Do not optimize for flashy visuals. Optimize for clarity, speed, consistency, and confidence.

---

# 2. Design Direction

## 2.1 Theme

Use a **light-first enterprise SaaS visual language**.

Overall atmosphere:

- warm white / very light gray application canvas
- white content surfaces
- dark charcoal/navy text
- restrained Panther gold as the brand accent
- semantic status colors only where they communicate meaning
- subtle borders
- very soft shadows
- medium rounded corners
- generous but controlled whitespace

Avoid:

- dark dashboards
- neon colors
- excessive gradients
- glassmorphism
- huge decorative illustrations
- excessive rounded cards
- strong drop shadows
- colorful charts everywhere
- oversized typography
- UI that looks like a consumer finance app

PantherTMS should look like a mature logistics operations product.

---

# 3. Visual Tokens

Use these tokens as the default foundation.

## 3.1 Core colors

```text
Background                #F7F8FA
Surface                   #FFFFFF
Surface Muted             #F2F4F7
Border                    #E4E7EC
Border Strong             #D0D5DD

Text Primary              #172033
Text Secondary            #667085
Text Muted                #98A2B3
Text Inverse              #FFFFFF

Brand Gold                #C9A227
Brand Gold Dark           #A88416
Brand Gold Soft           #F8F1D9

Primary Action             #172033
Primary Action Hover       #0F172A

Info                       #2563EB
Info Soft                  #EFF6FF

Success                    #16A34A
Success Soft               #ECFDF3

Warning                    #D97706
Warning Soft               #FFFAEB

Danger                     #DC2626
Danger Soft                #FEF2F2

Neutral                    #667085
Neutral Soft               #F2F4F7
```

Important:

- Do not use gold for every button.
- Gold is a brand accent, not a replacement for semantic colors.
- Primary action buttons should normally use the dark primary action color.
- Gold should appear in active brand details, selected highlights, key accents, and occasional high-value CTAs.

---

# 4. Typography

Preferred font:

```text
Inter
```

Fallback:

```text
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Type scale:

```text
Page Title       28px / 34px / 700
Section Title    18px / 24px / 600
Card Title       15px / 20px / 600
Body             14px / 20px / 400
Body Strong      14px / 20px / 600
Label            13px / 18px / 500
Caption          12px / 16px / 400
Table Header     12px / 16px / 600
```

Rules:

- Avoid giant headings.
- Prefer hierarchy through weight, spacing, and color.
- Keep most application text in the 13–15px range.
- Numbers in financial/operational areas should use tabular numerals when possible.

---

# 5. Spacing System

Use a 4px base grid.

```text
4   xs
8   sm
12  md
16  lg
20  xl
24  2xl
32  3xl
40  4xl
48  5xl
64  6xl
```

Default component spacing:

- input height: 40px
- compact input: 36px
- primary button: 40px
- compact button: 36px
- table row: 52–60px
- top bar: 64px
- sidebar: 240px
- standard card padding: 20–24px
- section gap: 24–32px

Do not create random spacing values unless there is a specific visual reason.

---

# 6. Radius and Elevation

Use restrained enterprise rounding.

```text
Small controls       8px
Inputs               8px
Cards                12px
Dialogs/Drawers      14px
Large containers     16px
Pills                999px
```

Shadows:

Use almost no shadow by default.

Preferred hierarchy:

1. border
2. subtle surface contrast
3. very light shadow only for floating elements

Example:

```text
Card shadow: 0 1px 2px rgba(16, 24, 40, 0.04)
Floating UI: 0 8px 24px rgba(16, 24, 40, 0.08)
```

---

# 7. Global Application Shell

## 7.1 Desktop structure

```text
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │ Top Bar                                           │
│         ├───────────────────────────────────────────────────┤
│         │                                                   │
│         │ Main Content                                      │
│         │                                                   │
│         │                                                   │
└─────────────────────────────────────────────────────────────┘
```

Sidebar:

- fixed
- approximately 240px
- white or very slightly tinted
- right border
- clear active state
- compact icons from Lucide
- grouped navigation

Top bar:

- 64px
- white
- bottom border
- tenant/company identity
- page context when useful
- global search/command action if implemented
- notifications
- profile menu

Main content:

- light application background
- centered content
- max width around 1440px
- horizontal padding 24–32px
- vertical padding 24–32px

---

# 8. Sidebar Information Architecture

Use logical business groupings instead of a flat list.

Recommended structure:

```text
OVERVIEW
  Dashboard

OPERATIONS
  Trips
  Lorry Receipts

BILLING
  Invoices

MASTER DATA
  Customers
  Vehicles
  Drivers

INSIGHTS
  Reports

SYSTEM
  Settings
```

The exact routes can follow the existing application, but the visual hierarchy should follow this structure.

Rules:

- active item is clearly visible
- inactive items remain quiet
- icon + text alignment must be consistent
- no more than one active item
- avoid nested menus unless genuinely necessary
- keep the sidebar visually calm

Suggested active state:

```text
background: #F2F4F7
text: #172033
left indicator: 3px Brand Gold
icon: Brand Gold or Primary Action
```

---

# 9. Top Bar

Top bar should answer:

> Where am I, which company am I working in, and what can I do next?

Suggested order:

```text
Breadcrumb / page context
                 Spacer
Search / command
Notifications
Tenant/company
User avatar/menu
```

Do not overload the top bar with every possible action.

---

# 10. Page Layout Pattern

Every major page should use the following hierarchy:

```text
Page Header
  ├─ Page title
  ├─ One-line context
  └─ Primary action(s)

Toolbar
  ├─ Search
  ├─ Filters
  ├─ Date range when relevant
  └─ Optional view controls

Content
  ├─ Main table/list
  └─ Secondary panels where useful

Pagination / footer
```

Example:

```text
Trips
Manage active and completed transport movements

[ + Create Trip ]

[ Search trips... ] [ Status ] [ Customer ] [ Date ] [ Clear ]

┌───────────────────────────────────────────────────────────┐
│ Trip No │ Customer │ Route │ Driver │ Status │ Date │ ... │
├───────────────────────────────────────────────────────────┤
│ TR-1024 │ ABC Ltd  │ ...   │ Rajesh │ In Transit │ ...   │
│ TR-1023 │ XYZ Ltd  │ ...   │ Amit   │ Delivered  │ ...   │
└───────────────────────────────────────────────────────────┘
```

---

# 11. Dashboard UX

The dashboard is an operational cockpit, not a collection of decorative cards.

Recommended order:

## Row 1 — KPI summary

Four primary metrics:

```text
Total Trips
In Transit
Delivered
Outstanding / Revenue
```

Each KPI card should have:

- label
- main number
- small context/period
- optional trend only when backed by real data
- small icon
- no unnecessary illustrations

## Row 2 — Operational focus

Left, larger:

```text
Trip Status / Operational Overview
```

Right:

```text
Quick Actions
```

Quick actions should prioritize common workflows:

```text
Create Trip
Create Customer
Create Vehicle
Create Driver
Create Invoice
```

## Row 3 — Recent operational data

Use a real table/list:

```text
Recent Trips
Trip No | Customer | Route | Status | Updated
```

## Row 4 — Billing visibility

```text
Invoice Summary
Paid | Unpaid | Overdue
```

The dashboard should immediately answer:

- What is happening now?
- What needs attention?
- What was recently updated?
- Where is money stuck?

Do not fill the dashboard with charts just because Recharts exists.

---

# 12. Tables — Core PantherTMS Pattern

Tables are the most important component family in this product.

They should feel:

- dense enough for operations
- easy to scan
- sortable
- filterable
- keyboard-friendly
- visually quiet

## 12.1 Table structure

```text
Toolbar
────────────────────────────────────────
Search | Filters | Saved/clear filters | Actions

Table
────────────────────────────────────────
Header
Rows
────────────────────────────────────────

Pagination
```

## 12.2 Rules

- sticky header only when needed
- numeric values right-aligned
- status centered or near the relevant entity
- dates formatted consistently
- primary identifier visually stronger
- secondary information muted
- row hover should be subtle
- avoid vertical lines between every column
- use whitespace and horizontal rules instead

## 12.3 Row actions

Prefer:

```text
View
Edit
More
```

Use a kebab menu for secondary actions.

Do not place 5–7 visible action buttons in every row.

---

# 13. Table Density

Default:

```text
52–60px row height
```

For high-volume operational screens:

```text
48–52px row height
```

Never make rows so compact that scanability suffers.

---

# 14. Search and Filters

Search must be obvious.

Primary search:

```text
[ 🔍 Search customers, trips, invoices... ]
```

Filters should be:

- compact
- removable
- visible when active
- keyboard accessible

Use:

```text
[ Status ▼ ] [ Customer ▼ ] [ Date ▼ ] [ Clear filters ]
```

For many filters, place advanced filters inside a filter popover rather than taking over the page.

---

# 15. Forms

PantherTMS forms should feel like guided business workflows.

Avoid giant forms with 15–20 fields in one wall.

Use sections.

Example:

```text
Create Trip

Trip Details
────────────────────────────
Customer
Vehicle
Driver
Trip Date

Route
────────────────────────────
Origin
Destination
Schedule

Status
────────────────────────────
Status

                    [Cancel] [Create Trip]
```

Rules:

- 2-column layout on desktop where appropriate
- 1-column layout on mobile
- labels above controls
- helper text only when it helps
- required fields explicitly indicated
- errors shown near the field
- preserve entered values after validation failure
- use select/combobox where the user is selecting master data
- do not force typing when a known entity already exists

---

# 16. Create/Edit UX

For simple entities:

Use a right-side drawer or compact modal.

Good candidates:

- Customer
- Vehicle
- Driver

For complex operational entities:

Use a dedicated page or large workflow drawer.

Good candidates:

- Trip
- LR
- Invoice

The user should not lose the context of the list they came from.

Preferred behavior:

```text
List → Create/Edit → Save → Return to list with updated state
```

---

# 17. Detail Pages

Entity detail pages should have strong identity at the top.

Example:

```text
Trip TR-1024
Delhi → Jaipur

[ In Transit ]

Customer: ABC Logistics
Vehicle: RJ14 XX 1234
Driver: Rajesh Kumar
Scheduled: 20 Sep 2026

[ Edit ] [ Change Status ] [ More ]
```

Then use tabs/sections:

```text
Overview
Documents
Billing
Activity
```

Only include tabs that exist in the current product.

---

# 18. Trip → LR → Invoice Workflow

This is the core business journey.

The UX should visually communicate the relationship:

```text
Trip
  ↓
Lorry Receipt
  ↓
Invoice
  ↓
Payment
```

When viewing a Trip:

```text
Trip
│
├── LR
│    └── LR-2048
│
└── Invoice
     └── INV-3041
```

Users should not have to manually remember IDs.

Use:

- related-record panels
- clickable identifiers
- "Create LR" from Trip
- "Create Invoice" from LR
- "Mark Paid" from Invoice
- clear status transitions

This reduces navigation and reinforces the business process.

---

# 19. Status Design

Use semantic badges.

Recommended behavior:

```text
Scheduled     → Neutral gray
Draft         → Neutral gray
In Transit    → Blue / warm accent
Sent          → Amber
Delivered     → Green
Paid          → Green
Cancelled     → Red
Overdue       → Red
Inactive      → Gray
Maintenance   → Amber
```

Never communicate state using color alone.

Always include text.

Examples:

```text
● In Transit
● Delivered
● Overdue
```

Avoid giant colored blocks.

---

# 20. Buttons

Hierarchy:

### Primary
For the single most important action.

```text
[ + Create Trip ]
```

### Secondary
For common supporting actions.

```text
[ Export ]
[ Filter ]
```

### Ghost
For low-emphasis actions.

```text
[ Clear ]
```

### Destructive
Only for destructive actions.

```text
[ Delete ]
```

Use one primary CTA per major region.

Do not make every button gold.

---

# 21. Icons

Use Lucide icons consistently.

Rules:

- default size 16–18px
- 20px for major UI controls
- never mix icon families
- icons support meaning; they do not replace important text
- avoid decorative icons that add no information

---

# 22. Cards

Cards should represent a meaningful information group.

Good:

- KPI
- invoice summary
- trip summary
- related records
- alerts

Bad:

- wrapping every table inside multiple nested cards
- 10 separate colorful cards for simple values
- excessive shadows

Prefer:

```text
Flat surface
+ subtle border
+ clear internal hierarchy
```

---

# 23. Feedback States

Every async interface must have four deliberate states:

```text
Loading
Success
Empty
Error
```

## Loading

Prefer skeletons for page-level data.

Avoid giant spinners.

## Empty

Explain what is missing and give the next useful action.

Example:

```text
No trips found

There are no trips matching your current filters.

[ Clear Filters ]
```

For a genuinely empty module:

```text
No vehicles yet

Add your first vehicle to start assigning fleet to trips.

[ + Add Vehicle ]
```

## Error

Errors should explain:

- what failed
- whether the user can retry
- what action is safe

Example:

```text
Unable to load trips

We couldn't retrieve the trip list.

[ Retry ]
```

## Success

Prefer lightweight feedback:

- toast
- updated row
- status badge change
- inline confirmation

Do not stop workflow with unnecessary success dialogs.

---

# 24. Destructive Actions

Never use immediate destructive deletion when a safer product action is possible.

For operational data, prefer:

```text
Deactivate
Archive
Mark inactive
```

before destructive deletion.

For confirmed destructive operations:

```text
Dialog
  Title
  Consequence
  Entity name
  Cancel
  Confirm destructive action
```

Never use vague confirmations like "Are you sure?".

---

# 25. Navigation Efficiency

The application should minimize unnecessary page travel.

Examples:

Good:

```text
Trips → Trip Detail → Create LR
```

Better than:

```text
Trips → copy Trip ID → LR page → paste ID → search → create LR
```

Good:

```text
Invoice row → Mark Paid
```

Instead of:

```text
Invoice row → detail → edit → status → save
```

when the state transition is simple and permitted.

---

# 26. Command/Search UX

A global command/search interface can be introduced where useful.

Potential actions:

```text
Search customer
Search trip
Search invoice
Go to Customers
Go to Trips
Create Trip
Create Invoice
```

Do not implement a command palette merely for visual effect. It must improve navigation.

---

# 27. Date / Currency Formatting

Formatting must be consistent across the application.

Dates:

```text
20 Sep 2026
```

Date + time:

```text
20 Sep 2026, 17:45
```

Currency:

```text
₹1,25,000.00
```

Use the company's configured timezone for displayed timestamps.

Never create ad-hoc date formats per screen.

---

# 28. Responsive Behavior

Desktop-first, but critical workflows must remain usable on smaller screens.

At narrower widths:

1. sidebar collapses
2. filters wrap
3. 2-column forms become 1-column
4. table actions move to menus
5. secondary columns may be hidden only when the information is recoverable in the detail view
6. primary action remains visible

Do not create a separate mobile design unless the workflow genuinely requires it.

---

# 29. Accessibility

Minimum expectations:

- keyboard navigation works
- visible focus states
- proper labels
- semantic buttons
- tooltips for icon-only actions
- adequate contrast
- errors associated with their fields
- dialogs trap focus
- status is not communicated by color alone
- screen-reader text where icon meaning is ambiguous

---

# 30. Motion

Motion should be subtle and functional.

Allowed:

- drawer slide
- dialog fade
- row/state transition
- hover
- skeleton shimmer

Avoid:

- bouncing cards
- animated counters everywhere
- large page transitions
- decorative motion
- slow animations

Default transition duration:

```text
150–200ms
```

---

# 31. Component System

The frontend should build a reusable component language.

Core shared components:

```text
AppShell
Sidebar
TopBar
PageHeader
Breadcrumbs
SearchInput
FilterBar
FilterChip
DataTable
DataTableSkeleton
EmptyState
ErrorState
StatusBadge
KpiCard
MetricCard
SectionCard
FormField
FormSection
EntityDrawer
ConfirmDialog
Toast
Pagination
DatePicker
Combobox
CommandMenu
RelatedRecords
ActivityList
```

Use shadcn/ui primitives underneath these higher-level product components.

Do not recreate the same component separately for Customers, Vehicles, Drivers, Trips, LR and Invoices.

---

# 32. Visual Hierarchy Rules

When a page feels cluttered, use this priority:

1. Primary action
2. Page title/context
3. Current state
4. Primary data
5. Secondary data
6. Rare actions
7. Metadata

Never let metadata visually compete with the main business information.

---

# 33. UX Rules for Operations Users

Operations staff often repeat the same actions many times.

Therefore:

- favor keyboard-friendly workflows
- preserve filters when returning to a list when practical
- preserve search state when practical
- make common actions one or two clicks away
- default intelligently from existing context
- avoid asking for information the system already knows
- show recently used/related entities where useful
- maintain clear confirmation after mutations
- never surprise the user by moving or hiding primary actions

---

# 34. Do Not Do These Things

Do not:

- redesign backend business logic during a UI task
- rename business entities without explicit product approval
- invent fields just to make a screen look complete
- use mock production data as real data
- introduce random colors per page
- create one-off button styles
- create a different table design on every module
- make every screen card-heavy
- use gold everywhere
- use gradients as decoration
- hide important actions inside deep menus
- use icons without accessible labels
- make tables unreadably dense
- remove important fields merely to make a screenshot cleaner
- change API contracts just for UI convenience
- duplicate components across modules

---

# 35. Module-Specific UX

## Customers

Primary action:

```text
+ Add Customer
```

List:

```text
Customer
Phone
Email
GSTIN
Status
Created
Actions
```

Common workflow:

```text
Search → View/Edit → Deactivate
```

Use Customer as the baseline pattern for other master-data screens.

## Vehicles

Surface:

- registration number
- vehicle type
- capacity
- status
- current assignment when available

Important visual feature:

```text
Availability / operational status
```

## Drivers

Surface:

- name
- phone
- license
- status
- active assignment where available

## Trips

Highest workflow importance.

Show:

- trip number
- customer
- origin → destination
- vehicle
- driver
- scheduled date
- current status
- last updated

Make route information easy to scan.

## Lorry Receipts

Show relationship to Trip prominently.

Important information:

- LR number
- trip
- customer
- goods
- weight
- freight
- status/date as supported by the current data model

## Invoices

Treat billing information with strong hierarchy.

Show:

- invoice number
- customer
- linked LR
- amount
- due date
- status
- paid state

Use prominent actions for allowed status transitions.

---

# 36. Information Architecture Philosophy

Do not make PantherTMS feel like:

```text
A collection of CRUD pages
```

Make it feel like:

```text
One operational system
```

The visual language should connect every module.

Example:

```text
Customers
   ↓
Trips
   ↓
LR
   ↓
Invoices
   ↓
Payments
   ↓
Dashboard / Reports
```

The UI should make these relationships visible.

---

# 37. Definition of Done — UI

A screen is not finished because the happy path works.

A screen is finished when:

- visual hierarchy matches this document
- spacing follows the system
- loading state exists
- empty state exists
- error state exists
- success feedback exists
- form validation is clear
- primary action is obvious
- responsive behavior is acceptable
- keyboard navigation works for core actions
- status colors are semantic
- table density is usable
- no duplicated one-off component was introduced
- real APIs remain the source of truth for production data
- no unrelated business logic was changed

---

# 38. Future-Proofing

The design system must scale when future modules arrive:

- Documents
- GST / E-Way
- Notifications
- Tracking
- Advanced Reports
- Audit History
- Subscription / SaaS
- Platform Admin

New modules must reuse:

- AppShell
- navigation pattern
- page header
- toolbar/filter pattern
- table system
- forms
- status system
- detail pages
- feedback states

Do not create a new visual language for each future feature.

---

# 39. Final UX Standard

Every PantherTMS screen should pass this test:

### 5-second test
Can the user tell:

- what page they are on?
- what this page is for?
- what the important status is?
- what the primary next action is?

### 30-second test
Can the user:

- find the required record?
- understand its state?
- perform the common action?
- recover from an error?

### 5-minute test
Can a new operations user complete the workflow without needing the developer to explain the interface?

That is the standard.

---

## 40. Source-of-Truth Rule

This document controls **visual design, interaction patterns, layout, component behavior, and UX decisions**.

The existing product specifications and backend contracts continue to control:

- business rules
- data model
- API contracts
- validation rules
- permissions
- security
- tenant isolation
- workflow semantics

When there is a conflict:

1. preserve business correctness
2. preserve security
3. preserve existing working behavior
4. improve UX without changing the underlying business meaning

