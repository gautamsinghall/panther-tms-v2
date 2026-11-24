# Panther AI v3 — TMS Expert Knowledge Base (plain dicts, no imports).
#
# SOURCES (per group) — web research, 13 Nov 2026, plus Panther workspace audits:
# - tms-basics-lr: LR/GR/Bilty meaning, fields, copies, status flow — web research
#   13 Nov 2026 (Carriage by Road Act 2007 s.9 triplicate; trade-practice 4th copy;
#   LR is not a tax invoice, e-way bill or POD) + Panther audit (status flow
#   BOOKED -> IN_TRANSIT -> DELIVERED; LR form /transport/lr-booking, buttons
#   "New LR Booking" / "Create Lorry Receipt").
# - tms-eway-bill: GST EWB-01, s.68 CGST Act + Rule 138, ewaybillgst.gov.in,
#   Rs 50,000 threshold, Part A/Part B, validity 1 day per 200 km (ODC 1 day per
#   20 km), extension within 8 hours, 360-day cap from 1 Jan 2025, 24-hour cancel,
#   consolidated EWB-02 — web research 13 Nov 2026.
# - tms-pod: POD meaning, ePOD, POD vs status update, "no POD, no payment" —
#   web research 13 Nov 2026.
# - tms-parties-freight-terms: consigner/consignee/billing client, Paid / To Pay /
#   To Be Billed — web research 13 Nov 2026.
# - tms-hire-challan: hire challan / lorry hire memo, market vs company vehicle —
#   web research 13 Nov 2026 + Panther audit (hire challan at /transport/hire-challan).
# - tms-job-trip: job order, trip/trip order, trip sheet, settlement formula —
#   web research 13 Nov 2026 + Panther audit (Job form at /transport/job-orders,
#   save button "Create Trip Order").
# - tms-vehicles-drivers: vehicle/driver master fields, RC, fitness, permit,
#   insurance, PUC (6 months cited), commercial licence requirement — web research
#   13 Nov 2026. Fitness renewal cycle is NOT stated: sources disagree.
# - tms-tracking: FASTag (toll-plaza checkpoints only), GPS (10-20 m, 30 sec-5 min),
#   SIM (100-400 m, 5-15 min), GPS-primary / SIM-fallback / FASTag-validation best
#   practice — web research 13 Nov 2026.
# - tms-invoicing-gst: GTA, SAC 996511, 5% RCM, 18% FCM from 22 Sept 2025
#   (Notification 15/2025; 12% was the pre-22-Sept-2025 rate, never current),
#   e-invoicing IRN (64-character hash + signed QR), Rs 5 crore turnover threshold
#   (B2B + exports, since 1 Aug 2023), 24-hour cancel — web research 13 Nov 2026.
# - tms-ledgers-tds: party ledger, two advances, settlement formula, TDS s.194C
#   (1% individual/HUF, 2% others with PAN; Rs 30,000 single payment,
#   Rs 1,00,000 aggregate per year; 194C(6) exemption at 10 or fewer goods
#   carriages with PAN declaration) — web research 13 Nov 2026.
# - tms-terms-ftl-ptl: FTL, PTL/LTL, detention (free time usually 1-2 hours),
#   demurrage (free days typically 2-7), backhaul, transit time, freight audit,
#   multi-drop — web research 13 Nov 2026.
# - tms-pages-*: what each Panther page is for — Panther workspace audits only.
#   ONLY these labels are verified: LR form at /transport/lr-booking, button
#   "New LR Booking", save button "Create Lorry Receipt"; Job form at
#   /transport/job-orders, save "Create Trip Order"; hire challan at
#   /transport/hire-challan. Every other page is described generically, with no
#   invented button label or route.
#
# All chunks use category="general" and min_plan_tier=1 on purpose: the router
# passes navigation module IDs as permitted categories, and only the "general"
# (plus "rules"/"errors"/"security") categories pass that RBAC gate for every
# user. Searchable terms live in content AND in title/keywords (BM25 indexes
# content, with +3 title and +2 keyword boosts).
#
# This module must NOT import rag.py (that would be a circular import):
# rag.py imports this module and converts the dicts into KnowledgeChunk objects.
#
# CORRECTION 13 Nov 2026 (user direction): the Create LR form has NO freight
# amount fields — freight is not entered on the form. Details documented in CHANGES-no14-v3.md.

TMS_KNOWLEDGE_CHUNKS = [
    # ------------------------------------------------------------------
    # tms-basics-lr — what an LR is, why it exists, its fields and copies
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-lr-what-is",
        "title": "What is an LR, GR or Bilty",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "An LR (Lorry Receipt), also called a GR (Goods Receipt) or bilty, is the document "
            "a transporter issues when it takes custody of goods for road transport. It is the "
            "carrier's written acknowledgement that the goods were received, the contract of "
            "carriage between the transporter and the customer, and the tracking key for the "
            "whole journey. The LR number is the reference everyone uses: the consignor quotes "
            "it to ask where the goods are, the consignee quotes it to claim the goods at "
            "destination, and the accounts team uses it to raise the freight invoice. An LR is "
            "also the starting point of any loss or damage claim, because it records what was "
            "handed over, in what condition, and on what terms. In Panther TMS every LR moves "
            "through the LR status flow: DRAFT, BOOKED, LOADED, IN_TRANSIT, ARRIVED, DELIVERED, "
            "POD_RECEIVED, POD_VERIFIED and CANCELLED."
        ),
        "keywords": ["lr", "lorry receipt", "gr", "goods receipt", "bilty", "consignment note", "what is lr"],
    },
    {
        "doc_id": "tms-lr-why-make",
        "title": "Why do we make an LR",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "We make an LR because no road consignment should travel without a written record "
            "of who gave what to whom. The LR serves as the legal contract of carriage and receipt, "
            "proving the transporter received the goods so the consignor has proof of dispatch and "
            "the consignee has a document to claim delivery against. It fixes the commercial terms "
            "in writing: the freight amount, whether freight is Paid, To Pay or To Be Billed, the "
            "route, the vehicle and the driver. It is the reference for tracking, for the e-way bill, "
            "for the proof of delivery, and the basis for billing. Without an LR there is no "
            "consignment number to track, no agreed freight to invoice, and no agreed record if "
            "goods are lost, damaged or delivered late. That is why Panther TMS requires an LR for "
            "every road shipment before dispatch, and why the LR number is quoted on invoices, PODs and ledgers."
        ),
        "keywords": ["why lr", "why make lr", "purpose of lr", "lr purpose", "need lr", "bilty purpose"],
    },
    {
        "doc_id": "tms-lr-fields",
        "title": "Fields on an LR",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A complete LR records the transporter name, address, GSTIN and PAN, the LR number "
            "and booking date, and the consignor and consignee names, addresses and GSTINs. It "
            "records the origin and destination, the vehicle number and driver details, and a "
            "description of the goods with HSN code, the number of packages, and the actual "
            "weight and the charged weight. It records the payment terms: "
            "Paid, To Pay, or To Be Billed. (The freight amount appears on the LR record "
            "and the invoice; on Panther's Create LR form no freight amount is entered — "
            "only the Payment Type.) Where applicable it also records the e-way bill "
            "number. In Panther TMS the LR number is generated from the active series for the "
            "issuing office, and an e-way bill is mandatory when the consignment value exceeds "
            "Rs 50,000, with confirmation blocked until a valid e-way bill number is entered."
        ),
        "keywords": ["lr fields", "lr details", "lr format", "lr contents", "consignor", "consignee", "gstin", "hsn", "charged weight"],
    },
    {
        "doc_id": "tms-lr-copies",
        "title": "The copies of an LR",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "By law an LR is issued in statutory triplicate under section 9 of the Carriage by "
            "Road Act 2007, with the original copy going to the consignor. Trade practice adds "
            "a fourth copy, so in practice there are four: the consignor copy, which is proof "
            "of dispatch; the consignee copy, which the receiver uses to claim the goods at "
            "destination; the driver or lorry copy, which travels with the vehicle, is signed "
            "on delivery and comes back as the proof of delivery; and the office or accounts "
            "copy, which is kept for records and billing. Each copy has the same LR number, so "
            "all four stay linked to one consignment. Losing the driver copy matters because "
            "that signed copy is what comes back as the POD that unlocks billing."
        ),
        "keywords": ["lr copies", "lr copy", "triplicate", "original copy", "consignor copy", "consignee copy", "driver copy", "lorry copy"],
    },
    {
        "doc_id": "tms-lr-not-invoice",
        "title": "An LR is not an invoice, e-way bill or POD",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "An LR is often confused with three other documents, but it is none of them. It is "
            "not the seller's tax invoice: the invoice is the seller's bill for the goods, "
            "while the LR is the transporter's receipt for carrying them. It is not the e-way "
            "bill: the e-way bill is the GST movement document generated on the government "
            "portal before the goods move, while the LR is the transporter's own consignment "
            "note. And it is not the POD: the POD is the signed proof created at delivery, "
            "while the LR is created at booking, before the journey starts. The four documents "
            "work together — the LR references the invoice and the e-way bill, and the POD "
            "closes the LR — but each one has a different issuer, a different purpose, and a "
            "different legal basis."
        ),
        "keywords": ["lr vs invoice", "lr vs eway bill", "lr vs pod", "lr difference", "bilty vs invoice"],
    },
    {
        "doc_id": "tms-lr-status-flow",
        "title": "LR status flow BOOKED to DELIVERED",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "In Panther TMS an LR moves through a fixed workflow of nine statuses: DRAFT, BOOKED, "
            "LOADED, IN_TRANSIT, ARRIVED, DELIVERED, POD_RECEIVED, POD_VERIFIED, and CANCELLED. "
            "DRAFT means the LR is saved but not yet confirmed. BOOKED means the LR is confirmed "
            "and the consignment is accepted for transport. LOADED means the goods have been put "
            "on the vehicle. IN_TRANSIT means the vehicle has departed and the goods are on the "
            "road. ARRIVED means the vehicle has reached the destination. DELIVERED means the "
            "goods reached the consignee and delivery is recorded. POD_RECEIVED means the proof "
            "of delivery document has been received but not yet checked. POD_VERIFIED is the final "
            "stage: the POD has been verified and approved, which is what triggers billing and "
            "acknowledgement from the receiver, and a clean POD is what triggers billing and "
            "payment. An LR can also be cancelled instead of completing the flow. Tracking an "
            "LR means asking for its current status in this flow plus its latest location "
            "evidence, such as a GPS ping, a SIM location, or a FASTag toll crossing."
        ),
        "keywords": ["lr status", "booked", "in transit", "delivered", "lr status flow", "lr tracking status", "draft", "loaded", "arrived", "pod_received", "pod_verified", "cancelled", "nine statuses", "lr lifecycle", "lr transitions"],
    },
    # ------------------------------------------------------------------
    # tms-eway-bill — the GST e-way bill
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-eway-what-is",
        "title": "What is an e-way bill",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "An e-way bill is the GST document for the movement of goods, in Form GST EWB-01 "
            "under section 68 of the CGST Act and Rule 138, generated on the government portal "
            "ewaybillgst.gov.in before the goods move. It is required when the value of a "
            "consignment exceeds Rs 50,000 including GST and cess, per consignment per invoice, for inter-state movement; intrastate thresholds differ by state, so the state rule must be checked. "
            "It is a tax movement document, not a transport document: the transporter still "
            "needs the LR as the consignment note, and the seller still needs the tax invoice. "
            "In Panther TMS an e-way bill is mandatory above Rs 50,000, and LR confirmation is "
            "blocked until a valid e-way bill number is entered; that is Panther's own rule, while under GST law the Rs 50,000 threshold is the inter-state rule and intrastate thresholds vary by state. Moving goods above the "
            "threshold without one risks detention of the vehicle and a penalty."
        ),
        "keywords": ["eway bill", "e-way bill", "ewb", "eway", "gst ewb-01", "what is eway bill"],
    },
    {
        "doc_id": "tms-eway-part-a-b",
        "title": "E-way bill Part A and Part B",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "An e-way bill has two parts. Part A carries the commercial details: the GSTINs of "
            "the supplier and recipient, the places of dispatch and delivery with PIN codes, "
            "the invoice or challan number and date, the HSN code, the value of the goods, and "
            "the reason for transport. Part B carries the transport details: the vehicle number "
            "or the Transporter ID. The validity clock starts only when Part B is filled, so a "
            "bill with only Part A complete does not yet count down. If the vehicle changes "
            "during the journey, Part B is updated with the new vehicle number. In Panther TMS "
            "the e-way bill number recorded on the LR links the consignment to this government "
            "document, and the vehicle in Part B should match the vehicle on the LR."
        ),
        "keywords": ["eway part a", "eway part b", "part a part b", "eway validity", "transporter id"],
    },
    {
        "doc_id": "tms-eway-validity",
        "title": "E-way bill validity and extension",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "An e-way bill is valid for 1 day per 200 km for regular cargo, where 1 day means "
            "24 hours, and for over-dimensional cargo the validity is 1 day per 20 km. The "
            "validity clock starts only when Part B, the vehicle part, is filled. If the goods "
            "cannot reach destination in time, the validity can be extended within 8 hours "
            "before or after expiry, and the total extension is capped at 360 days from "
            "1 January 2025. A transporter should check validity before dispatch and again "
            "during a long halt: an expired e-way bill on the road can lead to detention and "
            "penalty, even if the LR itself is perfectly in order. Validity depends on distance "
            "and cargo type, so the same route can have a different validity for different loads."
        ),
        "keywords": ["eway validity", "eway extension", "eway expiry", "200 km", "one day per 200 km", "over-dimensional"],
    },
    {
        "doc_id": "tms-eway-cancel-consolidated",
        "title": "Cancelling an e-way bill and consolidated bills",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "An e-way bill can be cancelled within 24 hours of generation if the goods were "
            "not moved, for example when the order was cancelled or the vehicle never left. "
            "Once cancelled it cannot be used, and a fresh bill must be generated if the goods "
            "still need to move. When one vehicle carries several consignments, each with its "
            "own e-way bill, a consolidated e-way bill in Form GST EWB-02 can be generated for "
            "the whole vehicle, so the driver carries one consolidated document plus the "
            "individual bills. The consolidated bill does not replace the individual e-way "
            "bills or the individual LRs; it simply groups them for one vehicle on one journey, "
            "which is the same idea as a trip grouping several LRs onto one vehicle."
        ),
        "keywords": ["eway cancel", "cancel eway bill", "consolidated eway bill", "ewb-02", "24 hours cancel"],
    },
    # ------------------------------------------------------------------
    # tms-pod — proof of delivery
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-pod-what-is",
        "title": "What is a POD",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A POD, proof of delivery, is the documented confirmation that a shipment reached "
            "its recipient at the agreed place and time. A proper POD records the date and "
            "time of delivery, the recipient's name, signature and stamp, the delivery "
            "location, the LR number, and the condition of the goods. An electronic POD, or "
            "ePOD, adds a timestamp, GPS location and a photo of the delivered goods or the "
            "signed acknowledgement. The signed LR driver copy returned after delivery is the "
            "classic paper POD. In Panther TMS the POD is what moves an LR to DELIVERED and "
            "unlocks billing: until the POD is recorded, the consignment is not treated as "
            "delivered, however close the vehicle got to the destination."
        ),
        "keywords": ["pod", "proof of delivery", "epod", "delivery proof", "what is pod", "signed pod"],
    },
    {
        "doc_id": "tms-pod-vs-status",
        "title": "A POD is not a delivery status update",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A POD is not the same as a delivery status update, a phone call, or a GPS ping. "
            "A status update says the vehicle is near the destination or the LR is marked "
            "delivered in a system; a phone call is one person telling another that the goods "
            "arrived; a GPS ping only proves the vehicle was at a place at a time. None of "
            "those is an auditable record signed by the receiver. A POD is the signed, "
            "auditable record: who received the goods, when, where, under which LR number, and "
            "in what condition. That is why customers and auditors accept a POD as evidence and "
            "do not accept a status message as evidence. If the receiver refuses to sign, or "
            "signs with a remark about damage or shortage, that remark is part of the POD and "
            "must be recorded, not smoothed over."
        ),
        "keywords": ["pod vs status", "pod difference", "delivery status", "gps ping", "pod evidence"],
    },
    {
        "doc_id": "tms-pod-billing",
        "title": "POD triggers billing and payment",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A clean POD triggers billing and payment, and in practice the rule is often no "
            "POD, no payment. The billing client will not pay freight until there is signed "
            "proof the goods were actually delivered, so an LR without a POD cannot be invoiced "
            "with confidence even though the vehicle has returned. Paper PODs change hands four "
            "or more times and can take days to come back from the driver, which is why POD "
            "delays block payments and why electronic PODs matter: an ePOD with timestamp, GPS "
            "and photo lands in minutes instead of days. Chasing pending PODs is therefore not "
            "paperwork for its own sake; it is chasing the money. In Panther TMS, POD records "
            "are the delivery evidence that closes the LR and supports the transport invoice."
        ),
        "keywords": ["pod billing", "no pod no payment", "pod payment", "pending pod", "epod billing"],
    },
    # ------------------------------------------------------------------
    # tms-parties-freight-terms — who pays, and how
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-parties",
        "title": "Consigner vs consignee vs billing client",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Three different parties appear on a consignment, and they are not the same role. "
            "The consigner, also spelled consignor, is the sender: the party that books the "
            "goods and hands them to the transporter. The consignee is the receiver: the party "
            "that claims the goods at destination. The billing client is whoever is invoiced "
            "for the freight, and that may be the consignor, the consignee, or a third party "
            "such as a head office. Confusing them causes real errors: freight billed to the "
            "consignee when the consignor agreed to pay it, or a POD chased from the billing "
            "client who never touches the goods. On the LR, the consignor and consignee are "
            "recorded with names, addresses and GSTINs, and the billing client is the account "
            "the freight is posted to for invoicing."
        ),
        "keywords": ["consigner", "consignor", "consignee", "billing client", "sender receiver", "who is consignee"],
    },
    {
        "doc_id": "tms-freight-paid",
        "title": "Paid freight",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Paid freight means the freight was settled at booking, normally by the consignor "
            "who booked the goods. The transporter has the money before the vehicle leaves, so "
            "there is nothing to collect at delivery and the consignee simply receives the "
            "goods against the LR. Paid is the simplest term for the transporter because there "
            "is no collection risk and no later invoice for that LR, though the payment still "
            "needs a receipt and a ledger entry. On the LR the payment term is recorded as "
            "Paid, and the freight amount, any advance and the balance are shown so that the "
            "driver and the destination office can see at a glance that nothing is due on "
            "delivery. Paid, To Pay and To Be Billed are the three payment terms on an LR."
        ),
        "keywords": ["paid freight", "paid lr", "freight paid", "payment terms", "paid to pay tbb"],
    },
    {
        "doc_id": "tms-freight-to-pay",
        "title": "To Pay freight",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "To Pay freight means the consignee pays the freight at delivery, before the goods "
            "are released. The transporter carries the collection risk on the road: if the "
            "consignee cannot or will not pay, the goods stay with the transporter and the "
            "freight is unpaid. The driver must therefore know the exact To Pay amount before "
            "leaving, collect it at the destination, and account for the cash. The LR shows "
            "the To Pay amount so the destination office can verify what was collected. To Pay "
            "is common when the receiver, not the sender, has agreed to bear the transport "
            "cost. It is different from To Be Billed, where nobody pays cash at delivery and "
            "the freight is invoiced later to an approved account."
        ),
        "keywords": ["to pay", "to pay freight", "to pay lr", "consignee pays", "freight collection"],
    },
    {
        "doc_id": "tms-freight-tbb",
        "title": "To Be Billed freight TBB",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "To Be Billed, or TBB, means the freight is not paid in cash at booking or at "
            "delivery. Instead it is posted to an approved billing client account and invoiced "
            "later, usually grouped across many LRs over a billing period. TBB needs a credit "
            "arrangement: the billing client has an account, agreed credit terms and a credit "
            "limit, and the transporter carries the receivable until the invoice is paid. That "
            "is why TBB is only for approved accounts and why the party ledger and outstanding "
            "ageing matter so much: a TBB LR becomes an unpaid invoice, and unpaid invoices "
            "age until they are collected. On the LR the term is recorded as To Be Billed, and "
            "the billing client is the party the invoice will go to."
        ),
        "keywords": ["to be billed", "tbb", "tbb freight", "credit billing", "billed later"],
    },
    # ------------------------------------------------------------------
    # tms-hire-challan — hiring a market vehicle
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-hc-what-is",
        "title": "What is a hire challan",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A hire challan, also called a lorry hire memo or LHC, is the commercial record "
            "made when a transporter hires a market vehicle, a third-party truck, for one "
            "trip. It records the vehicle, the route, the agreed hire amount, the advance "
            "paid, the balance payable, any deductions, and the terms of the hiring. It is not "
            "the LR, not the customer invoice, and not a GST document: the LR is the "
            "consignment note for the customer's goods, the invoice is the bill for freight, "
            "and the hire challan is the transporter's own record of what it owes the vehicle "
            "owner. In Panther TMS the hire challan is created at the hire challan page, and "
            "it is settled after unloading, when the balance payable is worked out against the "
            "advance already given."
        ),
        "keywords": ["hire challan", "lorry hire memo", "lhc", "hire memo", "what is hire challan", "market vehicle hire"],
    },
    {
        "doc_id": "tms-hc-market-vs-own",
        "title": "Market vehicle vs company vehicle",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A company vehicle is the transporter's own truck: the transporter bears the fuel, "
            "the driver, the maintenance, the insurance and the document renewals, and the "
            "cost of the trip is the running cost of its own fleet. A market vehicle is a "
            "third-party truck hired for one trip: the transporter pays the owner an agreed "
            "hire rate for that trip, usually with an advance at loading and the balance at "
            "unloading, and the owner bears the running of his own truck. Market vehicles give "
            "flexibility when the own fleet is busy, but each hiring needs a hire challan, an "
            "agreed rate, and a settlement after the trip. The choice shows up everywhere in "
            "Panther TMS: vehicles are kept in separate company and market masters, and trip "
            "profit looks different for an own truck versus a hired one."
        ),
        "keywords": ["market vehicle", "company vehicle", "own vehicle", "hired vehicle", "market vs own"],
    },
    {
        "doc_id": "tms-hc-advance",
        "title": "Hire advance and settlement",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "When a market vehicle is hired, the owner is usually paid an advance at loading "
            "and the balance after unloading and delivery. The advance percentage is negotiated "
            "per trip between the transporter and the vehicle owner: there is no standard "
            "percentage, and no fixed share should be quoted as the norm. The hire challan "
            "records the agreed hire, the advance paid, and the balance payable, and at "
            "settlement the balance is worked out as agreed hire minus advance minus any "
            "agreed deductions, such as for damage, delay, or missing documents. The driver "
            "also needs running money for the road, which is tracked separately as a driver or "
            "vehicle advance on the trip sheet. Keeping the hire advance and the driver advance "
            "separate is essential, because they are owed to different people."
        ),
        "keywords": ["hire advance", "hire settlement", "hire balance", "advance paid", "balance payable", "hire challan settlement"],
    },
    # ------------------------------------------------------------------
    # tms-job-trip — job orders, trips and trip sheets
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-job-what-is",
        "title": "What is a job order",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A job order is the instruction for what must be delivered: the customer order "
            "with the shipper and consignee, the pickup and delivery windows, the commodity, "
            "and the agreed rate. It is the commercial commitment before any vehicle is "
            "placed. A job can be a single delivery or part of a larger movement, and it "
            "exists before the LR: the LR is the consignment note created when the goods are "
            "actually loaded. In Panther TMS the Job form is at /transport/job-orders and is "
            "saved with the \"Create Trip Order\" button. Every LR should be linked to a job, "
            "so that the work promised to the customer, the vehicle that carried it, and the "
            "freight that was billed can all be traced back to one job order."
        ),
        "keywords": ["job order", "job", "transport job", "what is job", "job vs lr", "indent"],
    },
    {
        "doc_id": "tms-trip-what-is",
        "title": "What is a trip or trip order",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A trip, or trip order, is the answer to who, when and with which vehicle: it "
            "groups one or more jobs or LRs onto one vehicle and one driver for one journey. "
            "A job says what must be delivered; the trip says how it will be delivered on this "
            "run. One trip can carry several LRs, for example several part-load consignments "
            "going the same way, while one LR normally belongs to one trip. The trip is also "
            "the unit of driver settlement: the advances, diesel, tolls and expenses of that "
            "one journey are recorded against the trip, and the trip profit is worked out from "
            "them. In Panther TMS the trip is the operational grouping that links jobs, LRs, "
            "the vehicle, the driver, and the trip expenses together."
        ),
        "keywords": ["trip", "trip order", "trip vs job", "what is trip", "journey", "dispatch"],
    },
    {
        "doc_id": "tms-trip-sheet",
        "title": "What is a trip sheet",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A trip sheet is the vehicle's operational ledger for one journey. It records the "
            "trip ID and date, the vehicle and driver, the LRs attached to the trip, the "
            "odometer reading in km, the diesel filled, the FASTag tolls paid, the driver "
            "advances given, and the freight charges for the load. Its purpose is driver "
            "settlement and trip profit and loss: the settlement is worked out as Advance "
            "Given minus Valid Expenses equals Net Balance, which shows whether the driver "
            "owes the company money or the company owes the driver. Because the trip sheet "
            "holds both the income side, the freight, and the cost side, diesel, tolls and "
            "advances, it is also the document that shows whether that one journey actually "
            "made money."
        ),
        "keywords": ["trip sheet", "trip expense", "driver settlement", "advance given", "net balance", "trip pnl"],
    },
    {
        "doc_id": "tms-job-trip-lr",
        "title": "How job, trip and LR fit together",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Job, trip and LR are three layers of the same movement. The job order is what "
            "must be delivered: the customer order with shipper, consignee, windows, commodity "
            "and rate. The trip is who, when and with which vehicle: it groups one or more "
            "jobs onto one vehicle and driver for one journey. The LR is the consignment note "
            "for the goods actually loaded on that trip, with the freight terms and the "
            "tracking reference. So a job can lead to one or more LRs, a trip can carry several "
            "LRs, and one LR normally belongs to one trip. If any layer is missing, the chain "
            "breaks: a job with no LR was never loaded, an LR with no trip has no vehicle, and "
            "a trip with no job has no customer commitment behind it."
        ),
        "keywords": ["job trip lr", "job vs trip vs lr", "how job trip lr work", "job to lr", "trip to lr"],
    },
    # ------------------------------------------------------------------
    # tms-vehicles-drivers — masters, documents and licences
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-vehicle-master",
        "title": "Vehicle master fields",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The vehicle master is the register of every truck the company owns or hires. For "
            "each vehicle it records the registration number, the owner, the make and model, "
            "the vehicle class, the GVW or gross vehicle weight, the fuel type, the chassis "
            "and engine numbers, the vehicle type, whether it is an own or a market vehicle, "
            "and the expiry dates for the RC, fitness, permit, insurance and PUC. Keeping "
            "these in one master matters because an LR can only be assigned to a vehicle whose "
            "documents are current: a truck with expired fitness or insurance should not be "
            "dispatched. Panther TMS keeps company vehicles and market vehicles in separate "
            "masters, because an own truck is a fixed asset with running costs while a market "
            "truck is hired per trip under a hire challan."
        ),
        "keywords": ["vehicle master", "vehicle details", "gvw", "registration number", "vehicle type", "own market vehicle"],
    },
    {
        "doc_id": "tms-vehicle-rc",
        "title": "Vehicle RC registration certificate",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The RC, registration certificate, is the legal registration document for a vehicle, "
            "issued by the RTO, the Regional Transport Office. It records the registration "
            "number, the owner, the make and model, the chassis and engine numbers, and the "
            "vehicle class, and it must be carried in the vehicle. The RC is the foundation "
            "document: fitness, permit and insurance all attach to the registered vehicle, and "
            "an LR, a hire challan or a FASTag record all quote the registration number from "
            "the RC. If the registration number on the LR does not match the RC, the "
            "consignment, the e-way bill Part B and the toll records will not line up, and the "
            "vehicle can be stopped. A change of ownership or a change of vehicle details needs "
            "the RC to be updated first."
        ),
        "keywords": ["rc", "registration certificate", "rto", "vehicle registration", "rc details"],
    },
    {
        "doc_id": "tms-vehicle-fitness-permit",
        "title": "Vehicle fitness and permit",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Fitness is the roadworthiness certificate for a vehicle, covering brakes, "
            "lighting, tyres and emissions. A vehicle without current fitness should not be on "
            "the road, and a permit is valid only when fitness, insurance, PUC and tax are all "
            "current. The renewal cycle for fitness is not stated here as a settled fact, "
            "because sources disagree on the cycle, so the expiry date on the vehicle's own "
            "fitness certificate is the date to follow. A permit, issued under the Motor "
            "Vehicles Act 1988, authorises a goods vehicle to operate: a state permit covers "
            "one state and a National Permit covers movement across states. Dispatch should "
            "always check the permit's coverage against the LR route before the vehicle leaves."
        ),
        "keywords": ["fitness", "fitness certificate", "permit", "national permit", "motor vehicles act", "roadworthiness"],
    },
    {
        "doc_id": "tms-vehicle-insurance-puc",
        "title": "Vehicle insurance and PUC",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Commercial third-party insurance is mandatory by law for a goods vehicle: it covers "
            "liability to third parties. Comprehensive insurance, which also covers damage to "
            "the vehicle itself, is common practice but it is not a legal requirement. The PUC, "
            "pollution under control certificate, is the emission certificate for the vehicle, "
            "and its validity is cited as 6 months. A permit is valid only with current "
            "fitness, insurance, PUC and tax, so all four must be tracked together in the "
            "vehicle master. An expired insurance or PUC is not just a fine risk: it can void "
            "a claim, block a permit renewal, and leave the transporter exposed if the vehicle "
            "is in an accident while carrying a customer's goods under an LR."
        ),
        "keywords": ["insurance", "third party insurance", "comprehensive insurance", "puc", "pollution certificate", "emission"],
    },
    {
        "doc_id": "tms-driver-master",
        "title": "Driver master and licence",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The driver master records each driver's name and contact details, driving licence "
            "number, licence category and endorsement, and licence expiry date. A driver of a "
            "transport vehicle needs a commercial or Transport-category licence, such as "
            "LMV-Transport, HMV or PSV: a private driving licence does not authorise driving "
            "goods vehicles for hire. Assigning a driver whose licence category or expiry does "
            "not cover the vehicle is a compliance failure and an insurance risk. The driver "
            "master also links to the driver's advance and balance, because driver advances "
            "are given at loading and settled against the trip sheet after the journey. In "
            "Panther TMS the driver is assigned on the LR and on the trip, and the licence "
            "number is part of the driver's record."
        ),
        "keywords": ["driver master", "driver licence", "driving licence", "dl", "commercial licence", "lmv transport", "hmv", "licence expiry"],
    },
    # ------------------------------------------------------------------
    # tms-tracking — FASTag, GPS and SIM
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-tracking-fastag",
        "title": "FASTag tracking",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "FASTag is the RFID tag fixed on a vehicle's windscreen, linked to a prepaid "
            "wallet from which toll is deducted automatically at toll plazas. For tracking, "
            "each toll crossing is a checkpoint: it proves the vehicle passed that plaza at "
            "that time. But FASTag gives point-in-time checkpoints only, at toll plazas that "
            "are typically 50 to 200 km apart, and it is not continuous tracking. Between two "
            "plazas there is no FASTag signal at all. Its strength is independence: it does "
            "not depend on the driver's phone or on a GPS device in the truck, so it is a "
            "useful cross-check. If the GPS route and the FASTag route disagree, that mismatch "
            "is treated as a tamper alert. FASTag is validation, not a replacement for live "
            "tracking."
        ),
        "keywords": ["fastag", "toll tracking", "toll plaza", "rfid", "fastag tracking", "toll crossing"],
    },
    {
        "doc_id": "tms-tracking-gps",
        "title": "GPS tracking",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "GPS tracking uses a hardware device fitted in the vehicle, with a SIM and "
            "maintenance, to report the vehicle's position continuously. Accuracy is about "
            "10 to 20 metres, with a location update every 30 seconds to 5 minutes. That makes "
            "GPS the most precise and most continuous tracking method: it shows the live "
            "route, halts, detours and arrival, not just checkpoints. The cost is the hardware, "
            "the SIM subscription and the upkeep, and it only works on vehicles that actually "
            "have a working device fitted. For own fleet vehicles, where the transporter "
            "controls the truck, GPS is the primary tracking method. For hired market vehicles "
            "that have no device, GPS is usually not available, which is why SIM tracking "
            "exists as the fallback."
        ),
        "keywords": ["gps", "gps tracking", "telematics", "live tracking", "gps device", "vehicle location"],
    },
    {
        "doc_id": "tms-tracking-sim",
        "title": "SIM tracking",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "SIM tracking follows the driver's phone SIM instead of a device in the vehicle. "
            "It needs no hardware: the driver's phone reports its location, typically every "
            "5 to 15 minutes, with an accuracy of about 100 to 400 metres. That is less "
            "precise and less frequent than GPS, but it works on any vehicle, which is why it "
            "is the best option for market vehicles that have no GPS device fitted. Because it "
            "follows the phone rather than the truck, it depends on the driver keeping the "
            "phone switched on and sharing location, and it normally needs the driver's "
            "consent. In Panther TMS, SIM tracking is consent-driven, and a driver who has not "
            "given consent cannot be tracked this way."
        ),
        "keywords": ["sim tracking", "sim", "phone tracking", "driver phone", "consent tracking", "sim location"],
    },
    {
        "doc_id": "tms-tracking-best-practice",
        "title": "Which tracking to use and when",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Best practice is to use GPS as the primary tracking, SIM as the fallback, and "
            "FASTag as independent validation. GPS gives continuous, precise positions every 30 "
            "seconds to 5 minutes at 10 to 20 metres, so it is the first choice wherever a "
            "device is fitted, normally the own fleet. SIM tracking, every 5 to 15 minutes at "
            "100 to 400 metres, covers market vehicles with no device, using the driver's "
            "phone with consent. FASTag gives toll-plaza checkpoints only, 50 to 200 km apart, "
            "but it is independent of both the device and the phone, so it validates the other "
            "two. A GPS and FASTag route mismatch is a tamper alert: it can mean the device was "
            "moved, the phone was left behind, or the vehicle took a different route."
        ),
        "keywords": ["tracking best practice", "gps vs sim vs fastag", "which tracking", "tamper alert", "route mismatch"],
    },
    # ------------------------------------------------------------------
    # tms-invoicing-gst — GTA, RCM/FCM, invoice contents, e-invoicing
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-gst-gta",
        "title": "What is a GTA and SAC 996511",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A GTA is a Goods Transport Agency, and issuing an LR is what defines one: any "
            "transporter that issues a lorry receipt for the transport of goods by road is a "
            "GTA. That matters because GTA services have their own GST treatment, different "
            "from an ordinary service. The SAC code for GTA services is 996511, and it must "
            "appear on the transport invoice. The two GST options for a GTA are the reverse "
            "charge mechanism, where the recipient pays the tax, and the forward charge "
            "mechanism, where the transporter charges it. Which one applies must be declared "
            "on the invoice, because the recipient's right to claim input tax credit depends "
            "on it. Getting the GTA treatment wrong means the invoice, the ledger and the GST "
            "returns will not agree."
        ),
        "keywords": ["gta", "goods transport agency", "sac 996511", "sac code", "gta gst"],
    },
    {
        "doc_id": "tms-gst-rcm",
        "title": "GST reverse charge RCM 5 percent",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The default GST treatment for a GTA is the reverse charge mechanism, or RCM, at "
            "5 percent. Under RCM the transporter charges 0 percent GST on the freight invoice, "
            "and the recipient of the transport service pays the 5 percent tax directly to the "
            "government and claims it as input tax credit. The invoice must still show the "
            "freight, the SAC 996511, and a declaration that the supply is under reverse "
            "charge, so the recipient knows to pay the tax. RCM is the default, which means a "
            "transporter that wants to charge GST itself must deliberately opt for the forward "
            "charge instead. A recipient who receives an RCM invoice and does not pay the "
            "reverse charge is the one in default, not the transporter."
        ),
        "keywords": ["rcm", "reverse charge", "5 percent gst", "reverse charge mechanism", "gta rcm"],
    },
    {
        "doc_id": "tms-gst-fcm",
        "title": "GST forward charge FCM 18 percent",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Under the forward charge mechanism, or FCM, the GTA itself charges GST on the "
            "freight invoice. The current forward charge rate is 18 percent with input tax "
            "credit, effective from 22 September 2025 under Notification 15/2025. The earlier "
            "rate of 12 percent was the rate before 22 September 2025 and must never be "
            "presented as the current rate. FCM is an option, not the default: the default for "
            "a GTA is 5 percent reverse charge, where the transporter charges 0 percent and "
            "the recipient pays. A transporter that opts for FCM charges 18 percent, pays it "
            "to the government, and can claim input tax credit on its own purchases. The "
            "invoice must declare whether it is RCM or FCM, because the two are treated "
            "completely differently by the recipient."
        ),
        "keywords": ["fcm", "forward charge", "18 percent gst", "forward charge mechanism", "notification 15/2025"],
    },
    {
        "doc_id": "tms-invoice-fields",
        "title": "What a transport invoice must include",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A transport invoice must include the gross weight and the charged weight, the "
            "GSTINs of both the consignor and the consignee, the vehicle registration number, "
            "the LR number, the SAC code 996511, the freight amount and rate, a declaration of "
            "whether the supply is under reverse charge or forward charge, and the place of "
            "supply. Each item exists for a reason: the LR number links the invoice to the "
            "consignment and its POD, the GSTINs identify the parties for tax, the vehicle "
            "number proves which truck carried the load, the weights justify the freight, and "
            "the RCM versus FCM declaration tells the recipient who pays the GST. An invoice "
            "missing the LR number or the GSTINs will be rejected in a freight audit, where "
            "the invoice is checked against the agreed rate, the LR, the POD and the weight "
            "before payment."
        ),
        "keywords": ["transport invoice", "invoice fields", "invoice contents", "freight invoice", "sac 996511", "place of supply"],
    },
    {
        "doc_id": "tms-einvoicing",
        "title": "E-invoicing and IRN",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "E-invoicing does not mean creating the invoice on the government portal. The "
            "invoice is created in the company's own software and then reported as JSON data "
            "to an Invoice Registration Portal, or IRP. The IRP returns a 64-character IRN "
            "hash and a signed QR code, which are printed on the invoice. Without the IRN the "
            "invoice is not a valid e-invoice. E-invoicing is mandatory above Rs 5 crore "
            "aggregate turnover in any preceding financial year from 2017-18, for B2B supplies "
            "and exports, since 1 August 2023; the rules are published on gst.gov.in and the e-way bill rules on ewaybillgst.gov.in. An IRN can be cancelled within 24 hours. The "
            "e-invoice is a different document from the e-way bill: the e-invoice proves the "
            "supply for GST, while the e-way bill permits the movement of the goods."
        ),
        "keywords": ["e-invoicing", "einvoice", "irn", "invoice registration portal", "qr code", "5 crore turnover"],
    },
    # ------------------------------------------------------------------
    # tms-ledgers-tds — ledgers, advances, settlement, TDS
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-ledger-party",
        "title": "Party ledger and outstanding ageing",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "A party ledger is the live running ledger for one customer or vendor: every "
            "invoice, payment, credit note, debit note, advance and TDS entry for that party "
            "is posted to it, and the running balance shows what is owed at any moment. It is "
            "the single place to answer how much a customer owes us or how much we owe a "
            "vendor. Outstanding ageing tracks unpaid invoices by how long they have been "
            "overdue, so old unpaid freight stands out from this week's billing. For a "
            "transporter this matters most on To Be Billed work, where freight is invoiced "
            "later to an approved account and becomes a receivable in the ledger until it is "
            "collected. In Panther TMS the master ledger is the running record behind every "
            "balance the chatbot reports, and it is always scoped to the user's office."
        ),
        "keywords": ["party ledger", "master ledger", "ledger", "khata", "outstanding", "ageing", "running balance"],
    },
    {
        "doc_id": "tms-ledger-advances",
        "title": "Two different advances",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "There are two completely different advances in transport, and mixing them up "
            "breaks both the customer ledger and the driver settlement. A customer freight "
            "advance is part of the freight received at booking: the customer pays some of the "
            "freight in advance, and the balance is collected later or billed. A driver or "
            "vehicle advance is cash, diesel or FASTag given to the driver at loading so the "
            "trip can run, and it is settled against the trip sheet after the journey. One is "
            "money in from a customer against freight; the other is money out to a driver "
            "against trip expenses. The hire challan advance is a third, related one: the "
            "advance paid to a market vehicle owner at loading, settled against the agreed "
            "hire. Each advance belongs on a different ledger and a different settlement."
        ),
        "keywords": ["freight advance", "driver advance", "vehicle advance", "advance", "advance types", "customer advance"],
    },
    {
        "doc_id": "tms-ledger-settlement",
        "title": "Settlement formula Bill minus Advance minus TDS minus deductions",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Settlement is the final working out of what is actually payable, and the formula "
            "is the same shape everywhere in transport: Bill minus Advance minus TDS minus "
            "deductions equals Net Balance. For a customer bill, the bill is the freight "
            "invoice, the advance is any freight advance received at booking, TDS is the tax "
            "deducted at source on the freight, and deductions are agreed reductions such as "
            "for damage or shortage. For a driver, the trip sheet settlement is Advance Given "
            "minus Valid Expenses equals Net Balance, which shows whether the driver owes the "
            "company or the company owes the driver. For a hired vehicle, the hire challan "
            "settlement is the agreed hire minus the advance paid minus deductions. Writing "
            "the settlement down with each line visible is what makes it auditable."
        ),
        "keywords": ["settlement", "net balance", "bill minus advance", "settlement formula", "deductions"],
    },
    {
        "doc_id": "tms-tds-194c",
        "title": "TDS on freight section 194C",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "TDS on freight is deducted under section 194C of the Income Tax Act. The rate is "
            "1 percent for an individual or HUF and 2 percent for others, where PAN is "
            "furnished. It applies above Rs 30,000 for a single payment and above Rs 1,00,000 "
            "in aggregate payments to one transporter in a year. So small, occasional payments "
            "below the thresholds do not attract TDS, while regular freight payments to the "
            "same transporter do, once the limits are crossed. There is an exemption under "
            "section 194C(6): no TDS is deducted from a transporter who owns 10 or fewer goods "
            "carriages and furnishes a PAN declaration to that effect. The TDS deducted is "
            "recorded in the party ledger and reduces the net amount payable on settlement."
        ),
        "keywords": ["tds", "194c", "tds on freight", "tds rate", "1 percent 2 percent", "tds exemption", "10 goods carriages"],
    },
    # ------------------------------------------------------------------
    # tms-terms-ftl-ptl — load and time terms
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-terms-ftl",
        "title": "FTL full truck load",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "FTL, full truck load, means one shipper books the whole vehicle for one "
            "consignment. The truck goes direct from the loading point to the delivery point "
            "with no other shipper's goods on board, and the freight is a flat rate for the "
            "route rather than a rate per kilo or per package. FTL is the fastest option "
            "because there is no hub handling and no waiting for other loads, and it is the "
            "safest for the goods because they are not loaded and unloaded several times. It "
            "is also the most expensive per kilo when the load does not fill the truck, which "
            "is why a shipper with a small load usually chooses part load instead. An FTL "
            "movement is normally one LR, one trip, and one vehicle."
        ),
        "keywords": ["ftl", "full truck load", "full load", "ftl vs ptl", "direct load"],
    },
    {
        "doc_id": "tms-terms-ptl",
        "title": "PTL part load LTL",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "PTL, part load, also called LTL or less than truckload, means several shippers "
            "share one vehicle. Their consignments are collected, taken to a hub, sorted, and "
            "sent onward together, which is the hub-and-spoke model. PTL is cheaper than FTL "
            "because the cost of the vehicle is split between the shippers, but it is slower, "
            "typically by 1 to 3 days, because of the hub halt and the extra loading and "
            "unloading, and the goods are handled more often, which raises the damage risk. "
            "Each shipper still gets their own LR, and one trip can carry several PTL LRs. PTL "
            "is the right choice for a small consignment that does not fill a truck and is not "
            "in a hurry; FTL is the right choice for a full load or an urgent one."
        ),
        "keywords": ["ptl", "part load", "ltl", "less than truckload", "hub and spoke", "part load vs ftl"],
    },
    {
        "doc_id": "tms-terms-detention-demurrage",
        "title": "Detention vs demurrage",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Detention and demurrage are both charges for holding up equipment, but they apply "
            "in different places. Detention is the fee for a truck held beyond the free time, "
            "usually 1 to 2 hours, at loading or unloading: the vehicle and driver are waiting "
            "instead of earning, so the party causing the delay pays per hour. Demurrage is the "
            "daily fee for a loaded container sitting at a port or terminal beyond its free "
            "days, typically 2 to 7 days: the container is occupying terminal space instead of "
            "moving. Detention is about the truck at a factory or warehouse; demurrage is about "
            "the container at a port or terminal. Both should be agreed in advance, with the "
            "free time and the rate written down, because both are common causes of billing "
            "disputes after the trip."
        ),
        "keywords": ["detention", "demurrage", "detention charges", "free time", "demurrage charges", "detention vs demurrage"],
    },
    {
        "doc_id": "tms-terms-backhaul-etc",
        "title": "Backhaul, transit time, freight audit, multi-drop",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Backhaul, or the empty return, is the problem of a truck coming back empty after "
            "a delivery: a paid load on the return leg earns money from a journey that would "
            "otherwise earn nothing, and finding backhauls is one of the biggest profit levers "
            "in road transport. Transit time is the time from pickup to delivery on a lane, "
            "and it is what the customer actually judges the transporter on. Freight audit is "
            "the check of an invoice against the agreed rate, the LR, the POD and the weight "
            "before payment, and it catches overcharging and billing for undelivered goods. "
            "Multi-drop is one vehicle delivering to several consignees on one route, which "
            "needs the drop order planned in advance so the last consignment loaded is not the "
            "first one needed at the roadside."
        ),
        "keywords": ["backhaul", "empty return", "transit time", "freight audit", "multi-drop", "multi drop", "return load"],
    },
    # ------------------------------------------------------------------
    # tms-pages-* — what each Panther page is for (Panther audits only;
    # only the labels listed in the file header are verified)
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-page-lr-booking",
        "title": "LR Booking page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The LR Booking page at /transport/lr-booking is where LRs are created and viewed "
            "in Panther TMS. It lists existing lorry receipts with their status in the flow "
            "BOOKED, IN_TRANSIT, DELIVERED, and it is where a new LR is made. The page shows "
            "the LR number, booking and dispatch dates, the consignor and consignee, the "
            "origin and destination hubs, the truck number, the number of packages, and the "
            "payment type. From here you can search for an LR, open one to check its details, "
            "track its status, and print the bilty. The LR number on this page is the same "
            "reference used on the POD, the transport invoice and the party ledger, so this "
            "page is the starting point for almost every transport question about a consignment."
        ),
        "route": "/transport/lr-booking",
        "keywords": ["lr booking page", "lr booking", "lr list", "lr page", "what is this page", "lr booking screen"],
    },
    {
        "doc_id": "tms-page-lr-booking-create",
        "title": "Creating an LR on the LR Booking page",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "To create an LR, open the LR Booking page at /transport/lr-booking and click the "
            "\"New LR Booking\" button. The required fields are Booking Status, Dispatch Date, "
            "Payment Type, Origin Hub, Destination Hub, Consignor, Consignee, Truck No., and "
            "No. of Packages. You may also pick a Job No. to import its details, or leave the "
            "default Direct Booking (No Job). The form has no freight amount fields — "
            "freight is not entered on the Create LR form. There is no "
            "standalone cargo description field: cargo is entered in the "
            "invoice-line Particulars, and there is no LR Date field: the only date is the "
            "Dispatch Date. Click \"Create Lorry Receipt\" to save: the official LR number is "
            "assigned from the series for the issuing office. In Panther, saving is blocked "
            "without an e-way bill when the consignment value exceeds Rs 50,000."
        ),
        "route": "/transport/lr-booking",
        "keywords": ["create lr", "new lr booking", "create lorry receipt", "how to create lr", "lr form", "lr mandatory fields", "required fields lr"],
    },
    {
        "doc_id": "tms-page-lr-booking-mistakes",
        "title": "Common mistakes on the LR Booking page",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Common mistakes on the LR Booking page are worth knowing before you save. Truck "
            "No. is required, but the form offers no way to type a plate directly: if the "
            "tenant has no vehicles yet, the LR cannot be saved until a vehicle is created "
            "first. Returning from Add Vehicle has wiped the LR form's job-imported values in "
            "the past, including the job selection, dispatch date, parties, packages and "
            "weights, so check every field again after adding a vehicle and re-select the job "
            "if the values are gone. The booking date can look inconsistent: the print shows "
            "one date and the LR list shows the dispatch date, because there is no separate LR "
            "Date field. And an e-way bill above Rs 50,000 in Panther blocks confirmation, so "
            "have the 12-digit e-way bill number ready before saving."
        ),
        "route": "/transport/lr-booking",
        "keywords": ["lr mistakes", "lr form problem", "lr cannot save", "truck no required", "lr wiped", "lr booking date"],
    },
    {
        "doc_id": "tms-page-jobs",
        "title": "Job Orders page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Job Orders page at /transport/job-orders is where transport jobs are created "
            "and viewed in Panther TMS. A job order is the customer order for what must be "
            "delivered: the shipper and consignee, the pickup and delivery windows, the "
            "commodity, and the agreed rate. The page lists jobs with their status, so you can "
            "see which jobs are open, which are booked onto a vehicle, and which are done. A "
            "job exists before the LR: the LR is the consignment note created when the goods "
            "are actually loaded, and it should be linked to its job. In the demo tenant the "
            "jobs are real records such as JOB-0001 onwards, and the chatbot's job list shows "
            "only real jobs from the database, never invented numbers."
        ),
        "route": "/transport/job-orders",
        "keywords": ["job orders page", "jobs page", "job list", "transport jobs", "what is this page", "job orders screen"],
    },
    {
        "doc_id": "tms-page-jobs-create",
        "title": "Creating a job order and what happens on Save",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "To create a job order, open the Job Orders page at /transport/job-orders and fill "
            "in the customer order: the consignor and consignee, the origin and destination, "
            "the scheduled dispatch date, the commodity, and the agreed rate. Save with the "
            "\"Create Trip Order\" button. Saving creates the job record with a job number, and "
            "the job can then be selected on the LR Booking page so its details, including the "
            "parties, the route, the packages and the weights, are imported into the LR "
            "instead of being typed again. A job with no LR was never loaded, and an LR with "
            "no job has no customer commitment behind it, so the link between the two is what "
            "lets the business trace a delivery from the customer order to the vehicle to the "
            "freight that was billed."
        ),
        "route": "/transport/job-orders",
        "keywords": ["create job", "create trip order", "new job order", "how to create job", "job form", "job save"],
    },
    {
        "doc_id": "tms-page-hire-challan",
        "title": "Hire Challan page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Hire Challan page at /transport/hire-challan is where a market vehicle, a "
            "third-party truck hired for one trip, is recorded in Panther TMS. The hire "
            "challan records the vehicle, the route, the agreed hire, the advance paid, the "
            "balance payable, any deductions, and the terms of the hiring. It is not the LR, "
            "not the customer invoice, and not a GST document: the LR is the consignment note "
            "for the customer's goods, the invoice bills the freight, and the hire challan is "
            "the transporter's own record of what it owes the vehicle owner. The challan is "
            "settled after unloading, when the balance payable is worked out as the agreed "
            "hire minus the advance already given minus any agreed deductions."
        ),
        "route": "/transport/hire-challan",
        "keywords": ["hire challan page", "hire challan", "lorry hire memo", "what is this page", "hire challan screen"],
    },
    {
        "doc_id": "tms-page-ledger",
        "title": "Master Ledger page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Master Ledger page is where the running ledger for a customer, vendor or "
            "driver is viewed in Panther TMS. A party ledger is the live running record for "
            "one party: every invoice, payment, credit note, debit note, advance and TDS entry "
            "is posted to it, and the running balance shows what is owed at any moment. On "
            "this page you can check a billing client's outstanding balance, see how old the "
            "unpaid invoices are, check what is owed to a vendor, and check a driver's advance "
            "balance. The ledger is always scoped to the user's issuing office and role, so a "
            "user only sees the parties and offices they are allowed to see. Balances here are "
            "live data from the accounts, not estimates, and the chatbot reports them only "
            "from the real ledger."
        ),
        "route": "/accounts/master-ledger",
        "keywords": ["master ledger page", "ledger page", "party ledger", "outstanding balance", "what is this page", "khata page"],
    },
    {
        "doc_id": "tms-page-invoices",
        "title": "Transport invoices page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The transport invoices page is where freight invoices are raised from booked LRs "
            "in Panther TMS. A transport invoice bills the freight for one or more LRs to the "
            "billing client, and it must include the gross and charged weight, the GSTINs of "
            "the consignor and consignee, the vehicle registration number, the LR number, the "
            "SAC code 996511, the freight amount and rate, a declaration of reverse charge or "
            "forward charge, and the place of supply. Invoicing normally follows the POD: a "
            "clean POD triggers billing, and the rule is often no POD, no payment. Invoices "
            "above the e-invoicing turnover threshold are reported to the Invoice Registration "
            "Portal, which returns a 64-character IRN hash and a signed QR code printed on the "
            "invoice."
        ),
        "route": "/accounts/transport-invoice",
        "keywords": ["transport invoice page", "invoice page", "freight invoice", "billing page", "what is this page", "invoice screen"],
    },
    {
        "doc_id": "tms-page-tracking",
        "title": "Tracking pages what they are for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The tracking pages are where live vehicle and consignment positions are checked "
            "in Panther TMS. GPS tracking shows continuous live positions from a device fitted "
            "in the vehicle, accurate to about 10 to 20 metres and updated every 30 seconds to "
            "5 minutes. SIM tracking follows the driver's phone with consent, every 5 to 15 "
            "minutes at about 100 to 400 metres, and it is the best option for market vehicles "
            "with no GPS device. FASTag tracking shows toll-plaza crossings only, at plazas "
            "50 to 200 km apart, and it is independent validation rather than continuous "
            "tracking. Best practice is GPS primary, SIM fallback, and FASTag as the "
            "cross-check, and a GPS and FASTag route mismatch is treated as a tamper alert."
        ),
        "route": "/tracking/fastag",
        "keywords": ["tracking page", "live tracking", "gps tracking page", "sim tracking", "fastag tracking", "what is this page"],
    },
    {
        "doc_id": "tms-page-pod",
        "title": "POD Records page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The POD Records page is where proof of delivery is viewed and managed in Panther "
            "TMS. A POD is the documented confirmation that a shipment reached its recipient "
            "at the agreed place and time, with the date and time, the recipient's name, "
            "signature and stamp, the delivery location, the LR number, and the condition of "
            "the goods. On this page you can see which LRs still have a pending POD, check a "
            "POD that was uploaded, and verify the receiver's signature. A clean POD is what "
            "moves an LR to DELIVERED and triggers billing and payment, so pending PODs are "
            "the first thing to chase when payments are stuck. A POD is a signed auditable "
            "record, not a status update, a phone call, or a GPS ping."
        ),
        "route": "/transport/pod-records",
        "keywords": ["pod records page", "pod page", "proof of delivery page", "pending pod", "what is this page", "pod screen"],
    },
    {
        "doc_id": "tms-page-home",
        "title": "Home dashboard page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The home or dashboard page is the overview of the transport business in Panther "
            "TMS. It shows the headline numbers for the day and the branch: how many LRs were "
            "booked, how many vehicles are on the road, what is pending, and what needs "
            "attention, such as PODs waiting to come back or invoices waiting to be paid. It is "
            "an overview, not a working page: the work itself happens on the detail pages, "
            "LR Booking for consignments, Job Orders for customer orders, the Master Ledger "
            "for balances, and the tracking pages for live positions. If you are not sure where "
            "something lives, ask Parth AI what the page you are on does, or ask where a "
            "particular record, such as an LR or a driver, can be found."
        ),
        "route": "/dashboard",
        "keywords": ["dashboard", "home page", "home screen", "overview", "what is this page", "dashboard page"],
    },
    {
        "doc_id": "tms-page-how-bot-helps",
        "title": "What Parth AI can do on any page",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Parth AI is the TMS expert inside Panther TMS, and it works on every page. It "
            "can explain what the page you are on is for and what you can do on it, explain "
            "transport terms such as LR, e-way bill, POD, detention or TBB, guide you to the "
            "right form with its exact button labels, track an LR or a vehicle, show a job "
            "list, and check a ledger balance from the live records. It does not create LRs, "
            "jobs or hire challans from chat: for those it guides you to the form, for example "
            "the LR Booking page at /transport/lr-booking, where you click \"New LR Booking\" "
            "and save with \"Create Lorry Receipt\". It never invents a live fact: if a record "
            "is not found, it says so, and for anything outside its scope it offers the closest "
            "Panther alternative or a human through \"Talk to support\" (toll-free helpline: 1800 571 0683, email: support@panthertms.com)."
        ),
        "route": "",
        "keywords": ["what can you do", "parth ai", "help", "what can parth ai do", "panther ai", "bot help", "capabilities"],
    },
    # ------------------------------------------------------------------
    # ENUMS & SYSTEM CODES — ground-truth database enums in Panther TMS
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-enums-job-status",
        "title": "JobStatus lifecycle and valid states",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "JobStatus in Panther TMS tracks the commercial indent lifecycle for road transport jobs. "
            "There are six valid states: OPEN, BOOKED, DISPATCHED, DELIVERED, CLOSED, and CANCELLED. "
            "OPEN: The booking order is confirmed by the client, awaiting vehicle and driver placement. "
            "BOOKED: A vehicle and driver are allocated and an LR is linked to this indent. "
            "DISPATCHED: Goods are loaded on the vehicle and the truck has departed on the transit corridor. "
            "DELIVERED: The vehicle reached destination and delivered goods to the consignee. "
            "CLOSED: The trip is finished, POD verified, financial settlement completed, and billing archived. "
            "CANCELLED: The transport indent was cancelled before vehicle dispatch."
        ),
        "route": "/transport/job-orders",
        "keywords": ["job status", "jobstatus", "job lifecycle", "job states", "open", "dispatched", "closed", "cancelled"],
    },
    {
        "doc_id": "tms-enums-hire-challan-status",
        "title": "HireChallanStatus workflow and transitions",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "HireChallanStatus tracks third-party lorry hire contracts (Hire Challan / Lorry Hire Memo) "
            "in Panther TMS. It has six statuses: DRAFT, CONFIRMED, ISSUED, TRANSIT, SETTLED, and CANCELLED. "
            "DRAFT: The hire contract is created with vehicle, vendor, and route details but not locked. "
            "CONFIRMED: The agreed hire freight, TDS applicability under Section 194C, and advances are approved. "
            "ISSUED: The challan is handed over to the driver/vendor, and Advance To Hired (ATH diesel/cash) is released. "
            "TRANSIT: The hired vehicle is on the road carrying consignments. "
            "SETTLED: Delivery is completed, verified POD received, and final Balance To Hired (BTH) is paid "
            "after deducting diesel advances, cash advances, and TDS. "
            "CANCELLED: The hire memo was cancelled prior to trip dispatch."
        ),
        "route": "/transport/hire-challan",
        "keywords": ["hire challan status", "hirechallanstatus", "challan status", "settled", "ath", "bth", "hire challan workflow"],
    },
    {
        "doc_id": "tms-enums-pod",
        "title": "PODCondition and PODVerificationStatus",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Proof of Delivery (POD) records in Panther TMS use two core enums: PODCondition and "
            "PODVerificationStatus. PODCondition records cargo condition at delivery: OK (goods delivered intact, "
            "packages complete, seals untampered), DAMAGED (cargo has physical damage or broken packaging), and "
            "SHORTAGE (delivered package count is lower than booked package count on the LR). "
            "PODVerificationStatus tracks auditing of the signed delivery proof: PENDING (delivery receipt uploaded "
            "or documented, awaiting audit by branch/billing team), VERIFIED (signed and stamped delivery receipt confirmed "
            "authentic, which unlocks customer invoicing and vendor balance payment), and REJECTED (uploaded document "
            "was illegible, unverified, or rejected due to dispute)."
        ),
        "route": "/transport/pod-records",
        "keywords": ["pod status", "pod verification status", "pod condition", "ok", "damaged", "shortage", "verified", "pending", "rejected"],
    },
    {
        "doc_id": "tms-enums-tracking-modes",
        "title": "TrackingMode and SIMConsentStatus",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Shipment tracking in Panther TMS utilizes TrackingMode: FASTAG (toll-plaza passage pings from NPCI NETC "
            "with a 10-minute anti-spam cooldown, acting as independent route validation), GPS (high-precision live "
            "hardware telematics updated every 30 seconds to 5 minutes), and SIM (cellular triangulation via driver phone consent). "
            "For SIM tracking, SIMConsentStatus defines driver authorization: PENDING (consent request SMS dispatched to driver), "
            "ACCEPTED (driver replied YES, enabling automated periodic tracking pings), and REJECTED (driver denied consent or timed out)."
        ),
        "route": "/tracking/fastag",
        "keywords": ["tracking mode", "trackingmode", "fastag", "gps", "sim", "sim consent", "simconsentstatus"],
    },
    {
        "doc_id": "tms-enums-voucher-types",
        "title": "VoucherType double-entry classification",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "VoucherType defines accounting transactions in Panther TMS double-entry General Ledger: "
            "TRANSPORT_INVOICE (customer freight bill against booked LRs), GENERAL_INVOICE (non-freight commercial services "
            "such as demurrage, consulting, or warehouse storage), PROFORMA_INVOICE (provisional quotation with zero GL ledger impact), "
            "NORMAL_PURCHASE and GENERAL_PURCHASE (vendor bills for fuel, tyres, spares, lubricants), RECEIPT_VOUCHER (funds received "
            "from clients via bank/cash), PAYMENT_VOUCHER (supplier/vendor overhead payments), PAYMENT_ATH (Advance To Hired given at loading), "
            "PAYMENT_BTH (Balance To Hired settled on verified POD), CREDIT_NOTE and DEBIT_NOTE (statutory GST rate/amount adjustments), "
            "CONTRA_VOUCHER (cash deposit/withdrawal and bank-to-bank transfers), and JOURNAL_VOUCHER (rectifications and adjusting entries)."
        ),
        "route": "/accounts/master-ledger",
        "keywords": ["voucher types", "vouchertype", "transport invoice", "receipt voucher", "payment voucher", "contra", "journal", "ath", "bth"],
    },
    {
        "doc_id": "tms-enums-einvoice-status",
        "title": "EInvoiceStatus and IRN lifecycle",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "EInvoiceStatus tracks government Invoice Registration Portal (IRP) integration in Panther TMS. "
            "GENERATED: The invoice has been successfully reported to the GST NIC portal, receiving a unique 64-character "
            "Invoice Reference Number (IRN) and digitally signed QR code. CANCELLED: The IRN was voided within the statutory "
            "24-hour legal cancellation window on the government portal. FAILED: The invoice payload was rejected by NIC "
            "due to invalid GSTIN, HSN mismatch, or schema validation error."
        ),
        "route": "/einvoicing/generate-irn",
        "keywords": ["einvoice status", "e-invoice status", "irn status", "generated", "cancelled", "failed"],
    },

    # ------------------------------------------------------------------
    # FRONTEND PAGES & MODULES — what every page does and how to use it
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-page-accounts-overview",
        "title": "Accounts Module and Financial Overview",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Accounts module (/accounts) is the financial hub of Panther TMS. It handles Transport Invoices "
            "(/accounts/transport-invoice), General Invoices (/accounts/general-invoice), Proforma Invoices (/accounts/proforma-invoice), "
            "Normal Purchase (/accounts/normal-purchase), General Purchase (/accounts/general-purchase), Vouchers (Receipt, Payment, Contra, Journal), Credit/Debit Notes, "
            "Company Bank Accounts (/accounts/bank-accounts), and the Master Ledger (/accounts/master-ledger). "
            "All financial transactions post directly into double-entry accounts with real-time debit and credit tracking, "
            "reconciling freight receivables from billing clients and vehicle hiring liabilities to market vendors."
        ),
        "route": "/accounts",
        "keywords": ["accounts", "accounts page", "finance", "accounting", "ledger", "invoices", "vouchers", "what is this page"],
    },
    {
        "doc_id": "tms-page-general-invoice",
        "title": "General Invoice page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The General Invoice page (/accounts/general-invoice) is used to bill non-freight services, handling charges, "
            "demurrage, detention fees, warehouse leasing, or consulting charges to clients. Unlike Transport Invoices which "
            "require booked LRs, a General Invoice allows direct line-item billing with customizable GST categories (0%, 5%, 18%), "
            "SAC codes, party selection, posting directly to selected income ledgers and creating accounts receivable balances."
        ),
        "route": "/accounts/general-invoice",
        "keywords": ["general invoice", "general invoice page", "demurrage bill", "handling invoice", "consulting bill"],
    },
    {
        "doc_id": "tms-page-proforma-invoice",
        "title": "Proforma Invoice page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Proforma Invoice page (/accounts/proforma-invoice) creates provisional commercial quotations and estimates "
            "for prospective or existing clients before final shipment execution. Proforma invoices carry provisional line items, "
            "estimated tax, and quotation validity terms, but have ZERO impact on the General Ledger. Once approved, the proforma "
            "can be converted into a final GST Transport or General Invoice."
        ),
        "route": "/accounts/proforma-invoice",
        "keywords": ["proforma invoice", "proforma", "quotation", "commercial estimate", "proforma page"],
    },
    {
        "doc_id": "tms-page-normal-purchase",
        "title": "Normal Purchase page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Normal Purchase page (/accounts/normal-purchase) records supplier and vendor invoices for fleet operating expenses, "
            "such as fuel & diesel bills, tyre purchases, vehicle spare parts, workshop repair charges, and truck hire freight. "
            "It captures supplier GSTIN, invoice number, credit terms, and allocates expenses to specific vehicles or Hire Challans "
            "to track vehicle cost centres and claim Input Tax Credit (ITC)."
        ),
        "route": "/accounts/normal-purchase",
        "keywords": ["normal purchase", "purchase bill", "vendor invoice", "diesel bill", "spare parts bill", "truck hire purchase"],
    },
    {
        "doc_id": "tms-page-general-purchase",
        "title": "General Purchase page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The General Purchase page (/accounts/general-purchase) records corporate administrative overheads and operating expenses, "
            "such as office rent, legal and professional fees, software and cloud subscriptions, utilities, and office supplies. "
            "It allocates expenses directly to branch office cost centres without requiring vehicle associations."
        ),
        "route": "/accounts/general-purchase",
        "keywords": ["general purchase", "office rent", "stationery", "legal fees", "software subscription", "admin expense"],
    },
    {
        "doc_id": "tms-page-vouchers-overview",
        "title": "Vouchers Management in Panther TMS",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Vouchers in Panther TMS manage double-entry accounting transactions across four dedicated registers: "
            "Receipt Voucher (/accounts/receipt-voucher) records customer freight payments received against outstanding invoices. "
            "Payment Voucher (/accounts/payment-voucher) records payments disbursed to vendors, driver trip advances, and office expenses. "
            "Contra Voucher (/accounts/contra-voucher) records bank-to-bank transfers, cash deposits, and cash withdrawals. "
            "Journal Voucher (/accounts/journal-voucher) records period-end adjustments, TDS provisions, depreciation, and inter-branch adjustments."
        ),
        "route": "/accounts/receipt-voucher",
        "keywords": ["receipt voucher", "payment voucher", "contra voucher", "journal voucher", "vouchers", "double entry"],
    },
    {
        "doc_id": "tms-page-master-ledger",
        "title": "Master Ledger page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Master Ledger page (/accounts/master-ledger) displays running double-entry accounts for all clients, vendors, "
            "drivers, banks, cash, and tax heads in Panther TMS. You can select any party account to inspect historical debits, "
            "credits, running balances, opening balances, and linked transaction references (LRs, Invoices, Vouchers). "
            "Ledger balances can be filtered by date range and branch, or exported to Excel/PDF for account reconciliation."
        ),
        "route": "/accounts/master-ledger",
        "keywords": ["master ledger", "ledger page", "party ledger", "khata", "outstanding balance", "account balance", "debit credit"],
    },
    {
        "doc_id": "tms-page-bank-accounts",
        "title": "Company Bank Accounts page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Company Bank Accounts page (/accounts/bank-accounts) configures enterprise bank and cash accounts in Panther TMS. "
            "It records bank name, account number, IFSC code, branch name, account type (Current, Savings, Overdraft/OD, Cash), "
            "and opening balances. Configured bank accounts populate payment and receipt voucher dropdowns and invoice print footers."
        ),
        "route": "/accounts/bank-accounts",
        "keywords": ["bank accounts", "company bank accounts", "bank master", "ifsc", "current account", "bank page"],
    },
    {
        "doc_id": "tms-page-credit-debit-notes",
        "title": "Credit and Debit Notes page what it is for",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Credit & Debit Notes page (/accounts/credit-debit-notes) handles statutory GST commercial adjustments against issued invoices. "
            "A Credit Note is issued to a customer to reduce taxable freight (e.g. for damage claims, rate revisions, or short delivery). "
            "A Debit Note is issued to increase invoice value or issued to vendors for penalties, shortages, or detention charges."
        ),
        "route": "/accounts/credit-debit-notes",
        "keywords": ["credit note", "debit note", "credit debit notes", "rate revision", "shortage claim", "gst adjustment"],
    },
    {
        "doc_id": "tms-page-einvoicing-overview",
        "title": "E-Invoicing Module and IRN Generation",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The E-Invoicing module (/einvoicing) integrates directly with the government NIC Invoice Registration Portal (IRP). "
            "Generate IRN (/einvoicing/generate-irn) converts approved transport and general B2B invoices into e-invoices with a "
            "64-character hash (IRN) and cryptographically signed QR code. IRN List (/einvoicing/irn-list) displays all registered "
            "e-invoices. Cancel IRN (/einvoicing/cancel-irn) allows cancelling an IRN within the legal 24-hour statutory window. "
            "Taxpayer Search (/einvoicing/taxpayer) verifies client or vendor GSTIN status, trade name, and filing state in real-time."
        ),
        "route": "/einvoicing/generate-irn",
        "keywords": ["einvoicing", "e-invoicing", "generate irn", "irn list", "cancel irn", "taxpayer search", "nic portal"],
    },
    {
        "doc_id": "tms-page-fleet-overview",
        "title": "Fleet Management and Vehicle Health",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Fleet module manages internal vehicle lifecycle and maintenance in Panther TMS. "
            "Vehicle Health (/fleet/vehicle-health) tracks engine, battery, chassis, and fitness inspections. "
            "Tyre Management (/fleet/tyre) monitors tyre serial numbers, tread depth, and axle rotation (steer, drive, trailer). "
            "Service & Repairs (/fleet/service) logs workshop maintenance and part replacements. "
            "Vehicle Documents (/fleet/documents) tracks statutory expiry dates for Insurance, Fitness, National Permit, and PUC. "
            "Trip Advance (/fleet/trip-advance) & Trip Expenses (/fleet/trip-expense) log en-route diesel and toll costs, "
            "while Truck P&L (/fleet/truck-pnl) reconciles per-vehicle operating revenues vs fuel, maintenance, and driver costs."
        ),
        "route": "/fleet/vehicle-health",
        "keywords": ["fleet", "fleet management", "vehicle health", "tyre management", "service repairs", "truck pnl", "fleet page"],
    },
    {
        "doc_id": "tms-page-reports-overview",
        "title": "Financial Reports and Profit & Loss",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Reports module provides executive financial intelligence: Profit & Loss (/reports/profit-loss) summarizes "
            "freight operating revenue against trip hiring, direct diesel, and overhead costs. Balance Sheet (/reports/balance-sheet) "
            "reflects company capital, bank balances, fixed fleet assets, and trade liabilities. Trial Balance (/reports/trial-balance) "
            "validates double-entry debit/credit ledger equality. Daybook (/reports/daybook) audits all chronological vouchers logged "
            "across branches for any selected date. Bank Reconciliation (/reports/bank-reconciliation) aligns bank statements with TMS ledger records."
        ),
        "route": "/reports/profit-loss",
        "keywords": ["reports", "financial reports", "profit loss", "pnl", "balance sheet", "trial balance", "daybook", "bank reconciliation"],
    },
    {
        "doc_id": "tms-page-statements-overview",
        "title": "Statements and Statutory Tax Compliance",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Statements module handles accounts receivable/payable aging and statutory taxation compliance: "
            "Outstanding Debtors (/statements/os-debtor) tracks unpaid freight invoices grouped by billing client and aging bucket (0-30, 31-60, 60+ days). "
            "Outstanding Creditors (/statements/os-creditor) lists pending liabilities to truck owners and fuel vendors. "
            "GST Output (/statements/gst-output) and GST Input (/statements/gst-input) prepare monthly GSTR-1 and GSTR-3B freight summaries. "
            "TDS Payable (/statements/tds-payable) & TDS Return (/statements/tds-return) audit Section 194C contractor withholding deductions."
        ),
        "route": "/statements/os-debtor",
        "keywords": ["statements", "outstanding debtors", "outstanding creditors", "os debtor", "os creditor", "gst return", "tds payable"],
    },
    {
        "doc_id": "tms-page-transport-reports-overview",
        "title": "Transport Operations Reports and Registers",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Transport Reports (/transport-reports) provide comprehensive operational registers for logistics auditing: "
            "LR Register (/transport-reports/lr-register) exports master consignment booking records with route, weight, and status. "
            "Invoice Register (/transport-reports/invoice-register) audits all raised freight invoices. "
            "Hire Challan Register (/transport-reports/hc-register) and Pending HC Report (/transport-reports/pending-hc) track trip memos "
            "and unsettled lorry hire balances. Unbilled LRs (/transport-reports/unbilled) flags completed deliveries awaiting customer freight billing. "
            "Arrival Register (/transport-reports/arrival-register) logs destination hub vehicle unloadings. Unused Series (/transport-reports/unused-series) "
            "audits gaps in pre-allocated LR and Challan serial numbers."
        ),
        "route": "/transport-reports/lr-register",
        "keywords": ["transport reports", "lr register", "invoice register", "hc register", "pending hc", "unbilled lr", "arrival register"],
    },
    {
        "doc_id": "tms-page-company-masters",
        "title": "Company Masters, Branches and RBAC",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Company module manages enterprise hierarchy and security: Branches (/company/branches) configures hub offices, "
            "booking branches, and transit delivery terminals with local GSTIN and series allocations. Users (/company/users) "
            "and Roles & Permissions (/company/roles) implement strict multi-tenant Role-Based Access Control (RBAC), restricting "
            "branch managers, accountants, and dispatchers to authorized modules and issuing office scopes. Company Details (/company/details) "
            "records company legal name, PAN, CIN, and registered address."
        ),
        "route": "/company/branches",
        "keywords": ["company branches", "branch master", "users", "roles", "rbac", "permissions", "company settings"],
    },

    # ------------------------------------------------------------------
    # MAJOR LOGISTICS WORKFLOWS — step-by-step operating procedures
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-workflow-vehicle-master",
        "title": "Vehicle Master Workflow Company vs Market",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Panther TMS distinguishes between Company Vehicles (/transport/company-vehicles) and Market Vehicles (/transport/market-vehicles). "
            "Company Vehicles are owned or leased by the enterprise; they require registration plate, chassis number, engine number, "
            "gross vehicle weight, unladen weight, carrying capacity (MT), and statutory document renewals (RC, Fitness Certificate, "
            "National Goods Permit, Comprehensive Insurance, and 6-month PUC). "
            "Market Vehicles are third-party hired trucks booked for single trips or spot contracts; they are mapped to a registered "
            "Vehicle Owner / Transporter Broker (/transport/vehicle-owners) and driver, requiring PAN verification to avoid double-taxation."
        ),
        "route": "/transport/company-vehicles",
        "keywords": ["vehicle master", "company vehicle", "market vehicle", "vehicle owner", "rc", "fitness", "national permit", "puc"],
    },
    {
        "doc_id": "tms-workflow-driver-master",
        "title": "Driver Master and Commercial Compliance",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Driver Master (/transport/drivers) maintains verified profiles of commercial vehicle drivers. "
            "Essential compliance fields include Driver Full Name, Commercial Driving License (DL) Number with validity date, "
            "Mobile Phone Number (used for SIM tracking dispatch and trip communication), Aadhaar Number, and Father's Name. "
            "A valid commercial driving licence is legally mandatory for transport operations under the Motor Vehicles Act. "
            "In Panther TMS, assigning a driver to a Hire Challan or LR verifies active status and links the driver's phone for telematics."
        ),
        "route": "/transport/drivers",
        "keywords": ["driver master", "driver profile", "driving license", "dl", "driver phone", "commercial license"],
    },
    {
        "doc_id": "tms-workflow-hire-challan",
        "title": "Hire Challan and Lorry Hire Memo Flow",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The Hire Challan workflow (/transport/hire-challan) formalizes the truck hiring agreement between the logistics operator "
            "and a vehicle vendor/broker: 1. Specify Origin Hub, Destination Hub, Market Vehicle, Vendor, and Driver. "
            "2. Agree on total hiring freight rate (e.g. ₹45,000). 3. Disburse Advance To Hired (ATH): specify Diesel Advance coupon "
            "and Cash Advance handed to the driver at loading. 4. Deduct statutory TDS under Section 194C (1% for individual/HUF owners, "
            "2% for corporate transporters with valid PAN; exempt under 194C(6) if owner declares owning 10 or fewer trucks). "
            "5. The remaining balance (Balance To Hired / BTH) is payable at destination hub only after receiver signs the POD."
        ),
        "route": "/transport/hire-challan",
        "keywords": ["hire challan flow", "lorry hire memo", "ath", "bth", "diesel advance", "cash advance", "tds 194c", "hire settlement"],
    },
    {
        "doc_id": "tms-workflow-job-trip",
        "title": "Job Indent to Delivery Lifecycle",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "The complete shipment lifecycle in Panther TMS follows five structured phases: "
            "1. Booking Indent (/transport/job-orders): Customer places an indent specifying route, cargo, packages, and weight. "
            "2. Placement & LR Booking (/transport/lr-booking): Vehicle is assigned, e-way bill entered, and LR is generated. "
            "3. Dispatch & Challan (/transport/hire-challan): Market truck memo is issued with loading advances, and truck departs (IN_TRANSIT). "
            "4. Transit Tracking (/tracking/fastag & /tracking/sim): Trip progress monitored via toll crossings and telematics. "
            "5. Delivery & Invoicing: Vehicle arrives at destination, receiver inspects cargo, signs the POD (/transport/pod-records), "
            "closing the LR to DELIVERED, unlocking customer Freight Invoicing (/accounts/transport-invoice), and settling vendor balance."
        ),
        "route": "/transport/job-orders",
        "keywords": ["job lifecycle", "trip lifecycle", "indent to delivery", "shipment workflow", "lr booking flow"],
    },
    {
        "doc_id": "tms-workflow-freight-payment-terms",
        "title": "Freight Terms Paid To-Pay TBB and GST Rules",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Freight payment terms in road logistics define who pays for the transport and when: "
            "1. PAID: Consignor settles the freight charge at the time of booking. "
            "2. TO PAY: Consignee is legally responsible to pay the entire freight charge at destination before cargo is offloaded. "
            "3. TO BE BILLED (TBB): Freight is charged to an approved corporate Billing Client account with credit terms (e.g. 30 days) "
            "and billed via formal GST Transport Invoice upon delivery verification. "
            "Under Indian GST law, road transportation of goods by a Goods Transport Agency (GTA) falls under SAC 996511. "
            "Default rate is 5% Reverse Charge Mechanism (RCM) where recipient pays GST; or 18% Forward Charge Mechanism (FCM) "
            "where the GTA charges GST with Input Tax Credit (ITC) entitlement from 22 September 2025."
        ),
        "route": "/transport/lr-booking",
        "keywords": ["freight terms", "paid", "to pay", "to be billed", "tbb", "sac 996511", "gta", "rcm", "fcm", "gst transport"],
    },
    # ------------------------------------------------------------------
    # tms-consignment-360 — End-to-end traceability, search, lifecycle & P&L
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-consignment-360",
        "title": "Consignment 360° Traceability and Search",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Consignment 360° Traceability (/transport/consignment-360) is Panther TMS's unified "
            "investigation and audit dashboard. Located under the Home menu and navigation bar, it allows users "
            "to search any LR number (e.g. LR-26110085), Job Order number (e.g. JOB-0211), or Hire Challan number "
            "to instantly see the full operational, legal, and financial journey of a consignment. "
            "Key capabilities include: "
            "1. Consignment 8-Stage Lifecycle: Visual step-by-step progress tracking across 8 distinct phases: "
            "(1) Job Order & Cargo Indent, (2) LR Consignment Booking, (3) Lorry Hire Contract (Hire Challan), "
            "(4) Dispatch & Transit Movement, (5) Destination Hub Unloading, (6) Proof of Delivery (POD), "
            "(7) Customer Freight Invoicing, and (8) Payment & Margin Settlement. "
            "2. Operational Document Details: Displays shipper/consignor, consignee, billing client, cargo details, "
            "weight/packages, assigned vehicle, driver, and e-way bill number. "
            "3. Instant Print Previews: Direct action buttons allow operators to open official print previews for "
            "the Lorry Receipt (Open LR), Job Order (Open Job), Hire Challan (Open Hire Challan), and GST Transport Invoice (Open Invoice) "
            "without having to navigate across multiple screens. "
            "4. Gross Profit Margin & P&L: Automatically reconciles customer freight revenue against vehicle hiring costs "
            "(base hire, diesel advance, cash advance, balance payable) and direct trip expenses to calculate exact gross profit and profit margin percentage. "
            "5. Ledger Account Audit: Shows linked accounting vouchers including customer freight sales bills, incoming receipts, "
            "vendor lorry hire purchase vouchers, and supplier payment settlements."
        ),
        "route": "/transport/consignment-360",
        "keywords": [
            "consignment 360", "traceability", "trace 360", "search lr", "search job", "consignment lifecycle",
            "lr search", "job search", "gross profit", "profit margin", "print preview lr", "print preview job",
            "print preview hire challan", "pnl", "360", "trace", "life cycle",
        ],
    },
    {
        "doc_id": "tms-consignment-lifecycle-stages",
        "title": "Consignment 8-Stage Lifecycle in Panther TMS",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Every road consignment in Panther TMS transitions through 8 operational and financial lifecycle stages: "
            "Stage 1 - Job Order & Cargo Indent: Pre-booking customer requirement capturing shipper, consignee, cargo particulars, and scheduled date. "
            "Stage 2 - LR Consignment Booking: Issuance of legal Lorry Receipt (LR/GR) allocating series number, vehicle plate, packages, and freight terms. "
            "Stage 3 - Lorry Hire Contract: Issuing Hire Challan (Lorry Hire Memo) for third-party market trucks with agreed freight, diesel/cash advances, and unloading balance. "
            "Stage 4 - Dispatch & Transit Movement: Vehicle dispatch on road with e-way bill compliance and telematics tracking (GPS, FASTag, or SIM). "
            "Stage 5 - Destination Hub Unloading: Vehicle arrival logged at destination terminal, verifying cargo seals and package integrity against arrival report. "
            "Stage 6 - Proof of Delivery (POD): Physical consignee acknowledgement stamped and signed; verified POD unlocks customer invoicing. "
            "Stage 7 - Customer Freight Invoicing: GST Transport Sales Invoice generated with SAC 996511 and IRN e-invoicing. "
            "Stage 8 - Payment & Margin Settlement: Final customer payment collection and vendor balance payout, closing the financial file."
        ),
        "route": "/transport/consignment-360",
        "keywords": [
            "consignment lifecycle", "8 stages", "lifecycle stages", "consignment 360 stages", "job to invoice",
            "transport workflow", "indent to payment",
        ],
    },
    # ------------------------------------------------------------------
    # tms-email-settings — Outbound SMTP Gateway & Staff Alert Recipients
    # ------------------------------------------------------------------
    {
        "doc_id": "tms-email-settings",
        "title": "Email Settings & Staff Notification Recipients",
        "category": "general",
        "min_plan_tier": 1,
        "source_file": "backend/app/modules/ai/tms_knowledge.py",
        "version": "2026.1",
        "content": (
            "Email Settings (/settings/email-settings) in the Settings module allows company administrators "
            "to configure outbound SMTP parameters and manage staff notification recipient routing. "
            "Key features include: "
            "1. Outbound SMTP Gateway: Configure the company's sender email address, sender display name, "
            "SMTP host server (e.g. smtp.gmail.com, smtp.office365.com), port (587 for TLS, 465 for SSL), "
            "and SMTP username/password. This gateway is used to send official transport documents "
            "(Lorry Receipts, GST Invoices, Proof of Delivery, and Hire Challans) directly to clients and transporters. "
            "2. Test Connection: Verify email configuration in real time by dispatching a verification test email "
            "to any designated address. "
            "3. Staff Notification Recipients: Register internal staff members, branch managers, and department heads "
            "(Operations, Accounts, Dispatch, Billing, Management) who automatically receive operational copies "
            "when consignments are booked, invoices raised, or deliveries confirmed. "
            "Staff members can be subscribed to specific alert topics including LR Booking, Job Orders, "
            "Hire Challan, Transport Invoicing, POD Delivery, and Daily Operations Digest."
        ),
        "route": "/settings/email-settings",
        "keywords": [
            "email setting", "email settings", "smtp", "smtp server", "email port", "sender email",
            "from email", "staff email", "notification email", "email alert", "send test email",
            "staff recipient", "email configuration",
        ],
    },
]


# ----------------------------------------------------------------------
# Logistics glossary — seeded definitions in our own words, for the user
# to extend in this file. Official sources for the GST / e-way bill rules:
# e-way bill portal: https://ewaybillgst.gov.in
# GST portal: https://www.gst.gov.in
# Sourcing rule (v3): official sources only for rules; verified Panther files
# for Panther behaviour; general logistics concepts written here in our own
# words. Do NOT scrape random web pages into RAG — they conflict.
# ----------------------------------------------------------------------
TMS_GLOSSARY = {
    "LR / GR / Bilty": "Lorry Receipt / Goods Receipt (बिल्टी): The legal contract of carriage and receipt issued by the transporter upon taking custody of goods; the central tracking and billing key for the consignment.",
    "बिल्टी / Bilty": "ट्रांसपोर्टर द्वारा माल प्राप्त करने पर जारी किया जाने वाला आधिकारिक दस्तावेज (Lorry Receipt / LR), जो माल का कानूनी प्रमाण और अनुबंध होता है।",
    "FTL": "Full Truck Load: One consignor books the entire vehicle for a dedicated point-to-point trip with a flat freight rate.",
    "LTL / PTL": "Less Than Truckload / Part Load (पार्ट लोड): Multiple consignors share vehicle cargo space through hub-and-spoke transit networks.",
    "Job / Job Order": "Job / Trip Order (जॉब ऑर्डर): Commercial booking confirmation representing customer demand before vehicle placement and LR generation.",
    "जॉब / Job Order": "ग्राहक द्वारा माल भेजने का प्रारंभिक आर्डर (Job/Trip indent), जिसके आधार पर गाड़ी लगाई जाती है और बिल्टी बनाई जाती है।",
    "POD / Proof of Delivery": "Proof of Delivery (डिलीवरी प्रमाण / पावती): Documented signed and stamped acknowledgment from the consignee confirming safe receipt of cargo with date, time, and package condition. Clean POD is mandatory for billing.",
    "पॉड / डिलीवरी प्रमाण": "माल मिलने पर कंसाइनी द्वारा हस्ताक्षरित और मुहरबंद रसीद (Proof of Delivery), जिसके सत्यापन के बाद ही मालभाड़ा बिलिंग और भुगतान होता है।",
    "Detention / डिटेन्शन": "Detention (रोक / विलंब शुल्क): Monetary penalty charged per hour/day when a truck is detained beyond agreed free loading/unloading time (usually 1-2 hours).",
    "डिटेन्शन / रोक शुल्क": "लोडिंग या अनलोडिंग पॉइंट पर तय समय (फ्री टाइम) से ज्यादा गाड़ी रोके रखने पर ट्रांसपोर्टर द्वारा लिया जाने वाला जुर्माना।",
    "Demurrage / डेमरेज": "Demurrage: Daily storage penalty levied on loaded cargo/containers held at terminal, warehouse, or rail siding beyond allowed free days.",
    "Manifest": "The official trip document listing all individual consignments (LRs) carried together on a single vehicle transit corridor.",
    "Hire Challan / Lorry Hire Memo": "Hire Challan (गाड़ी चालान): The contracted agreement issued to market vehicle owners/drivers detailing agreed freight, diesel advance, cash advance, and destination balance.",
    "चालान / हायर चालान": "बाजार से किराए पर ली गई गाड़ी (Market Truck) के मालिक/ड्राइवर को दिया जाने वाला रसीदी अनुबंध, जिसमें तय भाड़ा, डीजल पेशगी और बकाया लिखा होता है।",
    "E-way bill Part A": "Commercial details of the GST e-way bill: GSTINs of supplier and recipient, dispatch/delivery PIN codes, invoice/challan number and date, HSN, and value.",
    "E-way bill Part B": "Transport details of the GST e-way bill: vehicle registration number or Transporter ID. The statutory validity countdown begins only after Part B is updated.",
    "ई-वे बिल / E-Way Bill": "जीएसटी नियमों के तहत ₹50,000 से अधिक मूल्य के माल परिवहन के लिए सरकारी पोर्टल पर बनने वाला कानूनी परमिट (EWB-01)।",
    "IRN / E-Invoice": "Invoice Reference Number: A unique 64-character cryptographic hash generated on the NIC Invoice Registration Portal for B2B invoices, printed with a signed QR code.",
    "ई-इनवॉइस / IRN": "सरकार के एनआईसी पोर्टल से बी2बी इनवॉइस के लिए जनरेट होने वाला 64-डिजिट का यूनिक इनवॉइस रेफरेंस नंबर और डिजिटल क्यूआर कोड।",
    "FASTag / फास्टैग": "Windscreen-mounted RFID tag linked to prepaid toll wallet; provides automatic plaza passage timestamps used as independent checkpoint verification.",
    "फास्टैग / FASTag": "गाड़ी के विंडशील्ड पर लगा आरएफआईडी टैग, जिससे टोल प्लाजा क्रॉसिंग का समय और स्थान दर्ज होता है।",
    "SIM Tracking / सिम ट्रैकिंग": "Consent-driven cellular cell-tower triangulation of driver phone (Freight Tiger/telco gateway) for tracking market trucks without hardware GPS.",
    "सिम ट्रैकिंग": "ड्राइवर के मोबाइल फोन से एसएमएस सहमति लेकर मोबाइल टावर के आधार पर गाड़ी की लोकेशन ट्रैक करने की तकनीक।",
    "GPS Tracking / जीपीएस": "Hardware telematics unit installed inside the vehicle providing real-time live latitude/longitude coordinates every 30 seconds to 5 minutes.",
    "जीपीएस / GPS": "गाड़ी में लगे हार्डवेयर डिवाइस द्वारा लाइव उपग्रह लोकेशन, स्पीड और रूट की निरंतर ट्रैकिंग।",
    "TBB / To Be Billed": "To Be Billed (टीबीबी): Freight payment term where the transport charges are billed later to an approved corporate Billing Client account on credit terms.",
    "टीबीबी / TBB": "मालभाड़ा भुगतान की वह शर्त जिसमें भाड़ा तुरंत नहीं लिया जाता, बल्कि बाद में बिलिंग पार्टी को इनवॉइस भेजकर तय क्रेडिट दिनों में लिया जाता है।",
    "To Pay / टू-पे": "To Pay: Freight payment term where the consignee (receiver) must pay full freight charges at destination terminal before unloading goods.",
    "टू-पे / To Pay": "भाड़ा भुगतान की शर्त जहां माल पहुंचने पर डिलीवरी से पहले पाने वाले (Consignee) द्वारा पूरा भाड़ा चुकाया जाता है।",
    "Paid / पेड": "Paid: Freight payment term where the consignor (sender) settles full freight charges at the time of booking at the origin branch.",
    "पेड / Paid": "भाड़ा भुगतान की शर्त जहां माल की बुकिंग के समय भेजने वाले (Consignor) द्वारा पूरा भाड़ा पहले ही जमा कर दिया जाता है।",
    "Master Ledger / खाता": "Master Ledger: Double-entry running balance statement for clients, vendors, drivers, and bank accounts showing chronological debits, credits, and net balance.",
    "खाता / लेजर / Master Ledger": "ग्राहक, वेंडर, ड्राइवर या बैंक का संपूर्ण वित्तीय बहीखाता, जिसमें सभी डेबिट, क्रेडिट और बकाया बैलेंस का हिसाब होता है।",
    "Advance (ATH) / पेशगी": "Advance To Hired (अग्रिम भाड़ा): Cash or fuel/diesel advance given to the hired truck driver at the time of loading to cover trip en-route expenses.",
    "TDS (Section 194C)": "Tax Deducted at Source on freight payments to contractors: 1% for Individual/HUF vehicle owners, 2% for Corporate transporters with valid PAN; exempt under Section 194C(6) for owners of 10 or fewer trucks submitting a PAN declaration.",
    "टीडीएस / TDS (धारा 194C)": "ट्रांसपोर्टर/गाड़ी मालिक को भाड़ा देते समय काटा जाने वाला आयकर: व्यक्तिगत मालिक पर 1%, कंपनी पर 2%, और 10 या कम गाड़ी वाले मालिकों के लिए डिक्लेरेशन पर छूट।",
    "Consigner / कंसाइनर": "Consignor / Shipper (कंसाइनर): The party sending the goods from the origin loading location.",
    "Consignee / कंसाइनी": "Consignee / Receiver (कंसाइनी): The party to whom the goods are delivered at the destination terminal.",
    "Billing Client / बिलिंग क्लाइंट": "The commercial corporate customer to whom freight invoices are debited and billed under agreed contract terms.",
    "Arrival Report / अराइवल": "The destination terminal log registering the arrival of a vehicle, verifying seals, and recording physical package counts against the LR manifest.",
    "गाड़ी / Vehicle": "ट्रांसपोर्ट में माल ढोने वाला ट्रक या ट्रेलर (कंपनी का अपना या बाजार से किराए पर लिया हुआ वाहन)।",
    "ड्राइवर / Driver": "वाणिज्यिक वाहन चलाने वाला अधिकृत चालक जिसके पास वैध कमर्शियल ड्राइविंग लाइसेंस (DL) होता है।",
    "भाड़ा / Freight": "सड़क परिवहन द्वारा माल एक जगह से दूसरी जगह ले जाने का तय किया गया सेवा शुल्क या किराया।",
}
