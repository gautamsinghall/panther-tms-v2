# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 443 files · ~715,868 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4971 nodes · 19743 edges · 228 communities (112 shown, 116 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2084 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e8b0edfa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LR
- einvoicing/service.py
- sqlalchemy
- Button
- formatCurrency
- transport/router.py
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- re
- misc/router.py
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- typed_tools.py
- test_activity_audit_log_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- TestFASTagTracking
- test_voucher_edit_e2e.py
- general/router.py
- SeriesMaster
- chat_with_copilot
- toast.ts
- general/schemas.py
- signup/page.tsx
- misc/schemas.py
- track_gps_single_vehicle
- FastAPI
- home/service.py
- excel_import.py
- lr-register/page.tsx
- misc/service.py
- test_issuing_office_system.py
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- test_ai_phase4_job_and_challan.py
- auth/service.py
- FASTag Toll & Tracking Service (7)
- create_staff_recipient
- getStoredAuth
- control/service.py
- reports/service.py
- panther-ai-panel.tsx
- create_general_invoice
- test_purchase_register_voucher_e2e.py
- daybook/page.tsx
- Any
- Tenant
- VoucherType
- classify_operational_intent
- Client Component Flow
- CompanySetting
- NavigationSuggestion
- AsyncSession
- hire-challan/page.tsx
- statements/service.py
- transport/schemas.py
- BaseModel
- get
- package.json
- react-dom
- Any
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- normal-purchase/page.tsx
- CacheControlMiddleware
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- ForbiddenException
- formatDate
- httpx
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- test_phase6_exit_criteria.py
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
- upload_and_extract_document
- test_e2e_hindi_hard_rule_0_delete_refusal
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- SIMTripRecord
- output_guards.py
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
- resolve_freight_tiger_token
- settings/roles/page.tsx
- get_page_registry_entry
- test_ai_job_creation_removal.py
- CompanySetting
- test_dl
- update_series_master
- email_service.py
- update_job
- create_user
- detect_language_with_history
- get_blocked_delete_message
- fixture
- fixture
- handle_conversational_lr_booking
- scripts
- pytest

## God Nodes (most connected - your core abstractions)
1. `User` - 569 edges
2. `Tenant` - 258 edges
3. `Branch` - 236 edges
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
- `test_billing_client_ledger_lifecycle()` --uses--> `VoucherCreate`  [INFERRED]
  backend/tests/test_master_ledger_system.py → backend/app/modules/accounts/schemas.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (228 total, 116 thin omitted)

### Community 0 - "LR"
Cohesion: 0.05
Nodes (56): _matches_permission(), Entitlement, is_cancel_intent(), is_instructional_inquiry(), is_lr_booking_intent(), is_valid_party_name(), extract_vehicle_number(), LRCreate (+48 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.07
Nodes (25): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check(), lifespan(), normalize_tenant_locations_background() (+17 more)

### Community 3 - "Button"
Cohesion: 0.05
Nodes (59): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+51 more)

### Community 4 - "formatCurrency"
Cohesion: 0.02
Nodes (115): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+107 more)

### Community 5 - "transport/router.py"
Cohesion: 0.04
Nodes (92): generate_job_import_template(), add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_loading_slip_response(), _build_lr_response(), close_sim_trip() (+84 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (81): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+73 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (89): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+81 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (30): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+22 more)

### Community 9 - "re"
Cohesion: 0.07
Nodes (23): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, is_instructional_job_inquiry() (+15 more)

### Community 10 - "misc/router.py"
Cohesion: 0.10
Nodes (40): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+32 more)

### Community 11 - "transport/service.py"
Cohesion: 0.05
Nodes (74): AppException, clean_vehicle_number(), GPSTripInfo, HireChallanUpdate, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), _build_search_variants(), _calculate_loading_slip_total() (+66 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (75): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+67 more)

### Community 13 - "AsyncSession"
Cohesion: 0.15
Nodes (27): create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email(), get_fastag_wallet() (+19 more)

### Community 14 - "typed_tools.py"
Cohesion: 0.07
Nodes (33): PlatformAdmin, Tenant, discard_active_lr_draft(), NavigationSuggestion, StructuredCard, execute_vehicle_tool(), addConsigneePrompt(), driverBalance() (+25 more)

### Community 15 - "test_activity_audit_log_system.py"
Cohesion: 0.19
Nodes (6): build_readable_details(), get_activity_filters(), get_activity_stats(), UserActivity, UserOfficeAssignment, audit_db()

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (69): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+61 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.10
Nodes (9): detect_telecom_operator(), FreightTigerClient, SIMConsentSimulate, SIMTripClose, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, TestSimOperatorAndRealData (+1 more)

### Community 18 - "TestFASTagTracking"
Cohesion: 0.08
Nodes (12): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse, FastagTripCreate (+4 more)

### Community 19 - "test_voucher_edit_e2e.py"
Cohesion: 0.08
Nodes (32): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_journal_voucher(), get_account_by_code(), e2e_session(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal() (+24 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "SeriesMaster"
Cohesion: 0.16
Nodes (17): _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+9 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.09
Nodes (38): chat_with_copilot(), get_bulk_pii_refusal_message(), get_capabilities_list_markdown(), ChatMessage, ChatRequest, test_active_draft_destination_slot_filling(), test_cancel_discards_draft(), test_driver_advance_balance_lookup() (+30 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (136): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, EInvoiceRecord, TaxpayerDetails, EmployeeRecord, defaultInitialValues (+128 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.09
Nodes (32): BillingClientBase, BillingClientCreate, BillingClientResponse, DesignationBase, DesignationCreate, DesignationResponse, DesignationUpdate, GroupCompanyBase (+24 more)

### Community 25 - "signup/page.tsx"
Cohesion: 0.18
Nodes (15): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+7 more)

### Community 26 - "misc/schemas.py"
Cohesion: 0.12
Nodes (29): AccountBase, AccountCreate, AccountResponse, AccountUpdate, ChargeHeadBase, ChargeHeadCreate, ChargeHeadResponse, ChargeHeadUpdate (+21 more)

### Community 27 - "track_gps_single_vehicle"
Cohesion: 0.12
Nodes (14): GPSFleetCounts, GPSFleetResponse, GPSHistoryResponse, GPSHistorySummary, GPSTimelineItem, GPSTrackResponse, GPSVehicleItem, fetch_all_wheelseye_vehicles() (+6 more)

### Community 28 - "FastAPI"
Cohesion: 0.11
Nodes (15): TenantInactiveException, TenantNotFoundException, generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code() (+7 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.06
Nodes (32): generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location(), Job (+24 more)

### Community 31 - "lr-register/page.tsx"
Cohesion: 0.23
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, CustomerOption, formatDateDisplay(), formatLocation(), formatOfficeName(), getDefaultFinancialYearDates(), LRRegisterPage() (+2 more)

### Community 32 - "misc/service.py"
Cohesion: 0.08
Nodes (45): activate_employee_imprest(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+37 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.08
Nodes (43): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+35 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.12
Nodes (27): test_wheelseye(), ApiCenterSettingResponse, ApiCenterSettingUpdate, BranchBase, BranchCreate, BranchResponse, CompanySettingResponse, DLLookupResponse (+19 more)

### Community 35 - "settings/router.py"
Cohesion: 0.12
Nodes (36): create_role(), map_user_to_list_item(), update_admin_settings(), update_role(), update_user(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse (+28 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.06
Nodes (51): get_or_create_party_account(), CompanyBankAccountResponse, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+43 more)

### Community 37 - "test_ai_phase4_job_and_challan.py"
Cohesion: 0.06
Nodes (30): QuotaExceededException, build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), parse_hc_entities_from_text(), build_job_preview_card(), handle_conversational_job_booking(), is_job_cancel_intent() (+22 more)

### Community 38 - "auth/service.py"
Cohesion: 0.10
Nodes (30): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+22 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.17
Nodes (34): get_gst_pan_client(), test_gst(), GSTLookupResponse, GSTTestRequest, GSTTestResponse, PANLookupResponse, PANTestRequest, PANTestResponse (+26 more)

### Community 40 - "create_staff_recipient"
Cohesion: 0.18
Nodes (11): create_staff_recipient(), update_staff_recipient(), StaffRecipientCreate, StaffRecipientUpdate, create_staff_recipient(), delete_staff_recipient(), _ensure_email_tables_exist(), _format_recipient_response() (+3 more)

### Community 41 - "getStoredAuth"
Cohesion: 0.03
Nodes (94): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+86 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (30): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+22 more)

### Community 43 - "reports/service.py"
Cohesion: 0.09
Nodes (51): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+43 more)

### Community 44 - "panther-ai-panel.tsx"
Cohesion: 0.17
Nodes (13): PantherAIContext, PantherAIContextType, PantherAIProvider(), usePantherAI(), PantherAILauncher(), Citation, getSuggestedPrompts(), INITIAL_WELCOME_MESSAGE (+5 more)

### Community 45 - "create_general_invoice"
Cohesion: 0.10
Nodes (32): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+24 more)

### Community 46 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.14
Nodes (20): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_purchase_bill(), test_driver_advance_is_current_asset_not_immediate_expense(), test_get_open_bills_for_vendor() (+12 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "Any"
Cohesion: 0.11
Nodes (13): BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase, ConsignerCreate, ConsignerResponse (+5 more)

### Community 49 - "Tenant"
Cohesion: 0.04
Nodes (71): Plan, build_system_prompt(), detect_language(), format_page_registry_entry(), get_authorized_navigation_catalog(), resolve_navigation_suggestions(), stream_chat_with_copilot(), event_generator() (+63 more)

### Community 50 - "VoucherType"
Cohesion: 0.20
Nodes (10): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), VoucherType, test_billing_client_ledger_lifecycle(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm() (+2 more)

### Community 51 - "classify_operational_intent"
Cohesion: 0.12
Nodes (14): is_hire_challan_intent(), is_instructional_hc_inquiry(), classify_operational_intent(), extract_transport_entities(), test_extract_transport_entities_full(), test_follow_up_hc_context_retention(), test_instructional_query_bypasses_tool_execution(), test_intent_classification_new_modules() (+6 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.25
Nodes (4): BranchUpdate, CompanySettingUpdate, EmailSettingResponse, EmailSettingUpdate

### Community 54 - "NavigationSuggestion"
Cohesion: 0.12
Nodes (9): build_add_vehicle_driver_response(), build_how_to_lr_response(), build_human_handoff_response(), filter_nav_suggestions(), get_lr_explanation_markdown(), get_lr_guide_response(), get_safe_general_or_refusal_response(), get_tms_guidance_response() (+1 more)

### Community 55 - "AsyncSession"
Cohesion: 0.13
Nodes (19): create_series_category(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient(), set_default_series(), SeriesCategoryCreate, create_series_category() (+11 more)

### Community 56 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 57 - "statements/service.py"
Cohesion: 0.17
Nodes (28): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return(), GSTInputItem (+20 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.08
Nodes (47): create_eway_bill(), create_pod_record(), verify_pod_record(), ArrivalReportBase, ArrivalReportCreate, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse (+39 more)

### Community 59 - "BaseModel"
Cohesion: 0.07
Nodes (51): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_driver_ledger_detail(), get_vendor_ledger_detail(), ATHPaymentCreate, BankStatementImportResponse, BankStatementLineResponse, BillAllocationResponse (+43 more)

### Community 60 - "get"
Cohesion: 0.14
Nodes (17): get_permissions_schema(), check_series(), create_series_master(), get_activity_filters(), get_activity_stats(), get_email_settings(), get_manual_series_ranges(), get_permissions_schema_endpoint() (+9 more)

### Community 61 - "package.json"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, tailwindcss@^3.4.10, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4 (+8 more)

### Community 62 - "react-dom"
Cohesion: 0.07
Nodes (36): FastagTripSummary, LRSummary, computePathDistanceKm(), FastagMap(), FastagMapProps, geocodeCache, getHaversineDistanceKm(), MARKER_COLORS (+28 more)

### Community 63 - "Any"
Cohesion: 0.05
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "normal-purchase/page.tsx"
Cohesion: 0.15
Nodes (10): BillAllocationItem, BranchData, CompanySettingData, HireChallanOption, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption (+2 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "PantherKnowledgeEngine"
Cohesion: 0.07
Nodes (14): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks() (+6 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "ForbiddenException"
Cohesion: 0.08
Nodes (25): get_current_company_admin(), get_current_office(), get_current_user(), require_permission(), _check_permission(), EntitlementLockedException, ForbiddenException, require_accounts_permission() (+17 more)

### Community 73 - "formatDate"
Cohesion: 0.04
Nodes (82): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, WorkspaceCanvas() (+74 more)

### Community 75 - "httpx"
Cohesion: 0.08
Nodes (17): compute_canonical_hash(), normalize_val(), extract_booking_entities_via_llm(), is_grounded_in_text(), _call_groq(), call_llm(), _call_nvidia(), _call_openai() (+9 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (28): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+20 more)

### Community 82 - "test_phase6_exit_criteria.py"
Cohesion: 0.09
Nodes (6): RazorpayClient, test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 84 - "errors.py"
Cohesion: 0.12
Nodes (11): _cors_headers_for_request(), DuplicateResourceException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler() (+3 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "ai/router.py"
Cohesion: 0.02
Nodes (77): AIDraft, AIDraftStore, normalize_vehicle_number(), validate_and_update_hc_draft(), anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), _build_hc_idempotent_response() (+69 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.11
Nodes (8): LoadingSlipBase, LoadingSlipCreate, LoadingSlipResponse, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRResponse, LRUpdate

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

### Community 99 - "upload_and_extract_document"
Cohesion: 0.15
Nodes (5): clear_chat_session(), get_active_lr_draft(), get_ai_tenant_db(), log_blocked_rbac_attempt(), upload_and_extract_document()

### Community 100 - "test_e2e_hindi_hard_rule_0_delete_refusal"
Cohesion: 0.16
Nodes (6): test_e2e_hindi_hard_rule_0_delete_refusal(), test_e2e_no_city_expansion(), test_e2e_state_transition_clears_stale_search(), test_english_50_cases_intent_and_slots(), test_hindi_hinglish_16_cases(), test_unseen_20_paraphrases()

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "SIMTripRecord"
Cohesion: 0.08
Nodes (11): SIMTripResponse, check_sim_wallet_balance(), close_sim_trip(), parse_iso_or_utc(), simulate_sim_consent(), sync_all_active_sim_trips(), sync_sim_trip(), update_sim_trip() (+3 more)

### Community 104 - "output_guards.py"
Cohesion: 0.24
Nodes (5): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), guard_llm_reply(), _norm()

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 181 - "PageHeader"
Cohesion: 0.05
Nodes (87): ProformaInvoicePage(), IssuingOfficesPage(), CancelIRNContent(), CancelIRNPage(), EInvoiceRecord, EInvoiceResponse, GenerateIRNPage(), VoucherRecord (+79 more)

### Community 182 - "post"
Cohesion: 0.21
Nodes (11): change_user_password(), test_ewb(), test_rc(), ApiCenterTestRequest, ApiCenterTestResponse, ChangePasswordRequest, RCTestRequest, RCTestResponse (+3 more)

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 184 - "resolve_freight_tiger_token"
Cohesion: 0.47
Nodes (4): resolve_freight_tiger_token(), sanitize_ft_base_url(), get_api_center_setting(), update_api_center_setting()

### Community 187 - "settings/roles/page.tsx"
Cohesion: 0.23
Nodes (10): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+2 more)

### Community 189 - "get_page_registry_entry"
Cohesion: 0.22
Nodes (6): get_page_registry_entry(), parse_page_context(), build_page_help_response(), get_greeting_response(), get_page_awareness_response(), test_page_registry_all_modules_and_dynamic_fallback()

### Community 191 - "test_ai_job_creation_removal.py"
Cohesion: 0.28
Nodes (6): get_job_guide_response(), test_get_job_guide_response(), test_is_user_permitted_with_detached_or_mock_objects(), test_job_creation_routed_to_how_to_guide(), test_lr_creation_routed_to_how_to_guide(), test_typed_tools_get_how_to_job()

### Community 195 - "CompanySetting"
Cohesion: 0.29
Nodes (4): get_email_setting(), update_email_setting(), CompanySetting, EmailSetting

### Community 196 - "test_dl"
Cohesion: 0.67
Nodes (4): test_dl(), DLTestRequest, DLTestResponse, test_dl_connection()

### Community 198 - "update_series_master"
Cohesion: 0.20
Nodes (7): update_email_settings(), update_series_category(), update_series_master(), SeriesCategoryUpdate, get_email_setting(), update_email_setting(), update_series_category()

### Community 200 - "email_service.py"
Cohesion: 0.17
Nodes (6): test_email_gateway(), EmailTestRequest, send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 206 - "update_job"
Cohesion: 0.83
Nodes (4): update_job(), JobUpdate, update_job(), test_job_create_and_update_with_locations()

### Community 207 - "create_user"
Cohesion: 1.00
Nodes (3): create_user(), UserCreate, create_new_user()

### Community 216 - "handle_conversational_lr_booking"
Cohesion: 0.06
Nodes (21): clean_party_name(), handle_conversational_lr_booking(), is_valid_indian_vehicle(), is_valid_location_name(), parse_lr_entities_from_text(), resolve_or_create_consignee(), resolve_or_create_consigner(), resolve_or_create_location() (+13 more)

### Community 221 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 224 - "pytest"
Cohesion: 0.06
Nodes (45): ensure_unified_creditor_vendors(), get_company_vehicle_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_staff_imprest_ledger_detail(), list_billing_client_ledgers(), list_company_bank_account_ledgers(), list_company_vehicle_ledgers() (+37 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1690 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **116 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `LR`, `transport/router.py`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `misc/router.py`, `AsyncSession`, `typed_tools.py`, `test_activity_audit_log_system.py`, `test_voucher_edit_e2e.py`, `general/router.py`, `SeriesMaster`, `chat_with_copilot`, `home/service.py`, `excel_import.py`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `test_ai_phase4_job_and_challan.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `create_staff_recipient`, `control/service.py`, `reports/service.py`, `create_general_invoice`, `Tenant`, `NavigationSuggestion`, `post`, `AsyncSession`, `statements/service.py`, `transport/schemas.py`, `get`, `CompanySetting`, `test_dl`, `update_series_master`, `PantherKnowledgeEngine`, `ForbiddenException`, `email_service.py`, `update_job`, `create_user`, `ai/router.py`, `handle_conversational_lr_booking`, `pytest`, `upload_and_extract_document`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 381 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 381 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LR` be split into smaller, more focused modules?**
  _Cohesion score 0.05012881064834693 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `typed_tools.py` to `LR`, `sqlalchemy`, `transport/router.py`, `misc/router.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `TestFASTagTracking`, `general/router.py`, `chat_with_copilot`, `FastAPI`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `test_ai_phase4_job_and_challan.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `control/service.py`, `reports/service.py`, `Tenant`, `post`, `resolve_freight_tiger_token`, `test_dl`, `PantherKnowledgeEngine`, `ForbiddenException`, `create_user`, `ai/router.py`, `handle_conversational_lr_booking`, `pytest`, `upload_and_extract_document`, `SIMTripRecord`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 130 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08081632653061224 - nodes in this community are weakly interconnected._