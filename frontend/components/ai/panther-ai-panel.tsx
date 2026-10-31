"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  Minus,
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
  Layers,
  Building2,
  IndianRupee,
  ChevronDown,
  Info,
  RotateCcw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
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

export function PantherAIPanel() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { isOpen, closeAI } = usePantherAI();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am **Panther AI**, your TMS copilot. You can ask me how to manage **LRs/GRs, Hire Challans, Vehicles, Drivers, FASTag & SIM tracking**, or **Master Ledgers**.\n\nI speak **English, हिन्दी (Devanagari)**, and **Hinglish**! Feel free to talk naturally.",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProviderConfigured, setIsProviderConfigured] = useState<boolean | null>(null);
  const [confirmingDraftId, setConfirmingDraftId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, messages, scrollToBottom]);

  // Auto-resize textarea smoothly without layout jumps
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 36), 120)}px`;
    }
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
    if (isOpen) fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    if (isSubmittingRef.current) return;
    const rawContent = textToSend !== undefined ? textToSend : input;
    const trimmed = rawContent.trim();
    if (!trimmed || isLoading) return;

    isSubmittingRef.current = true;
    setError(null);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
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

    try {
      const activeOffice = getActiveOffice();
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        page_context: pathname,
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

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg = err?.message || "Failed to reach Panther AI service. Please try again.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
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
    }
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    if (window.innerWidth < 640) {
      closeAI();
    }
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
        if (l.includes("freight") || l.includes("hire rate")) rateOrFreight = m.value;
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
      aria-label="Panther AI Copilot"
      className="fixed bottom-[88px] right-6 z-50 w-[410px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-105px)] rounded-3xl flex flex-col bg-white dark:bg-[#0F111D] border border-slate-200/90 dark:border-[#1E2235] shadow-[0_20px_60px_-15px_rgba(79,70,229,0.15)] dark:shadow-[0_25px_65px_-15px_rgba(0,0,0,0.85)] overflow-hidden transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#0F111D] border-b border-slate-100 dark:border-[#1C2033] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-[#5B50E6] dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/20 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none">
              Panther AI
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
            onClick={closeAI}
            aria-label="Minimize"
            title="Minimize"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Minus className="w-4 h-4" />
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

      {/* 2. Suggested Action Chips Row (Reference Style) */}
      <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-[#1C2033] bg-slate-50/50 dark:bg-[#111322] shrink-0">
        <button
          type="button"
          onClick={() => handleSendMessage("Mujhe LR book karni hai")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none shrink-0 bg-white dark:bg-[#161928] hover:bg-indigo-50/70 dark:hover:bg-[#1E233A] text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-[#252A42] shadow-2xs"
        >
          <Layers className="w-3.5 h-3.5 text-[#5B50E6] dark:text-violet-400" />
          <span>Book LR</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage("Track shipment")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none shrink-0 bg-white dark:bg-[#161928] hover:bg-indigo-50/70 dark:hover:bg-[#1E233A] text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-[#252A42] shadow-2xs"
        >
          <Truck className="w-3.5 h-3.5 text-blue-500" />
          <span>Track Shipment</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage("Show customer ledger")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none shrink-0 bg-white dark:bg-[#161928] hover:bg-indigo-50/70 dark:hover:bg-[#1E233A] text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-[#252A42] shadow-2xs"
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
          <span>View Ledger</span>
        </button>
      </div>

      {/* Setup Mode Notice (If OpenAI Key Not Set) */}
      {isProviderConfigured === false && (
        <div className="px-3 py-1.5 bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            Setup mode: Set <code className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">OPENAI_API_KEY</code> in backend for live AI.
          </span>
        </div>
      )}

      {/* 3. Message Stream Canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white dark:bg-[#0F111D] no-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {msg.role === "user" ? (
              // User Bubble
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-[#5B50E6] text-white text-xs sm:text-[13px] leading-relaxed shadow-xs">
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-indigo-200 font-mono">
                  <span>
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-200 shrink-0 select-none" aria-hidden="true" />
                </div>
              </div>
            ) : (
              // Assistant Bubble
              <div className="flex items-start gap-2.5 max-w-[95%]">
                <div className="w-7 h-7 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-[#5B50E6] dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/20 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 rounded-2xl rounded-tl-xs px-4 py-3 bg-slate-50 dark:bg-[#181B2B] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-[#262B44] text-xs sm:text-[13px] leading-relaxed shadow-xs space-y-2">
                  {/* Assistant Text Content */}
                  <div className="whitespace-pre-wrap space-y-1.5 font-normal">
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

                  {/* Grounded Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-[#262B44] flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Sources:
                      </span>
                      {msg.citations.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-medium"
                          title={c.source}
                        >
                          {c.title}
                        </span>
                      ))}
                    </div>
                  )}

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
                                    {draftValues.from ? (
                                      <span className="text-slate-400 text-[11px]">✕</span>
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    )}
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
                                    {draftValues.to ? (
                                      <span className="text-slate-400 text-[11px]">✕</span>
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </div>
                                </div>

                                {/* Vehicle or Party Field */}
                                {card.card_type === "job_draft" ? (
                                  <>
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
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                    </div>
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
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
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
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                      </div>
                                    </div>
                                    {card.card_type === "lr_draft" && (
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
                                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                      </div>
                                    )}
                                  </>
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
                                  onClick={() => handleNavigate(openFormHref)}
                                  className="flex-1 py-2 px-3 rounded-xl bg-[#5B50E6] hover:bg-[#4E43D8] text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer text-center"
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

                        // Case D: General Structured Card (Ledgers, Tracking, Lists)
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
                                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A1E31] border border-slate-200/60 dark:border-[#2D3452] text-xs"
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

                            {card.action && (
                              <button
                                type="button"
                                onClick={() => handleNavigate(card.action!.href)}
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
                  {msg.navigationSuggestions && msg.navigationSuggestions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#262B44] space-y-1.5">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                        Authorized Navigation:
                      </span>
                      {msg.navigationSuggestions.map((nav, nIdx) => (
                        <div
                          key={nIdx}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-[#141727] border border-slate-200/60 dark:border-[#262B44]"
                        >
                          <div className="min-w-0">
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
                  )}
                </div>
              </div>
            )}

            {msg.role === "assistant" && (
              <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-mono">
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5 max-w-[95%]">
            <div className="w-7 h-7 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-[#5B50E6] dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5 border border-violet-500/20 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#181B2B] rounded-2xl rounded-tl-xs border border-slate-200/80 dark:border-[#262B44] text-xs text-slate-500 dark:text-slate-400 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B50E6] dark:text-violet-400" />
              <span className="font-medium">Panther AI is typing...</span>
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
              onClick={() => handleSendMessage()}
              className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
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
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Panther AI anything... (Shift+Enter for newline)"
            disabled={isLoading}
            className="flex-1 min-h-[36px] max-h-[120px] bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-hidden px-2.5 py-2 leading-relaxed overflow-y-auto"
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
        <div className="flex items-center gap-1.5 mt-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Review details before confirming.</span>
        </div>
      </div>
    </div>
  );
}
