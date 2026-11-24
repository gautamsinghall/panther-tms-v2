# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 442 files · ~706,921 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4926 nodes · 19607 edges · 215 communities (100 shown, 115 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2090 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e9f7a36a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tenant
- einvoicing/service.py
- test_purchase_register_voucher_e2e.py
- Button
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- datetime
- test_ai_phase3_lr_creation.py
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- Badge
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- test_ai_phase4_job_and_challan.py
- general-invoice/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- chat_with_copilot
- toast.ts
- general/schemas.py
- ai/router.py
- payment-voucher/page.tsx
- TestSIMTrackingWallet
- typing
- home/service.py
- excel_import.py
- transport/schemas.py
- misc/router.py
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- pytest
- uuid
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- tenant_db/models.py
- control/service.py
- reports/service.py
- accounts/service.py
- test_general_invoice_voucher_e2e.py
- normal-purchase/page.tsx
- httpx
- Account
- tools.py
- rag.py
- test_ai_real_postgres_redis.py
- Client Component Flow
- CompanySetting
- lr-register/page.tsx
- AsyncSession
- classify_intent_and_entities
- test_vendor_directory_posting_and_reconciliation
- accounts/schemas.py
- Branch
- update_email_settings
- test_gps_tracking.py
- dependencies
- RedisDraftBackend
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- PageHeader
- signup/page.tsx
- Client Component Flow (2)
- AsyncSession
- Client Component Flow (3)
- test_activity_audit_log_system.py
- formatCurrency
- package.json
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- AIDraftStore
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- Any
- typing
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- toast-provider.tsx
- LRUpdate
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- test_phase6_exit_criteria.py
- tracking/fastag/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- hire-challan/page.tsx
- hc-register/page.tsx
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
- test_series_master_all_vouchers.py
- main.py
- ai/router.py
- email_service.py
- theme-context.tsx
- scripts
- tailwindcss

## God Nodes (most connected - your core abstractions)
1. `User` - 566 edges
2. `Branch` - 264 edges
3. `Tenant` - 258 edges
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
- `normalize_tenant_locations_background()` --indirect_call--> `session()`  [INFERRED]
  backend/app/main.py → backend/tests/test_vendor_scan_issues.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (215 total, 115 thin omitted)

### Community 0 - "Tenant"
Cohesion: 0.05
Nodes (63): Entitlement, Plan, PlatformAdmin, Tenant, get_ai_tenant_db(), sanitize_ai_output(), classify_operational_intent(), anyio_backend() (+55 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.11
Nodes (23): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), test_two_bills_exact_and_split() (+15 more)

### Community 3 - "Button"
Cohesion: 0.05
Nodes (59): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+51 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.04
Nodes (75): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+67 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.04
Nodes (96): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_lr_response(), close_sim_trip(), create_eway_bill(), create_hire_challan() (+88 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (78): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, GPSConfig, GPSTrackingPage(), TimelineItem (+70 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (89): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+81 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.06
Nodes (33): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+25 more)

### Community 9 - "datetime"
Cohesion: 0.09
Nodes (19): verify_and_heal_chart_of_accounts(), seed_indian_accounting_chart_of_accounts(), Driver, GroupInPrimary, PrimaryGroup, SubgroupInGroup, anyio_backend(), setup_two_tenant_databases() (+11 more)

### Community 10 - "test_ai_phase3_lr_creation.py"
Cohesion: 0.04
Nodes (46): clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent(), is_valid_indian_vehicle() (+38 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (89): AppException, clean_vehicle_number(), GPSFleetCounts, GPSHistorySummary, GPSTimelineItem, GPSTripInfo, GPSVehicleItem, add_sim_trip_comment() (+81 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (70): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+62 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "Badge"
Cohesion: 0.05
Nodes (37): Branch, CompanyBankAccount, INDIAN_BANKS, AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm (+29 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.15
Nodes (23): get_current_company_admin(), get_current_office(), OfficeSummary, get_user_office_context(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission() (+15 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (67): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+59 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.11
Nodes (7): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, TestSimOperatorAndRealData, TestSIMTrackingFreightTiger

### Community 18 - "test_ai_phase4_job_and_challan.py"
Cohesion: 0.04
Nodes (50): compute_canonical_hash(), normalize_val(), build_job_preview_card(), handle_conversational_job_booking(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft() (+42 more)

### Community 19 - "general-invoice/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.17
Nodes (13): list_series_masters(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+5 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.06
Nodes (50): chat_with_copilot(), handle_record_prefill_intent(), AIStatusResponse, ChatMessage, ChatRequest, ChatResponse, ContextSuggestionResponse, HireChallanConfirmationResponse (+42 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (141): BillingClientItem, LedgerEntry, VoucherRecord, BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord (+133 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (44): BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase (+36 more)

### Community 25 - "ai/router.py"
Cohesion: 0.03
Nodes (53): build_system_prompt(), detect_language(), format_page_registry_entry(), get_authorized_navigation_catalog(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), extract_claim_tokens() (+45 more)

### Community 26 - "payment-voucher/page.tsx"
Cohesion: 0.05
Nodes (32): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+24 more)

### Community 27 - "TestSIMTrackingWallet"
Cohesion: 0.15
Nodes (3): check_sim_wallet_balance(), SimWalletTransaction, TestSIMTrackingWallet

### Community 28 - "typing"
Cohesion: 0.09
Nodes (21): close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), lifespan(), normalize_tenant_locations_background(), get_all_tenant_db_names(), rollback_migration() (+13 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.08
Nodes (27): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+19 more)

### Community 31 - "transport/schemas.py"
Cohesion: 0.06
Nodes (47): create_arrival_report(), create_company_vehicle(), create_driver(), create_fastag_trip_endpoint(), create_vehicle_owner(), update_fastag_trip_endpoint(), ArrivalReportBase, ArrivalReportCreate (+39 more)

### Community 32 - "misc/router.py"
Cohesion: 0.05
Nodes (107): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+99 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.10
Nodes (30): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+22 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.10
Nodes (32): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, DLLookupResponse (+24 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (36): map_user_to_list_item(), test_email_gateway(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+28 more)

### Community 36 - "pytest"
Cohesion: 0.07
Nodes (36): preview_journal_voucher_endpoint(), ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, calculate_account_balance(), create_contra_voucher(), create_journal_voucher(), get_account_by_code() (+28 more)

### Community 37 - "uuid"
Cohesion: 0.06
Nodes (12): test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud(), test_phase1_exit_criteria_e2e(), test_general_module_crud_masters(), test_rbac_custom_role_and_employee_restrictions(), test_phase2_end_to_end_exit_criteria() (+4 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.09
Nodes (29): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+21 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.17
Nodes (34): get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches() (+26 more)

### Community 40 - "settings/service.py"
Cohesion: 0.10
Nodes (30): create_new_role(), create_new_user(), create_series_category(), create_series_master(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master() (+22 more)

### Community 41 - "tenant_db/models.py"
Cohesion: 0.10
Nodes (23): verify_pod_record(), run_migration(), AdminSetting, ArrivalReport, FastagCooldown, FastagWalletTransaction, GroupNature, HireChallanStatus (+15 more)

### Community 42 - "control/service.py"
Cohesion: 0.09
Nodes (34): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+26 more)

### Community 43 - "reports/service.py"
Cohesion: 0.06
Nodes (79): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+71 more)

### Community 44 - "accounts/service.py"
Cohesion: 0.07
Nodes (45): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, VoucherCreate, check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment(), create_payment_against_purchase(), create_receipt_against_invoice() (+37 more)

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.07
Nodes (36): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+28 more)

### Community 46 - "normal-purchase/page.tsx"
Cohesion: 0.05
Nodes (29): BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption, VoucherRecord (+21 more)

### Community 47 - "httpx"
Cohesion: 0.11
Nodes (16): _call_groq(), call_llm(), _call_nvidia(), _call_openai(), is_provider_configured(), _is_valid_key(), sanitize_ai_response(), _stream_groq() (+8 more)

### Community 48 - "Account"
Cohesion: 0.13
Nodes (19): CompanyBankAccountCreate, CompanyBankAccountResponse, calculate_bank_account_balance(), create_company_bank_account(), delete_company_bank_account(), get_company_bank_account(), get_contra_eligible_accounts(), get_journal_adjustment_types_list() (+11 more)

### Community 49 - "tools.py"
Cohesion: 0.06
Nodes (46): _matches_permission(), list_driver_ledgers(), stream_chat_with_copilot(), NavigationSuggestion, StructuredCard, execute_accounting_tool(), execute_branch_tool(), execute_client_tool() (+38 more)

### Community 50 - "rag.py"
Cohesion: 0.05
Nodes (12): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query() (+4 more)

### Community 51 - "test_ai_real_postgres_redis.py"
Cohesion: 0.09
Nodes (15): AIDraft, test_cross_tenant_and_cross_user_isolation(), test_fail_closed_when_idempotency_table_missing(), anyio_backend(), assert_strict_isolation_guards(), get_pg_url(), test_real_postgres_cross_tenant_isolation(), test_real_postgres_hire_challan_financial_precision() (+7 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 54 - "lr-register/page.tsx"
Cohesion: 0.23
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, CustomerOption, formatDateDisplay(), formatLocation(), formatOfficeName(), getDefaultFinancialYearDates(), LRRegisterPage() (+2 more)

### Community 55 - "AsyncSession"
Cohesion: 0.20
Nodes (19): create_role(), create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+11 more)

### Community 56 - "classify_intent_and_entities"
Cohesion: 0.10
Nodes (14): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, get_job_guide_response() (+6 more)

### Community 57 - "test_vendor_directory_posting_and_reconciliation"
Cohesion: 0.36
Nodes (6): ensure_unified_creditor_vendors(), list_vendor_ledgers(), list_vendors(), test_preexisting_unlinked_creditor_auto_sync(), test_vehicle_owner_and_hire_challan_auto_vendor_provisioning(), test_vendor_directory_posting_and_reconciliation()

### Community 58 - "accounts/schemas.py"
Cohesion: 0.05
Nodes (62): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account(), get_staff_imprest_ledger_detail() (+54 more)

### Community 59 - "Branch"
Cohesion: 0.10
Nodes (28): CompanyVehicle, Consignee, Consigner, Location, MarketVehicle, Role, RolePermission, SeriesMaster (+20 more)

### Community 60 - "update_email_settings"
Cohesion: 0.20
Nodes (6): get_email_settings(), update_email_settings(), EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 61 - "test_gps_tracking.py"
Cohesion: 0.15
Nodes (16): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection() (+8 more)

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "PageHeader"
Cohesion: 0.05
Nodes (118): CompanyBankAccountsPage(), ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry, numberToWords(), VoucherRecord, CreditDebitNotesPage() (+110 more)

### Community 67 - "signup/page.tsx"
Cohesion: 0.19
Nodes (13): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+5 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "AsyncSession"
Cohesion: 0.12
Nodes (12): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_admin_settings() (+4 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.16
Nodes (14): BillingClientResponse, build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), audit_db(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options() (+6 more)

### Community 73 - "formatCurrency"
Cohesion: 0.04
Nodes (94): ActivityLog, ActivityStats, FilterOptions, UserActivityLogPage(), SeriesCategoryItem, SeriesMasterItem, STANDARD_VOUCHERS, Consignment360Content() (+86 more)

### Community 75 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 84 - "typing"
Cohesion: 0.06
Nodes (23): require_permission(), _check_permission(), DuplicateResourceException, EntitlementLockedException, InternalServerException, QuotaExceededException, RateLimitException, ResourceNotFoundException (+15 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 88 - "LRUpdate"
Cohesion: 0.21
Nodes (4): LRBase, LRInvoiceItem, LRResponse, LRUpdate

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

### Community 99 - "test_phase6_exit_criteria.py"
Cohesion: 0.22
Nodes (5): test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 100 - "tracking/fastag/page.tsx"
Cohesion: 0.22
Nodes (11): FastagTripSummary, LRSummary, computePathDistanceKm(), FastagMap(), FastagMapProps, geocodeCache, getHaversineDistanceKm(), MARKER_COLORS (+3 more)

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 104 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 182 - "test_series_master_all_vouchers.py"
Cohesion: 0.60
Nodes (3): test_initialize_all_standard_series(), test_series_allocation_and_manual_enforcement(), test_standard_vouchers_catalog_and_mandatory_rules()

### Community 183 - "main.py"
Cohesion: 0.08
Nodes (15): _cors_headers_for_request(), register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler(), validation_exception_handler(), CacheControlMiddleware, health_check() (+7 more)

### Community 186 - "ai/router.py"
Cohesion: 0.07
Nodes (25): build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number(), parse_hc_entities_from_text(), validate_and_update_hc_draft() (+17 more)

### Community 207 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 208 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 210 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1670 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **115 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `SIM & Telecom Tracking Integration` to `Tenant`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `datetime`, `test_ai_phase3_lr_creation.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `test_issuing_office_system.py`, `test_ai_phase4_job_and_challan.py`, `general/router.py`, `allocate_or_validate_voucher_number`, `chat_with_copilot`, `ai/router.py`, `home/service.py`, `excel_import.py`, `transport/schemas.py`, `misc/router.py`, `Transport Registers & Operations Reports`, `settings/router.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `tenant_db/models.py`, `control/service.py`, `reports/service.py`, `accounts/service.py`, `Account`, `tools.py`, `test_ai_real_postgres_redis.py`, `AsyncSession`, `test_vendor_directory_posting_and_reconciliation`, `ai/router.py`, `Branch`, `update_email_settings`, `AsyncSession`, `test_activity_audit_log_system.py`, `typing`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Are the 373 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 373 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tenant` be split into smaller, more focused modules?**
  _Cohesion score 0.046176975945017185 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `Tenant` to `SIM & Telecom Tracking Integration`, `datetime`, `test_ai_phase3_lr_creation.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `test_ai_phase4_job_and_challan.py`, `general/router.py`, `chat_with_copilot`, `ai/router.py`, `TestSIMTrackingWallet`, `typing`, `transport/schemas.py`, `misc/router.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `control/service.py`, `reports/service.py`, `tools.py`, `rag.py`, `test_ai_real_postgres_redis.py`, `main.py`, `AsyncSession`, `test_vendor_directory_posting_and_reconciliation`, `ai/router.py`, `Branch`, `test_gps_tracking.py`, `typing`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 187 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 187 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0797872340425532 - nodes in this community are weakly interconnected._