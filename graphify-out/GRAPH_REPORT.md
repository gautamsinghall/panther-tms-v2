# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 436 files · ~687,313 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4780 nodes · 18963 edges · 198 communities (95 shown, 103 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 1799 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e7adc9c5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lr_draft_service.py
- normal-purchase/page.tsx
- test_purchase_register_voucher_e2e.py
- Button
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- Misc Accounting Groups & Categories
- sqlalchemy_ext_asyncio
- User
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- typing
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- hire-challan/page.tsx
- general-invoice/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- chat_with_copilot
- toast.ts
- general/schemas.py
- transport/schemas.py
- register_error_handlers
- test_voucher_edit_e2e.py
- typing
- GST E-Invoicing & IRN Generation (3)
- BillingClient
- LRUpdate
- Multi-Tenant Auth & Permissions
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- pytest
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- FASTag Toll & Tracking Service (8)
- control/service.py
- reports/service.py
- test_gps_tracking.py
- test_general_invoice_voucher_e2e.py
- StructuredCard
- test_auto_create_job_on_lr.py
- state-select.tsx
- tools.py
- rag.py
- ai/provider.py
- Client Component Flow
- CompanySetting
- PageHeader
- AsyncSession
- classify_intent_and_entities
- test_transport_invoice_voucher_e2e.py
- BaseModel
- SeriesMaster
- payment-voucher/page.tsx
- package.json
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- journal-voucher/page.tsx
- update_driver
- Client Component Flow (2)
- AsyncSession
- Client Component Flow (3)
- test_activity_audit_log_system.py
- formatCurrency
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- settings/roles/page.tsx
- gps-tracking-map.tsx
- create_vendor
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- AIDraft
- ForbiddenException
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- daybook/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- CacheControlMiddleware
- System Documentation & Architecture Specs
- System Documentation & Architecture Specs (2)
- Next.Config.Mjs Component Flow
- GST E-Invoicing & IRN Generation (5)
- Client Component Flow (4)
- Client Component Flow (5)
- System Documentation & Architecture Specs (3)
- System Documentation & Architecture Specs (4)
- System Documentation & Architecture Specs (5)
- UI Design System & Shared Components (2)
- UI Design System & Shared Components (3)
- UI Design System & Shared Components (4)
- UI Design System & Shared Components (5)
- UI Design System & Shared Components (6)
- Changes No14 V3.Md Component Flow
- AI Knowledge Base & RAG Index (3)
- System Documentation & Architecture Specs (6)
- System Documentation & Architecture Specs (7)
- System Documentation & Architecture Specs (8)
- Multi-Tenant Auth & Permissions (13)
- System Documentation & Architecture Specs (9)
- System Documentation & Architecture Specs (10)
- System Documentation & Architecture Specs (11)
- System Documentation & Architecture Specs (12)
- System Documentation & Architecture Specs (13)
- GST E-Invoicing & IRN Generation (7)
- System Documentation & Architecture Specs (14)
- System Documentation & Architecture Specs (15)
- System Documentation & Architecture Specs (16)
- Multi-Tenant Auth & Permissions (14)
- System Documentation & Architecture Specs (17)
- System Documentation & Architecture Specs (18)
- Settings & Numbering Series Master (7)
- System Documentation & Architecture Specs (19)
- System Documentation & Architecture Specs (20)
- System Documentation & Architecture Specs (21)
- Logistics Truck Bg.Jpg Component Flow
- Mobile Truck Hero.Jpg Component Flow
- Panther Ai Blue Icon.Webp Component Flow
- Panther Ai Icon.Png Component Flow
- Panther Logo.Jpg Component Flow
- Panther Logo Transparent.Png Component Flow
- Panther Tms Mobile Poster.Jpg Component Flow
- test_live_api.py
- ai/router.py
- email_service.py
- update_email_settings

## God Nodes (most connected - your core abstractions)
1. `User` - 546 edges
2. `Tenant` - 258 edges
3. `Branch` - 212 edges
4. `PageHeader()` - 203 edges
5. `apiClient()` - 196 edges
6. `react` - 176 edges
7. `Button` - 158 edges
8. `lucide-react` - 151 edges
9. `DataTable()` - 140 edges
10. `cn()` - 140 edges

## Surprising Connections (you probably didn't know these)
- `Asset: airtel.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/airtel.svg → docs/prd.md
- `Asset: bsnl.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/bsnl.svg → docs/prd.md
- `Asset: jio.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/jio.svg → docs/prd.md
- `Asset: vi.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/vi.svg → docs/prd.md
- `_format_sim_trip()` --calls--> `detect_telecom_operator()`  [INFERRED]
  backend/app/modules/transport/router.py → backend/app/integrations/freight_tiger/client.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (198 total, 103 thin omitted)

### Community 0 - "lr_draft_service.py"
Cohesion: 0.05
Nodes (35): parse_hc_entities_from_text(), clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent() (+27 more)

### Community 1 - "normal-purchase/page.tsx"
Cohesion: 0.05
Nodes (41): BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption, VoucherRecord (+33 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.10
Nodes (25): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), test_purchase_credit_note_records_additional_supplier_charge() (+17 more)

### Community 3 - "Button"
Cohesion: 0.03
Nodes (46): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, FastagWalletData, FastagWalletTxn, ApiCenterData (+38 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (111): LoginPage(), PlanOption, PLANS, SignupPage(), DashboardLayout(), WorkspaceCanvas(), UserAccountPage(), UserProfileData (+103 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (85): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), close_sim_trip(), create_arrival_report(), create_company_vehicle(), create_driver(), create_eway_bill() (+77 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (74): Branch, CompanyBankAccount, INDIAN_BANKS, TripDrilldown, TruckPnLData, TruckPnLVehicle, ActiveTab, DashboardPage() (+66 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.05
Nodes (102): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+94 more)

### Community 9 - "sqlalchemy_ext_asyncio"
Cohesion: 0.06
Nodes (47): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+39 more)

### Community 10 - "User"
Cohesion: 0.04
Nodes (66): Plan, Tenant, detect_language(), get_authorized_navigation_catalog(), resolve_navigation_suggestions(), call_llm(), discard_active_lr_draft(), get_ai_tenant_db() (+58 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (81): AppException, clean_vehicle_number(), update_company_vehicle(), update_market_vehicle(), update_vehicle_owner(), CompanyVehicleUpdate, GPSFleetCounts, GPSFleetResponse (+73 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (59): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+51 more)

### Community 13 - "AsyncSession"
Cohesion: 0.14
Nodes (30): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+22 more)

### Community 14 - "typing"
Cohesion: 0.09
Nodes (16): get_current_user(), QuotaExceededException, TenantInactiveException, TenantNotFoundException, generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request() (+8 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.22
Nodes (14): get_current_office(), get_user_office_context(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping() (+6 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (66): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+58 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.05
Nodes (22): detect_telecom_operator(), FreightTigerClient, SIMConsentSimulate, SIMTripClose, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, add_sim_trip_comment() (+14 more)

### Community 18 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 19 - "general-invoice/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 20 - "general/router.py"
Cohesion: 0.12
Nodes (39): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+31 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.15
Nodes (17): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+9 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (54): chat_with_copilot(), detect_language_with_history(), get_blocked_delete_message(), get_bulk_pii_refusal_message(), get_capabilities_list_markdown(), ChatMessage, ChatRequest, anyio_backend() (+46 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (149): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, EInvoiceRecord, TaxpayerDetails, FleetDoc, ServiceRecord (+141 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.05
Nodes (52): update_billing_client(), update_consignee(), update_consigner(), update_designation(), update_group_company(), update_industry(), update_load_type(), update_location() (+44 more)

### Community 25 - "transport/schemas.py"
Cohesion: 0.07
Nodes (41): ArrivalReportBase, ArrivalReportCreate, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, Consignment360Response, Consignment360SearchResult, DriverBase (+33 more)

### Community 26 - "register_error_handlers"
Cohesion: 0.36
Nodes (6): _cors_headers_for_request(), register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler(), validation_exception_handler()

### Community 27 - "test_voucher_edit_e2e.py"
Cohesion: 0.08
Nodes (33): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), get_account_by_code(), e2e_session(), test_bank_to_bank_transfer_with_charges() (+25 more)

### Community 28 - "typing"
Cohesion: 0.08
Nodes (24): PlatformAdmin, seed_plans_and_entitlements(), resolve_freight_tiger_token(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check() (+16 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 30 - "BillingClient"
Cohesion: 0.08
Nodes (28): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+20 more)

### Community 31 - "LRUpdate"
Cohesion: 0.21
Nodes (4): LRBase, LRInvoiceItem, LRResponse, LRUpdate

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.11
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.11
Nodes (31): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, DLLookupResponse (+23 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (37): create_role(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+29 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.07
Nodes (49): CompanyBankAccountCreate, CompanyBankAccountResponse, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+41 more)

### Community 37 - "pytest"
Cohesion: 0.02
Nodes (61): Entitlement, AIDraft, AIDraftStore, compute_canonical_hash(), normalize_val(), build_hc_preview_card(), normalize_vehicle_number(), validate_and_update_hc_draft() (+53 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.09
Nodes (29): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+21 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.20
Nodes (30): get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches(), get_company_setting() (+22 more)

### Community 40 - "settings/service.py"
Cohesion: 0.09
Nodes (32): list_admin_settings(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+24 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.07
Nodes (14): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), update_fastag_trip_endpoint(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse (+6 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (31): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+23 more)

### Community 43 - "reports/service.py"
Cohesion: 0.12
Nodes (44): get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_profit_and_loss(), get_purchase_register(), get_sales_register(), get_special_report() (+36 more)

### Community 44 - "test_gps_tracking.py"
Cohesion: 0.19
Nodes (15): sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection(), update_api_center_setting() (+7 more)

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.11
Nodes (27): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_general_invoice(), create_receipt_voucher() (+19 more)

### Community 46 - "StructuredCard"
Cohesion: 0.14
Nodes (18): NavigationSuggestion, addConsigneePrompt(), driverBalance(), format_currency(), getHowTo(), getKnowledge(), getLedgerSummary(), getLRFreight() (+10 more)

### Community 47 - "test_auto_create_job_on_lr.py"
Cohesion: 0.09
Nodes (35): _build_job_response(), _build_lr_response(), _location_display(), update_job(), update_lr(), JobCreate, JobUpdate, LRCreate (+27 more)

### Community 48 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 49 - "tools.py"
Cohesion: 0.08
Nodes (32): _matches_permission(), stream_chat_with_copilot(), StructuredCard, execute_accounting_tool(), execute_branch_tool(), execute_client_tool(), execute_consigner_consignee_tool(), execute_driver_tool() (+24 more)

### Community 50 - "rag.py"
Cohesion: 0.11
Nodes (7): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 51 - "ai/provider.py"
Cohesion: 0.08
Nodes (18): _call_groq(), _call_nvidia(), _call_openai(), _is_valid_key(), sanitize_ai_response(), _stream_groq(), stream_llm(), _stream_nvidia() (+10 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.18
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.14
Nodes (9): update_company(), BranchUpdate, CompanySettingUpdate, EmailSettingUpdate, get_email_setting(), update_company_setting(), update_email_setting(), CompanySetting (+1 more)

### Community 54 - "PageHeader"
Cohesion: 0.06
Nodes (120): CompanyBankAccountsPage(), ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry, numberToWords(), VoucherRecord, CreditDebitNotesPage() (+112 more)

### Community 55 - "AsyncSession"
Cohesion: 0.19
Nodes (19): create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+11 more)

### Community 56 - "classify_intent_and_entities"
Cohesion: 0.07
Nodes (18): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, get_job_guide_response() (+10 more)

### Community 57 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.26
Nodes (8): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 58 - "BaseModel"
Cohesion: 0.10
Nodes (33): ATHPaymentCreate, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, CategoryOverviewStat, CompanyBankAccountBase, CompanyBankAccountLedgerListItem, CompanyBankAccountUpdate (+25 more)

### Community 59 - "SeriesMaster"
Cohesion: 0.05
Nodes (48): Branch, CompanyVehicle, Consignee, Consigner, Location, MarketVehicle, Role, RolePermission (+40 more)

### Community 61 - "payment-voucher/page.tsx"
Cohesion: 0.15
Nodes (12): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+4 more)

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (43): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+35 more)

### Community 63 - "statements/service.py"
Cohesion: 0.16
Nodes (28): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return(), GSTInputItem (+20 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "journal-voucher/page.tsx"
Cohesion: 0.20
Nodes (8): AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm, LedgerEntryItem, numberToWords(), VoucherRecord

### Community 67 - "update_driver"
Cohesion: 1.00
Nodes (3): update_driver(), DriverUpdate, update_driver()

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "AsyncSession"
Cohesion: 0.12
Nodes (13): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_email_settings(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs() (+5 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.15
Nodes (16): BillingClientResponse, build_readable_details(), extract_client_ip(), get_activity_filters(), get_activity_stats(), log_activity(), query_activity_logs(), audit_db() (+8 more)

### Community 73 - "formatCurrency"
Cohesion: 0.03
Nodes (112): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+104 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "settings/roles/page.tsx"
Cohesion: 0.20
Nodes (9): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+1 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

### Community 80 - "create_vendor"
Cohesion: 0.33
Nodes (6): create_vendor(), update_vendor(), VendorCreate, VendorUpdate, create_vendor(), test_vendor_full_lifecycle()

### Community 83 - "AIDraft"
Cohesion: 0.05
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 84 - "ForbiddenException"
Cohesion: 0.10
Nodes (17): get_current_company_admin(), require_permission(), _check_permission(), DuplicateResourceException, EntitlementLockedException, ForbiddenException, InternalServerException, RateLimitException (+9 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 89 - "Docker Compose.Yml Component Flow (4)"
Cohesion: 0.18
Nodes (11): deploy, resources, deploy, cpus, memory, deploy, deploy, deploy (+3 more)

### Community 90 - "Docker Compose.Yml Component Flow (5)"
Cohesion: 0.18
Nodes (11): postgres, container_name, depends_on, image, networks, ports, profiles, restart (+3 more)

### Community 92 - "Docker Compose.Yml Component Flow (6)"
Cohesion: 0.20
Nodes (10): container_name, depends_on, environment, image, networks, ports, restart, redis (+2 more)

### Community 94 - "Docker Compose.Yml Component Flow (7)"
Cohesion: 0.22
Nodes (8): networks, panther-net, driver, services, volumes, pgadmin_data, postgres_data, redis_data

### Community 96 - "Docker Compose.Yml Component Flow (8)"
Cohesion: 0.33
Nodes (6): PGADMIN_CONFIG_ENHANCED_COOKIE_PROTECTION, PGADMIN_CONFIG_WTF_CSRF_CHECK_DEFAULT, PGADMIN_DEFAULT_EMAIL, PGADMIN_DEFAULT_PASSWORD, PGADMIN_LISTEN_PORT, environment

### Community 98 - "Multi-Tenant Auth & Permissions (9)"
Cohesion: 0.50
Nodes (4): config, DEMO_TENANT_IDS, isTenantId(), middleware()

### Community 100 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 186 - "ai/router.py"
Cohesion: 0.03
Nodes (74): handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), build_job_preview_card(), handle_conversational_job_booking(), is_instructional_job_inquiry(), is_job_booking_intent() (+66 more)

### Community 203 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1603 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **103 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `SIM & Telecom Tracking Integration` to `lr_draft_service.py`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `User`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `typing`, `test_issuing_office_system.py`, `general/router.py`, `chat_with_copilot`, `general/schemas.py`, `test_voucher_edit_e2e.py`, `BillingClient`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `FASTag Toll & Tracking Service (8)`, `control/service.py`, `reports/service.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `tools.py`, `ai/provider.py`, `CompanySetting`, `AsyncSession`, `ai/router.py`, `SeriesMaster`, `statements/service.py`, `update_driver`, `AsyncSession`, `test_activity_audit_log_system.py`, `update_email_settings`, `create_vendor`, `ForbiddenException`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 292 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 292 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lr_draft_service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.050239234449760764 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `User` to `lr_draft_service.py`, `SIM & Telecom Tracking Integration`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `typing`, `FreightTigerClient`, `general/router.py`, `chat_with_copilot`, `typing`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `FASTag Toll & Tracking Service (8)`, `control/service.py`, `test_gps_tracking.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `tools.py`, `ai/provider.py`, `AsyncSession`, `ai/router.py`, `SeriesMaster`, `create_vendor`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 130 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Should `normal-purchase/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04524886877828054 - nodes in this community are weakly interconnected._