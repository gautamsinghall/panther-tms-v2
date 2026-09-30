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
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { CompanyNavTabs } from "@/components/company/company-nav-tabs";

interface ApiCenterData {
  ewb_username: string;
  ewb_password: string;
  ewb_gstin: string;
  is_ewb_active: boolean;
  gsp_client_id_override?: string;
  gsp_base_url_override?: string;
  has_gsp_secret_override?: boolean;
  platform_gsp_configured: boolean;
  platform_gsp_base_url: string;
}

export default function ApiCenterPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form Fields
  const [ewbUsername, setEwbUsername] = useState("");
  const [ewbPassword, setEwbPassword] = useState("");
  const [ewbGstin, setEwbGstin] = useState("");
  const [isEwbActive, setIsEwbActive] = useState(true);

  // Advanced Overrides
  const [gspBaseUrlOverride, setGspBaseUrlOverride] = useState("");
  const [gspClientIdOverride, setGspClientIdOverride] = useState("");
  const [gspClientSecretOverride, setGspClientSecretOverride] = useState("");

  // Platform info
  const [platformGspBaseUrl, setPlatformGspBaseUrl] = useState("https://gsp.adaequare.com");
  const [platformConfigured, setPlatformConfigured] = useState(true);

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    token_preview?: string;
    details?: any;
  } | null>(null);

  // Load existing API Center settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<ApiCenterData>("/api/v1/profile/api-center");
      if (data) {
        setEwbUsername(data.ewb_username || "");
        setEwbPassword(data.ewb_password || "");
        setEwbGstin(data.ewb_gstin || "");
        setIsEwbActive(data.is_ewb_active !== undefined ? data.is_ewb_active : true);
        setGspBaseUrlOverride(data.gsp_base_url_override || "");
        setGspClientIdOverride(data.gsp_client_id_override || "");
        setPlatformGspBaseUrl(data.platform_gsp_base_url || "https://gsp.adaequare.com");
        setPlatformConfigured(data.platform_gsp_configured ?? true);
      }
    } catch (err: any) {
      console.error("Failed to load API Center settings:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load API Center configuration.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);

      const payload: any = {
        ewb_username: ewbUsername.trim(),
        ewb_password: ewbPassword.trim(),
        ewb_gstin: ewbGstin.trim().toUpperCase(),
        is_ewb_active: isEwbActive,
        gsp_base_url_override: gspBaseUrlOverride.trim() || null,
        gsp_client_id_override: gspClientIdOverride.trim() || null,
      };

      if (gspClientSecretOverride.trim()) {
        payload.gsp_client_secret_override = gspClientSecretOverride.trim();
      }

      await apiClient.put("/api/v1/profile/api-center", payload);
      setFeedback({
        type: "success",
        message: "API Center settings saved successfully! Live E-Way Bill fetch will use these credentials.",
      });
    } catch (err: any) {
      console.error("Failed to save API Center settings:", err);
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save API Center configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test EWB Connection
  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const payload: any = {
        ewb_username: ewbUsername.trim() || undefined,
        ewb_password: ewbPassword.trim() || undefined,
        ewb_gstin: ewbGstin.trim() || undefined,
        gsp_base_url: gspBaseUrlOverride.trim() || undefined,
        gsp_client_id: gspClientIdOverride.trim() || undefined,
        gsp_client_secret: gspClientSecretOverride.trim() || undefined,
      };

      const res = await apiClient.post<any>("/api/v1/profile/api-center/test-ewb", payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Connection test failed. Unable to reach GSP gateway.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="API Center & Compliance Gateways"
        description="Configure enterprise compliance APIs, GST Suvidha Provider (GSP) gateways, and portal credentials for live E-Way Bill auto-fetching."
        breadcrumbs={[
          { label: "Company Settings", href: "/company/details" },
          { label: "API Center" },
        ]}
      >
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isTesting || isLoading}
            onClick={handleTestConnection}
            className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
            <span>Test Connection</span>
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
      </PageHeader>

      {/* Navigation Tabs under Company Settings */}
      <CompanyNavTabs />

      {/* Feedback Alert */}
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
            <span className="font-semibold">{feedback.type === "success" ? "Saved Successfully" : "Error Occurred"}</span>
            <p className="leading-relaxed">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Live Test Results Alert */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xs ${
            testResult.success
              ? "bg-emerald-50/80 text-emerald-900 border-emerald-200"
              : "bg-rose-50/80 text-rose-900 border-rose-200"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">
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
            {testResult.token_preview && (
              <div className="mt-2 p-2 bg-white rounded border border-emerald-200 font-mono text-[11px] text-slate-700 flex items-center justify-between">
                <span>Bearer Token: <strong className="text-indigo-600">{testResult.token_preview}</strong></span>
                <span className="text-slate-400">Valid</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Card: E-Way Bill Setup */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>E-Way Bill Setup (NIC / GSP Portal)</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  Live Auto-Fetch Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tenant credentials used to query and populate commercial invoices & consignments during LR booking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Integration Status:</span>
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
            <span className={`text-xs font-semibold ${isEwbActive ? "text-indigo-600" : "text-slate-400"}`}>
              {isEwbActive ? "Active" : "Disabled"}
            </span>
          </div>
        </div>

        {/* Informational Callout */}
        <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-950 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p>
              <strong>Zero-Configuration Platform Gateway:</strong> Common GSP keys (App ID, Secret & Gateway URL) are stored securely in the platform environment (<code className="font-mono text-indigo-700">{platformGspBaseUrl}</code>).
            </p>
            <p className="text-indigo-700">
              Only company-specific portal details (your E-Way bill username, password, and registered GSTIN) are required below.
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* EWB Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>E-Way Bill Portal Username</span>
              <span className="text-[10px] text-slate-400 font-normal">NIC GSP Username</span>
            </label>
            <Input
              type="text"
              value={ewbUsername}
              placeholder=""
              onChange={(e) => setEwbUsername(e.target.value)}
              className="h-10 text-xs font-mono font-medium"
            />
          </div>

          {/* EWB Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>E-Way Bill Portal Password</span>
              <span className="text-[10px] text-slate-400 font-normal">NIC API Password</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={ewbPassword}
                placeholder=""
                onChange={(e) => setEwbPassword(e.target.value)}
                className="h-10 text-xs pr-10 font-mono font-medium"
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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Company Registered GSTIN</span>
              <span className="text-[10px] text-slate-400 font-normal">15-character GSTIN</span>
            </label>
            <Input
              type="text"
              maxLength={15}
              value={ewbGstin}
              placeholder=""
              onChange={(e) => setEwbGstin(e.target.value.toUpperCase())}
              className="h-10 text-xs font-mono font-semibold uppercase"
            />
          </div>
        </div>

        {/* Collapsible Advanced GSP Gateway Overrides */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer select-none"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>Advanced Gateway Overrides (For Custom Enterprise GSP Applications)</span>
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Leave these blank to use the pre-configured global platform GSP gateway. Only fill these if your organization maintains its own private Adaequare, ClearTax, or direct NIC ASP account.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Custom GSP Base URL</label>
                  <Input
                    type="text"
                    value={gspBaseUrlOverride}
                    placeholder=""
                    onChange={(e) => setGspBaseUrlOverride(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Custom GSP App ID (Client ID)</label>
                  <Input
                    type="text"
                    value={gspClientIdOverride}
                    placeholder=""
                    onChange={(e) => setGspClientIdOverride(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Custom GSP App Secret</label>
                  <Input
                    type="password"
                    value={gspClientSecretOverride}
                    placeholder=""
                    onChange={(e) => setGspClientSecretOverride(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400">
            Encrypted with AES-256 and restricted to authorized operational tenant users.
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isTesting || isLoading}
              onClick={handleTestConnection}
              className="text-xs h-8 gap-1.5 cursor-pointer bg-white"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />}
              <span>Test Credentials</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSaving || isLoading}
              onClick={handleSave}
              className="text-xs h-8 gap-1.5 cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Additional Compliance & Telemetry Integrations (Roadmap / Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        {/* FASTag Telemetry */}
        <Card className="p-5 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Radio className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full">
              Roadmap
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">FASTag & Toll Telemetry</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Automated plaza deduction logs, transit tracking pings, and toll expense reconciliation per trip.
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>NPCI FASTag Network</span>
          </div>
        </Card>

        {/* SMS / WhatsApp Alerts */}
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
    </div>
  );
}
