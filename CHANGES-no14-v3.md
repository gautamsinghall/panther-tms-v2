# Panther AI v3 — Change & Verification Ledger (14 Nov 2026)

This document contains internal development and verification notes for Panther AI v3.
**Note**: This file is NEVER indexed into the knowledge base or RAG search.

---

## 1. Internal Verification (VERIFY) Checklist

1. **Create LR Form Freight Fields**:
   - 12 Nov 2026 live-form audit listed optional §5 freight fields (Basic Freight, Advance, Loading/Handling, Unloading, Other charges).
   - User correction of 13 Nov 2026 established that the Create LR form has NO freight amount fields; only Payment Type is captured. Verified and implemented.
2. **Consignor / Consigner Spellings**:
   - The app uses "Consigner" in various tables/backend schemas and "Consignor" on the Create LR form. Both refer to the loading party.
3. **Manifest Usage**:
   - Manifest represents the list of all consignments (LRs) on a single trip. Verified against standard logistics operations.
4. **E-Way Bill Regulations**:
   - GST Rule 138: ₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 as Panther's own rule. Verified against https://ewaybillgst.gov.in.
5. **E-Invoicing (IRN) Threshold**:
   - Mandatory above ₹5 crore aggregate turnover in any preceding financial year from 2017-18 for B2B supplies and exports. Verified against https://www.gst.gov.in.
6. **LR Booking Page Routes and Labels**:
   - Route: `/transport/lr-booking`
   - Form button: "New LR Booking"
   - Save button: "Create Lorry Receipt"
7. **Job Orders Page Routes and Labels**:
   - Route: `/transport/job-orders`
   - Save button: "Create Trip Order"
8. **Hire Challan Page Routes**:
   - Primary route: `/transport/hire-challan` (with `/transport/hire-challans` list view).
9. **Master Ledger Page Route**:
   - Primary route: `/accounts/master-ledger`
10. **Transport Invoices Page Route**:
    - Primary route: `/accounts/transport-invoices` / `/accounts/vouchers`
11. **Tracking Page Routes**:
    - Primary routes: `/transport/tracking`, `/tracking/fastag`, `/tracking/sim`, `/tracking/gps`
12. **POD Records Page Route**:
    - Primary route: `/transport/pod-records`
13. **Home Dashboard Route**:
    - Primary route: `/dashboard`

---

## 2. By-Design Test Failures in v3

In Panther AI v3, chat LR booking has been permanently decommissioned:
- No LR draft ever opens from chat.
- All requests to create or book an LR (e.g. "Mujhe LR book karni hai", "book LR from Delhi to Mumbai") are classified as `how_to_create_lr` and provide guidance to the official form (`/transport/lr-booking`), never creating a draft or opening a slot-filling session.
- As a consequence, legacy tests expecting chat LR draft creation fail by design:
  - `test_active_draft_destination_slot_filling` (AssertionError: assert None is not None)
  - `test_genuine_booking_opens_draft` (AssertionError: assert None is not None)
  - `test_cancel_discards_draft` (AssertionError: assert None is not None)
These test assertions expect active drafts from chat, which is explicitly removed in v3.

---

## 3. Fixes Implemented on 14 Nov 2026

- **Defect 1**: Added a WHY rule checked before how-to rules. Queries containing why / kyun / kis liye / purpose route to RAG with an 8-point boost on why/purpose chunks. "why do we make an LR" explains purpose first in 3–4 lines, then at most one line pointing to the form.
- **Defect 2**: Removed all VERIFY and dev notes from indexed knowledge chunks (`tms_knowledge.py`, `knowledge.py`, `docs/AI_TMS_KNOWLEDGE_BASE.md`). Added index-time line stripping in `rag.py` and response blocking in `output_guards.py`.
- **Defect 3**: Page help (`build_page_help_response`) strictly scoped to the current page registry entry and route-matched chunks only. Formatted with 2-line purpose, at most 4 bullets, and the primary action. Strict word count capped under 120 words.
- **Defect 4**: Single source of truth for tracking: `matched_lr.booking_status`. Exact mapping: BOOKED → "Booked — not yet dispatched", IN_TRANSIT → "In transit", DELIVERED → "Delivered", missing → "Status not recorded". Telemetry stays separate and never implies movement.
- **Defect 5**: E-way bill threshold sentences in `typed_tools.py` updated across all languages and cards to: "₹50,000 for inter-state movement; intrastate thresholds vary by state. In Panther TMS, confirmation is blocked above ₹50,000 — that is Panther's own rule."
- **Defect 6**: Source lines added to all RAG-grounded responses `(Source: Panther docs — ...)` and live-data responses `(Source: ... — ...)`.

