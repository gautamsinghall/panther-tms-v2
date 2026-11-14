"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  Send,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  CheckCheck,
  Loader2,
  FileText,
  Truck,
  Briefcase,
  UserCheck,
  MapPin,
  CreditCard,
  Building2,
  IndianRupee,
  ChevronDown,
  Info,
  RotateCcw,
  Paperclip,
  Mic,
  MicOff,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice, getStoredAuth, getStoredNavigation } from "@/lib/auth";
import { usePantherAI } from "./panther-ai-context";

interface NavigationSuggestion {
  title: string;
  href: string;
  module: string;
  feature?: string;
  description?: string;
}

interface Citation {
  doc_id: string;
  title: string;
  source: string;
}

interface StructuredCard {
  card_type: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; variant?: "success" | "warning" | "neutral" | "danger" | "destructive" };
  metrics?: Array<{ label: string; value: string }>;
  items?: Array<{
    primary: string;
    secondary?: string;
    status?: string;
    amount?: string;
    balance?: string;
    date?: string;
    expiry?: string;
    href?: string;
  }>;
  action?: { label: string; href: string };
  draft_id?: string;
  confirmation_token?: string;
  missing_fields?: string[];
  can_confirm?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  navigationSuggestions?: NavigationSuggestion[];
  citations?: Citation[];
  cards?: StructuredCard[];
  providerConfigured?: boolean;
  timestamp: Date;
}

const INITIAL_WELCOME_MESSAGE: Message = {
  id: "welcome-1",
  role: "assistant",
  content:
    "👋 **Welcome to Parth AI!**\n\nI help with Panther TMS — tracking vehicles and shipments, invoices and balances, PODs, and learning how to use each screen. For creating jobs or booking LRs, please create them directly in the TMS forms for maximum accuracy — I don't create jobs or LRs in chat. I can also explain transport terms (LR, e-way bill, POD) when they help you do that work.\n\nAsk me in English, हिन्दी or Hinglish — for example, track an LR, track a vehicle, or check a ledger balance. If something is outside what I can do, I'll tell you what I can do instead, or connect you to support.\n\n**What would you like to do today?**",
  timestamp: new Date(),
};

// No.14 rebuild (P3): suggested prompts that change with the page the user is on.
// `label` is what the user sees; `text` is the exact message sent to the backend.
// Only prompts the user's role can actually use are shown (filtered at render time).
interface SuggestedPrompt {
  label: string;
  text: string;
  module?: string;
  feature?: string;
  // v3: when set, tapping the prompt navigates to href instead of sending
  // a chat message (used for "Book an LR" — chat LR booking is removed).
  href?: string;
}

function getSuggestedPrompts(pathname: string): SuggestedPrompt[] {
  if (pathname.startsWith("/transport/lr")) {
    return [
      { label: "Track LR", text: "Track my LR", module: "transport", feature: "lr_booking" },
      { label: "Pending PODs", text: "Show pending PODs", module: "transport", feature: "lr_booking" },
      { label: "How to create LR?", text: "How do I create an LR?" },
    ];
  }
  if (pathname.startsWith("/transport/job")) {
    return [
      { label: "Job List", text: "What is my job list?", module: "transport" },
      { label: "Pending LRs", text: "Show pending LRs", module: "transport" },
      { label: "Track Shipment", text: "Where is my shipment?", module: "transport" },
    ];
  }
  if (pathname.startsWith("/accounts") || pathname.startsWith("/general")) {
    return [
      { label: "View Ledger", text: "View Ledger", module: "accounts", feature: "master_ledger" },
      { label: "Pending Invoices", text: "Show my pending invoices", module: "accounts", feature: "master_ledger" },
      { label: "Check Balance", text: "What is my balance?", module: "accounts", feature: "master_ledger" },
    ];
  }
  if (pathname.startsWith("/transport/hire")) {
    return [
      { label: "Hire Challans", text: "Show hire challans", module: "transport" },
      { label: "Create Challan", text: "Create a hire challan", module: "transport" },
    ];
  }
  if (pathname.startsWith("/transport") || pathname.startsWith("/tracking")) {
    return [
      { label: "Track Vehicle", text: "Track a vehicle", module: "transport" },
      { label: "My Vehicles", text: "Show my vehicles", module: "transport" },
      { label: "Track Shipment", text: "Where is my shipment?", module: "transport" },
    ];
  }
  return [
    { label: "Track LR", text: "Track my LR", module: "transport", feature: "lr_booking" },
    { label: "View Ledger", text: "View Ledger", module: "accounts", feature: "master_ledger" },
    { label: "Pending PODs", text: "Show pending PODs", module: "transport", feature: "lr_booking" },
    { label: "Track Vehicle", text: "Track a vehicle", module: "transport" },
  ];
}

export function PantherAIPanel() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { isOpen, closeAI } = usePantherAI();

  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProviderConfigured, setIsProviderConfigured] = useState<boolean | null>(null);
  const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeDraftInfo, setActiveDraftInfo] = useState<{ draft_id: string; missing_fields: string[] } | null>(null);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const committedSpeechRef = useRef<Set<string>>(new Set());

  const stopSpeechRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    committedSpeechRef.current.clear();
    setIsListening(false);

    if (!recognition) return;

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // Recognition may already have ended.
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopSpeechRecognition();
    }
    return stopSpeechRecognition;
  }, [isOpen, stopSpeechRecognition]);

  // Restore saved panel size preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("panther_ai_panel_expanded");
      if (saved === "true") {
        setIsExpanded(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Clear any persisted chat messages on mount so chat is wiped automatically on refresh
  useEffect(() => {
    try {
      localStorage.removeItem("panther_ai_chat_messages");
    } catch {
      // ignore
    }
  }, []);

  const toggleSize = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("panther_ai_panel_expanded", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantMsgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);
  const lastUserMessageRef = useRef<string>("");
  const prevMessagesCountRef = useRef(messages.length);
  const lastScrolledMsgIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior,
          });
        }
      });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  // Smoothly scroll to the beginning (top) of a new assistant response
  const scrollToAssistantTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    const msgEl = lastAssistantMsgRef.current;
    if (!container || !msgEl) return;

    requestAnimationFrame(() => {
      const c = messagesContainerRef.current;
      const m = lastAssistantMsgRef.current;
      if (!c || !m) return;

      let targetTop: number;
      if (m.offsetParent === c) {
        targetTop = m.offsetTop - 12;
      } else {
        const containerRect = c.getBoundingClientRect();
        const msgRect = m.getBoundingClientRect();
        const scrollOffset = msgRect.top - containerRect.top;
        targetTop = c.scrollTop + scrollOffset - 12;
      }

      c.scrollTo({
        top: Math.max(0, targetTop),
        behavior,
      });
    });
  }, []);

  // Auto-scroll intelligently:
  // - When a new assistant response arrives, display the beginning at the top of the chat area (never jump to end)
  // - When user sends a message or when waiting/loading, scroll to bottom
  useEffect(() => {
    if (!isOpen) return;

    const lastMsg = messages[messages.length - 1];
    const isNewAssistantMsg =
      !isLoading &&
      lastMsg?.role === "assistant" &&
      lastMsg.id !== lastScrolledMsgIdRef.current &&
      messages.length > 1;

    if (isNewAssistantMsg) {
      lastScrolledMsgIdRef.current = lastMsg.id;
      // Always scroll to the top of the assistant response so the view is at the top of that message, not the end
      const timer1 = setTimeout(() => {
        scrollToAssistantTop("smooth");
      }, 50);
      const timer2 = setTimeout(() => {
        scrollToAssistantTop("smooth");
      }, 180);
      prevMessagesCountRef.current = messages.length;
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (isLoading || lastMsg?.role === "user") {
      scrollToBottom("smooth");
    }
    prevMessagesCountRef.current = messages.length;
  }, [isOpen, messages, isLoading, scrollToAssistantTop, scrollToBottom]);

  // Focus textarea when panel opens or when response completes so user can keep typing directly
  useEffect(() => {
    if (isOpen && !isLoading) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isLoading]);

  // Auto-resize textarea smoothly without layout jumps
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!input) {
      el.style.height = "36px";
      return;
    }
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollH, 36), 120)}px`;
  }, [input]);

  // Check provider status on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      try {
        const res = await apiClient<{ is_configured: boolean }>("/api/v1/ai/status");
        if (isMounted) {
          setIsProviderConfigured(res.is_configured);
        }
      } catch {
        if (isMounted) setIsProviderConfigured(false);
      }
    }

    async function checkDraft() {
      try {
        const res = await apiClient<{ draft_id?: string; missing_fields?: string[] }>("/api/v1/ai/lr-draft/active");
        if (isMounted) {
          if (res?.draft_id) {
            setActiveDraftInfo({ draft_id: res.draft_id, missing_fields: res.missing_fields || [] });
          } else {
            setActiveDraftInfo(null);
          }
        }
      } catch {
        if (isMounted) setActiveDraftInfo(null);
      }
    }

    if (isOpen) {
      fetchStatus();
      checkDraft();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Listen for office changes to clear/re-fetch active drafts
  useEffect(() => {
    const handleOfficeChanged = () => {
      setActiveDraftInfo(null);
      apiClient<{ draft_id?: string; missing_fields?: string[] }>("/api/v1/ai/lr-draft/active")
        .then((res) => {
          if (res?.draft_id) {
            setActiveDraftInfo({ draft_id: res.draft_id, missing_fields: res.missing_fields || [] });
          } else {
            setActiveDraftInfo(null);
          }
        })
        .catch(() => setActiveDraftInfo(null));
    };

    window.addEventListener("panther_office_changed", handleOfficeChanged);
    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChanged);
    };
  }, []);

  const canAccessModule = useCallback((modId: string, featId?: string) => {
    const auth = getStoredAuth();
    if (!auth || !auth.user) return true;
    const role = (auth.user.role || "").toUpperCase();
    if (["COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"].includes(role)) {
      return true;
    }
    const nav = getStoredNavigation();
    if (!nav || !Array.isArray(nav) || nav.length === 0) {
      return false;
    }
    const group = nav.find((g: any) => g.id === modId);
    if (!group) return false;
    if (!featId) return true;
    return Boolean(group.items?.some((it: any) => it.feature === featId || it.href?.includes(featId)));
  }, []);

  const isNavPermitted = useCallback((href: string) => {
    if (!href) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http:") || href.startsWith("https:")) return true;
    const auth = getStoredAuth();
    if (!auth || !auth.user) return true;
    const role = (auth.user.role || "").toUpperCase();
    if (["COMPANY_ADMIN", "ADMIN", "SUPER_ADMIN", "OWNER"].includes(role)) return true;
    const nav = getStoredNavigation();
    if (!nav || !Array.isArray(nav)) return false;
    const cleanHref = href.split("?")[0].split("#")[0];
    return nav.some((g: any) =>
      g.items?.some((it: any) => {
        if (!it.href) return false;
        const itClean = it.href.split("?")[0].split("#")[0];
        return cleanHref === itClean || cleanHref.startsWith(`${itClean}/`);
      })
    );
  }, []);

  const hasActiveDraft = Boolean(
    activeDraftInfo !== null ||
    messages.some((m) =>
      m.cards?.some(
        (c) =>
          ["lr_draft", "job_draft", "hire_challan_draft"].includes(c.card_type) &&
          !c.title.toLowerCase().includes("cancelled") &&
          c.badge?.text?.toLowerCase() !== "cancelled"
      )
    )
  );

  const handleNewChatClick = () => {
    if (hasActiveDraft) {
      setShowNewChatConfirm(true);
    } else {
      handlePerformNewChat();
    }
  };

  const handlePerformNewChat = async () => {
    setShowNewChatConfirm(false);
    try {
      await apiClient("/api/v1/ai/chat/clear", { method: "POST" });
    } catch {
      // ignore
    }
    setMessages([
      {
        ...INITIAL_WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ]);
    try {
      localStorage.removeItem("panther_ai_chat_messages");
    } catch {
      // ignore
    }
    setActiveDraftInfo(null);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const userUploadMsg: Message = {
      id: `user-up-${Date.now()}`,
      role: "user",
      content: `📄 Uploaded file: **${file.name}**`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userUploadMsg]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiClient<{
        success: boolean;
        message: string;
        card?: StructuredCard;
        missing_fields?: string[];
      }>("/api/v1/ai/upload-extract", {
        method: "POST",
        body: formData,
      });

      const assistantMsg: Message = {
        id: `asst-up-${Date.now()}`,
        role: "assistant",
        content: res.message || `Extracted details from ${file.name}.`,
        cards: res.card ? [res.card] : [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err?.message || "Failed to extract details from the uploaded document.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      stopSpeechRecognition();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = "en-IN";
      committedSpeechRef.current.clear();
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };
      recognition.onresult = (event: any) => {
        const finalTranscripts = Array.from(event.results)
          .slice(event.resultIndex)
          .filter((result: any) => result.isFinal)
          .map((result: any) => String(result[0]?.transcript || "").trim())
          .filter(Boolean)
          .filter((transcript) => {
            const normalized = transcript.toLocaleLowerCase().replace(/\s+/g, " ");
            if (committedSpeechRef.current.has(normalized)) return false;
            committedSpeechRef.current.add(normalized);
            return true;
          });

        if (finalTranscripts.length > 0) {
          const transcript = finalTranscripts.join(" ");
          setInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript}` : transcript;
          });
        }
      };
      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (e.error !== "no-speech") {
          setError(`Voice input error: ${e.error}`);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setError(err?.message || "Failed to start speech recognition.");
    }
  };

  // v3: richer page context for the backend page registry — pathname first
  // (so older backend parsing keeps working), then the page title, the open
  // record from the URL (e.g. ?lr_number=...), and the visible labels of the
  // first form on the page. Best effort only; never blocks sending.
  const buildPageContext = (): string => {
    const parts: string[] = [pathname];
    try {
      const title = typeof document !== "undefined" ? document.title?.trim() : "";
      if (title) parts.push(`title: ${title}`);
      const params = new URLSearchParams(window.location.search);
      const rec =
        params.get("lr_number") ||
        params.get("job_number") ||
        params.get("challan_number") ||
        params.get("vehicle_number") ||
        params.get("id");
      if (rec) parts.push(`open record: ${rec}`);
      const form = document.querySelector("form");
      if (form) {
        const labels = Array.from(form.querySelectorAll("label"))
          .map((l) => l.textContent?.trim())
          .filter((t): t is string => Boolean(t));
        const unique = Array.from(new Set(labels)).slice(0, 12);
        if (unique.length > 0) parts.push(`visible fields: ${unique.join(", ")}`);
      }
    } catch {
      // fall back to the bare pathname
    }
    return parts.join(" | ");
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (isSubmittingRef.current) return;
    const rawContent = textToSend !== undefined ? textToSend : input;
    const trimmed = rawContent.trim();
    if (!trimmed || isLoading) return;
    lastUserMessageRef.current = trimmed;

    isSubmittingRef.current = true;
    setError(null);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
      textareaRef.current.focus({ preventScroll: true });
    }

    const uniqueUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userMessage: Message = {
      id: uniqueUserId,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    scrollToBottom("smooth");

    try {
      const activeOffice = getActiveOffice();
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        page_context: buildPageContext(),
        active_office_id: activeOffice?.id,
      };

      const response = await apiClient<{
        content: string;
        navigation_suggestions: NavigationSuggestion[];
        citations?: Citation[];
        cards?: StructuredCard[];
        provider_configured: boolean;
        detected_language?: string;
      }>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIsProviderConfigured(response.provider_configured);

      const uniqueAsstId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const assistantMessage: Message = {
        id: uniqueAsstId,
        role: "assistant",
        content: response.content,
        navigationSuggestions: response.navigation_suggestions,
        citations: response.citations,
        cards: response.cards,
        providerConfigured: response.provider_configured,
        timestamp: new Date(),
      };

      const isCancellation =
        trimmed.toLowerCase() === "cancel" ||
        trimmed.toLowerCase() === "clear draft" ||
        trimmed.toLowerCase() === "discard draft" ||
        trimmed.toLowerCase() === "cancel draft" ||
        trimmed.toLowerCase() === "cancel lr" ||
        trimmed.toLowerCase() === "cancel booking" ||
        response.cards?.some(
          (c) =>
            c.title?.toLowerCase().includes("cancelled") ||
            c.badge?.text?.toLowerCase() === "cancelled" ||
            c.card_type === "lr_draft_cancelled"
        ) ||
        response.content.toLowerCase().includes("draft has been cancelled") ||
        response.content.toLowerCase().includes("draft cancel kar di") ||
        response.content.toLowerCase().includes("ड्राफ्ट रद्द");

      if (isCancellation) {
        setActiveDraftInfo(null);
        apiClient("/api/v1/ai/chat/clear", { method: "POST" }).catch(() => {});
        setMessages((prev) => {
          const updatedPrev = prev.map((msg) => {
            if (!msg.cards || msg.cards.length === 0) return msg;
            const remainingCards = msg.cards.filter(
              (card) => !["lr_draft", "job_draft", "hire_challan_draft", "lr_draft_cancelled"].includes(card.card_type)
            );
            return { ...msg, cards: remainingCards };
          });
          const cleanAssistantCards = (assistantMessage.cards || []).filter(
            (card) => !["lr_draft", "job_draft", "hire_challan_draft", "lr_draft_cancelled"].includes(card.card_type)
          );
          return [...updatedPrev, { ...assistantMessage, cards: cleanAssistantCards }];
        });
      } else {
        const draftCard = response.cards?.find(
          (c) => ["lr_draft", "job_draft", "hire_challan_draft"].includes(c.card_type) && !c.title.toLowerCase().includes("cancelled")
        );
        if (draftCard?.draft_id) {
          setActiveDraftInfo({ draft_id: draftCard.draft_id, missing_fields: draftCard.missing_fields || [] });
        }
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to reach Parth AI service. Please try again.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
      setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  };

  const handleConfirmDraft = async (draftId: string, token: string, cardType: string = "lr_draft") => {
    if (confirmingDraftId) return;
    setConfirmingDraftId(draftId);
    try {
      let endpoint = "/api/v1/ai/lr-draft/confirm";
      let entityName = "LR";
      if (cardType === "job_draft") {
        endpoint = "/api/v1/ai/job-draft/confirm";
        entityName = "Transport Job";
      } else if (cardType === "hire_challan_draft") {
        endpoint = "/api/v1/ai/hire-challan-draft/confirm";
        entityName = "Hire Challan";
      }

      const res = await apiClient<{
        success: boolean;
        lr_id?: number;
        lr_number?: string;
        job_id?: number;
        job_number?: string;
        challan_id?: number;
        challan_number?: string;
        message: string;
        card: StructuredCard;
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ draft_id: draftId, confirmation_token: token }),
      });

      if (res.success) {
        const assistantMsg: Message = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: res.message || `Your ${entityName} has been created successfully.`,
          cards: res.card ? [res.card] : [],
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to confirm and create record.");
    } finally {
      setConfirmingDraftId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter produces a newline naturally
        return;
      }
      if (e.nativeEvent.isComposing) {
        // IME composition in progress (e.g. Hindi or multilingual IME); do not submit
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleSendMessage();
      setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
      }, 10);
    }
  };

  const handleNavigate = (href: string) => {
    if (!href) return;
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("http:") || href.startsWith("https:")) {
      window.location.href = href;
      return;
    }
    try {
      router.push(href);
    } catch {
      window.location.href = href;
    }
    setTimeout(() => {
      if (typeof window !== "undefined") {
        const cur = window.location.pathname + window.location.search;
        if (cur !== href && href.startsWith("/")) {
          window.location.href = href;
        }
      }
    }, 120);
    if (window.innerWidth < 640) {
      closeAI();
    }
  };

  const handleFieldEdit = (field: string) => {
    setInput(`change ${field} to `);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleCancelActiveDraft = async () => {
    try {
      await apiClient("/api/v1/ai/chat/clear", { method: "POST" });
    } catch {
      // ignore
    }
    setActiveDraftInfo(null);
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.cards) return m;
        return {
          ...m,
          cards: m.cards.map((c) => {
            if (["lr_draft", "job_draft", "hire_challan_draft"].includes(c.card_type)) {
              return {
                ...c,
                card_type: "lr_draft_cancelled",
                title: "Draft Cancelled",
                badge: { text: "Cancelled", variant: "neutral" },
                can_confirm: false,
                confirmation_token: undefined,
              };
            }
            return c;
          }),
        };
      })
    );
  };

  // Helper to extract fields for draft mini-forms
  const parseDraftValues = (card: StructuredCard) => {
    let from = "";
    let to = "";
    let vehicle = "";
    let consigner = "";
    let consignee = "";
    let rateOrFreight = "";
    let weight = "";

    if (card.metrics) {
      card.metrics.forEach((m) => {
        const l = m.label.toLowerCase();
        if (l.includes("consigner")) consigner = m.value;
        if (l.includes("consignee")) consignee = m.value;
        if (l.includes("vehicle")) vehicle = m.value;
        if (l.includes("freight") || l.includes("hire rate") || l.includes("bhada") || l.includes("amount")) rateOrFreight = m.value;
        if (l.includes("weight")) weight = m.value;
        if (l.includes("route")) {
          const parts = m.value.split(/[➔\-\—]/);
          if (parts.length >= 2) {
            from = parts[0].trim();
            to = parts[1].trim();
          }
        }
      });
    }

    if (card.items && card.items.length > 0) {
      const it = card.items[0];
      if (it.primary && it.primary.includes("to")) {
        const routeMatch = it.primary.match(/^(.*?)\s+to\s+(.*?)(?:\s+\((.*?)\))?$/i);
        if (routeMatch) {
          if (!from) from = routeMatch[1].trim();
          if (!to) to = routeMatch[2].trim();
          if (!vehicle && routeMatch[3]) vehicle = routeMatch[3].trim();
        }
      }
      if (!rateOrFreight && it.amount) rateOrFreight = it.amount;
    }

    return {
      from: from && from !== "Not Specified" ? from : "",
      to: to && to !== "Not Specified" ? to : "",
      vehicle: vehicle && vehicle !== "Not Specified" ? vehicle : "",
      consigner: consigner && consigner !== "Not Specified" ? consigner : "",
      consignee: consignee && consignee !== "Not Specified" ? consignee : "",
      rateOrFreight,
      weight,
    };
  };

  if (!isOpen) {
    return null;
  }

  const activeOffice = getActiveOffice();

  return (
    <div
      role="dialog"
      aria-label="Parth AI Copilot"
      className={`fixed bottom-18 sm:bottom-[88px] right-3 left-3 sm:left-auto sm:right-6 z-50 rounded-2xl sm:rounded-3xl flex flex-col bg-white dark:bg-[#0F111D] border border-slate-200/90 dark:border-[#1E2235] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)] dark:shadow-[0_25px_65px_-15px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none ${
        isExpanded
          ? "sm:w-[780px] md:w-[860px] lg:w-[940px] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-3rem)] h-[calc(100dvh-5.5rem)] sm:h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(100dvh-7.5rem)]"
          : "sm:w-[440px] max-w-[calc(100vw-1.5rem)] h-[calc(100dvh-5.5rem)] sm:h-[620px] max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(100dvh-7rem)]"
      }`}
    >
      {/* 1. Header */}
      <div
        onDoubleClick={toggleSize}
        title="Double click to toggle size"
        className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0F111D] border-b border-slate-100 dark:border-[#1C2033] shrink-0 select-none cursor-default"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0B2A5B] flex items-center justify-center shrink-0 shadow-2xs">
            <img src="/panther-ai-icon.png" alt="Parth AI" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none">
              Parth AI
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-1 leading-none truncate">
              {activeOffice ? `${activeOffice.name} • Your logistics copilot` : "Your logistics copilot"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Online Status Pill */}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mr-1.5 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse motion-reduce:animate-none" />
            Online
          </span>

          <button
            type="button"
            onClick={handleNewChatClick}
            aria-label="New Chat"
            title="New Chat / Clear Draft"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={closeAI}
            aria-label="Minimize"
            title="Minimize"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={toggleSize}
            aria-label={isExpanded ? "Decrease size (Restore)" : "Increase size (Expand)"}
            title={isExpanded ? "Decrease size (Restore)" : "Increase size (Expand)"}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={closeAI}
            aria-label="Close"
            title="Close"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confirmation Modal for New Chat */}
      {showNewChatConfirm && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161928] border border-slate-200 dark:border-[#252A42] rounded-2xl p-4 shadow-xl max-w-sm w-full space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Start a new chat?</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Start a new chat? Your current LR draft will be cancelled.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#252A42]">
              <button
                type="button"
                onClick={() => setShowNewChatConfirm(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Keep Draft
              </button>
              <button
                type="button"
                onClick={handlePerformNewChat}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs cursor-pointer"
              >
                Cancel Draft & Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Suggested Action Shortcuts (moved from bottom) */}
      {(() => {
        const prompts = getSuggestedPrompts(pathname).filter(
          (p) => !p.module || canAccessModule(p.module, p.feature)
        );
        if (prompts.length === 0) return null;

        const getPromptIcon = (label: string) => {
          const l = label.toLowerCase();
          if (l.includes("ledger") || l.includes("balance") || l.includes("invoice")) {
            return <CreditCard className="w-3 h-3 text-emerald-500 shrink-0" />;
          }
          if (l.includes("pod") || l.includes("challan") || l.includes("job") || l.includes("list")) {
            return <FileText className="w-3 h-3 text-purple-500 shrink-0" />;
          }
          if (l.includes("track") || l.includes("vehicle") || l.includes("shipment") || l.includes("lr")) {
            return <Truck className="w-3 h-3 text-blue-500 shrink-0" />;
          }
          return <FileText className="w-3 h-3 text-indigo-500 shrink-0" />;
        };

        return (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-slate-100 dark:border-[#1C2033] bg-slate-50/50 dark:bg-[#111322] shrink-0">
            {prompts.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => (p.href ? handleNavigate(p.href) : handleSendMessage(p.text))}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer select-none bg-white dark:bg-[#161928] hover:bg-indigo-50/70 dark:hover:bg-[#1E233A] text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-[#252A42] shadow-2xs disabled:cursor-not-allowed shrink-0"
              >
                {getPromptIcon(p.label)}
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Active Draft Session Indicator Banner */}
      {activeDraftInfo && (
        <div className="px-3.5 py-2 bg-indigo-50/90 dark:bg-indigo-950/50 border-b border-indigo-200/80 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block shrink-0" />
            <span className="truncate text-[11px] font-medium">
              LR draft session active ({activeDraftInfo.missing_fields?.length || 0} fields needed)
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await apiClient("/api/v1/ai/lr-draft/active", { method: "DELETE" });
              } catch {}
              setActiveDraftInfo(null);
              handleSendMessage("cancel");
            }}
            className="px-2 py-0.5 rounded text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
          >
            Discard
          </button>
        </div>
      )}

      {/* Setup Mode Notice (If OpenAI Key Not Set) */}
      {isProviderConfigured === false && (
        <div className="px-3 py-1.5 bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Setup mode: the AI provider is not configured in the backend. Ask your admin to configure it for live AI.
          </span>
        </div>
      )}

      {/* 3. Message Stream Canvas */}
      <div
        ref={messagesContainerRef}
        className="relative flex-1 min-h-0 w-full max-w-full overflow-y-auto overflow-x-hidden px-4 pt-4 pb-8 space-y-4 bg-white dark:bg-[#0F111D] no-scrollbar overscroll-contain"
      >
        {messages.map((msg, idx) => {
          const isLatestAssistant = idx === messages.length - 1 && msg.role === "assistant";
          return (
            <div
              key={msg.id}
              ref={isLatestAssistant ? lastAssistantMsgRef : null}
              className={`flex flex-col w-full min-w-0 max-w-full ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
            {msg.role === "user" ? (
              // User Bubble
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-[#5B50E6] text-white text-xs sm:text-[13px] leading-relaxed shadow-xs break-words [overflow-wrap:anywhere]">
                <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</div>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-indigo-200 font-mono">
                  <span>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-200 shrink-0 select-none" aria-hidden="true" />
                </div>
              </div>
            ) : (
              // Assistant Bubble
              <div className="flex items-start gap-2.5 w-full min-w-0 max-w-full">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0B2A5B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <img src="/panther-ai-icon.png" alt="Parth AI" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0 max-w-full rounded-2xl rounded-tl-xs px-4 py-3 bg-slate-50 dark:bg-[#181B2B] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#262B44] text-xs sm:text-[13px] leading-relaxed shadow-xs space-y-2 break-words [overflow-wrap:anywhere] overflow-x-hidden">
                  {/* Assistant Text Content */}
                  <div className="whitespace-pre-wrap space-y-1.5 font-normal break-words [overflow-wrap:anywhere] min-w-0">
                    {msg.content.split("\n\n").map((para, pIdx) => {
                      const parts = para.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={pIdx}>
                          {parts.map((part, partIdx) => {
                            if (part.startsWith("**") && part.endsWith("**")) {
                              return (
                                <strong
                                  key={partIdx}
                                  className="font-semibold text-slate-900 dark:text-white"
                                >
                                  {part.slice(2, -2)}
                                </strong>
                              );
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Grounded Citations — hidden from UI */}

                  {/* 4. Intelligent Workflow Cards */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {msg.cards.map((card, cIdx) => {
                        const isDraft = ["lr_draft", "job_draft", "hire_challan_draft"].includes(
                          card.card_type
                        );
                        const isCreated = [
                          "lr_created",
                          "job_created",
                          "hire_challan_created",
                        ].includes(card.card_type);
                        const isCancelled =
                          card.title.toLowerCase().includes("cancelled") ||
                          card.title.toLowerCase().includes("discarded") ||
                          (card.badge &&
                            ["cancelled", "discarded"].includes(card.badge.text.toLowerCase()));

                        const draftValues = parseDraftValues(card);
                        const missingCount = card.missing_fields ? card.missing_fields.length : 0;

                        // Case A: Draft Card (Matching Reference Screenshot)
                        if (isDraft) {
                          const titleText =
                            card.card_type === "job_draft"
                              ? "New Transport Job • Draft"
                              : card.card_type === "hire_challan_draft"
                              ? "New Hire Challan • Draft"
                              : "New LR • Draft";

                          const openFormHref =
                            card.card_type === "job_draft"
                              ? "/transport/job-orders"
                              : card.card_type === "hire_challan_draft"
                              ? "/transport/hire-challan"
                              : "/transport/lr-booking";

                          const openFormLabel =
                            card.card_type === "job_draft"
                              ? "Open Job Form"
                              : card.card_type === "hire_challan_draft"
                              ? "Open Challan Form"
                              : "Open LR Form";

                          const confirmLabel =
                            card.card_type === "job_draft"
                              ? "Confirm & Create Job"
                              : card.card_type === "hire_challan_draft"
                              ? "Confirm & Create Hire Challan"
                              : "Confirm & Create LR";

                          const isCancelled =
                            card.badge?.text?.toLowerCase() === "cancelled" ||
                            card.title?.toLowerCase().includes("cancelled") ||
                            card.subtitle?.toLowerCase().includes("cancelled") ||
                            card.card_type === "lr_draft_cancelled";

                          if (isCancelled) {
                            return (
                              <div
                                key={cIdx}
                                className="rounded-2xl p-3.5 bg-slate-50 dark:bg-[#141727] border border-slate-200 dark:border-[#252B46] shadow-2xs space-y-2 select-none"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                                      {card.title || "LR Booking • Draft Cancelled"}
                                    </h4>
                                  </div>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0">
                                    Cancelled
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Cancelled — no LR was created
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={cIdx}
                              className="rounded-2xl p-3.5 bg-white dark:bg-[#141727] border border-slate-200/90 dark:border-[#252B46] shadow-2xs space-y-3"
                            >
                              {/* Header */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {card.card_type === "job_draft" ? (
                                    <Briefcase className="w-4 h-4 text-[#5B50E6] dark:text-violet-400" />
                                  ) : card.card_type === "hire_challan_draft" ? (
                                    <Truck className="w-4 h-4 text-[#5B50E6] dark:text-violet-400" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-[#5B50E6] dark:text-violet-400" />
                                  )}
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {titleText}
                                  </h4>
                                  <span className="sr-only">LR Draft Job Draft Hire Challan Draft</span>
                                </div>

                                {card.can_confirm ? (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                    ✓ Ready to confirm
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 flex items-center gap-1">
                                    <span>⚠️</span>
                                    <span>{missingCount > 0 ? `${missingCount} fields remaining` : "Draft: Incomplete"}</span>
                                  </span>
                                )}
                              </div>

                              {/* Form Field Mini Rows */}
                              <div className="space-y-2 pt-1 text-xs">
                                {/* From Field */}
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                    From *
                                  </span>
                                  <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate font-medium">
                                        {draftValues.from || "Select origin"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleFieldEdit("origin")}
                                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                {/* To Field */}
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                    To *
                                  </span>
                                  <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate font-medium">
                                        {draftValues.to || "Select destination"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleFieldEdit("destination")}
                                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                {/* Consigner Field */}
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                    Consigner *
                                  </span>
                                  <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate font-medium">
                                        {draftValues.consigner || "Select consigner"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleFieldEdit("consigner")}
                                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                {/* Consignee Field */}
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                    Consignee *
                                  </span>
                                  <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate font-medium">
                                        {draftValues.consignee || "Select consignee"}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleFieldEdit("consignee")}
                                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </div>

                                {/* Vehicle Field (for LR and Hire Challan) */}
                                {card.card_type !== "job_draft" && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                      Vehicle *
                                    </span>
                                    <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate font-medium">
                                          {draftValues.vehicle || "Select vehicle"}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleFieldEdit("vehicle")}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Freight / Rate Field */}
                                {draftValues.rateOrFreight && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                      Freight
                                    </span>
                                    <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                      <span className="truncate font-semibold font-mono text-[11px]">
                                        {draftValues.rateOrFreight}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleFieldEdit("freight")}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Weight Field */}
                                {draftValues.weight && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium w-16 shrink-0">
                                      Weight
                                    </span>
                                    <div className="flex-1 bg-slate-50 dark:bg-[#1A1E31] border border-slate-200 dark:border-[#2D3452] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-slate-800 dark:text-slate-100">
                                      <span className="truncate font-semibold font-mono text-[11px]">
                                        {draftValues.weight}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleFieldEdit("weight")}
                                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold shrink-0 cursor-pointer px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 ml-1"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Missing Fields Indicator Tag */}
                              {card.missing_fields && card.missing_fields.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                    Missing:
                                  </span>
                                  {card.missing_fields.map((mf, mfIdx) => (
                                    <span
                                      key={mfIdx}
                                      className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium"
                                    >
                                      {mf}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Card Action Buttons Row */}
                              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#252B46]">
                                <button
                                  type="button"
                                  onClick={handleCancelActiveDraft}
                                  className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1 shrink-0"
                                  title="Cancel active draft"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Cancel Draft</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleNavigate(openFormHref)}
                                  className="flex-1 py-2 px-3 rounded-xl bg-[#5B50E6] hover:bg-[#4E43D8] text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer text-center truncate"
                                >
                                  {openFormLabel}
                                </button>

                                {card.can_confirm && card.confirmation_token && card.draft_id ? (
                                  <button
                                    type="button"
                                    disabled={confirmingDraftId === card.draft_id}
                                    onClick={() =>
                                      handleConfirmDraft(
                                        card.draft_id!,
                                        card.confirmation_token!,
                                        card.card_type
                                      )
                                    }
                                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                                  >
                                    {confirmingDraftId === card.draft_id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Creating...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{confirmLabel}</span>
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-[#1A1E31] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2D3452] font-medium text-xs cursor-not-allowed text-center select-none"
                                  >
                                    Review Draft
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Case B: Record Created Successfully Card
                        if (isCreated) {
                          const navRegisterHref =
                            card.card_type === "job_created"
                              ? "/transport/job-orders"
                              : card.card_type === "hire_challan_created"
                              ? "/transport/hire-challan"
                              : "/transport/lr-booking";

                          const navRegisterLabel =
                            card.card_type === "job_created"
                              ? "View in Job Register →"
                              : card.card_type === "hire_challan_created"
                              ? "View in Hire Challans →"
                              : "View in LR Register →";

                          return (
                            <div
                              key={cIdx}
                              className="rounded-2xl p-3.5 bg-white dark:bg-[#141727] border border-emerald-500/30 dark:border-emerald-500/40 shadow-2xs space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {card.title}
                                  </h4>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                  {card.badge?.text || "Created"}
                                </span>
                              </div>

                              {/* Metrics */}
                              {card.metrics && card.metrics.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                  {card.metrics.map((m, mIdx) => (
                                    <div
                                      key={mIdx}
                                      className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A1E31] border border-slate-200/60 dark:border-[#2D3452]"
                                    >
                                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        {m.label}
                                      </div>
                                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                                        {m.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Navigation Link Button */}
                              <div className="pt-2 border-t border-slate-100 dark:border-[#252B46]">
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(navRegisterHref)}
                                  className="w-full py-2 px-3 rounded-xl bg-[#5B50E6] hover:bg-[#4E43D8] text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer text-center"
                                >
                                  {navRegisterLabel}
                                </button>
                              </div>
                            </div>
                          );
                        }

                        // Case C: Cancelled / Discarded Card
                        if (isCancelled) {
                          return (
                            <div
                              key={cIdx}
                              className="rounded-2xl p-3.5 bg-white dark:bg-[#141727] border border-slate-200 dark:border-[#252B46] shadow-2xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {card.title}
                                </h4>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                                  Cancelled
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {card.subtitle || "Draft session cleared. State reset."}
                              </p>
                            </div>
                          );
                        }

                        // Case D0: Tracking Timeline Card
                        if (
                          card.card_type === "tracking_timeline" ||
                          (card.card_type === "tracking" &&
                            card.items &&
                            card.items.length >= 3 &&
                            card.items[0]?.primary?.startsWith("Origin"))
                        ) {
                          return (
                            <div
                              key={cIdx}
                              className="rounded-2xl p-3.5 bg-white dark:bg-[#141727] border border-blue-500/30 dark:border-blue-500/40 shadow-2xs space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Truck className="w-4 h-4 text-blue-500 shrink-0" />
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {card.title}
                                  </h4>
                                </div>
                                {card.badge && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                    {card.badge.text}
                                  </span>
                                )}
                              </div>

                              {/* Metrics */}
                              {card.metrics && card.metrics.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 text-xs">
                                  {card.metrics.map((m, mIdx) => (
                                    <div
                                      key={mIdx}
                                      className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#1A1E31] border border-slate-200/60 dark:border-[#2D3452]"
                                    >
                                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                        {m.label}
                                      </div>
                                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                        {m.value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Vertical Timeline */}
                              <div className="relative pl-6 space-y-3 pt-1 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#262B44]">
                                {card.items?.map((it, idx) => {
                                  const isDone = it.status === "Completed";
                                  const isCurrent = it.status === "In Progress";
                                  return (
                                    <div key={idx} className="relative">
                                      <div
                                        className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 ${
                                          isDone
                                            ? "bg-emerald-500 border-emerald-500"
                                            : isCurrent
                                            ? "bg-blue-500 border-white dark:border-[#141727] ring-2 ring-blue-500 animate-pulse"
                                            : "bg-white dark:bg-[#1A1E31] border-slate-300 dark:border-slate-600"
                                        }`}
                                      />
                                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                        {it.primary}
                                      </div>
                                      {it.secondary && (
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                          {it.secondary}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {card.action && isNavPermitted(card.action.href) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const tgt = card.action?.href || msg.navigationSuggestions?.[0]?.href || "";
                                    if (tgt) handleNavigate(tgt);
                                  }}
                                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <span>{card.action.label}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        }

                        // Case D: General Structured Card (Ledgers, Tracking, Lists)
                        if (card.card_type === "lr_booking_prompt" && !canAccessModule("transport", "lr_booking")) {
                          return null;
                        }

                        return (
                          <div
                            key={cIdx}
                            className="rounded-2xl p-3.5 bg-white dark:bg-[#141727] border border-slate-200 dark:border-[#252B46] shadow-2xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {card.title}
                              </h4>
                              {card.badge && (
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 shrink-0">
                                  {card.badge.text}
                                </span>
                              )}
                            </div>

                            {card.metrics && card.metrics.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5 pt-1">
                                {card.metrics.map((m, mIdx) => (
                                  <div
                                    key={mIdx}
                                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#1A1E31] border border-slate-200/60 dark:border-[#2D3452]"
                                  >
                                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                      {m.label}
                                    </div>
                                    <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                      {m.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {card.items && card.items.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {card.items.map((it, itIdx) => (
                                  <div
                                    key={itIdx}
                                    onClick={() => {
                                      if (it.href && isNavPermitted(it.href)) handleNavigate(it.href);
                                    }}
                                    className={`p-2 rounded-xl bg-slate-50 dark:bg-[#1A1E31] border border-slate-200/60 dark:border-[#2D3452] text-xs ${
                                      it.href && isNavPermitted(it.href)
                                        ? "cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-100/80 dark:hover:bg-[#20253d] transition-all"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                                        {it.primary}
                                      </span>
                                      {it.amount && (
                                        <span className="font-bold text-[#5B50E6] dark:text-violet-400 shrink-0 font-mono text-[11px]">
                                          {it.amount}
                                        </span>
                                      )}
                                    </div>
                                    {it.secondary && (
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                        {it.secondary}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {card.action && isNavPermitted(card.action.href) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const tgt = card.action?.href || msg.navigationSuggestions?.[0]?.href || "";
                                  if (tgt) handleNavigate(tgt);
                                }}
                                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <span>{card.action.label}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Navigation Suggestions */}
                  {(() => {
                    const permittedSuggestions = (msg.navigationSuggestions || []).filter((nav) => isNavPermitted(nav.href));
                    if (permittedSuggestions.length === 0) return null;
                    return (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#262B44] space-y-1.5">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                          Authorized Navigation:
                        </span>
                        {permittedSuggestions.map((nav, nIdx) => (
                          <div
                            key={nIdx}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#141727] border border-slate-200/60 dark:border-[#262B44] min-w-0 w-full"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                                {nav.title}
                              </p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                                {nav.module} • {nav.href}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNavigate(nav.href)}
                              className="px-2.5 py-1 bg-[#5B50E6] hover:bg-[#4E43D8] text-white rounded-lg text-[10px] font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <span>Open</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {msg.role === "assistant" && (
              <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-mono">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5 max-w-[95%]">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[#0B2A5B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <img src="/panther-ai-icon.png" alt="Parth AI" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#181B2B] rounded-2xl rounded-tl-xs border border-slate-200/80 dark:border-[#262B44] text-xs text-slate-500 dark:text-slate-400 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="font-medium">Parth AI is typing...</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => {
              if (lastUserMessageRef.current) handleSendMessage(lastUserMessageRef.current);
            }}
              className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} className="h-6 shrink-0" />
      </div>

      {/* 5. Sticky Composer Area */}
      <div className="p-3 bg-white dark:bg-[#0F111D] border-t border-slate-100 dark:border-[#1C2033] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSendMessage();
          }}
          className="relative flex items-end bg-white dark:bg-[#141727] rounded-2xl border border-slate-200 dark:border-[#252B46] p-1.5 focus-within:border-[#5B50E6] dark:focus-within:border-[#5B50E6] focus-within:ring-1 focus-within:ring-[#5B50E6] transition-all shadow-2xs"
        >
          {/* Hidden File Input for document upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
            className="hidden"
          />

          {/* Paperclip upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            title="Attach document or invoice (PDF/Image/Text)"
            className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E2235] text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed mb-0.5"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#5B50E6]" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          {/* Mic voice input button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            disabled={isLoading}
            title={isListening ? "Stop listening" : "Speak to Parth AI"}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer mb-0.5 ${
              isListening
                ? "bg-rose-500 text-white animate-pulse shadow-sm"
                : "hover:bg-slate-100 dark:hover:bg-[#1E2235] text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... speak now" : "Ask Parth AI... (Shift+Enter for newline)"}
            className="flex-1 min-h-[36px] max-h-[120px] bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-hidden px-2 py-2 leading-relaxed overflow-y-auto"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="w-8 h-8 rounded-xl bg-[#5B50E6] hover:bg-[#4E43D8] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-2xs mb-0.5"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Disclaimer Note */}
        <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Review details before confirming.</span>
          </div>
          <button
            type="button"
            onClick={() => handleSendMessage("I need help from a human — please connect me to support")}
            disabled={isLoading}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            Talk to support
          </button>
        </div>
      </div>
    </div>
  );
}
