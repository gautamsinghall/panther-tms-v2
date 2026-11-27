# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 443 files · ~725,752 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4966 nodes · 19909 edges · 225 communities (111 shown, 114 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 2473 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `030f7c82`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- payment-voucher/page.tsx
- detect_language
- sqlalchemy
- AIDraftStore
- Button
- AsyncSession
- cn
- Fleet & Vehicle Maintenance Operations
- httpx
- classify_intent_and_entities
- tenancy.py
- transport/service.py
- User
- AsyncSession
- generate_lr_import_template
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- TestFASTagTracking
- errors.py
- general/router.py
- check_series_status
- chat_with_copilot
- react
- general/schemas.py
- getStoredAuth
- tenant_db/models.py
- normal-purchase/page.tsx
- lr-register/page.tsx
- home/service.py
- HireChallan
- create_general_invoice
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
- LR
- Branch
- daybook/page.tsx
- classify_intent_and_entities
- Branch
- einvoicing/router.py
- state-select.tsx
- Client Component Flow
- CompanySetting
- ai/router.py
- AsyncSession
- ArrivalReport
- statements/service.py
- transport/schemas.py
- accounts/schemas.py
- einvoicing/provider.py
- Any
- dependencies
- toast-provider.tsx
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- general-purchase/page.tsx
- master-ledger/page.tsx
- test_branch_job_import.py
- Client Component Flow (2)
- test_ai_perfect_tms_enhancements.py
- Client Component Flow (3)
- AIDraft
- PageHeader
- hire-challan/page.tsx
- RedisDraftBackend
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- RazorpayClient
- PantherKnowledgeEngine
- uuid
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- test_ai_phase3_lr_creation.py
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- dependencies.py
- Docker Compose.Yml Component Flow (7)
- transport_reports/service.py
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
- model_validator
- test_live_api.py
- test_issuing_office_system.py
- theme-context.tsx
- is_provider_configured
- scripts
- tailwindcss
- resolve_freight_tiger_token
- update_email_settings
- email_service.py
- asyncio
- KnowledgeChunk
- test_phase6_exit_criteria.py
- output_guards.py
- test_auth.py
- CompanySetting
- main.py
- update_fastag_trip_endpoint
- CompanyVehicleCreate
- discard_active_lr_draft
- extract_client_ip
- copilot_env
- test_env
- test_context
- test_llm_failure_resilience
- list_vendors
- gate_context
- clear_chat_session

## God Nodes (most connected - your core abstractions)
1. `User` - 571 edges
2. `Branch` - 307 edges
3. `Tenant` - 259 edges
4. `PageHeader()` - 203 edges
5. `apiClient()` - 198 edges
6. `react` - 178 edges
7. `Button` - 165 edges
8. `lucide-react` - 153 edges
9. `cn()` - 146 edges
10. `chat_with_copilot()` - 141 edges

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

## Communities (225 total, 114 thin omitted)

### Community 0 - "payment-voucher/page.tsx"
Cohesion: 0.05
Nodes (34): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanyBankAccount, CompanySettingData, DriverOption, HireChallanOption (+26 more)

### Community 1 - "detect_language"
Cohesion: 0.29
Nodes (5): detect_language(), detect_language_with_history(), test_language_detection_english(), test_language_detection_hindi_devanagari(), test_language_detection_hinglish()

### Community 2 - "sqlalchemy"
Cohesion: 0.10
Nodes (18): close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), get_all_tenant_db_names(), rollback_migration(), run_migration(), run_migration() (+10 more)

### Community 3 - "AIDraftStore"
Cohesion: 0.09
Nodes (10): AIDraftStore, test_real_postgres_cross_tenant_isolation(), test_real_postgres_hire_challan_financial_precision(), test_real_postgres_job_creation(), test_real_postgres_lr_creation_and_series_numbering(), test_real_postgres_migration_idempotent_and_archival_rollback(), test_real_postgres_rbac_permission_rejection(), test_real_postgres_unique_constraint_enforcement() (+2 more)

### Community 4 - "Button"
Cohesion: 0.05
Nodes (61): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+53 more)

### Community 5 - "AsyncSession"
Cohesion: 0.05
Nodes (93): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_loading_slip_response(), _build_lr_response(), close_sim_trip(), create_arrival_report() (+85 more)

### Community 6 - "cn"
Cohesion: 0.05
Nodes (65): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+57 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "httpx"
Cohesion: 0.15
Nodes (10): _call_groq(), _call_nvidia(), _call_openai(), _is_valid_key(), sanitize_ai_response(), _stream_groq(), stream_llm(), _stream_nvidia() (+2 more)

### Community 9 - "classify_intent_and_entities"
Cohesion: 0.13
Nodes (6): clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult

### Community 10 - "tenancy.py"
Cohesion: 0.12
Nodes (13): login(), TenantNotFoundException, get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code(), _verify_tenant_active() (+5 more)

### Community 11 - "transport/service.py"
Cohesion: 0.06
Nodes (63): AppException, LoadingSlipCreate, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), _calculate_loading_slip_total(), check_and_deduct_fastag_credit(), check_and_deduct_sim_credit(), close_sim_trip() (+55 more)

### Community 12 - "User"
Cohesion: 0.05
Nodes (75): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+67 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.11
Nodes (20): ForbiddenException, require_accounts_permission(), _check(), require_reports_permission(), _check(), require_statements_permission(), _check(), build_readable_details() (+12 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.10
Nodes (50): create_billing_client(), create_consigner(), create_group_company(), create_industry(), create_load_type(), create_packing_method(), create_unit(), delete_billing_client() (+42 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.06
Nodes (11): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_sim_wallet_balance(), SIMTripRecord, SimWalletTransaction (+3 more)

### Community 18 - "TestFASTagTracking"
Cohesion: 0.07
Nodes (17): clean_vehicle_number(), FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse (+9 more)

### Community 19 - "errors.py"
Cohesion: 0.10
Nodes (15): require_permission(), _check_permission(), _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, RateLimitException, register_error_handlers() (+7 more)

### Community 20 - "general/router.py"
Cohesion: 0.17
Nodes (27): delete_billing_client(), delete_consignee(), delete_consigner(), delete_group_company(), delete_industry(), delete_load_type(), delete_location(), delete_packing_method() (+19 more)

### Community 21 - "check_series_status"
Cohesion: 0.14
Nodes (18): allocate_or_validate_voucher_number(), _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc() (+10 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.07
Nodes (38): ChatMessage, ChatRequest, test_active_draft_destination_slot_filling(), test_cancel_discards_draft(), test_driver_advance_balance_lookup(), test_existing_offtopic_refusals_preserved(), test_find_vehicle_dl01_searches_both_masters_and_lrs(), test_genuine_booking_opens_draft() (+30 more)

### Community 23 - "react"
Cohesion: 0.04
Nodes (139): BranchItem, EInvoiceRecord, TaxpayerDetails, EmployeeRecord, defaultInitialValues, EmployeeRecord, FleetDoc, ServiceRecord (+131 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (57): create_billing_client(), create_consignee(), create_consigner(), create_group_company(), create_industry(), create_load_type(), create_location(), create_packing_method() (+49 more)

### Community 25 - "getStoredAuth"
Cohesion: 0.03
Nodes (115): LoginPage(), PlanOption, PLANS, SignupPage(), BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem (+107 more)

### Community 26 - "tenant_db/models.py"
Cohesion: 0.03
Nodes (80): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+72 more)

### Community 27 - "normal-purchase/page.tsx"
Cohesion: 0.04
Nodes (45): ContraAccountOption, ContraType, LedgerEntry, numberToWords(), VoucherRecord, BillAllocationRecord, CustomerOption, EligibleInvoice (+37 more)

### Community 28 - "lr-register/page.tsx"
Cohesion: 0.11
Nodes (19): ColumnConfig, formatDateDisplay(), getDefaultFinancialYearDates(), LRClientWiseGroup, LRClientWisePage(), LRClientWiseRecord, MONTH_NAMES, TABLE_COLUMNS (+11 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "HireChallan"
Cohesion: 0.11
Nodes (23): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), HireChallan (+15 more)

### Community 31 - "create_general_invoice"
Cohesion: 0.10
Nodes (30): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+22 more)

### Community 32 - "tenant_db/models.py"
Cohesion: 0.05
Nodes (109): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+101 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.17
Nodes (19): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+11 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.11
Nodes (31): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, DLLookupResponse (+23 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (38): create_role(), map_user_to_list_item(), test_email_gateway(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem (+30 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.04
Nodes (91): CompanyBankAccountCreate, CompanyBankAccountResponse, ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance() (+83 more)

### Community 37 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 38 - "auth/service.py"
Cohesion: 0.11
Nodes (22): build_user_navigation(), get_me(), get_user_navigation(), logout(), refresh_token(), LoginRequest, OfficeSummary, RefreshTokenRequest (+14 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.16
Nodes (35): get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches() (+27 more)

### Community 40 - "settings/service.py"
Cohesion: 0.10
Nodes (29): list_admin_settings(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+21 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.05
Nodes (57): DashboardLayout(), WorkspaceCanvas(), PantherAIContext, PantherAIContextType, PantherAIProvider(), usePantherAI(), PantherAILauncher(), Citation (+49 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (34): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+26 more)

### Community 43 - "reports/service.py"
Cohesion: 0.08
Nodes (52): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+44 more)

### Community 44 - "get"
Cohesion: 0.12
Nodes (12): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_roles() (+4 more)

### Community 45 - "LR"
Cohesion: 0.11
Nodes (18): JobCreate, LRCreate, create_job(), create_lr(), test_manual_lr_creation_service_unaffected(), test_manual_job_and_hc_creation_services_unaffected(), test_manual_transport_workflows_regression(), test_auto_create_job_when_lr_has_no_job() (+10 more)

### Community 46 - "Branch"
Cohesion: 0.03
Nodes (92): Entitlement, validate_and_update_job_draft(), _build_hc_idempotent_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), confirm_hire_challan_draft(), confirm_job_draft(), upload_and_extract_document() (+84 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "classify_intent_and_entities"
Cohesion: 0.12
Nodes (12): classify_intent_and_entities(), get_job_guide_response(), test_english_50_cases_intent_and_slots(), test_hindi_hinglish_16_cases(), test_unseen_20_paraphrases(), test_get_job_guide_response(), test_is_user_permitted_with_detached_or_mock_objects(), test_job_creation_routed_to_how_to_guide() (+4 more)

### Community 49 - "Branch"
Cohesion: 0.05
Nodes (64): Plan, PlatformAdmin, Tenant, get_authorized_navigation_catalog(), resolve_navigation_suggestions(), call_llm(), get_ai_tenant_db(), sanitize_ai_output() (+56 more)

### Community 50 - "einvoicing/router.py"
Cohesion: 0.14
Nodes (15): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+7 more)

### Community 51 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 52 - "Client Component Flow"
Cohesion: 0.15
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.29
Nodes (3): BranchUpdate, CompanySettingUpdate, EmailSettingUpdate

### Community 54 - "ai/router.py"
Cohesion: 0.02
Nodes (121): _matches_permission(), get_master_ledger_summary(), list_billing_client_ledgers(), list_driver_ledgers(), list_vendor_ledgers(), build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent() (+113 more)

### Community 55 - "AsyncSession"
Cohesion: 0.20
Nodes (18): create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+10 more)

### Community 56 - "ArrivalReport"
Cohesion: 0.12
Nodes (18): _build_arrival_report_response(), ArrivalReportCreate, ArrivalReportResponse, _build_search_variants(), create_arrival_report(), _fmt_city(), _fmt_date(), _fmt_money() (+10 more)

### Community 57 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.06
Nodes (64): ArrivalReportUpdate, CompanyVehicleBase, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response, Consignment360SearchResult, DriverBase, DriverCreate (+56 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.09
Nodes (43): ATHPaymentCreate, BankStatementImportResponse, BankStatementLineResponse, BillAllocationResponse, BillingClientDueBillSummary, BillingClientLedgerListItem, BTHPaymentCreate, BulkConfirmRequest (+35 more)

### Community 61 - "Any"
Cohesion: 0.07
Nodes (4): BaseDraftBackend, compute_canonical_hash(), InMemoryDraftBackend, normalize_val()

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+10 more)

### Community 63 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "general-purchase/page.tsx"
Cohesion: 0.05
Nodes (39): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+31 more)

### Community 67 - "master-ledger/page.tsx"
Cohesion: 0.13
Nodes (14): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+6 more)

### Community 68 - "test_branch_job_import.py"
Cohesion: 0.18
Nodes (13): list_consignees(), list_consigners(), list_locations(), list_locations_page(), get_all_jobs(), create_sample_excel(), test_db(), test_import_jobs_hq_vs_branch() (+5 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.10
Nodes (9): rewrite_followup_query(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks(), test_lr_nine_statuses_in_knowledge(), test_missing_enums_knowledge_chunks(), test_output_guards_expanded_document_ids(), test_page_registry_all_modules_and_dynamic_fallback(), test_synonym_map_multilingual_expansion() (+1 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 73 - "PageHeader"
Cohesion: 0.04
Nodes (132): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraVoucherPage(), CreditDebitNotesPage(), GeneralInvoicePage(), AccountItem (+124 more)

### Community 74 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 84 - "uuid"
Cohesion: 0.06
Nodes (11): test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud(), test_phase1_exit_criteria_e2e(), test_rbac_custom_role_and_employee_restrictions(), test_phase2_end_to_end_exit_criteria(), test_phase3_end_to_end_exit_criteria() (+3 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "test_ai_phase3_lr_creation.py"
Cohesion: 0.06
Nodes (33): QuotaExceededException, clean_party_name(), handle_conversational_lr_booking(), resolve_or_create_consignee(), resolve_or_create_consigner(), resolve_or_create_location(), validate_and_update_draft(), confirm_lr_draft() (+25 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.10
Nodes (8): ArrivalReportBase, LoadingSlipBase, LoadingSlipResponse, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRResponse, LRUpdate

### Community 89 - "Docker Compose.Yml Component Flow (4)"
Cohesion: 0.18
Nodes (11): deploy, resources, deploy, cpus, memory, deploy, deploy, deploy (+3 more)

### Community 90 - "Docker Compose.Yml Component Flow (5)"
Cohesion: 0.18
Nodes (11): postgres, container_name, depends_on, image, networks, ports, profiles, restart (+3 more)

### Community 92 - "Docker Compose.Yml Component Flow (6)"
Cohesion: 0.20
Nodes (10): container_name, depends_on, environment, image, networks, ports, restart, redis (+2 more)

### Community 93 - "dependencies.py"
Cohesion: 0.21
Nodes (10): get_current_company_admin(), get_current_user(), get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable() (+2 more)

### Community 94 - "Docker Compose.Yml Component Flow (7)"
Cohesion: 0.22
Nodes (8): networks, panther-net, driver, services, volumes, pgadmin_data, postgres_data, redis_data

### Community 95 - "transport_reports/service.py"
Cohesion: 0.13
Nodes (20): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), get_arrival_report_register(), get_hire_challan_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise() (+12 more)

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

### Community 181 - "model_validator"
Cohesion: 0.20
Nodes (4): update_consignee(), update_consigner(), ConsigneeUpdate, ConsignerUpdate

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 187 - "test_issuing_office_system.py"
Cohesion: 0.22
Nodes (15): get_current_office(), get_user_office_context(), get_all_lrs(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence() (+7 more)

### Community 188 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 190 - "is_provider_configured"
Cohesion: 0.15
Nodes (6): extract_booking_entities_via_llm(), is_grounded_in_text(), is_provider_configured(), get_ai_status(), get_context_suggestions(), test_missing_provider_configuration()

### Community 195 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 196 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 197 - "resolve_freight_tiger_token"
Cohesion: 0.24
Nodes (10): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection() (+2 more)

### Community 198 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

### Community 200 - "email_service.py"
Cohesion: 0.15
Nodes (6): get_email_settings(), get_email_setting(), send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 202 - "asyncio"
Cohesion: 0.18
Nodes (5): test_hc_conversational_multiturn_and_math(), test_hc_production_safety_gate_disabled_by_default(), test_job_conversational_hinglish(), test_job_conversational_multiturn_english(), test_job_party_disambiguation()

### Community 203 - "KnowledgeChunk"
Cohesion: 0.29
Nodes (4): _dynamic_navigation_chunks(), KnowledgeChunk, sanitize_chunk_text(), _tms_knowledge_chunks()

### Community 204 - "test_phase6_exit_criteria.py"
Cohesion: 0.22
Nodes (5): test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 205 - "output_guards.py"
Cohesion: 0.27
Nodes (4): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), _norm()

### Community 206 - "test_auth.py"
Cohesion: 0.52
Nodes (5): get_password_hash(), test_demo_admin_auto_reactivation_on_login(), test_non_demo_user_inactive_raises_error(), test_password_hashing(), test_prevent_deactivating_demo_admin_and_self()

### Community 208 - "main.py"
Cohesion: 0.10
Nodes (7): CacheControlMiddleware, health_check(), normalize_tenant_locations_background(), preflight_handler(), root(), test_general_module_crud_masters(), test_job_and_lr_state_machine_transitions()

### Community 209 - "update_fastag_trip_endpoint"
Cohesion: 0.29
Nodes (3): update_fastag_trip_endpoint(), update_sim_trip(), update_sim_trip()

### Community 210 - "CompanyVehicleCreate"
Cohesion: 0.60
Nodes (4): CompanyVehicleCreate, create_company_vehicle(), test_company_vehicle_automatic_ledger_creation(), test_company_vehicle_master_ledger_listing_and_summary()

### Community 218 - "list_vendors"
Cohesion: 0.29
Nodes (9): update_vendor(), VendorUpdate, create_vendor(), delete_vendor(), _ensure_vendor_columns(), list_vendors(), update_vendor(), test_vendor_full_lifecycle() (+1 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1671 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **114 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `AIDraftStore`, `AsyncSession`, `Fleet & Vehicle Maintenance Operations`, `AsyncSession`, `test_issuing_office_system.py`, `errors.py`, `general/router.py`, `chat_with_copilot`, `general/schemas.py`, `tenant_db/models.py`, `home/service.py`, `tenant_db/models.py`, `test_issuing_office_system.py`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `Branch`, `Branch`, `model_validator`, `ai/router.py`, `AsyncSession`, `test_issuing_office_system.py`, `is_provider_configured`, `test_branch_job_import.py`, `update_email_settings`, `test_ai_perfect_tms_enhancements.py`, `email_service.py`, `asyncio`, `test_auth.py`, `CompanySetting`, `update_fastag_trip_endpoint`, `discard_active_lr_draft`, `copilot_env`, `test_ai_phase3_lr_creation.py`, `test_env`, `test_context`, `list_vendors`, `test_llm_failure_resilience`, `gate_context`, `clear_chat_session`, `dependencies.py`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 424 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 424 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `payment-voucher/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050505050505050504 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Branch` to `AIDraftStore`, `AsyncSession`, `transport/service.py`, `User`, `test_issuing_office_system.py`, `general/router.py`, `check_series_status`, `chat_with_copilot`, `general/schemas.py`, `tenant_db/models.py`, `home/service.py`, `HireChallan`, `create_general_invoice`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `Branch`, `ai/router.py`, `AsyncSession`, `test_issuing_office_system.py`, `test_branch_job_import.py`, `test_ai_perfect_tms_enhancements.py`, `asyncio`, `CompanySetting`, `copilot_env`, `test_ai_phase3_lr_creation.py`, `test_env`, `test_context`, `test_llm_failure_resilience`, `gate_context`, `dependencies.py`, `transport_reports/service.py`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 233 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 233 INFERRED edges - model-reasoned connections that need verification._
- **Should `sqlalchemy` be split into smaller, more focused modules?**
  _Cohesion score 0.0992313067784766 - nodes in this community are weakly interconnected._