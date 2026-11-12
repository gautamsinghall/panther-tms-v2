"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Server,
  RefreshCw,
  Search,
  Save,
  Check,
  Activity,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { ApiCenterNavTabs } from "@/components/api-center/api-center-nav-tabs";

interface ApiCenterData {
  id?: number;
  is_rc_active?: boolean;
  rc_api_url_override?: string;
  has_rc_key_override?: boolean;
  platform_rc_configured?: boolean;
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
  credits_deducted?: number;
  balance_after?: number | null;
  created_at: string;
}

interface TaxCounterData {
  total_lookups: number;
  successful_lookups: number;
  failed_lookups: number;
  api_calls_left: number;
  is_active: boolean;
  pricing_notice: string;
  transactions: TaxTransactionItem[];
}

export default function RCApiPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isCounterLoading, setIsCounterLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Configuration Form Fields
  const [isRcActive, setIsRcActive] = useState(true);
  const [rcApiUrlOverride, setRcApiUrlOverride] = useState("");
  const [rcApiKeyOverride, setRcApiKeyOverride] = useState("");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  // Counter & Audit Ledger State
  const [counterData, setCounterData] = useState<TaxCounterData>({
    total_lookups: 0,
    successful_lookups: 0,
    failed_lookups: 0,
    api_calls_left: 0,
    is_active: true,
    pricing_notice: "Standard government RC verification query via Vahan registry.",
    transactions: [],
  });
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");

  // Test Tool State
  const [testVehicleNumber, setTestVehicleNumber] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<ApiCenterData>("/api/v1/profile/api-center");
      if (data) {
        setIsRcActive(data.is_rc_active !== undefined ? data.is_rc_active : true);
        setRcApiUrlOverride(data.rc_api_url_override || "");
        setHasSavedKey(Boolean(data.has_rc_key_override));
        setRcApiKeyOverride(data.has_rc_key_override ? "••••••••••••" : "");
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load RC API configuration.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCounter = async () => {
    try {
      setIsCounterLoading(true);
      const data = await apiClient.get<TaxCounterData>("/api/v1/profile/api-center/rc-counter");
      if (data) {
        setCounterData(data);
      }
    } catch (err) {
      console.warn("Failed to load RC query counter:", err);
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
        is_rc_active: isRcActive,
        rc_api_url_override: rcApiUrlOverride.trim() || null,
      };

      if (rcApiKeyOverride && !rcApiKeyOverride.startsWith("••")) {
        payload.rc_api_key_override = rcApiKeyOverride.trim();
      }

      await apiClient.put("/api/v1/profile/api-center", payload);

      if (rcApiKeyOverride && !rcApiKeyOverride.startsWith("••")) {
        setHasSavedKey(true);
        setRcApiKeyOverride("••••••••••••");
      }

      setFeedback({
        type: "success",
        message: "RC Verification API configuration saved successfully! Vehicle forms will use these credentials.",
      });
      fetchCounter();
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save RC API configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async () => {
    const cleanVeh = testVehicleNumber.replace(/\s+/g, "").toUpperCase();
    if (!cleanVeh || cleanVeh.length < 4) {
      alert("Please enter a valid vehicle registration number (e.g. MH04AZ5678).");
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);

      const payload: any = {
        vehicle_number: cleanVeh,
      };
      if (rcApiKeyOverride && !rcApiKeyOverride.startsWith("••")) {
        payload.rc_api_key = rcApiKeyOverride.trim();
      }
      if (rcApiUrlOverride.trim()) {
        payload.rc_api_url = rcApiUrlOverride.trim();
      }

      const res = await apiClient.post<any>("/api/v1/profile/api-center/test-rc", payload);
      setTestResult(res);
      fetchCounter();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Test connection failed.",
      });
    } finally {
      setIsTesting(false);
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
    <div className="space-y-6 max-w-[1440px] mx-auto pb-16">
      {/* Page Header with Refresh Action */}
      <PageHeader
        title="API Center"
        description="Unified gateway credentials, real-time government regulatory APIs, and Vahan RC verification."
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
            <span>Refresh Quota &amp; Counter</span>
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

      {/* Top 3 KPI Counter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: RC Calls Available */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              RC Calls Available
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {counterData.api_calls_left}{" "}
              <span className="text-sm font-semibold text-slate-500 font-sans">Calls Left</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Standard Tariff: <strong className="text-slate-800">1 Credit / Fetch</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                (counterData.api_calls_left ?? 0) > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {(counterData.api_calls_left ?? 0) > 0
                ? `Active Quota (${counterData.api_calls_left} Calls)`
                : "Exhausted (0 Calls)"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Vahan MoRTH</span>
          </div>
        </div>

        {/* Card 2: Total RC Lookups */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Total RC Lookups
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {counterData.total_lookups}{" "}
              <span className="text-sm font-semibold text-slate-500 font-sans">Queries Performed</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verified: <strong className="text-emerald-700">{counterData.successful_lookups}</strong> | Failed:{" "}
              <strong className="text-slate-700">{counterData.failed_lookups}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 text-[11px]">Valid Vehicles Logged</span>
            <span className="text-[10px] font-mono text-slate-400">National Registry</span>
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
              <span>National Vahan Registry</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              RC technical specs, insurance, fitness &amp; permit autofill
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isRcActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
              }`}
            >
              {isRcActive ? "Active Pipe" : "Disabled"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">Live API</span>
          </div>
        </div>
      </div>

      {/* Gateway Configuration Card */}
      <Card className="p-6 border-slate-200 shadow-2xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Vehicle RC Verification API Configuration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Credentials and endpoints used by Panther TMS to verify vehicle registration and autofill specs in Company and Market Vehicles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-700 cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={isRcActive}
                onChange={(e) => setIsRcActive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
              />
              <span>Enable RC Verification</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Logitrack RC Endpoint URL
              </label>
              <input
                type="text"
                value={rcApiUrlOverride}
                onChange={(e) => setRcApiUrlOverride(e.target.value)}
                placeholder="https://logitrack.webcorevision.com:5000/api/v1/vehicle-info"
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Leave empty to use the system default: <code className="text-slate-600">https://logitrack.webcorevision.com:5000/api/v1/vehicle-info</code>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>RC API Key</span>
                {hasSavedKey && (
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Key Saved
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={rcApiKeyOverride}
                  onChange={(e) => setRcApiKeyOverride(e.target.value)}
                  placeholder="Paste your Logitrack / Vahan API key here"
                  className="w-full h-9 pl-3 pr-10 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Shared or dedicated x-api-key for vehicle verification. Defaults to project FASTag/Logitrack key if unset.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
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

      {/* Test RC Verification Tool */}
      <Card className="p-6 border-slate-200 shadow-2xs space-y-4">
        <div className="pb-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Test Live RC Verification</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test your credentials against live Vahan registry data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={testVehicleNumber}
              onChange={(e) => setTestVehicleNumber(e.target.value.toUpperCase())}
              placeholder="Enter Vehicle Reg No. (e.g. MH04AZ5678, DL1AA1234)"
              className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-semibold rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 uppercase tracking-widest"
            />
          </div>
          <Button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="h-10 text-xs gap-1.5 px-5 cursor-pointer shrink-0"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Querying Vahan...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Verify RC &amp; Test</span>
              </>
            )}
          </Button>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs space-y-3 ${
              testResult.success
                ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                : "bg-rose-50/60 border-rose-200 text-rose-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>{testResult.success ? "RC Verification Successful" : "Verification Failed"}</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/80 border border-slate-200">
                {testResult.vehicle_number || testVehicleNumber}
              </span>
            </div>

            <p className="text-xs leading-relaxed">{testResult.message}</p>

            {testResult.details && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-emerald-200/60 text-[11px]">
                {testResult.details.vehicle_description && (
                  <div>
                    <span className="text-slate-500 block font-medium">Maker / Model:</span>
                    <strong className="text-slate-800">{testResult.details.vehicle_description}</strong>
                  </div>
                )}
                {testResult.details.owner_name && (
                  <div>
                    <span className="text-slate-500 block font-medium">Registered Owner:</span>
                    <strong className="text-slate-800">{testResult.details.owner_name}</strong>
                  </div>
                )}
                {testResult.details.vehicle_class && (
                  <div>
                    <span className="text-slate-500 block font-medium">Class:</span>
                    <strong className="text-slate-800">{testResult.details.vehicle_class}</strong>
                  </div>
                )}
                {testResult.details.rc_status && (
                  <div>
                    <span className="text-slate-500 block font-medium">RC Status:</span>
                    <strong className="text-emerald-700">{testResult.details.rc_status}</strong>
                  </div>
                )}
                {testResult.details.fitness_expiry && (
                  <div>
                    <span className="text-slate-500 block font-medium">Fitness Valid Upto:</span>
                    <strong className="text-slate-800 font-mono">{testResult.details.fitness_expiry}</strong>
                  </div>
                )}
                {testResult.details.insurance_expiry && (
                  <div>
                    <span className="text-slate-500 block font-medium">Insurance Upto:</span>
                    <strong className="text-slate-800 font-mono">{testResult.details.insurance_expiry}</strong>
                  </div>
                )}
                {testResult.details.tax_validity && (
                  <div>
                    <span className="text-slate-500 block font-medium">Road Tax Upto:</span>
                    <strong className="text-slate-800 font-mono">{testResult.details.tax_validity}</strong>
                  </div>
                )}
                {testResult.details.puc_expiry && (
                  <div>
                    <span className="text-slate-500 block font-medium">PUC Valid Upto:</span>
                    <strong className="text-slate-800 font-mono">{testResult.details.puc_expiry}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Query History & Audit Ledger Table */}
      <Card className="p-6 border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-sm text-slate-900">RC Verification Ledger &amp; Audit History</h3>
            <p className="text-xs text-slate-500">
              Complete audit trail of all vehicle RC lookups executed across Company and Market Vehicles.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={ledgerSearchTerm}
              onChange={(e) => setLedgerSearchTerm(e.target.value)}
              placeholder="Search by vehicle, model, owner..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No RC queries recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Queries executed from Company and Market Vehicle forms will automatically appear in this ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Vehicle Number</th>
                  <th className="py-2.5 px-3 font-semibold">Maker / Model</th>
                  <th className="py-2.5 px-3 font-semibold">Registered Owner</th>
                  <th className="py-2.5 px-3 font-semibold">Source</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Debited</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Quota Left</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Counter #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {tx.created_at || "—"}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 tracking-wider">
                      {tx.query_value}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {tx.trade_name || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      <span className="font-semibold block">{tx.legal_name || "—"}</span>
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
                    <td className="py-2.5 px-3 text-center font-mono text-[11px]">
                      {tx.credits_deducted ? (
                        <span className="text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                          -{tx.credits_deducted} Call
                        </span>
                      ) : (
                        <span className="text-slate-400">0 Calls</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold text-slate-800">
                      {tx.balance_after !== null && tx.balance_after !== undefined ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {tx.balance_after}
                        </span>
                      ) : (
                        "—"
                      )}
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

