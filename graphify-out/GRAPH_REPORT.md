# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 442 files · ~707,460 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4927 nodes · 19694 edges · 213 communities (92 shown, 121 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2185 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4cc852e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tenant
- einvoicing/service.py
- list_vendors
- Button
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- test_ai_perfect_tms_enhancements.py
- re
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- master-ledger/page.tsx
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- Branch
- test_voucher_edit_e2e.py
- general/router.py
- SeriesMaster
- chat_with_copilot
- toast.ts
- general/schemas.py
- build_system_prompt
- payment-voucher/page.tsx
- resolve_freight_tiger_token
- sqlalchemy
- home/service.py
- excel_import.py
- Consigner
- misc/router.py
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- pytest
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- LR
- control/service.py
- reports/service.py
- test_transport_invoice_voucher_e2e.py
- create_general_invoice
- create_purchase_bill
- daybook/page.tsx
- state-select.tsx
- tools.py
- TestFASTagTracking
- journal-voucher/page.tsx
- Client Component Flow
- CompanySetting
- build_user_navigation
- AsyncSession
- classify_intent_and_entities
- tenant_db/models.py
- BaseModel
- accounts/schemas.py
- balance-sheet/page.tsx
- profit-loss/page.tsx
- package.json
- Any
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- PageHeader
- CacheControlMiddleware
- Client Component Flow (2)
- get_journal_adjustment_types_list
- Client Component Flow (3)
- test_activity_audit_log_system.py
- consignment-360/page.tsx
- test_phase5_end_to_end_exit_criteria
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- typing
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- LRUpdate
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- general-purchase/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- hire-challan/page.tsx
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
- test_live_api.py
- StructuredCard
- email_service.py
- put
- output_guards.py
- test_company_vehicle_master_ledger_listing_and_summary

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
- `get_or_create_party_account()` --uses--> `CompanyVehicle`  [INFERRED]
  backend/app/modules/accounts/master_ledger_service.py → backend/app/tenant_db/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (213 total, 121 thin omitted)

### Community 0 - "Tenant"
Cohesion: 0.05
Nodes (62): Plan, Tenant, detect_language(), get_authorized_navigation_catalog(), call_llm(), clear_chat_session(), detect_language_with_history(), discard_active_lr_draft() (+54 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.13
Nodes (18): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+10 more)

### Community 2 - "list_vendors"
Cohesion: 0.36
Nodes (8): update_vendor(), create_vendor(), delete_vendor(), _ensure_vendor_columns(), get_vendor(), list_vendors(), update_vendor(), test_vendor_full_lifecycle()

### Community 3 - "Button"
Cohesion: 0.04
Nodes (89): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, ApiCenterData (+81 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (92): LoginPage(), PlanOption, PLANS, SignupPage(), BillAllocationItem, BranchData, CompanySettingData, HireChallanOption (+84 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.04
Nodes (103): activate_employee_imprest_endpoint(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), deactivate_employee_imprest_endpoint() (+95 more)

### Community 6 - "cn"
Cohesion: 0.05
Nodes (72): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+64 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (29): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+21 more)

### Community 9 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.06
Nodes (15): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks() (+7 more)

### Community 10 - "re"
Cohesion: 0.05
Nodes (43): is_instructional_hc_inquiry(), normalize_vehicle_number(), is_instructional_job_inquiry(), is_job_booking_intent(), clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent() (+35 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (90): AppException, ResourceNotFoundException, clean_vehicle_number(), create_truck_hiring_note(), TruckHiringNoteCreate, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), _build_search_variants() (+82 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (94): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+86 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "master-ledger/page.tsx"
Cohesion: 0.13
Nodes (14): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+6 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.25
Nodes (10): UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), resolve_office(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_office_switching_multi_office() (+2 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.09
Nodes (51): create_billing_client(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location(), create_packing_method(), create_unit() (+43 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.07
Nodes (10): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_sim_wallet_balance(), SimWalletTransaction, TestSimOperatorAndRealData (+2 more)

### Community 18 - "Branch"
Cohesion: 0.06
Nodes (28): QuotaExceededException, build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), parse_hc_entities_from_text(), build_job_preview_card(), handle_conversational_job_booking(), is_job_cancel_intent() (+20 more)

### Community 19 - "test_voucher_edit_e2e.py"
Cohesion: 0.08
Nodes (33): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), get_account_by_code(), e2e_session(), test_bank_to_bank_transfer_with_charges() (+25 more)

### Community 20 - "general/router.py"
Cohesion: 0.13
Nodes (38): create_billing_client(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location(), create_packing_method(), create_unit() (+30 more)

### Community 21 - "SeriesMaster"
Cohesion: 0.08
Nodes (24): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges(), get_real_voucher_usage() (+16 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (58): chat_with_copilot(), get_capabilities_list_markdown(), handle_record_prefill_intent(), AIStatusResponse, ChatMessage, ChatRequest, ChatResponse, ContextSuggestionResponse (+50 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (144): VoucherRecord, BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, EInvoiceRecord, TaxpayerDetails, EmployeeRecord (+136 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (42): create_consignee(), create_consigner(), update_billing_client(), BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate (+34 more)

### Community 25 - "build_system_prompt"
Cohesion: 0.11
Nodes (12): build_system_prompt(), format_page_registry_entry(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), build_page_help_response(), get_greeting_response(), get_page_awareness_response() (+4 more)

### Community 26 - "payment-voucher/page.tsx"
Cohesion: 0.05
Nodes (34): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+26 more)

### Community 27 - "resolve_freight_tiger_token"
Cohesion: 0.24
Nodes (10): resolve_freight_tiger_token(), sanitize_ft_base_url(), ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, get_api_center_setting(), test_wheelseye_connection() (+2 more)

### Community 28 - "sqlalchemy"
Cohesion: 0.03
Nodes (51): seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check(), lifespan(), normalize_tenant_locations_background() (+43 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.08
Nodes (28): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+20 more)

### Community 31 - "Consigner"
Cohesion: 0.07
Nodes (32): CompanyVehicle, Consignee, Consigner, Driver, MarketVehicle, Role, RolePermission, setup_test_tms_db() (+24 more)

### Community 32 - "misc/router.py"
Cohesion: 0.07
Nodes (66): AccountBase, AccountCreate, AccountResponse, AccountUpdate, ChargeHeadBase, ChargeHeadCreate, ChargeHeadResponse, ChargeHeadUpdate (+58 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.10
Nodes (30): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+22 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.10
Nodes (34): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, BranchUpdate, ChangePasswordRequest, CompanySettingResponse (+26 more)

### Community 35 - "settings/router.py"
Cohesion: 0.10
Nodes (42): get_permissions_schema(), create_role(), get_permissions_schema_endpoint(), list_users(), map_user_to_list_item(), test_email_gateway(), update_email_settings(), ActivityFiltersResponse (+34 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.08
Nodes (53): get_or_create_party_account(), CompanyBankAccountResponse, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+45 more)

### Community 37 - "pytest"
Cohesion: 0.04
Nodes (41): AIDraft, AIDraftStore, validate_and_update_hc_draft(), confirm_job_draft(), confirm_lr_draft(), log_blocked_rbac_attempt(), ConfirmJobDraftRequest, ConfirmLRDraftRequest (+33 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.14
Nodes (26): get_me(), refresh_token(), LoginRequest, OfficeSummary, RefreshTokenRequest, TenantContextResponse, TokenResponse, UserAuthSummary (+18 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.18
Nodes (33): get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch(), get_branches() (+25 more)

### Community 40 - "settings/service.py"
Cohesion: 0.08
Nodes (36): list_admin_settings(), ensure_series_table_schema(), create_new_user(), create_series_category(), create_series_master(), create_staff_recipient(), delete_existing_role(), delete_series_category() (+28 more)

### Community 41 - "LR"
Cohesion: 0.11
Nodes (26): JobCreate, LRCreate, create_job(), create_lr(), get_all_jobs(), get_all_lrs(), update_lr(), Job (+18 more)

### Community 42 - "control/service.py"
Cohesion: 0.08
Nodes (38): Entitlement, PlatformAdmin, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook() (+30 more)

### Community 43 - "reports/service.py"
Cohesion: 0.06
Nodes (76): get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_profit_and_loss(), get_purchase_register(), get_sales_register(), get_special_report() (+68 more)

### Community 44 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.27
Nodes (8): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 45 - "create_general_invoice"
Cohesion: 0.10
Nodes (27): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, create_credit_debit_note(), create_general_invoice(), test_commercial_note_without_gst_adjustment() (+19 more)

### Community 46 - "create_purchase_bill"
Cohesion: 0.14
Nodes (21): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, VoidVoucherRequest, create_purchase_bill(), test_driver_advance_is_current_asset_not_immediate_expense() (+13 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 49 - "tools.py"
Cohesion: 0.05
Nodes (52): _matches_permission(), is_hire_challan_intent(), anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), build_add_vehicle_driver_response(), _build_hc_idempotent_response(), build_how_to_lr_response() (+44 more)

### Community 50 - "TestFASTagTracking"
Cohesion: 0.09
Nodes (11): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse, FastagTripCreate (+3 more)

### Community 51 - "journal-voucher/page.tsx"
Cohesion: 0.20
Nodes (8): AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm, LedgerEntryItem, numberToWords(), VoucherRecord

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 55 - "AsyncSession"
Cohesion: 0.11
Nodes (28): check_series(), create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+20 more)

### Community 56 - "classify_intent_and_entities"
Cohesion: 0.09
Nodes (15): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, get_job_guide_response() (+7 more)

### Community 57 - "tenant_db/models.py"
Cohesion: 0.06
Nodes (40): ensure_unified_creditor_vendors(), get_master_ledger_summary(), list_company_vehicle_ledgers(), list_driver_ledgers(), list_duties_and_taxes_ledgers(), list_staff_imprest_ledgers(), list_vendor_ledgers(), verify_and_heal_chart_of_accounts() (+32 more)

### Community 58 - "BaseModel"
Cohesion: 0.05
Nodes (73): create_arrival_report(), create_eway_bill(), create_pod_record(), verify_pod_record(), ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse, CompanyVehicleBase (+65 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.06
Nodes (56): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_staff_imprest_ledger_detail(), get_vendor_ledger_detail(), list_billing_client_ledgers() (+48 more)

### Community 60 - "balance-sheet/page.tsx"
Cohesion: 0.29
Nodes (4): AccountItem, BalanceSheetPage(), BalanceSheetResponse, GroupItem

### Community 61 - "profit-loss/page.tsx"
Cohesion: 0.29
Nodes (4): PnLAccountItem, PnLGroupItem, ProfitLossPage(), ProfitLossResponse

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, framer-motion@^13.4.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10 (+36 more)

### Community 63 - "Any"
Cohesion: 0.06
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "PageHeader"
Cohesion: 0.04
Nodes (166): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+158 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.14
Nodes (15): BillingClientResponse, build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), audit_db(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options() (+7 more)

### Community 73 - "consignment-360/page.tsx"
Cohesion: 0.05
Nodes (42): Consignment360Data, Consignment360Page(), FinancialSummary, LifecycleStage, SuggestionItem, AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay() (+34 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

### Community 84 - "typing"
Cohesion: 0.05
Nodes (36): get_current_company_admin(), get_current_office(), get_current_user(), require_permission(), _check_permission(), login(), logout(), _cors_headers_for_request() (+28 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 88 - "LRUpdate"
Cohesion: 0.23
Nodes (3): LRBase, LRInvoiceItem, LRUpdate

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

### Community 100 - "general-purchase/page.tsx"
Cohesion: 0.05
Nodes (44): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+36 more)

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 186 - "StructuredCard"
Cohesion: 0.13
Nodes (19): get_lr_guide_response(), NavigationSuggestion, addConsigneePrompt(), driverBalance(), format_currency(), getHowTo(), getKnowledge(), getLedgerSummary() (+11 more)

### Community 214 - "put"
Cohesion: 0.08
Nodes (24): update_consignee(), update_consigner(), update_designation(), update_group_company(), update_industry(), update_load_type(), update_location(), update_packing_method() (+16 more)

### Community 216 - "output_guards.py"
Cohesion: 0.24
Nodes (5): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), guard_llm_reply(), _norm()

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1675 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **121 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `Tenant`, `list_vendors`, `SIM & Telecom Tracking Integration`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `test_ai_perfect_tms_enhancements.py`, `re`, `transport/service.py`, `AsyncSession`, `test_issuing_office_system.py`, `Branch`, `test_voucher_edit_e2e.py`, `general/router.py`, `SeriesMaster`, `chat_with_copilot`, `general/schemas.py`, `build_system_prompt`, `sqlalchemy`, `home/service.py`, `excel_import.py`, `Consigner`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `LR`, `control/service.py`, `reports/service.py`, `tools.py`, `build_user_navigation`, `AsyncSession`, `tenant_db/models.py`, `StructuredCard`, `BaseModel`, `test_activity_audit_log_system.py`, `typing`, `put`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 373 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 373 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tenant` be split into smaller, more focused modules?**
  _Cohesion score 0.04610606784519828 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Branch` to `Tenant`, `SIM & Telecom Tracking Integration`, `bank_statement_service.py`, `test_ai_perfect_tms_enhancements.py`, `re`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `test_issuing_office_system.py`, `test_voucher_edit_e2e.py`, `general/router.py`, `SeriesMaster`, `chat_with_copilot`, `general/schemas.py`, `build_system_prompt`, `sqlalchemy`, `home/service.py`, `excel_import.py`, `Consigner`, `Transport Registers & Operations Reports`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `LR`, `control/service.py`, `reports/service.py`, `test_transport_invoice_voucher_e2e.py`, `create_general_invoice`, `create_purchase_bill`, `tools.py`, `AsyncSession`, `tenant_db/models.py`, `StructuredCard`, `test_activity_audit_log_system.py`, `typing`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 187 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 187 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1319073083778966 - nodes in this community are weakly interconnected._