# Graph Report - panther-tms-v2  (2026-11-26)

## Corpus Check
- 443 files · ~713,074 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 7, .example 2, .ini 2)

## Summary
- 4960 nodes · 19832 edges · 221 communities (108 shown, 113 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 2330 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc6e7ee0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Branch
- einvoicing/service.py
- sqlalchemy
- PageHeader
- react
- transport/router.py
- utils.ts
- Fleet & Vehicle Maintenance Operations
- bank_statement_service.py
- test_ai_perfect_tms_enhancements.py
- pytest
- transport/service.py
- Accounts Voucher & Banking System (2)
- AsyncSession
- typed_tools.py
- test_issuing_office_system.py
- General Consignor & Consignee Masters
- FreightTigerClient
- TestFASTagTracking
- test_contra_voucher_e2e.py
- general/router.py
- SeriesMaster
- chat_with_copilot
- toast.ts
- general/schemas.py
- signup/page.tsx
- payment-voucher/page.tsx
- test_gps_tracking.py
- datetime
- home/service.py
- excel_import.py
- lr-register/page.tsx
- misc/router.py
- Transport Registers & Operations Reports
- FASTag Toll & Tracking Service (6)
- settings/router.py
- accounts/service.py
- test_ai_phase4_job_and_challan.py
- auth/service.py
- FASTag Toll & Tracking Service (7)
- settings/service.py
- sidebar.tsx
- control/service.py
- reports/service.py
- panther-ai-panel.tsx
- create_general_invoice
- test_purchase_register_voucher_e2e.py
- daybook/page.tsx
- GSPProviderInterface
- Tenant
- general-invoice/page.tsx
- job_draft_service.py
- Client Component Flow
- CompanySetting
- tracking/sim/page.tsx
- log_user_activity
- get
- statements/service.py
- transport/schemas.py
- accounts/schemas.py
- get
- package.json
- dependencies
- Any
- Tsconfig.Json Component Flow
- Components.Json Component Flow
- normal-purchase/page.tsx
- CacheControlMiddleware
- Client Component Flow (2)
- PantherKnowledgeEngine
- Client Component Flow (3)
- test_activity_audit_log_system.py
- apiClient
- uuid
- Docker Compose.Yml Component Flow
- AI Hire Challan Service (3)
- gps-tracking-map.tsx
- Multi-Tenant Auth & Permissions (7)
- Subscription Billing & Control Plane
- test_company_bank_accounts_comprehensive_lifecycle
- Docker Compose.Yml Component Flow (2)
- Docker Compose.Yml Component Flow (3)
- test_ai_real_postgres_redis.py
- test_loading_slip.py
- Docker Compose.Yml Component Flow (4)
- Docker Compose.Yml Component Flow (5)
- Toast Component Flow
- Docker Compose.Yml Component Flow (6)
- Docker Compose.Yml Component Flow (7)
- Docker Compose.Yml Component Flow (8)
- Multi-Tenant Auth & Permissions (9)
- hc-register/page.tsx
- create_role
- Docker Compose.Yml Component Flow (9)
- Multi-Tenant Auth & Permissions (10)
- SIMTripRecord
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
- sales-register/page.tsx
- transport_reports/router.py
- test_live_api.py
- resolve_freight_tiger_token
- update_series_master
- email_service.py
- AsyncSession
- register_error_handlers
- trial-balance/page.tsx
- ai/router.py
- opening-balance/page.tsx
- theme-context.tsx
- scripts
- tailwindcss
- pytest

## God Nodes (most connected - your core abstractions)
1. `User` - 569 edges
2. `Branch` - 282 edges
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
- `get_current_user()` --uses--> `Role`  [INFERRED]
  backend/app/auth/dependencies.py → backend/app/tenant_db/models.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Transport Execution & Billing Flow** — docs_architecture_transport_chain, docs_prd_transport_module, docs_ai_tms_knowledge_base_glossary_lr_gr_bilty, docs_ai_tms_knowledge_base_glossary_pod [EXTRACTED 1.00]

## Communities (221 total, 113 thin omitted)

### Community 0 - "Branch"
Cohesion: 0.08
Nodes (40): Branch, CompanyVehicle, Consignee, Consigner, Driver, EWayBill, FastagCooldown, GroupNature (+32 more)

### Community 1 - "einvoicing/service.py"
Cohesion: 0.14
Nodes (18): get_gsp_provider(), cancel_irn(), generate_irn(), get_einvoice(), get_taxpayer_details(), list_irns(), map_einvoice_response(), CancelIRNRequest (+10 more)

### Community 2 - "sqlalchemy"
Cohesion: 0.09
Nodes (20): close_all_connections(), get_control_db(), get_tenant_engine(), get_tenant_session_maker(), health_check(), lifespan(), normalize_tenant_locations_background(), root() (+12 more)

### Community 3 - "PageHeader"
Cohesion: 0.03
Nodes (145): CompanyBankAccountsPage(), ContraVoucherPage(), numberToWords(), CreditDebitNotesPage(), GeneralInvoicePage(), JournalVouchersPage(), MasterLedgerPage(), AccountsOverviewPage() (+137 more)

### Community 4 - "react"
Cohesion: 0.04
Nodes (70): Branch, CompanyBankAccount, INDIAN_BANKS, AccountItem, AdjustmentTypeMeta, Branch, DEFAULT_ADJUSTMENT_TYPES, JournalLineForm (+62 more)

### Community 5 - "transport/router.py"
Cohesion: 0.04
Nodes (79): auto_sync_fastag_endpoint(), _build_hire_challan_response(), _build_job_response(), _build_loading_slip_response(), _build_lr_response(), create_company_vehicle(), create_driver(), create_fastag_trip_endpoint() (+71 more)

### Community 6 - "utils.ts"
Cohesion: 0.04
Nodes (50): ActivityLog, ActivityStats, FilterOptions, TDSReturnResponse, TDSReturnSectionSummary, CompanyVehicleRecord, CompanyVehiclesPageProps, DriverOption (+42 more)

### Community 7 - "Fleet & Vehicle Maintenance Operations"
Cohesion: 0.05
Nodes (94): create_document(), create_service(), create_trip_advance(), create_trip_expense(), create_tyre(), delete_document(), delete_trip_expense(), delete_tyre() (+86 more)

### Community 8 - "bank_statement_service.py"
Cohesion: 0.07
Nodes (31): answer_line_question(), bulk_confirm_ready_lines(), confirm_and_post_line(), find_bill_allocations_for_party(), get_skipped_entries_report(), ignore_statement_line(), import_and_queue_bank_statement(), map_party_and_reprocess() (+23 more)

### Community 9 - "test_ai_perfect_tms_enhancements.py"
Cohesion: 0.05
Nodes (26): classify_intent_and_entities(), clean_search_term(), extract_indian_vehicle_number(), extract_lr_number(), extract_raw_booking_slots(), extract_vehicle_prefix(), RouterResult, rewrite_followup_query() (+18 more)

### Community 10 - "pytest"
Cohesion: 0.05
Nodes (42): QuotaExceededException, clean_party_name(), handle_conversational_lr_booking(), is_cancel_intent(), resolve_or_create_consignee(), resolve_or_create_consigner(), resolve_or_create_location(), confirm_lr_draft() (+34 more)

### Community 11 - "transport/service.py"
Cohesion: 0.05
Nodes (72): AppException, ResourceNotFoundException, record_tracking_ping(), TrackingPingBase, TrackingPingCreate, TrackingPingResponse, auto_sync_all_in_transit_fastag(), _build_search_variants() (+64 more)

### Community 12 - "Accounts Voucher & Banking System (2)"
Cohesion: 0.05
Nodes (74): check_entitlement_limit(), bulk_confirm_ready_lines_endpoint(), confirm_and_post_statement_line_endpoint(), create_ath_payment(), create_bth_payment(), create_company_bank_account(), create_contra_voucher_endpoint(), create_credit_debit_note_endpoint() (+66 more)

### Community 13 - "AsyncSession"
Cohesion: 0.13
Nodes (31): change_user_password(), create_new_branch(), delete_branch_record(), get_api_center(), get_company(), get_dl_counter(), get_dl_lookup(), get_email() (+23 more)

### Community 14 - "typed_tools.py"
Cohesion: 0.14
Nodes (18): NavigationSuggestion, addConsigneePrompt(), driverBalance(), format_currency(), getHowTo(), getKnowledge(), getLedgerSummary(), getLRFreight() (+10 more)

### Community 15 - "test_issuing_office_system.py"
Cohesion: 0.10
Nodes (28): get_current_company_admin(), get_current_office(), get_user_office_context(), ForbiddenException, require_accounts_permission(), _check(), require_reports_permission(), _check() (+20 more)

### Community 16 - "General Consignor & Consignee Masters"
Cohesion: 0.08
Nodes (68): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+60 more)

### Community 17 - "FreightTigerClient"
Cohesion: 0.11
Nodes (7): detect_telecom_operator(), FreightTigerClient, SIMTripCommentCreate, SIMTripCreate, SIMTripUpdate, TestSimOperatorAndRealData, TestSIMTrackingFreightTiger

### Community 18 - "TestFASTagTracking"
Cohesion: 0.09
Nodes (11): FASTagProviderClient, haversine_distance_km(), parse_reader_read_time(), resolve_location_coordinates(), FastagConfigResponse, FastagTrackingMetrics, FastagTrackResponse, FastagTripCreate (+3 more)

### Community 19 - "test_contra_voucher_e2e.py"
Cohesion: 0.15
Nodes (9): e2e_session(), test_bank_to_bank_transfer_with_charges(), test_bank_to_cash_withdrawal(), test_cash_to_bank_deposit(), test_cash_to_cash_internal_transfer(), test_contra_voiding_reversal(), test_get_contra_eligible_accounts(), test_invalid_account_type_rejection() (+1 more)

### Community 20 - "general/router.py"
Cohesion: 0.10
Nodes (53): create_billing_client(), create_consignee(), create_consigner(), create_designation(), create_group_company(), create_industry(), create_load_type(), create_location() (+45 more)

### Community 21 - "SeriesMaster"
Cohesion: 0.13
Nodes (20): allocate_or_validate_voucher_number(), _auto_provision_automatic_series(), check_series_status(), compute_series_display_data(), ensure_series_table_schema(), extract_sequence_number(), format_series_number(), get_all_used_numbers_for_doc() (+12 more)

### Community 22 - "chat_with_copilot"
Cohesion: 0.05
Nodes (56): anonymize_system_context(), sanitize_chat_history_for_external_llm(), scrub_user_message_pii(), _build_hc_idempotent_response(), chat_with_copilot(), get_ai_status(), get_context_suggestions(), handle_record_prefill_intent() (+48 more)

### Community 23 - "toast.ts"
Cohesion: 0.05
Nodes (127): ContraAccountOption, ContraType, LedgerEntry, VoucherRecord, BillingClientItem, LedgerEntry, VoucherRecord, BranchItem (+119 more)

### Community 24 - "general/schemas.py"
Cohesion: 0.06
Nodes (44): BillingClientBase, BillingClientCreate, BillingClientUpdate, ConsigneeBase, ConsigneeCreate, ConsigneeResponse, ConsigneeUpdate, ConsignerBase (+36 more)

### Community 25 - "signup/page.tsx"
Cohesion: 0.13
Nodes (21): LoginPage(), PlanOption, PLANS, SignupPage(), VideoBackdrop(), VideoBackdropProps, AuthNavbar(), AuthNavbarProps (+13 more)

### Community 26 - "payment-voucher/page.tsx"
Cohesion: 0.05
Nodes (32): AccountOption, AllocationRow, BillAllocationItem, BranchOption, CompanySettingData, DriverOption, HireChallanOption, LedgerEntry (+24 more)

### Community 27 - "test_gps_tracking.py"
Cohesion: 0.10
Nodes (20): clean_vehicle_number(), GPSConfigResponse, GPSFleetCounts, GPSFleetResponse, GPSTrackResponse, GPSTripInfo, GPSVehicleItem, extract_location_text() (+12 more)

### Community 28 - "datetime"
Cohesion: 0.04
Nodes (37): get_current_user(), _matches_permission(), require_permission(), _check_permission(), login(), DuplicateResourceException, EntitlementLockedException, InternalServerException (+29 more)

### Community 29 - "home/service.py"
Cohesion: 0.13
Nodes (30): get_business_overview(), get_financial_analysis(), get_fleet_operations(), get_own_fleet(), get_real_notifications(), ActiveTransitMovement, BusinessOverviewData, CorridorVolume (+22 more)

### Community 30 - "excel_import.py"
Cohesion: 0.07
Nodes (28): generate_job_import_template(), generate_lr_import_template(), import_jobs_from_excel(), import_lrs_from_excel(), _normalize_header(), _normalize_lr_header(), _parse_date(), _resolve_or_create_location() (+20 more)

### Community 31 - "lr-register/page.tsx"
Cohesion: 0.11
Nodes (19): ColumnConfig, formatDateDisplay(), getDefaultFinancialYearDates(), LRClientWiseGroup, LRClientWisePage(), LRClientWiseRecord, MONTH_NAMES, TABLE_COLUMNS (+11 more)

### Community 32 - "misc/router.py"
Cohesion: 0.05
Nodes (107): activate_employee_imprest_endpoint(), create_account(), create_charge_head(), create_employee(), create_group_in_primary(), create_primary_group(), create_subgroup(), create_tax_category() (+99 more)

### Community 33 - "Transport Registers & Operations Reports"
Cohesion: 0.16
Nodes (18): ArrivalRegisterRow, HireChallanRegisterRow, InvoiceRegisterRow, LRClientWiseRecord, LRClientWiseRow, LRRegisterRow, PendingHCRow, UnbilledLRRow (+10 more)

### Community 34 - "FASTag Toll & Tracking Service (6)"
Cohesion: 0.09
Nodes (37): ApiCenterSettingResponse, ApiCenterSettingUpdate, ApiCenterTestRequest, ApiCenterTestResponse, BranchBase, BranchCreate, BranchResponse, ChangePasswordRequest (+29 more)

### Community 35 - "settings/router.py"
Cohesion: 0.12
Nodes (25): map_user_to_list_item(), update_admin_settings(), update_user(), ActivityFiltersResponse, ActivityOfficeOption, ActivityStatsResponse, ActivityUserOption, AdminSettingItem (+17 more)

### Community 36 - "accounts/service.py"
Cohesion: 0.06
Nodes (63): ContraVoucherCreate, PaymentAllocationItem, PaymentVoucherCreate, TransportInvoiceCreate, VoucherCreate, check_duplicate_purchase_bill(), create_ath_payment(), create_bth_payment() (+55 more)

### Community 37 - "test_ai_phase4_job_and_challan.py"
Cohesion: 0.05
Nodes (39): handle_conversational_hc_booking(), is_hc_cancel_intent(), parse_hc_entities_from_text(), validate_and_update_hc_draft(), confirm_hire_challan_draft(), confirm_job_draft(), ConfirmHireChallanDraftRequest, ConfirmJobDraftRequest (+31 more)

### Community 38 - "auth/service.py"
Cohesion: 0.10
Nodes (26): build_user_navigation(), get_me(), get_user_navigation(), logout(), refresh_token(), LoginRequest, OfficeSummary, RefreshTokenRequest (+18 more)

### Community 39 - "FASTag Toll & Tracking Service (7)"
Cohesion: 0.15
Nodes (38): sanitize_ft_base_url(), get_gst_pan_client(), get_rc_client(), TaxApiCounterResponse, TaxApiTransactionItem, change_password(), check_and_deduct_tax_credit(), create_branch() (+30 more)

### Community 40 - "settings/service.py"
Cohesion: 0.11
Nodes (25): create_staff_recipient(), update_staff_recipient(), StaffRecipientCreate, StaffRecipientUpdate, create_staff_recipient(), delete_series_category(), delete_series_master(), delete_staff_recipient() (+17 more)

### Community 41 - "sidebar.tsx"
Cohesion: 0.05
Nodes (51): ACTIONS, buildModuleDefinitionsFromNav(), FeatureDef, IndeterminateCheckbox(), ModuleDef, normalizeModuleId(), PermissionItem, RoleRecord (+43 more)

### Community 42 - "control/service.py"
Cohesion: 0.09
Nodes (34): Entitlement, WebhookEvent, create_subscription(), get_tenant_info(), list_plans(), provision_new_tenant(), razorpay_webhook(), signup_complete() (+26 more)

### Community 43 - "reports/service.py"
Cohesion: 0.10
Nodes (44): BalanceSheetAccountItem, BalanceSheetGroupItem, BalanceSheetResponse, BankReconciliationResponse, BankReconTransaction, DaybookEntry, DaybookResponse, ExportJobCreate (+36 more)

### Community 44 - "panther-ai-panel.tsx"
Cohesion: 0.17
Nodes (13): PantherAIContext, PantherAIContextType, PantherAIProvider(), usePantherAI(), PantherAILauncher(), Citation, getSuggestedPrompts(), INITIAL_WELCOME_MESSAGE (+5 more)

### Community 45 - "create_general_invoice"
Cohesion: 0.08
Nodes (33): CreditDebitNoteCreate, GeneralInvoiceCreate, GeneralInvoiceItemCreate, ReceiptAgainstInvoiceCreate, ReceiptAllocationItem, ReceiptVoucherCreate, VoidVoucherRequest, create_credit_debit_note() (+25 more)

### Community 46 - "test_purchase_register_voucher_e2e.py"
Cohesion: 0.21
Nodes (10): PurchaseBillCreate, PurchaseBillItemCreate, PurchasePaymentCreate, e2e_session(), test_hire_challan_integration_and_duplicate_prevention(), test_ineligible_blocked_itc_section_17_5(), test_inter_state_purchase_bill_and_payment_settlement(), test_intra_state_purchase_bill_fcm() (+2 more)

### Community 47 - "daybook/page.tsx"
Cohesion: 0.18
Nodes (8): BillAllocationDetail, DaybookEntry, DaybookReportPage(), DaybookResponse, getVoucherSourceRoute(), LedgerEntryDetail, VoucherDetail, VoucherItemDetail

### Community 49 - "Tenant"
Cohesion: 0.04
Nodes (90): Plan, PlatformAdmin, Tenant, build_system_prompt(), detect_language(), format_page_registry_entry(), get_authorized_navigation_catalog(), resolve_navigation_suggestions() (+82 more)

### Community 50 - "general-invoice/page.tsx"
Cohesion: 0.07
Nodes (28): BillAllocationRecord, CustomerOption, EligibleInvoice, LedgerEntry, NoteCategory, numberToWords(), VendorOption, VoucherRecord (+20 more)

### Community 51 - "job_draft_service.py"
Cohesion: 0.19
Nodes (6): build_job_preview_card(), handle_conversational_job_booking(), is_job_cancel_intent(), parse_job_entities_from_text(), resolve_or_create_job_location(), resolve_or_create_job_party()

### Community 52 - "Client Component Flow"
Cohesion: 0.18
Nodes (6): get_adaequare_client(), GstPanClient, test_live_search_when_env_credentials_available(), test_normalization_gst_response(), test_normalization_pan_response(), test_normalization_with_state_code_fallback()

### Community 53 - "CompanySetting"
Cohesion: 0.29
Nodes (3): BranchUpdate, CompanySettingUpdate, EmailSettingUpdate

### Community 54 - "tracking/sim/page.tsx"
Cohesion: 0.23
Nodes (13): LRSummary, SIMTrackingPage(), SIMTripRecord, CarrierLogo(), CarrierPhoneBadge(), GenericSimIcon(), getCarrierBrand(), TelecomCarrier (+5 more)

### Community 55 - "log_user_activity"
Cohesion: 0.20
Nodes (13): create_series_category(), create_series_master(), create_user(), delete_role(), set_default_series(), SeriesCategoryCreate, SeriesMasterCreate, UserCreate (+5 more)

### Community 56 - "get"
Cohesion: 0.41
Nodes (9): get_account_ledger(), get_balance_sheet(), get_bank_reconciliation(), get_daybook(), get_profit_and_loss(), get_purchase_register(), get_sales_register(), get_special_report() (+1 more)

### Community 57 - "statements/service.py"
Cohesion: 0.27
Nodes (15): GSTInputItem, GSTInputResponse, GSTOutputItem, GSTOutputResponse, OpeningBalanceAccount, OpeningBalanceResponse, OSCreditorItem, OSCreditorResponse (+7 more)

### Community 58 - "transport/schemas.py"
Cohesion: 0.07
Nodes (54): create_arrival_report(), create_eway_bill(), create_pod_record(), sync_all_sim_trips(), ArrivalReportBase, ArrivalReportCreate, ArrivalReportResponse, CompanyVehicleBase (+46 more)

### Community 59 - "accounts/schemas.py"
Cohesion: 0.06
Nodes (60): ATHPaymentCreate, BankStatementImportResponse, BankStatementLineResponse, BillAllocationResponse, BillingClientLedgerListItem, BTHPaymentCreate, BulkConfirmRequest, CategoryOverviewStat (+52 more)

### Community 60 - "get"
Cohesion: 0.17
Nodes (18): get_permissions_schema(), check_series(), delete_series_category(), delete_series_master(), delete_staff_recipient(), get_activity_filters(), get_activity_stats(), get_email_settings() (+10 more)

### Community 61 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, autoprefixer@^10.4.20, postcss@^8.4.41, @types/node@^20.14.14, @types/react@^18.3.3, @types/react-dom@^18.3.0, typescript@^5.5.4, name (+8 more)

### Community 62 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, html2canvas@^1.4.1, jspdf@^4.2.1, lucide-react@^0.428.0, next@^14.2.10, @radix-ui/react-slot@^1.3.3 (+11 more)

### Community 63 - "Any"
Cohesion: 0.06
Nodes (4): BaseDraftBackend, InMemoryDraftBackend, json_serial(), RedisDraftBackend

### Community 64 - "Tsconfig.Json Component Flow"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+9 more)

### Community 65 - "Components.Json Component Flow"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 66 - "normal-purchase/page.tsx"
Cohesion: 0.06
Nodes (27): BillAllocationItem, BranchData, CompanySettingData, LedgerEntry, LineItemForm, TaxCategoryOption, VendorOption, VoucherItemRecord (+19 more)

### Community 69 - "Client Component Flow (2)"
Cohesion: 0.22
Nodes (6): DlClient, get_dl_client(), hunt_for_driver_data(), normalize_dl_date(), normalize_dl_dob(), test_dl_connection()

### Community 70 - "PantherKnowledgeEngine"
Cohesion: 0.13
Nodes (6): _dynamic_navigation_chunks(), KnowledgeChunk, PantherKnowledgeEngine, sanitize_chunk_text(), _tms_knowledge_chunks(), test_rag_engine_retrieves_new_chunks()

### Community 71 - "Client Component Flow (3)"
Cohesion: 0.23
Nodes (3): flatten_rc_payload(), normalize_rc_date(), RcClient

### Community 72 - "test_activity_audit_log_system.py"
Cohesion: 0.16
Nodes (14): BillingClientResponse, build_readable_details(), get_activity_filters(), get_activity_stats(), query_activity_logs(), test_activity_logging_records_exact_details(), test_activity_stats_and_filter_options(), test_all_issuing_offices_view_for_company_admin() (+6 more)

### Community 73 - "apiClient"
Cohesion: 0.03
Nodes (121): ProformaInvoicePage(), BillAllocationItem, LedgerEntry, LRRecord, SeriesRangeItem, TaxCategoryRecord, VoucherItem, VoucherRecord (+113 more)

### Community 75 - "uuid"
Cohesion: 0.04
Nodes (31): _call_groq(), call_llm(), _call_nvidia(), _call_openai(), is_provider_configured(), _is_valid_key(), sanitize_ai_response(), _stream_groq() (+23 more)

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
Cohesion: 0.19
Nodes (14): CompanyBankAccountCreate, CompanyBankAccountResponse, calculate_bank_account_balance(), create_company_bank_account(), get_company_bank_account(), list_company_bank_accounts(), lookup_ifsc(), mask_account_number() (+6 more)

### Community 85 - "Docker Compose.Yml Component Flow (2)"
Cohesion: 0.18
Nodes (12): build, context, dockerfile, build, container_name, depends_on, environment, image (+4 more)

### Community 86 - "Docker Compose.Yml Component Flow (3)"
Cohesion: 0.17
Nodes (12): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, command, container_name, environment, image, networks (+4 more)

### Community 87 - "test_ai_real_postgres_redis.py"
Cohesion: 0.06
Nodes (15): AIDraft, AIDraftStore, validate_and_update_job_draft(), anyio_backend(), assert_strict_isolation_guards(), get_pg_url(), test_real_postgres_cross_tenant_isolation(), test_real_postgres_hire_challan_financial_precision() (+7 more)

### Community 88 - "test_loading_slip.py"
Cohesion: 0.10
Nodes (15): create_loading_slip(), LoadingSlipBase, LoadingSlipCreate, LoadingSlipUpdate, LRBase, LRInvoiceItem, LRUpdate, _calculate_loading_slip_total() (+7 more)

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

### Community 99 - "hc-register/page.tsx"
Cohesion: 0.21
Nodes (10): AVAILABLE_COLUMNS, ColumnConfig, formatDateDisplay(), formatOfficeName(), getDefaultFinancialYearDates(), HCRegisterPage(), HireChallanRegisterRow, MONTH_NAMES (+2 more)

### Community 100 - "create_role"
Cohesion: 0.27
Nodes (11): create_role(), list_roles(), update_role(), PermissionItem, RoleBase, RoleCreate, RoleResponse, RoleUpdate (+3 more)

### Community 101 - "Docker Compose.Yml Component Flow (9)"
Cohesion: 0.67
Nodes (4): env_file, path, required, env_file

### Community 102 - "Multi-Tenant Auth & Permissions (10)"
Cohesion: 0.50
Nodes (3): Multi-Tenancy Model (Control Plane vs Per-Tenant DB), Razorpay Subscriptions & Webhook Processing, Subscription Tiers (Free, Pro, Business, Enterprise)

### Community 103 - "SIMTripRecord"
Cohesion: 0.06
Nodes (18): add_sim_trip_comment(), close_sim_trip(), _format_sim_trip(), list_sim_trips(), simulate_sim_consent(), start_sim_tracking(), sync_sim_trip(), update_sim_trip() (+10 more)

### Community 104 - "toast-provider.tsx"
Cohesion: 0.18
Nodes (12): dynamic, metadata, RootLayout(), viewport, ConfirmModalDialog(), ToastCard(), ToastProvider(), ThemeProvider() (+4 more)

### Community 105 - "System Documentation & Architecture Specs"
Cohesion: 0.67
Nodes (3): Double-Entry Ledger Accounts Model, Phase 3: Accounts, Misc & E-Invoicing, Accounts & Invoicing Module

### Community 106 - "System Documentation & Architecture Specs (2)"
Cohesion: 0.67
Nodes (3): Fleet Cost, Tyre & Vehicle Maintenance Model, Phase 5: Fleet Management, Fleet Management Module

### Community 181 - "sales-register/page.tsx"
Cohesion: 0.33
Nodes (3): SalesRegisterItem, SalesRegisterPage(), SalesRegisterResponse

### Community 182 - "transport_reports/router.py"
Cohesion: 0.41
Nodes (8): get_arrival_register(), get_hc_register(), get_invoice_register(), get_lr_booking_register(), get_lr_client_wise(), get_pending_hc(), get_unbilled(), get_unused_series()

### Community 183 - "test_live_api.py"
Cohesion: 0.43
Nodes (4): test_auth_login_and_me(), test_control_plans_and_tenant(), test_cross_tenant_token_rejection(), test_health_and_root()

### Community 198 - "update_series_master"
Cohesion: 0.28
Nodes (7): update_email_settings(), update_series_category(), update_series_master(), SeriesCategoryUpdate, SeriesMasterUpdate, update_series_category(), update_series_master()

### Community 200 - "email_service.py"
Cohesion: 0.15
Nodes (7): test_email_gateway(), EmailTestRequest, EmailTestResponse, send_test_email_service(), build_test_email_html(), send_smtp_email(), _sync_send_smtp_email()

### Community 207 - "AsyncSession"
Cohesion: 0.42
Nodes (7): get_gst_input(), get_gst_output(), get_opening_balance_details(), get_os_creditor(), get_os_debtor(), get_tds_payable(), get_tds_return()

### Community 208 - "register_error_handlers"
Cohesion: 0.36
Nodes (6): _cors_headers_for_request(), register_error_handlers(), app_exception_handler(), general_exception_handler(), http_exception_handler(), validation_exception_handler()

### Community 213 - "trial-balance/page.tsx"
Cohesion: 0.25
Nodes (5): TrialBalanceAccount, TrialBalanceGroup, TrialBalancePage(), TrialBalancePrimaryGroup, TrialBalanceResponse

### Community 216 - "ai/router.py"
Cohesion: 0.03
Nodes (63): is_hire_challan_intent(), is_instructional_hc_inquiry(), is_instructional_job_inquiry(), is_job_booking_intent(), get_page_registry_entry(), parse_page_context(), extract_booking_entities_via_llm(), is_grounded_in_text() (+55 more)

### Community 217 - "opening-balance/page.tsx"
Cohesion: 0.33
Nodes (3): OpeningBalanceAccount, OpeningBalanceDetailsPage(), OpeningBalanceResponse

### Community 220 - "theme-context.tsx"
Cohesion: 0.33
Nodes (5): Theme, ThemeContext, ThemeContextType, ThemeToggleEvent, ThemeToggleOrigin

### Community 221 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 222 - "tailwindcss"
Cohesion: 0.50
Nodes (3): tailwindcss@^3.4.10, config, tailwindcss

### Community 224 - "pytest"
Cohesion: 0.05
Nodes (52): ensure_unified_creditor_vendors(), get_billing_client_ledger_detail(), get_company_bank_account_ledger_detail(), get_company_vehicle_ledger_detail(), get_driver_ledger_detail(), get_generic_account_ledger_detail(), get_master_ledger_summary(), get_or_create_party_account() (+44 more)

## Knowledge Gaps
- **55 isolated node(s):** `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing`, `Fleet Cost, Tyre & Vehicle Maintenance Model`, `Phase 5: Fleet Management` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1681 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **113 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Accounts Voucher & Banking System (2)` to `Branch`, `transport/router.py`, `Fleet & Vehicle Maintenance Operations`, `bank_statement_service.py`, `test_ai_perfect_tms_enhancements.py`, `pytest`, `transport/service.py`, `AsyncSession`, `typed_tools.py`, `test_issuing_office_system.py`, `general/router.py`, `chat_with_copilot`, `datetime`, `home/service.py`, `excel_import.py`, `misc/router.py`, `Transport Registers & Operations Reports`, `settings/router.py`, `accounts/service.py`, `test_ai_phase4_job_and_challan.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `settings/service.py`, `control/service.py`, `Tenant`, `job_draft_service.py`, `transport_reports/router.py`, `log_user_activity`, `get`, `transport/schemas.py`, `accounts/schemas.py`, `get`, `update_series_master`, `email_service.py`, `test_activity_audit_log_system.py`, `AsyncSession`, `test_ai_real_postgres_redis.py`, `ai/router.py`, `test_loading_slip.py`, `pytest`, `create_role`, `SIMTripRecord`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Are the 454 inferred relationships involving `User` (e.g. with `check_entitlement_limit()` and `get_current_company_admin()`) actually correct?**
  _`User` has 454 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Razorpay Subscriptions & Webhook Processing`, `Double-Entry Ledger Accounts Model`, `Phase 3: Accounts, Misc & E-Invoicing` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Branch` be split into smaller, more focused modules?**
  _Cohesion score 0.07659007659007659 - nodes in this community are weakly interconnected._
- **Why does `Tenant` connect `Tenant` to `Branch`, `sqlalchemy`, `transport/router.py`, `test_ai_perfect_tms_enhancements.py`, `pytest`, `transport/service.py`, `Accounts Voucher & Banking System (2)`, `AsyncSession`, `typed_tools.py`, `TestFASTagTracking`, `general/router.py`, `chat_with_copilot`, `datetime`, `misc/router.py`, `FASTag Toll & Tracking Service (6)`, `test_ai_phase4_job_and_challan.py`, `auth/service.py`, `FASTag Toll & Tracking Service (7)`, `control/service.py`, `job_draft_service.py`, `log_user_activity`, `transport/schemas.py`, `get`, `test_ai_real_postgres_redis.py`, `ai/router.py`, `pytest`, `SIMTripRecord`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 204 inferred relationships involving `Branch` (e.g. with `get_current_office()` and `get_user_office_context()`) actually correct?**
  _`Branch` has 204 INFERRED edges - model-reasoned connections that need verification._
- **Should `einvoicing/service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.13825757575757575 - nodes in this community are weakly interconnected._