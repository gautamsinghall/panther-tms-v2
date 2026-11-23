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
  AlertCircle,
  TrendingUp,
  IndianRupee,
  Calendar,
  MapPin,
  Building2,
  User,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Receipt,
  CreditCard,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ScanSearch,
  Check,
  XCircle,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch 360 data
  const fetch360Data = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setData(null);
      setErrorMsg(null);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient<Consignment360Data>(
        `/api/v1/transport/consignment-360?q=${encodeURIComponent(q)}`
      );
      setData(res);
      setActiveQuery(q);
    } catch (err: any) {
      setData(null);
      setErrorMsg(
        err?.message || `No consignment, Job, or Hire Challan found matching "${q}".`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    setIsSuggesting(true);
    try {
      const res = await apiClient<SuggestionItem[]>(
        `/api/v1/transport/consignment-360/search?q=${encodeURIComponent(query)}&limit=8`
      );
      setSuggestions(res || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      fetch360Data(initialQuery);
    } else {
      // Preload recent items for quick picking
      fetchSuggestions("");
    }
  }, [initialQuery, fetch360Data, fetchSuggestions]);

  // Click outside listener for suggestions dropdown
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
    setShowDropdown(true);
    fetchSuggestions(val);
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
    <div className="space-y-6 pb-12">
      {/* Page Title & Breadcrumb */}
      <PageHeader
        title="Consignment 360° Traceability"
        description="End-to-end lifecycle, operational links, customer freight billing, vendor hire payouts, and gross profit margin."
      />

      {/* Hero Search Box */}
      <div
        ref={searchContainerRef}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm"
      >
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <ScanSearch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setShowDropdown(true);
                if (suggestions.length === 0) fetchSuggestions(searchQuery);
              }}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search by LR number, Job number, Hire Challan, or Vehicle number..."
              className="w-full pl-11 pr-10 py-3 text-sm sm:text-base bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-900 dark:text-white placeholder-slate-400 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setShowDropdown(true);
                  fetchSuggestions("");
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm sm:text-base rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Trace 360°</span>
          </button>
        </form>

        {/* Autocomplete / Recent Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
              <span>{searchQuery ? "Matching Records" : "Recent Consignments & Jobs"}</span>
              {isSuggesting && <span className="animate-pulse">Loading...</span>}
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {suggestions.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-indigo-50/60 dark:hover:bg-slate-800/80 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        item.type === "LR"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : item.type === "JOB"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {item.type === "LR" ? (
                        <FileText className="w-4 h-4" />
                      ) : item.type === "JOB" ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <Truck className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{item.title}</span>
                        {item.vehicle_number && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.vehicle_number}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.status && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.status}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Suggestion Pills */}
        {!searchQuery && suggestions.length > 0 && (
          <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Quick Pick:</span>
            {suggestions.slice(0, 5).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelectSuggestion(s)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-medium transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {s.type === "LR" ? "LR" : s.type === "JOB" ? "Job" : "HC"}:
                </span>
                <span>{s.number}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Assembling 360° Traceability Graph...
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Correlating Job Indents, Lorry Receipts, Hire Contracts, Delivery PODs, and Ledger Accounts.
          </p>
        </div>
      )}

      {/* Error / Not Found */}
      {!isLoading && errorMsg && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-2xl shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Consignment Not Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{errorMsg}</p>
        </div>
      )}

      {/* Empty Initial Screen */}
      {!isLoading && !data && !errorMsg && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScanSearch className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Search Any LR or Job Number
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
            View where the consignment is used, its linked contract, vehicle, driver, unloading hub,
            signed POD, customer freight invoice, and net profit margin.
          </p>
        </div>
      )}

      {/* Active Consignment 360 View */}
      {!isLoading && data && (
        <div className="space-y-6">
          {/* Top Header Card with Quick Metadata & Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 uppercase">
                    {data.matched_type} Matched
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {data.lr
                      ? `Consignment LR #${data.lr.lr_number}`
                      : data.job
                      ? `Job Order #${data.job.job_number}`
                      : `Hire Challan #${data.hire_challan.challan_number}`}
                  </h2>
                  {data.lr?.booking_status && (
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {data.lr.booking_status}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
                  {data.lr?.lr_date && <span>📅 Booked: {data.lr.lr_date}</span>}
                  {data.lr?.origin_city && data.lr?.destination_city && (
                    <span>
                      📍 Route: {data.lr.origin_city} → {data.lr.destination_city}
                    </span>
                  )}
                  {data.lr?.vehicle_number && (
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      🚛 {data.lr.vehicle_number}
                    </span>
                  )}
                </p>
              </div>

              {/* Direct Workspace Jump Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {data.lr && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/lr-booking?search=${encodeURIComponent(data.lr.lr_number)}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open in LR Booking</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                )}

                {data.hire_challan && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/hire-challan?search=${encodeURIComponent(data.hire_challan.challan_number)}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Open Challan</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                )}

                {data.invoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => router.push(`/accounts/transport-invoice?search=${encodeURIComponent(data.invoices[0].voucher_number)}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Invoice</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profitability & Financial Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider">Customer Freight Revenue</span>
                <IndianRupee className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(data.financial_summary.customer_revenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Invoiced: {formatCurrency(data.financial_summary.invoiced_amount)}</span>
                <span
                  className={`font-semibold ${
                    data.financial_summary.is_billed ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {data.financial_summary.is_billed ? "BILLED" : "UNBILLED"}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider">Lorry Hire & Direct Cost</span>
                <Truck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(data.financial_summary.total_cost)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Challan Hire: {formatCurrency(data.financial_summary.lorry_hire_cost)}</span>
                <span>Expenses: {formatCurrency(data.financial_summary.direct_expenses)}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider">Gross Margin P&L</span>
                <TrendingUp
                  className={`w-4 h-4 ${
                    data.financial_summary.gross_profit >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                />
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold ${
                  data.financial_summary.gross_profit >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrency(data.financial_summary.gross_profit)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Profit Margin:</span>
                <span
                  className={`font-bold px-1.5 py-0.2 rounded ${
                    data.financial_summary.margin_percentage >= 15
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : data.financial_summary.margin_percentage >= 5
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  {data.financial_summary.margin_percentage}%
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-semibold uppercase tracking-wider">Settlement & Balance</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(data.financial_summary.customer_pending_balance)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>Due from Client</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Lorry Bal: {formatCurrency(data.financial_summary.lorry_balance_payable)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive 8-Stage Lifecycle Status Tracker */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              <span>Consignment 8-Stage Complete Lifecycle Status</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {data.lifecycle_stages.map((stg) => {
                const isDone = stg.status === "completed";
                const isCurrent = stg.status === "in_progress";
                const isSkipped = stg.status === "skipped";

                return (
                  <div
                    key={stg.stage_id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isDone
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                        : isCurrent
                        ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/20"
                        : isSkipped
                        ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-indigo-600 text-white animate-pulse"
                              : isSkipped
                              ? "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : stg.stage_id}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {stg.title}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isDone
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : isCurrent
                            ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                            : isSkipped
                            ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {stg.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {stg.description}
                    </div>

                    {(stg.doc_number || stg.date) && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-mono font-medium truncate max-w-[130px]">
                          {stg.doc_number || "—"}
                        </span>
                        <span>{stg.date || ""}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Documents & Entity Link Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Job Order & Cargo Indent Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Job Order & Cargo Indent
                    </h4>
                    <span className="text-[11px] text-slate-500">Commercial client booking indents</span>
                  </div>
                </div>

                {data.job && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/jobs?search=${encodeURIComponent(data.job.job_number)}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1"
                  >
                    <span>View Job</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {data.job ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Job Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.job.job_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Booking Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.job.job_date || "N/A"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Billing Client / Party</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.job.billing_client_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Consignor (Origin)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.job.consigner_name} ({data.job.origin_city})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Consignee (Destination)</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.job.consignee_name} ({data.job.destination_city})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Cargo & Weight</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.job.cargo_description} ({data.job.estimated_weight_mt} MT)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status</span>
                    <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {data.job.status}
                    </span>
                  </div>

                  {data.job.linked_lrs?.length > 1 && (
                    <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-semibold block mb-1.5 text-[11px]">
                        Other Linked LRs under this Job ({data.job.linked_lrs.length}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {data.job.linked_lrs.map((item: any) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSearchQuery(item.lr_number);
                              fetch360Data(item.lr_number);
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                              data.lr?.lr_number === item.lr_number
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                            }`}
                          >
                            LR #{item.lr_number} ({item.vehicle_number || "Unassigned"})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-3 text-center">
                  Direct LR Booking without an upfront Job indent order.
                </div>
              )}
            </div>

            {/* 2. Lorry Receipt (LR) Booking Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Lorry Receipt (LR / GR) Details
                    </h4>
                    <span className="text-[11px] text-slate-500">Legal consignment note</span>
                  </div>
                </div>

                {data.lr && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/lr-booking?search=${encodeURIComponent(data.lr.lr_number)}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1"
                  >
                    <span>View LR</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {data.lr ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">LR Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.lr.lr_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">LR Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.lr.lr_date || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Vehicle</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {data.lr.vehicle_number} ({data.lr.vehicle_source})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Driver</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.lr.driver_name} {data.lr.driver_phone !== "N/A" && `(${data.lr.driver_phone})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">E-Way Bill #</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {data.lr.eway_bill_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Supplier Invoice / Value</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {data.lr.invoice_no} ({formatCurrency(data.lr.invoice_value)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Packages & Weight</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {data.lr.package_count} pkgs • {data.lr.chargeable_weight_mt} MT chargeable
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Total Customer Freight</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(data.lr.total_freight_amount)} ({data.lr.payment_type})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-3 text-center">
                  Consignment LR not yet generated for this Job.
                </div>
              )}
            </div>

            {/* 3. Lorry Hire Contract (Hire Challan) Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Lorry Hire Contract (Hire Challan)
                    </h4>
                    <span className="text-[11px] text-slate-500">Market truck hiring agreement</span>
                  </div>
                </div>

                {data.hire_challan && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/hire-challan?search=${encodeURIComponent(data.hire_challan.challan_number)}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1"
                  >
                    <span>View Challan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {data.hire_challan ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Challan Number</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.hire_challan.challan_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Challan Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.hire_challan.challan_date}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Supplier / Vendor / Owner</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {data.hire_challan.vendor_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contracted Lorry Hire</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(data.hire_challan.hire_rate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Advance Paid (ATH)</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(data.hire_challan.advance_amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">TDS Withholding</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {formatCurrency(data.hire_challan.tds_amount)} ({data.hire_challan.tds_rate}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Balance Payable (BTH)</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(data.hire_challan.balance_amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-3 text-center">
                  {data.lr?.vehicle_source === "OWN"
                    ? "In-house company fleet vehicle utilized (No market hire challan required)."
                    : "No Hire Challan issued yet for this consignment."}
                </div>
              )}
            </div>

            {/* 4. Destination Hub Arrival & POD Verification Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Hub Arrival & Delivery POD
                    </h4>
                    <span className="text-[11px] text-slate-500">Unloading audit & proof of delivery</span>
                  </div>
                </div>

                {data.pod_record && (
                  <button
                    type="button"
                    onClick={() => router.push(`/transport/pod-records?search=${encodeURIComponent(data.pod_record.pod_number)}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1"
                  >
                    <span>View POD</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Arrival Section */}
                {data.arrival_report ? (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Arrival Report #</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {data.arrival_report.report_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Arrival Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {data.arrival_report.arrival_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Unloaded Packages</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {data.arrival_report.packages_received} pkgs
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Damage / Shortage</span>
                      <span
                        className={`font-semibold ${
                          data.arrival_report.packages_damaged > 0 || data.arrival_report.packages_short > 0
                            ? "text-red-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {data.arrival_report.packages_damaged} damaged • {data.arrival_report.packages_short} short
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-slate-500 italic py-1">
                    Hub arrival unloading not logged yet.
                  </div>
                )}

                <div className="col-span-2 my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* POD Section */}
                {data.pod_record ? (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[11px]">POD Number</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {data.pod_record.pod_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Delivery Date</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {data.pod_record.delivery_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Delivered Receiver</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {data.pod_record.receiver_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Verification Status</span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase ${
                          data.pod_record.verification_status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {data.pod_record.verification_status}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-slate-500 italic py-1">
                    Signed Proof of Delivery (POD) copy pending submission.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linked Accounting Ledgers & Financial Vouchers */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Linked Accounts, Vouchers & Bills
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Every invoice, vendor purchase, driver payment, and client receipt linked to this LR/Challan
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                  {data.invoices.length} Invoices
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-semibold">
                  {data.payments.length} Payments
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold">
                  {data.purchases.length} Purchases
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {data.receipts.length} Receipts
                </span>
              </div>
            </div>

            {data.invoices.length === 0 &&
            data.payments.length === 0 &&
            data.purchases.length === 0 &&
            data.receipts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                No accounting vouchers recorded yet for this consignment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Voucher #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3 text-right">Net Amount</th>
                      <th className="py-2.5 px-3 text-right">Paid Amount</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Invoices */}
                    {data.invoices.map((v) => (
                      <tr key={`inv-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                            CUSTOMER INVOICE
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{v.voucher_date}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600">
                          {formatCurrency(v.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                          {formatCurrency(v.balance_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              v.balance_amount <= 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {v.balance_amount <= 0 ? "PAID" : "UNPAID"}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Receipts */}
                    {data.receipts.map((v) => (
                      <tr key={`rcpt-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                            CLIENT RECEIPT
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{v.voucher_date}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            RECEIVED
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Purchases */}
                    {data.purchases.map((v) => (
                      <tr key={`pur-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                            EXPENSE / PURCHASE
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{v.voucher_date}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {formatCurrency(v.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {formatCurrency(v.balance_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600">
                            {v.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Payments */}
                    {data.payments.map((v) => (
                      <tr key={`pay-${v.id}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px]">
                            DRIVER / VENDOR PAY
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {v.voucher_number}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{v.voucher_date}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{v.party_name}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-purple-600">
                          {formatCurrency(v.net_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
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
    </div>
  );
}

export default function Consignment360Page() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-500">Loading Consignment 360°...</span>
        </div>
      }
    >
      <Consignment360Content />
    </Suspense>
  );
}
