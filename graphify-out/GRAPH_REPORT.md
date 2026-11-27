# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 444 files · ~726,389 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4972 nodes · 20017 edges · 196 communities (98 shown, 98 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 2687 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e86bd2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- StructuredCard
- GSPProviderInterface
- sqlalchemy
- LR
- button.tsx
- transport/router.py
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- classify_intent_and_entities
- sidebar.tsx
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- Consigner
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- fastag_provider/client.py
- errors.py
- general/router.py
- reports/router.py
- chat_with_copilot
- react
- general/schemas.py
- getStoredAuth
- tenant_db/models.py
- general-invoice/page.tsx
- knowledge.py
- home/service.py
- series_service.py
- AIDraftStore
- tenant_db/models.py
- test_issuing_office_system.py
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- Job
- auth/service.py
- FASTag Toll & Tracking Service (7)
- settings/service.py
- sidebar.tsx
- control/service.py
- reports/service.py
- get
- create_general_invoice
- stream_chat_with_copilot
- daybook/page.tsx
- hc-register/page.tsx
- Tenant
- einvoicing/service.py
- state-select.tsx
- Client Component Flow
- CompanySetting
- lr_draft_service.py
- AsyncSession
- get_consignment_360
- statements/service.py
- transport/schemas.py
- accounts/schemas.py
- TestSIMTrackingWallet
- RedisDraftBackend
- package.json
- BaseDraftBackend
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- tracking/fastag/page.tsx
- master-ledger/page.tsx
- InMemoryDraftBackend
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- resolve_freight_tiger_token
- Button
- Any
- job_draft_service.py
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- test_loading_slip.py
- gps-tracking-map.tsx
- auth/router.py
- Multi-Tenant Auth & Permissions (7)
- RazorpayClient
- confirm_job_draft
- main.py
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- Branch
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- statements/router.py
- Docker Compose.Yml Component Flow (7)
- create_company_vehicle
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
- test_live_api.py
- update_email_settings
- email_service.py
- ai/router.py

## God Nodes (most connected - your core abstractions)
1. `User` - 575 edges
2. `Branch` - 332 edges
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

## Communities (196 total, 98 thin omitted)

### Community 0 - "StructuredCard"
Cohesion: 0.07
Nodes (32): build_add_vehicle_driver_response(), _build_hc_idempotent_response(), build_how_to_lr_response(), _build_lr_idempotent_response(), get_ai_status(), get_context_suggestions(), get_lr_explanation_markdown(), get_lr_guide_response() (+24 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.09
Nodes (21): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), lifespan(), normalize_tenant_locations_background(), seed_demo() (+13 more)

### Community 3 - "LR"
Cohesion: 0.11
Nodes (26): get_arrival_report_register(), get_lr_booking_register(), get_unbilled_lrs(), get_unused_series(), get_all_jobs(), get_all_lrs(), get_lr_by_id(), LR (+18 more)

### Community 4 - "button.tsx"
Cohesion: 0.04
Nodes (61): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+53 more)

### Community 5 - "transport/router.py"
Cohesion: 0.05
Nodes (94): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_arrival_report_response(), _build_hire_challan_response(), _build_loading_slip_response(), _build_lr_response(), close_sim_trip(), create_arrival_report() (+86 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (73): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, GPSConfig, GPSTrackingPage(), TimelineItem (+65 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (91): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+83 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.06
Nodes (35): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+27 more)

### Community 9 - "classify_intent_and_entities"
Cohesion: 0.06
Nodes (24): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, detect_language() (+16 more)

### Community 10 - "sidebar.tsx"
Cohesion: 0.08
Nodes (34): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+26 more)

### Community 11 - "transport/service.py"
Cohesion: 0.05
Nodes (73): AppException, ArrivalReportCreate, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit(), check_and_deduct_sim_credit(), close_sim_trip(), create_arrival_report() (+65 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (70): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+62 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "Consigner"
Cohesion: 0.06
Nodes (39): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+31 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.10
Nodes (23): get_current_company_admin(), get_current_office(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission(), _check(), require_statements_permission() (+15 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.07
Nodes (70): ensure_unified_creditor_vendors(), create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type() (+62 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.11
Nodes (3): detect_telecom_operator(), FreightTigerClient, TestSIMTrackingFreightTiger

### Community 18 - "fastag_provider/client.py"
Cohesion: 0.14
Nodes (4): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates()

### Community 19 - "errors.py"
Cohesion: 0.10
Nodes (15): require_permission(), _check_permission(), _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, RateLimitException, register_error_handlers() (+7 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (54): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+46 more)

### Community 21 - "reports/router.py"
Cohesion: 0.16
Nodes (17): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+9 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.07
Nodes (40): chat_with_copilot(), ChatMessage, ChatRequest, anyio_backend(), copilot_env(), test_active_draft_destination_slot_filling(), test_cancel_discards_draft(), test_driver_advance_balance_lookup() (+32 more)

### Community 23 - "react"
Cohesion: 0.04
Nodes (134): BillingClientItem, LedgerEntry, VoucherRecord, EInvoiceRecord, TaxpayerDetails, EmployeeRecord, defaultInitialValues, EmployeeRecord (+126 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.07
Nodes (45): BillingClientBase, BillingClientCreate, BillingClientResponse, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate (+37 more)

### Community 25 - "getStoredAuth"
Cohesion: 0.03
Nodes (79): LoginPage(), PlanOption, PLANS, SignupPage(), BillAllocationItem, BranchData, CompanySettingData, LedgerEntry (+71 more)

### Community 26 - "tenant_db/models.py"
Cohesion: 0.07
Nodes (41): list_duties_and_taxes_ledgers(), list_vendor_ledgers(), verify_and_heal_chart_of_accounts(), activate_employee_imprest(), create_account(), create_group_in_primary(), delete_account(), delete_group_in_primary() (+33 more)

### Community 27 - "general-invoice/page.tsx"
Cohesion: 0.11
Nodes (19): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, LRRecord, SeriesRangeItem, ServiceLineInput (+11 more)

### Community 28 - "knowledge.py"
Cohesion: 0.12
Nodes (13): build_system_prompt(), format_page_registry_entry(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), build_page_help_response(), get_greeting_response(), get_page_awareness_response() (+5 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "series_service.py"
Cohesion: 0.14
Nodes (18): allocate_or_validate_voucher_number(), _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc() (+10 more)

### Community 31 - "AIDraftStore"
Cohesion: 0.13
Nodes (3): AIDraftStore, test_real_redis_draft_persistence_and_locking(), test_real_redis_multi_process_concurrency_lock()

### Community 32 - "tenant_db/models.py"
Cohesion: 0.05
Nodes (94): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+86 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.15
Nodes (24): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+16 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.11
Nodes (31): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, DLLookupResponse (+23 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (36): list_roles(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+28 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.04
Nodes (92): get_or_create_party_account(), CompanyBankAccountResponse, PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, ReceiptAgainstInvoiceCreate (+84 more)

### Community 37 - "Job"
Cohesion: 0.13
Nodes (22): compute_canonical_hash(), _build_job_response(), JobCreate, JobUpdate, LRCreate, LRUpdate, create_job(), create_lr() (+14 more)

### Community 38 - "auth/service.py"
Cohesion: 0.09
Nodes (28): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), refresh_token(), LoginRequest, OfficeSummary, RefreshTokenRequest (+20 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.17
Nodes (34): get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches() (+26 more)

### Community 40 - "settings/service.py"
Cohesion: 0.09
Nodes (31): create_new_role(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+23 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.03
Nodes (74): DashboardLayout(), WorkspaceCanvas(), CompanyVehicleRecord, CompanyVehiclesPageProps, DriverOption, OwnerOption, BranchOption, ChargeHeadOption (+66 more)

### Community 42 - "control/service.py"
Cohesion: 0.08
Nodes (33): PlatformAdmin, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete() (+25 more)

### Community 43 - "reports/service.py"
Cohesion: 0.14
Nodes (36): BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse, ExportJobCreate (+28 more)

### Community 44 - "get"
Cohesion: 0.12
Nodes (12): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_admin_settings() (+4 more)

### Community 45 - "create_general_invoice"
Cohesion: 0.12
Nodes (25): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, create_general_invoice(), test_commercial_note_without_gst_adjustment(), test_credit_note_over_adjustment_prevention() (+17 more)

### Community 46 - "stream_chat_with_copilot"
Cohesion: 0.06
Nodes (32): _matches_permission(), clean_vehicle_number(), get_active_lr_draft(), get_blocked_delete_message(), get_bulk_pii_refusal_message(), stream_chat_with_copilot(), execute_accounting_tool(), execute_branch_tool() (+24 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 49 - "Tenant"
Cohesion: 0.05
Nodes (61): Plan, Tenant, get_authorized_navigation_catalog(), classify_operational_intent(), execute_lr_tool(), execute_tracking_tool(), execute_vehicle_tool(), test_api_chat_endpoint_live_mock_response() (+53 more)

### Community 50 - "einvoicing/service.py"
Cohesion: 0.13
Nodes (18): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+10 more)

### Community 51 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.29
Nodes (3): BranchUpdate, CompanySettingUpdate, EmailSettingUpdate

### Community 54 - "lr_draft_service.py"
Cohesion: 0.06
Nodes (29): clean_party_name(), handle_conversational_lr_booking(), is_cancel_intent(), is_instructional_inquiry(), is_lr_booking_intent(), is_valid_indian_vehicle(), is_valid_location_name(), is_valid_party_name() (+21 more)

### Community 55 - "AsyncSession"
Cohesion: 0.19
Nodes (20): create_role(), create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+12 more)

### Community 56 - "get_consignment_360"
Cohesion: 0.19
Nodes (9): _build_search_variants(), _fmt_city(), _fmt_date(), _fmt_money(), _fmt_name(), get_arrival_lr_options(), get_consignment_360(), search_consignment_360_suggestions() (+1 more)

### Community 57 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.05
Nodes (71): ArrivalReportBase, ArrivalReportResponse, ArrivalReportUpdate, CompanyVehicleBase, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response, Consignment360SearchResult (+63 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.04
Nodes (92): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_staff_imprest_ledger_detail(), get_vendor_ledger_detail() (+84 more)

### Community 60 - "TestSIMTrackingWallet"
Cohesion: 0.14
Nodes (3): check_sim_wallet_balance(), SimWalletTransaction, TestSIMTrackingWallet

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, framer-motion@^13.4.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10 (+36 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "tracking/fastag/page.tsx"
Cohesion: 0.21
Nodes (12): FastagTrackingPage(), FastagTripSummary, LRSummary, computePathDistanceKm(), FastagMap(), FastagMapProps, geocodeCache, getHaversineDistanceKm() (+4 more)

### Community 67 - "master-ledger/page.tsx"
Cohesion: 0.13
Nodes (14): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+6 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "PantherKnowledgeEngine"
Cohesion: 0.07
Nodes (14): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks() (+6 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "resolve_freight_tiger_token"
Cohesion: 0.22
Nodes (10): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection() (+2 more)

### Community 73 - "Button"
Cohesion: 0.03
Nodes (148): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+140 more)

### Community 75 - "job_draft_service.py"
Cohesion: 0.07
Nodes (22): build_job_preview_card(), handle_conversational_job_booking(), is_job_cancel_intent(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft(), extract_booking_entities_via_llm() (+14 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "test_loading_slip.py"
Cohesion: 0.33
Nodes (9): LoadingSlipCreate, _calculate_loading_slip_total(), create_loading_slip(), get_all_loading_slips(), get_loading_slip_by_id(), _populate_loading_slip_relations(), update_loading_slip(), LoadingSlip (+1 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

### Community 80 - "auth/router.py"
Cohesion: 0.11
Nodes (15): login(), logout(), TenantNotFoundException, get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code() (+7 more)

### Community 83 - "confirm_job_draft"
Cohesion: 0.18
Nodes (5): _build_job_idempotent_response(), clear_chat_session(), confirm_job_draft(), get_ai_tenant_db(), log_blocked_rbac_attempt()

### Community 84 - "main.py"
Cohesion: 0.04
Nodes (22): CacheControlMiddleware, health_check(), preflight_handler(), root(), test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud() (+14 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "Branch"
Cohesion: 0.03
Nodes (91): Entitlement, QuotaExceededException, AIDraft, normalize_vehicle_number(), validate_and_update_hc_draft(), confirm_hire_challan_draft(), confirm_lr_draft(), ConfirmHireChallanDraftRequest (+83 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.12
Nodes (6): LoadingSlipBase, LoadingSlipResponse, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRResponse

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

### Community 95 - "create_company_vehicle"
Cohesion: 0.52
Nodes (5): create_company_vehicle(), CompanyVehicleCreate, create_company_vehicle(), test_company_vehicle_automatic_ledger_creation(), test_company_vehicle_master_ledger_listing_and_summary()

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
Cohesion: 0.05
Nodes (82): BranchItem, IssuingOfficesPage(), CancelIRNContent(), CancelIRNPage(), EInvoiceRecord, EInvoiceResponse, GenerateIRNPage(), VoucherRecord (+74 more)

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 198 - "update_email_settings"
Cohesion: 0.20
Nodes (6): get_email_settings(), update_email_settings(), EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 216 - "ai/router.py"
Cohesion: 0.04
Nodes (40): build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), parse_hc_entities_from_text(), is_instructional_job_inquiry(), is_job_booking_intent() (+32 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1668 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **98 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `transport/router.py` to `StructuredCard`, `LR`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `Consigner`, `test_issuing_office_system.py`, `errors.py`, `general/router.py`, `reports/router.py`, `chat_with_copilot`, `tenant_db/models.py`, `knowledge.py`, `home/service.py`, `tenant_db/models.py`, `test_issuing_office_system.py`, `settings/router.py`, `accounts/service.py`, `Job`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `get`, `stream_chat_with_copilot`, `Tenant`, `lr_draft_service.py`, `AsyncSession`, `accounts/schemas.py`, `update_email_settings`, `PantherKnowledgeEngine`, `job_draft_service.py`, `auth/router.py`, `confirm_job_draft`, `Branch`, `ai/router.py`, `statements/router.py`, `create_company_vehicle`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Are the 514 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 514 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `StructuredCard` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Branch` to `StructuredCard`, `LR`, `transport/router.py`, `bank_statement_service.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `Consigner`, `test_issuing_office_system.py`, `general/router.py`, `reports/router.py`, `chat_with_copilot`, `tenant_db/models.py`, `knowledge.py`, `home/service.py`, `series_service.py`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `Job`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `get`, `create_general_invoice`, `stream_chat_with_copilot`, `Tenant`, `lr_draft_service.py`, `AsyncSession`, `accounts/schemas.py`, `PantherKnowledgeEngine`, `job_draft_service.py`, `test_loading_slip.py`, `confirm_job_draft`, `ai/router.py`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 260 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 260 INFERRED edges - model-reasoned connections that need verification._
- **Should `sqlalchemy` be split into smaller, more focused modules?**
  _Cohesion score 0.09417249417249417 - nodes in this community are weakly interconnected._