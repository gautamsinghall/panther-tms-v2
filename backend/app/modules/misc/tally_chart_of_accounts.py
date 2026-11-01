"""
Tally Prime & Indian Accounting Law Standards (AS / Ind AS & Schedule III)
Pre-defined Chart of Accounts Hierarchy:
1. Primary Groups (Root Accounting Natures)
2. Groups in Primary (Second-Tier Balance Sheet & P&L Groupings)
3. Subgroups in Groups (Granular Transport & Logistics Sub-Classifications)
"""

import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.tenant_db.models import PrimaryGroup, GroupInPrimary, SubgroupInGroup, Account, CompanyBankAccount

logger = logging.getLogger("tally.chart_of_accounts")

# 1. Primary Groups (Root Natures)
PRIMARY_GROUPS_DATA = [
    {
        "code": "ASSET",
        "name": "Assets",
        "nature": "DEBIT",
        "description": "Economic resources, properties, vehicles, bank & cash balances owned by the business (Current & Fixed Assets)",
    },
    {
        "code": "LIABILITY",
        "name": "Liabilities",
        "nature": "CREDIT",
        "description": "Financial debts, borrowings, duties & taxes, and trade obligations (Current & Non-Current Liabilities)",
    },
    {
        "code": "EQUITY",
        "name": "Equity & Capital",
        "nature": "CREDIT",
        "description": "Proprietor's capital, partners' capital, share capital, and retained reserves & surplus",
    },
    {
        "code": "INCOME",
        "name": "Income / Revenue",
        "nature": "CREDIT",
        "description": "Freight charges, transportation revenue, haulage, and non-operational revenues",
    },
    {
        "code": "EXPENSE",
        "name": "Expenses",
        "nature": "DEBIT",
        "description": "Direct freight trip expenses, diesel & fuel, truck hire, driver allowances, and indirect administrative overheads",
    },
]

# 2. Groups in Primary (Pre-defined Groups matching Tally Prime & Indian Accounting Standards)
GROUPS_IN_PRIMARY_DATA = [
    # --- Under ASSET ---
    {
        "primary": "ASSET",
        "code": "FA",
        "name": "Fixed Assets",
        "description": "Long-term tangible assets: Commercial fleet, Prime movers, Trailers, Machinery, Computers & Furniture",
    },
    {
        "primary": "ASSET",
        "code": "CA",
        "name": "Current Assets",
        "description": "Short-term operating assets: Prepaid taxes, prepaid insurance, and operating advances",
    },
    {
        "primary": "ASSET",
        "code": "DEBTORS",
        "name": "Sundry Debtors",
        "description": "Trade receivables from commercial freight clients, contracting parties, and customer billing accounts",
    },
    {
        "primary": "ASSET",
        "code": "BANK",
        "name": "Bank Accounts",
        "description": "Commercial bank current accounts, freight collection accounts, and operating liquidity",
    },
    {
        "primary": "ASSET",
        "code": "CASH",
        "name": "Cash-in-hand",
        "description": "Head office cash drawers, branch petty cash accounts, and driver trip cash balances",
    },
    {
        "primary": "ASSET",
        "code": "STOCK",
        "name": "Stock-in-hand",
        "description": "Inventory of tyres, tubes, spare parts, engine oils, and consumable fleet inventory in godown",
    },
    {
        "primary": "ASSET",
        "code": "LOANS_ADV_ASSET",
        "name": "Loans & Advances (Asset)",
        "description": "Security deposits, tender EMD, supplier advances, and employee loan balances",
    },
    {
        "primary": "ASSET",
        "code": "INVESTMENTS",
        "name": "Investments",
        "description": "Bank fixed deposits, mutual funds, and government securities",
    },
    {
        "primary": "ASSET",
        "code": "MISC_EXP_ASSET",
        "name": "Misc. Expenses (Asset)",
        "description": "Preliminary incorporation expenses, unamortized insurance, and deferred revenue expenditures",
    },

    # --- Under LIABILITY ---
    {
        "primary": "LIABILITY",
        "code": "CL",
        "name": "Current Liabilities",
        "description": "Short-term obligations, accrued trip expenses, and outstanding trade payables",
    },
    {
        "primary": "LIABILITY",
        "code": "CREDITORS",
        "name": "Sundry Creditors",
        "description": "Trade payables to market vehicle owners, diesel pumps, tyre vendors, repair workshops, and brokers",
    },
    {
        "primary": "LIABILITY",
        "code": "TAX",
        "name": "Duties & Taxes",
        "description": "Statutory GST (CGST, SGST, IGST, GTA RCM), TDS Payable (Sec 194C/194J/194I), and TCS Payable",
    },
    {
        "primary": "LIABILITY",
        "code": "SECURED_LOANS",
        "name": "Secured Loans",
        "description": "Commercial vehicle term loans, bank hypothecation, and asset-backed truck financing",
    },
    {
        "primary": "LIABILITY",
        "code": "UNSECURED_LOANS",
        "name": "Unsecured Loans",
        "description": "Directors' loans, promoters' unsecured advances, and inter-corporate borrowings",
    },
    {
        "primary": "LIABILITY",
        "code": "BANK_OD",
        "name": "Bank OD A/c",
        "description": "Bank working capital overdrafts and cash credit limits against hypothecation",
    },
    {
        "primary": "LIABILITY",
        "code": "PROVISIONS",
        "name": "Provisions",
        "description": "Provisions for taxation, statutory audit fees, employee bonuses, and staff gratuity",
    },
    {
        "primary": "LIABILITY",
        "code": "SUSPENSE",
        "name": "Suspense Account",
        "description": "Unidentified banking credits or temporary ledger entries pending reconciliation",
    },

    # --- Under EQUITY ---
    {
        "primary": "EQUITY",
        "code": "CAPITAL_GRP",
        "name": "Capital Account",
        "description": "Proprietor's capital, partners' equity contributions, share capital, and drawings",
    },
    {
        "primary": "EQUITY",
        "code": "RESERVES_SURPLUS",
        "name": "Reserves & Surplus",
        "description": "Retained earnings, general reserves, capital reserves, and accumulated P&L balance",
    },

    # --- Under INCOME ---
    {
        "primary": "INCOME",
        "code": "REV_DIRECT",
        "name": "Direct Income",
        "description": "Core freight revenue: FTL, LTL part load, container haulage, and freight booking receipts",
    },
    {
        "primary": "INCOME",
        "code": "REV_INDIRECT",
        "name": "Indirect Income",
        "description": "Non-freight income: Detention/demurrage recovered, bank interest on FDs, and volume rebates",
    },
    {
        "primary": "INCOME",
        "code": "SALES_ACC",
        "name": "Sales Accounts",
        "description": "Trading sales, scrap tyre disposal, and fixed asset disposal revenues",
    },

    # --- Under EXPENSE ---
    {
        "primary": "EXPENSE",
        "code": "EXP_DIRECT",
        "name": "Direct Expenses",
        "description": "Trip carriage costs: Market vehicle hire, diesel & fuel, driver trip allowances, toll & FASTag, hamali",
    },
    {
        "primary": "EXPENSE",
        "code": "EXP_INDIRECT",
        "name": "Indirect Expenses",
        "description": "Administration overheads: Staff salaries, office rent, bank charges, legal & audit fees, depreciation",
    },
    {
        "primary": "EXPENSE",
        "code": "PURCHASE_ACC",
        "name": "Purchase Accounts",
        "description": "Fleet procurement: Tyres, tubes, lubricants, batteries, and truck spare parts",
    },
]

# 3. Subgroups in Groups (Logistics & Indian Accounting standard sub-hierarchy)
SUBGROUPS_IN_GROUP_DATA = [
    # --- Under DEBTORS ---
    {
        "group": "DEBTORS",
        "code": "DEBTORS_NORTH",
        "name": "North Region Debtors",
        "description": "Commercial clients and consigners located in Delhi, Punjab, Haryana, UP, Rajasthan, HP, J&K",
    },
    {
        "group": "DEBTORS",
        "code": "DEBTORS_SOUTH",
        "name": "South Region Debtors",
        "description": "Commercial clients and consigners located in Karnataka, Tamil Nadu, Telangana, AP, Kerala",
    },
    {
        "group": "DEBTORS",
        "code": "DEBTORS_EAST",
        "name": "East Region Debtors",
        "description": "Commercial clients and consigners located in West Bengal, Odisha, Bihar, Jharkhand, Assam",
    },
    {
        "group": "DEBTORS",
        "code": "DEBTORS_WEST",
        "name": "West Region Debtors",
        "description": "Commercial clients and consigners located in Maharashtra, Gujarat, Goa, MP, Chhattisgarh",
    },
    {
        "group": "DEBTORS",
        "code": "DEBTORS_CORP",
        "name": "Corporate Contracting Clients",
        "description": "Enterprise accounts and multi-plant manufacturing corporations with contractual credit terms",
    },
    {
        "group": "DEBTORS",
        "code": "DEBTORS_RETAIL",
        "name": "Retail & Spot Freight Clients",
        "description": "Spot booking consigners, walk-in traders, and single-consignment debtors",
    },

    # --- Under CREDITORS ---
    {
        "group": "CREDITORS",
        "code": "CRED_MARKET_VEHICLES",
        "name": "Market Vehicle Transporters",
        "description": "External truck brokers, attaching fleet owners, and hire challan transporters",
    },
    {
        "group": "CREDITORS",
        "code": "CRED_FUEL_VENDORS",
        "name": "Diesel & Fuel Vendors",
        "description": "Highway fuel pumps, authorized petroleum bunks (IOCL, BPCL, HPCL, Reliance), and diesel dealers",
    },
    {
        "group": "CREDITORS",
        "code": "CRED_TYRE_SPARES",
        "name": "Tyre & Spare Part Suppliers",
        "description": "Authorized tyre distributors, retreading agencies, and chassis parts vendors",
    },
    {
        "group": "CREDITORS",
        "code": "CRED_WORKSHOP",
        "name": "Workshop & Body Builders",
        "description": "Automobile workshops, trailer body builders, and hydraulic mechanics",
    },
    {
        "group": "CREDITORS",
        "code": "CRED_BROKERS",
        "name": "Freight Brokers & Agents",
        "description": "Intermediary commission brokers and cargo booking brokerage agencies",
    },
    {
        "group": "CREDITORS",
        "code": "CRED_GENERAL",
        "name": "General Creditors & Contractors",
        "description": "Office suppliers, IT service providers, security agencies, and general vendors",
    },

    # --- Under BANK ---
    {
        "group": "BANK",
        "code": "BANK_CURRENT",
        "name": "Current Accounts",
        "description": "Principal operational current accounts across commercial banks",
    },
    {
        "group": "BANK",
        "code": "BANK_ESCROW",
        "name": "Escrow & Nodal Accounts",
        "description": "Client deposit collection accounts, FASTag parent wallets, and escrow pools",
    },
    {
        "group": "BANK",
        "code": "BANK_AUTO_SWEEP",
        "name": "Auto-Sweep & Flexi Deposits",
        "description": "Overnight liquidity sweep deposits linked to operating current accounts",
    },

    # --- Under CASH ---
    {
        "group": "CASH",
        "code": "CASH_MAIN",
        "name": "Main Office Cash",
        "description": "Central registered office vault and cash register",
    },
    {
        "group": "CASH",
        "code": "CASH_BRANCH",
        "name": "Branch Office Petty Cash",
        "description": "Regional branch office petty cash drawers for local transit operations",
    },
    {
        "group": "CASH",
        "code": "CASH_DRIVER",
        "name": "Driver Trip Float Cash",
        "description": "En-route petty imprest cash issued to drivers for diesel and toll emergency expenses",
    },

    # --- Under TAX ---
    {
        "group": "TAX",
        "code": "TAX_GST_OUTPUT",
        "name": "GST Output Tax Payable",
        "description": "Output CGST, SGST, IGST collected on freight tax invoices issued to customers",
    },
    {
        "group": "TAX",
        "code": "TAX_GST_INPUT",
        "name": "GST Input Tax Credit (ITC)",
        "description": "Input CGST, SGST, IGST eligible on vehicle purchases, tyres, spares, and business services",
    },
    {
        "group": "TAX",
        "code": "TAX_GST_RCM",
        "name": "GST RCM Payable (GTA 5%)",
        "description": "Reverse Charge Mechanism tax payable under Section 9(3) on Goods Transport Agency bookings",
    },
    {
        "group": "TAX",
        "code": "TAX_TDS_PAYABLE",
        "name": "TDS Payable",
        "description": "Tax Deducted at Source payable under Section 194C (Transporters), 194J (Professional), 194I (Rent)",
    },
    {
        "group": "TAX",
        "code": "TAX_TCS_PAYABLE",
        "name": "TCS Payable",
        "description": "Tax Collected at Source under Section 206C",
    },

    # --- Under FA (Fixed Assets) ---
    {
        "group": "FA",
        "code": "FA_HEAVY_VEHICLES",
        "name": "Heavy Commercial Vehicles (HCV)",
        "description": "Company-owned multi-axle trucks, prime movers, 40ft/20ft trailers, and heavy haulage lorries",
    },
    {
        "group": "FA",
        "code": "FA_LIGHT_VEHICLES",
        "name": "Light Commercial Vehicles (LCV)",
        "description": "Company-owned medium and light goods carriers, pickups, and urban delivery vans",
    },
    {
        "group": "FA",
        "code": "FA_OFFICE_EQUIP",
        "name": "Office Equipment & Computers",
        "description": "Branch computers, network servers, thermal printers, and hardware GPS devices",
    },
    {
        "group": "FA",
        "code": "FA_FURNITURE",
        "name": "Furniture & Fixtures",
        "description": "Branch workstations, office furnishings, godown racks, and storage fittings",
    },

    # --- Under EXP_DIRECT ---
    {
        "group": "EXP_DIRECT",
        "code": "EXP_TRUCK_HIRE",
        "name": "Market Vehicle Hire & Lorry Freight",
        "description": "Freight hire charges paid against Hire Challans to market vehicles and attached truck owners",
    },
    {
        "group": "EXP_DIRECT",
        "code": "EXP_DIESEL_FUEL",
        "name": "Diesel & Fuel Consumption",
        "description": "Diesel fuel, AdBlue/DEF exhaust fluids, and lubricants consumed on freight trips",
    },
    {
        "group": "EXP_DIRECT",
        "code": "EXP_TOLL_FASTAG",
        "name": "Toll & FASTag Charges",
        "description": "National and State highway toll plaza disbursements, NHAI FASTag wallet deductions",
    },
    {
        "group": "EXP_DIRECT",
        "code": "EXP_DRIVER_TRIP",
        "name": "Driver Trip Bata & Allowance",
        "description": "Daily food allowance, per-km trip incentive, and loading-detention bata paid to drivers",
    },
    {
        "group": "EXP_DIRECT",
        "code": "EXP_LOADING_HAMALI",
        "name": "Hamali, Loading & Unloading",
        "description": "Manual cargo handling, forklift charges, godown stacking, and tarpaulin tying charges",
    },
    {
        "group": "EXP_DIRECT",
        "code": "EXP_ENROUTE_REPAIRS",
        "name": "En-Route Breakdown & Repairs",
        "description": "Roadside emergency repairs, puncture mending, welding, and spare part replacement during transit",
    },

    # --- Under EXP_INDIRECT ---
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_SALARIES",
        "name": "Staff Salaries & Wages",
        "description": "Administrative salaries, fleet managers, dispatch executives, and branch staff remuneration",
    },
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_OFFICE_RENT",
        "name": "Office & Godown Rent",
        "description": "Monthly lease rentals for branch dispatch hubs, warehouses, and vehicle parking yards",
    },
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_PRINTING_STATIONERY",
        "name": "Printing, Stationery & GR Books",
        "description": "Physical GR/LR books, challan stationery, computer continuous paper, and office supplies",
    },
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_LEGAL_AUDIT",
        "name": "Legal, Statutory & Audit Fees",
        "description": "Chartered Accountant statutory audit, GST consultant retainers, and legal advocate fees",
    },
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_BANK_CHARGES",
        "name": "Bank Charges & Commission",
        "description": "Bank account servicing charges, RTGS fees, cheque bounce fees, and LC/BG commissions",
    },
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_COMMUNICATION",
        "name": "Telephone, Mobile & Internet",
        "description": "Branch broadband leases, driver tracking cellular SIM cards, and official phone plans",
    },
    {
        "group": "EXP_INDIRECT",
        "code": "EXP_DEPRECIATION",
        "name": "Depreciation on Vehicles & Equipment",
        "description": "Annual written-down value (WDV) accounting depreciation on transport fleet and machinery",
    },

    # --- Under REV_DIRECT ---
    {
        "group": "REV_DIRECT",
        "code": "REV_FTL",
        "name": "Full Truck Load (FTL) Freight Income",
        "description": "Dedicated full-truck freight charges invoiced against lorry receipts (LR)",
    },
    {
        "group": "REV_DIRECT",
        "code": "REV_LTL_PART",
        "name": "Part Load (LTL) & Parcel Revenue",
        "description": "Consolidated less-than-truckload, smalls, and parcel freight carriage earnings",
    },
    {
        "group": "REV_DIRECT",
        "code": "REV_CONTAINER",
        "name": "Container Haulage & Port Inward",
        "description": "Import/export container haulage, port drayage, and ICD movement freight charges",
    },

    # --- Under REV_INDIRECT ---
    {
        "group": "REV_INDIRECT",
        "code": "REV_DETENTION",
        "name": "Detention & Halting Charges Recovered",
        "description": "Vehicle halting and demurrage penalties billed to consigners/consignees for loading delays",
    },
    {
        "group": "REV_INDIRECT",
        "code": "REV_INTEREST_FD",
        "name": "Interest on Bank Fixed Deposits",
        "description": "Accrued interest income from bank fixed deposits and commercial security deposits",
    },
    {
        "group": "REV_INDIRECT",
        "code": "REV_DISCOUNT_RCVD",
        "name": "Discounts & Rebates Received",
        "description": "Early payment discounts and volume purchase rebates from tyre manufacturers and fuel bunks",
    },

    # --- Under LOANS_ADV_ASSET ---
    {
        "group": "LOANS_ADV_ASSET",
        "code": "ADV_DRIVER_TRIP",
        "name": "Driver Trip Advances",
        "description": "Unadjusted cash and diesel slips issued to drivers before journey settlement",
    },
    {
        "group": "LOANS_ADV_ASSET",
        "code": "ADV_SUPPLIERS",
        "name": "Advances to Transporters & Suppliers",
        "description": "Advance freight advances paid to market vehicle suppliers and vendors pending final challan",
    },
    {
        "group": "LOANS_ADV_ASSET",
        "code": "ADV_SECURITY_DEP",
        "name": "Security Deposits & Tender EMD",
        "description": "Refundable earnest money deposits (EMD) and client corporate freight tender security deposits",
    },

    # --- Under SECURED_LOANS ---
    {
        "group": "SECURED_LOANS",
        "code": "LOAN_VEHICLE_FINANCE",
        "name": "Commercial Vehicle Loans (Hypothecation)",
        "description": "Commercial bank and NBFC vehicle hypothecation term loans (HDFC, ICICI, Tata Motors Finance)",
    },
    {
        "group": "SECURED_LOANS",
        "code": "LOAN_TERM_EQUIP",
        "name": "Equipment & Yard Loans",
        "description": "Long-term loans secured against yard infrastructure, material handling cranes, and forklifts",
    },

    # --- Under PROVISIONS ---
    {
        "group": "PROVISIONS",
        "code": "PROV_INCOME_TAX",
        "name": "Provision for Income Tax",
        "description": "Advance provision set aside for corporate and business income tax liability",
    },
    {
        "group": "PROVISIONS",
        "code": "PROV_AUDIT_FEES",
        "name": "Provision for Audit Fees",
        "description": "Accrued statutory audit and tax advisory fees payable at year-end",
    },
    {
        "group": "PROVISIONS",
        "code": "PROV_BONUS_EXP",
        "name": "Provision for Employee Bonus",
        "description": "Accrued annual statutory bonus and staff gratuity provisions",
    },

    # --- Under STOCK ---
    {
        "group": "STOCK",
        "code": "STOCK_TYRES",
        "name": "Tyres & Tubes Inventory",
        "description": "Closing balance of new radial tyres, nylon tyres, and retreaded casings in godown",
    },
    {
        "group": "STOCK",
        "code": "STOCK_SPARES",
        "name": "Spare Parts Inventory",
        "description": "Brake drums, suspension leaves, fan belts, and mechanical truck spare components",
    },
    {
        "group": "STOCK",
        "code": "STOCK_LUBRICANTS",
        "name": "Engine Oils & Lubricants",
        "description": "Engine lubricants, transmission fluids, grease buckets, and DEF drums in store",
    },

    # --- Under CL (Current Liabilities) ---
    {
        "group": "CL",
        "code": "CL_OUTSTANDING_EXP",
        "name": "Outstanding Expenses Payable",
        "description": "Accrued driver trip expenses, unpaid office bills, and monthly salary payables",
    },
    {
        "group": "CL",
        "code": "CL_ADV_FROM_CLIENTS",
        "name": "Advance Freight from Clients",
        "description": "Advance booking receipts collected from consigners before consignment delivery",
    },

    # --- Under CA (Current Assets) ---
    {
        "group": "CA",
        "code": "CA_PREPAID_EXP",
        "name": "Prepaid Insurance & Road Taxes",
        "description": "National permit fees, state road taxes, and annual vehicle insurance paid in advance",
    },
    {
        "group": "CA",
        "code": "CA_STAFF_IMPREST",
        "name": "Staff Imprest & Operating Float",
        "description": "Field executives' operational cash floats for RTO and border checkpost clearance",
    },

    # --- Under CAPITAL_GRP ---
    {
        "group": "CAPITAL_GRP",
        "code": "CAP_PROPRIETOR",
        "name": "Proprietor / Partners Capital",
        "description": "Initial and accumulated equity capital contributed by business proprietors or partners",
    },
    {
        "group": "CAPITAL_GRP",
        "code": "CAP_DRAWINGS",
        "name": "Proprietor / Partners Drawings",
        "description": "Personal drawings and withdrawals by enterprise owners or partners",
    },
]


# 4. Standard Core Master Ledgers (Tally Prime / Indian Accounting Standards & Schedule III)
DEFAULT_CORE_ACCOUNTS_DATA = [
    # --- Duties & Taxes (Statutory Indian GST & TDS) ---
    {"code": "ACC_GST_OUT_CGST", "name": "GST Output CGST", "group": "TAX", "subgroup": "TAX_GST_OUTPUT", "opening_balance_type": "CR"},
    {"code": "ACC_GST_OUT_SGST", "name": "GST Output SGST", "group": "TAX", "subgroup": "TAX_GST_OUTPUT", "opening_balance_type": "CR"},
    {"code": "ACC_GST_OUT_IGST", "name": "GST Output IGST", "group": "TAX", "subgroup": "TAX_GST_OUTPUT", "opening_balance_type": "CR"},
    {"code": "ACC_GST_IN_CGST", "name": "GST Input CGST", "group": "TAX", "subgroup": "TAX_GST_INPUT", "opening_balance_type": "DR"},
    {"code": "ACC_GST_IN_SGST", "name": "GST Input SGST", "group": "TAX", "subgroup": "TAX_GST_INPUT", "opening_balance_type": "DR"},
    {"code": "ACC_GST_IN_IGST", "name": "GST Input IGST", "group": "TAX", "subgroup": "TAX_GST_INPUT", "opening_balance_type": "DR"},
    {"code": "ACC_GST_RCM_LIABILITY", "name": "GST RCM Output Liability (GTA 5%)", "group": "TAX", "subgroup": "TAX_GST_RCM", "opening_balance_type": "CR"},
    {"code": "ACC_TDS_PAYABLE_194C", "name": "TDS Payable u/s 194C (Transporters/Contractors)", "group": "TAX", "subgroup": "TAX_TDS_PAYABLE", "opening_balance_type": "CR"},
    {"code": "ACC_TDS_PAYABLE_194J", "name": "TDS Payable u/s 194J (Professional/Technical)", "group": "TAX", "subgroup": "TAX_TDS_PAYABLE", "opening_balance_type": "CR"},
    {"code": "ACC_TDS_PAYABLE_194Q", "name": "TDS Payable u/s 194Q (Purchase of Goods)", "group": "TAX", "subgroup": "TAX_TDS_PAYABLE", "opening_balance_type": "CR"},
    {"code": "ACC_TCS_PAYABLE", "name": "TCS Payable u/s 206C", "group": "TAX", "subgroup": "TAX_TCS_PAYABLE", "opening_balance_type": "CR"},
    {"code": "ACC_STATUTORY_DUES", "name": "Other Statutory Dues Payable", "group": "TAX", "subgroup": "TAX_TDS_PAYABLE", "opening_balance_type": "CR"},

    # --- Current Assets & Tax Receivables ---
    {"code": "ACC_TDS_RECEIVABLE", "name": "TDS Receivable Account (Sec 194C)", "group": "CA", "subgroup": "CA_PREPAID_EXP", "opening_balance_type": "DR"},
    {"code": "ACC_TDS_194J_RECV", "name": "TDS Receivable Account (Sec 194J)", "group": "CA", "subgroup": "CA_PREPAID_EXP", "opening_balance_type": "DR"},
    {"code": "ACC_PREPAID_EXP", "name": "Prepaid Expenses & Insurance", "group": "CA", "subgroup": "CA_PREPAID_EXP", "opening_balance_type": "DR"},
    {"code": "ACC_ACCRUED_INCOME", "name": "Accrued Freight & Other Income", "group": "CA", "subgroup": "CA_PREPAID_EXP", "opening_balance_type": "DR"},

    # --- Sundry Debtors & Creditors (General) ---
    {"code": "ACC_SUNDRY_DEBTORS", "name": "General Trade Debtors", "group": "DEBTORS", "subgroup": "DEBTORS_CORP", "opening_balance_type": "DR"},
    {"code": "ACC_SUNDRY_CREDITORS", "name": "General Trade Creditors", "group": "CREDITORS", "subgroup": "CRED_GENERAL", "opening_balance_type": "CR"},

    # --- Bank & Cash Liquidity ---
    {"code": "ACC_HDFC_BANK", "name": "HDFC Bank Operating Account", "group": "BANK", "subgroup": "BANK_CURRENT", "opening_balance_type": "DR"},
    {"code": "ACC_ICICI_BANK", "name": "ICICI Bank Operating Account", "group": "BANK", "subgroup": "BANK_CURRENT", "opening_balance_type": "DR"},
    {"code": "ACC_SBI_BANK", "name": "State Bank of India (SBI) Account", "group": "BANK", "subgroup": "BANK_CURRENT", "opening_balance_type": "DR"},
    {"code": "ACC_CHEQUE_CLEARING", "name": "Cheques in Hand / Clearing Account", "group": "BANK", "subgroup": "BANK_CURRENT", "opening_balance_type": "DR"},
    {"code": "ACC_CASH", "name": "Cash-in-hand Account", "group": "CASH", "subgroup": "CASH_MAIN", "opening_balance_type": "DR"},
    {"code": "ACC_PETTY_CASH", "name": "Petty Cash Account", "group": "CASH", "subgroup": "CASH_BRANCH", "opening_balance_type": "DR"},

    # --- Advances & Loans ---
    {"code": "ACC_DRIVER_ADVANCES", "name": "Driver Trip Advances", "group": "LOANS_ADV_ASSET", "subgroup": "ADV_DRIVER_TRIP", "opening_balance_type": "DR"},
    {"code": "ACC_SUPPLIER_ADVANCES", "name": "Supplier Advances & Prepaid Expenses", "group": "LOANS_ADV_ASSET", "subgroup": "ADV_SUPPLIERS", "opening_balance_type": "DR"},

    # --- Revenue & Direct Income ---
    {"code": "ACC_FREIGHT_REV", "name": "Freight Revenue Account", "group": "REV_DIRECT", "subgroup": "REV_FTL", "opening_balance_type": "CR"},
    {"code": "ACC_GENERAL_SALES_REV", "name": "General Sales & Service Revenue", "group": "REV_DIRECT", "subgroup": "REV_FTL", "opening_balance_type": "CR"},
    {"code": "ACC_WAREHOUSE_REV", "name": "Warehousing & Storage Income", "group": "REV_DIRECT", "subgroup": "REV_FTL", "opening_balance_type": "CR"},
    {"code": "ACC_HANDLING_REV", "name": "Loading & Handling Income", "group": "REV_DIRECT", "subgroup": "REV_FTL", "opening_balance_type": "CR"},
    {"code": "ACC_DISCOUNT_RECEIVED", "name": "Discount Received on Purchases", "group": "REV_INDIRECT", "subgroup": "REV_DISCOUNT_RCVD", "opening_balance_type": "CR"},

    # --- Direct Operating Expenses ---
    {"code": "ACC_TRUCK_HIRE_EXP", "name": "Truck Hire Expense", "group": "EXP_DIRECT", "subgroup": "EXP_TRUCK_HIRE", "opening_balance_type": "DR"},
    {"code": "ACC_FUEL_EXP", "name": "Diesel & Fuel Expense", "group": "EXP_DIRECT", "subgroup": "EXP_DIESEL_FUEL", "opening_balance_type": "DR"},
    {"code": "ACC_TOLL_EXP", "name": "Toll Expense", "group": "EXP_DIRECT", "subgroup": "EXP_TOLL_FASTAG", "opening_balance_type": "DR"},
    {"code": "ACC_VEHICLE_MAINT_EXP", "name": "Vehicle Maintenance & Repair Expense", "group": "EXP_DIRECT", "subgroup": "EXP_ENROUTE_REPAIRS", "opening_balance_type": "DR"},
    {"code": "ACC_TYRE_EXP", "name": "Tyres & Tubes Expense", "group": "EXP_DIRECT", "subgroup": "EXP_ENROUTE_REPAIRS", "opening_balance_type": "DR"},
    {"code": "ACC_SPARES_EXP", "name": "Vehicle Spare Parts Expense", "group": "EXP_DIRECT", "subgroup": "EXP_ENROUTE_REPAIRS", "opening_balance_type": "DR"},
    {"code": "ACC_HANDLING_EXP", "name": "Loading, Unloading & Labour Expense", "group": "EXP_DIRECT", "subgroup": "EXP_LOADING_HAMALI", "opening_balance_type": "DR"},

    # --- Indirect Administration Overheads ---
    {"code": "ACC_DISCOUNT_ALLOWED", "name": "Consignment Discount Allowed", "group": "EXP_INDIRECT", "subgroup": "EXP_BANK_CHARGES", "opening_balance_type": "DR"},
    {"code": "ACC_OFFICE_EXP", "name": "Office Supplies & Admin Expense", "group": "EXP_INDIRECT", "subgroup": "EXP_PRINTING_STATIONERY", "opening_balance_type": "DR"},
    {"code": "ACC_BANK_CHARGES_EXP", "name": "Bank Charges & Commission Expense", "group": "EXP_INDIRECT", "subgroup": "EXP_BANK_CHARGES", "opening_balance_type": "DR"},
    {"code": "ACC_DEPRECIATION_EXP", "name": "Depreciation on Vehicles & Equipment", "group": "EXP_INDIRECT", "subgroup": "EXP_DEPRECIATION", "opening_balance_type": "DR"},
    {"code": "ACC_BAD_DEBTS_EXP", "name": "Bad Debts Written Off", "group": "EXP_INDIRECT", "subgroup": "EXP_BANK_CHARGES", "opening_balance_type": "DR"},
    {"code": "ACC_ROUNDING_OFF", "name": "Round Off & Small Balances", "group": "EXP_INDIRECT", "subgroup": "EXP_BANK_CHARGES", "opening_balance_type": "DR"},

    # --- Fixed Assets & Capital ---
    {"code": "ACC_EQUIPMENT_ASSET", "name": "Office Equipment & Hardware", "group": "FA", "subgroup": "FA_OFFICE_EQUIP", "opening_balance_type": "DR"},
    {"code": "ACC_ACCUMULATED_DEP", "name": "Accumulated Depreciation Account", "group": "FA", "subgroup": "FA_HEAVY_VEHICLES", "opening_balance_type": "CR"},
    {"code": "ACC_CAPITAL", "name": "Owners / Share Capital Account", "group": "CAPITAL_GRP", "subgroup": "CAP_PROPRIETOR", "opening_balance_type": "CR"},

    # --- Current Liabilities & Provisions ---
    {"code": "ACC_CUSTOMER_ADVANCES", "name": "Customer Advances & Unapplied Receipts", "group": "CL", "subgroup": "CL_ADV_FROM_CLIENTS", "opening_balance_type": "CR"},
    {"code": "ACC_OUTSTANDING_EXP", "name": "Outstanding Expenses Payable", "group": "CL", "subgroup": "CL_OUTSTANDING_EXP", "opening_balance_type": "CR"},
    {"code": "ACC_PROVISION_EXP", "name": "Provision for Expenses & Contingencies", "group": "CL", "subgroup": "CL_OUTSTANDING_EXP", "opening_balance_type": "CR"},
    {"code": "ACC_PROVISION_DOUBTFUL", "name": "Provision for Doubtful Debts", "group": "CL", "subgroup": "CL_OUTSTANDING_EXP", "opening_balance_type": "CR"},
]


async def seed_indian_accounting_chart_of_accounts(session: AsyncSession) -> Dict[str, Any]:
    """
    Safely seeds or synchronizes the complete Tally Prime Chart of Accounts
    as per Indian Accounting Law Standards (AS / Ind AS & Schedule III).
    Preserves all existing user records and adds any missing groups or subgroups.
    Also ensures all standard core accounts (Duties & Taxes, Freight Revenue, Bank, etc.)
    exist and are correctly bound with their Primary Group, Group in Primary, and Subgroup in Group.
    """
    logger.info("Starting Tally Prime / Indian Accounting Chart of Accounts synchronization...")
    primary_seeded = 0
    groups_seeded = 0
    subgroups_seeded = 0
    accounts_seeded = 0
    accounts_healed = 0

    # 1. Primary Groups
    primary_map: Dict[str, int] = {}
    for pg_data in PRIMARY_GROUPS_DATA:
        stmt = select(PrimaryGroup).where(PrimaryGroup.code == pg_data["code"])
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if not existing:
            existing = PrimaryGroup(**pg_data)
            session.add(existing)
            await session.flush()
            primary_seeded += 1
        primary_map[pg_data["code"]] = existing.id

    # 2. Groups in Primary
    group_map: Dict[str, int] = {}
    for g_data in GROUPS_IN_PRIMARY_DATA:
        primary_id = primary_map.get(g_data["primary"])
        if not primary_id:
            continue

        stmt = select(GroupInPrimary).where(GroupInPrimary.code == g_data["code"])
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if not existing:
            existing = GroupInPrimary(
                primary_group_id=primary_id,
                code=g_data["code"],
                name=g_data["name"],
                description=g_data["description"],
            )
            session.add(existing)
            await session.flush()
            groups_seeded += 1
        else:
            if existing.primary_group_id != primary_id:
                existing.primary_group_id = primary_id
                await session.flush()
        group_map[g_data["code"]] = existing.id

    # 3. Subgroups in Group
    subgroup_map: Dict[str, int] = {}
    for sub_data in SUBGROUPS_IN_GROUP_DATA:
        group_id = group_map.get(sub_data["group"])
        if not group_id:
            continue

        stmt = select(SubgroupInGroup).where(SubgroupInGroup.code == sub_data["code"])
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()
        if not existing:
            existing = SubgroupInGroup(
                group_id=group_id,
                code=sub_data["code"],
                name=sub_data["name"],
                description=sub_data["description"],
            )
            session.add(existing)
            await session.flush()
            subgroups_seeded += 1
        else:
            if existing.group_id != group_id:
                existing.group_id = group_id
                await session.flush()
        subgroup_map[sub_data["code"]] = existing.id

    # 4. Standard Core Accounts (including Duties & Taxes: GST Output/Input/RCM, TDS, TCS)
    for acc_data in DEFAULT_CORE_ACCOUNTS_DATA:
        g_id = group_map.get(acc_data["group"])
        sg_id = subgroup_map.get(acc_data["subgroup"])
        if not g_id:
            continue

        stmt = select(Account).where(Account.code == acc_data["code"])
        res = await session.execute(stmt)
        existing_acc = res.scalar_one_or_none()
        if not existing_acc:
            new_acc = Account(
                code=acc_data["code"],
                name=acc_data["name"],
                group_id=g_id,
                subgroup_id=sg_id,
                opening_balance=Decimal("0.00"),
                opening_balance_type=acc_data["opening_balance_type"],
                is_active=True,
            )
            session.add(new_acc)
            await session.flush()
            accounts_seeded += 1
        else:
            # Heal existing account's group and subgroup binding if missing or mismatched
            needs_update = False
            if existing_acc.group_id != g_id:
                existing_acc.group_id = g_id
                needs_update = True
            if sg_id and existing_acc.subgroup_id != sg_id:
                existing_acc.subgroup_id = sg_id
                needs_update = True
            if needs_update:
                await session.flush()
                accounts_healed += 1

    # 5. Heal party accounts and any accounts with missing subgroups
    all_accounts = (await session.execute(select(Account))).scalars().all()
    debtors_gid = group_map.get("DEBTORS")
    debtors_sgid = subgroup_map.get("DEBTORS_CORP")
    creditors_gid = group_map.get("CREDITORS")
    creditors_sgid = subgroup_map.get("CRED_MARKET_VEHICLES")
    driver_adv_gid = group_map.get("LOANS_ADV_ASSET")
    driver_adv_sgid = subgroup_map.get("ADV_DRIVER_TRIP")
    bank_gid = group_map.get("BANK")
    bank_sgid = subgroup_map.get("BANK_CURRENT")

    for acc in all_accounts:
        updated = False
        # Billing Clients -> Sundry Debtors
        if acc.billing_client_id:
            if debtors_gid and acc.group_id != debtors_gid:
                acc.group_id = debtors_gid
                updated = True
            if debtors_sgid and acc.subgroup_id != debtors_sgid:
                acc.subgroup_id = debtors_sgid
                updated = True
        # Vendors -> Sundry Creditors
        elif acc.vendor_id:
            if creditors_gid and acc.group_id != creditors_gid:
                acc.group_id = creditors_gid
                updated = True
            if creditors_sgid and acc.subgroup_id != creditors_sgid:
                acc.subgroup_id = creditors_sgid
                updated = True
        # Drivers -> Loans & Advances (Asset) -> Driver Trip Advances
        elif acc.driver_id:
            if driver_adv_gid and acc.group_id != driver_adv_gid:
                acc.group_id = driver_adv_gid
                updated = True
            if driver_adv_sgid and acc.subgroup_id != driver_adv_sgid:
                acc.subgroup_id = driver_adv_sgid
                updated = True
            if acc.opening_balance_type != "DR":
                acc.opening_balance_type = "DR"
                updated = True
        # Fallback: if subgroup_id is missing, attach first subgroup of that group
        elif not acc.subgroup_id and acc.group_id:
            sub_res = await session.execute(
                select(SubgroupInGroup.id).where(SubgroupInGroup.group_id == acc.group_id).limit(1)
            )
            first_sub_id = sub_res.scalar_one_or_none()
            if first_sub_id:
                acc.subgroup_id = first_sub_id
                updated = True

        if updated:
            accounts_healed += 1

    await session.commit()
    logger.info(
        f"Tally Prime Chart of Accounts sync complete. "
        f"Primary Groups added: {primary_seeded}, Groups added: {groups_seeded}, Subgroups added: {subgroups_seeded}, "
        f"Core Accounts seeded: {accounts_seeded}, Accounts healed: {accounts_healed}"
    )

    total_pg = (await session.execute(select(func.count(PrimaryGroup.id)))).scalar() or len(primary_map)
    total_g = (await session.execute(select(func.count(GroupInPrimary.id)))).scalar() or len(group_map)
    total_sg = (await session.execute(select(func.count(SubgroupInGroup.id)))).scalar() or len(subgroup_map)

    return {
        "status": "SUCCESS",
        "primary_groups_seeded": primary_seeded,
        "groups_seeded": groups_seeded,
        "subgroups_seeded": subgroups_seeded,
        "core_accounts_seeded": accounts_seeded,
        "accounts_healed": accounts_healed,
        "total_primary_groups": total_pg,
        "total_groups": total_g,
        "total_subgroups": total_sg,
    }
