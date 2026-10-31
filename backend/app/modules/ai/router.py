"""
Panther AI API Router.
Provides authenticated AI copilot endpoints, context-aware suggestions, navigation resolution,
and secure read-only operational tools for LRs, Vehicles, Drivers, Tracking, and Master Ledgers.
"""
from typing import Optional, AsyncGenerator
import re

from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_tenant_session_maker
from app.auth.dependencies import get_current_user, get_current_office
from app.tenant_db.session import get_current_tenant
from app.control.models import Tenant
from app.tenant_db.models import User, Branch
from app.modules.ai.schemas import (
    ChatRequest,
    ChatResponse,
    AIStatusResponse,
    ContextSuggestionResponse,
    ConfirmLRDraftRequest,
    LRConfirmationResponse,
    ConfirmJobDraftRequest,
    JobConfirmationResponse,
    ConfirmHireChallanDraftRequest,
    HireChallanConfirmationResponse,
    StructuredCard,
)
from app.modules.transport.schemas import LRCreate, JobCreate, HireChallanCreate
from app.modules.ai.job_draft_service import (
    handle_conversational_job_booking,
    is_job_booking_intent,
    is_instructional_job_inquiry,
    is_job_cancel_intent,
)
from app.modules.ai.hire_challan_draft_service import (
    handle_conversational_hc_booking,
    is_hire_challan_intent,
    is_instructional_hc_inquiry,
    is_hc_cancel_intent,
)
from app.modules.ai.draft_store import lr_draft_store
from app.modules.ai.lr_draft_service import (
    handle_conversational_lr_booking,
    is_lr_booking_intent,
    is_cancel_intent,
    is_instructional_inquiry,
)
from app.modules.ai.provider import is_provider_configured, call_llm, stream_llm
from app.modules.ai.rag import knowledge_engine
from app.modules.ai.knowledge import (
    detect_language,
    get_authorized_navigation_catalog,
    resolve_navigation_suggestions,
    build_system_prompt,
    ROUTE_SUGGESTIONS,
)
from app.modules.ai.privacy import sanitize_chat_history_for_external_llm, anonymize_system_context
from app.modules.ai.tools import (
    classify_operational_intent,
    execute_lr_tool,
    execute_vehicle_tool,
    execute_driver_tool,
    execute_tracking_tool,
    execute_accounting_tool,
    execute_client_tool,
    execute_vendor_tool,
    execute_job_tool,
    execute_hire_challan_tool,
    execute_invoice_tool,
    execute_pod_tool,
    execute_eway_bill_tool,
    execute_branch_tool,
    execute_consigner_consignee_tool,
    execute_fleet_maintenance_tool,
    execute_einvoice_tool,
)

router = APIRouter(prefix="/ai", tags=["Panther AI"])


async def get_ai_tenant_db(
    tenant: Tenant = Depends(get_current_tenant),
) -> AsyncGenerator[Optional[AsyncSession], None]:
    """Yields tenant database session, or None if database is unreachable or in mock/test mode."""
    db_name = getattr(tenant, "db_name", None)
    if not db_name:
        yield None
        return
    session_maker = get_tenant_session_maker(db_name)
    async with session_maker() as session:
        yield session


def sanitize_ai_output(text: str) -> str:
    """Protects sensitive secrets, credentials, and connection strings from leaking."""
    if not text:
        return text
    text = re.sub(r"sk-[a-zA-Z0-9_-]{20,}", "[REDACTED_API_KEY]", text)
    text = re.sub(r"postgresql(\+asyncpg)?://[^\s]+", "[REDACTED_DB_URL]", text)
    text = re.sub(r"(?i)(password|secret|token)\s*=\s*['\"][^'\"]+['\"]", r"\1='[REDACTED]'", text)
    return text


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status(
    current_user: User = Depends(get_current_user),
):
    """Returns the operational status and configuration of Panther AI."""
    configured = is_provider_configured()
    return AIStatusResponse(
        is_configured=configured,
        model=settings.active_ai_model,
        system_name=settings.active_ai_system_name,
        provider=settings.active_ai_provider_name,
        supported_languages=["English", "Hindi (हिन्दी)", "Hinglish"],
    )


@router.get("/context-suggestions", response_model=ContextSuggestionResponse)
async def get_context_suggestions(
    path: Optional[str] = Query(default="/", description="Current page path e.g. /transport/lr-booking"),
    current_user: User = Depends(get_current_user),
):
    """Returns context-aware prompt suggestions based on current dashboard route."""
    clean_path = (path or "/").split("?")[0].rstrip("/")
    if not clean_path:
        clean_path = "/"

    # Find matching route suggestions or fallback to root suggestions
    suggestions = ROUTE_SUGGESTIONS.get(clean_path)
    if not suggestions:
        matched_prefix = next((p for p in ROUTE_SUGGESTIONS if clean_path.startswith(p) and p != "/"), None)
        suggestions = ROUTE_SUGGESTIONS.get(matched_prefix, ROUTE_SUGGESTIONS["/"])

    module_title = clean_path.strip("/").replace("-", " ").replace("/", " → ").title() or "Overview"

    return ContextSuggestionResponse(
        page=clean_path,
        module_title=module_title,
        suggestions=suggestions[:4],
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_copilot(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: Optional[AsyncSession] = Depends(get_ai_tenant_db),
):
    """
    Main conversational copilot endpoint.
    Handles multilingual requests, ground-truth TMS knowledge, navigation resolution,
    and secure read-only operational tools with privacy boundary protection.
    """
    last_user_message = next((m.content for m in reversed(data.messages) if m.role == "user"), "")
    detected_lang = detect_language(last_user_message)

    # 1. Retrieve authorized modules for the user's tenant plan & role
    authorized_catalog = get_authorized_navigation_catalog(tenant=tenant, user=current_user)

    # 2. Resolve navigation suggestions from user query against authorized routes
    nav_suggestions = resolve_navigation_suggestions(
        query=last_user_message,
        authorized_catalog=authorized_catalog,
    )

    # 2.5 Conversational Write Workflows (LR, Job, Hire Challan)
    if db:
        # A. Transport Job Workflow
        active_job_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="job")
        has_active_job = False
        if active_job_id:
            d_job = await lr_draft_store.get_draft(active_job_id)
            if d_job and not d_job.is_confirmed:
                has_active_job = True

        is_job_req = is_job_booking_intent(last_user_message)
        is_job_canc = is_job_cancel_intent(last_user_message)
        is_job_inq = is_instructional_job_inquiry(last_user_message)

        if not is_job_inq and (is_job_req or is_job_canc or (has_active_job and any(w in last_user_message.lower() for w in ("consigner", "consignee", "from", "to", "cargo", "weight", "packages", "ton", "mt", "box")))):
            reply_content, cards = await handle_conversational_job_booking(
                db=db,
                user=current_user,
                tenant=tenant,
                current_office=current_office,
                user_text=last_user_message,
                lang=detected_lang,
            )
            return ChatResponse(
                content=reply_content,
                navigation_suggestions=nav_suggestions,
                citations=[],
                cards=cards,
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

        # B. Hire Challan Workflow
        active_hc_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="hire_challan")
        has_active_hc = False
        if active_hc_id:
            d_hc = await lr_draft_store.get_draft(active_hc_id)
            if d_hc and not d_hc.is_confirmed:
                has_active_hc = True

        is_hc_req = is_hire_challan_intent(last_user_message)
        is_hc_canc = is_hc_cancel_intent(last_user_message)
        is_hc_inq = is_instructional_hc_inquiry(last_user_message)

        if not is_hc_inq and (is_hc_req or is_hc_canc or (has_active_hc and any(w in last_user_message.lower() for w in ("vehicle", "rate", "hire", "advance", "from", "to", "driver", "tds", "challan")))):
            reply_content, cards = await handle_conversational_hc_booking(
                db=db,
                user=current_user,
                tenant=tenant,
                current_office=current_office,
                user_text=last_user_message,
                lang=detected_lang,
            )
            return ChatResponse(
                content=reply_content,
                navigation_suggestions=nav_suggestions,
                citations=[],
                cards=cards,
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

        # C. LR / GR Booking Workflow
        active_d_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id, draft_type="lr")
        has_active_draft = False
        if active_d_id:
            existing_d = await lr_draft_store.get_draft(active_d_id)
            if existing_d and not existing_d.is_confirmed:
                has_active_draft = True

        is_booking = is_lr_booking_intent(last_user_message)
        is_cancel = is_cancel_intent(last_user_message)
        is_inquiry = is_instructional_inquiry(last_user_message)

        if not is_inquiry and (
            is_booking
            or is_cancel
            or (has_active_draft and any(w in last_user_message.lower() for w in ("consigner", "consignee", "vehicle", "freight", "from", "to", "delivery", "loading", "advance", "rate", "box", "ton", "party", "bilty")))
        ):
            reply_content, cards = await handle_conversational_lr_booking(
                db=db,
                user=current_user,
                tenant=tenant,
                current_office=current_office,
                user_text=last_user_message,
                lang=detected_lang,
            )
            return ChatResponse(
                content=reply_content,
                navigation_suggestions=nav_suggestions,
                citations=[],
                cards=cards,
                provider_configured=is_provider_configured(),
                detected_language=detected_lang,
            )

    # 3. Operational Intent Dispatch (Read-Only AI Tools)
    history_dicts = [{"role": m.role, "content": m.content} for m in data.messages[:-1]]
    op_intent = classify_operational_intent(last_user_message, conversation_history=history_dicts)
    if op_intent:
        if not db:
            reply_content = (
                "Operational database is currently connecting or unavailable."
                if detected_lang == "en"
                else "Operational database abhi connect ho raha hai ya unavailable hai."
            )
            cards = []
        else:
            tool_name = op_intent.get("tool")
            cards = []
            if tool_name == "client":
                reply_content, cards = await execute_client_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    is_count=op_intent.get("is_count", False),
                    limit=6,
                    lang=detected_lang,
                )
            elif tool_name == "vendor":
                reply_content, cards = await execute_vendor_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    is_count=op_intent.get("is_count", False),
                    limit=6,
                    lang=detected_lang,
                )
            elif tool_name == "job":
                reply_content, cards = await execute_job_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    is_detail=op_intent.get("is_detail", False),
                    is_today=op_intent.get("is_today", False),
                    is_count=op_intent.get("is_count", False),
                    is_latest=op_intent.get("is_latest", False),
                    field_focus=op_intent.get("field_focus"),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "lr":
                reply_content, cards = await execute_lr_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    vehicle_number=op_intent.get("vehicle_number"),
                    status_filter=op_intent.get("status_filter"),
                    is_detail=op_intent.get("is_detail", False),
                    is_latest=op_intent.get("is_latest", False),
                    field_focus=op_intent.get("field_focus"),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "hire_challan":
                reply_content, cards = await execute_hire_challan_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    vehicle_number=op_intent.get("vehicle_number"),
                    is_latest=op_intent.get("is_latest", False),
                    field_focus=op_intent.get("field_focus"),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "invoice":
                reply_content, cards = await execute_invoice_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    is_latest=op_intent.get("is_latest", False),
                    field_focus=op_intent.get("field_focus"),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "tracking":
                reply_content, cards = await execute_tracking_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    vehicle_number=op_intent.get("vehicle_number"),
                    lr_number=op_intent.get("lr_number"),
                    challan_number=op_intent.get("challan_number"),
                    lang=detected_lang,
                )
            elif tool_name == "accounting":
                reply_content, cards = await execute_accounting_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    party_name=op_intent.get("party_name"),
                    lang=detected_lang,
                )
            elif tool_name == "vehicle":
                reply_content, cards = await execute_vehicle_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    query=op_intent.get("query"),
                    vehicle_type=op_intent.get("vehicle_type"),
                    is_detail=op_intent.get("is_detail", False),
                    field_focus=op_intent.get("field_focus"),
                    limit=6,
                    lang=detected_lang,
                )
            elif tool_name == "driver":
                reply_content, cards = await execute_driver_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    query=op_intent.get("query"),
                    limit=6,
                    lang=detected_lang,
                )
            elif tool_name == "pod":
                reply_content, cards = await execute_pod_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    lr_number=op_intent.get("lr_number"),
                    is_pending=op_intent.get("is_pending", False),
                    is_count=op_intent.get("is_count", False),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "eway_bill":
                reply_content, cards = await execute_eway_bill_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    query=op_intent.get("query"),
                    vehicle_number=op_intent.get("vehicle_number"),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "branch":
                reply_content, cards = await execute_branch_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    query=op_intent.get("query"),
                    is_count=op_intent.get("is_count", False),
                    limit=10,
                    lang=detected_lang,
                )
            elif tool_name == "consigner_consignee":
                reply_content, cards = await execute_consigner_consignee_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    current_office=current_office,
                    party_type=op_intent.get("party_type", "consigner"),
                    query=op_intent.get("query"),
                    is_count=op_intent.get("is_count", False),
                    limit=6,
                    lang=detected_lang,
                )
            elif tool_name == "fleet_maintenance":
                reply_content, cards = await execute_fleet_maintenance_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    vehicle_number=op_intent.get("vehicle_number"),
                    doc_type=op_intent.get("doc_type"),
                    is_expiry_check=op_intent.get("is_expiry_check", False),
                    limit=5,
                    lang=detected_lang,
                )
            elif tool_name == "einvoice":
                reply_content, cards = await execute_einvoice_tool(
                    db=db,
                    user=current_user,
                    tenant=tenant,
                    query=op_intent.get("query"),
                    limit=5,
                    lang=detected_lang,
                )
            else:
                reply_content, cards = ("I couldn't process this operational request.", [])

        return ChatResponse(
            content=reply_content,
            navigation_suggestions=nav_suggestions,
            citations=[],
            cards=cards,
            provider_configured=is_provider_configured(),
            detected_language=detected_lang,
        )

    # 4. Check AI Provider configuration for general knowledge queries
    configured = is_provider_configured()
    if not configured:
        key_name = "NVIDIA_API_KEY" if settings.active_ai_provider == "nvidia" else "OPENAI_API_KEY"
        if detected_lang == "hi_devanagari":
            unconfigured_msg = (
                f"पैंथर एआई (Panther AI) वर्तमान में सेटअप मोड में है क्योंकि बैकएंड में `{key_name}` (या `OPENAI_API_KEY`) कॉन्फ़िगर नहीं है। "
                "लाइव एआई उत्तरों को सक्रिय करने के लिए कृपया अपने बैकएंड `.env` फ़ाइल में API Key सेट करें।"
            )
        elif detected_lang == "hinglish":
            unconfigured_msg = (
                f"Panther AI abhi setup mode mein hai kyunki backend environment mein `{key_name}` (ya `OPENAI_API_KEY`) configured nahi hai. "
                "Live AI responses activate karne ke liye kripya backend `.env` file mein apni API Key set karein."
            )
        else:
            unconfigured_msg = (
                f"Panther AI is currently in setup mode because `{key_name}` (or `OPENAI_API_KEY`) is not configured in the backend environment. "
                "To enable live assistant responses, please configure your AI provider API key in the backend `.env` file."
            )

        return ChatResponse(
            content=unconfigured_msg,
            navigation_suggestions=nav_suggestions,
            citations=[],
            cards=[],
            provider_configured=False,
            detected_language=detected_lang,
        )

    # 5. Retrieve Grounded RAG Knowledge filtered by tenant plan & user permissions
    plan_code = tenant.plan.code if tenant and tenant.plan else "PRO"
    permitted_categories = [m["id"].replace("-", "_") for m in authorized_catalog]
    rag_context, citations = knowledge_engine.format_grounded_context(
        query=last_user_message,
        plan_code=plan_code,
        user_permitted_categories=permitted_categories,
        top_k=3,
    )

    # 6. Build high-fidelity system prompt with live context & grounded RAG
    anon_ctx = anonymize_system_context(
        tenant_name=tenant.company_name or "PantherTMS Enterprise",
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role or "Operations",
        active_office_name=current_office.name if current_office else "All Offices (Consolidated)",
    )

    system_prompt = build_system_prompt(
        tenant_name=anon_ctx["tenant_name"],
        user_name=anon_ctx["user_name"],
        user_role=anon_ctx["user_role"],
        active_office_name=anon_ctx["active_office_name"],
        authorized_modules=authorized_catalog,
        current_page=data.page_context,
        grounded_rag_context=rag_context,
        target_language=detected_lang,
    )

    # 7. Call LLM
    try:
        safe_messages = sanitize_chat_history_for_external_llm(data.messages)
        raw_reply = await call_llm(
            messages=safe_messages,
            system_prompt=system_prompt,
        )
        reply_content = sanitize_ai_output(raw_reply)
    except Exception as e:
        err_msg = str(e)
        if "Quota Exceeded" in err_msg or "rate limit" in err_msg.lower():
            if detected_lang == "hi_devanagari":
                reply_content = "एआई सेवा वर्तमान में व्यस्त है (रेट लिमिट)। कृपया कुछ सेकंड बाद पुनः प्रयास करें। आपकी कंपनी के डेटा प्रश्न (जैसे क्लाइंट, वेंडर, ड्राइवर या एलआर) अभी भी उपलब्ध हैं।"
            elif detected_lang == "hinglish":
                reply_content = "AI provider abhi rate limited hai. Kripya kuch second baad dobara try karein. Aapke company database queries (jaise clients, vendors, drivers, LRs) bina kisi rukawat ke chalte rahenge."
            else:
                reply_content = "The AI assistant is temporarily rate-limited. Please retry in a few moments. Note that direct company records queries (clients, vendors, drivers, LRs) remain fully operational."
        else:
            reply_content = f"Sorry, I encountered an issue while processing your request: {err_msg}"

    return ChatResponse(
        content=reply_content,
        navigation_suggestions=nav_suggestions,
        citations=citations,
        cards=[],
        provider_configured=True,
        detected_language=detected_lang,
    )


@router.post("/stream")
async def stream_chat_with_copilot(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
    current_office: Optional[Branch] = Depends(get_current_office),
    db: Optional[AsyncSession] = Depends(get_ai_tenant_db),
):
    """
    Streaming SSE endpoint for progressive typing in the chat UI.
    """
    last_user_msg = next((m.content for m in reversed(data.messages) if m.role == "user"), "")
    detected_lang = detect_language(last_user_msg)

    # Operational intent check
    stream_history = [{"role": m.role, "content": m.content} for m in data.messages[:-1]]
    op_intent = classify_operational_intent(last_user_msg, conversation_history=stream_history)
    if op_intent:
        if not db:
            msg = "Operational data service is currently unavailable."
        else:
            tool_name = op_intent.get("tool")
            if tool_name == "client":
                msg, _ = await execute_client_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "vendor":
                msg, _ = await execute_vendor_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "job":
                msg, _ = await execute_job_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_detail=op_intent.get("is_detail", False), is_today=op_intent.get("is_today", False), is_count=op_intent.get("is_count", False), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "lr":
                msg, _ = await execute_lr_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"), status_filter=op_intent.get("status_filter"), is_detail=op_intent.get("is_detail", False), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "hire_challan":
                msg, _ = await execute_hire_challan_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "invoice":
                msg, _ = await execute_invoice_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), is_latest=op_intent.get("is_latest", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "tracking":
                msg, _ = await execute_tracking_tool(db, current_user, tenant, vehicle_number=op_intent.get("vehicle_number"), lr_number=op_intent.get("lr_number"), challan_number=op_intent.get("challan_number"), lang=detected_lang)
            elif tool_name == "accounting":
                msg, _ = await execute_accounting_tool(db, current_user, tenant, current_office, party_name=op_intent.get("party_name"), lang=detected_lang)
            elif tool_name == "vehicle":
                msg, _ = await execute_vehicle_tool(db, current_user, tenant, query=op_intent.get("query"), vehicle_type=op_intent.get("vehicle_type"), is_detail=op_intent.get("is_detail", False), field_focus=op_intent.get("field_focus"), lang=detected_lang)
            elif tool_name == "driver":
                msg, _ = await execute_driver_tool(db, current_user, tenant, query=op_intent.get("query"), lang=detected_lang)
            elif tool_name == "pod":
                msg, _ = await execute_pod_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), lr_number=op_intent.get("lr_number"), is_pending=op_intent.get("is_pending", False), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "eway_bill":
                msg, _ = await execute_eway_bill_tool(db, current_user, tenant, current_office, query=op_intent.get("query"), vehicle_number=op_intent.get("vehicle_number"), lang=detected_lang)
            elif tool_name == "branch":
                msg, _ = await execute_branch_tool(db, current_user, tenant, query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "consigner_consignee":
                msg, _ = await execute_consigner_consignee_tool(db, current_user, tenant, current_office, party_type=op_intent.get("party_type", "consigner"), query=op_intent.get("query"), is_count=op_intent.get("is_count", False), lang=detected_lang)
            elif tool_name == "fleet_maintenance":
                msg, _ = await execute_fleet_maintenance_tool(db, current_user, tenant, vehicle_number=op_intent.get("vehicle_number"), doc_type=op_intent.get("doc_type"), is_expiry_check=op_intent.get("is_expiry_check", False), lang=detected_lang)
            elif tool_name == "einvoice":
                msg, _ = await execute_einvoice_tool(db, current_user, tenant, query=op_intent.get("query"), lang=detected_lang)
            else:
                msg = "Processed operational request."

        async def op_stream():
            yield f"data: {msg}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            op_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    authorized_catalog = get_authorized_navigation_catalog(tenant=tenant, user=current_user)

    anon_ctx = anonymize_system_context(
        tenant_name=tenant.company_name or "PantherTMS Enterprise",
        user_name=current_user.full_name or current_user.email,
        user_role=current_user.role or "Operations",
        active_office_name=current_office.name if current_office else "All Offices (Consolidated)",
    )

    plan_code = tenant.plan.code if tenant and tenant.plan else "PRO"
    permitted_categories = [m["id"].replace("-", "_") for m in authorized_catalog]
    rag_context, _ = knowledge_engine.format_grounded_context(
        query=last_user_msg,
        plan_code=plan_code,
        user_permitted_categories=permitted_categories,
        top_k=3,
    )

    system_prompt = build_system_prompt(
        tenant_name=anon_ctx["tenant_name"],
        user_name=anon_ctx["user_name"],
        user_role=anon_ctx["user_role"],
        active_office_name=anon_ctx["active_office_name"],
        authorized_modules=authorized_catalog,
        current_page=data.page_context,
        grounded_rag_context=rag_context,
        target_language=detected_lang,
    )

    safe_messages = sanitize_chat_history_for_external_llm(data.messages)
    async def event_generator():
        async for token in stream_llm(messages=safe_messages, system_prompt=system_prompt):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



# ==============================================================================
# PHASE 3: TWO-STAGE CONFIRMATION & LR CREATION ENDPOINTS
# ==============================================================================

@router.get("/lr-draft/active")
async def get_active_lr_draft(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Retrieves current unconfirmed LR draft for the authenticated user and tenant."""
    draft_id = await lr_draft_store.get_active_draft_id(tenant.id, current_user.id)
    if not draft_id:
        return {"draft": None}
    draft = await lr_draft_store.get_draft(draft_id)
    if not draft or draft.is_confirmed:
        return {"draft": None}
    return {
        "draft_id": draft.draft_id,
        "is_valid": draft.is_valid,
        "missing_fields": draft.missing_fields,
        "data": draft.data,
        "preview_labels": draft.preview_labels,
        "can_confirm": draft.is_valid and bool(draft.confirmation_token),
    }


@router.delete("/lr-draft/active")
async def discard_active_lr_draft(
    current_user: User = Depends(get_current_user),
    tenant: Tenant = Depends(get_current_tenant),
):
    """Discards active LR draft for the authenticated user and tenant."""
    cleared = await lr_draft_store.clear_active_draft(tenant.id, current_user.id)
    return {"cleared": cleared}


def _build_lr_idempotent_response(data: dict) -> LRConfirmationResponse:
    lr_num = data["lr_number"]
    lr_id = data["lr_id"]
    freight = float(data.get("total_freight_amount", 0.0))
    balance = float(data.get("balance_amount", 0.0))
    v_num = data.get("vehicle_number", "Vehicle")
    off_name = data.get("office_name", "Default")

    success_card = StructuredCard(
        card_type="lr_created",
        title="LR Created Successfully",
        subtitle=f"LR Number: {lr_num}",
        badge={"text": "Created", "variant": "success"},
        metrics=[
            {"label": "LR Number", "value": lr_num},
            {"label": "Status", "value": "Booked"},
            {"label": "Vehicle", "value": v_num},
            {"label": "Total Freight", "value": f"₹{freight:,.2f}"},
            {"label": "Balance Due", "value": f"₹{balance:,.2f}"},
        ],
        items=[
            {
                "primary": f"LR {lr_num} • {v_num}",
                "secondary": f"Office: {off_name} • Confirmed & Booked",
                "amount": f"₹{freight:,.2f}",
                "status": "Created",
                "href": "/transport/lr-booking",
            }
        ],
        action={"label": "View in LR Register", "href": "/transport/lr-booking"},
    )

    return LRConfirmationResponse(
        success=True,
        lr_id=lr_id,
        lr_number=lr_num,
        message=f"Your LR {lr_num} has been created successfully in the transport register.",
        card=success_card,
    )


def _build_job_idempotent_response(data: dict) -> JobConfirmationResponse:
    job_num = data["job_number"]
    job_id = data["job_id"]
    c_name = data.get("consigner_name", "Consigner")
    ce_name = data.get("consignee_name", "Consignee")
    off_name = data.get("office_name", "Default")

    success_card = StructuredCard(
        card_type="job_created",
        title="Transport Job Created Successfully",
        subtitle=f"Job Number: {job_num}",
        badge={"text": "Created", "variant": "success"},
        metrics=[
            {"label": "Job Number", "value": job_num},
            {"label": "Status", "value": "OPEN"},
            {"label": "Consigner", "value": c_name},
            {"label": "Consignee", "value": ce_name},
            {"label": "Issuing Office", "value": off_name},
        ],
        items=[
            {
                "primary": f"Job {job_num} • {c_name} ➔ {ce_name}",
                "secondary": f"Office: {off_name} • Order Open",
                "amount": "OPEN",
                "status": "Created",
                "href": "/transport/jobs",
            }
        ],
        action={"label": "View in Job Register", "href": "/transport/jobs"},
    )

    return JobConfirmationResponse(
        success=True,
        job_id=job_id,
        job_number=job_num,
        message=f"Your Transport Job {job_num} has been created successfully.",
        card=success_card,
    )


def _build_hc_idempotent_response(data: dict) -> HireChallanConfirmationResponse:
    hc_num = data["challan_number"]
    hc_id = data["challan_id"]
    v_num = data.get("vehicle_number", "Vehicle")
    hr = float(data.get("hire_rate", 0.0))
    bal = float(data.get("balance_amount", 0.0))
    off_name = data.get("office_name", "Default")

    success_card = StructuredCard(
        card_type="hire_challan_created",
        title="Hire Challan Created Successfully",
        subtitle=f"Challan Number: {hc_num}",
        badge={"text": "Issued", "variant": "success"},
        metrics=[
            {"label": "Challan Number", "value": hc_num},
            {"label": "Status", "value": "ISSUED"},
            {"label": "Vehicle", "value": v_num},
            {"label": "Hire Rate", "value": f"₹{hr:,.2f}"},
            {"label": "Balance Due", "value": f"₹{bal:,.2f}"},
        ],
        items=[
            {
                "primary": f"Hire Challan {hc_num} • {v_num}",
                "secondary": f"Office: {off_name} • Issued & Hired",
                "amount": f"₹{hr:,.2f}",
                "status": "Created",
                "href": "/transport/hire-challans",
            }
        ],
        action={"label": "View in Hire Challans", "href": "/transport/hire-challans"},
    )

    return HireChallanConfirmationResponse(
        success=True,
        challan_id=hc_id,
        challan_number=hc_num,
        message=f"Your Hire Challan {hc_num} for vehicle {v_num} has been issued successfully.",
        card=success_card,
    )


# Backward compatibility alias
_build_idempotent_response = _build_lr_idempotent_response


# ==============================================================================
# CONFIRMATION ENDPOINTS: LR, JOB, & HIRE CHALLAN
# ==============================================================================

@router.post("/lr-draft/confirm", response_model=LRConfirmationResponse)
async def confirm_lr_draft(
    payload: ConfirmLRDraftRequest,
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Two-Stage Confirmation endpoint for conversational LR creation.
    Protected with distributed locking, double-layer idempotency (Redis + DB atomic table),
    content integrity validation, and quota enforcement.
    """
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable.",
        )

    # 1. Environment & Production Safety Gate
    is_prod = settings.ENVIRONMENT.lower() == "production"
    is_test_env = settings.ENVIRONMENT.lower() in ("development", "test", "testing")
    if is_prod and not settings.AI_ENABLE_LR_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted LR creation is disabled in production. Please use standard manual form at /transport/lr-booking.",
        )
    elif not is_test_env and not settings.AI_ENABLE_LR_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted LR creation is disabled. Please review draft in standard LR form at /transport/lr-booking.",
        )

    # 2. RBAC Permission Check
    from app.modules.ai.tools import is_user_permitted
    if not is_user_permitted(current_user, tenant, "transport", "lr_booking", "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Missing permission: transport.lr_booking.create",
        )

    # 3. Layer 1 Idempotency Check: Fast Redis / Cache Check
    cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
    if cached_op and cached_op.get("success"):
        return _build_lr_idempotent_response(cached_op)

    # 4. Layer 2 Idempotency Check: Durable Database Check
    from sqlalchemy import select
    from app.tenant_db.models import AIOperationIdempotency, UserActivity, LR
    op_id = f"lr_draft:{payload.draft_id}"

    try:
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        existing_op = (await db.execute(stmt_idem)).scalar_one_or_none()
        if existing_op and existing_op.status == "COMPLETED" and existing_op.response_payload:
            await lr_draft_store.record_confirmed_operation(payload.draft_id, existing_op.response_payload)
            return _build_lr_idempotent_response(existing_op.response_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Durable AI operation idempotency table ('ai_operation_idempotency') is not configured or migrated. Cannot safely proceed with write action: {str(e)}",
        )

    # 5. Acquire Distributed Concurrency Lock (Multi-Worker Safe)
    locked = await lr_draft_store.acquire_lock(payload.draft_id, ttl_ms=15000)
    if not locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmation is currently in progress by another request or worker. Please wait.",
        )

    try:
        cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
        if cached_op and cached_op.get("success"):
            return _build_lr_idempotent_response(cached_op)

        # 6. Recheck Monthly Plan Quota
        from app.modules.transport.router import check_entitlement_limit
        await check_entitlement_limit(tenant, db, "max_lrs_per_month")

        # 7. Retrieve Draft
        draft = await lr_draft_store.get_draft(payload.draft_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="LR draft not found or expired. Please start a new booking session.",
            )

        # 8. Token validation & Atomic Single-Use Burn with Content Integrity Check
        token_valid, reason = draft.consume_confirmation_token(
            token=payload.confirmation_token,
            tenant_id=tenant.id,
            user_id=current_user.id,
        )
        if not token_valid:
            if reason == "ALREADY_CONFIRMED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This draft has already been confirmed (LR: {draft.created_lr_number or 'Created'}).",
                )
            elif reason == "CONTENT_MODIFIED_SINCE_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Draft content has been modified since approval was generated. Please review and approve the updated draft.",
                )
            elif reason == "TOKEN_EXPIRED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation token has expired. Please review draft again to generate a new token.",
                )
            elif reason == "UNAUTHORIZED_TENANT_OR_USER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to confirm this draft.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid confirmation token.",
                )

        # 9. Validate against LRCreate Schema
        try:
            lr_create_obj = LRCreate(**draft.data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Draft schema validation failed: {str(e)}",
            )

        # 10. Execute authoritative create_lr service with auto_commit=False for single atomic transaction
        from app.modules.transport.service import create_lr
        target_office_id = draft.office_id or (current_office.id if current_office else None)
        try:
            lr = await create_lr(
                db=db,
                data=lr_create_obj,
                user_id=current_user.id,
                office_id=target_office_id,
                auto_commit=False,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create LR in database: {str(e)}",
            )

        # 11. Build confirmed response data
        eff_off_id = lr.issuing_office_id or target_office_id
        office_obj = await db.get(Branch, eff_off_id) if eff_off_id else current_office
        office_name = office_obj.name if office_obj else (current_office.name if current_office else None)
        office_code = office_obj.code if office_obj else (current_office.code if current_office else None)
        res_data = {
            "success": True,
            "lr_id": lr.id,
            "lr_number": lr.lr_number,
            "total_freight_amount": float(lr.total_freight_amount or 0),
            "balance_amount": float(lr.balance_amount or 0),
            "vehicle_number": lr.vehicle_number,
            "office_name": office_name,
        }

        # 12. Insert durable database idempotency record in SAME transaction
        idem_entry = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=tenant.id,
            user_id=current_user.id,
            operation_type="LR_CREATE",
            status="COMPLETED",
            entity_id=lr.id,
            entity_identifier=lr.lr_number,
            response_payload=res_data,
        )
        db.add(idem_entry)

        # 13. Log activity to audit trail in SAME transaction
        from app.services.activity_logger import log_activity
        await log_activity(
            db=db,
            user=current_user,
            action="LR_CREATED",
            module="transport",
            entity_type="LR",
            entity_id=str(lr.id),
            entity_identifier=lr.lr_number,
            office_id=lr.issuing_office_id or target_office_id,
            office_name=office_name,
            office_code=office_code,
            details_json={
                "created_via": "Panther AI Conversational Assistant",
                "draft_id": draft.draft_id,
                "operation_id": op_id,
                "lr_number": lr.lr_number,
                "vehicle_number": lr.vehicle_number,
                "total_freight_amount": float(lr.total_freight_amount or 0),
                "consigner_id": lr.consigner_id,
                "consignee_id": lr.consignee_id,
            },
        )

        # 14. ATOMIC SINGLE-TRANSACTION COMMIT: LR, Idempotency, and Audit commit together!
        await db.commit()
        await db.refresh(lr)

        # 15. Update Draft confirmation record and persist
        draft.created_lr_id = lr.id
        draft.created_lr_number = lr.lr_number
        await lr_draft_store.save_draft(draft)
        await lr_draft_store.record_confirmed_operation(payload.draft_id, res_data)
        await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="lr")

        return _build_lr_idempotent_response(res_data)

    finally:
        await lr_draft_store.release_lock(payload.draft_id)


@router.post("/job-draft/confirm", response_model=JobConfirmationResponse)
async def confirm_job_draft(
    payload: ConfirmJobDraftRequest,
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Two-Stage Confirmation endpoint for conversational Transport Job orders.
    Enforces atomic database-backed idempotency, RBAC, and payload validation.
    """
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable.",
        )

    # 1. Environment & Production Safety Gate
    is_prod = settings.ENVIRONMENT.lower() == "production"
    is_test_env = settings.ENVIRONMENT.lower() in ("development", "test", "testing")
    if is_prod and not settings.AI_ENABLE_JOB_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Job creation is disabled in production. Please use standard manual form at /transport/jobs.",
        )
    elif not is_test_env and not settings.AI_ENABLE_JOB_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Job creation is disabled. Please review draft in standard form at /transport/jobs.",
        )

    # 2. RBAC Permission Check
    from app.modules.ai.tools import is_user_permitted
    if not is_user_permitted(current_user, tenant, "transport", "jobs", "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Missing permission: transport.jobs.create",
        )

    # 3. Layer 1 Idempotency Check: Fast Redis / Cache Check
    cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
    if cached_op and cached_op.get("success"):
        return _build_job_idempotent_response(cached_op)

    # 4. Layer 2 Idempotency Check: Durable Database Check
    from sqlalchemy import select
    from app.tenant_db.models import AIOperationIdempotency, UserActivity, Job, Consigner, Consignee
    op_id = f"job_draft:{payload.draft_id}"

    try:
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        existing_op = (await db.execute(stmt_idem)).scalar_one_or_none()
        if existing_op and existing_op.status == "COMPLETED" and existing_op.response_payload:
            await lr_draft_store.record_confirmed_operation(payload.draft_id, existing_op.response_payload)
            return _build_job_idempotent_response(existing_op.response_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Durable AI operation idempotency table ('ai_operation_idempotency') is not configured or migrated. Cannot safely proceed with write action: {str(e)}",
        )

    # 5. Acquire Distributed Concurrency Lock
    locked = await lr_draft_store.acquire_lock(payload.draft_id, ttl_ms=15000)
    if not locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmation is currently in progress by another request or worker. Please wait.",
        )

    try:
        cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
        if cached_op and cached_op.get("success"):
            return _build_job_idempotent_response(cached_op)

        # 6. Retrieve Draft
        draft = await lr_draft_store.get_draft(payload.draft_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job draft not found or expired. Please start a new session.",
            )

        # 7. Token validation & Single-Use Burn with Content Integrity Check
        token_valid, reason = draft.consume_confirmation_token(
            token=payload.confirmation_token,
            tenant_id=tenant.id,
            user_id=current_user.id,
        )
        if not token_valid:
            if reason == "ALREADY_CONFIRMED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This draft has already been confirmed (Job: {draft.created_entity_number or 'Created'}).",
                )
            elif reason == "CONTENT_MODIFIED_SINCE_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Draft content has been modified since approval was generated. Please review and approve the updated draft.",
                )
            elif reason == "TOKEN_EXPIRED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation token has expired. Please review draft again to generate a new token.",
                )
            elif reason == "UNAUTHORIZED_TENANT_OR_USER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to confirm this draft.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid confirmation token.",
                )

        # 8. Validate against JobCreate Schema
        try:
            job_create_obj = JobCreate(**draft.data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Draft schema validation failed: {str(e)}",
            )

        # 9. Execute authoritative create_job service with auto_commit=False
        from app.modules.transport.service import create_job
        target_office_id = draft.office_id or (current_office.id if current_office else None)
        try:
            job = await create_job(
                db=db,
                data=job_create_obj,
                user_id=current_user.id,
                office_id=target_office_id,
                auto_commit=False,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Job in database: {str(e)}",
            )

        # 10. Build response data
        c_obj = await db.get(Consigner, job.consigner_id)
        ce_obj = await db.get(Consignee, job.consignee_id)
        eff_off_id = job.issuing_office_id or target_office_id
        office_obj = await db.get(Branch, eff_off_id) if eff_off_id else current_office
        office_name = office_obj.name if office_obj else (current_office.name if current_office else "Main Logistics Hub")
        res_data = {
            "success": True,
            "job_id": job.id,
            "job_number": job.job_number,
            "consigner_name": c_obj.name if c_obj else "Consigner",
            "consignee_name": ce_obj.name if ce_obj else "Consignee",
            "office_name": office_name,
        }

        # 11. Insert durable database idempotency record
        idem_entry = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=tenant.id,
            user_id=current_user.id,
            operation_type="JOB_CREATE",
            status="COMPLETED",
            entity_id=job.id,
            entity_identifier=job.job_number,
            response_payload=res_data,
        )
        db.add(idem_entry)

        # 12. Log activity to audit trail
        from app.services.activity_logger import log_activity
        await log_activity(
            db=db,
            user=current_user,
            action="JOB_CREATED",
            module="transport",
            entity_type="JOB",
            entity_id=str(job.id),
            entity_identifier=job.job_number,
            office_id=job.issuing_office_id or target_office_id,
            office_name=office_name,
            details_json={
                "created_via": "Panther AI Conversational Assistant",
                "draft_id": draft.draft_id,
                "operation_id": op_id,
                "job_number": job.job_number,
                "consigner_id": job.consigner_id,
                "consignee_id": job.consignee_id,
            },
        )

        # 13. ATOMIC COMMIT
        await db.commit()
        await db.refresh(job)

        # 14. Update Draft and Cache
        draft.created_entity_id = job.id
        draft.created_entity_number = job.job_number
        await lr_draft_store.save_draft(draft)
        await lr_draft_store.record_confirmed_operation(payload.draft_id, res_data)
        await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="job")

        return _build_job_idempotent_response(res_data)

    finally:
        await lr_draft_store.release_lock(payload.draft_id)


@router.post("/hire-challan-draft/confirm", response_model=HireChallanConfirmationResponse)
async def confirm_hire_challan_draft(
    payload: ConfirmHireChallanDraftRequest,
    current_user: User = Depends(get_current_user),
    current_office: Optional[Branch] = Depends(get_current_office),
    tenant: Tenant = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_ai_tenant_db),
):
    """
    Two-Stage Confirmation endpoint for conversational Hired Truck Challans.
    Preserves authoritative calculations and accounting rules, protected with atomic DB idempotency.
    """
    if not db:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is currently unavailable.",
        )

    # 1. Environment & Production Safety Gate
    is_prod = settings.ENVIRONMENT.lower() == "production"
    is_test_env = settings.ENVIRONMENT.lower() in ("development", "test", "testing")
    if is_prod and not settings.AI_ENABLE_HC_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Hire Challan creation is disabled in production. Please use standard manual form at /transport/hire-challans.",
        )
    elif not is_test_env and not settings.AI_ENABLE_HC_CREATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI-assisted Hire Challan creation is disabled. Please review draft in standard form at /transport/hire-challans.",
        )

    # 2. RBAC Permission Check
    from app.modules.ai.tools import is_user_permitted
    if not is_user_permitted(current_user, tenant, "transport", "hire_challan", "create"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Missing permission: transport.hire_challan.create",
        )

    # 3. Layer 1 Idempotency Check: Fast Redis / Cache Check
    cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
    if cached_op and cached_op.get("success"):
        return _build_hc_idempotent_response(cached_op)

    # 4. Layer 2 Idempotency Check: Durable Database Check
    from sqlalchemy import select
    from app.tenant_db.models import AIOperationIdempotency, UserActivity, HireChallan
    op_id = f"hc_draft:{payload.draft_id}"

    try:
        stmt_idem = select(AIOperationIdempotency).where(AIOperationIdempotency.operation_id == op_id)
        existing_op = (await db.execute(stmt_idem)).scalar_one_or_none()
        if existing_op and existing_op.status == "COMPLETED" and existing_op.response_payload:
            await lr_draft_store.record_confirmed_operation(payload.draft_id, existing_op.response_payload)
            return _build_hc_idempotent_response(existing_op.response_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Durable AI operation idempotency table ('ai_operation_idempotency') is not configured or migrated. Cannot safely proceed with write action: {str(e)}",
        )

    # 5. Acquire Distributed Concurrency Lock
    locked = await lr_draft_store.acquire_lock(payload.draft_id, ttl_ms=15000)
    if not locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Confirmation is currently in progress by another request or worker. Please wait.",
        )

    try:
        cached_op = await lr_draft_store.get_confirmed_operation(payload.draft_id)
        if cached_op and cached_op.get("success"):
            return _build_hc_idempotent_response(cached_op)

        # 6. Recheck Monthly Plan Quota for Hire Challans
        from app.modules.transport.router import check_entitlement_limit
        await check_entitlement_limit(tenant, db, "max_hire_challans_per_month")

        # 7. Retrieve Draft
        draft = await lr_draft_store.get_draft(payload.draft_id)
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hire Challan draft not found or expired. Please start a new session.",
            )

        # 8. Token validation & Single-Use Burn with Content Integrity Check
        token_valid, reason = draft.consume_confirmation_token(
            token=payload.confirmation_token,
            tenant_id=tenant.id,
            user_id=current_user.id,
        )
        if not token_valid:
            if reason == "ALREADY_CONFIRMED":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This draft has already been confirmed (Challan: {draft.created_entity_number or 'Created'}).",
                )
            elif reason == "CONTENT_MODIFIED_SINCE_APPROVAL":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Draft content has been modified since approval was generated. Please review and approve the updated draft.",
                )
            elif reason == "TOKEN_EXPIRED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Confirmation token has expired. Please review draft again to generate a new token.",
                )
            elif reason == "UNAUTHORIZED_TENANT_OR_USER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not have authorization to confirm this draft.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid confirmation token.",
                )

        # 9. Validate against HireChallanCreate Schema
        try:
            hc_create_obj = HireChallanCreate(**draft.data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Draft schema validation failed: {str(e)}",
            )

        # 10. Execute authoritative create_hire_challan service with auto_commit=False
        from app.modules.transport.service import create_hire_challan
        target_office_id = draft.office_id or (current_office.id if current_office else None)
        try:
            hc = await create_hire_challan(
                db=db,
                data=hc_create_obj,
                office_id=target_office_id,
                auto_commit=False,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Hire Challan in database: {str(e)}",
            )

        # 11. Build response data
        eff_off_id = hc.issuing_office_id or target_office_id
        office_obj = await db.get(Branch, eff_off_id) if eff_off_id else current_office
        office_name = office_obj.name if office_obj else (current_office.name if current_office else "Main Logistics Hub")
        res_data = {
            "success": True,
            "challan_id": hc.id,
            "challan_number": hc.challan_number,
            "vehicle_number": hc.vehicle_number,
            "hire_rate": float(hc.hire_rate or 0),
            "balance_amount": float(hc.balance_amount or 0),
            "office_name": office_name,
        }

        # 12. Insert durable database idempotency record
        idem_entry = AIOperationIdempotency(
            operation_id=op_id,
            tenant_id=tenant.id,
            user_id=current_user.id,
            operation_type="HIRE_CHALLAN_CREATE",
            status="COMPLETED",
            entity_id=hc.id,
            entity_identifier=hc.challan_number,
            response_payload=res_data,
        )
        db.add(idem_entry)

        # 13. Log activity to audit trail
        from app.services.activity_logger import log_activity
        await log_activity(
            db=db,
            user=current_user,
            action="HIRE_CHALLAN_CREATED",
            module="transport",
            entity_type="HIRE_CHALLAN",
            entity_id=str(hc.id),
            entity_identifier=hc.challan_number,
            office_id=hc.issuing_office_id or target_office_id,
            office_name=office_name,
            details_json={
                "created_via": "Panther AI Conversational Assistant",
                "draft_id": draft.draft_id,
                "operation_id": op_id,
                "challan_number": hc.challan_number,
                "vehicle_number": hc.vehicle_number,
                "hire_rate": float(hc.hire_rate or 0),
                "balance_amount": float(hc.balance_amount or 0),
            },
        )

        # 14. ATOMIC COMMIT
        await db.commit()
        await db.refresh(hc)

        # 15. Update Draft and Cache
        draft.created_entity_id = hc.id
        draft.created_entity_number = hc.challan_number
        await lr_draft_store.save_draft(draft)
        await lr_draft_store.record_confirmed_operation(payload.draft_id, res_data)
        await lr_draft_store.clear_active_draft(tenant.id, current_user.id, draft_type="hire_challan")

        return _build_hc_idempotent_response(res_data)

    finally:
        await lr_draft_store.release_lock(payload.draft_id)