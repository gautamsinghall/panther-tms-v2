# PantherTMS Authoritative Knowledge Base (Living Document)
Version: 2026.1
Status: Authoritative Source of Truth for Panther AI Copilot

---

## 1. Transportation Module: Lorry Receipt (LR / GR Booking)
- **Document ID**: `transport-lr-booking`
- **Category**: `transport`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/lr-booking`
- **Keywords**: `lr, gr, bilty, lorry receipt, consignment note, booking, freight, consigner, consignee, eway bill`

### Overview & Workflow
The Lorry Receipt (LR) or Goods Receipt (GR), traditionally called "Bilty" in India, is the primary legal transport contract between the logistics company, consigner, and consignee.

### Mandatory Field Requirements
- `vehicle_number`: Vehicle registration number (e.g., `MH12AB1234`). Minimum 2 characters.
- `consigner_id`: Foreign key reference to loading party (`general_consigners`).
- `consignee_id`: Foreign key reference to receiving party (`general_consignees`).

### Optional & Recommended Fields
- `lr_number`: Series voucher number. If left blank, it is auto-allocated from the active Series Master (`settings_series_masters`) for the user's active issuing office.
- `lr_date`: Defaults to today's date.
- `issuing_office_id`: Defaults to the user's current branch.
- `booking_status`: Defaults to `Booked`. Can also be `Reserved` or `Canceled`.
- `billing_customer_id`: Party to whom freight is billed (defaults to consigner or billing client).
- `package_count`: Number of packages / bundles.
- `actual_weight_mt` & `chargeable_weight_mt`: Weight in metric tons (defaults to `0.000`).
- `freight_rate`: Agreed rate per ton, per package, or fixed trip.
- `freight_amount`: Base freight.
- `loading_charges`, `unloading_charges`, `other_charges`: Surcharges.
- `total_freight_amount`: Sum of base freight and surcharges.
- `advance_amount`: Cash/bank advance paid by customer.
- `balance_amount`: Outstanding amount to be collected.
- `payment_terms`: `TO_PAY` (Consignee pays on delivery), `PAID` (Consigner paid upfront), or `TO_BE_BILLED` (Account billing).
- `invoice_items`: Array of customer invoice records including `invoice_no`, `invoice_date`, `invoice_value`, `eway_bill_number`, and `eway_bill_expiry`.

### Status Lifecycle
`BOOKED` -> `IN_TRANSIT` -> `DELIVERED` (or `CANCELLED` / `RESERVED`).

---

## 2. Transportation Module: Hire Challan (Truck Hiring Memo)
- **Document ID**: `transport-hire-challan`
- **Category**: `transport`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/hire-challan`
- **Keywords**: `hire challan, hc, truck hire memo, market vehicle, driver advance, diesel advance, broker freight`

### Overview & Workflow
Issued when engaging third-party / market vehicles. Records the contract between PantherTMS and the truck owner/driver for carrying goods.

### Key Fields & Settlement
- `vehicle_number`: Market vehicle hired for the trip.
- `driver_id` & `driver_name`, `driver_phone`: Assigned driver details.
- `supplier_vendor_id`: Vehicle owner or transport broker.
- `hiring_rate`: Agreed rate to pay the vehicle owner.
- `diesel_advance` & `cash_advance`: Advances issued at loading branch.
- `balance_payable`: Amount due upon safe delivery.
- `settle`: Dedicated API endpoint `/api/v1/transport/hire-challans/{id}/settle` to mark the challan settled once POD is verified and deductions are applied.

---

## 3. Transportation Module: Transport Job Indents
- **Document ID**: `transport-jobs`
- **Category**: `transport`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/jobs`
- **Keywords**: `job, indent, pre booking, load order, dispatch plan`

### Overview & Workflow
Pre-booking transport orders before truck placement. Allows operators to log incoming customer requirements. Once a truck and driver are assigned, the job transitions into an active LR.

### Key Fields
- `billing_client_id`: Customer placing the order.
- `origin_location_id` & `destination_location_id`: Route locations.
- `estimated_weight_mt`: Cargo weight.
- `estimated_packages`: Total carton/bag count.
- `status`: `PENDING` -> `ACCEPTED` -> `IN_TRANSIT` -> `COMPLETED` -> `CANCELLED`.

---

## 4. Fleet & Master Management: Vehicles, Drivers & Owners
- **Document ID**: `fleet-masters`
- **Category**: `transport`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/transport/market-vehicles`, `/transport/company-vehicles`, `/transport/drivers`
- **Keywords**: `vehicle, truck, gaadi, driver, owner, license, rc, chassis`

### Vehicle Types
1. **Market Vehicles (`/transport/market-vehicles`)**: Hired third-party trucks. Mapped to a vehicle owner/vendor.
2. **Company Vehicles (`/transport/company-vehicles`)**: Dedicated company fleet with registration, chassis number, engine number, insurance, permit, and fitness expiry.
3. **Drivers (`/transport/drivers`)**: Name, phone, license number, Aadhar number, PAN, and license validity.
4. **Vehicle Owners (`/transport/vehicle-owners`)**: Vendor entity supplying market vehicles.

---

## 5. General Masters & Indian Address Directory
- **Document ID**: `general-masters`
- **Category**: `general`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/modules/general/`
- **Route**: `/general/billing-client`, `/general/consigner`, `/general/consignee`, `/general/location`
- **Keywords**: `billing client, consigner, consignee, location, vendor, pincode, gst, gstin`

### Master Types
- **Billing Clients (`/general/billing-client`)**: Parties billed for transportation, with GSTIN, PAN, credit days, and billing address.
- **Consigners (`/general/consigner`)**: Loading parties / factories / dispatch warehouses.
- **Consignees (`/general/consignee`)**: Receiving parties / unloading godowns.
- **Locations (`/general/location`)**: City, State, and Hub directory.
- **PIN Code Lookup (`/api/v1/general/pincode/{pincode}`)**: Instant lookup of Indian post offices, resolving city, state, and country from 6-digit postal PIN codes.

---

## 6. Tracking Telematics: FASTag, SIM & GPS
- **Document ID**: `tracking-telematics`
- **Category**: `tracking`
- **Minimum Plan Tier**: `2` (PRO)
- **Source File**: `backend/app/modules/transport/`
- **Route**: `/tracking/fastag`, `/tracking/sim`, `/tracking/gps`
- **Keywords**: `fastag, sim tracking, gps, toll plaza, freight tiger, driver consent, wheelseye`

### Tracking Modes
1. **FASTag Tracking (`/tracking/fastag`)**:
   - Queries toll plaza transactions from NPCI/NETC via aggregator API.
   - **Cooldown Protection**: Enforces a 10-minute anti-spam cooldown between calls for the same vehicle to protect tenant wallet balance.
2. **SIM-based Tracking (`/tracking/sim`)**:
   - Driver mobile location tracking integrated via Freight Tiger Tether API.
   - **Driver Consent**: Sends automated SMS consent request to driver. Location pings are enabled once consent is verified.
3. **GPS Tracking (`/tracking/gps`)**:
   - Hardware telematics for company fleet with real-time latitude, longitude, address geocoding, and historical route playback.

---

## 7. Accounting & Master Ledgers
- **Document ID**: `accounts-master-ledger`
- **Category**: `accounts`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/modules/accounts/`
- **Route**: `/accounts/master-ledger`, `/accounts/vouchers`, `/accounts/transport-invoice`
- **Keywords**: `ledger, master ledger, voucher, accounting, tally prime, debit, credit, balance, invoice`

### Financial Architecture
- **Master Ledger (`/accounts/master-ledger`)**: Running balance statement for Billing Clients, Vendors, and Drivers with total debits, credits, and net receivable/payable.
- **Double-Entry Accounting (`/accounts/vouchers`)**: Conforms to standard Indian Chartered Accountant & Tally Prime Chart of Accounts:
  - `Receipt Voucher`: Inward customer payments.
  - `Payment Voucher`: Outward payments (vendor advances, driver diesel, expenses).
  - `Contra Voucher`: Cash-to-bank or bank-to-bank transfers.
  - `Journal Voucher`: Internal adjustments.
  - `Transport Invoice`: GST compliant customer billing for delivered LRs.

---

## 8. Multi-Tenancy Architecture, Issuing Offices & RBAC
- **Document ID**: `security-multi-tenancy`
- **Category**: `security`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/auth/`
- **Route**: `/company/branches`, `/company/users`, `/company/roles`
- **Keywords**: `multi tenant, tenant isolation, branch, issuing office, rbac, permissions, token, security`

### Multi-Tenancy Invariants
- Each tenant operates in an isolated PostgreSQL database (`panther_tenant_<company_code>`).
- Tenant ID is resolved securely from JWT token claims (`sub`, `tenant_id`, `company_code`). Client-supplied body or query parameters are never trusted for tenant identity.
- No cross-tenant database joins or queries exist.

### Issuing Offices (Branches)
- Every transaction (LR, Hire Challan, Voucher) belongs to a branch (`Branch`).
- Company Admins can view consolidated multi-office data (`office_id="all"`) or filter by specific branch.
- Employees can only access issuing offices explicitly mapped to them in `user_office_assignments`. Attempting to access an unassigned branch raises `403 Forbidden`.

### Plan Entitlements
- Tenant features are gated by subscription plan tier (`FREE`=1, `PRO`=2, `BUSINESS`=3, `ENTERPRISE`=4).
- Free tier includes Home, General Masters, Transport (LR, Jobs, HC), Accounts.
- Pro tier unlocks FASTag/SIM Tracking and Transport Reports.
- Business tier unlocks E-Invoicing and Fleet Management.

---

## 9. Common Application Errors & Troubleshooting
- **Document ID**: `troubleshooting-errors`
- **Category**: `errors`
- **Minimum Plan Tier**: `1` (FREE)
- **Source File**: `backend/app/core/errors.py`
- **Route**: `ALL`
- **Keywords**: `error, 401, 403, 404, 500, token expired, forbidden, entitlement locked, quota exceeded`

### Error Catalog
1. **`401 Unauthorized` / "Token was issued for a different tenant"**: User token has expired or is attempting to authenticate against a different tenant workspace. Resolution: Log out and log back in under the current company code.
2. **`403 Forbidden` / "Access to issuing office forbidden"**: An employee is attempting to view or book an LR for a branch they are not assigned to. Resolution: Request Company Admin to assign the branch in Company -> Users.
3. **`ENTITLEMENT_LOCKED`**: Feature is locked by the tenant's current subscription plan. Resolution: Upgrade subscription plan (e.g. Free to Pro for FASTag tracking).
4. **`QUOTA_EXCEEDED` / "Monthly LR limit reached"**: Tenant has reached their plan's monthly allocation. Resolution: Renew or upgrade subscription tier.
5. **"Consigner or Consignee not found"**: Mandatory loading/unloading party is missing. Resolution: Add the party under General Masters before booking the LR.

