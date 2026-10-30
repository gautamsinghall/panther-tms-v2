from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message text content")


class NavigationSuggestion(BaseModel):
    title: str
    href: str
    module: str
    feature: Optional[str] = None
    description: Optional[str] = None


class StructuredCard(BaseModel):
    card_type: str = Field(..., description="lr_list, lr_detail, vehicle_list, driver_list, tracking, ledger_summary, party_ledger, lr_draft, lr_created")
    title: str
    subtitle: Optional[str] = None
    badge: Optional[dict] = None
    metrics: List[dict] = Field(default_factory=list)
    items: List[dict] = Field(default_factory=list)
    action: Optional[dict] = None
    draft_id: Optional[str] = None
    confirmation_token: Optional[str] = None
    missing_fields: List[str] = Field(default_factory=list)
    can_confirm: bool = False


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1)
    page_context: Optional[str] = Field(default=None, description="Current page path e.g. /transport/lr-booking")
    active_office_id: Optional[int] = None


class ChatResponse(BaseModel):
    content: str
    navigation_suggestions: List[NavigationSuggestion] = Field(default_factory=list)
    citations: List[dict] = Field(default_factory=list)
    cards: List[StructuredCard] = Field(default_factory=list)
    provider_configured: bool = True
    detected_language: Optional[str] = "en"
    session_id: Optional[str] = None


class AIStatusResponse(BaseModel):
    is_configured: bool
    model: str
    system_name: str
    provider: str
    supported_languages: List[str] = ["English", "Hindi (हिन्दी)", "Hinglish"]


class ContextSuggestionResponse(BaseModel):
    page: str
    module_title: str
    suggestions: List[str]


class ConfirmLRDraftRequest(BaseModel):
    draft_id: str = Field(..., description="Unique draft identifier")
    confirmation_token: str = Field(..., description="Single-use confirmation token")


class LRConfirmationResponse(BaseModel):
    success: bool
    lr_id: int
    lr_number: str
    message: str
    card: StructuredCard


class ConfirmJobDraftRequest(BaseModel):
    draft_id: str = Field(..., description="Unique Job draft identifier")
    confirmation_token: str = Field(..., description="Single-use confirmation token")


class JobConfirmationResponse(BaseModel):
    success: bool
    job_id: int
    job_number: str
    message: str
    card: StructuredCard


class ConfirmHireChallanDraftRequest(BaseModel):
    draft_id: str = Field(..., description="Unique Hire Challan draft identifier")
    confirmation_token: str = Field(..., description="Single-use confirmation token")


class HireChallanConfirmationResponse(BaseModel):
    success: bool
    challan_id: int
    challan_number: str
    message: str
    card: StructuredCard
