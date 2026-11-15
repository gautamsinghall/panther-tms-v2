import pytest
from app.modules.ai.tms_knowledge import TMS_KNOWLEDGE_CHUNKS, TMS_GLOSSARY
from app.modules.ai.rag import PantherKnowledgeEngine, SYNONYM_MAP
from app.modules.ai.intent_router import classify_intent_and_entities
from app.modules.ai.knowledge import detect_language
from app.modules.ai.output_guards import _ID_RE


def test_lr_nine_statuses_in_knowledge():
    """Verify LR status flow chunk contains all 9 official TMS states."""
    lr_chunks = [c for c in TMS_KNOWLEDGE_CHUNKS if c.get("doc_id") == "tms-lr-status-flow"]
    assert len(lr_chunks) == 1, "tms-lr-status-flow chunk must exist"
    content = lr_chunks[0]["content"]
    expected_states = [
        "DRAFT", "BOOKED", "LOADED", "IN_TRANSIT", "ARRIVED",
        "DELIVERED", "POD_RECEIVED", "POD_VERIFIED", "CANCELLED"
    ]
    for state in expected_states:
        assert state in content, f"State {state} missing from tms-lr-status-flow"


def test_missing_enums_knowledge_chunks():
    """Verify chunks exist for JobStatus, HireChallanStatus, POD, TrackingMode, VoucherType, EInvoiceStatus."""
    doc_ids = {c.get("doc_id") for c in TMS_KNOWLEDGE_CHUNKS}
    required_chunks = [
        "tms-enums-job-status",
        "tms-enums-hire-challan-status",
        "tms-enums-pod",
        "tms-enums-tracking-modes",
        "tms-enums-voucher-types",
        "tms-enums-einvoice-status",
    ]
    for req in required_chunks:
        assert req in doc_ids, f"Required enum chunk {req} missing from TMS_KNOWLEDGE_CHUNKS"


def test_frontend_pages_knowledge_chunks():
    """Verify chunks exist for accounts, einvoicing, fleet, reports, statements, transport-reports."""
    doc_ids = {c.get("doc_id") for c in TMS_KNOWLEDGE_CHUNKS}
    required_pages = [
        "tms-page-accounts-overview",
        "tms-page-general-invoice",
        "tms-page-proforma-invoice",
        "tms-page-purchases",
        "tms-page-vouchers-overview",
        "tms-page-master-ledger",
        "tms-page-bank-accounts",
        "tms-page-credit-debit-notes",
        "tms-page-einvoicing-overview",
        "tms-page-fleet-overview",
        "tms-page-reports-overview",
        "tms-page-statements-overview",
        "tms-page-transport-reports-overview",
        "tms-page-company-masters",
    ]
    for req in required_pages:
        assert req in doc_ids, f"Required frontend page chunk {req} missing from TMS_KNOWLEDGE_CHUNKS"


def test_workflows_knowledge_chunks():
    """Verify chunks exist for major workflows."""
    doc_ids = {c.get("doc_id") for c in TMS_KNOWLEDGE_CHUNKS}
    required_workflows = [
        "tms-workflow-vehicle-master",
        "tms-workflow-driver-master",
        "tms-workflow-hire-challan",
        "tms-workflow-job-trip",
        "tms-workflow-freight-payment-terms",
    ]
    for req in required_workflows:
        assert req in doc_ids, f"Required workflow chunk {req} missing from TMS_KNOWLEDGE_CHUNKS"


def test_bilingual_glossary_enrichment():
    """Verify glossary contains essential Hindi & English logistics terms."""
    terms_str = " ".join(TMS_GLOSSARY.keys()).lower()
    required_terms = [
        "lr", "bilty", "job", "hire challan", "pod", "e-way bill",
        "e-invoice", "irn", "detention", "demurrage", "freight",
        "tbb", "to pay", "paid", "ledger", "fastag", "sim", "gps"
    ]
    for t in required_terms:
        assert t in terms_str, f"Glossary missing term {t}"


def test_synonym_map_multilingual_expansion():
    """Verify SYNONYM_MAP contains Hindi & Hinglish expansions."""
    for key in ["driver", "vehicle", "pod", "detention", "freight", "challan", "ledger"]:
        assert key in SYNONYM_MAP, f"Key {key} missing from SYNONYM_MAP"
        synonyms = SYNONYM_MAP[key]
        assert len(synonyms) >= 3, f"Key {key} has too few synonyms: {synonyms}"


def test_intent_router_new_intents_english_hindi():
    """Verify intent router classifies new intents correctly in English, Hindi, and Hinglish."""
    cases = [
        ("list accounts", "list_accounts"),
        ("show all accounts", "list_accounts"),
        ("अकाउंट्स दिखाओ", "list_accounts"),
        ("show einvoice", "show_einvoice"),
        ("generate irn", "show_einvoice"),
        ("ई-इनवॉइस दिखाओ", "show_einvoice"),
        ("track fastag", "track_fastag"),
        ("फास्टैग ट्रैकिंग", "track_fastag"),
        ("show hire challans", "show_hire_challan"),
        ("हायर चालान दिखाओ", "show_hire_challan"),
        ("show pod", "show_pod"),
        ("Show pending PODs", "show_pod"),
        ("पॉड स्टेटस दिखाओ", "show_pod"),
        ("detention charges", "report_detention"),
        ("गाड़ी रुकने का चार्ज क्या है", "report_detention"),
        ("view transport reports", "view_transport_reports"),
        ("ट्रांसपोर्ट रिपोर्ट दिखाओ", "view_transport_reports"),
        ("list vendors", "list_vendors"),
        ("सप्लायर दिखाओ", "list_vendors"),
    ]
    for text, expected_intent in cases:
        res = classify_intent_and_entities(text)
        assert res.intent == expected_intent, f"Query '{text}' expected intent '{expected_intent}', got '{res.intent}'"


def test_language_detection_devanagari_and_greetings():
    """Verify language detection catches Devanagari, Hinglish, and traditional greetings."""
    assert detect_language("नमस्ते, क्या आप मेरी मदद कर सकते हैं?") == "hi_devanagari"
    assert detect_language("बिल्टी कैसे बनाएं?") == "hi_devanagari"
    assert detect_language("gaadi ka bhada kitna banta hai") == "hinglish"
    assert detect_language("mere hisaab se payment pending hai") == "hinglish"
    assert detect_language("How do I create a new invoice?") == "en"

    # Hindi greetings
    res_namaste = classify_intent_and_entities("नमस्ते")
    assert res_namaste.intent == "greet"
    res_ram = classify_intent_and_entities("राम राम")
    assert res_ram.intent == "greet"


def test_output_guards_expanded_document_ids():
    """Verify output guards regex recognizes new document prefixes (PI, GI, PB, DN, CN, POD, AR)."""
    prefixes = ["LR-001", "GR-102", "JOB-501", "HC-202", "INV-909", "PI-001", "GI-002", "PB-003", "DN-004", "CN-005", "POD-006", "AR-007"]
    for doc_id in prefixes:
        match = _ID_RE.search(f"Here is document {doc_id} for your review")
        assert match is not None, f"Document ID {doc_id} should be matched by _ID_RE"
        assert match.group(0) == doc_id


def test_rag_engine_retrieves_new_chunks():
    """Verify PantherKnowledgeEngine indexes 100+ chunks and retrieves new topic chunks."""
    engine = PantherKnowledgeEngine()
    engine.load_and_index(force=True)
    assert len(engine.chunks) >= 100, f"Expected >= 100 chunks, found {len(engine.chunks)}"

    # Test retrieval for various new topics
    retrievals = [
        ("What are the job statuses?", "tms-job-what-is"),
        ("What is the Hire Challan status workflow?", "tms-workflow-hire-challan"),
        ("How do I view the general invoice page?", "tms-page-general-invoice"),
        ("Where are transport reports?", "tms-page-transport-reports-overview"),
    ]
    for query, expected_chunk_id in retrievals:
        chunks, _ = engine.retrieve(query, top_k=3)
        doc_ids = [c.doc_id for c in chunks]
        assert expected_chunk_id in doc_ids, f"Query '{query}' expected chunk '{expected_chunk_id}' in top 3, got {doc_ids}"


def test_page_registry_all_modules_and_dynamic_fallback():
    """Verify that all major frontend pages exist in PAGE_REGISTRY and dynamic fallback works."""
    from app.modules.ai.knowledge import get_page_registry_entry

    routes = [
        "/fleet/trip-expense",
        "/fleet/trip-advance",
        "/fleet/trip-expense-register",
        "/fleet/truck-pnl",
        "/accounts/general-invoice",
        "/accounts/proforma-invoice",
        "/accounts/purchases",
        "/accounts/receipt-voucher",
        "/transport-reports/lr-register",
        "/transport-reports/hc-register",
        "/reports/trial-balance",
        "/company/branches",
    ]
    for r in routes:
        path, meta = get_page_registry_entry(r)
        assert meta is not None, f"Route {r} missing from PAGE_REGISTRY"
        assert meta.get("title"), f"Route {r} missing title"
        assert meta.get("purpose"), f"Route {r} missing purpose"

    # Test dynamic fallback on unmapped route
    _, dyn_meta = get_page_registry_entry("/custom/warehouse-zones")
    assert dyn_meta is not None
    assert dyn_meta["title"] == "Warehouse Zones"


@pytest.mark.asyncio
async def test_llm_failure_resilience():
    """Verify that LLM failure never crashes with 500 UnboundLocalError or missing traceback."""
    from unittest.mock import patch
    from app.modules.ai.router import chat_with_copilot
    from app.modules.ai.schemas import ChatRequest, ChatMessage
    from app.control.models import Tenant, Plan
    from app.tenant_db.models import User, Branch

    plan = Plan(id=1, code="PRO", name="Pro")
    tenant = Tenant(id=1, company_name="Test Co", company_code="TESTCO", status="ACTIVE", plan=plan)
    user = User(id=1, full_name="User", email="user@test.com", role="admin")
    branch = Branch(id=1, name="Delhi", code="DEL")

    with patch("app.modules.ai.router.call_llm", side_effect=RuntimeError("Provider timed out")):
        req = ChatRequest(messages=[ChatMessage(role="user", content="tell me about transit corridors")], page_context="/dashboard")
        resp = await chat_with_copilot(data=req, current_user=user, tenant=tenant, current_office=branch, db=None)
        assert resp is not None
        assert len(resp.content) > 0
        assert "500" not in resp.content

