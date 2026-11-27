# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 443 files · ~716,876 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4936 nodes · 19979 edges · 182 communities (102 shown, 80 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 2797 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f74eb21a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LR
- einvoicing/service.py
- sqlalchemy
- general-purchase/page.tsx
- react
- transport/router.py
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- classify_intent_and_entities
- misc/router.py
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- typed_tools.py
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- TestFASTagTracking
- test_voucher_edit_e2e.py
- general/router.py
- SeriesMaster
- chat_with_copilot
- apiClient
- general/schemas.py
- signup/page.tsx
- CompanyBankAccount
- general-invoice/page.tsx
- toast-provider.tsx
- home/service.py
- excel_import.py
- lr-register/page.tsx
- tenant_db/models.py
- test_issuing_office_system.py
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- pytest
- auth/service.py
- FASTag Toll & Tracking Service (7)
- settings/service.py
- sidebar.tsx
- control/service.py
- reports/service.py
- delete
- create_general_invoice
- get_consignment_360
- api-client.ts
- hc-register/page.tsx
- Tenant
- VoucherType
- state-select.tsx
- Client Component Flow
- CompanySetting
- ApiCenterSettingUpdate
- AsyncSession
- hire-challan/page.tsx
- statements/service.py
- transport/schemas.py
- BaseModel
- get
- package.json
- dependencies
- Any
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- normal-purchase/page.tsx
- CacheControlMiddleware
- theme-context.tsx
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- test_activity_audit_log_system.py
- formatDate
- tailwindcss
- httpx
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- test_session
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- RazorpayClient
- errors.py
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- ai/router.py
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
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
- PageHeader
- post
- test_live_api.py
- CompanySetting
- update_email_settings
- email_service.py
- import_jobs_excel
- ai/router.py
- scripts
- Account

## God Nodes (most connected - your core abstractions)
1. `User` - 570 edges
2. `Branch` - 326 edges
3. `Tenant` - 264 edges
4. `PageHeader()` - 205 edges
5. `apiClient()` - 200 edges
6. `react` - 179 edges
7. `Button` - 163 edges
8. `lucide-react` - 154 edges
9. `cn()` - 144 edges
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
- `get_current_user()` --uses--> `Tenant`  [INFERRED]
  backend/app/auth/dependencies.py → backend/app/control/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (182 total, 80 thin omitted)

### Community 0 - "LR"
Cohesion: 0.05
Nodes (56): build_job_preview_card(), handle_conversational_job_booking(), is_job_cancel_intent(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft(), LRCreate (+48 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.07
Nodes (24): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check(), lifespan(), normalize_tenant_locations_background() (+16 more)

### Community 3 - "general-purchase/page.tsx"
Cohesion: 0.04
Nodes (45): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+37 more)

### Community 4 - "react"
Cohesion: 0.03
Nodes (90): Branch, CompanyBankAccount, INDIAN_BANKS, ContraAccountOption, ContraType, LedgerEntry, numberToWords(), VoucherRecord (+82 more)

### Community 5 - "transport/router.py"
Cohesion: 0.05
Nodes (82): ResourceNotFoundException, add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_loading_slip_response(), _build_lr_response(), close_sim_trip() (+74 more)

### Community 6 - "cn"
Cohesion: 0.06
Nodes (56): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+48 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (31): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+23 more)

### Community 9 - "classify_intent_and_entities"
Cohesion: 0.08
Nodes (19): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, detect_language() (+11 more)

### Community 10 - "misc/router.py"
Cohesion: 0.11
Nodes (39): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+31 more)

### Community 11 - "transport/service.py"
Cohesion: 0.05
Nodes (72): AppException, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit(), create_arrival_report(), create_company_vehicle(), create_driver(), create_eway_bill() (+64 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (77): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+69 more)

### Community 13 - "AsyncSession"
Cohesion: 0.16
Nodes (24): create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email(), get_fastag_wallet() (+16 more)

### Community 14 - "typed_tools.py"
Cohesion: 0.07
Nodes (34): build_add_vehicle_driver_response(), _build_hc_idempotent_response(), build_how_to_lr_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), get_ai_status(), get_context_suggestions(), get_lr_explanation_markdown() (+26 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.16
Nodes (20): get_current_company_admin(), get_current_office(), ForbiddenException, require_reports_permission(), _check(), require_statements_permission(), _check(), UserOfficeAssignment (+12 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.07
Nodes (69): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+61 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.06
Nodes (13): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_and_deduct_sim_credit(), check_sim_wallet_balance(), close_sim_trip() (+5 more)

### Community 18 - "TestFASTagTracking"
Cohesion: 0.07
Nodes (16): clean_vehicle_number(), FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse (+8 more)

### Community 19 - "test_voucher_edit_e2e.py"
Cohesion: 0.08
Nodes (33): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), get_account_by_code(), get_journal_adjustment_types_list(), test_bank_to_bank_transfer_with_charges() (+25 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "SeriesMaster"
Cohesion: 0.16
Nodes (14): allocate_or_validate_voucher_number(), _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+6 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (54): sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), build_human_handoff_response(), chat_with_copilot(), filter_nav_suggestions(), get_blocked_delete_message(), get_capabilities_list_markdown(), handle_record_prefill_intent() (+46 more)

### Community 23 - "apiClient"
Cohesion: 0.06
Nodes (119): CompanyBankAccountsPage(), ContraVoucherPage(), GeneralInvoicePage(), BranchItem, IssuingOfficesPage(), IRNListPage(), EmployeeImprestPage(), defaultInitialValues (+111 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.07
Nodes (45): BillingClientBase, BillingClientCreate, BillingClientResponse, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate (+37 more)

### Community 25 - "signup/page.tsx"
Cohesion: 0.18
Nodes (15): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+7 more)

### Community 26 - "CompanyBankAccount"
Cohesion: 0.17
Nodes (14): CompanyBankAccountCreate, CompanyBankAccountResponse, create_company_bank_account(), get_company_bank_account(), list_company_bank_accounts(), lookup_ifsc(), mask_account_number(), set_default_bank_account() (+6 more)

### Community 27 - "general-invoice/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 28 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 29 - "home/service.py"
Cohesion: 0.12
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.08
Nodes (26): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+18 more)

### Community 31 - "lr-register/page.tsx"
Cohesion: 0.11
Nodes (19): ColumnConfig, formatDateDisplay(), getDefaultFinancialYearDates(), LRClientWiseGroup, LRClientWisePage(), LRClientWiseRecord, MONTH_NAMES, TABLE_COLUMNS (+11 more)

### Community 32 - "tenant_db/models.py"
Cohesion: 0.05
Nodes (82): AccountBase, AccountCreate, AccountResponse, AccountUpdate, ChargeHeadBase, ChargeHeadCreate, ChargeHeadResponse, ChargeHeadUpdate (+74 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.13
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.12
Nodes (27): test_dl(), test_pan(), BranchBase, BranchCreate, BranchResponse, CompanySettingResponse, DLLookupResponse, DLTestRequest (+19 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (38): create_role(), map_user_to_list_item(), test_email_gateway(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem (+30 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.07
Nodes (54): PaymentAllocationItem, PaymentVoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment(), create_payment_against_purchase() (+46 more)

### Community 37 - "pytest"
Cohesion: 0.09
Nodes (25): QuotaExceededException, handle_conversational_lr_booking(), confirm_lr_draft(), ConfirmLRDraftRequest, anyio_backend(), test_atomic_database_idempotency_record_created(), test_concurrent_confirmation_distributed_lock(), test_conversational_lr_creation_hinglish() (+17 more)

### Community 38 - "auth/service.py"
Cohesion: 0.06
Nodes (43): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+35 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.15
Nodes (34): resolve_freight_tiger_token(), sanitize_ft_base_url(), test_gst(), ApiCenterSettingResponse, GSTTestRequest, GSTTestResponse, TaxApiCounterResponse, TaxApiTransactionItem (+26 more)

### Community 40 - "settings/service.py"
Cohesion: 0.10
Nodes (32): list_admin_settings(), ensure_series_table_schema(), create_new_user(), create_series_category(), create_series_master(), create_staff_recipient(), delete_existing_role(), delete_series_category() (+24 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.04
Nodes (74): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+66 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (31): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+23 more)

### Community 43 - "reports/service.py"
Cohesion: 0.09
Nodes (51): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+43 more)

### Community 44 - "delete"
Cohesion: 0.15
Nodes (8): delete_company_vehicle(), delete_driver(), delete_fastag_trip_endpoint(), delete_hire_challan(), delete_loading_slip(), delete_lr(), delete_market_vehicle(), delete_vehicle_owner()

### Community 45 - "create_general_invoice"
Cohesion: 0.09
Nodes (34): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+26 more)

### Community 46 - "get_consignment_360"
Cohesion: 0.33
Nodes (7): _build_search_variants(), _fmt_city(), _fmt_date(), _fmt_money(), _fmt_name(), get_consignment_360(), search_consignment_360_suggestions()

### Community 47 - "api-client.ts"
Cohesion: 0.05
Nodes (59): BillingClientItem, LedgerEntry, VoucherRecord, AccountItem, BalanceSheetResponse, GroupItem, BankReconciliationResponse, BankReconTransaction (+51 more)

### Community 48 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 49 - "Tenant"
Cohesion: 0.03
Nodes (99): _matches_permission(), Entitlement, Plan, PlatformAdmin, Tenant, get_authorized_navigation_catalog(), get_active_lr_draft(), get_ai_tenant_db() (+91 more)

### Community 50 - "VoucherType"
Cohesion: 0.29
Nodes (8): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 51 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (7): get_adaequare_client(), get_gst_pan_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.25
Nodes (4): BranchUpdate, CompanySettingUpdate, EmailSettingResponse, EmailSettingUpdate

### Community 54 - "ApiCenterSettingUpdate"
Cohesion: 0.47
Nodes (6): test_wheelseye(), ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, test_wheelseye_connection(), test_api_center_wheelseye_schema()

### Community 55 - "AsyncSession"
Cohesion: 0.20
Nodes (18): create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+10 more)

### Community 56 - "hire-challan/page.tsx"
Cohesion: 0.10
Nodes (19): CompanyVehicleRecord, CompanyVehiclesPageProps, DriverOption, OwnerOption, BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption (+11 more)

### Community 57 - "statements/service.py"
Cohesion: 0.16
Nodes (28): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return(), GSTInputItem (+20 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.06
Nodes (61): ArrivalReportBase, ArrivalReportCreate, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response, Consignment360SearchResult (+53 more)

### Community 59 - "BaseModel"
Cohesion: 0.07
Nodes (51): ATHPaymentCreate, BankStatementImportResponse, BankStatementLineResponse, BillAllocationResponse, BillingClientDueBillSummary, BillingClientLedgerListItem, BTHPaymentCreate, BulkConfirmRequest (+43 more)

### Community 60 - "get"
Cohesion: 0.12
Nodes (12): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_roles() (+4 more)

### Community 61 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 63 - "Any"
Cohesion: 0.06
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "normal-purchase/page.tsx"
Cohesion: 0.09
Nodes (23): BillAllocationItem, BranchData, CompanySettingData, HireChallanOption, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption (+15 more)

### Community 68 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "PantherKnowledgeEngine"
Cohesion: 0.06
Nodes (16): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks() (+8 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.16
Nodes (13): build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), audit_db(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options(), test_all_issuing_offices_view_for_company_admin() (+5 more)

### Community 73 - "formatDate"
Cohesion: 0.03
Nodes (109): BillAllocationRecord, CreditDebitNotesPage(), CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption (+101 more)

### Community 74 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 75 - "httpx"
Cohesion: 0.05
Nodes (26): _call_groq(), call_llm(), _call_nvidia(), _call_openai(), is_provider_configured(), _is_valid_key(), sanitize_ai_response(), _stream_groq() (+18 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 84 - "errors.py"
Cohesion: 0.10
Nodes (14): require_permission(), _check_permission(), _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, RateLimitException, register_error_handlers() (+6 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "ai/router.py"
Cohesion: 0.03
Nodes (52): AIDraft, AIDraftStore, compute_canonical_hash(), normalize_val(), validate_and_update_hc_draft(), clear_chat_session(), confirm_hire_challan_draft(), confirm_job_draft() (+44 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.09
Nodes (16): LoadingSlipBase, LoadingSlipCreate, LoadingSlipResponse, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRResponse, LRUpdate (+8 more)

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

### Community 181 - "PageHeader"
Cohesion: 0.04
Nodes (86): JournalVouchersPage(), MasterLedgerPage(), ProformaInvoicePage(), DLApiPage(), EWayBillApiPage(), FastagApiPage(), FastagWalletData, FastagWalletTxn (+78 more)

### Community 182 - "post"
Cohesion: 0.21
Nodes (11): change_user_password(), test_ewb(), test_rc(), ApiCenterTestRequest, ApiCenterTestResponse, ChangePasswordRequest, RCTestRequest, RCTestResponse (+3 more)

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 195 - "CompanySetting"
Cohesion: 0.29
Nodes (4): get_email_setting(), update_email_setting(), CompanySetting, EmailSetting

### Community 198 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

### Community 200 - "email_service.py"
Cohesion: 0.15
Nodes (6): get_email_settings(), get_email_setting(), send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 216 - "ai/router.py"
Cohesion: 0.03
Nodes (67): build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number(), parse_hc_entities_from_text(), is_instructional_job_inquiry() (+59 more)

### Community 221 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 224 - "Account"
Cohesion: 0.08
Nodes (34): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+26 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1651 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `LR`, `sqlalchemy`, `transport/router.py`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `misc/router.py`, `AsyncSession`, `typed_tools.py`, `test_issuing_office_system.py`, `test_voucher_edit_e2e.py`, `general/router.py`, `chat_with_copilot`, `CompanyBankAccount`, `home/service.py`, `excel_import.py`, `tenant_db/models.py`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `pytest`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `delete`, `Tenant`, `post`, `ApiCenterSettingUpdate`, `AsyncSession`, `statements/service.py`, `get`, `CompanySetting`, `update_email_settings`, `PantherKnowledgeEngine`, `email_service.py`, `import_jobs_excel`, `test_activity_audit_log_system.py`, `errors.py`, `ai/router.py`, `ai/router.py`, `Account`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Are the 509 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 509 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LR` be split into smaller, more focused modules?**
  _Cohesion score 0.04737070838765754 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Tenant` to `LR`, `sqlalchemy`, `transport/router.py`, `bank_statement_service.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `typed_tools.py`, `test_issuing_office_system.py`, `test_voucher_edit_e2e.py`, `general/router.py`, `SeriesMaster`, `chat_with_copilot`, `CompanyBankAccount`, `home/service.py`, `excel_import.py`, `tenant_db/models.py`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `pytest`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `create_general_invoice`, `VoucherType`, `AsyncSession`, `BaseModel`, `get`, `CompanySetting`, `PantherKnowledgeEngine`, `test_activity_audit_log_system.py`, `import_jobs_excel`, `test_session`, `ai/router.py`, `ai/router.py`, `test_loading_slip.py`, `Account`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 256 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 256 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08081632653061224 - nodes in this community are weakly interconnected._