"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Server,
  RefreshCw,
  Save,
  Radio,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

interface ApiCenterData {
  wheelseye_base_url?: string;
  wheelseye_api_token?: string | null;
  has_wheelseye_token?: boolean;
  is_wheelseye_active?: boolean;
}

export default function GPSTrackingApiPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Form Fields
  const [wheelseyeToken, setWheelseyeToken] = useState("");
  const [hasSavedToken, setHasSavedToken] = useState(false);
  const [wheelseyeBaseUrl, setWheelseyeBaseUrl] = useState("https://api.wheelseye.com");
  const [isWheelseyeActive, setIsWheelseyeActive] = useState(true);

  // Feedback states
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    total_vehicles_detected?: number;
    details?: any;
  } | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<ApiCenterData>("/api/v1/profile/api-center");
      if (data) {
        const token = data.wheelseye_api_token || "";
        setWheelseyeToken(token);
        setHasSavedToken(Boolean(token || data.has_wheelseye_token));
        setWheelseyeBaseUrl(data.wheelseye_base_url || "https://api.wheelseye.com");
        setIsWheelseyeActive(data.is_wheelseye_active !== undefined ? data.is_wheelseye_active : true);
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to load WheelsEye GPS Tracking API configuration.",
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

      const trimmedToken = wheelseyeToken.trim();
      const payload: any = {
        wheelseye_base_url: wheelseyeBaseUrl.trim() || "https://api.wheelseye.com",
        is_wheelseye_active: isWheelseyeActive,
        wheelseye_api_token: trimmedToken, // Empty string clears saved token in database
      };

      await apiClient.put("/api/v1/profile/api-center", payload);

      setHasSavedToken(Boolean(trimmedToken));

      setFeedback({
        type: "success",
        message: trimmedToken
          ? "WheelsEye GPS Tracking settings saved securely! Live vehicle telemetry will use these credentials."
          : "WheelsEye API Access Token removed successfully.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to save WheelsEye GPS Tracking configuration.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const trimmedToken = wheelseyeToken.trim();
      const payload: any = {
        wheelseye_base_url: wheelseyeBaseUrl.trim() || undefined,
        wheelseye_api_token: trimmedToken || undefined,
      };

      const res = await apiClient.post<any>("/api/v1/profile/api-center/test-wheelseye", payload);
      setTestResult({
        success: Boolean(res?.success),
        message: res?.message || (res?.success ? "Authentication successful." : "Authentication failed."),
        total_vehicles_detected: res?.total_vehicles_detected,
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
        description="Unified gateway credentials, real-time telemetry integrations, and webhooks."
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
            {testResult.total_vehicles_detected !== undefined && (
              <p className="text-[11px] font-semibold text-emerald-700">
                Live Vehicles Detected: {testResult.total_vehicles_detected}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main WheelsEye GPS Tracking Configuration Card */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>WheelsEye GPS Tracking Gateway</span>
                <Badge variant={isWheelseyeActive ? "success" : "neutral"} className="text-[10px]">
                  {isWheelseyeActive ? "Live Telemetry Active" : "Disabled"}
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your organization's dedicated WheelsEye API access token for real-time fleet GPS tracking.
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
              {isWheelseyeActive
                ? "WheelsEye live GPS tracking is enabled across Tracking section and fleet monitoring."
                : "WheelsEye GPS integration is currently disabled."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsWheelseyeActive(!isWheelseyeActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              isWheelseyeActive ? "bg-indigo-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isWheelseyeActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Credentials Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* WheelsEye API Token */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>WheelsEye API Access Token</span>
                {hasSavedToken ? (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5 font-normal">
                    Configured & Saved
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px] py-0 px-1.5 font-normal">
                    Not Configured
                  </Badge>
                )}
              </span>
              {wheelseyeToken ? (
                <button
                  type="button"
                  onClick={() => setWheelseyeToken("")}
                  className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                >
                  Clear / Remove Token
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-normal">
                  Unique Tenant Access Token
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={wheelseyeToken}
                placeholder=""
                onChange={(e) => setWheelseyeToken(e.target.value)}
                className="h-10 text-xs pr-10 font-mono font-medium bg-white"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Obtained from your WheelsEye Account Representative or Developer Portal. Token is hidden by default; click the eye icon to view or edit.
            </p>
          </div>

          {/* WheelsEye Base URL */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>WheelsEye Base API Endpoint</span>
              <span className="text-[10px] text-slate-400 font-normal">REST API Endpoint</span>
            </label>
            <Input
              type="url"
              value={wheelseyeBaseUrl}
              placeholder="https://api.wheelseye.com"
              onChange={(e) => setWheelseyeBaseUrl(e.target.value)}
              className="h-10 text-xs font-mono bg-white"
            />
          </div>
        </div>

        {/* Informational Card */}
        <div className="p-4 bg-indigo-50/60 dark:bg-[#171928] border border-indigo-100 dark:border-[#2E3150] rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Multi-Tenant GPS Isolation & Automatic Vehicle Linking</span>
          </div>
          <p className="text-indigo-800/80 dark:text-indigo-300/80 text-[11px] leading-relaxed">
            Your WheelsEye credentials are stored encrypted in your private tenant database. When vehicles are queried in the <strong>Tracking &gt; GPS Tracking</strong> screen, they are cross-referenced with your company-owned and market vehicle records and correlated with active LR booking consignments.
          </p>
        </div>
      </Card>
    </div>
  );
}

