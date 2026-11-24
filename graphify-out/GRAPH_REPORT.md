# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 439 files · ~693,831 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4806 nodes · 19049 edges · 207 communities (100 shown, 107 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 1765 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66b1f26f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tenant
- einvoicing/service.py
- test_purchase_register_voucher_e2e.py
- PageHeader
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- knowledge.py
- tenant_db/models.py
- test_ai_phase3_lr_creation.py
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- ForbiddenException
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- pytest
- general-invoice/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- chat_with_copilot
- toast.ts
- general/schemas.py
- sanitize_chat_history_for_external_llm
- GSPProviderInterface
- TestSIMTrackingWallet
- typing
- home/service.py
- excel_import.py
- transport/schemas.py
- misc/router.py
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- main.py
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- TestFASTagTracking
- control/service.py
- reports/service.py
- test_transport_invoice_voucher_e2e.py
- test_general_invoice_voucher_e2e.py
- StructuredCard
- test_auto_create_job_on_lr.py
- state-select.tsx
- tools.py
- rag.py
- reports/router.py
- Client Component Flow
- CompanySetting
- lr-register/page.tsx
- update_existing_user
- classify_intent_and_entities
- test_vendor_directory_posting_and_reconciliation
- accounts/schemas.py
- Branch
- update_email_settings
- upload_and_extract_document
- dependencies
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- apiClient
- opening-balance/page.tsx
- Client Component Flow (2)
- AsyncSession
- Client Component Flow (3)
- test_activity_audit_log_system.py
- formatCurrency
- package.json
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- settings/roles/page.tsx
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- Any
- errors.py
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- toast-provider.tsx
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- test_phase6_exit_criteria.py
- daybook/page.tsx
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
- test_live_api.py
- ai/router.py
- email_service.py
- trial-balance/page.tsx
- theme-context.tsx
- scripts
- tailwindcss

## God Nodes (most connected - your core abstractions)
1. `User` - 550 edges
2. `Tenant` - 258 edges
3. `Branch` - 215 edges
4. `PageHeader()` - 205 edges
5. `apiClient()` - 198 edges
6. `react` - 177 edges
7. `Button` - 159 edges
8. `lucide-react` - 152 edges
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

## Communities (207 total, 107 thin omitted)

### Community 0 - "Tenant"
Cohesion: 0.06
Nodes (57): Plan, PlatformAdmin, Tenant, detect_language(), get_authorized_navigation_catalog(), call_llm(), get_ai_tenant_db(), classify_operational_intent() (+49 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.15
Nodes (18): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+10 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.13
Nodes (20): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_purchase_bill(), test_driver_advance_is_current_asset_not_immediate_expense(), test_get_open_bills_for_vendor() (+12 more)

### Community 3 - "PageHeader"
Cohesion: 0.04
Nodes (114): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+106 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (92): LoginPage(), PlanOption, PLANS, SignupPage(), BillAllocationItem, BranchData, CompanySettingData, LedgerEntry (+84 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (83): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_lr_response(), close_sim_trip(), create_arrival_report(), create_company_vehicle() (+75 more)

### Community 6 - "cn"
Cohesion: 0.05
Nodes (76): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+68 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "knowledge.py"
Cohesion: 0.13
Nodes (12): build_system_prompt(), format_page_registry_entry(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), build_page_help_response(), get_greeting_response(), get_page_awareness_response() (+4 more)

### Community 9 - "tenant_db/models.py"
Cohesion: 0.05
Nodes (66): verify_and_heal_chart_of_accounts(), activate_employee_imprest(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup() (+58 more)

### Community 10 - "test_ai_phase3_lr_creation.py"
Cohesion: 0.04
Nodes (47): clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent(), is_valid_indian_vehicle() (+39 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (91): AppException, clean_vehicle_number(), GPSFleetCounts, GPSHistorySummary, GPSTimelineItem, GPSTripInfo, GPSVehicleItem, add_sim_trip_comment() (+83 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (61): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+53 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "ForbiddenException"
Cohesion: 0.17
Nodes (16): get_current_company_admin(), get_current_office(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission(), _check(), get_gst_input() (+8 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.26
Nodes (15): get_all_lrs(), LR, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), resolve_office(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping() (+7 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (68): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+60 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.12
Nodes (3): detect_telecom_operator(), FreightTigerClient, TestSIMTrackingFreightTiger

### Community 18 - "pytest"
Cohesion: 0.04
Nodes (42): Entitlement, AIDraft, AIDraftStore, validate_and_update_hc_draft(), build_job_preview_card(), handle_conversational_job_booking(), parse_job_entities_from_text(), confirm_hire_challan_draft() (+34 more)

### Community 19 - "general-invoice/page.tsx"
Cohesion: 0.06
Nodes (31): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+23 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.13
Nodes (18): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+10 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (52): chat_with_copilot(), ChatMessage, ChatRequest, test_active_draft_destination_slot_filling(), test_cancel_discards_draft(), test_driver_advance_balance_lookup(), test_existing_offtopic_refusals_preserved(), test_find_vehicle_dl01_searches_both_masters_and_lrs() (+44 more)

### Community 23 - "toast.ts"
Cohesion: 0.05
Nodes (142): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+134 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (44): BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase (+36 more)

### Community 25 - "sanitize_chat_history_for_external_llm"
Cohesion: 0.14
Nodes (7): anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), build_human_handoff_response(), _log_ai_turn(), test_gemini_structural_privacy_anonymization(), test_privacy_boundary_pii_sanitization()

### Community 27 - "TestSIMTrackingWallet"
Cohesion: 0.15
Nodes (3): check_sim_wallet_balance(), SimWalletTransaction, TestSIMTrackingWallet

### Community 28 - "typing"
Cohesion: 0.11
Nodes (17): close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), get_all_tenant_db_names(), rollback_migration(), run_migration(), run_migration() (+9 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.08
Nodes (27): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+19 more)

### Community 31 - "transport/schemas.py"
Cohesion: 0.05
Nodes (65): create_eway_bill(), create_pod_record(), ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse (+57 more)

### Community 32 - "misc/router.py"
Cohesion: 0.07
Nodes (68): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+60 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.10
Nodes (30): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+22 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.10
Nodes (36): ApiCenterSettingResponse, ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest (+28 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (38): create_role(), map_user_to_list_item(), test_email_gateway(), update_role(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption (+30 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.05
Nodes (65): get_or_create_party_account(), CompanyBankAccountResponse, ContraVoucherCreate, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment() (+57 more)

### Community 37 - "main.py"
Cohesion: 0.04
Nodes (26): CacheControlMiddleware, health_check(), preflight_handler(), root(), _call_groq(), _call_nvidia(), _call_openai(), _is_valid_key() (+18 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.06
Nodes (39): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+31 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.13
Nodes (39): resolve_freight_tiger_token(), sanitize_ft_base_url(), get_gst_pan_client(), DLLookupResponse, GSTLookupResponse, GSTTestResponse, TaxApiCounterResponse, TaxApiTransactionItem (+31 more)

### Community 40 - "settings/service.py"
Cohesion: 0.09
Nodes (34): create_series_category(), create_series_master(), create_user(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient(), create_new_user() (+26 more)

### Community 41 - "TestFASTagTracking"
Cohesion: 0.09
Nodes (14): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagCooldownUpdate, FastagWalletResponse, FastagWalletTransactionItem, get_fastag_wallet_info() (+6 more)

### Community 42 - "control/service.py"
Cohesion: 0.07
Nodes (41): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+33 more)

### Community 43 - "reports/service.py"
Cohesion: 0.14
Nodes (36): BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse, ExportJobCreate (+28 more)

### Community 44 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.32
Nodes (7): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_voiding_protection_and_reversal()

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.09
Nodes (32): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+24 more)

### Community 46 - "StructuredCard"
Cohesion: 0.09
Nodes (31): _build_hc_idempotent_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), get_ai_status(), get_context_suggestions(), handle_record_prefill_intent(), AIStatusResponse, ChatResponse (+23 more)

### Community 47 - "test_auto_create_job_on_lr.py"
Cohesion: 0.12
Nodes (22): JobCreate, LRCreate, create_job(), create_lr(), get_all_jobs(), update_job(), update_lr(), Job (+14 more)

### Community 48 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 49 - "tools.py"
Cohesion: 0.07
Nodes (34): get_active_lr_draft(), log_blocked_rbac_attempt(), stream_chat_with_copilot(), event_generator(), execute_accounting_tool(), execute_branch_tool(), execute_client_tool(), execute_consigner_consignee_tool() (+26 more)

### Community 50 - "rag.py"
Cohesion: 0.06
Nodes (16): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks() (+8 more)

### Community 51 - "reports/router.py"
Cohesion: 0.16
Nodes (17): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+9 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.25
Nodes (4): BranchUpdate, CompanySettingUpdate, EmailSettingResponse, EmailSettingUpdate

### Community 54 - "lr-register/page.tsx"
Cohesion: 0.23
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, CustomerOption, formatDateDisplay(), formatLocation(), formatOfficeName(), getDefaultFinancialYearDates(), LRRegisterPage() (+2 more)

### Community 55 - "update_existing_user"
Cohesion: 0.22
Nodes (10): update_admin_settings(), update_series_category(), update_series_master(), update_staff_recipient(), update_user(), SeriesCategoryUpdate, UserUpdate, update_existing_user() (+2 more)

### Community 56 - "classify_intent_and_entities"
Cohesion: 0.10
Nodes (14): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, get_job_guide_response() (+6 more)

### Community 57 - "test_vendor_directory_posting_and_reconciliation"
Cohesion: 0.33
Nodes (5): ensure_unified_creditor_vendors(), list_vendor_ledgers(), test_preexisting_unlinked_creditor_auto_sync(), test_vehicle_owner_and_hire_challan_auto_vendor_provisioning(), test_vendor_directory_posting_and_reconciliation()

### Community 58 - "accounts/schemas.py"
Cohesion: 0.04
Nodes (73): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_staff_imprest_ledger_detail(), get_vendor_ledger_detail() (+65 more)

### Community 59 - "Branch"
Cohesion: 0.08
Nodes (34): resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft(), Branch, CompanyVehicle, Consignee, Consigner, Driver (+26 more)

### Community 60 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

### Community 62 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+9 more)

### Community 63 - "statements/service.py"
Cohesion: 0.23
Nodes (22): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+14 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "apiClient"
Cohesion: 0.03
Nodes (101): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+93 more)

### Community 67 - "opening-balance/page.tsx"
Cohesion: 0.33
Nodes (3): OpeningBalanceAccount, OpeningBalanceDetailsPage(), OpeningBalanceResponse

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "AsyncSession"
Cohesion: 0.12
Nodes (20): get_permissions_schema(), check_series(), create_staff_recipient(), get_activity_filters(), get_activity_stats(), get_email_settings(), get_manual_series_ranges(), get_permissions_schema_endpoint() (+12 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.12
Nodes (17): BillingClientResponse, get_activity_logs(), build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), UserActivity, UserOfficeAssignment (+9 more)

### Community 73 - "formatCurrency"
Cohesion: 0.03
Nodes (106): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, SeriesMasterPage() (+98 more)

### Community 75 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "settings/roles/page.tsx"
Cohesion: 0.23
Nodes (10): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+2 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 83 - "Any"
Cohesion: 0.05
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 84 - "errors.py"
Cohesion: 0.08
Nodes (18): _matches_permission(), require_permission(), _check_permission(), _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, QuotaExceededException (+10 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

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
Cohesion: 0.13
Nodes (7): compute_canonical_hash(), normalize_val(), test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 100 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "hire-challan/page.tsx"
Cohesion: 0.09
Nodes (26): FastagTrackingPage(), FastagTripSummary, LRSummary, BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem (+18 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 186 - "ai/router.py"
Cohesion: 0.04
Nodes (43): build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number(), parse_hc_entities_from_text(), is_instructional_job_inquiry() (+35 more)

### Community 203 - "trial-balance/page.tsx"
Cohesion: 0.25
Nodes (5): TrialBalanceAccount, TrialBalanceGroup, TrialBalancePage(), TrialBalancePrimaryGroup, TrialBalanceResponse

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1612 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **107 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `SIM & Telecom Tracking Integration` to `Tenant`, `Fleet & Vehicle Maintenance Operations`, `knowledge.py`, `tenant_db/models.py`, `test_ai_phase3_lr_creation.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `ForbiddenException`, `test_issuing_office_system.py`, `pytest`, `general/router.py`, `chat_with_copilot`, `home/service.py`, `excel_import.py`, `transport/schemas.py`, `misc/router.py`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `test_general_invoice_voucher_e2e.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `tools.py`, `rag.py`, `reports/router.py`, `update_existing_user`, `test_vendor_directory_posting_and_reconciliation`, `ai/router.py`, `accounts/schemas.py`, `Branch`, `upload_and_extract_document`, `update_email_settings`, `AsyncSession`, `test_activity_audit_log_system.py`, `errors.py`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Are the 297 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 297 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tenant` be split into smaller, more focused modules?**
  _Cohesion score 0.05647517039922103 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `Tenant` to `SIM & Telecom Tracking Integration`, `knowledge.py`, `tenant_db/models.py`, `test_ai_phase3_lr_creation.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `pytest`, `general/router.py`, `chat_with_copilot`, `TestSIMTrackingWallet`, `typing`, `transport/schemas.py`, `misc/router.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `main.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `TestFASTagTracking`, `control/service.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `tools.py`, `rag.py`, `reports/router.py`, `test_vendor_directory_posting_and_reconciliation`, `ai/router.py`, `Branch`, `upload_and_extract_document`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 130 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_purchase_register_voucher_e2e.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12659698025551683 - nodes in this community are weakly interconnected._