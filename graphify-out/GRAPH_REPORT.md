# Graph Report - panther-tms-v2  (2026-11-23)

## Corpus Check
- 432 files · ~660,178 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4673 nodes · 18643 edges · 200 communities (100 shown, 100 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 1811 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5301234`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- PageHeader
- test_purchase_register_voucher_e2e.py
- GST E-Invoicing & IRN Generation
- getStoredAuth
- SIM & Telecom Tracking Integration
- SIM & Telecom Tracking Integration (2)
- Fleet & Vehicle Maintenance Operations
- Misc Accounting Groups & Categories
- FASTag Toll & Tracking Service (2)
- User
- SIM & Telecom Tracking Integration (3)
- Accounts Voucher & Banking System (2)
- general-invoice/page.tsx
- get_voucher_by_id
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- hire-challan/page.tsx
- master-ledger/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- tenant_db/models.py
- form.tsx
- general/schemas.py
- transport/schemas.py
- errors.py
- accounts/schemas.py
- FASTag Toll & Tracking Service (5)
- GST E-Invoicing & IRN Generation (3)
- tools.py
- AIDraft
- Multi-Tenant Auth & Permissions
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- uuid
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- FASTag Toll & Tracking Service (8)
- Multi-Tenant Auth & Permissions (3)
- reports/service.py
- classify_intent_and_entities
- test_gps_tracking.py
- typing
- get
- update_api_center
- test_live_api.py
- AI Knowledge Base & RAG Index
- test_lr_excel_import.py
- Client Component Flow
- CompanySetting
- PageHeader
- AsyncSession
- ai/router.py
- Any
- accounts/schemas.py
- test_ai_copilot.py
- misc/schemas.py
- package.json
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- test_phase6_exit_criteria.py
- tenancy.py
- Draft_Store Component Flow
- Client Component Flow (2)
- lr_draft_service.py
- Client Component Flow (3)
- test_activity_audit_log_system.py
- lr-register/page.tsx
- Transport LR & GR Booking Engine (3)
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- next
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
- GroupInPrimary
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- test_contra_voucher_e2e.py
- purchases/page.tsx
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
- tracking/fastag/page.tsx
- transport-invoice/page.tsx
- main.py
- test_transport_invoice_voucher_e2e.py
- get
- settings/roles/page.tsx
- hc-register/page.tsx
- update_fastag_trip_endpoint
- EWayBill
- get_all_tenant_db_names
- process_async_job
- e2e_session

## God Nodes (most connected - your core abstractions)
1. `User` - 537 edges
2. `Tenant` - 261 edges
3. `Branch` - 220 edges
4. `PageHeader()` - 201 edges
5. `apiClient()` - 193 edges
6. `react` - 174 edges
7. `Button` - 156 edges
8. `lucide-react` - 149 edges
9. `DataTable()` - 140 edges
10. `chat_with_copilot()` - 139 edges

## Surprising Connections (you probably didn't know these)
- `Asset: airtel.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/airtel.svg → docs/prd.md
- `Asset: bsnl.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/bsnl.svg → docs/prd.md
- `Asset: jio.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/jio.svg → docs/prd.md
- `Asset: vi.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/vi.svg → docs/prd.md
- `test_billing_client_ledger_lifecycle()` --uses--> `VoucherCreate`  [INFERRED]
  backend/tests/test_master_ledger_system.py → backend/app/modules/accounts/schemas.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (200 total, 100 thin omitted)

### Community 1 - "PageHeader"
Cohesion: 0.05
Nodes (64): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+56 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.09
Nodes (24): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), VoucherItem (+16 more)

### Community 3 - "GST E-Invoicing & IRN Generation"
Cohesion: 0.04
Nodes (124): ContraAccountOption, ContraType, LedgerEntry, VoucherRecord, VoucherRecord, BillingClientItem, LedgerEntry, VoucherRecord (+116 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (127): DashboardLayout(), WorkspaceCanvas(), SeriesCategoryItem, SeriesMasterItem, STANDARD_VOUCHERS, LRBookingPage(), LRRecord, SelectOption (+119 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (71): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_lr_response(), close_sim_trip(), create_fastag_trip_endpoint(), create_hire_challan(), create_job() (+63 more)

### Community 6 - "SIM & Telecom Tracking Integration (2)"
Cohesion: 0.06
Nodes (58): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+50 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (91): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+83 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.07
Nodes (69): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+61 more)

### Community 9 - "FASTag Toll & Tracking Service (2)"
Cohesion: 0.07
Nodes (42): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+34 more)

### Community 10 - "User"
Cohesion: 0.03
Nodes (103): Plan, Tenant, handle_conversational_job_booking(), get_authorized_navigation_catalog(), handle_conversational_lr_booking(), clear_chat_session(), confirm_hire_challan_draft(), discard_active_lr_draft() (+95 more)

### Community 11 - "SIM & Telecom Tracking Integration (3)"
Cohesion: 0.04
Nodes (74): AppException, detect_telecom_operator(), create_company_vehicle(), create_driver(), create_market_vehicle(), create_vehicle_owner(), fetch_eway_bill_details(), record_tracking_ping() (+66 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.06
Nodes (58): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+50 more)

### Community 13 - "general-invoice/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 14 - "get_voucher_by_id"
Cohesion: 0.11
Nodes (31): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+23 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.29
Nodes (13): get_all_lrs(), test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_lr_print_master_data_resolution(), test_null_legacy_data_visibility_audit() (+5 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (68): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+60 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.06
Nodes (11): resolve_freight_tiger_token(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripResponse, SIMTripUpdate, close_sim_trip(), SimWalletTransaction (+3 more)

### Community 18 - "hire-challan/page.tsx"
Cohesion: 0.11
Nodes (18): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+10 more)

### Community 19 - "master-ledger/page.tsx"
Cohesion: 0.14
Nodes (13): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+5 more)

### Community 20 - "general/router.py"
Cohesion: 0.12
Nodes (40): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+32 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.15
Nodes (16): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+8 more)

### Community 22 - "tenant_db/models.py"
Cohesion: 0.03
Nodes (91): Entitlement, QuotaExceededException, validate_and_update_job_draft(), confirm_job_draft(), confirm_lr_draft(), ConfirmJobDraftRequest, ConfirmLRDraftRequest, _resolve_or_create_location() (+83 more)

### Community 23 - "form.tsx"
Cohesion: 0.05
Nodes (59): BranchItem, IssuingOfficesPage(), BillingClientPageProps, BillingClientRecord, defaultInitialValues, ConsigneePageProps, ConsigneeRecord, ConsignerPageProps (+51 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.05
Nodes (55): update_billing_client(), update_consignee(), update_consigner(), update_designation(), update_group_company(), update_industry(), update_load_type(), update_location() (+47 more)

### Community 25 - "transport/schemas.py"
Cohesion: 0.08
Nodes (46): create_arrival_report(), create_pod_record(), create_truck_hiring_note(), transition_lr_status(), verify_pod_record(), ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse (+38 more)

### Community 26 - "errors.py"
Cohesion: 0.11
Nodes (12): _cors_headers_for_request(), DuplicateResourceException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler() (+4 more)

### Community 27 - "accounts/schemas.py"
Cohesion: 0.11
Nodes (26): JournalEntryLineCreate, JournalVoucherCreate, calculate_account_balance(), create_journal_voucher(), get_account_by_code(), preview_journal_voucher(), update_journal_voucher(), journal_session() (+18 more)

### Community 28 - "FASTag Toll & Tracking Service (5)"
Cohesion: 0.11
Nodes (17): close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), run_migration(), run_migration(), run_migration(), run_migration() (+9 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.15
Nodes (18): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+10 more)

### Community 30 - "tools.py"
Cohesion: 0.08
Nodes (29): _matches_permission(), stream_chat_with_copilot(), execute_accounting_tool(), execute_branch_tool(), execute_client_tool(), execute_consigner_consignee_tool(), execute_driver_tool(), execute_einvoice_tool() (+21 more)

### Community 31 - "AIDraft"
Cohesion: 0.08
Nodes (10): AIDraft, compute_canonical_hash(), normalize_val(), build_hc_preview_card(), handle_conversational_hc_booking(), normalize_vehicle_number(), parse_hc_entities_from_text(), validate_and_update_hc_draft() (+2 more)

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.12
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.13
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.11
Nodes (42): change_user_password(), create_new_branch(), test_dl(), test_ewb(), test_gst(), test_pan(), test_rc(), test_wheelseye() (+34 more)

### Community 35 - "settings/router.py"
Cohesion: 0.15
Nodes (31): create_role(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+23 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.07
Nodes (40): CompanyBankAccountResponse, VoucherCreate, calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_payment_against_purchase() (+32 more)

### Community 37 - "uuid"
Cohesion: 0.06
Nodes (12): test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud(), test_phase1_exit_criteria_e2e(), test_general_module_crud_masters(), test_rbac_custom_role_and_employee_restrictions(), test_phase2_end_to_end_exit_criteria() (+4 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.09
Nodes (31): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+23 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.16
Nodes (35): sanitize_ft_base_url(), get_gst_pan_client(), MonthlyPnLItem, SimWalletTransactionItem, TaxApiCounterResponse, TaxApiTransactionItem, calculate_monthly_pnl(), check_and_deduct_tax_credit() (+27 more)

### Community 40 - "settings/service.py"
Cohesion: 0.15
Nodes (22): list_admin_settings(), create_new_user(), create_series_category(), create_series_master(), delete_existing_role(), delete_series_category(), delete_series_master(), get_activity_filters_service() (+14 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.08
Nodes (17): clean_vehicle_number(), FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse (+9 more)

### Community 42 - "Multi-Tenant Auth & Permissions (3)"
Cohesion: 0.09
Nodes (34): PlatformAdmin, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete() (+26 more)

### Community 43 - "reports/service.py"
Cohesion: 0.13
Nodes (38): trigger_report_export(), BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse (+30 more)

### Community 44 - "classify_intent_and_entities"
Cohesion: 0.04
Nodes (28): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, test_e2e_hindi_hard_rule_0_delete_refusal() (+20 more)

### Community 45 - "test_gps_tracking.py"
Cohesion: 0.10
Nodes (19): geocode_gps_endpoint(), GPSConfigResponse, GPSFleetCounts, GPSFleetResponse, GPSTrackResponse, GPSTripInfo, GPSVehicleItem, extract_location_text() (+11 more)

### Community 46 - "typing"
Cohesion: 0.13
Nodes (16): get_current_company_admin(), get_current_office(), get_current_user(), require_permission(), _check_permission(), EntitlementLockedException, ForbiddenException, require_accounts_permission() (+8 more)

### Community 47 - "get"
Cohesion: 0.13
Nodes (11): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_roles() (+3 more)

### Community 48 - "update_api_center"
Cohesion: 0.33
Nodes (6): update_api_center(), update_branch_details(), update_fastag_cooldown(), update_user_account(), UserProfileUpdate, update_user_profile()

### Community 49 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 50 - "AI Knowledge Base & RAG Index"
Cohesion: 0.12
Nodes (6): KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 51 - "test_lr_excel_import.py"
Cohesion: 0.08
Nodes (24): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), create_sample_excel() (+16 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.15
Nodes (9): update_company(), update_email(), CompanySettingUpdate, EmailSettingUpdate, get_email_setting(), update_company_setting(), update_email_setting(), CompanySetting (+1 more)

### Community 54 - "PageHeader"
Cohesion: 0.04
Nodes (122): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraVoucherPage(), numberToWords(), BillAllocationRecord, CreditDebitNotesPage() (+114 more)

### Community 55 - "AsyncSession"
Cohesion: 0.24
Nodes (15): create_series_category(), create_series_master(), create_user(), delete_role(), delete_series_category(), delete_series_master(), import_default_series_template(), initialize_standard_series() (+7 more)

### Community 56 - "ai/router.py"
Cohesion: 0.03
Nodes (85): is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), is_instructional_job_inquiry(), is_job_booking_intent(), is_job_cancel_intent(), build_system_prompt(), format_page_registry_entry() (+77 more)

### Community 58 - "accounts/schemas.py"
Cohesion: 0.10
Nodes (35): reverse_journal_voucher_endpoint(), ATHPaymentCreate, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, CategoryOverviewStat, CompanyBankAccountBase, CompanyBankAccountCreate (+27 more)

### Community 59 - "test_ai_copilot.py"
Cohesion: 0.08
Nodes (21): detect_language(), resolve_navigation_suggestions(), classify_operational_intent(), test_extract_transport_entities_full(), test_follow_up_hc_context_retention(), test_instructional_query_bypasses_tool_execution(), test_intent_classification_new_modules(), test_is_instructional_inquiry_detection() (+13 more)

### Community 61 - "misc/schemas.py"
Cohesion: 0.10
Nodes (32): update_account(), update_charge_head(), update_group_in_primary(), update_primary_group(), update_subgroup(), update_tax_category(), AccountBase, AccountResponse (+24 more)

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, framer-motion@^13.4.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10 (+36 more)

### Community 63 - "statements/service.py"
Cohesion: 0.16
Nodes (28): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return(), GSTInputItem (+20 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "test_phase6_exit_criteria.py"
Cohesion: 0.08
Nodes (7): GSPProviderInterface, MockSandboxGSPProvider, test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 67 - "tenancy.py"
Cohesion: 0.12
Nodes (12): TenantNotFoundException, generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code(), _verify_tenant_active() (+4 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "lr_draft_service.py"
Cohesion: 0.03
Nodes (73): parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), clean_party_name(), extract_booking_entities_via_llm(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent() (+65 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.16
Nodes (15): BillingClientResponse, build_readable_details(), extract_client_ip(), get_activity_filters(), get_activity_stats(), log_activity(), query_activity_logs(), test_activity_logging_records_exact_details() (+7 more)

### Community 73 - "lr-register/page.tsx"
Cohesion: 0.11
Nodes (19): ColumnConfig, formatDateDisplay(), getDefaultFinancialYearDates(), LRClientWiseGroup, LRClientWisePage(), LRClientWiseRecord, MONTH_NAMES, TABLE_COLUMNS (+11 more)

### Community 75 - "Transport LR & GR Booking Engine (3)"
Cohesion: 0.23
Nodes (3): LRBase, LRInvoiceItem, LRUpdate

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "next"
Cohesion: 0.18
Nodes (15): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+7 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

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

### Community 100 - "GroupInPrimary"
Cohesion: 0.12
Nodes (11): seed_indian_accounting_chart_of_accounts(), GroupInPrimary, GroupNature, PrimaryGroup, SubgroupInGroup, TaxCategory, test_session(), hier_session() (+3 more)

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "test_contra_voucher_e2e.py"
Cohesion: 0.15
Nodes (11): ContraVoucherCreate, create_contra_voucher(), e2e_session(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_bank_deposit(), test_cash_to_cash_internal_transfer(), test_contra_voiding_reversal() (+3 more)

### Community 104 - "purchases/page.tsx"
Cohesion: 0.08
Nodes (20): BillAllocationItem, HireChallanOption, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord, VoucherRecord (+12 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 181 - "tracking/fastag/page.tsx"
Cohesion: 0.11
Nodes (16): FastagTrackingPage(), FastagTripSummary, LRSummary, computePathDistanceKm(), FastagMap(), FastagMapProps, geocodeCache, getHaversineDistanceKm() (+8 more)

### Community 182 - "transport-invoice/page.tsx"
Cohesion: 0.14
Nodes (15): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, amountToWords() (+7 more)

### Community 183 - "main.py"
Cohesion: 0.14
Nodes (5): CacheControlMiddleware, health_check(), normalize_tenant_locations_background(), preflight_handler(), root()

### Community 185 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.29
Nodes (8): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 186 - "get"
Cohesion: 0.27
Nodes (12): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+4 more)

### Community 188 - "settings/roles/page.tsx"
Cohesion: 0.23
Nodes (10): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+2 more)

### Community 191 - "hc-register/page.tsx"
Cohesion: 0.21
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+2 more)

### Community 192 - "update_fastag_trip_endpoint"
Cohesion: 0.22
Nodes (5): update_fastag_trip_endpoint(), update_sim_trip(), FastagTripUpdate, update_fastag_trip(), update_sim_trip()

### Community 193 - "EWayBill"
Cohesion: 0.31
Nodes (8): create_eway_bill(), list_eway_bills(), EWayBillBase, EWayBillCreate, EWayBillResponse, create_eway_bill(), get_all_eway_bills(), EWayBill

### Community 194 - "get_all_tenant_db_names"
Cohesion: 0.33
Nodes (3): get_all_tenant_db_names(), rollback_migration(), run_migration()

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1546 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **100 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `test_purchase_register_voucher_e2e.py`, `SIM & Telecom Tracking Integration`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `FASTag Toll & Tracking Service (2)`, `SIM & Telecom Tracking Integration (3)`, `Accounts Voucher & Banking System (2)`, `test_issuing_office_system.py`, `general/router.py`, `tenant_db/models.py`, `general/schemas.py`, `transport/schemas.py`, `accounts/schemas.py`, `tools.py`, `AIDraft`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `Multi-Tenant Auth & Permissions (3)`, `reports/service.py`, `classify_intent_and_entities`, `test_gps_tracking.py`, `typing`, `get`, `update_api_center`, `test_lr_excel_import.py`, `CompanySetting`, `AsyncSession`, `ai/router.py`, `accounts/schemas.py`, `get`, `test_ai_copilot.py`, `statements/service.py`, `update_fastag_trip_endpoint`, `EWayBill`, `lr_draft_service.py`, `test_activity_audit_log_system.py`, `GroupInPrimary`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Are the 292 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 292 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PageHeader` be split into smaller, more focused modules?**
  _Cohesion score 0.05352968676951847 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `User` to `test_purchase_register_voucher_e2e.py`, `SIM & Telecom Tracking Integration`, `Misc Accounting Groups & Categories`, `FASTag Toll & Tracking Service (2)`, `SIM & Telecom Tracking Integration (3)`, `Accounts Voucher & Banking System (2)`, `FreightTigerClient`, `general/router.py`, `tenant_db/models.py`, `FASTag Toll & Tracking Service (5)`, `tools.py`, `AIDraft`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `FASTag Toll & Tracking Service (8)`, `Multi-Tenant Auth & Permissions (3)`, `reports/service.py`, `classify_intent_and_entities`, `typing`, `AsyncSession`, `main.py`, `ai/router.py`, `test_ai_copilot.py`, `get_all_tenant_db_names`, `tenancy.py`, `lr_draft_service.py`, `GroupInPrimary`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 134 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 134 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_purchase_register_voucher_e2e.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0852994555353902 - nodes in this community are weakly interconnected._