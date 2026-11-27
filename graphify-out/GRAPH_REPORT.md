# Graph Report - panther-tms-v2  (2026-11-27)

## Corpus Check
- 444 files · ~727,237 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4983 nodes · 19924 edges · 221 communities (113 shown, 108 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 2380 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83629958`
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
- get
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
- tenant_db/models.py
- general-invoice/page.tsx
- normal-purchase/page.tsx
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
- ai/router.py
- daybook/page.tsx
- hc-register/page.tsx
- Branch
- einvoicing/router.py
- state-select.tsx
- Client Component Flow
- CompanySetting
- tools.py
- AsyncSession
- ArrivalReport
- statements/service.py
- transport/schemas.py
- accounts/schemas.py
- misc/router.py
- Any
- dependencies
- toast-provider.tsx
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- react
- master-ledger/page.tsx
- test_branch_job_import.py
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- post
- Button
- hire-challan/page.tsx
- Consigner
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- RazorpayClient
- accounts/router.py
- uuid
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- test_ai_phase3_lr_creation.py
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- typing
- Docker Compose.Yml Component Flow (7)
- test_transport_invoice_voucher_e2e.py
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
- test_issuing_office_system.py
- theme-context.tsx
- AsyncSession
- scripts
- tailwindcss
- list_journal_vouchers
- update_email_settings
- email_service.py
- update_contra_voucher_endpoint
- EmployeeMaster
- test_phase6_exit_criteria.py
- output_guards.py
- test_loading_slip.py
- CompanySetting
- CacheControlMiddleware
- journal_session
- test_phase3_end_to_end_exit_criteria
- test_phase4_end_to_end_exit_criteria
- test_phase5_end_to_end_exit_criteria
- test_transport_state_machine.py
- get_billing_clients_with_due_bills_endpoint
- get_vendor_open_bills
- ai/router.py
- get_vendors_with_due_bills_endpoint
- asyncio

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
- `create_sim_trip()` --calls--> `detect_telecom_operator()`  [INFERRED]
  backend/app/modules/transport/service.py → backend/app/integrations/freight_tiger/client.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (221 total, 108 thin omitted)

### Community 0 - "StructuredCard"
Cohesion: 0.09
Nodes (25): build_add_vehicle_driver_response(), build_how_to_lr_response(), get_lr_explanation_markdown(), NavigationSuggestion, StructuredCard, addConsigneePrompt(), driverBalance(), format_currency() (+17 more)

### Community 1 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.09
Nodes (18): build_system_prompt(), detect_language(), format_page_registry_entry(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), build_page_help_response(), detect_language_with_history() (+10 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.09
Nodes (22): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check(), lifespan(), normalize_tenant_locations_background() (+14 more)

### Community 3 - "create_contra_voucher"
Cohesion: 0.13
Nodes (19): ContraVoucherCreate, create_contra_voucher(), get_account_by_code(), e2e_session(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_bank_deposit(), test_cash_to_cash_internal_transfer() (+11 more)

### Community 4 - "PageHeader"
Cohesion: 0.03
Nodes (146): MasterLedgerPage(), AccountsOverviewPage(), VoucherRecord, ProformaInvoicePage(), ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem (+138 more)

### Community 5 - "AsyncSession"
Cohesion: 0.05
Nodes (93): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_loading_slip_response(), _build_lr_response(), close_sim_trip(), create_company_vehicle(), create_driver() (+85 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (79): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+71 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (31): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+23 more)

### Community 9 - "classify_intent_and_entities"
Cohesion: 0.11
Nodes (13): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, get_job_guide_response() (+5 more)

### Community 10 - "tenancy.py"
Cohesion: 0.12
Nodes (11): TenantInactiveException, get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code(), _verify_tenant_active(), test_generate_tenant_id() (+3 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (78): AppException, clean_vehicle_number(), add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), _build_search_variants(), check_and_deduct_fastag_credit(), check_and_deduct_sim_credit(), close_sim_trip() (+70 more)

### Community 12 - "get"
Cohesion: 0.10
Nodes (13): get_company_bank_account(), get_default_bank_account_for_office_endpoint(), get_eligible_invoices_for_note_endpoint(), get_journal_adjustment_types_endpoint(), get_master_ledger_summary(), get_voucher(), list_billing_client_ledgers(), list_company_bank_accounts() (+5 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "session"
Cohesion: 0.11
Nodes (15): generate_job_import_template(), generate_lr_import_template(), import_lrs_from_excel(), _normalize_lr_header(), _parse_date(), create_sample_lr_excel(), test_db(), test_lr_import_chronological_ordering_and_job_autocreation() (+7 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.13
Nodes (14): build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), audit_db(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options(), test_all_issuing_offices_view_for_company_admin() (+6 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (65): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+57 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.07
Nodes (11): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_sim_wallet_balance(), SIMTripRecord, SimWalletTransaction (+3 more)

### Community 18 - "fastag_provider/client.py"
Cohesion: 0.14
Nodes (4): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates()

### Community 19 - "errors.py"
Cohesion: 0.11
Nodes (12): _cors_headers_for_request(), DuplicateResourceException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler() (+4 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "check_series_status"
Cohesion: 0.14
Nodes (17): _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+9 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (51): chat_with_copilot(), get_capabilities_list_markdown(), ChatMessage, ChatRequest, anyio_backend(), copilot_env(), test_active_draft_destination_slot_filling(), test_cancel_discards_draft() (+43 more)

### Community 23 - "react"
Cohesion: 0.06
Nodes (117): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, IssuingOfficesPage(), IRNListPage(), defaultInitialValues, EmployeeMasterPage() (+109 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.07
Nodes (45): BillingClientBase, BillingClientCreate, BillingClientResponse, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate (+37 more)

### Community 25 - "getStoredAuth"
Cohesion: 0.03
Nodes (114): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, SeriesCategoryItem (+106 more)

### Community 26 - "tenant_db/models.py"
Cohesion: 0.06
Nodes (37): list_vendor_ledgers(), seed_indian_accounting_chart_of_accounts(), create_vehicle_owner(), Account, BillingClient, Driver, GroupInPrimary, GroupNature (+29 more)

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
Cohesion: 0.11
Nodes (22): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_purchase_bill(), HireChallan, e2e_session() (+14 more)

### Community 31 - "create_general_invoice"
Cohesion: 0.09
Nodes (31): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+23 more)

### Community 32 - "tenant_db/models.py"
Cohesion: 0.08
Nodes (59): AccountBase, AccountCreate, AccountResponse, AccountUpdate, ChargeHeadBase, ChargeHeadCreate, ChargeHeadResponse, ChargeHeadUpdate (+51 more)

### Community 33 - "test_issuing_office_system.py"
Cohesion: 0.13
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.09
Nodes (38): ApiCenterSettingResponse, ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest (+30 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (36): list_roles(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+28 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.07
Nodes (58): CompanyBankAccountCreate, CompanyBankAccountResponse, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+50 more)

### Community 37 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 38 - "auth/service.py"
Cohesion: 0.10
Nodes (30): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+22 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.14
Nodes (36): resolve_freight_tiger_token(), sanitize_ft_base_url(), get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, check_and_deduct_tax_credit(), create_branch(), delete_branch() (+28 more)

### Community 40 - "settings/service.py"
Cohesion: 0.10
Nodes (29): list_admin_settings(), create_new_role(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master() (+21 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.04
Nodes (75): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+67 more)

### Community 42 - "control/service.py"
Cohesion: 0.10
Nodes (31): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+23 more)

### Community 43 - "reports/service.py"
Cohesion: 0.10
Nodes (47): get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_profit_and_loss(), get_purchase_register(), get_sales_register(), get_special_report() (+39 more)

### Community 44 - "get"
Cohesion: 0.13
Nodes (11): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_series_categories() (+3 more)

### Community 45 - "LR"
Cohesion: 0.11
Nodes (26): _build_job_response(), JobUpdate, LRCreate, LRUpdate, create_lr(), get_all_jobs(), get_all_lrs(), get_job_by_id() (+18 more)

### Community 46 - "ai/router.py"
Cohesion: 0.03
Nodes (60): AIDraft, compute_canonical_hash(), normalize_val(), is_valid_indian_vehicle(), anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), _build_hc_idempotent_response() (+52 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 49 - "Branch"
Cohesion: 0.04
Nodes (78): check_entitlement_limit(), Entitlement, Plan, PlatformAdmin, Tenant, create_ath_payment(), create_bth_payment(), create_contra_voucher_endpoint() (+70 more)

### Community 50 - "einvoicing/router.py"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 51 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 54 - "tools.py"
Cohesion: 0.05
Nodes (41): _matches_permission(), extract_booking_entities_via_llm(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent(), is_valid_location_name(), is_valid_party_name(), parse_lr_entities_from_text() (+33 more)

### Community 55 - "AsyncSession"
Cohesion: 0.19
Nodes (20): create_role(), create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+12 more)

### Community 56 - "ArrivalReport"
Cohesion: 0.24
Nodes (12): _build_arrival_report_response(), create_arrival_report(), update_arrival_report(), ArrivalReportCreate, ArrivalReportUpdate, create_arrival_report(), get_all_arrival_reports(), get_arrival_report_by_id() (+4 more)

### Community 57 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.05
Nodes (63): CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response, Consignment360SearchResult, DriverBase, DriverCreate (+55 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.04
Nodes (80): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+72 more)

### Community 60 - "misc/router.py"
Cohesion: 0.12
Nodes (39): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+31 more)

### Community 61 - "Any"
Cohesion: 0.05
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

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

### Community 68 - "test_branch_job_import.py"
Cohesion: 0.18
Nodes (12): list_consignees(), list_consigners(), list_locations(), import_jobs_from_excel(), _normalize_header(), create_sample_excel(), test_db(), test_import_jobs_hq_vs_branch() (+4 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "PantherKnowledgeEngine"
Cohesion: 0.06
Nodes (16): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks() (+8 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "post"
Cohesion: 0.11
Nodes (10): bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_company_bank_account(), create_journal_voucher_endpoint(), post_draft_journal_voucher_endpoint(), preview_journal_voucher_endpoint(), reverse_journal_voucher_endpoint(), sync_tally_schema_endpoint() (+2 more)

### Community 73 - "Button"
Cohesion: 0.02
Nodes (97): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+89 more)

### Community 74 - "hire-challan/page.tsx"
Cohesion: 0.14
Nodes (13): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+5 more)

### Community 75 - "Consigner"
Cohesion: 0.10
Nodes (21): validate_and_update_job_draft(), _resolve_or_create_location(), Consignee, Consigner, Location, setup_test_tms_db(), setup_86_test_db(), anyio_backend() (+13 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 83 - "accounts/router.py"
Cohesion: 0.16
Nodes (9): get_bank_statement_import(), ignore_statement_line_endpoint(), import_bank_statement_file(), list_bank_statement_imports(), map_import_response(), map_line_response(), map_party_statement_line_endpoint(), resolve_line_question_endpoint() (+1 more)

### Community 84 - "uuid"
Cohesion: 0.06
Nodes (20): _call_groq(), call_llm(), _call_nvidia(), _call_openai(), is_provider_configured(), _is_valid_key(), sanitize_ai_response(), _stream_groq() (+12 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "test_ai_phase3_lr_creation.py"
Cohesion: 0.04
Nodes (37): AIDraftStore, clean_party_name(), handle_conversational_lr_booking(), is_cancel_intent(), resolve_or_create_consignee(), resolve_or_create_consigner(), resolve_or_create_location(), validate_and_update_draft() (+29 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.10
Nodes (7): ArrivalReportBase, ArrivalReportResponse, LoadingSlipBase, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRResponse

### Community 89 - "Docker Compose.Yml Component Flow (4)"
Cohesion: 0.18
Nodes (11): deploy, resources, deploy, cpus, memory, deploy, deploy, deploy (+3 more)

### Community 90 - "Docker Compose.Yml Component Flow (5)"
Cohesion: 0.18
Nodes (11): postgres, container_name, depends_on, image, networks, ports, profiles, restart (+3 more)

### Community 92 - "Docker Compose.Yml Component Flow (6)"
Cohesion: 0.20
Nodes (10): container_name, depends_on, environment, image, networks, ports, restart, redis (+2 more)

### Community 93 - "typing"
Cohesion: 0.08
Nodes (28): get_current_company_admin(), get_current_office(), get_current_user(), require_permission(), _check_permission(), EntitlementLockedException, ForbiddenException, require_accounts_permission() (+20 more)

### Community 94 - "Docker Compose.Yml Component Flow (7)"
Cohesion: 0.22
Nodes (8): networks, panther-net, driver, services, volumes, pgadmin_data, postgres_data, redis_data

### Community 95 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.24
Nodes (9): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), e2e_session(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports() (+1 more)

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

### Community 187 - "test_issuing_office_system.py"
Cohesion: 0.27
Nodes (13): UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), resolve_office(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_lr_print_master_data_resolution() (+5 more)

### Community 188 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 190 - "AsyncSession"
Cohesion: 0.13
Nodes (8): delete_company_bank_account(), get_client_open_invoices(), get_contra_eligible_accounts_endpoint(), get_skipped_entries_report_endpoint(), list_duties_and_taxes_ledgers(), list_vendor_ledgers(), set_default_company_bank_account(), toggle_company_bank_account_status()

### Community 195 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 196 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 197 - "list_journal_vouchers"
Cohesion: 0.12
Nodes (9): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_staff_imprest_ledger_detail(), get_vendor_ledger_detail(), list_company_bank_account_ledgers() (+1 more)

### Community 198 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

### Community 200 - "email_service.py"
Cohesion: 0.15
Nodes (6): get_email_settings(), get_email_setting(), send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 202 - "update_contra_voucher_endpoint"
Cohesion: 0.14
Nodes (7): update_company_bank_account(), update_contra_voucher_endpoint(), update_credit_debit_note_endpoint(), update_journal_voucher_endpoint(), update_payment_voucher_endpoint(), update_purchase_bill_endpoint(), update_receipt_voucher_endpoint()

### Community 203 - "EmployeeMaster"
Cohesion: 0.23
Nodes (11): EmployeeMasterCreate, activate_employee_imprest(), create_employee(), deactivate_employee_imprest(), delete_employee(), ensure_employee_schema(), get_employee_by_id(), get_employees() (+3 more)

### Community 204 - "test_phase6_exit_criteria.py"
Cohesion: 0.22
Nodes (5): test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 205 - "output_guards.py"
Cohesion: 0.24
Nodes (5): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), guard_llm_reply(), _norm()

### Community 206 - "test_loading_slip.py"
Cohesion: 0.38
Nodes (9): LoadingSlipCreate, _calculate_loading_slip_total(), create_loading_slip(), get_all_loading_slips(), get_loading_slip_by_id(), _populate_loading_slip_relations(), update_loading_slip(), LoadingSlip (+1 more)

### Community 207 - "CompanySetting"
Cohesion: 0.29
Nodes (4): get_email_setting(), update_email_setting(), CompanySetting, EmailSetting

### Community 216 - "ai/router.py"
Cohesion: 0.04
Nodes (44): QuotaExceededException, build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number(), parse_hc_entities_from_text() (+36 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1672 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **108 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `AsyncSession` to `StructuredCard`, `test_ai_perfect_tms_enhancements.py`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `get`, `AsyncSession`, `session`, `test_issuing_office_system.py`, `general/router.py`, `chat_with_copilot`, `tenant_db/models.py`, `home/service.py`, `test_issuing_office_system.py`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `LR`, `ai/router.py`, `Branch`, `tools.py`, `AsyncSession`, `ArrivalReport`, `accounts/schemas.py`, `misc/router.py`, `test_issuing_office_system.py`, `AsyncSession`, `test_branch_job_import.py`, `list_journal_vouchers`, `update_email_settings`, `PantherKnowledgeEngine`, `post`, `email_service.py`, `update_contra_voucher_endpoint`, `Consigner`, `CompanySetting`, `accounts/router.py`, `get_billing_clients_with_due_bills_endpoint`, `get_vendor_open_bills`, `ai/router.py`, `get_vendors_with_due_bills_endpoint`, `test_ai_phase3_lr_creation.py`, `typing`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Are the 428 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 428 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `StructuredCard` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Branch` to `StructuredCard`, `test_ai_perfect_tms_enhancements.py`, `create_contra_voucher`, `AsyncSession`, `bank_statement_service.py`, `transport/service.py`, `get`, `session`, `test_issuing_office_system.py`, `general/router.py`, `check_series_status`, `chat_with_copilot`, `tenant_db/models.py`, `home/service.py`, `HireChallan`, `create_general_invoice`, `test_issuing_office_system.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `LR`, `ai/router.py`, `tools.py`, `AsyncSession`, `ArrivalReport`, `accounts/schemas.py`, `test_issuing_office_system.py`, `AsyncSession`, `test_branch_job_import.py`, `list_journal_vouchers`, `PantherKnowledgeEngine`, `post`, `update_contra_voucher_endpoint`, `Consigner`, `test_loading_slip.py`, `CompanySetting`, `journal_session`, `accounts/router.py`, `test_ai_phase3_lr_creation.py`, `ai/router.py`, `typing`, `test_transport_invoice_voucher_e2e.py`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 233 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 233 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_ai_perfect_tms_enhancements.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._