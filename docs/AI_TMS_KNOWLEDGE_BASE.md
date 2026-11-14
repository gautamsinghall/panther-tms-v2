# PantherTMS AI Knowledge Base (v3 — base glossary + page/workflow docs)

Base glossary drafted by Claude (received 13 Nov 2026), completed and corrected
for v3. Parsed by `backend/app/modules/ai/rag.py` (`load_and_index()`): every
`## ` heading starts a new chunk; the metadata bullets below each heading set
the chunk's Document ID, Category, Minimum Plan Tier, Keywords (and Route
where given). `###` sub-headings stay inside their section's chunk.

Sourcing rule (v3): official sources only for rules (GST / e-way bill —
https://www.gst.gov.in and https://ewaybillgst.gov.in), verified Panther
files for Panther behaviour, general logistics concepts written here in our
own words. Do NOT scrape random web pages into RAG — they conflict.



## What is an LR (Lorry Receipt), GR and Bilty
- **Document ID**: `glossary-lr-gr-bilty`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `lr, gr, bilty, lorry receipt, goods receipt, consignment note, cn, builty, bilti, lr kya hai, what is lr, why lr`

An LR (Lorry Receipt) is the main transport document issued by the transporter when goods are handed over for carriage. GR (Goods Receipt), Bilty/Builty and Consignment Note (CN) are the same thing under different names in different regions and industries.
### What it does
- It is the contract of carriage between the sender (consignor) and the transporter.
- It is a receipt: the transporter confirms it took the stated goods and packages.
- It is the reference for tracking, delivery, claims and billing. The freight invoice is raised against LRs.
- The consignee (receiver) usually needs it to take delivery.
### What it normally contains
LR number (from a series), date, consignor, consignee, origin, destination, vehicle number, driver, number of packages, packing method, description of goods, actual and charged weight, invoice number/value, e-way bill number, payment terms (To Pay / Paid / To Be Billed), and remarks.
### Why a transporter makes one LR per consignment
Each LR is one consignor-to-consignee movement. One truck can carry several LRs (part-load, many consignees). One LR can be linked to one or more invoices of the consignor.
### Panther form note (Create LR, /transport/lr-booking)
On Panther's Create LR form the required fields are Booking Status, Dispatch Date, Payment Type, Origin Hub, Destination Hub, Consignor, Consignee, Truck No., and No. of Packages. There is no standalone cargo description field — cargo goes in the invoice-line Particulars — and no LR Date field: the only date is the Dispatch Date. The form has no freight amount fields; only the Payment Type is captured. In Panther an LR moves through the status flow BOOKED, then IN_TRANSIT, then DELIVERED.

## Consignor, Consignee and Billing Party
- **Document ID**: `glossary-parties`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `consignor, consigner, consignee, billing party, billing client, sender, receiver, party, bill to, ship to, kaun pay karta hai`

- Consignor / Consigner: the party sending the goods (pickup/loading party).
- Consignee: the party receiving the goods (delivery party).
- Billing party / Billing Client: the party who is invoiced for freight. It is often the consignor, sometimes the consignee, sometimes a third party (a head office, a trader). It is not always the same as consignor or consignee.
- Panther spellings: the app uses "Consigner" in many places and "Consignor" in the Create LR form. They mean the same thing.

## Payment terms: To Pay, Paid, To Be Billed (TBB)
- **Document ID**: `glossary-payment-terms`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `to pay, topay, paid, tbb, to be billed, payment type, freight payment, who pays freight, credit, cash`

- To Pay: the consignee pays the freight at delivery. The transporter collects it from the consignee.
- Paid: the consignor has paid freight at booking.
- To Be Billed (TBB): no cash at booking or delivery. The freight is added to the billing party's account and invoiced later (usually monthly or per bill) on credit terms. TBB is the common choice for regular corporate customers.
- Why it matters: payment type decides who owes money, which ledger the freight lands in, and whether POD or payment is chased before billing.

## FTL, LTL and part-load
- **Document ID**: `glossary-ftl-ltl`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `ftl, ltl, part load, part-load, full truck load, less than truckload, full load, ptl, ftl vs ltl, ftl vs ptl`

FTL (Full Truck Load) means one shipper books the whole vehicle for one consignment. The truck goes direct from loading point to delivery point with no other shipper's goods on board, and the freight is a flat rate for the route rather than a rate per kilo or per package. FTL is the fastest option because there is no hub handling and no waiting for other loads, and it is the safest for the goods because they are not loaded and unloaded several times. It is the most expensive per kilo when the load does not fill the truck.
LTL (Less Than Truckload), also called PTL (Part Load), means several shippers share one vehicle. Their consignments are collected, taken to a hub, sorted, and sent onward together — the hub-and-spoke model. PTL is cheaper than FTL because the cost of the vehicle is split between the shippers, but it is slower, typically by 1 to 3 days, because of the hub halt and the extra loading and unloading, and the goods are handled more often, which raises the damage risk.
Each shipper still gets their own LR, and one trip can carry several PTL LRs. PTL is the right choice for a small consignment that does not fill a truck and is not in a hurry; FTL is the right choice for a full load or an urgent one. An FTL movement is normally one LR, one trip, and one vehicle.

## What is a POD (Proof of Delivery)
- **Document ID**: `glossary-pod`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `pod, proof of delivery, epod, e-pod, delivery proof, signed pod, what is pod, pod kya hai`

A POD (Proof of Delivery) is the documented confirmation that a shipment reached its recipient at the agreed place and time. A proper POD records the date and time of delivery, the recipient's name, signature and stamp, the delivery location, the LR number, and the condition of the goods. An electronic POD (ePOD) adds a timestamp, GPS location and a photo of the delivered goods or the signed acknowledgement. The signed LR driver copy returned after delivery is the classic paper POD. In Panther TMS the POD is what moves an LR to DELIVERED and unlocks billing: until the POD is recorded, the consignment is not treated as delivered, however close the vehicle got to the destination.
### POD triggers billing and payment
A clean POD triggers billing and payment, and in practice the rule is often "no POD, no payment". The billing client will not pay freight until there is signed proof the goods were actually delivered, so an LR without a POD cannot be invoiced with confidence even though the vehicle has returned. Paper PODs change hands four or more times and can take days to come back from the driver, which is why POD delays block payments and why electronic PODs matter: an ePOD with timestamp, GPS and photo lands in minutes instead of days.

## POD vs a delivery status update
- **Document ID**: `glossary-pod-vs-status`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `pod vs status, pod difference, delivery status, gps ping, pod evidence, status update`

A POD is not the same as a delivery status update, a phone call, or a GPS ping. A status update says the vehicle is near the destination or the LR is marked delivered in a system; a phone call is one person telling another that the goods arrived; a GPS ping only proves the vehicle was at a place at a time. None of those is an auditable record signed by the receiver. A POD is the signed, auditable record: who received the goods, when, where, under which LR number, and in what condition. That is why customers and auditors accept a POD as evidence and do not accept a status message as evidence. If the receiver refuses to sign, or signs with a remark about damage or shortage, that remark is part of the POD and must be recorded, not smoothed over.

## Detention and demurrage
- **Document ID**: `glossary-detention-demurrage`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `detention, demurrage, detention charges, demurrage charges, free time, detention vs demurrage, holding charges`

Detention and demurrage are both charges for holding up equipment, but they apply in different places. Detention is the fee for a truck held beyond the free time, usually 1 to 2 hours, at loading or unloading: the vehicle and driver are waiting instead of earning, so the party causing the delay pays per hour. Demurrage is the daily fee for a loaded container sitting at a port or terminal beyond its free days, typically 2 to 7 days: the container is occupying terminal space instead of moving. Detention is about the truck at a factory or warehouse; demurrage is about the container at a port or terminal. Both should be agreed in advance, with the free time and the rate written down, because both are common causes of billing disputes after the trip.

## What is a manifest
- **Document ID**: `glossary-manifest`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `manifest, trip manifest, load manifest, consignment list, vehicle manifest`

A manifest is the list of all consignments (LRs) carried on one vehicle on one trip. It names each LR, its consignor and consignee, its origin and destination, and its packages and weight, so that anyone checking the vehicle — at loading, at a checkpoint, or at unloading — can verify what the truck is supposed to be carrying. One trip has one manifest; one LR appears on the manifest of the trip that carries it. If a consignment is on the truck but not on the manifest, or on the manifest but not on the truck, that mismatch must be resolved before the vehicle leaves.

## E-way bill Part A and Part B
- **Document ID**: `glossary-eway-part-a-b`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `eway bill, e-way bill, ewb, part a, part b, eway part a, eway part b, ewb-01, transporter id, what is eway bill`

An e-way bill is the GST document for the movement of goods, in Form GST EWB-01 under section 68 of the CGST Act and Rule 138, generated on the government portal https://ewaybillgst.gov.in before the goods move. It is required when the value of a consignment exceeds Rs 50,000 including GST and cess, per consignment per invoice, for inter-state movement; intrastate thresholds differ by state, so the state rule must be checked — do not state Rs 50,000 as a flat rule for every move. In Panther TMS an e-way bill is mandatory above Rs 50,000 and LR confirmation is blocked until a valid e-way bill number is entered; that is Panther's own rule.
### Part A
Part A carries the commercial details: the GSTINs of the supplier and recipient, the places of dispatch and delivery with PIN codes, the invoice or challan number and date, the HSN code, the value of the goods, and the reason for transport.
### Part B
Part B carries the transport details: the vehicle number or the Transporter ID. The validity clock starts only when Part B is filled, so a bill with only Part A complete does not yet count down. If the vehicle changes during the journey, Part B is updated with the new vehicle number.
### Validity, extension and cancellation
An e-way bill is valid for 1 day per 200 km for regular cargo, where 1 day means 24 hours, and for over-dimensional cargo the validity is 1 day per 20 km. If the goods cannot reach destination in time, the validity can be extended within 8 hours before or after expiry, and the total extension is capped at 360 days from 1 January 2025. An e-way bill can be cancelled within 24 hours of generation if the goods were not moved. When one vehicle carries several consignments, each with its own e-way bill, a consolidated e-way bill in Form GST EWB-02 can be generated for the whole vehicle.

## What is an IRN (e-invoicing)
- **Document ID**: `glossary-irn`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `irn, e-invoicing, einvoice, e invoice, invoice registration portal, irp, qr code, 64 character`

E-invoicing does not mean creating the invoice on the government portal. The invoice is created in the company's own software and then reported as JSON data to an Invoice Registration Portal (IRP). The IRP returns a 64-character IRN hash and a signed QR code, which are printed on the invoice. Without the IRN the invoice is not a valid e-invoice. E-invoicing is mandatory above Rs 5 crore aggregate turnover in any preceding financial year from 2017-18, for B2B supplies and exports, since 1 August 2023. An IRN can be cancelled within 24 hours. The e-invoice is a different document from the e-way bill: the e-invoice proves the supply for GST, while the e-way bill permits the movement of the goods. A transport invoice must include the gross and charged weight, the GSTINs of consignor and consignee, the vehicle registration number, the LR number, the SAC code 996511, the freight amount and rate, an RCM-vs-FCM declaration, and the place of supply.

## What is FASTag
- **Document ID**: `glossary-fastag`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `fastag, toll, toll plaza, rfid, fastag tracking, toll crossing, netc`

FASTag is the RFID tag fixed on a vehicle's windscreen, linked to a prepaid wallet from which toll is deducted automatically at toll plazas. For tracking, each toll crossing is a checkpoint: it proves the vehicle passed that plaza at that time. But FASTag gives point-in-time checkpoints only, at toll plazas that are typically 50 to 200 km apart, and it is not continuous tracking. Between two plazas there is no FASTag signal at all. Its strength is independence: it does not depend on the driver's phone or on a GPS device in the truck, so it is a useful cross-check. Best practice is GPS as the primary tracking, SIM as the fallback, and FASTag as independent validation; a GPS and FASTag route mismatch is treated as a tamper alert. GPS tracking uses a hardware device (about 10 to 20 metres accuracy, an update every 30 seconds to 5 minutes). SIM tracking follows the driver's phone with consent (every 5 to 15 minutes, about 100 to 400 metres accuracy) and is the best option for market vehicles with no GPS device.

## LR Booking page
- **Document ID**: `page-lr-booking`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/transport/lr-booking`
- **Keywords**: `lr booking page, lr booking, lr list, lr page, what is this page, lr booking screen, create lr, new lr booking`

### What it is
The LR Booking page is where LRs are created and viewed in Panther TMS. It lists existing lorry receipts with their status in the flow BOOKED, then IN_TRANSIT, then DELIVERED, and it is where a new LR is made. The LR number on this page is the same reference used on the POD, the transport invoice and the party ledger, so this page is the starting point for almost every transport question about a consignment.
### What you do on it
Search for an LR, open one to check its details, track its status, print the bilty, and create a new LR.
### Creating an LR (workflow)
1. Open the LR Booking page at /transport/lr-booking and click "New LR Booking".
2. Fill the required fields: Booking Status, Dispatch Date, Payment Type, Origin Hub, Destination Hub, Consignor, Consignee, Truck No., and No. of Packages. You may pick a Job No. to import its details, or leave the default Direct Booking (No Job).
3. The form has no freight amount fields — freight is not entered on the Create LR form. There is no standalone cargo description field (cargo goes in the invoice-line Particulars) and no LR Date field (the only date is the Dispatch Date).
4. Click "Create Lorry Receipt" to save.
### What happens on Save
The official LR number is assigned from the series for the issuing office, and the LR is created with status BOOKED. In Panther, saving is blocked without an e-way bill when the consignment value exceeds Rs 50,000.
### Common mistakes
- Truck No. is required, but the form offers no way to type a plate directly: if the tenant has no vehicles yet, the LR cannot be saved until a vehicle is created first.
- Returning from Add Vehicle has wiped the LR form's job-imported values in the past (job, dispatch date, parties, packages, weights) — check every field again after adding a vehicle and re-select the job if the values are gone.
- The booking date can look inconsistent: the print shows one date and the LR list shows the dispatch date, because there is no separate LR Date field.
### FAQs
- Can Parth AI create the LR from chat? No. It guides you to this form with the exact labels and a link.
- Why is confirmation blocked? Usually a missing e-way bill above Rs 50,000, or a missing required field such as Truck No.

## Job Orders page
- **Document ID**: `page-job-orders`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/transport/job-orders`
- **Keywords**: `job orders page, jobs page, job list, transport jobs, what is this page, job orders screen, create job, create trip order`

### What it is
The Job Orders page is where transport job orders are created and viewed. A job order is the customer order for what must be delivered: the shipper and consignee, the pickup and delivery windows, the commodity, and the agreed rate. The page lists jobs with their status, so you can see which jobs are open, which are booked onto a vehicle, and which are done.
### What you do on it
Create a job, view the job list, and open a job to see its LRs. A job exists before the LR: the LR is the consignment note created when the goods are actually loaded, and it should be linked to its job.
### Creating a job (workflow)
1. Open the Job Orders page at /transport/job-orders.
2. Fill in the customer order: the consignor and consignee, the origin and destination, the scheduled dispatch date, the commodity, and the agreed rate.
3. Save with the "Create Trip Order" button.
### What happens on Save
The job record is created with a job number. The job can then be selected on the LR Booking page so its details — parties, route, packages and weights — are imported into the LR instead of being typed again. In the demo tenant the jobs are real records such as JOB-0001 onwards.
### Common mistakes
- A job with no LR was never loaded; an LR with no job has no customer commitment behind it. Keep them linked.
- Never invent a job number: the chatbot's job list shows only real jobs from the database.

## Hire Challan page
- **Document ID**: `page-hire-challan`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/transport/hire-challan`
- **Keywords**: `hire challan page, hire challan, lorry hire memo, lhc, what is this page, hire challan screen, market vehicle hire`

### What it is
The Hire Challan page is where a market vehicle — a third-party truck hired for one trip — is recorded. The hire challan (lorry hire memo, LHC) records the vehicle, the route, the agreed hire, the advance paid, the balance payable, any deductions, and the terms of the hiring.
### What you do on it
Create a hire challan for a hired trip, and settle it after unloading.
### What happens on Save
The challan is recorded against the vehicle owner. It is settled after unloading, when the balance payable is worked out as the agreed hire minus the advance already given minus any agreed deductions.
### Common mistakes
- A hire challan is NOT the LR, NOT the customer invoice, and NOT a GST document.
- The hire advance (paid to the vehicle owner) and the driver advance (cash/diesel/FASTag for the trip) are owed to different people — keep them separate.
- The advance percentage is negotiated per trip; there is no standard percentage.

## Master Ledger page
- **Document ID**: `page-master-ledger`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/accounts/master-ledger`
- **Keywords**: `master ledger page, ledger page, party ledger, outstanding balance, what is this page, khata page, ledger`

### What it is
The Master Ledger page is where the running ledger for a customer, vendor or driver is viewed. A party ledger is the live running record for one party: every invoice, payment, credit note, debit note, advance and TDS entry is posted to it, and the running balance shows what is owed at any moment.
### What you do on it
Check a billing client's outstanding balance, see how old the unpaid invoices are (outstanding ageing), check what is owed to a vendor, and check a driver's advance balance.
### Common mistakes
- Two different advances exist: a customer freight advance (part of the freight, received at booking) vs a driver/vehicle advance (cash, diesel or FASTag given at loading). Never mix them.
- Settlement is always Bill minus Advance minus TDS minus deductions equals Net Balance.
- The ledger is scoped to the user's issuing office and role — a user only sees the parties and offices they are allowed to see.

## Transport invoices page
- **Document ID**: `page-transport-invoice`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `transport invoice page, invoice page, freight invoice, billing page, what is this page, invoice screen`

### What it is
The transport invoices page is where freight invoices are raised from booked LRs. A transport invoice bills the freight for one or more LRs to the billing client.
### What an invoice must include
Gross and charged weight, the GSTINs of the consignor and consignee, the vehicle registration number, the LR number, the SAC code 996511, the freight amount and rate, a declaration of reverse charge (RCM, 5%, transporter charges 0%) or forward charge (FCM, 18% with input tax credit from 22 September 2025), and the place of supply.
### What happens on Save
The invoice is created against the billing client. Invoicing normally follows the POD: a clean POD triggers billing, and the rule is often "no POD, no payment". Invoices above the e-invoicing turnover threshold (Rs 5 crore aggregate turnover, B2B and exports, since 1 August 2023) are reported to the Invoice Registration Portal, which returns a 64-character IRN hash and a signed QR code printed on the invoice.

## Tracking pages
- **Document ID**: `page-tracking`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/tracking/fastag`
- **Keywords**: `tracking page, live tracking, gps tracking page, sim tracking, fastag tracking, what is this page, track vehicle`

### What they are
The tracking pages are where live vehicle and consignment positions are checked.
### The three tracking modes
- GPS tracking: a hardware device fitted in the vehicle, about 10 to 20 metres accuracy, an update every 30 seconds to 5 minutes. Continuous and precise — the primary method, normally for the own fleet.
- SIM tracking: the driver's phone with consent, every 5 to 15 minutes, about 100 to 400 metres accuracy. No hardware needed — the best option for market vehicles with no GPS device.
- FASTag tracking: toll-plaza crossings only, at plazas 50 to 200 km apart. Point-in-time checkpoints, not continuous tracking — independent validation.
### Common mistakes
- FASTag alone cannot show where a vehicle is between plazas.
- SIM tracking follows the phone, not the truck, and needs the driver's consent.
- A GPS and FASTag route mismatch is a tamper alert.

## POD Records page
- **Document ID**: `page-pod-records`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/transport/pod-records`
- **Keywords**: `pod records page, pod page, proof of delivery page, pending pod, what is this page, pod screen`

### What it is
The POD Records page is where proof of delivery is viewed and managed. A POD is the documented confirmation that a shipment reached its recipient at the agreed place and time, with the date and time, the recipient's name, signature and stamp, the delivery location, the LR number, and the condition of the goods.
### What you do on it
See which LRs still have a pending POD, check a POD that was uploaded, and verify the receiver's signature.
### Common mistakes
- A POD is a signed auditable record, not a status update, a phone call, or a GPS ping.
- A clean POD is what moves an LR to DELIVERED and triggers billing and payment, so pending PODs are the first thing to chase when payments are stuck — "no POD, no payment".

## Home dashboard page
- **Document ID**: `page-home-dashboard`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Route**: `/dashboard`
- **Keywords**: `dashboard, home page, home screen, overview, what is this page, dashboard page`

### What it is
The home or dashboard page is the overview of the transport business for the day and branch: how many LRs were booked, how many vehicles are on the road, what is pending, and what needs attention, such as PODs waiting to come back or invoices waiting to be paid.
### Common mistakes
- The dashboard is an overview, not a working page. The work itself happens on the detail pages: LR Booking for consignments, Job Orders for customer orders, the Master Ledger for balances, and the tracking pages for live positions.

## What Parth AI can do on any page
- **Document ID**: `page-panther-ai-help`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Keywords**: `what can you do, parth ai, help, what can parth ai do, panther ai, bot help, capabilities`

Parth AI is the TMS expert inside Panther TMS, and it works on every page. It can explain what the page you are on is for and what you can do on it, explain transport terms such as LR, e-way bill, POD, detention or TBB, guide you to the right form with its exact button labels, track an LR or a vehicle, show a job list, and check a ledger balance from the live records. It does not create LRs, jobs or hire challans from chat: for those it guides you to the form — for example the LR Booking page at /transport/lr-booking, where you click "New LR Booking" and save with "Create Lorry Receipt". It never invents a live fact: if a record is not found, it says so, and for anything outside its scope it offers the closest Panther alternative or a human through "Talk to support" (toll-free helpline 1800 571 0683, email: support@panthertms.com).
