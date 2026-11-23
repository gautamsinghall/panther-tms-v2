# Graph Report - panther-tms-v2  (2026-11-23)

## Corpus Check
- 433 files · ~664,933 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4701 nodes · 18635 edges · 203 communities (100 shown, 103 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 1637 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bda951ea`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transport-invoice/page.tsx
- test_ai_real_db_integration.py
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
- tenant_db/models.py
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- utils.ts
- receipt-voucher/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- ChatMessage
- toast.ts
- general/schemas.py
- transport/schemas.py
- errors.py
- accounts/schemas.py
- datetime
- GST E-Invoicing & IRN Generation (3)
- test_lr_excel_import.py
- test_ai_phase4_job_and_challan.py
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
- classify_intent_and_entities
- test_general_invoice_voucher_e2e.py
- StructuredCard
- test_auto_create_job_on_lr.py
- state-select.tsx
- package.json
- AI Knowledge Base & RAG Index
- test_lr_excel_import.py
- Client Component Flow
- CompanySetting
- PageHeader
- AsyncSession
- ai/router.py
- lr-booking/page.tsx
- master_ledger_service.py
- LR
- test_voucher_edit_e2e.py
- dependencies
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- test_auth.py
- test_transport_invoice_voucher_e2e.py
- normal-purchase/page.tsx
- Client Component Flow (2)
- get
- Client Component Flow (3)
- test_activity_audit_log_system.py
- hire-challan-view-modal.tsx
- transport_reports/router.py
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- general/models.py
- gps-tracking-map.tsx
- Any
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- AsyncSession
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- journal-voucher/page.tsx
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- index.tsx
- daybook/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- excel_import.py
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
- list_vendors
- scripts
- test_live_api.py
- get_current_user
- clsx
- tailwind-merge
- tailwindcss
- settings/roles/page.tsx

## God Nodes (most connected - your core abstractions)
1. `User` - 537 edges
2. `Tenant` - 258 edges
3. `Branch` - 209 edges
4. `PageHeader()` - 203 edges
5. `apiClient()` - 197 edges
6. `react` - 175 edges
7. `Button` - 158 edges
8. `lucide-react` - 150 edges
9. `DataTable()` - 142 edges
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
- `_format_sim_trip()` --calls--> `detect_telecom_operator()`  [INFERRED]
  backend/app/modules/transport/router.py → backend/app/integrations/freight_tiger/client.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (203 total, 103 thin omitted)

### Community 0 - "transport-invoice/page.tsx"
Cohesion: 0.14
Nodes (15): BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord, amountToWords() (+7 more)

### Community 1 - "test_ai_real_db_integration.py"
Cohesion: 0.07
Nodes (28): stream_chat_with_copilot(), execute_accounting_tool(), execute_branch_tool(), execute_client_tool(), execute_consigner_consignee_tool(), execute_driver_tool(), execute_einvoice_tool(), execute_eway_bill_tool() (+20 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.14
Nodes (21): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), test_driver_advance_is_current_asset_not_immediate_expense() (+13 more)

### Community 3 - "Button"
Cohesion: 0.05
Nodes (63): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+55 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.03
Nodes (116): LoginPage(), PlanOption, PLANS, SignupPage(), BillAllocationItem, BranchData, CompanySettingData, LedgerEntry (+108 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (86): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_lr_response(), close_sim_trip(), create_arrival_report(), create_company_vehicle(), create_driver() (+78 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (82): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+74 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (89): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+81 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.05
Nodes (101): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+93 more)

### Community 9 - "sqlalchemy_ext_asyncio"
Cohesion: 0.06
Nodes (28): list_billing_client_ledgers(), list_duties_and_taxes_ledgers(), verify_and_heal_chart_of_accounts(), seed_indian_accounting_chart_of_accounts(), Account, BillingClient, GroupInPrimary, PrimaryGroup (+20 more)

### Community 10 - "User"
Cohesion: 0.04
Nodes (84): Plan, PlatformAdmin, Tenant, CategoryOverviewStat, MasterLedgerOverviewResponse, handle_conversational_lr_booking(), is_instructional_inquiry(), is_lr_booking_intent() (+76 more)

### Community 11 - "transport/service.py"
Cohesion: 0.06
Nodes (55): AppException, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit(), check_and_deduct_sim_credit(), close_sim_trip(), create_arrival_report(), create_driver() (+47 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (59): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+51 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "tenant_db/models.py"
Cohesion: 0.07
Nodes (31): get_all_drivers(), list_fastag_trips(), track_fastag_vehicle(), run_migration(), ArrivalReport, CompanySetting, Driver, EWayBill (+23 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.24
Nodes (13): get_current_office(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_lr_print_master_data_resolution() (+5 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.10
Nodes (48): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_load_type(), create_location(), create_packing_method(), create_unit() (+40 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.06
Nodes (11): resolve_freight_tiger_token(), detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, check_sim_wallet_balance(), SimWalletTransaction (+3 more)

### Community 18 - "utils.ts"
Cohesion: 0.07
Nodes (32): CompanyVehicleRecord, CompanyVehiclesPageProps, DriverOption, OwnerOption, BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption (+24 more)

### Community 19 - "receipt-voucher/page.tsx"
Cohesion: 0.05
Nodes (36): ContraAccountOption, ContraType, LedgerEntry, numberToWords(), VoucherRecord, BillAllocationRecord, CustomerOption, EligibleInvoice (+28 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.17
Nodes (13): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges(), get_real_voucher_usage() (+5 more)

### Community 22 - "ChatMessage"
Cohesion: 0.05
Nodes (50): is_valid_indian_vehicle(), validate_indian_gstin(), get_active_lr_draft(), handle_record_prefill_intent(), ChatMessage, ChatRequest, anyio_backend(), test_active_draft_destination_slot_filling() (+42 more)

### Community 23 - "toast.ts"
Cohesion: 0.05
Nodes (119): BillingClientItem, LedgerEntry, VoucherRecord, BranchItem, EInvoiceRecord, TaxpayerDetails, FleetDoc, ServiceRecord (+111 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (44): BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase (+36 more)

### Community 25 - "transport/schemas.py"
Cohesion: 0.04
Nodes (69): clean_vehicle_number(), ArrivalReportBase, ArrivalReportCreate, CompanyVehicleBase, CompanyVehicleResponse, CompanyVehicleUpdate, DriverBase, DriverCreate (+61 more)

### Community 26 - "errors.py"
Cohesion: 0.07
Nodes (27): get_current_company_admin(), _matches_permission(), require_permission(), _check_permission(), _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, ForbiddenException (+19 more)

### Community 27 - "accounts/schemas.py"
Cohesion: 0.07
Nodes (49): ATHPaymentCreate, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, CompanyBankAccountBase, CompanyBankAccountLedgerListItem, CompanyBankAccountUpdate, CompanyVehicleLedgerListItem (+41 more)

### Community 28 - "datetime"
Cohesion: 0.04
Nodes (68): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+60 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 30 - "test_lr_excel_import.py"
Cohesion: 0.19
Nodes (12): import_lrs_from_excel(), _normalize_lr_header(), create_sample_lr_excel(), test_db(), test_lr_import_chronological_ordering_and_job_autocreation(), test_lr_import_continues_from_last_series_count(), test_lr_import_date_and_numeric_exceptions(), test_lr_import_deduplication() (+4 more)

### Community 31 - "test_ai_phase4_job_and_challan.py"
Cohesion: 0.05
Nodes (38): Entitlement, QuotaExceededException, compute_canonical_hash(), normalize_val(), build_hc_preview_card(), handle_conversational_hc_booking(), normalize_vehicle_number(), parse_hc_entities_from_text() (+30 more)

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.12
Nodes (21): ArrivalRegisterRow, HireChallanRegisterRow, InvoiceRegisterRow, LRClientWiseRecord, LRClientWiseRow, LRRegisterRow, PendingHCRow, UnbilledLRRow (+13 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.09
Nodes (37): ApiCenterSettingResponse, ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest (+29 more)

### Community 35 - "settings/router.py"
Cohesion: 0.15
Nodes (30): list_roles(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+22 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.07
Nodes (47): CompanyBankAccountCreate, CompanyBankAccountResponse, VoucherCreate, calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment(), create_company_bank_account() (+39 more)

### Community 37 - "test_ai_real_postgres_redis.py"
Cohesion: 0.02
Nodes (48): AIDraft, AIDraftStore, extract_booking_entities_via_llm(), is_grounded_in_text(), _call_groq(), call_llm(), _call_nvidia(), _call_openai() (+40 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.14
Nodes (18): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+10 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.17
Nodes (35): sanitize_ft_base_url(), get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch(), delete_branch() (+27 more)

### Community 40 - "settings/service.py"
Cohesion: 0.13
Nodes (26): list_admin_settings(), ensure_series_table_schema(), create_new_role(), create_new_user(), create_series_category(), create_series_master(), delete_existing_role(), delete_series_category() (+18 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.09
Nodes (11): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse, FastagTripCreate (+3 more)

### Community 43 - "reports/service.py"
Cohesion: 0.09
Nodes (51): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+43 more)

### Community 44 - "classify_intent_and_entities"
Cohesion: 0.07
Nodes (17): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, test_english_50_cases_intent_and_slots() (+9 more)

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.10
Nodes (29): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+21 more)

### Community 46 - "StructuredCard"
Cohesion: 0.10
Nodes (29): _build_hc_idempotent_response(), _build_lr_idempotent_response(), get_ai_status(), get_context_suggestions(), AIStatusResponse, ChatResponse, ContextSuggestionResponse, HireChallanConfirmationResponse (+21 more)

### Community 47 - "test_auto_create_job_on_lr.py"
Cohesion: 0.11
Nodes (21): _build_job_response(), JobUpdate, LRCreate, create_lr(), get_all_jobs(), update_job(), Job, JobStatus (+13 more)

### Community 48 - "state-select.tsx"
Cohesion: 0.27
Nodes (7): StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT, INDIAN_STATE_OPTIONS, isIndia(), normalizeIndianState(), StateInfo

### Community 49 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 50 - "AI Knowledge Base & RAG Index"
Cohesion: 0.07
Nodes (14): KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks(), test_lr_nine_statuses_in_knowledge() (+6 more)

### Community 51 - "test_lr_excel_import.py"
Cohesion: 0.19
Nodes (13): _get_all(), list_billing_clients(), list_consignees(), list_consigners(), list_locations(), list_locations_page(), create_sample_excel(), test_db() (+5 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.21
Nodes (6): BranchUpdate, CompanySettingUpdate, EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 54 - "PageHeader"
Cohesion: 0.05
Nodes (124): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraVoucherPage(), CreditDebitNotesPage(), GeneralInvoicePage(), GeneralPurchasePage() (+116 more)

### Community 55 - "AsyncSession"
Cohesion: 0.23
Nodes (16): create_role(), create_series_category(), create_series_master(), create_user(), delete_role(), delete_series_category(), delete_series_master(), import_default_series_template() (+8 more)

### Community 56 - "ai/router.py"
Cohesion: 0.03
Nodes (67): is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), is_instructional_job_inquiry(), is_job_booking_intent(), is_job_cancel_intent(), build_system_prompt(), detect_language() (+59 more)

### Community 57 - "lr-booking/page.tsx"
Cohesion: 0.09
Nodes (26): LRRecord, SelectOption, SeriesRangeItem, STANDARD_VEHICLE_TYPES, LinkedJobData, LinkedJobSummaryCard(), LinkedJobSummaryCardProps, createEmptyInvoiceItem() (+18 more)

### Community 58 - "master_ledger_service.py"
Cohesion: 0.10
Nodes (26): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+18 more)

### Community 59 - "LR"
Cohesion: 0.05
Nodes (48): build_job_preview_card(), handle_conversational_job_booking(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party(), validate_and_update_job_draft(), clean_party_name(), is_valid_location_name() (+40 more)

### Community 61 - "test_voucher_edit_e2e.py"
Cohesion: 0.12
Nodes (15): ContraVoucherCreate, update_contra_voucher(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_cash_internal_transfer(), test_contra_voiding_reversal(), test_get_contra_eligible_accounts(), test_invalid_account_type_rejection() (+7 more)

### Community 62 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, class-variance-authority@^0.7.1, framer-motion@^13.4.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+6 more)

### Community 63 - "statements/service.py"
Cohesion: 0.20
Nodes (22): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+14 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "test_auth.py"
Cohesion: 0.24
Nodes (11): create_access_token(), create_refresh_token(), decode_token(), get_password_hash(), verify_password(), test_demo_admin_auto_reactivation_on_login(), test_jwt_token_payload_and_tenant_isolation(), test_non_demo_user_inactive_raises_error() (+3 more)

### Community 67 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.29
Nodes (8): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 68 - "normal-purchase/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "get"
Cohesion: 0.14
Nodes (10): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_series_categories() (+2 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.16
Nodes (14): BillingClientResponse, build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), audit_db(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options() (+6 more)

### Community 73 - "hire-challan-view-modal.tsx"
Cohesion: 0.04
Nodes (52): FastagTripSummary, LRSummary, AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage() (+44 more)

### Community 75 - "transport_reports/router.py"
Cohesion: 0.40
Nodes (8): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series()

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "general/models.py"
Cohesion: 0.18
Nodes (8): create_group_company(), create_industry(), delete_group_company(), delete_industry(), list_group_companies(), list_industries(), GroupCompany, Industry

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.09
Nodes (26): dynamic, metadata, RootLayout(), viewport, buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline() (+18 more)

### Community 80 - "Any"
Cohesion: 0.06
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 84 - "AsyncSession"
Cohesion: 0.42
Nodes (7): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return()

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

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

### Community 99 - "index.tsx"
Cohesion: 0.25
Nodes (7): AreaTrendChart(), AreaTrendChartProps, AreaTrendDataPoint, BarMetricChartProps, DonutDistributionChartProps, recharts@^3.10.1, recharts

### Community 100 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "excel_import.py"
Cohesion: 0.14
Nodes (8): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), _normalize_header(), _parse_date(), _resolve_or_create_location(), test_resolve_location_autocreate_when_missing(), test_resolve_location_city_state_pincode()

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 181 - "list_vendors"
Cohesion: 0.53
Nodes (6): create_vendor(), delete_vendor(), _ensure_vendor_columns(), list_vendors(), update_vendor(), test_vendor_full_lifecycle()

### Community 182 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 187 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 188 - "settings/roles/page.tsx"
Cohesion: 0.23
Nodes (10): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+2 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1570 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **103 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `SIM & Telecom Tracking Integration` to `test_ai_real_db_integration.py`, `test_purchase_register_voucher_e2e.py`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `User`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `tenant_db/models.py`, `test_issuing_office_system.py`, `general/router.py`, `ChatMessage`, `errors.py`, `accounts/schemas.py`, `datetime`, `test_lr_excel_import.py`, `test_ai_phase4_job_and_challan.py`, `Multi-Tenant Auth & Permissions`, `settings/router.py`, `accounts/service.py`, `test_ai_real_postgres_redis.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `reports/service.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `AI Knowledge Base & RAG Index`, `test_lr_excel_import.py`, `AsyncSession`, `ai/router.py`, `get_current_user`, `LR`, `test_auth.py`, `get`, `test_activity_audit_log_system.py`, `transport_reports/router.py`, `AsyncSession`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 284 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 284 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `transport-invoice/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14035087719298245 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `User` to `test_ai_real_db_integration.py`, `test_purchase_register_voucher_e2e.py`, `SIM & Telecom Tracking Integration`, `sqlalchemy_ext_asyncio`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `tenant_db/models.py`, `test_issuing_office_system.py`, `general/router.py`, `allocate_or_validate_voucher_number`, `ChatMessage`, `errors.py`, `accounts/schemas.py`, `datetime`, `test_lr_excel_import.py`, `test_ai_phase4_job_and_challan.py`, `Multi-Tenant Auth & Permissions`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `accounts/service.py`, `test_ai_real_postgres_redis.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `reports/service.py`, `test_general_invoice_voucher_e2e.py`, `StructuredCard`, `test_auto_create_job_on_lr.py`, `AI Knowledge Base & RAG Index`, `test_lr_excel_import.py`, `AsyncSession`, `ai/router.py`, `master_ledger_service.py`, `LR`, `test_voucher_edit_e2e.py`, `test_transport_invoice_voucher_e2e.py`, `get`, `test_activity_audit_log_system.py`, `transport_reports/router.py`, `excel_import.py`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 131 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 131 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_ai_real_db_integration.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07412587412587412 - nodes in this community are weakly interconnected._