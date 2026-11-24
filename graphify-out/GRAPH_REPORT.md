# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 442 files · ~706,926 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4926 nodes · 19608 edges · 235 communities (111 shown, 124 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2090 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69e9ea9f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tenant
- einvoicing/service.py
- Any
- Button
- getStoredAuth
- SIM & Telecom Tracking Integration
- cn
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- test_ai_perfect_tms_enhancements.py
- Branch
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- Badge
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- test_ai_phase4_job_and_challan.py
- general-invoice/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- chat_with_copilot
- toast.ts
- general/schemas.py
- build_system_prompt
- payment-voucher/page.tsx
- TestSIMTrackingWallet
- typing
- home/service.py
- excel_import.py
- _format_sim_trip
- misc/router.py
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- tenant_db/models.py
- pytest
- Multi-Tenant Auth & Permissions (2)
- FASTag Toll & Tracking Service (7)
- settings/service.py
- tenancy.py
- control/service.py
- reports/service.py
- test_transport_invoice_voucher_e2e.py
- test_general_invoice_voucher_e2e.py
- normal-purchase/page.tsx
- httpx
- sanitize_chat_history_for_external_llm
- tools.py
- TestFASTagTracking
- PantherKnowledgeEngine
- Client Component Flow
- CompanySetting
- lr-register/page.tsx
- AsyncSession
- classify_intent_and_entities
- get_master_ledger_summary
- BaseModel
- get_vendor_ledger_detail
- update_email_settings
- test_gps_tracking.py
- dependencies
- RedisDraftBackend
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- PageHeader
- signup/page.tsx
- Client Component Flow (2)
- AsyncSession
- Client Component Flow (3)
- test_activity_audit_log_system.py
- formatCurrency
- package.json
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- AIDraftStore
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- InMemoryDraftBackend
- errors.py
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- toast-provider.tsx
- LRUpdate
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- test_phase6_exit_criteria.py
- tracking/fastag/page.tsx
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- hire-challan/page.tsx
- hc-register/page.tsx
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
- Any
- main.py
- StructuredCard
- email_service.py
- theme-context.tsx
- scripts
- tailwindcss
- detect_language
- put
- output_guards.py
- get_consignment_360
- Any
- test_tenancy.py
- KnowledgeChunk
- get_active_lr_draft
- LoadType
- test_company_vehicle_master_ledger_listing_and_summary
- get_all_tenant_db_names
- discard_active_lr_draft
- generate_job_import_template
- json_serial

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
- `test_hc_quota_enforcement_blocks_creation()` --uses--> `Entitlement`  [INFERRED]
  backend/tests/test_ai_phase4_job_and_challan.py → backend/app/control/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (235 total, 124 thin omitted)

### Community 0 - "Tenant"
Cohesion: 0.06
Nodes (54): Plan, Tenant, get_authorized_navigation_catalog(), clear_chat_session(), sanitize_ai_output(), classify_operational_intent(), copilot_env(), test_api_chat_endpoint_live_mock_response() (+46 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.11
Nodes (20): get_gsp_provider(), GSPProviderInterface, cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response() (+12 more)

### Community 2 - "Any"
Cohesion: 0.12
Nodes (12): create_vendor(), update_billing_client(), update_consignee(), update_consigner(), update_vendor(), BillingClientUpdate, ConsigneeUpdate, ConsignerUpdate (+4 more)

### Community 3 - "Button"
Cohesion: 0.05
Nodes (59): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+51 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.04
Nodes (75): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+67 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.05
Nodes (83): delete_company_bank_account(), list_charge_heads(), list_tax_categories(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_lr_response(), create_arrival_report(), create_company_vehicle() (+75 more)

### Community 6 - "cn"
Cohesion: 0.04
Nodes (78): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, GPSConfig, GPSTrackingPage(), TimelineItem (+70 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (93): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+85 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (30): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+22 more)

### Community 9 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.10
Nodes (9): test_bilingual_glossary_enrichment(), test_frontend_pages_knowledge_chunks(), test_intent_router_new_intents_english_hindi(), test_language_detection_devanagari_and_greetings(), test_lr_nine_statuses_in_knowledge(), test_missing_enums_knowledge_chunks(), test_output_guards_expanded_document_ids(), test_synonym_map_multilingual_expansion() (+1 more)

### Community 10 - "Branch"
Cohesion: 0.02
Nodes (129): _matches_permission(), Entitlement, QuotaExceededException, compute_canonical_hash(), normalize_val(), is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry() (+121 more)

### Community 11 - "transport/service.py"
Cohesion: 0.06
Nodes (68): AppException, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit(), create_arrival_report(), create_company_vehicle(), create_driver(), create_eway_bill() (+60 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.04
Nodes (70): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+62 more)

### Community 13 - "AsyncSession"
Cohesion: 0.14
Nodes (30): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+22 more)

### Community 14 - "Badge"
Cohesion: 0.05
Nodes (37): Branch, CompanyBankAccount, INDIAN_BANKS, AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm (+29 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.18
Nodes (16): get_current_office(), get_current_user(), get_user_office_context(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), resolve_office(), test_cross_office_data_isolation() (+8 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.09
Nodes (60): ensure_unified_creditor_vendors(), create_billing_client(), create_designation(), create_group_company(), create_industry(), create_packing_method(), create_unit(), create_vendor() (+52 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.09
Nodes (11): detect_telecom_operator(), FreightTigerClient, SIMConsentSimulate, SIMTripClose, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, close_sim_trip() (+3 more)

### Community 18 - "test_ai_phase4_job_and_challan.py"
Cohesion: 0.04
Nodes (47): build_hc_preview_card(), handle_conversational_hc_booking(), validate_and_update_hc_draft(), build_job_preview_card(), handle_conversational_job_booking(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party() (+39 more)

### Community 19 - "general-invoice/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 20 - "general/router.py"
Cohesion: 0.16
Nodes (29): delete_billing_client(), delete_consignee(), delete_consigner(), delete_designation(), delete_group_company(), delete_industry(), delete_load_type(), delete_location() (+21 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.19
Nodes (11): check_series_status(), compute_series_display_data(), ensure_series_table_schema(), format_series_number(), get_manual_series_ranges(), get_real_voucher_usage(), initialize_all_standard_series(), set_default_series() (+3 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.07
Nodes (43): chat_with_copilot(), get_blocked_delete_message(), get_bulk_pii_refusal_message(), get_capabilities_list_markdown(), is_bulk_pii_request(), ChatMessage, ChatRequest, anyio_backend() (+35 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (141): BillingClientItem, LedgerEntry, VoucherRecord, BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord (+133 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.07
Nodes (45): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+37 more)

### Community 25 - "build_system_prompt"
Cohesion: 0.11
Nodes (13): build_system_prompt(), format_page_registry_entry(), get_page_registry_entry(), parse_page_context(), resolve_navigation_suggestions(), build_page_help_response(), get_greeting_response(), get_page_awareness_response() (+5 more)

### Community 26 - "payment-voucher/page.tsx"
Cohesion: 0.05
Nodes (32): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+24 more)

### Community 27 - "TestSIMTrackingWallet"
Cohesion: 0.10
Nodes (8): resolve_freight_tiger_token(), SIMTripResponse, check_and_deduct_sim_credit(), check_sim_wallet_balance(), create_sim_trip(), SIMTripRecord, SimWalletTransaction, TestSIMTrackingWallet

### Community 28 - "typing"
Cohesion: 0.11
Nodes (16): close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), run_migration(), run_migration(), run_migration(), run_migration() (+8 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.05
Nodes (38): allocate_or_validate_voucher_number(), extract_sequence_number(), get_all_used_numbers_for_doc(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header() (+30 more)

### Community 31 - "_format_sim_trip"
Cohesion: 0.15
Nodes (10): set_default_company_bank_account(), toggle_company_bank_account_status(), add_sim_trip_comment(), close_sim_trip(), _format_sim_trip(), simulate_sim_consent(), start_sim_tracking(), sync_sim_trip() (+2 more)

### Community 32 - "misc/router.py"
Cohesion: 0.05
Nodes (105): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+97 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.11
Nodes (29): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+21 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.09
Nodes (38): ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, BranchUpdate, ChangePasswordRequest (+30 more)

### Community 35 - "settings/router.py"
Cohesion: 0.14
Nodes (35): map_user_to_list_item(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem, AdminSettingResponse, AdminSettingsBulkUpdate (+27 more)

### Community 36 - "tenant_db/models.py"
Cohesion: 0.03
Nodes (116): get_or_create_party_account(), CompanyBankAccountResponse, ContraAccountItem, ContraVoucherCreate, EligibleInvoiceItem, JournalEntryLineCreate, JournalVoucherCreate, OpenBillItem (+108 more)

### Community 37 - "pytest"
Cohesion: 0.04
Nodes (29): AIDraft, test_accounts_double_entry_reconciliation_and_void(), anyio_backend(), assert_strict_isolation_guards(), get_pg_url(), test_real_postgres_cross_tenant_isolation(), test_real_postgres_hire_challan_financial_precision(), test_real_postgres_job_creation() (+21 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.10
Nodes (29): build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest, OfficeSummary (+21 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.16
Nodes (36): sanitize_ft_base_url(), get_gst_pan_client(), ApiCenterSettingResponse, TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch() (+28 more)

### Community 40 - "settings/service.py"
Cohesion: 0.10
Nodes (29): list_admin_settings(), list_staff_recipients(), create_new_role(), create_new_user(), create_series_category(), create_staff_recipient(), delete_existing_role(), delete_series_category() (+21 more)

### Community 41 - "tenancy.py"
Cohesion: 0.14
Nodes (7): TenantInactiveException, get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), _verify_tenant_active(), get_current_tenant()

### Community 42 - "control/service.py"
Cohesion: 0.11
Nodes (31): PlatformAdmin, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete() (+23 more)

### Community 43 - "reports/service.py"
Cohesion: 0.06
Nodes (79): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+71 more)

### Community 44 - "test_transport_invoice_voucher_e2e.py"
Cohesion: 0.30
Nodes (7): TransportInvoiceCreate, create_transport_invoice_from_lr(), test_gta_rcm_transport_invoice(), test_inter_state_transport_invoice_and_bill_wise_receipts(), test_intra_state_transport_invoice_fcm(), test_unbilled_and_invoice_register_reports(), test_voiding_protection_and_reversal()

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.05
Nodes (51): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate (+43 more)

### Community 46 - "normal-purchase/page.tsx"
Cohesion: 0.05
Nodes (29): BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption, VoucherRecord (+21 more)

### Community 47 - "httpx"
Cohesion: 0.13
Nodes (11): _call_groq(), call_llm(), _call_nvidia(), _call_openai(), _is_valid_key(), sanitize_ai_response(), _stream_groq(), stream_llm() (+3 more)

### Community 48 - "sanitize_chat_history_for_external_llm"
Cohesion: 0.12
Nodes (8): anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), build_human_handoff_response(), filter_nav_suggestions(), _log_ai_turn(), test_gemini_structural_privacy_anonymization(), test_privacy_boundary_pii_sanitization()

### Community 49 - "tools.py"
Cohesion: 0.07
Nodes (32): stream_chat_with_copilot(), execute_accounting_tool(), execute_branch_tool(), execute_client_tool(), execute_consigner_consignee_tool(), execute_driver_tool(), execute_einvoice_tool(), execute_eway_bill_tool() (+24 more)

### Community 50 - "TestFASTagTracking"
Cohesion: 0.09
Nodes (13): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse, FastagTripCreate (+5 more)

### Community 51 - "PantherKnowledgeEngine"
Cohesion: 0.17
Nodes (3): PantherKnowledgeEngine, rewrite_followup_query(), test_rag_engine_retrieves_new_chunks()

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.21
Nodes (5): update_company(), CompanySettingUpdate, EmailSettingUpdate, update_company_setting(), CompanySetting

### Community 54 - "lr-register/page.tsx"
Cohesion: 0.23
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, CustomerOption, formatDateDisplay(), formatLocation(), formatOfficeName(), getDefaultFinancialYearDates(), LRRegisterPage() (+2 more)

### Community 55 - "AsyncSession"
Cohesion: 0.19
Nodes (20): create_role(), create_series_category(), create_series_master(), create_staff_recipient(), create_user(), delete_role(), delete_series_category(), delete_series_master() (+12 more)

### Community 56 - "classify_intent_and_entities"
Cohesion: 0.13
Nodes (9): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, test_job_creation_routed_to_how_to_guide() (+1 more)

### Community 57 - "get_master_ledger_summary"
Cohesion: 0.18
Nodes (10): get_master_ledger_summary(), list_billing_client_ledgers(), list_company_bank_account_ledgers(), list_driver_ledgers(), list_vendor_ledgers(), CategoryOverviewStat, MasterLedgerOverviewResponse, test_preexisting_unlinked_creditor_auto_sync() (+2 more)

### Community 58 - "BaseModel"
Cohesion: 0.04
Nodes (84): list_duties_and_taxes_ledgers(), list_staff_imprest_ledgers(), verify_and_heal_chart_of_accounts(), ATHPaymentCreate, BankStatementImportResponse, BankStatementLineResponse, BillAllocationResponse, BillingClientLedgerListItem (+76 more)

### Community 59 - "get_vendor_ledger_detail"
Cohesion: 0.25
Nodes (10): get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_staff_imprest_ledger_detail(), get_vendor_ledger_detail(), DetailedLedgerResponse (+2 more)

### Community 60 - "update_email_settings"
Cohesion: 0.20
Nodes (6): get_email_settings(), update_email_settings(), EmailSettingUpdate, get_email_setting(), update_email_setting(), EmailSetting

### Community 61 - "test_gps_tracking.py"
Cohesion: 0.10
Nodes (20): clean_vehicle_number(), GPSConfigResponse, GPSFleetCounts, GPSFleetResponse, GPSTrackResponse, GPSTripInfo, GPSVehicleItem, extract_location_text() (+12 more)

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "PageHeader"
Cohesion: 0.05
Nodes (118): CompanyBankAccountsPage(), ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry, numberToWords(), VoucherRecord, CreditDebitNotesPage() (+110 more)

### Community 67 - "signup/page.tsx"
Cohesion: 0.19
Nodes (13): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+5 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "AsyncSession"
Cohesion: 0.13
Nodes (11): get_permissions_schema(), check_series(), get_activity_filters(), get_activity_stats(), get_manual_series_ranges(), get_permissions_schema_endpoint(), list_activity_logs(), list_roles() (+3 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.09
Nodes (26): get_current_company_admin(), require_permission(), _check_permission(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission(), _check() (+18 more)

### Community 73 - "formatCurrency"
Cohesion: 0.04
Nodes (94): ActivityLog, ActivityStats, FilterOptions, UserActivityLogPage(), SeriesCategoryItem, SeriesMasterItem, STANDARD_VOUCHERS, Consignment360Content() (+86 more)

### Community 75 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 84 - "errors.py"
Cohesion: 0.12
Nodes (13): _cors_headers_for_request(), DuplicateResourceException, EntitlementLockedException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler() (+5 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

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

### Community 99 - "test_phase6_exit_criteria.py"
Cohesion: 0.22
Nodes (5): test_phase6_paid_signup_and_razorpay_webhook_lifecycle(), test_phase6_plan_definitions_and_control_plane(), test_phase6_profile_module_and_monthly_pnl(), test_phase6_self_serve_free_signup_and_entitlement_lock(), test_phase6_settings_module_and_audit_trail()

### Community 100 - "tracking/fastag/page.tsx"
Cohesion: 0.22
Nodes (11): FastagTripSummary, LRSummary, computePathDistanceKm(), FastagMap(), FastagMapProps, geocodeCache, getHaversineDistanceKm(), MARKER_COLORS (+3 more)

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 104 - "hc-register/page.tsx"
Cohesion: 0.24
Nodes (9): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+1 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 183 - "main.py"
Cohesion: 0.09
Nodes (12): seed_plans_and_entitlements(), CacheControlMiddleware, health_check(), lifespan(), normalize_tenant_locations_background(), preflight_handler(), root(), seed_demo() (+4 more)

### Community 186 - "StructuredCard"
Cohesion: 0.09
Nodes (30): build_add_vehicle_driver_response(), build_how_to_lr_response(), get_job_guide_response(), get_lr_explanation_markdown(), get_lr_guide_response(), get_safe_general_or_refusal_response(), get_tms_guidance_response(), get_tms_navigation_response() (+22 more)

### Community 200 - "email_service.py"
Cohesion: 0.19
Nodes (4): send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 207 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 208 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 210 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 213 - "detect_language"
Cohesion: 0.14
Nodes (8): detect_language(), detect_language_with_history(), test_language_detection_english(), test_language_detection_hindi_devanagari(), test_language_detection_hinglish(), test_english_50_cases_intent_and_slots(), test_hindi_hinglish_16_cases(), test_unseen_20_paraphrases()

### Community 214 - "put"
Cohesion: 0.15
Nodes (12): update_designation(), update_group_company(), update_industry(), update_location(), update_packing_method(), update_unit(), DesignationUpdate, GroupCompanyUpdate (+4 more)

### Community 216 - "output_guards.py"
Cohesion: 0.24
Nodes (5): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), guard_llm_reply(), _norm()

### Community 217 - "get_consignment_360"
Cohesion: 0.33
Nodes (7): _build_search_variants(), _fmt_city(), _fmt_date(), _fmt_money(), _fmt_name(), get_consignment_360(), search_consignment_360_suggestions()

### Community 220 - "test_tenancy.py"
Cohesion: 0.28
Nodes (6): generate_tenant_id(), sanitize_company_code(), test_generate_tenant_id(), test_get_tenant_id_from_headers(), test_sanitize_company_code(), test_tenant_engine_isolation()

### Community 221 - "KnowledgeChunk"
Cohesion: 0.29
Nodes (4): _dynamic_navigation_chunks(), KnowledgeChunk, sanitize_chunk_text(), _tms_knowledge_chunks()

### Community 222 - "get_active_lr_draft"
Cohesion: 0.25
Nodes (3): get_active_lr_draft(), get_ai_tenant_db(), log_blocked_rbac_attempt()

### Community 223 - "LoadType"
Cohesion: 0.25
Nodes (7): update_load_type(), LoadTypeUpdate, delete_load_type(), get_load_type(), list_load_types(), update_load_type(), LoadType

### Community 224 - "test_company_vehicle_master_ledger_listing_and_summary"
Cohesion: 0.40
Nodes (3): list_company_vehicle_ledgers(), test_company_vehicle_automatic_ledger_creation(), test_company_vehicle_master_ledger_listing_and_summary()

### Community 225 - "get_all_tenant_db_names"
Cohesion: 0.33
Nodes (3): get_all_tenant_db_names(), rollback_migration(), run_migration()

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1675 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **124 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `SIM & Telecom Tracking Integration` to `Tenant`, `Any`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `test_ai_perfect_tms_enhancements.py`, `Branch`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `test_issuing_office_system.py`, `test_ai_phase4_job_and_challan.py`, `general/router.py`, `chat_with_copilot`, `general/schemas.py`, `home/service.py`, `excel_import.py`, `_format_sim_trip`, `misc/router.py`, `Transport Registers & Operations Reports`, `settings/router.py`, `tenant_db/models.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `sanitize_chat_history_for_external_llm`, `tools.py`, `CompanySetting`, `AsyncSession`, `get_master_ledger_summary`, `StructuredCard`, `update_email_settings`, `AsyncSession`, `test_activity_audit_log_system.py`, `put`, `get_active_lr_draft`, `LoadType`, `discard_active_lr_draft`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Are the 373 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 373 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tenant` be split into smaller, more focused modules?**
  _Cohesion score 0.05980861244019139 - nodes in this community are weakly interconnected._
- **Why does `Branch` connect `Branch` to `Tenant`, `Any`, `SIM & Telecom Tracking Integration`, `bank_statement_service.py`, `test_ai_perfect_tms_enhancements.py`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `test_issuing_office_system.py`, `test_ai_phase4_job_and_challan.py`, `general/router.py`, `allocate_or_validate_voucher_number`, `chat_with_copilot`, `general/schemas.py`, `home/service.py`, `excel_import.py`, `Transport Registers & Operations Reports`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `tenant_db/models.py`, `pytest`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `reports/service.py`, `test_transport_invoice_voucher_e2e.py`, `test_general_invoice_voucher_e2e.py`, `tools.py`, `CompanySetting`, `AsyncSession`, `get_master_ledger_summary`, `StructuredCard`, `AsyncSession`, `test_activity_audit_log_system.py`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 187 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 187 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10931174089068826 - nodes in this community are weakly interconnected._