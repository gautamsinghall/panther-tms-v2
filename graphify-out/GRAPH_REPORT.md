# Graph Report - panther-tms-v2  (2026-11-14)

## Corpus Check
- 429 files · ~632,731 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4588 nodes · 18394 edges · 185 communities (88 shown, 97 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 1945 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c82e00a8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- upload_and_extract_document
- PageHeader
- test_purchase_register_voucher_e2e.py
- GST E-Invoicing & IRN Generation
- AI Job Drafting Service
- SIM & Telecom Tracking Integration
- SIM & Telecom Tracking Integration (2)
- Fleet & Vehicle Maintenance Operations
- Misc Accounting Groups & Categories
- FASTag Toll & Tracking Service (2)
- AI Copilot & Conversational Booking (2)
- SIM & Telecom Tracking Integration (3)
- Accounts Voucher & Banking System (2)
- api-client.ts
- accounts/service.py
- Job
- General Consignor & Consignee Masters
- FreightTigerClient
- utils.ts
- next
- general/router.py
- SeriesMaster
- tenant_db/models.py
- AI Hire Challan Service (2)
- General Consignor & Consignee Masters (3)
- FASTag Toll & Tracking Service (4)
- errors.py
- accounts/schemas.py
- FASTag Toll & Tracking Service (5)
- GST E-Invoicing & IRN Generation (3)
- ai/provider.py
- test_ai_phase3_lr_creation.py
- Multi-Tenant Auth & Permissions
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- handle_conversational_job_booking
- uuid
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- FASTag Toll & Tracking Service (8)
- Multi-Tenant Auth & Permissions (3)
- Multi-Tenant Auth & Permissions (4)
- classify_intent_and_entities
- test_gps_tracking.py
- typing
- get
- FASTag Toll & Tracking Service (10)
- test_live_api.py
- AI Knowledge Base & RAG Index
- put
- Client Component Flow
- CompanySetting
- apiClient
- AsyncSession
- ai/router.py
- Any
- resolve_freight_tiger_token
- list_vendors
- create_role
- package.json
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- discard_active_lr_draft
- tenancy.py
- Draft_Store Component Flow
- Client Component Flow (2)
- ChatMessage
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
- Any

## God Nodes (most connected - your core abstractions)
1. `User` - 531 edges
2. `Tenant` - 259 edges
3. `Branch` - 230 edges
4. `PageHeader()` - 202 edges
5. `apiClient()` - 192 edges
6. `react` - 173 edges
7. `Button` - 155 edges
8. `lucide-react` - 148 edges
9. `DataTable()` - 141 edges
10. `cn()` - 139 edges

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

## Communities (185 total, 97 thin omitted)

### Community 0 - "upload_and_extract_document"
Cohesion: 0.18
Nodes (4): clear_chat_session(), get_ai_tenant_db(), log_blocked_rbac_attempt(), upload_and_extract_document()

### Community 1 - "PageHeader"
Cohesion: 0.03
Nodes (100): MasterLedgerPage(), ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage() (+92 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.06
Nodes (53): ATHPaymentCreate, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, CategoryOverviewStat, CompanyBankAccountBase, CompanyBankAccountCreate, CompanyBankAccountLedgerListItem (+45 more)

### Community 3 - "GST E-Invoicing & IRN Generation"
Cohesion: 0.05
Nodes (120): BranchItem, EInvoiceRecord, TripAdvance, TripExpense, BillingClientPageProps, BillingClientRecord, defaultInitialValues, ConsigneePageProps (+112 more)

### Community 4 - "AI Job Drafting Service"
Cohesion: 0.04
Nodes (69): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+61 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (78): ResourceNotFoundException, add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_lr_response(), close_sim_trip(), create_arrival_report(), create_company_vehicle() (+70 more)

### Community 6 - "SIM & Telecom Tracking Integration (2)"
Cohesion: 0.05
Nodes (62): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, GPSConfig, GPSTrackingPage(), TimelineItem (+54 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (89): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+81 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.05
Nodes (101): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+93 more)

### Community 9 - "FASTag Toll & Tracking Service (2)"
Cohesion: 0.06
Nodes (51): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+43 more)

### Community 10 - "AI Copilot & Conversational Booking (2)"
Cohesion: 0.04
Nodes (86): Plan, Tenant, get_authorized_navigation_catalog(), get_active_lr_draft(), stream_chat_with_copilot(), classify_operational_intent(), execute_accounting_tool(), execute_branch_tool() (+78 more)

### Community 11 - "SIM & Telecom Tracking Integration (3)"
Cohesion: 0.06
Nodes (69): AppException, clean_vehicle_number(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit(), create_arrival_report(), create_company_vehicle(), create_driver(), create_eway_bill() (+61 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.06
Nodes (62): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+54 more)

### Community 13 - "api-client.ts"
Cohesion: 0.03
Nodes (116): BillAllocationRecord, CreditDebitNotesPage(), CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption (+108 more)

### Community 14 - "accounts/service.py"
Cohesion: 0.04
Nodes (84): CompanyBankAccountResponse, CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAgainstInvoiceCreate, ReceiptAllocationItem, ReceiptVoucherCreate, TransportInvoiceCreate (+76 more)

### Community 15 - "Job"
Cohesion: 0.07
Nodes (37): _build_job_response(), list_jobs(), JobCreate, LRCreate, create_job(), create_lr(), get_all_jobs(), get_all_lrs() (+29 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.09
Nodes (57): create_billing_client(), create_consignee(), create_consigner(), create_load_type(), create_location(), delete_billing_client(), delete_consignee(), delete_consigner() (+49 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.05
Nodes (21): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, add_sim_trip_comment(), check_and_deduct_sim_credit(), check_sim_wallet_balance() (+13 more)

### Community 18 - "utils.ts"
Cohesion: 0.04
Nodes (59): FleetDoc, FleetDocumentsPage(), RepairServicePage(), ServiceRecord, TripDrilldown, TruckPnLData, TruckPnLPage(), TruckPnLVehicle (+51 more)

### Community 19 - "next"
Cohesion: 0.05
Nodes (36): Branch, CompanyBankAccount, INDIAN_BANKS, AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm (+28 more)

### Community 20 - "general/router.py"
Cohesion: 0.16
Nodes (29): delete_billing_client(), delete_consignee(), delete_consigner(), delete_designation(), delete_group_company(), delete_industry(), delete_load_type(), delete_location() (+21 more)

### Community 21 - "SeriesMaster"
Cohesion: 0.05
Nodes (34): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges(), get_real_voucher_usage() (+26 more)

### Community 22 - "tenant_db/models.py"
Cohesion: 0.03
Nodes (82): Entitlement, normalize_vehicle_number(), parse_hc_entities_from_text(), validate_and_update_hc_draft(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft() (+74 more)

### Community 23 - "AI Hire Challan Service (2)"
Cohesion: 0.12
Nodes (24): build_hc_preview_card(), build_add_vehicle_driver_response(), _build_hc_idempotent_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), NavigationSuggestion, StructuredCard, addConsigneePrompt() (+16 more)

### Community 24 - "General Consignor & Consignee Masters (3)"
Cohesion: 0.07
Nodes (48): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+40 more)

### Community 25 - "FASTag Toll & Tracking Service (4)"
Cohesion: 0.06
Nodes (59): ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate, DriverBase (+51 more)

### Community 26 - "errors.py"
Cohesion: 0.10
Nodes (13): _cors_headers_for_request(), DuplicateResourceException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler() (+5 more)

### Community 27 - "accounts/schemas.py"
Cohesion: 0.08
Nodes (34): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), generate_voucher_number(), get_account_by_code(), e2e_session() (+26 more)

### Community 28 - "FASTag Toll & Tracking Service (5)"
Cohesion: 0.09
Nodes (21): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), lifespan(), normalize_tenant_locations_background(), seed_demo() (+13 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 30 - "ai/provider.py"
Cohesion: 0.12
Nodes (10): _call_groq(), _call_nvidia(), _call_openai(), _is_valid_key(), sanitize_ai_response(), _stream_groq(), stream_llm(), _stream_nvidia() (+2 more)

### Community 31 - "test_ai_phase3_lr_creation.py"
Cohesion: 0.06
Nodes (33): QuotaExceededException, AIDraft, handle_conversational_lr_booking(), confirm_lr_draft(), ConfirmLRDraftRequest, Branch, audit_db(), anyio_backend() (+25 more)

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.13
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.10
Nodes (33): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, DLLookupResponse (+25 more)

### Community 35 - "settings/router.py"
Cohesion: 0.17
Nodes (26): map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse, AdminSettingsBulkUpdate (+18 more)

### Community 36 - "handle_conversational_job_booking"
Cohesion: 0.16
Nodes (7): build_job_preview_card(), handle_conversational_job_booking(), test_hc_conversational_multiturn_and_math(), test_job_conversational_hinglish(), test_job_conversational_multiturn_english(), test_job_tampering_invalidates_token(), test_job_two_stage_confirmation_and_atomic_db_record()

### Community 37 - "uuid"
Cohesion: 0.04
Nodes (22): CacheControlMiddleware, health_check(), preflight_handler(), root(), test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud() (+14 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.09
Nodes (33): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+25 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.21
Nodes (28): get_gst_pan_client(), FastagWalletTransactionItem, TaxApiCounterResponse, TaxApiTransactionItem, check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches() (+20 more)

### Community 40 - "settings/service.py"
Cohesion: 0.14
Nodes (24): list_admin_settings(), ensure_series_table_schema(), create_new_user(), create_series_category(), create_series_master(), delete_existing_role(), delete_series_category(), delete_series_master() (+16 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.08
Nodes (7): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagTripCreate, FastagWalletTransaction, TestFASTagTracking

### Community 42 - "Multi-Tenant Auth & Permissions (3)"
Cohesion: 0.10
Nodes (31): PlatformAdmin, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete() (+23 more)

### Community 43 - "Multi-Tenant Auth & Permissions (4)"
Cohesion: 0.06
Nodes (76): get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_profit_and_loss(), get_purchase_register(), get_sales_register(), get_special_report() (+68 more)

### Community 44 - "classify_intent_and_entities"
Cohesion: 0.07
Nodes (20): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, detect_language() (+12 more)

### Community 45 - "test_gps_tracking.py"
Cohesion: 0.14
Nodes (13): geocode_gps_endpoint(), GPSConfigResponse, GPSVehicleItem, extract_location_text(), fetch_all_wheelseye_vehicles(), format_wheelseye_vehicle(), get_gps_fleet(), reverse_geocode_point() (+5 more)

### Community 46 - "typing"
Cohesion: 0.08
Nodes (23): get_current_company_admin(), get_current_office(), _matches_permission(), require_permission(), _check_permission(), EntitlementLockedException, ForbiddenException, require_accounts_permission() (+15 more)

### Community 47 - "get"
Cohesion: 0.13
Nodes (11): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_roles() (+3 more)

### Community 48 - "FASTag Toll & Tracking Service (10)"
Cohesion: 0.14
Nodes (30): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+22 more)

### Community 49 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 50 - "AI Knowledge Base & RAG Index"
Cohesion: 0.12
Nodes (5): KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks()

### Community 51 - "put"
Cohesion: 0.13
Nodes (14): update_designation(), update_group_company(), update_industry(), update_load_type(), update_location(), update_packing_method(), update_unit(), DesignationUpdate (+6 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.15
Nodes (9): update_company(), BranchUpdate, CompanySettingUpdate, EmailSettingUpdate, get_email_setting(), update_company_setting(), update_email_setting(), CompanySetting (+1 more)

### Community 54 - "apiClient"
Cohesion: 0.06
Nodes (95): CompanyBankAccountsPage(), ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry, numberToWords(), VoucherRecord, GeneralInvoicePage() (+87 more)

### Community 55 - "AsyncSession"
Cohesion: 0.24
Nodes (15): create_series_category(), create_series_master(), create_user(), delete_role(), delete_series_category(), delete_series_master(), import_default_series_template(), initialize_standard_series() (+7 more)

### Community 56 - "ai/router.py"
Cohesion: 0.04
Nodes (60): handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), is_instructional_job_inquiry(), is_job_booking_intent(), is_job_cancel_intent(), build_system_prompt() (+52 more)

### Community 58 - "resolve_freight_tiger_token"
Cohesion: 0.22
Nodes (10): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection() (+2 more)

### Community 59 - "list_vendors"
Cohesion: 0.31
Nodes (10): create_vendor(), update_vendor(), VendorCreate, VendorUpdate, create_vendor(), delete_vendor(), _ensure_vendor_columns(), list_vendors() (+2 more)

### Community 61 - "create_role"
Cohesion: 0.60
Nodes (5): create_role(), RoleBase, RoleCreate, RoleResponse, create_new_role()

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (45): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, framer-motion@^13.4.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10 (+37 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 67 - "tenancy.py"
Cohesion: 0.12
Nodes (10): generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code(), test_generate_tenant_id(), test_get_tenant_id_from_headers() (+2 more)

### Community 68 - "Draft_Store Component Flow"
Cohesion: 0.13
Nodes (3): AIDraftStore, test_real_redis_draft_persistence_and_locking(), test_real_redis_multi_process_concurrency_lock()

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "ChatMessage"
Cohesion: 0.05
Nodes (49): call_llm(), is_provider_configured(), get_ai_status(), get_context_suggestions(), AIStatusResponse, ChatMessage, ChatRequest, ContextSuggestionResponse (+41 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.14
Nodes (12): build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options(), test_all_issuing_offices_view_for_company_admin(), test_issuing_office_isolation_and_visibility() (+4 more)

### Community 73 - "lr-register/page.tsx"
Cohesion: 0.11
Nodes (19): ColumnConfig, formatDateDisplay(), getDefaultFinancialYearDates(), LRClientWiseGroup, LRClientWisePage(), LRClientWiseRecord, MONTH_NAMES, TABLE_COLUMNS (+11 more)

### Community 75 - "Transport LR & GR Booking Engine (3)"
Cohesion: 0.21
Nodes (4): LRBase, LRInvoiceItem, LRResponse, LRUpdate

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

### Community 185 - "Any"
Cohesion: 0.18
Nodes (6): update_billing_client(), update_consignee(), update_consigner(), BillingClientUpdate, ConsigneeUpdate, ConsignerUpdate

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1505 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **97 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `upload_and_extract_document`, `SIM & Telecom Tracking Integration`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `FASTag Toll & Tracking Service (2)`, `AI Copilot & Conversational Booking (2)`, `accounts/service.py`, `Job`, `general/router.py`, `SeriesMaster`, `tenant_db/models.py`, `AI Hire Challan Service (2)`, `General Consignor & Consignee Masters (3)`, `accounts/schemas.py`, `test_ai_phase3_lr_creation.py`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `settings/router.py`, `handle_conversational_job_booking`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `Multi-Tenant Auth & Permissions (3)`, `Multi-Tenant Auth & Permissions (4)`, `test_gps_tracking.py`, `typing`, `get`, `FASTag Toll & Tracking Service (10)`, `put`, `CompanySetting`, `AsyncSession`, `ai/router.py`, `Any`, `list_vendors`, `create_role`, `discard_active_lr_draft`, `ChatMessage`, `test_activity_audit_log_system.py`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Are the 366 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 366 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PageHeader` be split into smaller, more focused modules?**
  _Cohesion score 0.03110008271298594 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `test_ai_phase3_lr_creation.py` to `test_purchase_register_voucher_e2e.py`, `SIM & Telecom Tracking Integration`, `FASTag Toll & Tracking Service (2)`, `AI Copilot & Conversational Booking (2)`, `SIM & Telecom Tracking Integration (3)`, `Accounts Voucher & Banking System (2)`, `accounts/service.py`, `Job`, `general/router.py`, `SeriesMaster`, `tenant_db/models.py`, `AI Hire Challan Service (2)`, `General Consignor & Consignee Masters (3)`, `accounts/schemas.py`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `handle_conversational_job_booking`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `Multi-Tenant Auth & Permissions (3)`, `Multi-Tenant Auth & Permissions (4)`, `typing`, `get`, `CompanySetting`, `AsyncSession`, `ai/router.py`, `list_vendors`, `ChatMessage`, `test_activity_audit_log_system.py`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 147 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 147 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_purchase_register_voucher_e2e.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06425153793574846 - nodes in this community are weakly interconnected._