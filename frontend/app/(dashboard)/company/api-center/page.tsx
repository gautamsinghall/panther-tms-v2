"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Server,
  FileSpreadsheet,
  QrCode,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Wallet,
  Receipt,
  Map as MapIcon,
  X,
  CreditCard,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { CompanyNavTabs } from "@/components/company/company-nav-tabs";

interface ApiCenterData {
  ewb_username: string;
  ewb_password?: string;
  has_ewb_password?: boolean;
  ewb_gstin: string;
  is_ewb_active: boolean;
  gsp_client_id_override?: string;
  gsp_base_url_override?: string;
  has_gsp_secret_override?: boolean;
  platform_gsp_configured: boolean;
  platform_gsp_base_url: string;
  fastag_configured?: boolean;
  google_maps_configured?: boolean;
  fastag_credits_left?: number;
  fastag_rate_per_fetch?: number;
}

interface FastagWalletTxn {
  id: number;
  created_at: string;
  transaction_type: string;
  api_calls_count: number;
  rate_per_call: number;
  amount: number;
  vehicle_number?: string | null;
  description: string;
  balance_after: number;
}

interface FastagWalletData {
  api_calls_left: number;
  rate_per_fetch: number;
  equivalent_balance_inr: number;
  is_exhausted: boolean;
  pricing_notice: string;
  transactions: FastagWalletTxn[];
}

export default function ApiCenterPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // E-Way Bill Modal / Drawer State (hidden by default)
  const [isEwbModalOpen, setIsEwbModalOpen] = useState(false);

  // Form Fields
  const [ewbUsername, setEwbUsername] = useState("");
  const [ewbPassword, setEwbPassword] = useState("");
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [ewbGstin, setEwbGstin] = useState("");
  const [isEwbActive, setIsEwbActive] = useState(true);

  // Advanced Overrides
  const [gspBaseUrlOverride, setGspBaseUrlOverride] = useState("");
  const [gspClientIdOverride, setGspClientIdOverride] = useState("");
  const [gspClientSecretOverride, setGspClientSecretOverride] = useState("");
  const [hasSavedGspSecret, setHasSavedGspSecret] = useState(false);

  // Platform info
  const [platformGspBaseUrl, setPlatformGspBaseUrl] = useState("https://gsp.adaequare.com");
  const [platformConfigured, setPlatformConfigured] = useState(true);

  // FASTag Wallet State
  const [walletData, setWalletData] = useState<FastagWalletData>({
    api_calls_left: 0,
    rate_per_fetch: 1.5,
    equivalent_balance_inr: 0,
    is_exhausted: true,
    pricing_notice: "Standard tariff: ₹1.50 per vehicle fetch. Calls are blocked when balance reaches 0. Recharges are managed by system administrator.",
    transactions: [],
  });
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletTxFilter, setWalletTxFilter] = useState<string>("");

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Load existing API Center settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<ApiCenterData>("/api/v1/profile/api-center");
      if (data) {
        setEwbUsername(data.ewb_username || "");
        setHasSavedPassword(Boolean(data.has_ewb_password));
        setEwbPassword(data.has_ewb_password ? "••••••••••••" : "");
        setEwbGstin(data.ewb_gstin || "");
        setIsEwbActive(data.is_ewb_active !== undefined ? data.is_ewb_active : true);
        setGspBaseUrlOverride(data.gsp_base_url_override || "");
        setGspClientIdOverride(data.gsp_client_id_override || "");
        setHasSavedGspSecret(Boolean(data.has_gsp_secret_override));
        setGspClientSecretOverride(data.has_gsp_secret_override ? "••••••••••••" : "");
        setPlatformGspBaseUrl(data.platform_gsp_base_url || "https://gsp.adaequare.com");
        setPlatformConfigured(data.platform_gsp_configured ?? false);

        if (!data.platform_gsp_configured || data.gsp_client_id_override) {
          setShowAdvanced(true);
        }
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load API Center configuration.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load FASTag Wallet & Ledger from panther_control
  const fetchWallet = async () => {
    try {
      setIsWalletLoading(true);
      const data = await apiClient.get<FastagWalletData>("/api/v1/profile/api-center/fastag-wallet");
      if (data) {
        setWalletData(data);
      }
    } catch (err) {
      console.warn("Failed loading FASTag wallet:", err);
    } finally {
      setIsWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchWallet();
  }, []);

  // Save Settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);

      const payload: any = {
        ewb_username: ewbUsername.trim(),
        ewb_gstin: ewbGstin.trim().toUpperCase(),
        is_ewb_active: isEwbActive,
        gsp_base_url_override: gspBaseUrlOverride.trim() || null,
        gsp_client_id_override: gspClientIdOverride.trim() || null,
      };

      if (ewbPassword && !ewbPassword.startsWith("••")) {
        payload.ewb_password = ewbPassword.trim();
      }

      if (gspClientSecretOverride && !gspClientSecretOverride.startsWith("••")) {
        payload.gsp_client_secret_override = gspClientSecretOverride.trim();
      }

      await apiClient.put("/api/v1/profile/api-center", payload);
      if (ewbPassword && !ewbPassword.startsWith("••")) {
        setHasSavedPassword(true);
        setEwbPassword("••••••••••••");
      }
      if (gspClientSecretOverride && !gspClientSecretOverride.startsWith("••")) {
        setHasSavedGspSecret(true);
        setGspClientSecretOverride("••••••••••••");
      }

      setFeedback({
        type: "success",
        message: "API Center settings saved securely! Live E-Way Bill fetch will use these credentials.",
      });
      setIsEwbModalOpen(false);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save API Center settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const payload: any = {
        ewb_username: ewbUsername.trim() || undefined,
        ewb_gstin: ewbGstin.trim().toUpperCase() || undefined,
        gsp_base_url: gspBaseUrlOverride.trim() || undefined,
        gsp_client_id: gspClientIdOverride.trim() || undefined,
      };

      if (ewbPassword && !ewbPassword.startsWith("••")) {
        payload.ewb_password = ewbPassword.trim();
      }
      if (gspClientSecretOverride && !gspClientSecretOverride.startsWith("••")) {
        payload.gsp_client_secret = gspClientSecretOverride.trim();
      }

      const res = await apiClient.post<any>("/api/v1/profile/api-center/test-ewb", payload);
      setTestResult({
        success: Boolean(res?.success),
        message: res?.message || (res?.success ? "Authentication successful." : "Authentication failed."),
        details: res?.details,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Connection test failed. Network or server error.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const filteredTransactions = (walletData?.transactions || []).filter((tx) => {
    if (!walletTxFilter) return true;
    const q = walletTxFilter.toLowerCase();
    return (
      (tx.vehicle_number && tx.vehicle_number.toLowerCase().includes(q)) ||
      tx.transaction_type.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="API Center & Telemetry Hub"
        description="Unified gateway credentials, FASTag telemetry credit wallet, and live mapping configurations."
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSettings();
              fetchWallet();
            }}
            disabled={isLoading || isWalletLoading}
            className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isWalletLoading ? "animate-spin" : "text-indigo-600"}`} />
            <span>Refresh Hub</span>
          </Button>
        </div>
      </PageHeader>

      {/* Navigation Tabs under Company Settings */}
      <CompanyNavTabs />

      {/* Global Alerts */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <span className="font-semibold">{feedback.type === "success" ? "Operation Successful" : "Notice"}</span>
            <p className="leading-relaxed">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: Telemetry & Gateway KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: E-Way Bill Gateway Card (Click to open modal) */}
        <div
          onClick={() => setIsEwbModalOpen(true)}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                E-Way Bill Gateway
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isEwbActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isEwbActive ? "Active" : "Disabled"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-all shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="mt-3.5">
              <div className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>{ewbGstin ? ewbGstin : "NIC / GSP Portal"}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {ewbUsername ? `Username: ${ewbUsername}` : "Click to configure company credentials"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-1">
              <span>View & Configure</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] font-mono text-slate-400">NIC Auto-Fetch Ready</span>
          </div>
        </div>

        {/* KPI 2: FASTag & Toll Telemetry Gateway Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-amber-300 transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                FASTag & Toll Telemetry
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    walletData.api_calls_left > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {walletData.api_calls_left > 0 ? "Credits Active" : "Exhausted (0 Calls)"}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-all shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="mt-3.5">
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {walletData.api_calls_left}{" "}
                <span className="text-sm font-semibold text-slate-500 font-sans">Calls Left</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Standard Tariff: <strong className="text-slate-800">₹1.50 per Fetch</strong>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-amber-700 font-medium">Default: 0 for all tenants</span>
            <span className="text-[10px] font-mono text-slate-400">NETC Telemetry</span>
          </div>
        </div>

        {/* KPI 3: Google Maps Telemetry Gateway Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 group relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Google Maps Engine
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                  Dokploy Key Active
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-all shrink-0">
                  <MapIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="mt-3.5">
              <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <span>Google Maps SDK</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fallback: <strong>Leaflet OpenStreetMap</strong>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">Highway Routing & Traffic</span>
            <span className="text-[10px] font-mono text-slate-400">Included Engine</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: FASTag & Toll Telemetry Wallet System */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>FASTag & Toll Telemetry Wallet</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full">
                  Managed Quota
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Live toll plaza fetches deduct from your tenant credit balance stored securely in{" "}
                <code className="text-slate-700 font-mono">panther_control</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchWallet}
              disabled={isWalletLoading}
              className="text-xs h-8 gap-1.5 cursor-pointer bg-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWalletLoading ? "animate-spin" : "text-amber-600"}`} />
              <span>Refresh Ledger</span>
            </Button>
          </div>
        </div>

        {/* Wallet Balance Cards & Tariff Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              API Calls Remaining
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              {walletData.api_calls_left}
            </div>
            <p className="text-[11px] text-slate-500">
              {walletData.api_calls_left === 0 ? "Strictly blocked when 0" : "Available live calls"}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tariff per Fetch
            </span>
            <div className="text-2xl font-extrabold text-indigo-700 font-mono">
              ₹1.50
            </div>
            <p className="text-[11px] text-slate-500">Rate per vehicle query</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Equivalent Value
            </span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{walletData.equivalent_balance_inr.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500">Based on remaining calls</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Default Tenant Balance
            </span>
            <div className="text-2xl font-extrabold text-slate-700 font-mono">
              0 Calls
            </div>
            <p className="text-[11px] text-slate-500">Standard for all tenants</p>
          </div>
        </div>

        {/* Mandatory Policy & Tariff Notice (NO Buy/Purchase Option) */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-950 space-y-1.5 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Info className="w-4 h-4 text-amber-600" />
            <span>FASTag Telemetry Quota Policy & Tariff Notice</span>
          </div>
          <p>
            The standard tariff for FASTag Toll Telemetry is <strong>₹1.50 per vehicle fetch</strong>.
            By default, all tenant accounts are initialized with <strong>0 API calls</strong> in the{" "}
            <code className="font-mono text-amber-900">panther_control</code> database. When balance reaches 0, live
            queries are strictly blocked to prevent unbilled API consumption.
          </p>
          <p className="text-amber-800 text-[11px]">
            <strong>Note:</strong> Self-service online purchasing is disabled. Credit quotas are allocated exclusively
            by the system administrator or your PantherTMS account manager.
          </p>
        </div>

        {/* Transaction History Ledger */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              <span>Audit Transactions & Deductions Ledger</span>
            </h3>
            <Input
              type="text"
              value={walletTxFilter}
              onChange={(e) => setWalletTxFilter(e.target.value)}
              placeholder="Search by vehicle, type, or note..."
              className="h-8 text-xs max-w-xs bg-slate-50"
            />
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3 text-right">Calls</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <div className="space-y-1">
                        <Receipt className="w-6 h-6 mx-auto text-slate-300" />
                        <p className="font-medium text-xs">No FASTag wallet transactions recorded yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Current API calls left: {walletData.api_calls_left}. Live queries will log deduction
                          records here once quota is allocated.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${
                            tx.transaction_type === "DEBIT"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {tx.vehicle_number || "--"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {tx.api_calls_count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        ₹{Number(tx.rate_per_call).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                        {tx.balance_after}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {tx.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* SECTION 3: Additional Compliance & Telemetry Integrations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* E-Invoicing Card */}
        <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <QrCode className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 rounded-full">
              Sandbox Ready
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">E-Invoice System (IRN / QR)</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Standard B2B tax invoice QR code and 64-character IRN generation for commercial freight billing.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>NIC IRP Schema 1.03 Compliant</span>
          </div>
        </Card>

        {/* Customer Alerts */}
        <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Server className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-800 rounded-full">
              Roadmap
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customer Transit Alerts</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Instant SMS and WhatsApp notifications to consigner and consignee upon LR generation and delivery.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
            <span>GupShup / MSG91 Gateway</span>
          </div>
        </Card>
      </div>

      {/* MODAL: E-Way Bill Setup (Opens when E-Way KPI card is clicked) */}
      {isEwbModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 text-slate-900 space-y-5 animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>E-Way Bill Setup (NIC / GSP Portal)</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                      Live Fetch
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure company portal credentials to query commercial invoices during LR booking.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEwbModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Test Connection Results inside Modal */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs shadow-2xs ${
                  testResult.success
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {testResult.success ? "Authentication Successful" : "Authentication Failed"}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                        testResult.success ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"
                      }`}
                    >
                      {testResult.success ? "200 OK" : "FAILED"}
                    </span>
                  </div>
                  <p className="leading-relaxed">{testResult.message}</p>
                </div>
              </div>
            )}

            {/* Integration Status Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="font-semibold text-slate-800 block">Integration Status</span>
                <span className="text-slate-500 text-[11px]">
                  {isEwbActive
                    ? "E-Way Bill auto-fetch is enabled across LR bookings."
                    : "E-Way Bill integration is temporarily paused."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEwbActive(!isEwbActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  isEwbActive ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEwbActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Credentials Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* EWB Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>E-Way Bill Portal Username</span>
                  <span className="text-[10px] text-slate-400 font-normal">NIC GSP Username</span>
                </label>
                <Input
                  type="text"
                  value={ewbUsername}
                  placeholder="Enter NIC portal username"
                  onChange={(e) => setEwbUsername(e.target.value)}
                  className="h-9 text-xs font-mono font-medium"
                />
              </div>

              {/* EWB Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>E-Way Bill Portal Password</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {hasSavedPassword ? "Encrypted & Saved" : "NIC API Password"}
                  </span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={ewbPassword}
                    placeholder={hasSavedPassword ? "••••••••••••" : "Enter portal password"}
                    onFocus={() => {
                      if (hasSavedPassword && ewbPassword.startsWith("••")) {
                        setEwbPassword("");
                      }
                    }}
                    onChange={(e) => setEwbPassword(e.target.value)}
                    className="h-9 text-xs pr-10 font-mono font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* EWB GSTIN */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Company Registered GSTIN</span>
                  <span className="text-[10px] text-slate-400 font-normal">15-character GSTIN</span>
                </label>
                <Input
                  type="text"
                  maxLength={15}
                  value={ewbGstin}
                  placeholder="e.g. 29AABCU9603R1ZM"
                  onChange={(e) => setEwbGstin(e.target.value.toUpperCase())}
                  className="h-9 text-xs font-mono font-semibold uppercase"
                />
              </div>
            </div>

            {/* Advanced GSP Overrides */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer select-none"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Advanced GSP Application Overrides (Optional)</span>
              </button>

              {showAdvanced && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Leave these empty to use the platform Dokploy GSP gateway (
                    <code className="text-indigo-600 font-mono">{platformGspBaseUrl}</code>).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">GSP Base URL</label>
                      <Input
                        type="text"
                        value={gspBaseUrlOverride}
                        placeholder={platformGspBaseUrl}
                        onChange={(e) => setGspBaseUrlOverride(e.target.value)}
                        className="h-8 text-xs font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Custom Client ID</label>
                      <Input
                        type="text"
                        value={gspClientIdOverride}
                        placeholder="App ID"
                        onChange={(e) => setGspClientIdOverride(e.target.value)}
                        className="h-8 text-xs font-mono bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Custom Secret</label>
                      <Input
                        type="password"
                        value={gspClientSecretOverride}
                        placeholder={hasSavedGspSecret ? "••••••••••••" : "Secret"}
                        onFocus={() => {
                          if (hasSavedGspSecret && gspClientSecretOverride.startsWith("••")) {
                            setGspClientSecretOverride("");
                          }
                        }}
                        onChange={(e) => setGspClientSecretOverride(e.target.value)}
                        className="h-8 text-xs font-mono bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEwbModalOpen(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isTesting || isLoading}
                  onClick={handleTestConnection}
                  className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>Test Credentials</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={isSaving || isLoading}
                  onClick={handleSave}
                  className="text-xs h-9 gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Configuration</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
