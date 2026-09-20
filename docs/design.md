# PantherTMS — Design System v2 (Light Theme, UX-First)

This supersedes the earlier `design.md`. It's written to be handed to a coding
agent (Antigravity) to retrofit onto the already-built Phase 0–3 screens and to
govern every screen from here on. The core problem it solves: a functionally solid
back-office product that currently *looks* like a generic admin template. The fix
is not "add color" — it's clearer hierarchy, calmer surfaces, and consistent,
opinionated components so 12 modules feel like one product.

## 0. Design Principles (why before what)
1. **Calm surfaces, confident accents.** Light theme means mostly white/near-white
   space; color is reserved for meaning (status, primary actions) — not
   decoration. A screen with 40 rows of freight data should feel quiet, not busy.
2. **One way to do each thing.** One table pattern, one form pattern, one modal
   pattern, one badge pattern — reused everywhere. Consistency reads as
   "professional" faster than any individual polish.
3. **Data-density with breathing room.** This is an operations tool people use
   8 hours a day — dense enough to see a lot at once, but with real spacing so it
   doesn't feel cramped like a spreadsheet.
4. **Status is always legible at a glance.** Every LR, invoice, trip, and
   subscription has a state. The UI's job is to make that state scannable across
   a whole table, not just readable in a detail view.
5. **The system should feel manageable, not clever.** No cute empty-state jokes
   at the cost of clarity, no unnecessary animation, no ambiguous icon-only
   controls. A tired accounts clerk at 6pm should never have to guess.

## 1. Color System (Light Theme)

### Neutral scale (backgrounds, borders, text)
```
--gray-25:  #FCFCFD   /* app background */
--gray-50:  #F8F9FB   /* subtle section backgrounds, table header */
--gray-100: #F1F3F6   /* hover states, input backgrounds */
--gray-200: #E4E7EC   /* borders, dividers */
--gray-300: #D0D5DD   /* stronger borders, disabled fills */
--gray-500: #667085   /* secondary text, icons */
--gray-700: #344054   /* body text */
--gray-900: #101828   /* headings, primary text */
```
Surfaces: app background = `--gray-25`; cards/tables/modals = `#FFFFFF` on top of
it, separated by a 1px `--gray-200` border rather than heavy shadows. This is what
makes a light theme feel crisp instead of flat-and-boring.

### Brand / primary
```
--primary-600: #4F46E5   /* primary buttons, active nav, links */
--primary-700: #4338CA   /* hover/pressed */
--primary-50:  #EEF2FF   /* selected row bg, active nav bg, light chip */
```
Indigo reads as "professional software," not playful — appropriate for a finance/
ops tool. If PantherTMS already has a brand color, swap it in here but keep the
same *role* structure (600 = action, 700 = pressed, 50 = subtle background).

### Semantic status colors (used identically everywhere — LR status, invoice
status, subscription status, trip status, vehicle status)
```
--success-600: #12B76A   text: #027A48   bg: #ECFDF3   /* Delivered, Paid, Active, Reconciled */
--warning-600: #F79009   text: #B54708   bg: #FFFAEB   /* Pending, In Transit, Draft, Due Soon */
--danger-600:  #F04438   text: #B42318   bg: #FEF3F2   /* Overdue, Cancelled, Rejected, Failed */
--info-600:    #2E90FA   text: #175CD3   bg: #EFF8FF   /* Info, Processing, Scheduled */
```
Rule: a status badge always uses the `bg` as its fill and `text` as its label
color — never the raw `-600` as a text-on-white color (fails contrast/looks harsh).

### Do / Don't
- Do: use color to mean something (status, primary action, one accent per screen).
- Don't: color-code entire table rows by status (fatiguing over a long list) —
  color the badge only, keep row backgrounds neutral with a subtle hover.
- Don't: introduce a second "brand-adjacent" color (e.g. a teal AND a purple) —
  one primary, four semantic colors, done.

## 2. Typography
- Font: **Inter** (or system-ui fallback stack) — clean, excellent at small sizes,
  free.
- Numbers/amounts/IDs: `font-variant-numeric: tabular-nums` everywhere they appear
  in a table or summary card, so columns align.
```
Display   28px / 36px   weight 600   (page-level KPI numbers only)
H1        22px / 28px   weight 600   (page titles)
H2        18px / 24px   weight 600   (section/card headers)
Body      14px / 20px   weight 400   (default UI text, table cells)
Body-sm   13px / 18px   weight 400   (secondary text, helper text, table meta)
Label     12px / 16px   weight 500   (form labels, table headers — uppercase,
                                       letter-spacing 0.02em, --gray-500 color)
```
Table header text is *quieter* than body text (smaller, uppercase, muted gray) —
this is a common tell of unpolished admin UIs when it's the same weight as data.

## 3. Spacing & Layout
- Base unit 4px. Use only: 4, 8, 12, 16, 24, 32, 48, 64.
- Page container padding: 24px (desktop), 16px (tablet).
- Card padding: 20px. Card-to-card gap: 16px.
- Table cell padding: 12px vertical / 16px horizontal (comfortable density);
  offer a "Compact" density toggle at 8px/12px for power users (accounts staff
  doing heavy entry) — this single toggle solves the density complaint most
  ops-tool users eventually have, without you having to pick one density for
  everyone.
- Max content width for forms: 720px, centered or left-aligned in the content
  area — full-bleed forms across a wide monitor feel unfinished.

## 4. Layout Shell

```
+----------------------------------------------------------------+
| Topbar: [Company/Branch switcher]      [Search] [Bell] [Avatar] |
+-----------+------------------------------------------------------+
| Sidebar   | Breadcrumb: General > Consignee                      |
| (grouped, | Page title                    [Primary action >]     |
|  collaps- | ----------------------------------------------------- |
|  ible)    | Filter bar (search, status filter, date range)       |
|           | ----------------------------------------------------- |
|           | Table / content area                                 |
|           | ----------------------------------------------------- |
|           | Pagination                                           |
+-----------+------------------------------------------------------+
```
- **Sidebar**: white background, `--gray-200` right border (not a shadow). Module
  groups (Home, General, Transport, Accounts, etc.) as collapsible sections with
  a small chevron; active item gets `--primary-50` background + `--primary-600`
  left border (3px) + `--primary-700` text — not just a color change, so it's
  glanceable in peripheral vision. Icons at 20px, consistent set (lucide).
- **Topbar**: houses the Company/Branch switcher (important given Group Company
  support), global search, notifications, and the profile menu. Keep it thin
  (56px) — this is a tool people live in, not a marketing site.
- **Breadcrumb + page title + primary action** is the same header pattern on
  every page — this alone fixes a lot of "feels inconsistent" complaints.

## 5. Core Components

### DataTable (the single most important component to get right)
- Sticky header, `--gray-50` background, Label-style header text.
- Row hover: `--gray-50` background, no border-shifting layout jump.
- Selected row: `--primary-50` background + checkbox.
- Numeric/amount columns right-aligned; text columns left-aligned; status column
  fixed width with the badge component below.
- Row actions: a single "..." (kebab) menu on the right, not 4 separate icon
  buttons crowding the row — reduces visual noise across a full table.
- Bulk actions: when rows are selected, a contextual action bar replaces the
  filter bar temporarily ("3 selected — [Export] [Void] [Cancel selection]").
- Empty state: centered icon + one-line explanation + primary action
  ("No consignees yet — Add your first consignee"), not a bare "No data" text.
- Loading state: skeleton rows (gray animated bars), not a spinner that blanks
  the whole table — keeps the layout stable while data loads.
- Pagination: page-number style for reports/registers (users jump around), not
  infinite scroll — this matches how accounts staff actually work (page 4 of
  the Ledger, not "keep scrolling").

### Status Badge
- Pill shape, 4px border-radius less than fully round (looks less "toy-like"
  than a full pill in a serious finance tool) — e.g. `border-radius: 6px`.
- `bg` + `text` semantic pair from §1, small colored dot (6px) + label text,
  12px Label-weight type. Never color-only.

### Forms
- Card-sectioned for long forms (e.g. Job Creation, Vehicle Master): each
  section has an H2 header, related fields grouped, sections separated by a
  1px divider — not one undifferentiated wall of fields.
- Label above input (not floating labels — floating labels hurt scannability in
  dense business forms), required marker as a small asterisk in `--danger-600`.
- Inline validation appears below the field on blur, in `--danger-600` text with
  a small icon, never as a toast that disappears.
- Disabled fields (e.g. locked after status transition) get `--gray-100`
  background and a tooltip on hover explaining why — this also feeds later
  AI-agent troubleshooting content, so write real reasons, not "Disabled."
- Sticky footer for forms taller than the viewport: primary action
  (bottom-right, filled `--primary-600`) + secondary Cancel (outline) — always
  visible while scrolling a long form.

### KPI / Dashboard Cards (Home Module)
- White card, `--gray-200` border, 20px padding.
- Large tabular-nums number (Display size), label above in Label style, a small
  trend indicator (up/down arrow + %) in success/danger color where a
  comparison exists.
- Optional sparkline — thin, single color, no axis labels (it's a glance, not a
  chart to analyze — link to the full report for that).
- 4-column grid on desktop, collapsing to 2 then 1 on smaller widths.

### Buttons
```
Primary:    filled --primary-600, white text, hover --primary-700
Secondary:  white bg, --gray-300 border, --gray-700 text
Destructive: filled --danger-600, used only for irreversible actions
Ghost/text: no border/bg, used for row-level or low-emphasis actions
```
One primary button per screen/section — if two things compete for "primary"
visual weight, the user can't tell what to do first.

### Modals / Dialogs
- Use for quick, contained actions (confirm void, view a record's details,
  quick-add a master record) — not for anything that itself needs a filter bar
  or pagination (that deserves a full page).
- Confirm-destructive dialogs always name the thing being affected
  ("Cancel LR #4021?" not "Are you sure?").

## 6. Iconography & Motion
- One icon set throughout (lucide), 20px default, 16px inline-with-text.
- Icon-only buttons always get a tooltip.
- Transitions: 150ms ease for hover/focus states, 200ms for panel/drawer
  open-close. No bouncy/elastic easing — this is a finance tool, not a game.

## 7. Accessibility & Consistency Checklist (apply to every screen/PR)
- Color is never the only signal (status badges carry text + dot).
- Text contrast meets WCAG AA against its background (the semantic `text`/`bg`
  pairs in §1 are chosen to pass this).
- Every icon-only control has an accessible label/tooltip.
- New table or form uses the existing shared `DataTable`/`Form` components —
  no new one-off table or form markup.
- Any new visual pattern (a new badge type, a new card layout) gets added to
  this document and the shared component library *before* being reused a
  second time.

## 8. Retrofit Priority (for the Phase 0–3 screens already built)
When applying this to existing screens, do it in this order so the highest-
leverage shared pieces are fixed first, and every module benefits immediately:
1. Design tokens (colors/type/spacing) as CSS variables / Tailwind theme config.
2. Layout shell: sidebar, topbar, breadcrumb + page-title header pattern.
3. Shared `DataTable` component (used by every register/list screen already
   built: General masters, Transport lists/registers, Accounts vouchers list).
4. Shared `Form` component (used by every create/edit screen already built).
5. Status Badge component, applied to every status column already in use
   (LR status, HC status, invoice status, etc.).
6. KPI/dashboard cards, once the above are stable.
Do not restyle screens one-by-one before the shared components are fixed —
that produces the same inconsistency this redesign is meant to remove.