"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Server,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Save,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { ApiCenterNavTabs } from "@/components/api-center/api-center-nav-tabs";

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
}

export default function EWayBillApiPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

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
        message: err?.message || "Failed to load E-Way Bill API configuration.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

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
        message: "E-Way Bill API settings saved securely! Live invoice fetch will use these credentials.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save E-Way Bill API configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="API Center"
        description="Unified external gateway credentials, real-time telemetry integrations, and developer hooks."
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={isLoading}
            className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : "text-indigo-600"}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </PageHeader>

      {/* API Center Sub-Nav Tabs */}
      <ApiCenterNavTabs />

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
            <span className="font-semibold">{feedback.type === "success" ? "Success" : "Notice"}</span>
            <p className="leading-relaxed">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Test Connection Results */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs shadow-2xs ${
            testResult.success
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 flex-1">
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
          </div>
        </div>
      )}

      {/* Main E-Way Bill Configuration Card */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>E-Way Bill Gateway (NIC / GSP Portal)</span>
                <Badge variant={isEwbActive ? "success" : "neutral"} className="text-[10px]">
                  {isEwbActive ? "Live Fetch Active" : "Disabled"}
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure official NIC portal or GSP credentials to query commercial invoices and auto-fill LR details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
              <span>Test Connection</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isTesting}
              className="text-xs h-9 gap-1.5 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </Button>
          </div>
        </div>

        {/* Integration Status Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="font-semibold text-slate-800 block text-sm">Integration Status</span>
            <span className="text-slate-500 text-xs">
              {isEwbActive
                ? "E-Way Bill live query is enabled across LR bookings and consignment flows."
                : "E-Way Bill integration is currently disabled."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsEwbActive(!isEwbActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              isEwbActive ? "bg-indigo-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEwbActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* EWB Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>E-Way Bill Portal Username</span>
              <span className="text-[10px] text-slate-400 font-normal">NIC GSP Username</span>
            </label>
            <Input
              type="text"
              value={ewbUsername}
              placeholder="e.g. NIC_GSP_USER"
              onChange={(e) => setEwbUsername(e.target.value)}
              className="h-10 text-xs font-mono font-medium bg-white"
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
                className="h-10 text-xs pr-10 font-mono font-medium bg-white"
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
              <span className="text-[10px] text-slate-400 font-normal">15-character alphanumeric</span>
            </label>
            <Input
              type="text"
              maxLength={15}
              value={ewbGstin}
              placeholder="e.g. 27ABCDE1234F1Z5"
              onChange={(e) => setEwbGstin(e.target.value.toUpperCase())}
              className="h-10 text-xs font-mono font-bold tracking-wider uppercase bg-white"
            />
            <p className="text-[11px] text-slate-400">
              Must match the primary GSTIN registered with your NIC portal account.
            </p>
          </div>
        </div>

        {/* Advanced GSP Gateway Configuration */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500" />
              <span>Advanced GSP &amp; Portal Gateway Overrides</span>
              {gspClientIdOverride && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
                  Custom GSP Active
                </span>
              )}
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showAdvanced && (
            <div className="p-4 border-t border-slate-200 bg-white space-y-4">
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Platform GSP Default Routing</span>
                </span>
                <p className="text-indigo-800/80 text-[11px] leading-relaxed">
                  By default, PANTHER uses managed platform GSP pipes (Adaequare / NIC Gateway).
                  You only need to customize these if your company has dedicated GSP client IDs or enterprise gateway contracts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">
                    GSP Base URL Override
                  </label>
                  <Input
                    type="url"
                    value={gspBaseUrlOverride}
                    placeholder={`Default: ${platformGspBaseUrl}`}
                    onChange={(e) => setGspBaseUrlOverride(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Custom GSP Client ID
                  </label>
                  <Input
                    type="text"
                    value={gspClientIdOverride}
                    placeholder="Enter custom GSP Client ID"
                    onChange={(e) => setGspClientIdOverride(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Custom GSP Client Secret
                  </label>
                  <Input
                    type="password"
                    value={gspClientSecretOverride}
                    placeholder={hasSavedGspSecret ? "••••••••••••" : "Enter GSP Client Secret"}
                    onFocus={() => {
                      if (hasSavedGspSecret && gspClientSecretOverride.startsWith("••")) {
                        setGspClientSecretOverride("");
                      }
                    }}
                    onChange={(e) => setGspClientSecretOverride(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
