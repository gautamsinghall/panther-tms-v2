# Graph Report - panther-tms-v2  (2026-11-25)

## Corpus Check
- 442 files · ~707,756 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4930 nodes · 19680 edges · 232 communities (106 shown, 126 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2185 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04b8252e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tenant
- einvoicing/service.py
- list_vendors
- PageHeader
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- test_ai_perfect_tms_enhancements.py
- pytest
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
- resolve_navigation_suggestions
- payment-voucher/page.tsx
- test_gps_tracking.py
- tenant_db/models.py
- home/service.py
- excel_import.py
- test_ai_real_db_integration.py
- misc/router.py
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- Decimal
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- general-purchase/page.tsx
- control/service.py
- reports/service.py
- get
- create_general_invoice
- create_purchase_bill
- daybook/page.tsx
- state-select.tsx
- Tenant
- general-invoice/page.tsx
- auth/service.py
- Client Component Flow
- CompanySetting
- build_user_navigation
- AsyncSession
- classify_intent_and_entities
- tenant_db/models.py
- BaseModel
- accounts/schemas.py
- get
- package.json
- dependencies
- RedisDraftBackend
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- normal-purchase/page.tsx
- CacheControlMiddleware
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- test_activity_audit_log_system.py
- consignment-360/page.tsx
- uuid
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- test_company_bank_accounts_comprehensive_lifecycle
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- AIDraftStore
- LRUpdate
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- classify_intent_and_entities
- general-purchase/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- TestSIMTrackingWallet
- toast-provider.tsx
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
- BaseDraftBackend
- transport_reports/router.py
- test_live_api.py
- Any
- EmailSetting
- email_service.py
- InMemoryDraftBackend
- AsyncSession
- register_error_handlers
- KnowledgeChunk
- trial-balance/page.tsx
- put
- output_guards.py
- opening-balance/page.tsx
- os-debtor/page.tsx
- theme-context.tsx
- scripts
- tailwindcss
- master_ledger_service.py
- discard_active_lr_draft
- normalize_val

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
- `list_plans()` --uses--> `Plan`  [INFERRED]
  backend/app/control/router.py → backend/app/control/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (232 total, 126 thin omitted)

### Community 0 - "Tenant"
Cohesion: 0.08
Nodes (49): Plan, detect_language(), User, copilot_env(), test_api_chat_endpoint_live_mock_response(), test_api_chat_endpoint_unconfigured_safe_mode(), test_api_chat_operational_tool_end_to_end(), test_api_context_suggestions_endpoint() (+41 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.08
Nodes (20): get_gsp_provider(), GSPProviderInterface, MockSandboxGSPProvider, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns() (+12 more)

### Community 2 - "list_vendors"
Cohesion: 0.36
Nodes (8): update_vendor(), create_vendor(), delete_vendor(), _ensure_vendor_columns(), get_vendor(), list_vendors(), update_vendor(), test_vendor_full_lifecycle()

### Community 3 - "PageHeader"
Cohesion: 0.03
Nodes (140): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraVoucherPage(), numberToWords(), CreditDebitNotesPage(), GeneralInvoicePage() (+132 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.04
Nodes (83): LoginPage(), PlanOption, PLANS, SignupPage(), BranchOption, CompanyDetailsPage(), loadData(), CompanySettingData (+75 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.04
Nodes (119): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+111 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (81): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+73 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (92): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+84 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (30): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+22 more)

### Community 9 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.10
Nodes (9): rewrite_followup_query(), test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks(), test_lr_nine_statuses_in_knowledge(), test_missing_enums_knowledge_chunks(), test_output_guards_expanded_document_ids(), test_page_registry_all_modules_and_dynamic_fallback(), test_synonym_map_multilingual_expansion() (+1 more)

### Community 10 - "pytest"
Cohesion: 0.04
Nodes (55): QuotaExceededException, clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent() (+47 more)

### Community 11 - "transport/service.py"
Cohesion: 0.04
Nodes (89): AppException, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), _build_search_variants(), check_and_deduct_fastag_credit(), check_and_deduct_sim_credit(), close_sim_trip(), create_arrival_report() (+81 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (51): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+43 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "master-ledger/page.tsx"
Cohesion: 0.13
Nodes (14): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+6 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.23
Nodes (14): get_unbilled_lrs(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), resolve_office(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping() (+6 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.09
Nodes (51): create_billing_client(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location(), create_packing_method(), create_unit() (+43 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.09
Nodes (10): detect_telecom_operator(), FreightTigerClient, update_fastag_trip_endpoint(), update_sim_trip(), SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, update_sim_trip() (+2 more)

### Community 18 - "Branch"
Cohesion: 0.06
Nodes (19): get_master_ledger_summary(), list_billing_client_ledgers(), list_vendor_ledgers(), Branch, test_change_consignee_when_already_set(), test_combined_message_opens_draft_without_start_gate(), test_hard_rule_0_delete_blocked(), test_lr_package_count_fallback() (+11 more)

### Community 19 - "test_voucher_edit_e2e.py"
Cohesion: 0.08
Nodes (33): ContraVoucherCreate, JournalEntryLineCreate, JournalVoucherCreate, create_contra_voucher(), create_journal_voucher(), get_account_by_code(), e2e_session(), test_bank_to_bank_transfer_with_charges() (+25 more)

### Community 20 - "general/router.py"
Cohesion: 0.13
Nodes (38): create_billing_client(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location(), create_packing_method(), create_unit() (+30 more)

### Community 21 - "SeriesMaster"
Cohesion: 0.16
Nodes (18): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+10 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.06
Nodes (42): _matches_permission(), ChatMessage, ChatRequest, anyio_backend(), test_active_draft_destination_slot_filling(), test_cancel_discards_draft(), test_driver_advance_balance_lookup(), test_existing_offtopic_refusals_preserved() (+34 more)

### Community 23 - "toast.ts"
Cohesion: 0.05
Nodes (133): ContraAccountOption, ContraType, LedgerEntry, VoucherRecord, BillingClientItem, LedgerEntry, ProformaInvoicePage(), VoucherRecord (+125 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (42): create_consignee(), create_consigner(), update_billing_client(), BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate (+34 more)

### Community 25 - "resolve_navigation_suggestions"
Cohesion: 0.40
Nodes (3): resolve_navigation_suggestions(), test_navigation_resolver_accuracy(), test_navigation_resolver_never_invents_routes()

### Community 26 - "payment-voucher/page.tsx"
Cohesion: 0.05
Nodes (36): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+28 more)

### Community 27 - "test_gps_tracking.py"
Cohesion: 0.23
Nodes (11): ApiCenterSettingResponse, ApiCenterSettingUpdate, WheelsEyeTestRequest, WheelsEyeTestResponse, test_wheelseye_connection(), extract_location_text(), test_api_center_wheelseye_schema(), test_extract_location_text() (+3 more)

### Community 28 - "tenant_db/models.py"
Cohesion: 0.04
Nodes (57): get_current_company_admin(), get_current_office(), get_current_user(), require_permission(), _check_permission(), login(), PlatformAdmin, seed_plans_and_entitlements() (+49 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.08
Nodes (27): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+19 more)

### Community 31 - "test_ai_real_db_integration.py"
Cohesion: 0.14
Nodes (7): anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), build_human_handoff_response(), test_gemini_structural_privacy_anonymization(), anyio_backend(), test_privacy_boundary_pii_sanitization()

### Community 32 - "misc/router.py"
Cohesion: 0.07
Nodes (75): update_account(), update_charge_head(), update_employee(), update_group_in_primary(), update_primary_group(), update_subgroup(), update_tax_category(), AccountBase (+67 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.13
Nodes (20): ArrivalRegisterRow, HireChallanRegisterRow, InvoiceRegisterRow, LRClientWiseRecord, LRClientWiseRow, LRRegisterRow, PendingHCRow, UnbilledLRRow (+12 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.10
Nodes (34): ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, BranchUpdate, ChangePasswordRequest, CompanySettingResponse (+26 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (36): list_roles(), map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse (+28 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.07
Nodes (51): ReceiptAgainstInvoiceCreate, TransportInvoiceCreate, VoucherCreate, calculate_account_balance(), calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+43 more)

### Community 37 - "Decimal"
Cohesion: 0.03
Nodes (90): Entitlement, AIDraft, compute_canonical_hash(), build_hc_preview_card(), handle_conversational_hc_booking(), is_hc_cancel_intent(), is_instructional_hc_inquiry(), normalize_vehicle_number() (+82 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.24
Nodes (14): LoginRequest, authenticate_user(), create_access_token(), create_refresh_token(), decode_token(), get_password_hash(), verify_password(), update_existing_user() (+6 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.14
Nodes (37): resolve_freight_tiger_token(), sanitize_ft_base_url(), get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch() (+29 more)

### Community 40 - "settings/service.py"
Cohesion: 0.11
Nodes (27): create_new_role(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+19 more)

### Community 41 - "general-purchase/page.tsx"
Cohesion: 0.05
Nodes (52): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+44 more)

### Community 42 - "control/service.py"
Cohesion: 0.08
Nodes (37): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+29 more)

### Community 43 - "reports/service.py"
Cohesion: 0.10
Nodes (47): get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_profit_and_loss(), get_purchase_register(), get_sales_register(), get_special_report() (+39 more)

### Community 44 - "get"
Cohesion: 0.06
Nodes (21): get_billing_client_ledger_detail(), get_client_open_invoices(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_contra_eligible_accounts_endpoint(), get_driver_ledger_detail(), get_eligible_invoices_for_note_endpoint(), get_generic_account_ledger_detail() (+13 more)

### Community 45 - "create_general_invoice"
Cohesion: 0.09
Nodes (30): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note(), create_general_invoice() (+22 more)

### Community 46 - "create_purchase_bill"
Cohesion: 0.10
Nodes (25): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), test_two_bills_exact_and_split() (+17 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 48 - "state-select.tsx"
Cohesion: 0.16
Nodes (13): BranchItem, IssuingOfficesPage(), ProfileBranchRedirect(), CountrySelect(), CountrySelectProps, GstinInput(), StateSelect(), StateSelectProps (+5 more)

### Community 49 - "Tenant"
Cohesion: 0.03
Nodes (104): Tenant, is_hire_challan_intent(), is_job_booking_intent(), build_system_prompt(), format_page_registry_entry(), get_authorized_navigation_catalog(), get_page_registry_entry(), parse_page_context() (+96 more)

### Community 50 - "general-invoice/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 51 - "auth/service.py"
Cohesion: 0.22
Nodes (12): get_me(), logout(), refresh_token(), OfficeSummary, RefreshTokenRequest, TenantContextResponse, TokenResponse, UserAuthSummary (+4 more)

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 55 - "AsyncSession"
Cohesion: 0.19
Nodes (20): create_role(), create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+12 more)

### Community 56 - "classify_intent_and_entities"
Cohesion: 0.13
Nodes (6): clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult

### Community 57 - "tenant_db/models.py"
Cohesion: 0.06
Nodes (45): list_duties_and_taxes_ledgers(), seed_indian_accounting_chart_of_accounts(), GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse (+37 more)

### Community 58 - "BaseModel"
Cohesion: 0.04
Nodes (74): clean_vehicle_number(), FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), ArrivalReportBase, ArrivalReportCreate, CompanyVehicleBase (+66 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.09
Nodes (42): ATHPaymentCreate, BankStatementImportResponse, BankStatementLineResponse, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, BulkConfirmRequest, CategoryOverviewStat (+34 more)

### Community 60 - "get"
Cohesion: 0.12
Nodes (12): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_admin_settings() (+4 more)

### Community 61 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "normal-purchase/page.tsx"
Cohesion: 0.06
Nodes (31): BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption, VoucherRecord (+23 more)

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
Cohesion: 0.04
Nodes (82): loadPurchaseRegister(), loadSettings(), SeriesMasterPage(), Consignment360Content(), Consignment360Data, Consignment360Page(), FinancialSummary, LifecycleStage (+74 more)

### Community 75 - "uuid"
Cohesion: 0.04
Nodes (30): _call_groq(), call_llm(), _call_nvidia(), _call_openai(), is_provider_configured(), _is_valid_key(), sanitize_ai_response(), _stream_groq() (+22 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 83 - "test_company_bank_accounts_comprehensive_lifecycle"
Cohesion: 0.24
Nodes (12): CompanyBankAccountCreate, CompanyBankAccountResponse, create_company_bank_account(), get_company_bank_account(), list_company_bank_accounts(), lookup_ifsc(), mask_account_number(), set_default_bank_account() (+4 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 88 - "LRUpdate"
Cohesion: 0.21
Nodes (4): LRBase, LRInvoiceItem, LRResponse, LRUpdate

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

### Community 99 - "classify_intent_and_entities"
Cohesion: 0.17
Nodes (9): classify_intent_and_entities(), get_job_guide_response(), test_get_job_guide_response(), test_is_user_permitted_with_detached_or_mock_objects(), test_job_creation_routed_to_how_to_guide(), test_lr_creation_routed_to_how_to_guide(), test_typed_tools_get_how_to_job(), test_intent_router_new_intents_english_hindi() (+1 more)

### Community 100 - "general-purchase/page.tsx"
Cohesion: 0.06
Nodes (38): FastagTripSummary, LRSummary, BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord (+30 more)

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "TestSIMTrackingWallet"
Cohesion: 0.15
Nodes (3): check_sim_wallet_balance(), SimWalletTransaction, TestSIMTrackingWallet

### Community 104 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 182 - "transport_reports/router.py"
Cohesion: 0.40
Nodes (8): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series()

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 198 - "EmailSetting"
Cohesion: 0.20
Nodes (6): get_email_settings(), update_email_settings(), EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 200 - "email_service.py"
Cohesion: 0.19
Nodes (4): send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 207 - "AsyncSession"
Cohesion: 0.42
Nodes (7): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return()

### Community 208 - "register_error_handlers"
Cohesion: 0.36
Nodes (6): _cors_headers_for_request(), register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler(), validation_exception_handler()

### Community 210 - "KnowledgeChunk"
Cohesion: 0.29
Nodes (4): _dynamic_navigation_chunks(), KnowledgeChunk, sanitize_chunk_text(), _tms_knowledge_chunks()

### Community 213 - "trial-balance/page.tsx"
Cohesion: 0.25
Nodes (5): TrialBalanceAccount, TrialBalanceGroup, TrialBalancePage(), TrialBalancePrimaryGroup, TrialBalanceResponse

### Community 214 - "put"
Cohesion: 0.08
Nodes (24): update_consignee(), update_consigner(), update_designation(), update_group_company(), update_industry(), update_load_type(), update_location(), update_packing_method() (+16 more)

### Community 216 - "output_guards.py"
Cohesion: 0.24
Nodes (5): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), guard_llm_reply(), _norm()

### Community 217 - "opening-balance/page.tsx"
Cohesion: 0.33
Nodes (3): OpeningBalanceAccount, OpeningBalanceDetailsPage(), OpeningBalanceResponse

### Community 219 - "os-debtor/page.tsx"
Cohesion: 0.33
Nodes (3): OSDebtorItem, OSDebtorResponse, OutstandingDebtorsPage()

### Community 220 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 221 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 222 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 224 - "master_ledger_service.py"
Cohesion: 0.08
Nodes (29): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+21 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1678 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **126 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Tenant` to `list_vendors`, `SIM & Telecom Tracking Integration`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `test_ai_perfect_tms_enhancements.py`, `pytest`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `test_issuing_office_system.py`, `FreightTigerClient`, `Branch`, `test_voucher_edit_e2e.py`, `general/router.py`, `chat_with_copilot`, `general/schemas.py`, `tenant_db/models.py`, `home/service.py`, `excel_import.py`, `test_ai_real_db_integration.py`, `settings/router.py`, `accounts/service.py`, `Decimal`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `get`, `create_purchase_bill`, `Tenant`, `auth/service.py`, `build_user_navigation`, `AsyncSession`, `transport_reports/router.py`, `tenant_db/models.py`, `get`, `EmailSetting`, `test_activity_audit_log_system.py`, `AsyncSession`, `put`, `discard_active_lr_draft`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 373 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 373 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tenant` be split into smaller, more focused modules?**
  _Cohesion score 0.07540983606557378 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `Tenant` to `Tenant`, `SIM & Telecom Tracking Integration`, `test_ai_perfect_tms_enhancements.py`, `pytest`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `Branch`, `general/router.py`, `chat_with_copilot`, `general/schemas.py`, `tenant_db/models.py`, `test_ai_real_db_integration.py`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `Decimal`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `control/service.py`, `reports/service.py`, `create_purchase_bill`, `auth/service.py`, `build_user_navigation`, `AsyncSession`, `tenant_db/models.py`, `BaseModel`, `discard_active_lr_draft`, `TestSIMTrackingWallet`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 187 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 187 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07955596669750231 - nodes in this community are weakly interconnected._