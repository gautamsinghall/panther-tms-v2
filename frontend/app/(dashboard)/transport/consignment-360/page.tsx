"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Truck,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  IndianRupee,
  Layers,
  ArrowRight,
  ExternalLink,
  Receipt,
  RotateCcw,
  ChevronRight,
  ScanSearch,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Package,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { LRViewModal, LRViewRecord } from "@/components/modals/lr-view-modal";
import { JobOrderViewModal, JobViewRecord } from "@/components/modals/job-order-view-modal";
import { TransportInvoicePrintModal } from "@/components/modals/transport-invoice-print-modal";

interface LifecycleStage {
  stage_id: number;
  stage_key: string;
  title: string;
  status: "completed" | "in_progress" | "pending" | "skipped";
  doc_number?: string | null;
  date?: string | null;
  description: string;
}

interface FinancialSummary {
  customer_revenue: number;
  invoiced_amount: number;
  customer_paid_amount: number;
  customer_pending_balance: number;
  lorry_hire_cost: number;
  lorry_advance_paid: number;
  lorry_balance_payable: number;
  direct_expenses: number;
  total_cost: number;
  gross_profit: number;
  margin_percentage: number;
  is_billed: boolean;
  is_settled: boolean;
}

interface Consignment360Data {
  query: string;
  matched_type: "LR" | "JOB" | "HIRE_CHALLAN";
  job?: any;
  lr?: any;
  hire_challan?: any;
  arrival_report?: any;
  pod_record?: any;
  tracking?: any;
  invoices: any[];
  payments: any[];
  purchases: any[];
  receipts: any[];
  lifecycle_stages: LifecycleStage[];
  financial_summary: FinancialSummary;
}

interface SuggestionItem {
  id: number;
  type: string;
  number: string;
  title: string;
  subtitle: string;
  date?: string;
  status?: string;
  vehicle_number?: string;
}

function Consignment360Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Consignment360Data | null>(null);
  const [searchedNotFound, setSearchedNotFound] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Modals state for Print Previews
  const [printLr, setPrintLr] = useState<LRViewRecord | null>(null);
  const [printJob, setPrintJob] = useState<JobViewRecord | null>(null);
  const [printInvoice, setPrintInvoice] = useState<any | null>(null);
  const [isOpeningModal, setIsOpeningModal] = useState<string | null>(null);

  // Fetch 360 data
  const fetch360Data = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setData(null);
      setSearchedNotFound(false);
      return;
    }

    setIsLoading(true);
    setSearchedNotFound(false);
    try {
      const res = await apiClient<Consignment360Data>(
        `/api/v1/transport/consignment-360?q=${encodeURIComponent(q)}`
      );
      setData(res);
      setActiveQuery(q);
    } catch {
      setData(null);
      setSearchedNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch autocomplete suggestions (only when user types)
  const fetchSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    setIsSuggesting(true);
    try {
      const res = await apiClient<SuggestionItem[]>(
        `/api/v1/transport/consignment-360/search?q=${encodeURIComponent(q)}&limit=8`
      );
      setSuggestions(res || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  // Initial load: only run when URL query param exists
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      fetch360Data(initialQuery);
    }
  }, [initialQuery, fetch360Data]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowDropdown(false);
    if (!searchQuery.trim()) return;
    router.replace(`/transport/consignment-360?q=${encodeURIComponent(searchQuery.trim())}`);
    fetch360Data(searchQuery.trim());
  };

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setSearchQuery(item.number);
    setShowDropdown(false);
    router.replace(`/transport/consignment-360?q=${encodeURIComponent(item.number)}`);
    fetch360Data(item.number);
  };

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setShowDropdown(true);
      fetchSuggestions(val);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  // Open LR Print Modal
  const handleOpenLrPrint = async (lrId?: number) => {
    const targetId = lrId || data?.lr?.id;
    if (!targetId && !data?.lr) return;
    setIsOpeningModal("lr");
    try {
      if (targetId) {
        const fullLr = await apiClient<LRViewRecord>(`/api/v1/transport/lrs/${targetId}`);
        setPrintLr(fullLr);
      } else {
        throw new Error("No LR ID");
      }
    } catch {
      if (data?.lr) {
        setPrintLr({
          ...data.lr,
          id: data.lr.id || 0,
          lr_number: data.lr.lr_number,
          lr_date: data.lr.lr_date || "",
          vehicle_source: data.lr.vehicle_source || "MARKET",
          vehicle_number: data.lr.vehicle_number || "",
          package_count: data.lr.package_count || 0,
          chargeable_weight_mt: data.lr.chargeable_weight_mt || 0,
          total_freight_amount: data.lr.total_freight_amount || 0,
          advance_amount: data.lr.advance_amount || 0,
          balance_amount: data.lr.balance_amount || 0,
        });
      }
    } finally {
      setIsOpeningModal(null);
    }
  };

  // Open Job Print Modal
  const handleOpenJobPrint = async (jobId?: number) => {
    const targetId = jobId || data?.job?.id;
    if (!targetId && !data?.job) return;
    setIsOpeningModal("job");
    try {
      if (targetId) {
        const fullJob = await apiClient<JobViewRecord>(`/api/v1/transport/jobs/${targetId}`);
        setPrintJob(fullJob);
      } else {
        throw new Error("No Job ID");
      }
    } catch {
      if (data?.job) {
        setPrintJob({
          ...data.job,
          id: data.job.id || 0,
          job_number: data.job.job_number,
          job_date: data.job.job_date || "",
          status: data.job.status || "BOOKED",
          consigner_id: 0,
          consignee_id: 0,
          created_at: "",
        });
      }
    } finally {
      setIsOpeningModal(null);
    }
  };

  // Open Invoice Print Modal
  const handleOpenInvoicePrint = async (voucherId?: number) => {
    const targetId = voucherId || (data?.invoices?.length ? data.invoices[0].id : null);
    if (!targetId && !data?.invoices?.length) return;
    setIsOpeningModal("invoice");
    try {
      if (targetId) {
        const fullVoucher = await apiClient<any>(`/api/v1/accounts/vouchers/${targetId}`);
        setPrintInvoice(fullVoucher);
      } else {
        throw new Error("No Voucher ID");
      }
    } catch {
      const inv = data?.invoices?.find((i) => i.id === targetId) || data?.invoices?.[0];
      if (inv) {
        setPrintInvoice(inv);
      }
    } finally {
      setIsOpeningModal(null);
    }
  };

  const formatCurrency = (amt?: number) => {
    if (amt === undefined || amt === null) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amt);
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-xs">
      {/* 1. Page Header matching standard Panther TMS layout */}
      <PageHeader
        title="Consignment 360° Traceability"
        description="Search any LR or Job number for complete lifecycle, hire contracts, delivery POD, and profit margin."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Consignment 360°" },
        ]}
        primaryAction={{
          label: "Refresh View",
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          onClick: () => {
            if (searchQuery.trim()) fetch360Data(searchQuery.trim());
          },
          variant: "secondary",
        }}
      />

      {/* 2. Standardized Search Bar (styled exactly like TMS FilterBar) */}
      <div
        ref={searchContainerRef}
        className="relative bg-white dark:bg-[#17171B] border border-blue-200/90 dark:border-blue-900/40 rounded-xl px-3.5 py-2.5 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Input field */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setShowDropdown(true);
                  if (suggestions.length === 0) fetchSuggestions(searchQuery);
                }
              }}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search LR number (e.g. LR-26110086), Job number, or Challan..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 dark:bg-[#202026] border border-slate-200 dark:border-[#303036] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowDropdown(false);
                  setSuggestions([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSearchSubmit}
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : (
                <Search className="w-3.5 h-3.5 mr-1.5" />
              )}
              <span>Trace 360°</span>
            </Button>
          </div>
        </div>

        {/* Autocomplete Dropdown (only when actively searching) */}
        {showDropdown && searchQuery.trim().length > 0 && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#17171B] border border-blue-200 dark:border-[#303036] rounded-xl shadow-lg z-50 max-h-72 overflow-y-auto">
            <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-[#26262c] text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex justify-between">
              <span>Matching Records</span>
              {isSuggesting && <span className="animate-pulse">Loading...</span>}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-[#26262c]">
              {suggestions.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-blue-50/60 dark:hover:bg-[#202026] transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "p-1.5 rounded-md shrink-0 text-xs",
                        item.type === "LR"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          : item.type === "JOB"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      )}
                    >
                      {item.type === "LR" ? (
                        <FileText className="w-3.5 h-3.5" />
                      ) : item.type === "JOB" ? (
                        <Layers className="w-3.5 h-3.5" />
                      ) : (
                        <Truck className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{item.title}</span>
                        {item.vehicle_number && (
                          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.vehicle_number}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.status && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.status}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Loading State */}
      {isLoading && (
        <div className="bg-white dark:bg-[#17171B] border border-blue-200/90 dark:border-blue-900/40 rounded-xl p-10 text-center shadow-2xs">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Loading Consignment 360°...
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Connecting Job Indent, LR note, Hire contract, POD, and Ledger Accounts.
          </div>
        </div>
      )}

      {/* 4. Not Found State */}
      {!isLoading && searchedNotFound && (
        <div className="bg-white dark:bg-[#17171B] border border-slate-200/90 dark:border-[#303036] rounded-xl p-10 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <Search className="w-5 h-5" />
          </div>
          <div className="text-xs font-semibold text-slate-900 dark:text-white">
            No record found for &ldquo;{activeQuery || searchQuery}&rdquo;
          </div>
          <div className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Please check the LR number, Job number, or Challan number and try again.
          </div>
        </div>
      )}

      {/* 5. Clean Initial Screen (Before Search) */}
      {!isLoading && !data && !searchedNotFound && (
        <div className="bg-white dark:bg-[#17171B] border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-12 text-center shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
            <ScanSearch className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            Search Any LR or Job Number
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Type an LR number (e.g. LR-26110086), Job number, or Challan number in the search bar above to trace where it is linked, view operational vouchers, and preview printable copies.
          </div>
        </div>
      )}

      {/* 6. Active Consignment 360 Overview Screen */}
      {!isLoading && data && (
        <div className="space-y-4">
          {/* Top Info Banner with High-Visibility Blue Action Buttons */}
          <div className="bg-white dark:bg-[#17171B] border border-blue-200/90 dark:border-blue-900/50 rounded-xl px-4 py-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 uppercase">
                {data.matched_type}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {data.lr
                  ? `LR #${data.lr.lr_number}`
                  : data.job
                  ? `Job #${data.job.job_number}`
                  : `Challan #${data.hire_challan?.challan_number}`}
              </h3>
              {data.lr?.booking_status && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {data.lr.booking_status}
                </span>
              )}
              {data.lr?.origin_city && data.lr?.destination_city && (
                <span className="text-slate-400 text-xs">
                  ({data.lr.origin_city} → {data.lr.destination_city})
                </span>
              )}
            </div>

            {/* Quick action prominent blue buttons */}
            <div className="flex items-center gap-2">
              {data.lr && (
                <button
                  type="button"
                  onClick={() => handleOpenLrPrint(data.lr.id)}
                  disabled={isOpeningModal === "lr"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isOpeningModal === "lr" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  <span>Open LR</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                </button>
              )}
              {data.hire_challan && (
                <button
                  type="button"
                  onClick={() => router.push(`/transport/hire-challan?search=${encodeURIComponent(data.hire_challan.challan_number)}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Open Challan</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                </button>
              )}
              {data.invoices && data.invoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenInvoicePrint(data.invoices[0].id)}
                  disabled={isOpeningModal === "invoice"}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
                >
                  {isOpeningModal === "invoice" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  <span>Open Invoice</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                </button>
              )}
            </div>
          </div>

          {/* Standard KPI Cards Strip (4 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Customer Freight Revenue"
              value={formatCurrency(data.financial_summary.customer_revenue)}
              subtext={
                data.financial_summary.is_billed
                  ? `Invoiced: ${formatCurrency(data.financial_summary.invoiced_amount)}`
                  : "Awaiting Freight Invoice"
              }
              icon={<IndianRupee className="w-4 h-4 text-blue-600" />}
            />
            <KpiCard
              title="Lorry Hire & Expenses"
              value={formatCurrency(data.financial_summary.total_cost)}
              subtext={`Hire: ${formatCurrency(data.financial_summary.lorry_hire_cost)} • Direct: ${formatCurrency(data.financial_summary.direct_expenses)}`}
              icon={<Truck className="w-4 h-4 text-purple-600" />}
            />
            <KpiCard
              title="Gross Margin (P&L)"
              value={formatCurrency(data.financial_summary.gross_profit)}
              subtext={`Profit Margin: ${data.financial_summary.margin_percentage}%`}
              icon={
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    data.financial_summary.margin_percentage >= 15
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  )}
                >
                  {data.financial_summary.margin_percentage}%
                </span>
              }
            />
            <KpiCard
              title="Pending Settlements"
              value={formatCurrency(data.financial_summary.customer_pending_balance)}
              subtext={`Lorry Balance: ${formatCurrency(data.financial_summary.lorry_balance_payable)}`}
              icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
            />
          </div>

          {/* 8-Stage Lifecycle Status Tracker (Highlighted with crisp Blue / Emerald Visibility) */}
          <div className="bg-white dark:bg-[#17171B] border border-blue-200/90 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs">
            <div className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>Consignment 8-Stage Lifecycle Progress</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {data.lifecycle_stages.map((stg) => {
                const isDone = stg.status === "completed";
                const isCurrent = stg.status === "in_progress";
                const isSkipped = stg.status === "skipped";

                return (
                  <div
                    key={stg.stage_id}
                    className={cn(
                      "p-3 rounded-lg border transition-all text-xs",
                      isDone
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                        : isCurrent
                        ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/30 shadow-xs"
                        : isSkipped
                        ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                        : "bg-blue-50/20 dark:bg-[#181926] border-blue-200/80 dark:border-blue-900/40 hover:border-blue-300"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={cn(
                            "w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-blue-600 text-white animate-pulse"
                              : isSkipped
                              ? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                          )}
                        >
                          {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : stg.stage_id}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {stg.title}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0",
                          isDone
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : isCurrent
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : isSkipped
                            ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60"
                        )}
                      >
                        {stg.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {stg.description}
                    </div>

                    {(stg.doc_number || stg.date) && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-[#26262c] flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono truncate max-w-[120px]">{stg.doc_number || "—"}</span>
                        <span>{stg.date || ""}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Cards Grid (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Job Order Card */}
            <div className="bg-white dark:bg-[#17171B] border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26262c] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                      Job Order &amp; Cargo Indent
                    </h4>
                  </div>
                </div>

                {data.job && (
                  <button
                    type="button"
                    onClick={() => handleOpenJobPrint(data.job.id)}
                    disabled={isOpeningModal === "job"}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    {isOpeningModal === "job" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Printer className="w-3.5 h-3.5 mr-1" />
                    )}
                    <span>View Job</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {data.job ? (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Job Number</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.job.job_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Booking Date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.job.job_date || "N/A"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[11px] block">Billing Client</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.job.billing_client_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Origin Shipper</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.job.consigner_name} ({data.job.origin_city})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Destination Consignee</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.job.consignee_name} ({data.job.destination_city})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Cargo Details</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {data.job.cargo_description} ({data.job.estimated_weight_mt} MT)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Job Status</span>
                    <span className="font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]">
                      {data.job.status}
                    </span>
                  </div>

                  {data.job.linked_lrs?.length > 1 && (
                    <div className="col-span-2 mt-1.5 pt-2 border-t border-slate-100 dark:border-[#26262c]">
                      <span className="text-slate-400 text-[11px] block mb-1">
                        Linked LRs under this Job ({data.job.linked_lrs.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {data.job.linked_lrs.map((item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSearchQuery(item.lr_number);
                              fetch360Data(item.lr_number);
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer",
                              data.lr?.lr_number === item.lr_number
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            )}
                          >
                            LR #{item.lr_number} ({item.vehicle_number || "Unassigned"})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2 text-center">
                  Direct LR Booking without prior Job indent.
                </div>
              )}
            </div>

            {/* 2. Lorry Receipt (LR) Card */}
            <div className="bg-white dark:bg-[#17171B] border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26262c] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                      Lorry Receipt (LR / GR) Note
                    </h4>
                  </div>
                </div>

                {data.lr && (
                  <button
                    type="button"
                    onClick={() => handleOpenLrPrint(data.lr.id)}
                    disabled={isOpeningModal === "lr"}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    {isOpeningModal === "lr" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Printer className="w-3.5 h-3.5 mr-1" />
                    )}
                    <span>View LR</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {data.lr ? (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">LR Number</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.lr.lr_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Booking Date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.lr.lr_date || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Vehicle</span>
                    <span className="font-medium font-mono text-slate-800 dark:text-slate-200">
                      {data.lr.vehicle_number} ({data.lr.vehicle_source})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Driver</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {data.lr.driver_name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">E-Way Bill #</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {data.lr.eway_bill_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Customer Freight</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(data.lr.total_freight_amount)} ({data.lr.payment_type || "TO_PAY"})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[11px] block">Weight &amp; Packages</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {data.lr.package_count} pkgs • {data.lr.chargeable_weight_mt} MT chargeable (Actual: {data.lr.actual_weight_mt || data.lr.chargeable_weight_mt} MT)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2 text-center">
                  No LR issued for this job yet.
                </div>
              )}
            </div>

            {/* 3. Lorry Hire Contract (Hire Challan) */}
            <div className="bg-white dark:bg-[#17171B] border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26262c] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                      Lorry Hire Contract (Hire Challan)
                    </h4>
                  </div>
                </div>

                {data.hire_challan && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/hire-challan?search=${encodeURIComponent(data.hire_challan.challan_number)}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>View Challan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {data.hire_challan ? (
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Challan Number</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.hire_challan.challan_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Challan Date</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.hire_challan.challan_date}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[11px] block">Supplier Vendor / Owner</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {data.hire_challan.vendor_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Hire Rate Agreed</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {formatCurrency(data.hire_challan.hire_rate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Advance Paid (ATH)</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(data.hire_challan.advance_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Balance Due (BTH)</span>
                    <span className="font-semibold text-amber-600">
                      {formatCurrency(data.hire_challan.balance_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Net Payable</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(data.hire_challan.net_payable_amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic py-2 text-center">
                  {data.lr?.vehicle_source === "OWN"
                    ? "Company fleet vehicle assigned (no market challan)."
                    : "No Hire Challan issued yet."}
                </div>
              )}
            </div>

            {/* 4. Destination Hub Arrival & Delivery POD Card */}
            <div className="bg-white dark:bg-[#17171B] border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26262c] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                      Hub Arrival &amp; Delivery POD
                    </h4>
                  </div>
                </div>

                {data.pod_record && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/pod-records?search=${encodeURIComponent(data.pod_record.pod_number)}`)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>View POD</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Arrival Section */}
                {data.arrival_report ? (
                  <>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Arrival Report #</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {data.arrival_report.report_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Arrival Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {data.arrival_report.arrival_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Unloaded Pkgs</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {data.arrival_report.packages_received} pkgs
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Condition</span>
                      <span
                        className={cn(
                          "font-semibold",
                          data.arrival_report.packages_damaged > 0 || data.arrival_report.packages_short > 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        )}
                      >
                        {data.arrival_report.packages_damaged} damaged • {data.arrival_report.packages_short} short
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-slate-400 italic py-1">
                    Hub arrival unloading not logged yet.
                  </div>
                )}

                <div className="col-span-2 my-1 border-t border-slate-100 dark:border-[#26262c]" />

                {/* POD Section */}
                {data.pod_record ? (
                  <>
                    <div>
                      <span className="text-slate-400 text-[11px] block">POD Number</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {data.pod_record.pod_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Delivery Date</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {data.pod_record.delivery_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Receiver</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {data.pod_record.receiver_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">POD Audit Status</span>
                      <span
                        className={cn(
                          "font-bold px-1.5 py-0.2 rounded text-[10px] uppercase",
                          data.pod_record.verification_status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        )}
                      >
                        {data.pod_record.verification_status}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-slate-400 italic py-1">
                    Signed Proof of Delivery (POD) copy pending.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linked Accounting Vouchers & Ledgers */}
          <div className="bg-white dark:bg-[#17171B] border border-blue-200/80 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-[#26262c] pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    Linked Accounts, Vouchers &amp; Bills
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold">
                  {data.invoices.length} Invoices
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold">
                  {data.payments.length} Payments
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold">
                  {data.purchases.length} Purchases
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {data.receipts.length} Receipts
                </span>
              </div>
            </div>

            {data.invoices.length === 0 &&
            data.payments.length === 0 &&
            data.purchases.length === 0 &&
            data.receipts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                No accounting vouchers recorded yet for this consignment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#202026] text-slate-500 font-semibold border-y border-slate-200/80 dark:border-[#303036]">
                    <tr>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Voucher #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Party Name</th>
                      <th className="py-2 px-3 text-right">Net Amount</th>
                      <th className="py-2 px-3 text-right">Paid Amount</th>
                      <th className="py-2 px-3 text-right">Balance Due</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#26262c]">
                    {/* Invoices */}
                    {data.invoices.map((v) => (
                      <tr
                        key={`inv-${v.id}`}
                        onClick={() => handleOpenInvoicePrint(v.id)}
                        className="hover:bg-blue-50/50 dark:hover:bg-[#202026]/40 cursor-pointer"
                        title="Click to Print / Preview Invoice"
                      >
                        <td className="py-2 px-3">
                          <span className="font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px]">
                            CUSTOMER INVOICE
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-blue-600 dark:text-blue-400 underline decoration-dotted">
                          {v.voucher_number}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{v.voucher_date}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">
                          {formatCurrency(v.paid_amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-600">
                          {formatCurrency(v.balance_amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                              v.balance_amount <= 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {v.balance_amount <= 0 ? "PAID" : "UNPAID"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Receipts */}
                    {data.receipts.map((v) => (
                      <tr key={`rcpt-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-[#202026]/40">
                        <td className="py-2 px-3">
                          <span className="font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px]">
                            CLIENT RECEIPT
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{v.voucher_date}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">—</td>
                        <td className="py-2 px-3 text-right text-slate-400">—</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            RECEIVED
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Purchases */}
                    {data.purchases.map((v) => (
                      <tr key={`purch-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-[#202026]/40">
                        <td className="py-2 px-3">
                          <span className="font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px]">
                            VENDOR PURCHASE
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{v.voucher_date}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-600 font-medium">
                          {formatCurrency(v.paid_amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-amber-600">
                          {formatCurrency(v.balance_amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                              v.balance_amount <= 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {v.balance_amount <= 0 ? "PAID" : "DUE"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Payments */}
                    {data.payments.map((v) => (
                      <tr key={`pay-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-[#202026]/40">
                        <td className="py-2 px-3">
                          <span className="font-semibold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[9px]">
                            VENDOR PAYOUT
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{v.voucher_date}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2 px-3 text-right font-bold text-purple-600">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">—</td>
                        <td className="py-2 px-3 text-right text-slate-400">—</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            DISBURSED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print Preview Modals */}
      {printLr && (
        <LRViewModal
          isOpen={!!printLr}
          lr={printLr}
          onClose={() => setPrintLr(null)}
        />
      )}

      {printJob && (
        <JobOrderViewModal
          isOpen={!!printJob}
          job={printJob}
          onClose={() => setPrintJob(null)}
        />
      )}

      {printInvoice && (
        <TransportInvoicePrintModal
          isOpen={!!printInvoice}
          invoice={printInvoice}
          linkedLr={data?.lr}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
}

export default function Consignment360Page() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center font-sans">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-500">Loading Consignment 360°...</span>
        </div>
      }
    >
      <Consignment360Content />
    </Suspense>
  );
}
