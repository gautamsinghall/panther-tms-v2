# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 444 files · ~726,647 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4976 nodes · 20008 edges · 194 communities (97 shown, 97 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 2563 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a710bc81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- StructuredCard
- GSPProviderInterface
- sqlalchemy
- test_voucher_edit_e2e.py
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
- LR
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- fastag_provider/client.py
- errors.py
- general/router.py
- reports/router.py
- Consigner
- react
- general/schemas.py
- getStoredAuth
- tenant_db/models.py
- general-invoice/page.tsx
- test_gps_tracking.py
- home/service.py
- test_purchase_register_voucher_e2e.py
- test_transport_invoice_voucher_e2e.py
- tenant_db/models.py
- test_issuing_office_system.py
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- einvoicing/service.py
- auth/service.py
- FASTag Toll & Tracking Service (7)
- settings/service.py
- sidebar.tsx
- control/service.py
- reports/service.py
- get
- CompanySetting
- stream_chat_with_copilot
- daybook/page.tsx
- hc-register/page.tsx
- Tenant
- einvoicing/service.py
- state-select.tsx
- Client Component Flow
- CompanySetting
- test_ai_phase3_lr_creation.py
- AsyncSession
- get_consignment_360
- statements/service.py
- transport/schemas.py
- accounts/schemas.py
- transport/models.py
- Any
- package.json
- create_user
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- tracking/fastag/page.tsx
- master-ledger/page.tsx
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- resolve_freight_tiger_token
- Button
- job_draft_service.py
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- RazorpayClient
- main.py
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- test_ai_real_postgres_redis.py
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- statements/router.py
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
- test_live_api.py
- update_email_settings
- email_service.py
- ai/router.py

## God Nodes (most connected - your core abstractions)
1. `User` - 575 edges
2. `Branch` - 314 edges
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

## Communities (194 total, 97 thin omitted)

### Community 0 - "StructuredCard"
Cohesion: 0.11
Nodes (21): build_add_vehicle_driver_response(), _build_lr_idempotent_response(), NavigationSuggestion, StructuredCard, addConsigneePrompt(), driverBalance(), format_currency(), getHowTo() (+13 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.06
Nodes (28): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), lifespan(), normalize_tenant_locations_background(), _call_nvidia() (+20 more)

### Community 3 - "test_voucher_edit_e2e.py"
Cohesion: 0.07
Nodes (36): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), generate_voucher_number(), get_account_by_code(), get_journal_adjustment_types_list() (+28 more)

### Community 4 - "button.tsx"
Cohesion: 0.04
Nodes (61): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+53 more)

### Community 5 - "transport/router.py"
Cohesion: 0.05
Nodes (99): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_arrival_report_response(), _build_hire_challan_response(), _build_job_response(), _build_loading_slip_response(), _build_lr_response(), close_sim_trip() (+91 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (73): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, GPSConfig, GPSTrackingPage(), TimelineItem (+65 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (31): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+23 more)

### Community 9 - "classify_intent_and_entities"
Cohesion: 0.04
Nodes (31): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, detect_language() (+23 more)

### Community 10 - "sidebar.tsx"
Cohesion: 0.08
Nodes (34): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+26 more)

### Community 11 - "transport/service.py"
Cohesion: 0.08
Nodes (53): AppException, ArrivalReportCreate, add_sim_trip_comment(), create_arrival_report(), create_company_vehicle(), create_driver(), create_eway_bill(), create_manual_fastag_trip() (+45 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (74): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+66 more)

### Community 13 - "AsyncSession"
Cohesion: 0.14
Nodes (30): change_user_password(), create_new_branch(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email(), get_fastag_wallet() (+22 more)

### Community 14 - "LR"
Cohesion: 0.03
Nodes (84): allocate_or_validate_voucher_number(), _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+76 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.11
Nodes (16): build_readable_details(), extract_client_ip(), get_activity_filters(), get_activity_stats(), query_activity_logs(), UserOfficeAssignment, audit_db(), test_activity_logging_records_exact_details() (+8 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.07
Nodes (70): ensure_unified_creditor_vendors(), create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type() (+62 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.11
Nodes (7): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, TestSimOperatorAndRealData, TestSIMTrackingFreightTiger

### Community 18 - "fastag_provider/client.py"
Cohesion: 0.09
Nodes (11): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse, FastagTripCreate (+3 more)

### Community 19 - "errors.py"
Cohesion: 0.06
Nodes (25): _cors_headers_for_request(), DuplicateResourceException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler() (+17 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (54): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+46 more)

### Community 21 - "reports/router.py"
Cohesion: 0.12
Nodes (25): get_current_company_admin(), get_current_office(), require_permission(), _check_permission(), EntitlementLockedException, ForbiddenException, require_accounts_permission(), _check() (+17 more)

### Community 22 - "Consigner"
Cohesion: 0.04
Nodes (70): ChatMessage, ChatRequest, CompanyVehicle, Consignee, Consigner, Location, MarketVehicle, Role (+62 more)

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
Nodes (32): list_duties_and_taxes_ledgers(), list_vendor_ledgers(), verify_and_heal_chart_of_accounts(), seed_indian_accounting_chart_of_accounts(), Account, Driver, GroupInPrimary, GroupNature (+24 more)

### Community 27 - "general-invoice/page.tsx"
Cohesion: 0.11
Nodes (19): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, LRRecord, SeriesRangeItem, ServiceLineInput (+11 more)

### Community 28 - "test_gps_tracking.py"
Cohesion: 0.10
Nodes (19): clean_vehicle_number(), GPSConfigResponse, GPSFleetCounts, GPSFleetResponse, GPSTrackResponse, GPSTripInfo, GPSVehicleItem, extract_location_text() (+11 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.21
Nodes (10): PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, e2e_session(), test_hire_challan_integration_and_duplicate_prevention(), test_ineligible_blocked_itc_section_17_5(), test_inter_state_purchase_bill_and_payment_settlement(), test_intra_state_purchase_bill_fcm() (+2 more)

### Community 31 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.29
Nodes (8): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 32 - "tenant_db/models.py"
Cohesion: 0.05
Nodes (109): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+101 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.13
Nodes (28): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+20 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.10
Nodes (32): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse, DLLookupResponse (+24 more)

### Community 35 - "settings/router.py"
Cohesion: 0.14
Nodes (33): create_role(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+25 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.04
Nodes (93): CompanyBankAccountCreate, CompanyBankAccountResponse, CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, PaymentAllocationItem, PaymentVoucherCreate, ReceiptAllocationItem (+85 more)

### Community 37 - "einvoicing/service.py"
Cohesion: 0.36
Nodes (7): get_gsp_provider(), cancel_irn(), generate_irn_for_voucher(), get_einvoice_by_irn(), get_irn_list(), EInvoiceRecord, EInvoiceStatus

### Community 38 - "auth/service.py"
Cohesion: 0.09
Nodes (31): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+23 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.19
Nodes (32): get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches(), get_company_setting() (+24 more)

### Community 40 - "settings/service.py"
Cohesion: 0.10
Nodes (29): ensure_series_table_schema(), create_series_category(), create_series_master(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+21 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.03
Nodes (74): DashboardLayout(), WorkspaceCanvas(), CompanyVehicleRecord, CompanyVehiclesPageProps, DriverOption, OwnerOption, BranchOption, ChargeHeadOption (+66 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (31): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+23 more)

### Community 43 - "reports/service.py"
Cohesion: 0.13
Nodes (38): trigger_report_export(), BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse (+30 more)

### Community 44 - "get"
Cohesion: 0.12
Nodes (20): get_permissions_schema(), check_series(), create_series_category(), create_series_master(), create_staff_recipient(), get_activity_filters(), get_activity_stats(), get_email_settings() (+12 more)

### Community 45 - "CompanySetting"
Cohesion: 0.29
Nodes (4): get_email_setting(), update_email_setting(), CompanySetting, EmailSetting

### Community 46 - "stream_chat_with_copilot"
Cohesion: 0.06
Nodes (33): _matches_permission(), list_driver_ledgers(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), get_active_lr_draft(), stream_chat_with_copilot(), execute_accounting_tool(), execute_branch_tool() (+25 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 49 - "Tenant"
Cohesion: 0.05
Nodes (65): Plan, PlatformAdmin, Tenant, get_authorized_navigation_catalog(), get_ai_tenant_db(), classify_operational_intent(), Branch, copilot_env() (+57 more)

### Community 50 - "einvoicing/service.py"
Cohesion: 0.18
Nodes (11): cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest, EInvoiceResponse (+3 more)

### Community 51 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.29
Nodes (3): BranchUpdate, CompanySettingUpdate, EmailSettingUpdate

### Community 54 - "test_ai_phase3_lr_creation.py"
Cohesion: 0.04
Nodes (48): QuotaExceededException, clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent() (+40 more)

### Community 55 - "AsyncSession"
Cohesion: 0.18
Nodes (15): delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient(), update_admin_settings(), update_role(), update_series_category(), update_series_master() (+7 more)

### Community 56 - "get_consignment_360"
Cohesion: 0.10
Nodes (14): auto_sync_all_in_transit_fastag(), _build_search_variants(), check_and_deduct_fastag_credit(), _fmt_city(), _fmt_date(), _fmt_money(), _fmt_name(), get_arrival_lr_options() (+6 more)

### Community 57 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.07
Nodes (49): ArrivalReportBase, ArrivalReportResponse, ArrivalReportUpdate, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response (+41 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.05
Nodes (63): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account(), get_staff_imprest_ledger_detail() (+55 more)

### Community 60 - "transport/models.py"
Cohesion: 0.07
Nodes (19): check_and_deduct_sim_credit(), check_sim_wallet_balance(), close_sim_trip(), create_sim_trip(), parse_iso_or_utc(), record_tracking_ping(), simulate_sim_consent(), sync_all_active_sim_trips() (+11 more)

### Community 61 - "Any"
Cohesion: 0.06
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, framer-motion@^13.4.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10 (+36 more)

### Community 63 - "create_user"
Cohesion: 1.00
Nodes (3): create_user(), UserCreate, create_new_user()

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
Cohesion: 0.11
Nodes (7): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "resolve_freight_tiger_token"
Cohesion: 0.25
Nodes (8): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, get_api_center_setting(), update_api_center_setting(), test_api_center_wheelseye_schema()

### Community 73 - "Button"
Cohesion: 0.03
Nodes (148): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+140 more)

### Community 75 - "job_draft_service.py"
Cohesion: 0.20
Nodes (6): build_job_preview_card(), handle_conversational_job_booking(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft()

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

### Community 84 - "main.py"
Cohesion: 0.03
Nodes (29): CacheControlMiddleware, health_check(), preflight_handler(), root(), compute_canonical_hash(), normalize_val(), _call_groq(), _stream_groq() (+21 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "test_ai_real_postgres_redis.py"
Cohesion: 0.04
Nodes (53): Entitlement, AIDraft, AIDraftStore, build_hc_preview_card(), handle_conversational_hc_booking(), normalize_vehicle_number(), parse_hc_entities_from_text(), validate_and_update_hc_draft() (+45 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.10
Nodes (14): LoadingSlipBase, LoadingSlipCreate, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRUpdate, _calculate_loading_slip_total(), create_loading_slip() (+6 more)

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
Cohesion: 0.36
Nodes (8): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return(), get_tenant_db()

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
Cohesion: 0.05
Nodes (82): BranchItem, IssuingOfficesPage(), CancelIRNContent(), CancelIRNPage(), EInvoiceRecord, EInvoiceResponse, GenerateIRNPage(), VoucherRecord (+74 more)

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 198 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

### Community 200 - "email_service.py"
Cohesion: 0.17
Nodes (6): test_email_gateway(), EmailTestRequest, send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 216 - "ai/router.py"
Cohesion: 0.04
Nodes (55): is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), is_instructional_job_inquiry(), is_job_booking_intent(), is_job_cancel_intent(), build_system_prompt(), format_page_registry_entry() (+47 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1671 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **97 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `transport/router.py` to `StructuredCard`, `test_voucher_edit_e2e.py`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `classify_intent_and_entities`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `LR`, `test_issuing_office_system.py`, `general/router.py`, `reports/router.py`, `Consigner`, `tenant_db/models.py`, `home/service.py`, `tenant_db/models.py`, `test_issuing_office_system.py`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `CompanySetting`, `stream_chat_with_copilot`, `Tenant`, `test_ai_phase3_lr_creation.py`, `AsyncSession`, `create_user`, `update_email_settings`, `email_service.py`, `job_draft_service.py`, `test_ai_real_postgres_redis.py`, `ai/router.py`, `statements/router.py`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 428 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 428 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `StructuredCard` be split into smaller, more focused modules?**
  _Cohesion score 0.11201079622132254 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Tenant` to `StructuredCard`, `test_voucher_edit_e2e.py`, `transport/router.py`, `bank_statement_service.py`, `classify_intent_and_entities`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `LR`, `test_issuing_office_system.py`, `general/router.py`, `reports/router.py`, `Consigner`, `tenant_db/models.py`, `home/service.py`, `test_purchase_register_voucher_e2e.py`, `test_transport_invoice_voucher_e2e.py`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `get`, `CompanySetting`, `stream_chat_with_copilot`, `test_ai_phase3_lr_creation.py`, `AsyncSession`, `create_user`, `job_draft_service.py`, `test_ai_real_postgres_redis.py`, `ai/router.py`, `test_loading_slip.py`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 241 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 241 INFERRED edges - model-reasoned connections that need verification._
- **Should `sqlalchemy` be split into smaller, more focused modules?**
  _Cohesion score 0.06327006327006326 - nodes in this community are weakly interconnected._