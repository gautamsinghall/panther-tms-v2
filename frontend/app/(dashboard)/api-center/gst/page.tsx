"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Server,
  RefreshCw,
  Search,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  FileCheck,
  Activity,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { ApiCenterNavTabs } from "@/components/api-center/api-center-nav-tabs";

interface ApiCenterData {
  id?: number;
  is_gst_active?: boolean;
  gsp_client_id_override?: string;
  gsp_base_url_override?: string;
  has_gsp_secret_override?: boolean;
  platform_gsp_configured: boolean;
  platform_gsp_base_url: string;
}

interface GSTVerificationResult {
  success: boolean;
  message?: string;
  gstin?: string;
  pan?: string;
  legal_name?: string;
  trade_name?: string;
  incorporation_date?: string;
  legal_status?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
  raw_data?: any;
}

interface TaxTransactionItem {
  id: number;
  api_type: string;
  query_value: string;
  state_code?: string;
  trade_name?: string;
  legal_name?: string;
  status: string;
  source?: string;
  description?: string;
  counter_after: number;
  created_at: string;
}

interface TaxCounterData {
  total_lookups: number;
  successful_lookups: number;
  failed_lookups: number;
  is_active: boolean;
  pricing_notice: string;
  transactions: TaxTransactionItem[];
}

export default function GSTApiPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCounterLoading, setIsCounterLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  // Configuration Form Fields
  const [isGstActive, setIsGstActive] = useState(true);
  const [gspBaseUrlOverride, setGspBaseUrlOverride] = useState("");
  const [gspClientIdOverride, setGspClientIdOverride] = useState("");
  const [gspClientSecretOverride, setGspClientSecretOverride] = useState("");
  const [hasSavedSecret, setHasSavedSecret] = useState(false);

  // Counter & Audit Ledger State
  const [counterData, setCounterData] = useState<TaxCounterData>({
    total_lookups: 0,
    successful_lookups: 0,
    failed_lookups: 0,
    is_active: true,
    pricing_notice: "Standard government GSTIN query and taxpayer profile verification.",
    transactions: [],
  });
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");

  // Interactive Sandbox / Testing
  const [testGstin, setTestGstin] = useState("27AAACT2727Q1ZW");
  const [verificationResult, setVerificationResult] = useState<GSTVerificationResult | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<ApiCenterData>("/api/v1/profile/api-center");
      if (data) {
        setIsGstActive(data.is_gst_active !== undefined ? data.is_gst_active : true);
        setGspBaseUrlOverride(data.gsp_base_url_override || "");
        setGspClientIdOverride(data.gsp_client_id_override || "");
        setHasSavedSecret(Boolean(data.has_gsp_secret_override));
        setGspClientSecretOverride(data.has_gsp_secret_override ? "••••••••••••" : "");

        if (data.gsp_client_id_override) {
          setShowAdvanced(true);
        }
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load GST API configuration.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounter = async () => {
    try {
      setIsCounterLoading(true);
      const data = await apiClient.get<TaxCounterData>("/api/v1/profile/api-center/gst-counter");
      if (data) {
        setCounterData(data);
      }
    } catch (err) {
      console.warn("Failed to load GST query counter:", err);
    } finally {
      setIsCounterLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCounter();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);

      const payload: any = {
        is_gst_active: isGstActive,
        gsp_base_url_override: gspBaseUrlOverride.trim() || null,
        gsp_client_id_override: gspClientIdOverride.trim() || null,
      };

      if (gspClientSecretOverride && !gspClientSecretOverride.startsWith("••")) {
        payload.gsp_client_secret_override = gspClientSecretOverride.trim();
      }

      await apiClient.put("/api/v1/profile/api-center", payload);

      if (gspClientSecretOverride && !gspClientSecretOverride.startsWith("••")) {
        setHasSavedSecret(true);
        setGspClientSecretOverride("••••••••••••");
      }

      setFeedback({
        type: "success",
        message: "GST API configuration saved successfully! Form autofill will use these credentials.",
      });
      fetchCounter();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save GST API configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyGstin = async () => {
    const clean = testGstin.trim().toUpperCase();
    if (!clean || clean.length !== 15) {
      setFeedback({
        type: "error",
        message: "Please enter a valid 15-character alphanumeric GSTIN to verify.",
      });
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationResult(null);
      setFeedback(null);

      const res = await apiClient.post<any>("/api/v1/profile/api-center/test-gst", {
        gstin: clean,
        gsp_client_id: gspClientIdOverride.trim() || undefined,
        gsp_client_secret:
          gspClientSecretOverride && !gspClientSecretOverride.startsWith("••")
            ? gspClientSecretOverride.trim()
            : undefined,
        gsp_base_url: gspBaseUrlOverride.trim() || undefined,
      });

      if (res && res.success) {
        setVerificationResult(res.details || res);
        setFeedback({
          type: "success",
          message: `GSTIN ${clean} verified! Taxpayer details retrieved successfully.`,
        });
      } else {
        setVerificationResult(res?.details || null);
        setFeedback({
          type: "error",
          message: res?.message || "GSTIN lookup failed. Check GSTIN validity.",
        });
      }
      fetchCounter();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Error verifying GSTIN against gateway.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredTransactions = (counterData.transactions || []).filter((tx) => {
    if (!ledgerSearchTerm) return true;
    const q = ledgerSearchTerm.toLowerCase();
    return (
      tx.query_value.toLowerCase().includes(q) ||
      (tx.legal_name && tx.legal_name.toLowerCase().includes(q)) ||
      (tx.trade_name && tx.trade_name.toLowerCase().includes(q)) ||
      (tx.source && tx.source.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Page Header with Refresh Counter Action */}
      <PageHeader
        title="API Center"
        description="Unified gateway credentials, real-time government regulatory APIs, and taxpayer verification."
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSettings();
              fetchCounter();
            }}
            disabled={isLoading || isCounterLoading}
            className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isCounterLoading ? "animate-spin" : "text-indigo-600"}`}
            />
            <span>Refresh Counter</span>
          </Button>
        </div>
      </PageHeader>

      <ApiCenterNavTabs />

      {/* Alert / Feedback message */}
      {feedback && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-xs font-medium border transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold block">
              {feedback.type === "success" ? "Success" : "Notice"}
            </span>
            <p className="mt-0.5 leading-relaxed">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Top 3 KPI Counter Cards (matching FASTag and SIM tracking) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total GST Lookups Counter */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              GST Calls / Lookups
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {counterData.total_lookups}{" "}
              <span className="text-sm font-semibold text-slate-500 font-sans">Lookups Performed</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live automated taxpayer autofill queries
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isGstActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
              }`}
            >
              {isGstActive ? "Active API Integration" : "Disabled"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">GST Portal Query</span>
          </div>
        </div>

        {/* Card 2: Successful Verifications */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Successful Verifications
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {counterData.successful_lookups}{" "}
              <span className="text-sm font-semibold text-emerald-700 font-sans">Verified</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unresolved / Failed: <strong className="text-slate-800">{counterData.failed_lookups}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 text-[11px]">Valid Taxpayer Profiles</span>
            <span className="text-[10px] font-mono text-slate-400">Registry Feed</span>
          </div>
        </div>

        {/* Card 3: Regulatory Gateway Pipeline */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Regulatory Gateway Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <span>National Taxpayer Registry</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              GSTIN verification &amp; master profile autofill
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">Automatic Master Autofill</span>
            <span className="text-[10px] font-mono text-slate-400">Active Pipe</span>
          </div>
        </div>
      </div>

      {/* Gateway Configuration Card */}
      <Card className="p-6 border-slate-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">GST API Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Credentials used by Panther TMS to verify GSTINs and populate party masters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={isGstActive}
                onChange={(e) => setIsGstActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Enable GST API Autofill</span>
            </label>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-800">
                Environment Credentials Active (.env)
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Platform gateway credentials are configured via secure server environment variables (<code>.env</code>).
              You can optionally specify custom tenant-level credentials below.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <span>{showAdvanced ? "Hide Custom Tenant Credentials" : "Configure Custom Tenant Credentials"}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showAdvanced && (
            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Client ID / App Key
                  </label>
                  <Input
                    value={gspClientIdOverride}
                    onChange={(e) => setGspClientIdOverride(e.target.value)}
                    placeholder="Enter custom Client ID"
                    className="text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Overrides default platform Client ID for this tenant.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Client Secret / App Secret
                  </label>
                  <div className="relative">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={gspClientSecretOverride}
                      onChange={(e) => setGspClientSecretOverride(e.target.value)}
                      placeholder={hasSavedSecret ? "••••••••••••" : "Enter custom Client Secret"}
                      className="text-xs font-mono pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Stored securely. Leave masked to keep existing secret.
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Gateway Base URL
                  </label>
                  <Input
                    value={gspBaseUrlOverride}
                    onChange={(e) => setGspBaseUrlOverride(e.target.value)}
                    placeholder="https://gsp.adaequare.com"
                    className="text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Leave blank to use default gateway endpoint.
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs h-9 gap-1.5 cursor-pointer shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Interactive Verification Sandbox */}
      <Card className="p-6 border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Live GST Verification Sandbox</h3>
              <p className="text-xs text-slate-500">
                Test any 15-digit GSTIN to preview taxpayer data returned by the API gateway.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            Action: TP Search
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              value={testGstin}
              onChange={(e) => setTestGstin(e.target.value.toUpperCase())}
              placeholder="e.g. 27AAACT2727Q1ZW"
              maxLength={15}
              className="font-mono text-sm font-semibold tracking-wider uppercase h-10"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              15-character alphanumeric GSTIN (Format: 2-digit state + 10-char PAN + 3-char entity code)
            </span>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleVerifyGstin}
            disabled={isVerifying || !isGstActive}
            className="h-10 px-5 gap-2 text-xs font-semibold cursor-pointer shrink-0"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Verify GSTIN</span>
              </>
            )}
          </Button>
        </div>

        {/* Verification Result Display */}
        {verificationResult && (
          <div className="mt-4 p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                  Taxpayer Profile Verified
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                {verificationResult.gstin}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Trade / Operating Name</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {verificationResult.trade_name || verificationResult.legal_name || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Legal Registered Entity</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {verificationResult.legal_name || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Income Tax PAN</span>
                <span className="font-mono font-bold text-indigo-700 mt-0.5 block">
                  {verificationResult.pan || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Constitution of Business</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {verificationResult.legal_status || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">Registration Date</span>
                <span className="font-mono text-slate-800 mt-0.5 block flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {verificationResult.incorporation_date || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px]">State &amp; State Code</span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {verificationResult.state} {verificationResult.state_code ? `(${verificationResult.state_code})` : ""}
                </span>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <span className="text-slate-500 block text-[11px]">Principal Registered Address</span>
                <span className="font-medium text-slate-800 mt-0.5 block flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    {verificationResult.address ? `${verificationResult.address}, ` : ""}
                    {verificationResult.city ? `${verificationResult.city}, ` : ""}
                    {verificationResult.state ? `${verificationResult.state} ` : ""}
                    {verificationResult.pincode ? `- ${verificationResult.pincode}` : ""}
                  </span>
                </span>
              </div>
            </div>

            {/* Toggle Raw JSON */}
            <div className="pt-2 border-t border-emerald-200/60">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                <span>{showRawJson ? "Hide Raw Response Payload" : "View Raw Response Payload"}</span>
                {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showRawJson && (
                <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(verificationResult, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Query History & Audit Ledger Table (matching FASTag and SIM tracking) */}
      <Card className="p-6 border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">GST Verification Ledger &amp; Audit History</h3>
            <p className="text-xs text-slate-500">
              Complete audit trail of all GSTIN queries executed from forms and the API Center sandbox.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={ledgerSearchTerm}
              onChange={(e) => setLedgerSearchTerm(e.target.value)}
              placeholder="Search by GSTIN or name..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No GST queries recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Queries executed from forms or the sandbox above will automatically appear in this ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">GSTIN</th>
                  <th className="py-2.5 px-3 font-semibold">Legal / Business Name</th>
                  <th className="py-2.5 px-3 font-semibold">Source</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Counter #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {tx.created_at || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {tx.query_value}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      <span className="font-semibold block">{tx.legal_name || tx.trade_name || "—"}</span>
                      {tx.trade_name && tx.legal_name && tx.trade_name !== tx.legal_name && (
                        <span className="text-[10px] text-slate-500 block">{tx.trade_name}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono">
                        {tx.source || "AUTOFILL"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          tx.status === "SUCCESS"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {tx.status === "SUCCESS" ? (
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                        )}
                        <span>{tx.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 font-semibold">
                      #{tx.counter_after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
