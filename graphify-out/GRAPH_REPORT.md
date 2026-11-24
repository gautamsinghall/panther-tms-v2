# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 436 files · ~686,486 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4780 nodes · 18943 edges · 208 communities (99 shown, 109 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 1839 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `281af0cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lr_draft_service.py
- reports/router.py
- test_purchase_register_voucher_e2e.py
- Button
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- Misc Accounting Groups & Categories
- sqlalchemy_ext_asyncio
- User
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- typing
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- hire-challan/page.tsx
- button.tsx
- general/router.py
- allocate_or_validate_voucher_number
- chat_with_copilot
- toast.ts
- general/schemas.py
- transport/schemas.py
- register_error_handlers
- accounts/schemas.py
- typing
- GST E-Invoicing & IRN Generation (3)
- BillingClient
- LRUpdate
- Multi-Tenant Auth & Permissions
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- test_ai_real_postgres_redis.py
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- FASTag Toll & Tracking Service (8)
- reports/service.py
- test_gps_tracking.py
- test_general_invoice_voucher_e2e.py
- StructuredCard
- test_auto_create_job_on_lr.py
- state-select.tsx
- tools.py
- rag.py
- ai/provider.py
- Client Component Flow
- CompanySetting
- PageHeader
- AsyncSession
- test_ai_perfect_tms_enhancements.py
- test_transport_invoice_voucher_e2e.py
- transport-invoice/page.tsx
- SeriesMaster
- test_voucher_edit_e2e.py
- package.json
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- upload_and_extract_document
- Branch
- normal-purchase/page.tsx
- Client Component Flow (2)
- AsyncSession
- Client Component Flow (3)
- test_activity_audit_log_system.py
- formatCurrency
- validate_and_update_hc_draft
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- settings/roles/page.tsx
- gps-tracking-map.tsx
- create_vendor
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- AIDraft
- AsyncSession
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- get_all_tenant_db_names
- journal-voucher/page.tsx
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- freight_tiger/client.py
- daybook/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- e2e_session
- CacheControlMiddleware
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
- master-ledger/page.tsx
- e2e_session
- test_live_api.py
- e2e_session
- test_session
- ai/router.py
- email_service.py
- update_email_settings

## God Nodes (most connected - your core abstractions)
1. `User` - 546 edges
2. `Tenant` - 258 edges
3. `Branch` - 212 edges
4. `PageHeader()` - 203 edges
5. `apiClient()` - 196 edges
6. `react` - 176 edges
7. `Button` - 158 edges
8. `lucide-react` - 151 edges
9. `DataTable()` - 140 edges
10. `cn()` - 140 edges

## Surprising Connections (you probably didn't know these)
- `Asset: airtel.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/airtel.svg → docs/prd.md
- `Asset: bsnl.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/bsnl.svg → docs/prd.md
- `Asset: jio.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/jio.svg → docs/prd.md
- `Asset: vi.svg` --references--> `Transport Operations Core Module`  [INFERRED]
  frontend/public/images/operators/vi.svg → docs/prd.md
- `create_vehicle_owner()` --uses--> `VehicleOwnerCreate`  [INFERRED]
  backend/app/modules/transport/router.py → backend/app/modules/transport/schemas.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (208 total, 109 thin omitted)

### Community 0 - "lr_draft_service.py"
Cohesion: 0.06
Nodes (27): resolve_or_create_job_location(), resolve_or_create_job_party(), clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry() (+19 more)

### Community 1 - "reports/router.py"
Cohesion: 0.15
Nodes (17): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+9 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.10
Nodes (30): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_against_purchase(), create_payment_voucher(), create_purchase_bill() (+22 more)

### Community 3 - "Button"
Cohesion: 0.03
Nodes (46): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, FastagWalletData, FastagWalletTxn, ApiCenterData (+38 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (116): LoginPage(), PlanOption, PLANS, SignupPage(), DashboardLayout(), WorkspaceCanvas(), UserAccountPage(), UserProfileData (+108 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (85): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_lr_response(), close_sim_trip(), create_arrival_report(), create_company_vehicle(), create_driver() (+77 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (80): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+72 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (92): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+84 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.05
Nodes (102): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+94 more)

### Community 9 - "sqlalchemy_ext_asyncio"
Cohesion: 0.06
Nodes (50): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+42 more)

### Community 10 - "User"
Cohesion: 0.04
Nodes (74): Entitlement, Plan, Tenant, CategoryOverviewStat, MasterLedgerOverviewResponse, handle_conversational_hc_booking(), handle_conversational_job_booking(), call_llm() (+66 more)

### Community 11 - "transport/service.py"
Cohesion: 0.05
Nodes (85): AppException, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), _build_search_variants(), check_and_deduct_fastag_credit(), close_sim_trip(), create_arrival_report(), create_company_vehicle() (+77 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (60): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+52 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (32): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+24 more)

### Community 14 - "typing"
Cohesion: 0.05
Nodes (28): get_current_user(), require_permission(), _check_permission(), login(), logout(), DuplicateResourceException, EntitlementLockedException, InternalServerException (+20 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.20
Nodes (13): get_current_office(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_lr_print_master_data_resolution() (+5 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (66): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+58 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.06
Nodes (12): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_and_deduct_sim_credit(), check_sim_wallet_balance(), create_sim_trip() (+4 more)

### Community 18 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 19 - "button.tsx"
Cohesion: 0.03
Nodes (68): Branch, CompanyBankAccount, INDIAN_BANKS, BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory (+60 more)

### Community 20 - "general/router.py"
Cohesion: 0.12
Nodes (39): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+31 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.15
Nodes (17): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+9 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (54): chat_with_copilot(), handle_record_prefill_intent(), AIStatusResponse, ChatMessage, ChatRequest, ChatResponse, ContextSuggestionResponse, HireChallanConfirmationResponse (+46 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (136): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, EInvoiceRecord, TaxpayerDetails, FleetDoc, ServiceRecord (+128 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.05
Nodes (52): update_billing_client(), update_consignee(), update_consigner(), update_designation(), update_group_company(), update_industry(), update_load_type(), update_location() (+44 more)

### Community 25 - "transport/schemas.py"
Cohesion: 0.06
Nodes (59): ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response (+51 more)

### Community 26 - "register_error_handlers"
Cohesion: 0.36
Nodes (6): _cors_headers_for_request(), register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler(), validation_exception_handler()

### Community 27 - "accounts/schemas.py"
Cohesion: 0.13
Nodes (20): JournalEntryLineCreate, JournalVoucherCreate, calculate_account_balance(), create_journal_voucher(), get_account_by_code(), preview_journal_voucher(), update_journal_voucher(), journal_session() (+12 more)

### Community 28 - "typing"
Cohesion: 0.06
Nodes (51): PlatformAdmin, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete() (+43 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 30 - "BillingClient"
Cohesion: 0.07
Nodes (29): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+21 more)

### Community 31 - "LRUpdate"
Cohesion: 0.21
Nodes (4): LRBase, LRInvoiceItem, LRResponse, LRUpdate

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.11
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.11
Nodes (31): ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest, CompanySettingResponse (+23 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (37): create_role(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+29 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.05
Nodes (57): ATHPaymentCreate, BillingClientLedgerListItem, BTHPaymentCreate, CompanyBankAccountBase, CompanyBankAccountCreate, CompanyBankAccountLedgerListItem, CompanyBankAccountResponse, CompanyBankAccountUpdate (+49 more)

### Community 37 - "test_ai_real_postgres_redis.py"
Cohesion: 0.05
Nodes (18): test_accounts_double_entry_reconciliation_and_void(), test_einvoicing_lifecycle_and_taxpayer_lookup(), test_free_plan_limits_and_feature_locks(), test_misc_accounting_masters_crud(), test_phase1_exit_criteria_e2e(), test_general_module_crud_masters(), test_rbac_custom_role_and_employee_restrictions(), test_phase2_end_to_end_exit_criteria() (+10 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.11
Nodes (27): build_user_navigation(), get_me(), get_user_navigation(), refresh_token(), LoginRequest, OfficeSummary, RefreshTokenRequest, TenantContextResponse (+19 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.16
Nodes (36): sanitize_ft_base_url(), get_gst_pan_client(), ApiCenterSettingResponse, GSTLookupResponse, GSTTestRequest, GSTTestResponse, PANLookupResponse, PANTestRequest (+28 more)

### Community 40 - "settings/service.py"
Cohesion: 0.09
Nodes (32): list_admin_settings(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+24 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.10
Nodes (5): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), TestFASTagTracking

### Community 43 - "reports/service.py"
Cohesion: 0.14
Nodes (37): BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse, ExportJobCreate (+29 more)

### Community 44 - "test_gps_tracking.py"
Cohesion: 0.12
Nodes (17): clean_vehicle_number(), GPSConfigResponse, GPSFleetCounts, GPSFleetResponse, GPSTrackResponse, GPSVehicleItem, extract_location_text(), fetch_all_wheelseye_vehicles() (+9 more)

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.08
Nodes (35): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+27 more)

### Community 46 - "StructuredCard"
Cohesion: 0.09
Nodes (29): build_hc_preview_card(), build_job_preview_card(), build_add_vehicle_driver_response(), _build_hc_idempotent_response(), build_how_to_lr_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), get_lr_explanation_markdown() (+21 more)

### Community 47 - "test_auto_create_job_on_lr.py"
Cohesion: 0.11
Nodes (25): _build_job_response(), JobCreate, LRCreate, create_job(), create_lr(), get_all_jobs(), update_job(), Job (+17 more)

### Community 48 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 49 - "tools.py"
Cohesion: 0.08
Nodes (28): _matches_permission(), stream_chat_with_copilot(), execute_accounting_tool(), execute_branch_tool(), execute_client_tool(), execute_consigner_consignee_tool(), execute_driver_tool(), execute_einvoice_tool() (+20 more)

### Community 50 - "rag.py"
Cohesion: 0.11
Nodes (7): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 51 - "ai/provider.py"
Cohesion: 0.13
Nodes (10): _call_groq(), _call_nvidia(), _call_openai(), _is_valid_key(), sanitize_ai_response(), _stream_groq(), stream_llm(), _stream_nvidia() (+2 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.18
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.13
Nodes (10): update_company(), BranchUpdate, CompanySettingUpdate, EmailSettingResponse, EmailSettingUpdate, get_email_setting(), update_company_setting(), update_email_setting() (+2 more)

### Community 54 - "PageHeader"
Cohesion: 0.06
Nodes (123): CompanyBankAccountsPage(), ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry, numberToWords(), VoucherRecord, CreditDebitNotesPage() (+115 more)

### Community 55 - "AsyncSession"
Cohesion: 0.19
Nodes (19): create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+11 more)

### Community 56 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.03
Nodes (41): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, build_system_prompt() (+33 more)

### Community 57 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.23
Nodes (9): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_receipt_against_invoice(), create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports() (+1 more)

### Community 58 - "transport-invoice/page.tsx"
Cohesion: 0.14
Nodes (15): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, amountToWords() (+7 more)

### Community 59 - "SeriesMaster"
Cohesion: 0.06
Nodes (38): validate_and_update_job_draft(), CompanyVehicle, Consignee, Consigner, Location, MarketVehicle, Role, RolePermission (+30 more)

### Community 61 - "test_voucher_edit_e2e.py"
Cohesion: 0.11
Nodes (16): ContraVoucherCreate, create_contra_voucher(), update_contra_voucher(), e2e_session(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_bank_deposit(), test_cash_to_cash_internal_transfer() (+8 more)

### Community 62 - "package.json"
Cohesion: 0.06
Nodes (43): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+35 more)

### Community 63 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "upload_and_extract_document"
Cohesion: 0.13
Nodes (6): get_active_lr_draft(), get_ai_status(), get_ai_tenant_db(), get_context_suggestions(), log_blocked_rbac_attempt(), upload_and_extract_document()

### Community 67 - "Branch"
Cohesion: 0.06
Nodes (34): confirm_lr_draft(), ConfirmLRDraftRequest, AIOperationIdempotency, Branch, anyio_backend(), test_atomic_database_idempotency_record_created(), test_concurrent_confirmation_distributed_lock(), test_conversational_lr_creation_hinglish() (+26 more)

### Community 68 - "normal-purchase/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "AsyncSession"
Cohesion: 0.12
Nodes (13): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_email_settings(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs() (+5 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.15
Nodes (16): BillingClientResponse, build_readable_details(), extract_client_ip(), get_activity_filters(), get_activity_stats(), log_activity(), query_activity_logs(), audit_db() (+8 more)

### Community 73 - "formatCurrency"
Cohesion: 0.04
Nodes (68): TrialBalancePage(), OpeningBalanceDetailsPage(), Consignment360Content(), Consignment360Data, Consignment360Page(), FinancialSummary, LifecycleStage, SuggestionItem (+60 more)

### Community 75 - "validate_and_update_hc_draft"
Cohesion: 0.17
Nodes (5): validate_and_update_hc_draft(), test_concurrent_confirmation_lock_and_replay(), test_hire_challan_formula_equivalence(), test_migration_idempotent_and_rollback(), test_safe_archival_rollback_preserves_records()

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "settings/roles/page.tsx"
Cohesion: 0.20
Nodes (9): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+1 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

### Community 80 - "create_vendor"
Cohesion: 0.33
Nodes (6): create_vendor(), update_vendor(), VendorCreate, VendorUpdate, create_vendor(), test_vendor_full_lifecycle()

### Community 83 - "AIDraft"
Cohesion: 0.04
Nodes (11): AIDraft, AIDraftStore, BaseDraftBackend, compute_canonical_hash(), InMemoryDraftBackend, json_serial(), normalize_val(), RedisDraftBackend (+3 more)

### Community 84 - "AsyncSession"
Cohesion: 0.21
Nodes (16): get_current_company_admin(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission(), _check(), get_gst_input(), get_gst_output() (+8 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "get_all_tenant_db_names"
Cohesion: 0.33
Nodes (3): get_all_tenant_db_names(), rollback_migration(), run_migration()

### Community 88 - "journal-voucher/page.tsx"
Cohesion: 0.20
Nodes (8): AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm, LedgerEntryItem, numberToWords(), VoucherRecord

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

### Community 100 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

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

### Community 181 - "master-ledger/page.tsx"
Cohesion: 0.14
Nodes (13): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+5 more)

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 186 - "ai/router.py"
Cohesion: 0.04
Nodes (42): is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number(), parse_hc_entities_from_text(), is_instructional_job_inquiry(), is_job_booking_intent(), is_job_cancel_intent() (+34 more)

### Community 203 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1603 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **109 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `SIM & Telecom Tracking Integration` to `lr_draft_service.py`, `reports/router.py`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `User`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `typing`, `test_issuing_office_system.py`, `general/router.py`, `chat_with_copilot`, `general/schemas.py`, `accounts/schemas.py`, `typing`, `BillingClient`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `test_general_invoice_voucher_e2e.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `tools.py`, `CompanySetting`, `AsyncSession`, `test_ai_perfect_tms_enhancements.py`, `ai/router.py`, `SeriesMaster`, `upload_and_extract_document`, `Branch`, `AsyncSession`, `test_activity_audit_log_system.py`, `update_email_settings`, `validate_and_update_hc_draft`, `create_vendor`, `AsyncSession`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Are the 292 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 292 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lr_draft_service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.059887005649717516 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `User` to `lr_draft_service.py`, `reports/router.py`, `SIM & Telecom Tracking Integration`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `typing`, `FreightTigerClient`, `general/router.py`, `chat_with_copilot`, `transport/schemas.py`, `typing`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `FASTag Toll & Tracking Service (8)`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `tools.py`, `AsyncSession`, `test_ai_perfect_tms_enhancements.py`, `ai/router.py`, `SeriesMaster`, `upload_and_extract_document`, `Branch`, `create_vendor`, `get_all_tenant_db_names`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 130 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Should `reports/router.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1471264367816092 - nodes in this community are weakly interconnected._