# PantherTMS Authoritative Knowledge Base (Living Document)
Version: 2026.2
Status: Authoritative Source of Truth for Panther AI Copilot

---

## 1. Transportation Module: Lorry Receipt (LR / GR Booking)
- **Document ID**: `transport-lr-booking`
- **Category**: `transport`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/lr-booking`
- **Permissions**: `lr_booking`
- **Keywords**: `lr, gr, bilty, lorry receipt, consignment note, booking, freight, consigner, consignee, eway bill, to pay, paid, to be billed, weight, package`

### Overview & Business Purpose
The Lorry Receipt (LR) or Goods Receipt (GR), traditionally referred to as "Bilty" in Indian logistics, is the primary legal transport contract between the logistics provider, consigner (shipper), and consignee (receiver). It acts as a document of title to the goods, establishes freight liability, and provides proof of consignment under the Indian Carriage by Road Act, 2007.

### Step-by-Step Workflow
1. Navigate to **Transport -> GR/LR Booking** (`/transport/lr-booking`).
2. Click **Create LR** or trigger draft via Panther AI.
3. Select or enter the mandatory loading party (**Consigner**) and receiving party (**Consignee**).
4. Enter the assigned **Vehicle Number** (e.g., `MH12AB1234`).
5. Choose payment terms (`TO_PAY`, `PAID`, or `TO_BE_BILLED`).
6. Enter cargo details: number of packages, packaging method, actual weight, and chargeable weight in metric tons.
7. Enter commercial terms: agreed freight rate, freight amount, loading/unloading charges, advance collected, and remaining balance.
8. Attach customer commercial invoices and E-Way Bill numbers (12-digit Government NIC format) with validity dates.
9. Click **Save & Print**. The system allocates an LR number from the active series master and creates the ledger entry.

### Mandatory vs Optional Fields
- **Mandatory Fields**:
  - `vehicle_number`: Indian vehicle registration number (e.g. `MH12AB1234`), minimum 2 chars.
  - `consigner_id`: Foreign key reference to loading master party (`general_consigners`).
  - `consignee_id`: Foreign key reference to destination receiving party (`general_consignees`).
- **Optional Fields**:
  - `lr_number`: Series voucher string. Auto-generated from active Series Master if blank.
  - `lr_date`: Booking timestamp (defaults to current date).
  - `issuing_office_id`: Defaults to current active branch (`profile_branches.id`).
  - `billing_customer_id`: Party responsible for payment (defaults to consigner if TO_BE_BILLED).
  - `actual_weight_mt`, `chargeable_weight_mt`: Decimal weights in metric tons (defaults to 0.000).
  - `package_count`: Number of bundles/boxes.
  - `freight_rate`, `freight_amount`, `loading_charges`, `unloading_charges`, `other_charges`: Commercial charges.
  - `advance_amount`, `balance_amount`: Financial settlement split.
  - `invoice_items`: Array of objects containing `invoice_no`, `invoice_date`, `invoice_value`, `eway_bill_number`, `eway_bill_expiry`.

### Status Lifecycle & State Transitions
`BOOKED` -> `IN_TRANSIT` -> `DELIVERED` (or `CANCELLED` / `RESERVED`).
- `BOOKED`: Consignment created, truck awaiting dispatch or loading.
- `IN_TRANSIT`: Truck dispatched, movement monitored via FASTag/SIM/GPS.
- `DELIVERED`: Goods acknowledged at destination, pending POD upload and final billing.

### Related Database Models
- `LRBooking` (`transport_lr_bookings`): Primary LR record.
- `LRInvoiceItem` (`transport_lr_invoice_items`): Associated commercial invoices and E-Way bills.
- `GeneralConsigner` (`general_consigners`), `GeneralConsignee` (`general_consignees`), `BillingClient` (`general_billing_clients`).

### API Endpoints
- `GET /api/v1/transport/lr-bookings`: Paginated listing with multi-field search and office filters.
- `POST /api/v1/transport/lr-bookings`: Create a new LR.
- `GET /api/v1/transport/lr-bookings/{id}`: Fetch detailed LR record.
- `PUT /api/v1/transport/lr-bookings/{id}`: Update LR details.
- `DELETE /api/v1/transport/lr-bookings/{id}`: Void/cancel LR record.

---

## 2. Transportation Module: Hire Challan (Truck Hiring Memo)
- **Document ID**: `transport-hire-challan`
- **Category**: `transport`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/hire-challan`
- **Permissions**: `hire_challan`
- **Keywords**: `hire challan, hc, truck hire memo, market vehicle, driver advance, diesel advance, broker freight, supplier settlement`

### Overview & Business Purpose
The Hire Challan (HC) or Truck Hiring Memo is a legally binding contract between PantherTMS and a third-party market vehicle owner, transporter, or transport broker. It documents the agreed hiring rate, advances given at the loading branch (cash, diesel slip, bank transfer), and balance payable upon safe delivery and POD submission.

### Step-by-Step Workflow
1. Navigate to **Transport -> Hire Challan** (`/transport/hire-challan`).
2. Click **Create Hire Challan**.
3. Select or enter the hired **Market Vehicle** and assigned **Driver**.
4. Link the vehicle owner / supplier vendor.
5. Specify agreed hiring freight (per trip or per ton).
6. Record loading advances: Cash advance paid to driver, diesel advance slips issued at designated petrol pumps.
7. Save the challan. The system computes `balance_payable = agreed_freight - (cash_advance + diesel_advance + other_deductions)`.
8. Once POD is submitted at the destination branch, open the challan and click **Settle** (`/api/v1/transport/hire-challans/{id}/settle`).

### Mandatory vs Optional Fields
- **Mandatory Fields**:
  - `vehicle_number`: Market vehicle registration number.
  - `supplier_vendor_id`: Vendor/broker supplying the vehicle (`general_vendors`).
  - `hiring_rate`: Agreed total contract amount.
- **Optional Fields**:
  - `driver_name`, `driver_phone`, `driver_id`: Driver identity.
  - `diesel_advance`: Fuel slip value debited against petrol pump vendor.
  - `cash_advance`: Cash given to driver for en-route expenses.
  - `destination_office_id`: Branch where truck will unload and settle.

### Status Lifecycle & State Transitions
`ACTIVE` -> `POD_PENDING` -> `SETTLED` (or `CANCELLED`).
- `ACTIVE`: Vehicle in transit.
- `POD_PENDING`: Vehicle arrived, waiting for signed physical proof of delivery.
- `SETTLED`: All deductions applied, payment voucher created, vendor account credited.

### Related Database Models & APIs
- `HireChallan` (`transport_hire_challans`).
- `POST /api/v1/transport/hire-challans`: Create challan.
- `POST /api/v1/transport/hire-challans/{id}/settle`: Final payment settlement.

---

## 3. Transportation Module: Transport Job Indents
- **Document ID**: `transport-jobs`
- **Category**: `transport`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/jobs`
- **Permissions**: `jobs`
- **Keywords**: `job, indent, pre booking, load order, dispatch plan, client demand`

### Overview & Business Purpose
Transport Jobs represent client booking indents and vehicle placement demands before physical truck assignment. It allows dispatchers to log customer requests, monitor fulfillment rates, and convert accepted jobs directly into active LRs once trucks are placed.

### Step-by-Step Workflow
1. Navigate to **Transport -> Job Creation** (`/transport/jobs`).
2. Select the requesting **Billing Client**, origin hub, and destination hub.
3. Enter cargo specifications: estimated packages, material description, and estimated metric tonnage.
4. Set required placement date and agreed target freight.
5. When a truck arrives at the loading yard, convert the job into an LR with one click, pre-filling customer and route details.

### Mandatory vs Optional Fields
- **Mandatory**: `billing_client_id`, `origin_location_id`, `destination_location_id`.
- **Optional**: `estimated_packages`, `estimated_weight_mt`, `cargo_description`, `target_rate`.

### Status Lifecycle
`PENDING` -> `ACCEPTED` -> `IN_TRANSIT` -> `COMPLETED` -> `CANCELLED`.

---

## 4. Transportation Module: Fleet Masters (Company & Market Vehicles, Drivers, Owners)
- **Document ID**: `transport-fleet-masters`
- **Category**: `transport`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/company-vehicles`, `/transport/market-vehicles`, `/transport/drivers`, `/transport/vehicle-owners`
- **Permissions**: `company_vehicles, market_vehicles, drivers, vehicle_owners`
- **Keywords**: `company vehicle, market vehicle, gaadi, driver, chalak, vehicle owner, chassis, engine, fitness, insurance, permit, dl, license`

### Overview & Submodules
1. **Company Vehicles (`/transport/company-vehicles`)**: Dedicated fleet owned or on long-term lease. Tracks registration number, chassis number, engine number, road tax validity, national permit expiry, insurance policy, and fitness renewal dates.
2. **Market Vehicles (`/transport/market-vehicles`)**: Third-party hired trucks mapped to a vehicle owner/vendor.
3. **Manage Drivers (`/transport/drivers`)**: Comprehensive driver registry including full name, 10-digit mobile number, Driving License (DL) number, DL expiry date, Aadhar number, and verification status. Used for SIM-based tracking consent.
4. **Vehicle Owners (`/transport/vehicle-owners`)**: Transporter and fleet owner master with PAN, bank account details, and TDS declaration (Form 15G/15H for exemption under Section 194C).

### APIs
- `GET /api/v1/transport/company-vehicles`, `POST /api/v1/transport/company-vehicles`
- `GET /api/v1/transport/market-vehicles`, `POST /api/v1/transport/market-vehicles`
- `GET /api/v1/transport/drivers`, `POST /api/v1/transport/drivers`
- `GET /api/v1/transport/vehicle-owners`, `POST /api/v1/transport/vehicle-owners`

---

## 5. Transportation Module: Operations (Arrival Reports, POD Records, Truck Hiring Note, E-Way Bill)
- **Document ID**: `transport-operations`
- **Category**: `transport`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/arrival-reports`, `/transport/pod-records`, `/transport/truck-hiring-note`, `/transport/eway-bill`
- **Permissions**: `arrival_reports, pod_records, truck_hiring_note, eway_bill`
- **Keywords**: `arrival report, pod, proof of delivery, truck hiring note, thn, eway bill, ewb, nic, delivery acknowledgement, shortage, damage`

### Overview & Submodules
1. **Arrival Report (`/transport/arrival-reports`)**: Logs inbound vehicle arrival at unloading branches. Captures arrival date/time, physical seals status, package count verification, and shortage/damage remarks.
2. **POD Records (`/transport/pod-records`)**: Proof of Delivery management. Allows operators to upload signed delivery challans / LR copies, log delivery timestamps, and verify consignee signatures. Unlocks customer billing.
3. **Truck Hiring Note (`/transport/truck-hiring-note`)**: Supplementary document issued for contracted market vehicles detailing loading terms, transit guarantees, and penalties.
4. **Update E-Way Bill (`/transport/eway-bill`)**: Dedicated interface to update Part-B vehicle details, extend validity periods, or consolidate E-Way bills directly with Government NIC portal.

---

## 6. General Masters: Address Directory & Classifications
- **Document ID**: `general-masters`
- **Category**: `general`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/general/`
- **Route**: `/general/billing-client`, `/general/consigner`, `/general/consignee`, `/general/vendor`, `/general/location`, `/general/industry`, `/general/designation`, `/general/group-company`, `/general/unit`, `/general/packing-method`, `/general/load-type`
- **Permissions**: `billing_client, consigner, consignee, vendor, location, industry, designation, group_company, unit, method_of_packing, load_type`
- **Keywords**: `billing client, consigner, consignee, vendor, location, industry, designation, group company, unit, packing method, load type, pincode, gstin, state code`

### Submodules & Definitions
- **Billing Client (`/general/billing-client`)**: Parties to whom freight is billed. Stores 15-character GSTIN, billing address, credit limit, credit days, and primary contact.
- **Consigner (`/general/consigner`)**: Pickup / loading parties, factories, or central warehouses.
- **Consignee (`/general/consignee`)**: Delivery / unloading parties and receiving godowns.
- **Vendor (`/general/vendor`)**: Fuel suppliers, repair shops, fleet brokers, and toll service providers.
- **Location (`/general/location`)**: Cities, industrial hubs, ports, and transit checkpoints.
- **Industry (`/general/industry`)**: Customer categorization (e.g., FMCG, Steel, Pharma, Automotive, Textiles).
- **Designation (`/general/designation`)**: Corporate job titles for drivers, operators, and staff.
- **Group Company (`/general/group-company`)**: Enterprise holding companies and sister transport subsidiaries.
- **Unit (`/general/unit`)**: Measurement units (MT, KG, Quintal, Litre, Box, Bag, Barrel).
- **Method of Packing (`/general/packing-method`)**: Packaging types (Corrugated Box, Wooden Crate, Pallet, Gunny Bag, Loose, Drum).
- **Load Type (`/general/load-type`)**: FTL (Full Truck Load), LTL (Part Load), ODC (Over Dimensional Cargo), Reefer/Cold-chain.
- **Indian Postal PIN Code Resolver (`/api/v1/general/pincode/{pincode}`)**: Resolves city, district, state, and post office from 6-digit postal codes instantly.

---

## 7. Tracking Telematics: FASTag, SIM & GPS
- **Document ID**: `tracking-telematics`
- **Category**: `tracking`
- **Minimum Plan Tier**: `2`
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/tracking/fastag`, `/tracking/sim`, `/tracking/gps`
- **Permissions**: `fastag_tracking, sim_tracking, gps_tracking`
- **Keywords**: `fastag, sim tracking, gps, toll plaza, freight tiger, driver consent, wheelseye, telematics, cooldown, netc, npci`

### Tracking Modes & Safeguards
1. **FASTag Tracking (`/tracking/fastag`)**:
   - Queries NETC/NPCI toll plaza crossing logs via aggregator API.
   - Provides point-in-time toll plaza event timestamps and lane information (not continuous GPS coordinates).
   - **Cooldown Protection**: Enforces an automated 10-minute anti-spam cooldown per vehicle to prevent wallet draining.
2. **SIM-based Tracking (`/tracking/sim`)**:
   - Cellular tower triangulation via Freight Tiger / telecom partner API.
   - **Consent Verification**: Sends automated SMS consent request to driver's phone. Location pings only activate once the driver grants SMS consent.
3. **GPS Tracking (`/tracking/gps`)**:
   - Continuous live telematics for fitted vehicles (e.g. Wheelseye integration). Real-time latitude, longitude, reverse geocoded address, speed, and historical path playback.

---

## 8. Transport Reports: Operational Registers & Analytics
- **Document ID**: `transport-reports-catalog`
- **Category**: `transport_reports`
- **Minimum Plan Tier**: `2`
- **Source File**: `backend/app/modules/transport_reports/`
- **Route**: `/transport-reports/lr-register`, `/transport-reports/invoice-register`, `/transport-reports/lr-client-wise`, `/transport-reports/hc-register`, `/transport-reports/pending-hc`, `/transport-reports/unbilled`, `/transport-reports/arrival-register`, `/transport-reports/unused-series`
- **Permissions**: `lr_register, invoice_register, lr_client_wise, hc_register, pending_hc, unbilled, arrival_register, unused_series`
- **Keywords**: `lr register, invoice register, client wise lr, hire challan register, pending hc, unbilled lr, arrival register, unused series, transport reports`

### Submodules & Analytic Value
1. **LR Booking Register (`/transport-reports/lr-register`)**: Filterable master register of all booked LRs with date ranges, branch filters, consigner/consignee filters, freight sums, and payment status.
2. **Invoice Register (`/transport-reports/invoice-register`)**: Consolidated record of all generated customer freight invoices, GST breakdowns (CGST/SGST/IGST), and payment status.
3. **LR Client-Wise (`/transport-reports/lr-client-wise`)**: Aggregated consignment report grouped by billing client for monthly reconciliation and volume review.
4. **Hire Challan Register (`/transport-reports/hc-register`)**: Audit register of all truck hiring memos, hiring freight, advances disbursed, and pending balance payables.
5. **Pending HC Report (`/transport-reports/pending-hc`)**: Highlights un-settled hire challans awaiting POD submission or final voucher payment.
6. **Unbilled Reports (`/transport-reports/unbilled`)**: Identifies delivered consignments where customer transport invoices have not yet been raised, protecting cash flow.
7. **Arrival Report Register (`/transport-reports/arrival-register`)**: Log of all inbound trip arrivals across branches.
8. **Unused GR/LR Series (`/transport-reports/unused-series`)**: Audit tool identifying skipped or missing LR serial numbers in pre-printed stationery.

---

## 9. E-Invoicing Module: GST e-Invoice / IRN Compliance
- **Document ID**: `einvoicing-gst-portal`
- **Category**: `einvoicing`
- **Minimum Plan Tier**: `3`
- **Source File**: `backend/app/modules/einvoicing/`
- **Route**: `/einvoicing/generate-irn`, `/einvoicing/irn-list`, `/einvoicing/cancel-irn`, `/einvoicing/taxpayer`
- **Permissions**: `generate_irn, irn_list, cancel_irn, taxpayer`
- **Keywords**: `einvoicing, irn, invoice reference number, qr code, nic, gst portal, cancel irn, taxpayer details, e-way bill sync`

### Overview & Workflow
PantherTMS provides seamless integration with the Government of India E-Invoice Portal (NIC) for taxpayers with turnover exceeding mandatory thresholds.
1. **Generate IRN (`/einvoicing/generate-irn`)**: Converts verified transport invoices into standard JSON schema, transmits to the Invoice Registration Portal (IRP), and receives a 64-character encrypted **IRN**, digital signature, and signed **QR Code**.
2. **IRN Generated List (`/einvoicing/irn-list`)**: Audit register of all active IRNs with one-click PDF printing containing government-compliant QR codes.
3. **Cancel IRN (`/einvoicing/cancel-irn`)**: Allows cancellation of generated IRNs within the legal 24-hour window from issuance. Requires mandatory cancellation reason code.
4. **Taxpayer Details (`/einvoicing/taxpayer`)**: Instant live lookup of any GSTIN against the national GST portal to verify legal entity name, trade name, active status, and registered principal address.

---

## 10. Accounts Module: Invoicing, Vouchers & Master Ledger
- **Document ID**: `accounts-master-ledger`
- **Category**: `accounts`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/accounts/`
- **Route**: `/accounts/transport-invoice`, `/accounts/general-invoice`, `/accounts/proforma-invoice`, `/accounts/purchases`, `/accounts/receipt-voucher`, `/accounts/payment-voucher`, `/accounts/contra-voucher`, `/accounts/credit-debit-notes`, `/accounts/master-ledger`
- **Permissions**: `transport_invoice, general_invoice, proforma_invoice, purchases, receipt_voucher, payment_voucher, contra_voucher, credit_debit_notes, master_ledger`
- **Keywords**: `accounts, invoice, transport invoice, proforma, purchase, receipt voucher, payment voucher, contra, credit note, debit note, master ledger, double entry, tally prime`

### Submodules & Workflows
- **Transport Invoice (`/accounts/transport-invoice`)**: Aggregates one or more delivered LRs into a GST-compliant tax invoice. Automatically applies CGST/SGST (intra-state) or IGST (inter-state) based on place of supply.
- **General Invoice (`/accounts/general-invoice`)**: Invoicing for warehousing, detention charges, or handling fees.
- **Proforma Invoice (`/accounts/proforma-invoice`)**: Estimate quotation invoices for client advance payments.
- **Purchase Register (`/accounts/purchases`)**: Logs operational supplier bills (tyres, spare parts, office expenses).
- **Receipt Voucher (`/accounts/receipt-voucher`)**: Inward bank/cash collections against customer invoices.
- **Payment Voucher (`/accounts/payment-voucher`)**: Outward payments for vendor advances, hire challans, diesel bills, and salaries.
- **Contra Voucher (`/accounts/contra-voucher`)**: Cash deposit into bank, cash withdrawal, or inter-bank account transfers.
- **Credit / Debit Notes (`/accounts/credit-debit-notes`)**: Adjustments for freight shortages, rate disputes, or detention rebates.
- **Master Ledger (`/accounts/master-ledger`)**: Running financial ledger for customers, suppliers, and drivers showing full debit/credit history and net running balance.

---

## 11. Misc Masters: Chart of Accounts & Tax Setup
- **Document ID**: `misc-masters-chart`
- **Category**: `misc`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/misc/`
- **Route**: `/misc/primary-group`, `/misc/group-in-primary`, `/misc/subgroup`, `/misc/employee-master`, `/misc/charge-head`, `/misc/tax-category`
- **Permissions**: `primary_group, group_in_primary, subgroup, employee_master, charge_head, tax_category`
- **Keywords**: `misc masters, primary group, group in primary, subgroup, employee master, charge head, tax category, chart of accounts, tds, gst slabs`

### Overview & Submodules
Configures the underlying accounting backbone conforming to standard Indian Chartered Accountant requirements:
- **Primary Group (`/misc/primary-group`)**: Top-level classification (Assets, Liabilities, Income, Expenses).
- **Group in Primary (`/misc/group-in-primary`)**: Standard groups (Current Assets, Sundry Debtors, Sundry Creditors, Direct Expenses).
- **Subgroup in Group (`/misc/subgroup`)**: Granular subgroups (e.g. Branch Cash, Bank OD, Regional Debtors).
- **Employee Master (`/misc/employee-master`)**: Internal staff profiles, roles, and payroll mappings.
- **Charge Head (`/misc/charge-head`)**: Surcharge definitions for freight (Hamali/Labour, Toll, Detention, Halting, Warfage).
- **Tax Category (`/misc/tax-category`)**: GST rates (0%, 5% RCM, 12% Forward Charge, 18%, 28%) and TDS sections (194C, 194J).

---

## 12. Reports (Financial): Daybook, Trial Balance & Balance Sheet
- **Document ID**: `reports-financial-statements`
- **Category**: `reports`
- **Minimum Plan Tier**: `2`
- **Source File**: `backend/app/modules/reports/`
- **Route**: `/reports/daybook`, `/reports/ledger`, `/reports/trial-balance`, `/reports/balance-sheet`, `/reports/profit-loss`, `/reports/sales-register`, `/reports/purchase-register`, `/reports/bank-reconciliation`, `/reports/special-report`
- **Permissions**: `daybook, ledger, trial_balance, balance_sheet, profit_loss, sales_register, purchase_register, bank_reconciliation, special_report`
- **Keywords**: `financial reports, daybook, ledger, trial balance, balance sheet, profit and loss, pnl, sales register, purchase register, bank reconciliation, brs`

### Overview & Core Reports
- **Daybook (`/reports/daybook`)**: Chronological daily record of all vouchers entered across branches.
- **Ledger Report (`/reports/ledger`)**: Account-specific statement of debits, credits, and closing balances for any ledger.
- **Trial Balance (`/reports/trial-balance`)**: Periodic summary verifying that total debits equal total credits.
- **Profit & Loss Statement (`/reports/profit-loss`)**: Direct freight revenue vs direct truck expenses (hiring, diesel, toll) yielding Gross Margin, minus administrative overheads for Net Profit.
- **Balance Sheet (`/reports/balance-sheet`)**: Snapshot of enterprise assets, liabilities, and equity.
- **Bank Reconciliation (BRS) (`/reports/bank-reconciliation`)**: Reconciles ERP bank book balances with bank statements.

---

## 13. Statements Module: GST, Debtors, Creditors & TDS
- **Document ID**: `statements-compliance`
- **Category**: `statements`
- **Minimum Plan Tier**: `3`
- **Source File**: `backend/app/modules/statements/`
- **Route**: `/statements/gst-output`, `/statements/gst-input`, `/statements/os-debtor`, `/statements/os-creditor`, `/statements/tds-payable`, `/statements/tds-return`, `/statements/opening-balance`
- **Permissions**: `gst_output, gst_input, os_debtor, os_creditor, tds_payable, tds_return, opening_balance`
- **Keywords**: `statements, gst output, gst input, gstr1, gstr3b, outstanding debtors, creditors, tds payable, tds return, opening balance`

### Submodules & Statutory Reports
- **GST Output (`/statements/gst-output`)**: Tax collected on sales/freight invoices. Exportable for GSTR-1 filing.
- **GST Input (`/statements/gst-input`)**: Input Tax Credit (ITC) on vendor purchases and fuel for GSTR-3B matching.
- **Outstanding Debtors (`/statements/os-debtor`)**: Aging analysis (0-30, 31-60, 61-90, 90+ days) of uncollected customer bills.
- **Outstanding Creditors (`/statements/os-creditor`)**: Payables due to market truck owners, fuel vendors, and brokers.
- **TDS Payable & Return (`/statements/tds-payable`, `/statements/tds-return`)**: Tax deducted at source under Section 194C for quarterly 26Q filing.
- **Opening Balance Details (`/statements/opening-balance`)**: Financial year migration and opening balance verification.

---

## 14. Fleet Management: Trip Expenses, Maintenance & Truck P&L
- **Document ID**: `fleet-management-analytics`
- **Category**: `fleet`
- **Minimum Plan Tier**: `3`
- **Source File**: `backend/app/modules/fleet/`
- **Route**: `/fleet/trip-expense`, `/fleet/trip-advance`, `/fleet/trip-expense-register`, `/fleet/truck-pnl`, `/fleet/vehicle-health`, `/fleet/documents`, `/fleet/tyre`, `/fleet/service`
- **Permissions**: `trip_expense, trip_advance, expense_register, truck_pnl, vehicle_health, documents, tyre, service`
- **Keywords**: `fleet management, trip expense, trip advance, truck pnl, vehicle health, documents, tyre management, repair and service`

### Submodules & Fleet Operations
- **Trip Expense & Advance (`/fleet/trip-expense`, `/fleet/trip-advance`)**: Logs driver advances, en-route toll charges, RTO taxes, loading/unloading tips, and fuel costs per trip.
- **Truck-Wise P&L (`/fleet/truck-pnl`)**: Calculates profitability of individual company vehicles by comparing earned freight revenue against fuel consumption, maintenance, driver salary, and tyre wear.
- **Vehicle Health & Documents (`/fleet/vehicle-health`, `/fleet/documents`)**: Monitors odometer mileage, fitness expiry, insurance renewal, national permit validity, and PUC certifications with automated renewal alerts.
- **Tyre Management (`/fleet/tyre`)**: Tracks tyre serial numbers, tread depth, axle positions, retreading history, and cost-per-kilometre (CPK).
- **Repair & Service (`/fleet/service`)**: Scheduled maintenance logs, servicing history, spare parts usage, and garage vendor billing.

---

## 15. API Center: Integrations & Webhook Credentials
- **Document ID**: `api-center-integrations`
- **Category**: `api_center`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/profile/router.py`
- **Route**: `/api-center/eway-bill`, `/api-center/gps`, `/api-center/fastag`, `/api-center/sim`
- **Permissions**: `eway_bill_api, gps_tracking_api, fastag_tracking_api, sim_tracking_api`
- **Keywords**: `api center, eway bill api, gps api, fastag api, sim tracking api, wheelseye, freight tiger, nic credentials, wallet balance`

### Integrations Covered
- **E-Way Bill API (`/api-center/eway-bill`)**: Configures Government NIC E-Way Bill portal credentials (GSP/ASP client ID, client secret, username, password). Features test connection endpoint (`/api/v1/profile/api-center/test-ewb`).
- **GPS Tracking API (`/api-center/gps`)**: Telematics provider integration (e.g. Wheelseye user token). Test endpoint: `/api/v1/profile/api-center/test-wheelseye`.
- **FASTag Tracking API (`/api-center/fastag`)**: FASTag wallet API key, remaining lookup balance, and cooldown configuration.
- **SIM Tracking API (`/api-center/sim`)**: Freight Tiger Tether API key, consent callback URLs, and SMS gateway status.

---

## 16. Company Settings: Organization, Branches, Users & RBAC
- **Document ID**: `security-multi-tenancy`
- **Category**: `company`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/auth/`
- **Route**: `/company/details`, `/company/branches`, `/company/users`, `/company/roles`
- **Permissions**: `company_details, branch, users, roles`
- **Keywords**: `company settings, branches, issuing offices, users, user management, roles, permissions, rbac, head office, tenant isolation`

### Architecture & Security Invariants
- **Company Details (`/company/details`)**: Corporate legal name, PAN, CIN, registered address, logo, and GST registrations.
- **Issuing Offices / Branches (`/company/branches`)**: Manages Head Office and branch offices. Every branch has a unique code, state, city, and series configuration.
- **User Management (`/company/users`)**: Invites employees, manages active/inactive status, and assigns users to authorized branches (`user_office_assignments`). Employees cannot view or book records for unassigned branches.
- **Roles & Permissions (`/company/roles`)**: Granular Role-Based Access Control (RBAC). Grants or revokes access to any module and feature in `ALL_NAVIGATION_MODULES`.
- **Multi-Tenant Isolation**: Tenant databases are isolated (`panther_tenant_<company_code>`). JWT claims securely enforce tenant and branch boundaries. Cross-tenant data leakage is strictly impossible.

---

## 17. System Settings: Series Master, Admin & Audit Logs
- **Document ID**: `system-settings-series`
- **Category**: `settings`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/settings/`
- **Route**: `/settings/series-master`, `/settings/admin`, `/settings/activity`
- **Permissions**: `series_master, admin_setting, activity`
- **Keywords**: `series master, prefix, suffix, voucher numbering, admin setting, activity log, audit trail, user activity`

### Submodules & Features
- **Series Master (`/settings/series-master`)**: Configures automatic or manual voucher numbering series for LRs, Hire Challans, Invoices, and Vouchers per branch. Supports custom prefix, suffix, padding zeroes (e.g. `MUM/LR/2026/0001`), and start numbers.
- **Admin Setting (`/settings/admin`)**: Company-wide operational rules (default payment terms, invoice footer terms, e-way bill auto-sync frequency).
- **User Activity Log (`/settings/activity`)**: Immutable tamper-evident audit trail capturing every user login, record creation, edit, deletion, and export with user ID, IP address, branch ID, and timestamp.

---

## 18. User Profile: Personal Account, Security & Branch P&L
- **Document ID**: `user-profile-account`
- **Category**: `profile`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/modules/profile/`
- **Route**: `/profile/account`, `/profile/change-password`, `/profile/email`, `/profile/monthly-pnl`
- **Permissions**: `account, change_password, email, monthly_pnl`
- **Keywords**: `user profile, account, change password, email settings, monthly pnl, branch performance`

### Submodules
- **User Account (`/profile/account`)**: Name, phone number, designated home branch, and user profile photo.
- **Change Password (`/profile/change-password`)**: Secure password update enforcing length and complexity rules.
- **Email Settings (`/profile/email`)**: SMTP mail server credentials for automated email dispatch of invoices and LR receipts.
- **Monthly P&L (`/profile/monthly-pnl`)**: Consolidated monthly financial performance dashboard across the user's authorized branches.

---

## 19. Common Application Errors & Troubleshooting Catalog
- **Document ID**: `troubleshooting-errors`
- **Category**: `errors`
- **Minimum Plan Tier**: `1`
- **Source File**: `backend/app/core/errors.py`
- **Route**: `ALL`
- **Keywords**: `error, 401, 403, 404, 500, token expired, forbidden, entitlement locked, quota exceeded, sim tracking error, fastag cooldown`

### Error Catalog & Exact Resolutions
1. **`401 Unauthorized` / "Token was issued for a different tenant"**: User token has expired or is attempting to authenticate against a different tenant workspace. Resolution: Log out and log back in under the current company code.
2. **`403 Forbidden` / "Access to issuing office forbidden"**: An employee is attempting to view or book an LR for a branch they are not assigned to. Resolution: Request Company Admin to assign the branch in Company -> Users.
3. **`ENTITLEMENT_LOCKED`**: Feature is locked by the tenant's current subscription plan. Resolution: Upgrade subscription plan (e.g. Free to Pro for FASTag tracking, or Pro to Business for E-Invoicing).
4. **`QUOTA_EXCEEDED` / "Monthly LR limit reached"**: Tenant has reached their plan's monthly allocation. Resolution: Renew or upgrade subscription tier.
5. **"Consigner or Consignee not found"**: Mandatory loading/unloading party is missing. Resolution: Add the party under General Masters before booking the LR.
6. **"FASTag Cooldown Active (10 mins)"**: A tracking request was made recently for this vehicle. Resolution: Wait for the 10-minute cooldown window to elapse before re-querying toll data.
7. **"SIM Consent Pending"**: The driver has not yet responded to the consent SMS. Resolution: Ask the driver to reply "YES" to the Freight Tiger telecom carrier consent SMS.\n