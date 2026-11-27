# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 444 files · ~727,186 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4983 nodes · 19920 edges · 204 communities (99 shown, 105 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 2407 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbc3afce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- StructuredCard
- test_ai_perfect_tms_enhancements.py
- sqlalchemy
- create_contra_voucher
- PageHeader
- AsyncSession
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- classify_intent_and_entities
- tenancy.py
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- session
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- fastag_provider/client.py
- errors.py
- general/router.py
- check_series_status
- chat_with_copilot
- react
- general/schemas.py
- getStoredAuth
- Branch
- general-invoice/page.tsx
- normal-purchase/page.tsx
- home/service.py
- HireChallan
- AIDraftStore
- tenant_db/models.py
- test_issuing_office_system.py
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- package.json
- auth/service.py
- FASTag Toll & Tracking Service (7)
- settings/service.py
- sidebar.tsx
- control/service.py
- reports/service.py
- get
- AIDraft
- .generate_confirmation_token
- daybook/page.tsx
- hc-register/page.tsx
- Tenant
- einvoicing/router.py
- state-select.tsx
- Client Component Flow
- CompanySetting
- lr_draft_service.py
- SeriesCategory
- ArrivalReport
- statements/service.py
- transport/router.py
- accounts/schemas.py
- TestSIMTrackingWallet
- BaseDraftBackend
- dependencies
- toast-provider.tsx
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- react
- master-ledger/page.tsx
- RedisDraftBackend
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- resolve_freight_tiger_token
- Button
- hire-challan/page.tsx
- job_draft_service.py
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- RazorpayClient
- InMemoryDraftBackend
- main.py
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- pytest
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- statements/router.py
- Docker Compose.Yml Component Flow (7)
- parse_statement_file
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
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
- trial-balance/page.tsx
- test_live_api.py
- Any
- theme-context.tsx
- log_blocked_rbac_attempt
- scripts
- tailwindcss
- update_email_settings
- email_service.py
- ai/router.py

## God Nodes (most connected - your core abstractions)
1. `User` - 575 edges
2. `Branch` - 307 edges
3. `Tenant` - 259 edges
4. `PageHeader()` - 205 edges
5. `apiClient()` - 200 edges
6. `react` - 179 edges
7. `Button` - 165 edges
8. `lucide-react` - 154 edges
9. `cn()` - 146 edges
10. `DataTable()` - 142 edges

## Surprising Connections (you probably didn't know these)
- `Asset: airtel.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/airtel.svg → docs/prd.md
- `Asset: bsnl.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/bsnl.svg → docs/prd.md
- `Asset: jio.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/jio.svg → docs/prd.md
- `Asset: vi.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/vi.svg → docs/prd.md
- `normalize_tenant_locations_background()` --indirect_call--> `session()`  [INFERRED]
  backend/app/main.py → backend/tests/test_vendor_scan_issues.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (204 total, 105 thin omitted)

### Community 0 - "StructuredCard"
Cohesion: 0.07
Nodes (36): build_add_vehicle_driver_response(), _build_hc_idempotent_response(), build_how_to_lr_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), get_ai_status(), get_context_suggestions(), get_lr_explanation_markdown() (+28 more)

### Community 1 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.05
Nodes (27): build_system_prompt(), detect_language(), format_page_registry_entry(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), build_page_help_response(), detect_language_with_history() (+19 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.09
Nodes (23): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), lifespan(), normalize_tenant_locations_background(), seed_demo() (+15 more)

### Community 3 - "create_contra_voucher"
Cohesion: 0.15
Nodes (11): ContraVoucherCreate, create_contra_voucher(), e2e_session(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_bank_deposit(), test_cash_to_cash_internal_transfer(), test_contra_voiding_reversal() (+3 more)

### Community 4 - "PageHeader"
Cohesion: 0.03
Nodes (146): MasterLedgerPage(), AccountsOverviewPage(), VoucherRecord, ProformaInvoicePage(), ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem (+138 more)

### Community 5 - "AsyncSession"
Cohesion: 0.04
Nodes (61): generate_job_import_template(), generate_lr_import_template(), _build_job_response(), _build_loading_slip_response(), _build_lr_response(), create_hire_challan(), create_job(), create_loading_slip() (+53 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (79): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+71 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (91): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+83 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.06
Nodes (41): answer_line_question(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess(), normalize_text() (+33 more)

### Community 9 - "classify_intent_and_entities"
Cohesion: 0.08
Nodes (16): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, get_job_guide_response() (+8 more)

### Community 10 - "tenancy.py"
Cohesion: 0.11
Nodes (14): TenantInactiveException, TenantNotFoundException, generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code() (+6 more)

### Community 11 - "transport/service.py"
Cohesion: 0.03
Nodes (98): AppException, clean_vehicle_number(), fetch_eway_bill_details(), GPSConfigResponse, GPSFleetCounts, GPSHistorySummary, GPSTimelineItem, GPSTripInfo (+90 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (76): check_entitlement_limit(), bulk_confirm_ready_lines(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint() (+68 more)

### Community 13 - "AsyncSession"
Cohesion: 0.12
Nodes (32): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+24 more)

### Community 14 - "session"
Cohesion: 0.06
Nodes (31): allocate_or_validate_voucher_number(), _auto_provision_automatic_series(), extract_sequence_number(), format_series_number(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header() (+23 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.08
Nodes (27): get_current_company_admin(), get_current_office(), get_current_user(), require_permission(), _check_permission(), ForbiddenException, require_accounts_permission(), _check() (+19 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.07
Nodes (69): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+61 more)

### Community 18 - "fastag_provider/client.py"
Cohesion: 0.10
Nodes (5): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), TestFASTagTracking

### Community 19 - "errors.py"
Cohesion: 0.12
Nodes (12): _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler() (+4 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (54): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+46 more)

### Community 21 - "check_series_status"
Cohesion: 0.13
Nodes (18): create_series_master(), update_series_master(), SeriesMasterCreate, SeriesMasterUpdate, check_series_status(), compute_series_display_data(), ensure_series_table_schema(), get_all_used_numbers_for_doc() (+10 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.06
Nodes (45): chat_with_copilot(), get_blocked_delete_message(), get_capabilities_list_markdown(), ChatMessage, ChatRequest, anyio_backend(), copilot_env(), test_active_draft_destination_slot_filling() (+37 more)

### Community 23 - "react"
Cohesion: 0.06
Nodes (117): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, IssuingOfficesPage(), IRNListPage(), defaultInitialValues, EmployeeMasterPage() (+109 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.07
Nodes (45): BillingClientBase, BillingClientCreate, BillingClientResponse, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate (+37 more)

### Community 25 - "getStoredAuth"
Cohesion: 0.03
Nodes (114): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, SeriesCategoryItem (+106 more)

### Community 26 - "Branch"
Cohesion: 0.05
Nodes (68): generate_irn_for_voucher(), seed_indian_accounting_chart_of_accounts(), Account, BillingClient, Branch, CompanyVehicle, Consignee, Consigner (+60 more)

### Community 27 - "general-invoice/page.tsx"
Cohesion: 0.11
Nodes (19): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, LRRecord, SeriesRangeItem, ServiceLineInput (+11 more)

### Community 28 - "normal-purchase/page.tsx"
Cohesion: 0.07
Nodes (22): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+14 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "HireChallan"
Cohesion: 0.09
Nodes (28): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), HireChallan (+20 more)

### Community 31 - "AIDraftStore"
Cohesion: 0.14
Nodes (3): AIDraftStore, test_real_redis_draft_persistence_and_locking(), test_real_redis_multi_process_concurrency_lock()

### Community 32 - "tenant_db/models.py"
Cohesion: 0.05
Nodes (109): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+101 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.09
Nodes (45): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+37 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.11
Nodes (31): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, CompanySettingUpdate (+23 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (37): create_user(), list_roles(), map_user_to_list_item(), update_role(), update_user(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse (+29 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.04
Nodes (88): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAgainstInvoiceCreate, ReceiptAllocationItem, ReceiptVoucherCreate, TransportInvoiceCreate, VoidVoucherRequest (+80 more)

### Community 37 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 38 - "auth/service.py"
Cohesion: 0.10
Nodes (30): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+22 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.16
Nodes (34): TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches(), get_company_setting() (+26 more)

### Community 40 - "settings/service.py"
Cohesion: 0.13
Nodes (23): create_role(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient(), list_admin_settings(), create_new_role(), create_staff_recipient() (+15 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.04
Nodes (75): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+67 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (30): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+22 more)

### Community 43 - "reports/service.py"
Cohesion: 0.10
Nodes (50): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+42 more)

### Community 44 - "get"
Cohesion: 0.09
Nodes (23): get_permissions_schema(), check_series(), create_staff_recipient(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), import_default_series_template() (+15 more)

### Community 46 - ".generate_confirmation_token"
Cohesion: 0.14
Nodes (6): validate_and_update_hc_draft(), test_concurrent_confirmation_lock_and_replay(), test_cross_tenant_and_cross_user_isolation(), test_hire_challan_formula_equivalence(), test_migration_idempotent_and_rollback(), test_safe_archival_rollback_preserves_records()

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 49 - "Tenant"
Cohesion: 0.04
Nodes (87): _matches_permission(), Plan, PlatformAdmin, Tenant, get_authorized_navigation_catalog(), is_lr_booking_intent(), get_active_lr_draft(), get_bulk_pii_refusal_message() (+79 more)

### Community 50 - "einvoicing/router.py"
Cohesion: 0.07
Nodes (17): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+9 more)

### Community 51 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (7): get_adaequare_client(), get_gst_pan_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 54 - "lr_draft_service.py"
Cohesion: 0.06
Nodes (27): clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_valid_indian_vehicle(), is_valid_location_name() (+19 more)

### Community 55 - "SeriesCategory"
Cohesion: 0.24
Nodes (8): create_series_category(), update_series_category(), update_staff_recipient(), SeriesCategoryCreate, SeriesCategoryUpdate, create_series_category(), update_series_category(), SeriesCategory

### Community 56 - "ArrivalReport"
Cohesion: 0.24
Nodes (13): _build_arrival_report_response(), create_arrival_report(), get_arrival_report(), list_arrival_reports(), update_arrival_report(), ArrivalReportCreate, create_arrival_report(), get_all_arrival_reports() (+5 more)

### Community 57 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 58 - "transport/router.py"
Cohesion: 0.04
Nodes (92): detect_telecom_operator(), add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), close_sim_trip(), create_company_vehicle(), create_driver(), create_eway_bill() (+84 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.04
Nodes (82): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+74 more)

### Community 60 - "TestSIMTrackingWallet"
Cohesion: 0.17
Nodes (4): SimWalletResponse, get_sim_wallet_info(), SimWalletTransaction, TestSIMTrackingWallet

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 63 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "react"
Cohesion: 0.10
Nodes (26): LoginPage(), PlanOption, PLANS, SignupPage(), FastagTrackingPage(), FastagTripSummary, LRSummary, VideoBackdrop() (+18 more)

### Community 67 - "master-ledger/page.tsx"
Cohesion: 0.13
Nodes (14): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+6 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "PantherKnowledgeEngine"
Cohesion: 0.12
Nodes (7): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "resolve_freight_tiger_token"
Cohesion: 0.22
Nodes (10): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection() (+2 more)

### Community 73 - "Button"
Cohesion: 0.02
Nodes (97): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+89 more)

### Community 74 - "hire-challan/page.tsx"
Cohesion: 0.14
Nodes (13): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+5 more)

### Community 75 - "job_draft_service.py"
Cohesion: 0.09
Nodes (16): build_job_preview_card(), handle_conversational_job_booking(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft(), _call_groq(), call_llm() (+8 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 84 - "main.py"
Cohesion: 0.04
Nodes (22): CacheControlMiddleware, health_check(), preflight_handler(), root(), test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud() (+14 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "pytest"
Cohesion: 0.03
Nodes (76): Entitlement, QuotaExceededException, compute_canonical_hash(), confirm_hire_challan_draft(), confirm_job_draft(), confirm_lr_draft(), ConfirmHireChallanDraftRequest, ConfirmJobDraftRequest (+68 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.11
Nodes (6): ArrivalReportBase, LoadingSlipBase, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRUpdate

### Community 89 - "Docker Compose.Yml Component Flow (4)"
Cohesion: 0.18
Nodes (11): deploy, resources, deploy, cpus, memory, deploy, deploy, deploy (+3 more)

### Community 90 - "Docker Compose.Yml Component Flow (5)"
Cohesion: 0.18
Nodes (11): postgres, container_name, depends_on, image, networks, ports, profiles, restart (+3 more)

### Community 92 - "Docker Compose.Yml Component Flow (6)"
Cohesion: 0.20
Nodes (10): container_name, depends_on, environment, image, networks, ports, restart, redis (+2 more)

### Community 93 - "statements/router.py"
Cohesion: 0.47
Nodes (7): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return()

### Community 94 - "Docker Compose.Yml Component Flow (7)"
Cohesion: 0.22
Nodes (8): networks, panther-net, driver, services, volumes, pgadmin_data, postgres_data, redis_data

### Community 95 - "parse_statement_file"
Cohesion: 0.27
Nodes (3): parse_date_cell(), parse_decimal_cell(), parse_statement_file()

### Community 96 - "Docker Compose.Yml Component Flow (8)"
Cohesion: 0.33
Nodes (6): PGADMIN_CONFIG_ENHANCED_COOKIE_PROTECTION, PGADMIN_CONFIG_WTF_CSRF_CHECK_DEFAULT, PGADMIN_DEFAULT_EMAIL, PGADMIN_DEFAULT_PASSWORD, PGADMIN_LISTEN_PORT, environment

### Community 98 - "Multi-Tenant Auth & Permissions (9)"
Cohesion: 0.50
Nodes (4): config, DEMO_TENANT_IDS, isTenantId(), middleware()

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

### Community 181 - "trial-balance/page.tsx"
Cohesion: 0.25
Nodes (5): TrialBalanceAccount, TrialBalanceGroup, TrialBalancePage(), TrialBalancePrimaryGroup, TrialBalanceResponse

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 188 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 195 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 196 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 198 - "update_email_settings"
Cohesion: 0.18
Nodes (6): get_email_settings(), update_email_settings(), EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 200 - "email_service.py"
Cohesion: 0.19
Nodes (4): send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 216 - "ai/router.py"
Cohesion: 0.04
Nodes (42): build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number(), parse_hc_entities_from_text(), is_instructional_job_inquiry() (+34 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1672 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **105 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `StructuredCard`, `test_ai_perfect_tms_enhancements.py`, `AsyncSession`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `transport/service.py`, `AsyncSession`, `session`, `test_issuing_office_system.py`, `general/router.py`, `check_series_status`, `chat_with_copilot`, `Branch`, `home/service.py`, `HireChallan`, `tenant_db/models.py`, `test_issuing_office_system.py`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `.generate_confirmation_token`, `Tenant`, `lr_draft_service.py`, `SeriesCategory`, `ArrivalReport`, `transport/router.py`, `accounts/schemas.py`, `log_blocked_rbac_attempt`, `update_email_settings`, `job_draft_service.py`, `pytest`, `ai/router.py`, `statements/router.py`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Are the 428 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 428 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `StructuredCard` be split into smaller, more focused modules?**
  _Cohesion score 0.06612021857923497 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Branch` to `StructuredCard`, `test_ai_perfect_tms_enhancements.py`, `create_contra_voucher`, `bank_statement_service.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `session`, `test_issuing_office_system.py`, `general/router.py`, `check_series_status`, `chat_with_copilot`, `home/service.py`, `HireChallan`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `Tenant`, `lr_draft_service.py`, `transport/router.py`, `accounts/schemas.py`, `log_blocked_rbac_attempt`, `update_email_settings`, `job_draft_service.py`, `pytest`, `ai/router.py`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 233 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 233 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_ai_perfect_tms_enhancements.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05102040816326531 - nodes in this community are weakly interconnected._