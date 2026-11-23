# Graph Report - panther-tms-v2  (2026-11-23)

## Corpus Check
- 433 files · ~663,869 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4693 nodes · 18640 edges · 203 communities (99 shown, 104 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 1670 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d290b997`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transport-invoice/page.tsx
- signup/page.tsx
- test_purchase_register_voucher_e2e.py
- Button
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- Misc Accounting Groups & Categories
- FASTag Toll & Tracking Service (2)
- User
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- AIDraftStore
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- utils.ts
- badge.tsx
- general/router.py
- allocate_or_validate_voucher_number
- LR
- toast.ts
- general/schemas.py
- transport/schemas.py
- errors.py
- accounts/schemas.py
- FASTag Toll & Tracking Service (5)
- GST E-Invoicing & IRN Generation (3)
- test_lr_excel_import.py
- hire_challan_draft_service.py
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
- Multi-Tenant Auth & Permissions (3)
- reports/service.py
- classify_intent_and_entities
- test_gps_tracking.py
- ai/schemas.py
- payment-voucher/page.tsx
- state-select.tsx
- package.json
- AI Knowledge Base & RAG Index
- test_lr_excel_import.py
- Client Component Flow
- CompanySetting
- PageHeader
- AsyncSession
- ai/router.py
- toast-provider.tsx
- accounts/schemas.py
- lr_draft_service.py
- Any
- dependencies
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- GSPProviderInterface
- tenancy.py
- normal-purchase/page.tsx
- Client Component Flow (2)
- lr-client-wise/page.tsx
- Client Component Flow (3)
- test_activity_audit_log_system.py
- lr-register/page.tsx
- Transport LR & GR Booking Engine (3)
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- update_fastag_trip_endpoint
- gps-tracking-map.tsx
- AI Knowledge Base & RAG Index (2)
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- Draft_Store Component Flow (3)
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- Draft_Store Component Flow (4)
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
- _resolve_or_create_location
- general-purchase/page.tsx
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
- theme-context.tsx
- scripts
- main.py
- create_vehicle_owner
- record_tracking_ping
- get
- tailwindcss
- settings/roles/page.tsx
- hc-register/page.tsx

## God Nodes (most connected - your core abstractions)
1. `User` - 537 edges
2. `Tenant` - 258 edges
3. `Branch` - 217 edges
4. `PageHeader()` - 203 edges
5. `apiClient()` - 197 edges
6. `react` - 175 edges
7. `Button` - 158 edges
8. `lucide-react` - 150 edges
9. `DataTable()` - 142 edges
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
- `test_job_create_and_update_with_locations()` --uses--> `JobUpdate`  [INFERRED]
  backend/tests/test_job_origin_destination.py → backend/app/modules/transport/schemas.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (203 total, 104 thin omitted)

### Community 0 - "transport-invoice/page.tsx"
Cohesion: 0.14
Nodes (15): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, amountToWords() (+7 more)

### Community 1 - "signup/page.tsx"
Cohesion: 0.19
Nodes (13): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+5 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.13
Nodes (22): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), test_driver_advance_is_current_asset_not_immediate_expense() (+14 more)

### Community 3 - "Button"
Cohesion: 0.05
Nodes (59): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+51 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (134): DashboardLayout(), WorkspaceCanvas(), SeriesCategoryItem, SeriesMasterItem, STANDARD_VOUCHERS, LRBookingPage(), LRRecord, SelectOption (+126 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.04
Nodes (81): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_lr_response(), close_sim_trip(), create_company_vehicle(), create_driver() (+73 more)

### Community 6 - "cn"
Cohesion: 0.05
Nodes (69): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+61 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (89): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+81 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.05
Nodes (92): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+84 more)

### Community 9 - "FASTag Toll & Tracking Service (2)"
Cohesion: 0.04
Nodes (64): ensure_unified_creditor_vendors(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account(), list_billing_client_ledgers(), list_company_bank_account_ledgers(), list_company_vehicle_ledgers() (+56 more)

### Community 10 - "User"
Cohesion: 0.04
Nodes (96): Plan, Tenant, handle_conversational_job_booking(), get_authorized_navigation_catalog(), resolve_navigation_suggestions(), handle_conversational_lr_booking(), clear_chat_session(), discard_active_lr_draft() (+88 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (78): AppException, create_eway_bill(), create_truck_hiring_note(), EWayBillCreate, TruckHiringNoteCreate, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit() (+70 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (61): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+53 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.29
Nodes (13): get_all_lrs(), test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_lr_print_master_data_resolution(), test_null_legacy_data_visibility_audit() (+5 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (66): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+58 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.06
Nodes (12): resolve_freight_tiger_token(), detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_sim_wallet_balance(), SIMTripRecord (+4 more)

### Community 18 - "utils.ts"
Cohesion: 0.05
Nodes (45): FleetDoc, ServiceRecord, TyreItem, VehicleHealth, FastagTrackingPage(), FastagTripSummary, LRSummary, CompanyVehicleRecord (+37 more)

### Community 19 - "badge.tsx"
Cohesion: 0.04
Nodes (51): Branch, CompanyBankAccount, INDIAN_BANKS, AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm (+43 more)

### Community 20 - "general/router.py"
Cohesion: 0.11
Nodes (52): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+44 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.14
Nodes (17): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+9 more)

### Community 22 - "LR"
Cohesion: 0.04
Nodes (77): Entitlement, PlatformAdmin, validate_and_update_job_draft(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), ChatMessage, ChatRequest, CompanyVehicle (+69 more)

### Community 23 - "toast.ts"
Cohesion: 0.05
Nodes (119): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, EInvoiceRecord, TaxpayerDetails, BillingClientPageProps, BillingClientRecord (+111 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (43): BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase (+35 more)

### Community 25 - "transport/schemas.py"
Cohesion: 0.06
Nodes (54): create_arrival_report(), ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate (+46 more)

### Community 26 - "errors.py"
Cohesion: 0.12
Nodes (13): _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, QuotaExceededException, RateLimitException, register_error_handlers(), app_exception_handler() (+5 more)

### Community 27 - "accounts/schemas.py"
Cohesion: 0.08
Nodes (34): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), generate_voucher_number(), get_account_by_code(), e2e_session() (+26 more)

### Community 28 - "FASTag Toll & Tracking Service (5)"
Cohesion: 0.10
Nodes (21): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), lifespan(), normalize_tenant_locations_background(), seed_demo() (+13 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.13
Nodes (19): get_gsp_provider(), GSPProviderInterface, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response() (+11 more)

### Community 30 - "test_lr_excel_import.py"
Cohesion: 0.14
Nodes (14): generate_job_import_template(), generate_lr_import_template(), import_lrs_from_excel(), _normalize_lr_header(), create_sample_lr_excel(), test_db(), test_lr_import_chronological_ordering_and_job_autocreation(), test_lr_import_continues_from_last_series_count() (+6 more)

### Community 31 - "hire_challan_draft_service.py"
Cohesion: 0.16
Nodes (7): build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), normalize_vehicle_number(), parse_hc_entities_from_text(), validate_and_update_hc_draft(), test_hc_intent_classification()

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.13
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.09
Nodes (37): ApiCenterSettingResponse, ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest (+29 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (33): get_permissions_schema(), get_permissions_schema_endpoint(), list_roles(), list_users(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse (+25 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.04
Nodes (85): CompanyBankAccountResponse, CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAgainstInvoiceCreate, ReceiptAllocationItem, ReceiptVoucherCreate, TransportInvoiceCreate (+77 more)

### Community 37 - "pytest"
Cohesion: 0.03
Nodes (66): AIDraft, compute_canonical_hash(), normalize_val(), confirm_hire_challan_draft(), confirm_job_draft(), confirm_lr_draft(), ConfirmHireChallanDraftRequest, ConfirmJobDraftRequest (+58 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.09
Nodes (30): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+22 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.17
Nodes (35): sanitize_ft_base_url(), get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch() (+27 more)

### Community 40 - "settings/service.py"
Cohesion: 0.15
Nodes (22): list_admin_settings(), create_new_role(), create_new_user(), create_series_category(), delete_existing_role(), delete_series_category(), delete_series_master(), get_activity_filters_service() (+14 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.14
Nodes (4): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates()

### Community 42 - "Multi-Tenant Auth & Permissions (3)"
Cohesion: 0.10
Nodes (30): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+22 more)

### Community 43 - "reports/service.py"
Cohesion: 0.13
Nodes (38): trigger_report_export(), BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse (+30 more)

### Community 44 - "classify_intent_and_entities"
Cohesion: 0.04
Nodes (34): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, detect_language() (+26 more)

### Community 45 - "test_gps_tracking.py"
Cohesion: 0.10
Nodes (16): clean_vehicle_number(), geocode_gps_endpoint(), GPSConfigResponse, GPSVehicleItem, extract_location_text(), fetch_all_wheelseye_vehicles(), format_wheelseye_vehicle(), get_company_vehicles_set() (+8 more)

### Community 46 - "ai/schemas.py"
Cohesion: 0.19
Nodes (9): get_active_lr_draft(), get_ai_status(), get_context_suggestions(), AIStatusResponse, ChatResponse, ContextSuggestionResponse, HireChallanConfirmationResponse, JobConfirmationResponse (+1 more)

### Community 47 - "payment-voucher/page.tsx"
Cohesion: 0.18
Nodes (10): AccountOption, AllocationRow, BillAllocationItem, DriverOption, HireChallanOption, LedgerEntry, numberToWords(), OpenBill (+2 more)

### Community 48 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 49 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 50 - "AI Knowledge Base & RAG Index"
Cohesion: 0.07
Nodes (11): KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks(), test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane() (+3 more)

### Community 51 - "test_lr_excel_import.py"
Cohesion: 0.15
Nodes (13): list_consignees(), list_consigners(), list_locations(), import_jobs_from_excel(), _normalize_header(), _parse_date(), create_sample_excel(), test_db() (+5 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.21
Nodes (6): BranchUpdate, CompanySettingUpdate, EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 54 - "PageHeader"
Cohesion: 0.05
Nodes (113): CompanyBankAccountsPage(), ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry, numberToWords(), VoucherRecord, BillAllocationRecord (+105 more)

### Community 55 - "AsyncSession"
Cohesion: 0.13
Nodes (23): check_series(), create_role(), create_series_category(), create_series_master(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+15 more)

### Community 56 - "ai/router.py"
Cohesion: 0.03
Nodes (92): _matches_permission(), is_hire_challan_intent(), is_instructional_hc_inquiry(), is_instructional_job_inquiry(), is_job_booking_intent(), is_job_cancel_intent(), build_system_prompt(), format_page_registry_entry() (+84 more)

### Community 57 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 58 - "accounts/schemas.py"
Cohesion: 0.09
Nodes (41): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_generic_account_ledger_detail(), get_vendor_ledger_detail(), ATHPaymentCreate, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate (+33 more)

### Community 59 - "lr_draft_service.py"
Cohesion: 0.04
Nodes (41): build_job_preview_card(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), clean_party_name(), extract_booking_entities_via_llm(), is_grounded_in_text(), is_instructional_inquiry() (+33 more)

### Community 62 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+9 more)

### Community 63 - "statements/service.py"
Cohesion: 0.10
Nodes (40): get_current_company_admin(), get_current_office(), require_permission(), _check_permission(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission() (+32 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 67 - "tenancy.py"
Cohesion: 0.11
Nodes (14): TenantInactiveException, TenantNotFoundException, generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code() (+6 more)

### Community 68 - "normal-purchase/page.tsx"
Cohesion: 0.06
Nodes (30): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+22 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "lr-client-wise/page.tsx"
Cohesion: 0.24
Nodes (8): ColumnConfig, formatDateDisplay(), getDefaultFinancialYearDates(), LRClientWiseGroup, LRClientWisePage(), LRClientWiseRecord, MONTH_NAMES, TABLE_COLUMNS

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.12
Nodes (16): BillingClientResponse, build_readable_details(), extract_client_ip(), get_activity_filters(), get_activity_stats(), query_activity_logs(), UserOfficeAssignment, audit_db() (+8 more)

### Community 73 - "lr-register/page.tsx"
Cohesion: 0.23
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, CustomerOption, formatDateDisplay(), formatLocation(), formatOfficeName(), getDefaultFinancialYearDates(), LRRegisterPage() (+2 more)

### Community 75 - "Transport LR & GR Booking Engine (3)"
Cohesion: 0.23
Nodes (3): LRBase, LRInvoiceItem, LRUpdate

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "update_fastag_trip_endpoint"
Cohesion: 0.29
Nodes (3): update_fastag_trip_endpoint(), update_sim_trip(), update_sim_trip()

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

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

### Community 103 - "_resolve_or_create_location"
Cohesion: 0.70
Nodes (3): _resolve_or_create_location(), test_resolve_location_autocreate_when_missing(), test_resolve_location_city_state_pincode()

### Community 104 - "general-purchase/page.tsx"
Cohesion: 0.17
Nodes (9): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+1 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 181 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 182 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 183 - "main.py"
Cohesion: 0.11
Nodes (8): CacheControlMiddleware, health_check(), preflight_handler(), root(), test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 184 - "create_vehicle_owner"
Cohesion: 1.00
Nodes (3): create_vehicle_owner(), VehicleOwnerCreate, create_vehicle_owner()

### Community 185 - "record_tracking_ping"
Cohesion: 1.00
Nodes (3): record_tracking_ping(), TrackingPingCreate, record_tracking_ping()

### Community 186 - "get"
Cohesion: 0.18
Nodes (15): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+7 more)

### Community 187 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 188 - "settings/roles/page.tsx"
Cohesion: 0.23
Nodes (10): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+2 more)

### Community 191 - "hc-register/page.tsx"
Cohesion: 0.21
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+2 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1563 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **104 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `test_purchase_register_voucher_e2e.py`, `SIM & Telecom Tracking Integration`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `FASTag Toll & Tracking Service (2)`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `test_issuing_office_system.py`, `general/router.py`, `LR`, `transport/schemas.py`, `accounts/schemas.py`, `test_lr_excel_import.py`, `hire_challan_draft_service.py`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `Multi-Tenant Auth & Permissions (3)`, `reports/service.py`, `classify_intent_and_entities`, `test_gps_tracking.py`, `ai/schemas.py`, `test_lr_excel_import.py`, `AsyncSession`, `ai/router.py`, `create_vehicle_owner`, `get`, `lr_draft_service.py`, `record_tracking_ping`, `statements/service.py`, `test_activity_audit_log_system.py`, `update_fastag_trip_endpoint`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Are the 292 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 292 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `transport-invoice/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `User` to `test_purchase_register_voucher_e2e.py`, `SIM & Telecom Tracking Integration`, `Misc Accounting Groups & Categories`, `FASTag Toll & Tracking Service (2)`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `FreightTigerClient`, `general/router.py`, `LR`, `transport/schemas.py`, `FASTag Toll & Tracking Service (5)`, `hire_challan_draft_service.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `Multi-Tenant Auth & Permissions (3)`, `reports/service.py`, `classify_intent_and_entities`, `ai/schemas.py`, `main.py`, `ai/router.py`, `AsyncSession`, `get`, `lr_draft_service.py`, `create_vehicle_owner`, `statements/service.py`, `tenancy.py`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 131 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 131 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_purchase_register_voucher_e2e.py` be split into smaller, more focused modules?**
  _Cohesion score 0.132890365448505 - nodes in this community are weakly interconnected._