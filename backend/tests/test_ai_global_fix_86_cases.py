"""
Global Acceptance Test Suite: 86 Cases for Panther AI Copilot
Validates the Intent -> Tools -> Render rebuild covering all 6 root causes (R1-R6):
- 50 English test queries
- 16 Hindi & Hinglish test queries (8 Devanagari + 8 Hinglish)
- 20 Unseen Dev Paraphrases
Enforces:
- Zero invented values (cities verbatim, packages recorded, temporal dates parsed)
- Intent-first routing before any slot-filling or search
- Single unified vehicle index
- Proper conversation state clearing (driver questions never inherit vehicle numbers)
- Canonical ledger handling (outstanding balance, vendor payable, ledger summary)
- Language-independent Hard Rule 0 delete refusal
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.tenant_db.models import (
    TenantBase,
    Branch,
    User,
    Role,
    RolePermission,
    LR,
    Consigner,
    Consignee,
    Location,
    CompanyVehicle,
    MarketVehicle,
    Driver,
    Voucher,
    VoucherType,
    SeriesMaster,
)
from app.control.models import ControlBase, Tenant, Plan
from app.modules.ai.schemas import ChatRequest, ChatMessage
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.router import chat_with_copilot
from app.modules.ai.intent_router import classify_intent_and_entities, extract_raw_booking_slots


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def setup_86_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=True)

    async with session_maker() as session:
        delhi_branch = Branch(id=101, code="DEL", name="Delhi Logistics Hub", is_head_office=True, is_active=True)
        session.add(delhi_branch)

        cv = CompanyVehicle(
            id=1,
            vehicle_number="DL01AB1234",
            vehicle_type="Truck 10 Wheeler",
            capacity_mt=Decimal("16.00"),
            is_active=True,
            ownership_type="COMPANY",
        )
        session.add(cv)

        mv = MarketVehicle(
            id=2,
            vehicle_number="MH12CD5678",
            vehicle_type="Container 20ft",
            capacity_mt=Decimal("12.00"),
            is_active=True,
            owner_name="Western Freight Lines",
        )
        session.add(mv)

        driver_parth = Driver(
            id=1,
            name="Parth",
            phone="9876543210",
            license_number="DL-1420110012345",
            is_active=True,
        )
        session.add(driver_parth)

        driver_ramesh = Driver(
            id=2,
            name="Ramesh Kumar",
            phone="9811122233",
            license_number="HR-0620150098765",
            is_active=True,
        )
        session.add(driver_ramesh)

        v1 = Voucher(
            id=1,
            voucher_number="PV-2026-0001",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            driver_id=1,
            net_amount=Decimal("100.00"),
            voucher_date=date(2026, 11, 7),
            is_void=False,
        )
        session.add(v1)

        v2 = Voucher(
            id=2,
            voucher_number="PV-2026-0002",
            voucher_type=VoucherType.PAYMENT_VOUCHER.value,
            driver_id=1,
            net_amount=Decimal("3000.00"),
            voucher_date=date(2026, 11, 5),
            is_void=False,
        )
        session.add(v2)

        loc_delhi = Location(id=1, country="India", state="Delhi", city_name="Delhi", location_code="DELH", is_active=True)
        loc_mumbai = Location(id=2, country="India", state="Maharashtra", city_name="Mumbai", location_code="MUMB", is_active=True)
        session.add_all([loc_delhi, loc_mumbai])

        consigner_abc = Consigner(id=1, name="ABC Traders", is_active=True, issuing_office_id=101)
        consignee_xyz = Consignee(id=1, name="XYZ Mart", is_active=True, issuing_office_id=101)
        session.add_all([consigner_abc, consignee_xyz])

        lr1 = LR(
            id=1,
            lr_number="LR-DEL-0001",
            consigner_id=1,
            consignee_id=1,
            billing_customer_id=1,
            origin_location_id=1,
            destination_location_id=2,
            vehicle_number="DL01AB1234",
            vehicle_source="COMPANY",
            freight_rate=Decimal("15000.00"),
            freight_amount=Decimal("15000.00"),
            total_freight_amount=Decimal("15000.00"),
            advance_amount=Decimal("5000.00"),
            balance_amount=Decimal("10000.00"),
            status="In Transit",
            issuing_office_id=101,
        )
        session.add(lr1)

        await session.commit()

    return session_maker


@pytest.fixture
def test_env():
    plan = Plan(id=1, code="PRO", name="Pro Plan")
    tenant = Tenant(id=1, company_name="Panther Logistics", company_code="PANTHER", status="ACTIVE", plan=plan)
    user = User(
        id=1,
        email="test_user@panther.com",
        full_name="Operations Lead",
        role="COMPANY_ADMIN",
        is_active=True,
    )
    branch = Branch(id=101, code="DEL", name="Delhi Logistics Hub", is_head_office=True, is_active=True)
    return tenant, user, branch


# ==============================================================================
# 1. 50 ENGLISH TEST CASES
# ==============================================================================

ENGLISH_50_CASES = [
    # Greet & Help (3)
    ("Hello Panther", "greet", None),
    ("Hi there!", "greet", None),
    ("What can you do?", "help", None),
    # R1: Strictly Verbatim City Extraction (No Locality Expansion) (7)
    ("Book a truck from Delhi to Mumbai", "book_lr", {"fromCity": "Delhi", "toCity": "Mumbai"}),
    ("Create LR from Jaipur to Pune", "book_lr", {"fromCity": "Jaipur", "toCity": "Pune"}),
    ("Transport 10 boxes from Chennai to Bengaluru", "book_lr", {"fromCity": "Chennai", "toCity": "Bengaluru", "packages": 10}),
    ("Send 20 packages Ahmedabad to Kolkata", "book_lr", {"fromCity": "Ahmedabad", "toCity": "Kolkata", "packages": 20}),
    ("Book truck Delhi to Lucknow tomorrow", "book_lr", {"fromCity": "Delhi", "toCity": "Lucknow"}),
    ("Need urgent shipment from Surat to Indore", "book_lr", {"fromCity": "Surat", "toCity": "Indore", "urgency": "Urgent"}),
    ("Create LR for ABC Traders to XYZ Mart, Delhi to Mumbai", "book_lr", {"consigner": "ABC Traders", "consignee": "XYZ Mart", "fromCity": "Delhi", "toCity": "Mumbai"}),
    # R2: Intent Before Slot-Filling / Search (7)
    ("Book a truck from Mumbai to Pune tomorrow", "book_lr", {"fromCity": "Mumbai", "toCity": "Pune"}),
    ("How much do I have to pay?", "outstanding_balance", None),
    ("Show all vehicles", "list_vehicles", None),
    ("Track my shipment from Delhi to Mumbai", "track_lr", None),
    ("Show all drivers", "list_drivers", None),
    ("Show bills", "show_bills", None),
    ("List all invoices", "show_bills", None),
    # R3: Vehicle Lookups (Unified Index, Prefix, List) (6)
    ("Find vehicle DL01AB1234", "find_vehicle", {"vehicle_number": "DL01AB1234"}),
    ("Search vehicle MH12CD5678", "find_vehicle", {"vehicle_number": "MH12CD5678"}),
    ("Find vehicle DL01", "find_vehicle", {"vehicle_number": "DL01"}),
    ("List vehicles", "list_vehicles", None),
    ("Where is vehicle DL01AB1234?", "track_vehicle", {"vehicle_number": "DL01AB1234"}),
    ("Check vehicle MH12", "find_vehicle", {"vehicle_number": "MH12"}),
    # R4: Conversation State Isolation & Driver Balances (6)
    ("What is Parth's driver advance balance?", "driver_balance", {"driver_name": "Parth"}),
    ("Driver advance balance for Ramesh", "driver_balance", {"driver_name": "Ramesh"}),
    ("Find driver Parth", "find_driver", {"driver_name": "Parth"}),
    ("List drivers", "list_drivers", None),
    ("Cancel draft", "cancel_draft", None),
    ("Cancel", "cancel_draft", None),
    # R5: Synonyms, Knowledge, Action Prompts (11)
    ("View Ledger", "view_ledger", None),
    ("What is my outstanding balance?", "outstanding_balance", None),
    ("Show vendor balance", "vendor_balance", None),
    ("Vendor payables", "vendor_balance", None),
    ("What is E-Way Bill?", "what_is_eway", None),
    ("Explain eway bill rules", "what_is_eway", None),
    ("How do I create an LR?", "how_to_create_lr", None),
    ("How to track shipment?", "how_to_track", None),
    ("Add new consignee", "add_consignee", None),
    ("Create new consignee", "add_consignee", None),
    ("Change consignee to New Store Ltd", "change_consignee", {"consignee": "New Store Ltd"}),
    # Hard Rule 0: Permanent Refusal (4)
    ("Delete my LR", "delete_lr", None),
    ("Remove vehicle DL01AB1234", "delete_lr", None),
    ("Erase driver record", "delete_lr", None),
    ("Drop bill INV-001", "delete_lr", None),
    # Off-topic & Low Confidence (6)
    ("What is the weather today?", "off_topic", None),
    ("Tell me a funny joke", "off_topic", None),
    ("What is Apple stock price?", "off_topic", None),
    ("xyzzy abc qqq", "unknown", None),
    ("1234567890", "unknown", None),
    ("asdfghjk", "unknown", None),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("query,expected_intent,expected_slots", ENGLISH_50_CASES)
async def test_english_50_cases_intent_and_slots(query, expected_intent, expected_slots):
    """Verifies that all 50 English test queries map to the exact closed-taxonomy intent."""
    res = classify_intent_and_entities(query)
    assert res.intent == expected_intent, f"Query '{query}' expected intent '{expected_intent}', got '{res.intent}'"
    if expected_slots:
        for k, v in expected_slots.items():
            actual_v = res.entities_raw.get(k)
            assert actual_v == v, f"Query '{query}' field '{k}' expected '{v}', got '{actual_v}'"


# ==============================================================================
# 2. 16 HINDI & HINGLISH CASES (8 Devanagari + 8 Hinglish)
# ==============================================================================

HINDI_HINGLISH_16_CASES = [
    # Hindi Devanagari (8)
    ("नमस्ते पैंथर", "hi_devanagari", "greet"),
    ("मुझे दिल्ली से मुंबई LR बुक करना है", "hi_devanagari", "book_lr"),
    ("लेजर देखें", "hi_devanagari", "view_ledger"),
    ("गाड़ी DL01AB1234 कहाँ है?", "hi_devanagari", "track_vehicle"),
    ("पार्थ का ड्राइवर बैलेंस बताओ", "hi_devanagari", "driver_balance"),
    ("ई-वे बिल क्या है?", "hi_devanagari", "what_is_eway"),
    ("रद्द करें", "hi_devanagari", "cancel_draft"),
    ("मेरा LR डिलीट करें", "hi_devanagari", "delete_lr"),  # Must trigger Hard Rule 0
    # Hinglish (8)
    ("Hello bhai", "hinglish", "greet"),
    ("Delhi se Mumbai ek LR banao", "hinglish", "book_lr"),
    ("Ledger dikhao", "hinglish", "view_ledger"),
    ("Vehicle DL01AB1234 kahan hai", "hinglish", "track_vehicle"),
    ("Parth ka advance hisab batao", "hinglish", "driver_balance"),
    ("Eway bill kya hota hai", "hinglish", "what_is_eway"),
    ("Draft cancel karo", "hinglish", "cancel_draft"),
    ("Mera LR delete karo", "hinglish", "delete_lr"),  # Must trigger Hard Rule 0
]


@pytest.mark.asyncio
@pytest.mark.parametrize("query,expected_lang,expected_intent", HINDI_HINGLISH_16_CASES)
async def test_hindi_hinglish_16_cases(query, expected_lang, expected_intent):
    """Verifies that Hindi and Hinglish queries map to canonical intent and language."""
    from app.modules.ai.knowledge import detect_language
    detected = detect_language(query)
    assert detected == expected_lang, f"Query '{query}' expected lang '{expected_lang}', got '{detected}'"
    res = classify_intent_and_entities(query, detected_lang=detected)
    assert res.intent == expected_intent, f"Query '{query}' expected intent '{expected_intent}', got '{res.intent}'"


# ==============================================================================
# 3. 20 UNSEEN DEV PARAPHRASES (GENERALISATION TEST)
# ==============================================================================

UNSEEN_20_PARAPHRASES = [
    ("Please dispatch 50 cartons from Pune to Nagpur", "book_lr", {"fromCity": "Pune", "toCity": "Nagpur", "packages": 50}),
    ("Arrange transport for 5 MT steel Mumbai to Ahmedabad", "book_lr", {"fromCity": "Mumbai", "toCity": "Ahmedabad"}),
    ("Need to move cargo between Delhi and Kolkata tomorrow", "book_lr", {"fromCity": "Delhi", "toCity": "Kolkata"}),
    ("Bilty bana do Gurgaon se Jaipur", "book_lr", {"fromCity": "Gurgaon", "toCity": "Jaipur"}),
    ("Give me running balances for all clients and vendors", "view_ledger", None),
    ("How much cash is pending from customers?", "outstanding_balance", None),
    ("Show me who owes us money", "outstanding_balance", None),
    ("Kitna payment lena baki hai party se?", "outstanding_balance", None),
    ("Locate truck DL01AB1234 on GPS", "track_vehicle", {"vehicle_number": "DL01AB1234"}),
    ("Give current GPS ping for MH12CD5678", "track_vehicle", {"vehicle_number": "MH12CD5678"}),
    ("Pull up details for truck DL01", "find_vehicle", {"vehicle_number": "DL01"}),
    ("How much advance is currently outstanding with Parth?", "driver_balance", {"driver_name": "Parth"}),
    ("Driver Ramesh ka advance balance kitna hai?", "driver_balance", {"driver_name": "Ramesh"}),
    ("Fetch all billing invoices", "show_bills", None),
    ("What are the mandatory documents for an E-Way Bill?", "what_is_eway", None),
    ("Tell me the steps to register a new LR", "how_to_create_lr", None),
    ("I want to register a brand new consignee party", "add_consignee", None),
    ("Wipe out record LR-DEL-0001 immediately", "delete_lr", None),  # Safety Rule 0
    ("Purge driver Parth from database", "delete_lr", None),  # Safety Rule 0
    ("Dismiss current booking draft", "cancel_draft", None),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("query,expected_intent,expected_slots", UNSEEN_20_PARAPHRASES)
async def test_unseen_20_paraphrases(query, expected_intent, expected_slots):
    """Verifies that unseen paraphrases are correctly resolved without brittle string matching."""
    res = classify_intent_and_entities(query)
    assert res.intent == expected_intent, f"Paraphrase '{query}' expected '{expected_intent}', got '{res.intent}'"
    if expected_slots:
        for k, v in expected_slots.items():
            actual_v = res.entities_raw.get(k)
            assert actual_v == v, f"Paraphrase '{query}' field '{k}' expected '{v}', got '{actual_v}'"


# ==============================================================================
# 4. END-TO-END EXECUTION TESTS (ZERO INVENTED VALUES, SAFETY & STATE INTEGRITY)
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_no_city_expansion(setup_86_test_db, test_env):
    """R1: Delhi stays Delhi, Mumbai stays Mumbai. Zero locality hallucinations."""
    session_maker = setup_86_test_db
    tenant, user, branch = test_env
    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")
        req = ChatRequest(messages=[ChatMessage(role="user", content="Book a truck from Delhi to Mumbai tomorrow")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Content must contain verbatim "Delhi" and "Mumbai", NEVER expanded localities
        assert "Delhi" in res.content
        assert "Mumbai" in res.content
        assert "Okhla" not in res.content
        assert "Taloja" not in res.content
        assert "Sitapura" not in res.content
        assert "Chakan" not in res.content

        draft = await lr_draft_store.get_active_draft(tenant.id, user.id, draft_type="lr")
        assert draft is not None
        assert draft.preview_labels.get("origin_name") == "Delhi"
        assert draft.preview_labels.get("destination_name") == "Mumbai"


@pytest.mark.asyncio
async def test_e2e_hindi_hard_rule_0_delete_refusal(setup_86_test_db, test_env):
    """R6: Hindi 'मेरा LR डिलीट करें' strictly refused without listing LRs or deleting DB records."""
    session_maker = setup_86_test_db
    tenant, user, branch = test_env
    async with session_maker() as db:
        # Check initial record count
        initial_lrs = (await db.execute(select(func.count(LR.id)))).scalar()

        req = ChatRequest(messages=[ChatMessage(role="user", content="मेरा LR डिलीट करें")])
        res = await chat_with_copilot(req, current_user=user, current_office=branch, tenant=tenant, db=db)

        # Refusal message in Hindi, zero records deleted, zero LR listings
        assert "डिलीट नहीं कर सकते" in res.content or "डिलीशन की अनुमति नहीं है" in res.content or "प्रतिबंधित" in res.content or "Delete" in res.content
        assert "LR-DEL-0001" not in res.content  # Must NEVER list LR-0001
        assert len(res.cards) == 0

        final_lrs = (await db.execute(select(func.count(LR.id)))).scalar()
        assert final_lrs == initial_lrs


@pytest.mark.asyncio
async def test_e2e_state_transition_clears_stale_search(setup_86_test_db, test_env):
    """R4: Driver query following vehicle search does not recycle old vehicle DL01AB1234."""
    session_maker = setup_86_test_db
    tenant, user, branch = test_env
    async with session_maker() as db:
        await lr_draft_store.clear_active_draft(tenant.id, user.id, draft_type="lr")

        # Turn 1: Search vehicle DL01AB1234
        req1 = ChatRequest(messages=[ChatMessage(role="user", content="Find vehicle DL01AB1234")])
        res1 = await chat_with_copilot(req1, current_user=user, current_office=branch, tenant=tenant, db=db)
        assert "DL01AB1234" in res1.content

        # Turn 2: Query driver advance balance (intent changes from find_vehicle -> driver_balance)
        req2 = ChatRequest(messages=[
            ChatMessage(role="user", content="Find vehicle DL01AB1234"),
            ChatMessage(role="assistant", content=res1.content),
            ChatMessage(role="user", content="What is Parth's driver advance balance?")
        ])
        res2 = await chat_with_copilot(req2, current_user=user, current_office=branch, tenant=tenant, db=db)
        # Must answer Parth's advance balance, NOT recycle DL01AB1234
        assert "Parth (DRV-0001)" in res2.content
        assert "DL01AB1234" not in res2.content

