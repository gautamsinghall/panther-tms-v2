# Graph Report - panther-tms-v2  (2026-11-24)

## Corpus Check
- 436 files · ~686,060 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4780 nodes · 18955 edges · 216 communities (102 shown, 114 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 1945 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `573745f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lr_draft_service.py
- control/service.py
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
- tenancy.py
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- hire-challan/page.tsx
- receipt-voucher/page.tsx
- general/router.py
- allocate_or_validate_voucher_number
- ChatMessage
- toast.ts
- general/schemas.py
- transport/schemas.py
- errors.py
- accounts/schemas.py
- typing
- GST E-Invoicing & IRN Generation (3)
- test_lr_excel_import.py
- test_job_origin_destination.py
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
- package.json
- rag.py
- test_lr_excel_import.py
- Client Component Flow
- CompanySetting
- PageHeader
- log_user_activity
- ai/router.py
- lr-booking/page.tsx
- test_company_vehicle_automatic_ledger_creation
- Branch
- test_voucher_edit_e2e.py
- dependencies
- statements/service.py
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- test_auth.py
- SeriesMaster
- normal-purchase/page.tsx
- Client Component Flow (2)
- AsyncSession
- Client Component Flow (3)
- test_activity_audit_log_system.py
- getStoredAuth
- GSPProviderInterface
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- TestSIMTrackingWallet
- gps-tracking-map.tsx
- RedisDraftBackend
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- AIDraftStore
- AsyncSession
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- toast-provider.tsx
- journal-voucher/page.tsx
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- BaseDraftBackend
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
- master-ledger/page.tsx
- scripts
- test_live_api.py
- get_current_office
- Any
- output_guards.py
- tailwindcss
- InMemoryDraftBackend
- get_consignment_360
- SeriesCategory
- update_admin_settings
- email_service.py
- update_email_settings
- theme-context.tsx
- navigation.py
- discard_active_lr_draft
- normalize_val

## God Nodes (most connected - your core abstractions)
1. `User` - 546 edges
2. `Tenant` - 258 edges
3. `Branch` - 226 edges
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
- `normalize_tenant_locations_background()` --indirect_call--> `session()`  [INFERRED]
  backend/app/main.py → backend/tests/test_vendor_scan_issues.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (216 total, 114 thin omitted)

### Community 0 - "lr_draft_service.py"
Cohesion: 0.05
Nodes (31): clean_party_name(), extract_booking_entities_via_llm(), handle_conversational_lr_booking(), is_cancel_intent(), is_grounded_in_text(), is_instructional_inquiry(), is_lr_booking_intent(), is_valid_indian_vehicle() (+23 more)

### Community 1 - "control/service.py"
Cohesion: 0.11
Nodes (30): WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete(), signup_initiate() (+22 more)

### Community 2 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.10
Nodes (24): PaymentAllocationItem, PaymentVoucherCreate, PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, create_payment_voucher(), create_purchase_bill(), test_purchase_credit_note_records_additional_supplier_charge() (+16 more)

### Community 3 - "Button"
Cohesion: 0.04
Nodes (71): ApiCenterData, DLApiPage(), TaxCounterData, TaxTransactionItem, ApiCenterData, EWayBillApiPage(), FastagApiPage(), FastagWalletData (+63 more)

### Community 4 - "getStoredAuth"
Cohesion: 0.04
Nodes (75): DashboardLayout(), WorkspaceCanvas(), ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId() (+67 more)

### Community 5 - "SIM & Telecom Tracking Integration"
Cohesion: 0.04
Nodes (84): add_sim_trip_comment(), auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_lr_response(), close_sim_trip(), create_arrival_report(), create_company_vehicle(), create_driver() (+76 more)

### Community 6 - "cn"
Cohesion: 0.05
Nodes (64): ActiveTab, DashboardPage(), FunnelRow(), MetricKpiCard(), MetricKpiProps, ActivityLog, ActivityStats, FilterOptions (+56 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.06
Nodes (89): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+81 more)

### Community 8 - "Misc Accounting Groups & Categories"
Cohesion: 0.05
Nodes (101): create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category(), delete_account() (+93 more)

### Community 9 - "sqlalchemy_ext_asyncio"
Cohesion: 0.07
Nodes (46): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+38 more)

### Community 10 - "User"
Cohesion: 0.04
Nodes (66): Plan, Tenant, get_authorized_navigation_catalog(), get_ai_tenant_db(), classify_operational_intent(), anyio_backend(), copilot_env(), test_api_chat_endpoint_live_mock_response() (+58 more)

### Community 11 - "transport/service.py"
Cohesion: 0.05
Nodes (73): AppException, add_sim_trip_comment(), auto_sync_all_in_transit_fastag(), check_and_deduct_fastag_credit(), check_and_deduct_sim_credit(), close_sim_trip(), create_arrival_report(), create_company_vehicle() (+65 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.06
Nodes (60): check_entitlement_limit(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint(), create_general_invoice_endpoint(), create_general_invoice_payment() (+52 more)

### Community 13 - "AsyncSession"
Cohesion: 0.14
Nodes (30): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+22 more)

### Community 14 - "tenancy.py"
Cohesion: 0.11
Nodes (15): TenantInactiveException, TenantNotFoundException, generate_tenant_id(), get_tenant_by_company_code(), get_tenant_by_id(), get_tenant_id_from_request(), invalidate_tenant_cache(), sanitize_company_code() (+7 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.26
Nodes (14): get_all_lrs(), UserOfficeAssignment, test_accounting_voucher_office_scoping(), test_api_tampering_and_cross_office_forbidden(), test_cross_office_data_isolation(), test_legacy_data_coexistence(), test_lr_creation_office_scoping(), test_lr_print_master_data_resolution() (+6 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (68): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+60 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.11
Nodes (7): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, TestSimOperatorAndRealData, TestSIMTrackingFreightTiger

### Community 18 - "hire-challan/page.tsx"
Cohesion: 0.13
Nodes (15): BranchOption, ChargeHeadOption, DEFAULT_CHARGE_HEADS, DriverOption, ExpenseItem, HireChallanRecord, LocationOption, LROption (+7 more)

### Community 19 - "receipt-voucher/page.tsx"
Cohesion: 0.06
Nodes (34): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+26 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "allocate_or_validate_voucher_number"
Cohesion: 0.16
Nodes (15): allocate_or_validate_voucher_number(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc(), get_manual_series_ranges() (+7 more)

### Community 22 - "ChatMessage"
Cohesion: 0.04
Nodes (71): chat_with_copilot(), get_active_lr_draft(), get_blocked_delete_message(), get_bulk_pii_refusal_message(), log_blocked_rbac_attempt(), stream_chat_with_copilot(), ChatMessage, ChatRequest (+63 more)

### Community 23 - "toast.ts"
Cohesion: 0.04
Nodes (148): BillingClientItem, LedgerEntry, VoucherRecord, EInvoiceRecord, TaxpayerDetails, FleetDoc, ServiceRecord, TripAdvance (+140 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (44): BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase (+36 more)

### Community 25 - "transport/schemas.py"
Cohesion: 0.07
Nodes (53): ArrivalReportBase, ArrivalReportCreate, CompanyVehicleBase, CompanyVehicleCreate, CompanyVehicleResponse, CompanyVehicleUpdate, Consignment360Response, Consignment360SearchResult (+45 more)

### Community 26 - "errors.py"
Cohesion: 0.13
Nodes (11): _cors_headers_for_request(), DuplicateResourceException, InternalServerException, RateLimitException, register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler() (+3 more)

### Community 27 - "accounts/schemas.py"
Cohesion: 0.07
Nodes (50): ATHPaymentCreate, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, CategoryOverviewStat, CompanyBankAccountBase, CompanyBankAccountLedgerListItem, CompanyBankAccountUpdate (+42 more)

### Community 28 - "typing"
Cohesion: 0.07
Nodes (26): PlatformAdmin, seed_plans_and_entitlements(), close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check(), lifespan() (+18 more)

### Community 29 - "GST E-Invoicing & IRN Generation (3)"
Cohesion: 0.14
Nodes (18): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+10 more)

### Community 30 - "test_lr_excel_import.py"
Cohesion: 0.16
Nodes (13): generate_job_import_template(), generate_lr_import_template(), import_lrs_from_excel(), create_sample_lr_excel(), test_db(), test_lr_import_chronological_ordering_and_job_autocreation(), test_lr_import_continues_from_last_series_count(), test_lr_import_date_and_numeric_exceptions() (+5 more)

### Community 31 - "test_job_origin_destination.py"
Cohesion: 0.13
Nodes (19): _build_job_response(), create_job(), update_job(), JobBase, JobCreate, JobResponse, JobUpdate, LRBase (+11 more)

### Community 32 - "Multi-Tenant Auth & Permissions"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.09
Nodes (27): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series() (+19 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.09
Nodes (38): ApiCenterSettingResponse, ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, BranchUpdate (+30 more)

### Community 35 - "settings/router.py"
Cohesion: 0.13
Nodes (36): create_role(), map_user_to_list_item(), test_email_gateway(), update_role(), update_user(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse (+28 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.06
Nodes (54): CompanyBankAccountCreate, CompanyBankAccountResponse, TransportInvoiceCreate, VoucherCreate, calculate_bank_account_balance(), check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+46 more)

### Community 37 - "test_ai_real_postgres_redis.py"
Cohesion: 0.03
Nodes (32): compute_canonical_hash(), _call_groq(), call_llm(), _call_nvidia(), _call_openai(), is_provider_configured(), _is_valid_key(), sanitize_ai_response() (+24 more)

### Community 38 - "Multi-Tenant Auth & Permissions (2)"
Cohesion: 0.14
Nodes (19): get_current_user(), build_user_navigation(), get_me(), get_user_navigation(), login(), logout(), refresh_token(), LoginRequest (+11 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.16
Nodes (34): resolve_freight_tiger_token(), sanitize_ft_base_url(), get_gst_pan_client(), TaxApiCounterResponse, TaxApiTransactionItem, check_and_deduct_tax_credit(), create_branch(), delete_branch() (+26 more)

### Community 40 - "settings/service.py"
Cohesion: 0.12
Nodes (20): create_staff_recipient(), delete_staff_recipient(), _ensure_email_tables_exist(), _format_recipient_response(), get_activity_filters_service(), get_activity_logs(), get_admin_settings(), get_all_roles() (+12 more)

### Community 41 - "FASTag Toll & Tracking Service (8)"
Cohesion: 0.10
Nodes (5): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), TestFASTagTracking

### Community 43 - "reports/service.py"
Cohesion: 0.10
Nodes (50): download_export_file(), get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_export_job_status(), get_profit_and_loss(), get_purchase_register() (+42 more)

### Community 44 - "test_gps_tracking.py"
Cohesion: 0.10
Nodes (19): clean_vehicle_number(), GPSConfigResponse, GPSFleetCounts, GPSFleetResponse, GPSTrackResponse, GPSTripInfo, GPSVehicleItem, extract_location_text() (+11 more)

### Community 45 - "test_general_invoice_voucher_e2e.py"
Cohesion: 0.11
Nodes (25): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAgainstInvoiceCreate, ReceiptAllocationItem, ReceiptVoucherCreate, create_general_invoice(), test_commercial_note_without_gst_adjustment() (+17 more)

### Community 46 - "StructuredCard"
Cohesion: 0.11
Nodes (27): _build_hc_idempotent_response(), _build_job_idempotent_response(), _build_lr_idempotent_response(), handle_record_prefill_intent(), ChatResponse, HireChallanConfirmationResponse, JobConfirmationResponse, LRConfirmationResponse (+19 more)

### Community 47 - "test_auto_create_job_on_lr.py"
Cohesion: 0.11
Nodes (13): LRCreate, create_lr(), Job, test_manual_lr_creation_service_unaffected(), test_manual_transport_workflows_regression(), test_auto_create_job_when_lr_has_no_job(), test_job_listing_shows_linked_lr_and_vehicle(), test_lr_created_with_existing_job_does_not_create_new_job() (+5 more)

### Community 48 - "state-select.tsx"
Cohesion: 0.18
Nodes (12): BranchItem, IssuingOfficesPage(), ProfileBranchRedirect(), CountrySelect(), GstinInput(), StateSelect(), StateSelectProps, ALL_INDIAN_STATES_AND_UT (+4 more)

### Community 49 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 50 - "rag.py"
Cohesion: 0.11
Nodes (7): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, rewrite_followup_query(), sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 51 - "test_lr_excel_import.py"
Cohesion: 0.25
Nodes (8): get_all_jobs(), create_sample_excel(), test_db(), test_import_jobs_hq_vs_branch(), test_job_import_chronological_ordering_and_duplicates(), test_job_import_date_and_numeric_exceptions(), test_job_import_missing_mandatory_headers(), test_job_excel_template_and_deduplicated_import()

### Community 52 - "Client Component Flow"
Cohesion: 0.17
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.15
Nodes (8): update_company(), CompanySettingUpdate, EmailSettingUpdate, get_email_setting(), update_company_setting(), update_email_setting(), CompanySetting, EmailSetting

### Community 54 - "PageHeader"
Cohesion: 0.05
Nodes (109): Branch, CompanyBankAccount, CompanyBankAccountsPage(), INDIAN_BANKS, ContraAccountOption, ContraType, ContraVoucherPage(), LedgerEntry (+101 more)

### Community 55 - "log_user_activity"
Cohesion: 0.21
Nodes (11): create_user(), delete_role(), delete_series_category(), delete_series_master(), delete_staff_recipient(), UserCreate, create_new_user(), delete_existing_role() (+3 more)

### Community 56 - "ai/router.py"
Cohesion: 0.02
Nodes (83): is_hc_cancel_intent(), is_hire_challan_intent(), is_instructional_hc_inquiry(), classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots() (+75 more)

### Community 57 - "lr-booking/page.tsx"
Cohesion: 0.05
Nodes (46): BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption, VoucherRecord (+38 more)

### Community 59 - "Branch"
Cohesion: 0.03
Nodes (103): _matches_permission(), Entitlement, QuotaExceededException, AIDraft, build_hc_preview_card(), handle_conversational_hc_booking(), normalize_vehicle_number(), parse_hc_entities_from_text() (+95 more)

### Community 61 - "test_voucher_edit_e2e.py"
Cohesion: 0.12
Nodes (19): ContraVoucherCreate, VoidVoucherRequest, create_contra_voucher(), void_voucher(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_bank_deposit(), test_cash_to_cash_internal_transfer() (+11 more)

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 63 - "statements/service.py"
Cohesion: 0.24
Nodes (21): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+13 more)

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "test_auth.py"
Cohesion: 0.23
Nodes (12): create_access_token(), create_refresh_token(), decode_token(), get_password_hash(), verify_password(), change_password(), test_demo_admin_auto_reactivation_on_login(), test_jwt_token_payload_and_tenant_isolation() (+4 more)

### Community 67 - "SeriesMaster"
Cohesion: 0.08
Nodes (12): SeriesMaster, TaxCategory, test_session(), e2e_session(), e2e_session(), e2e_session(), journal_session(), hier_session() (+4 more)

### Community 68 - "normal-purchase/page.tsx"
Cohesion: 0.12
Nodes (18): BillAllocationItem, BillingClientRecord, DEFAULT_TAX_CATEGORIES, INDIAN_STATES, LedgerEntry, SeriesRangeItem, ServiceLineInput, TaxCategoryRecord (+10 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.24
Nodes (5): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob()

### Community 70 - "AsyncSession"
Cohesion: 0.14
Nodes (18): check_series(), create_staff_recipient(), get_activity_filters(), get_activity_stats(), get_email_settings(), get_manual_series_ranges(), import_default_series_template(), initialize_standard_series() (+10 more)

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.22
Nodes (4): flatten_rc_payload(), get_rc_client(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.12
Nodes (23): get_current_company_admin(), require_permission(), _check_permission(), EntitlementLockedException, ForbiddenException, require_accounts_permission(), _check(), BillingClientResponse (+15 more)

### Community 73 - "getStoredAuth"
Cohesion: 0.03
Nodes (105): LoginPage(), PlanOption, PLANS, SignupPage(), BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem (+97 more)

### Community 76 - "Docker Compose.Yml Component Flow"
Cohesion: 0.18
Nodes (14): interval, retries, test, timeout, healthcheck, command, container_name, healthcheck (+6 more)

### Community 77 - "AI Hire Challan Service (3)"
Cohesion: 0.14
Nodes (14): Glossary: FTL vs LTL / Part-Load Operations, Glossary: LR (Lorry Receipt), GR and Bilty, Glossary: Trip Manifest & Consignment List, Glossary: Proof of Delivery (POD) & ePOD, Glossary: POD vs Delivery Status Updates, Transport Core Chain (Job -> LR -> HireChallan -> Trip -> POD -> Invoice), Phase 2: Transport Module Core Operations, Phase 7: AI Knowledge Base Foundation (+6 more)

### Community 78 - "TestSIMTrackingWallet"
Cohesion: 0.14
Nodes (3): check_sim_wallet_balance(), SimWalletTransaction, TestSIMTrackingWallet

### Community 79 - "gps-tracking-map.tsx"
Cohesion: 0.22
Nodes (13): buildFleetVehicleMarkerHtml(), buildSelectedTruckMarkerHtml(), DARK_MAP_STYLE, decodeOSRMPolyline(), fetchOSRMRoute(), geocodeWaypoint(), GPSTrackingMap(), GPSTrackingMapProps (+5 more)

### Community 84 - "AsyncSession"
Cohesion: 0.36
Nodes (8): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return(), get_tenant_db()

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

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

### Community 103 - "excel_import.py"
Cohesion: 0.16
Nodes (7): import_jobs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location(), test_resolve_location_autocreate_when_missing(), test_resolve_location_city_state_pincode()

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 181 - "master-ledger/page.tsx"
Cohesion: 0.14
Nodes (13): BillingClientLedgerItem, CategoryStat, CompanyBankAccountLedgerItem, CompanyVehicleLedgerItem, DetailedLedgerData, DriverLedgerItem, DutiesAndTaxesLedgerItem, HierarchyOverviewStat (+5 more)

### Community 182 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 186 - "output_guards.py"
Cohesion: 0.24
Nodes (5): extract_claim_tokens(), find_ungrounded_claims(), find_ungrounded_ids(), guard_llm_reply(), _norm()

### Community 187 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 189 - "get_consignment_360"
Cohesion: 0.33
Nodes (7): _build_search_variants(), _fmt_city(), _fmt_date(), _fmt_money(), _fmt_name(), get_consignment_360(), search_consignment_360_suggestions()

### Community 195 - "SeriesCategory"
Cohesion: 0.28
Nodes (8): create_series_category(), create_series_master(), SeriesCategoryCreate, SeriesMasterCreate, create_series_category(), create_series_master(), get_all_series_categories(), SeriesCategory

### Community 199 - "update_admin_settings"
Cohesion: 0.28
Nodes (8): update_admin_settings(), update_series_category(), update_series_master(), update_staff_recipient(), SeriesCategoryUpdate, SeriesMasterUpdate, update_series_category(), update_series_master()

### Community 203 - "update_email_settings"
Cohesion: 0.33
Nodes (3): update_email_settings(), EmailSettingUpdate, update_email_setting()

### Community 204 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1602 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **114 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `lr_draft_service.py`, `control/service.py`, `SIM & Telecom Tracking Integration`, `Fleet & Vehicle Maintenance Operations`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `User`, `AsyncSession`, `test_issuing_office_system.py`, `general/router.py`, `ChatMessage`, `accounts/schemas.py`, `test_lr_excel_import.py`, `test_job_origin_destination.py`, `Multi-Tenant Auth & Permissions`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `reports/service.py`, `StructuredCard`, `test_lr_excel_import.py`, `CompanySetting`, `log_user_activity`, `get_current_office`, `ai/router.py`, `Branch`, `test_auth.py`, `SeriesCategory`, `AsyncSession`, `update_admin_settings`, `test_activity_audit_log_system.py`, `update_email_settings`, `navigation.py`, `discard_active_lr_draft`, `AsyncSession`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Are the 370 inferred relationships involving `User` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`User` has 370 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lr_draft_service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05267778753292362 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `User` to `lr_draft_service.py`, `control/service.py`, `SIM & Telecom Tracking Integration`, `Misc Accounting Groups & Categories`, `sqlalchemy_ext_asyncio`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `tenancy.py`, `general/router.py`, `ChatMessage`, `transport/schemas.py`, `typing`, `FASTag Toll & Tracking Service (6)`, `settings/router.py`, `Multi-Tenant Auth & Permissions (2)`, `FASTag Toll & Tracking Service (7)`, `FASTag Toll & Tracking Service (8)`, `reports/service.py`, `StructuredCard`, `log_user_activity`, `ai/router.py`, `Branch`, `test_auth.py`, `TestSIMTrackingWallet`, `discard_active_lr_draft`, `AsyncSession`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 130 inferred relationships involving `Tenant` (e.g. with `get_me()` and `get_user_navigation()`) actually correct?**
  _`Tenant` has 130 INFERRED edges - model-reasoned connections that need verification._
- **Should `control/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11436170212765957 - nodes in this community are weakly interconnected._