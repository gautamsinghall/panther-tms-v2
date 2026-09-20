"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Bell, Globe, CheckCircle2, Server, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface AdminSetting {
  id?: number;
  setting_key: string;
  setting_value: string;
  description?: string;
  category?: string;
}

export default function AdminSettingsPage() {
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST +5:30)");
  const [currency, setCurrency] = useState("INR (₹)");
  const [smsGateway, setSmsGateway] = useState("Karix / Gupshup API");
  const [fastagApi, setFastagApi] = useState("IDFC / ICICI FASTag Gateway");
  const [saved, setSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient<AdminSetting[]>("/api/v1/settings/admin-settings");
        if (Array.isArray(data)) {
          const map = new Map(data.map((s) => [s.setting_key, s.setting_value]));
          if (map.has("timezone")) setTimezone(map.get("timezone")!);
          if (map.has("currency")) setCurrency(map.get("currency")!);
          if (map.has("sms_gateway")) setSmsGateway(map.get("sms_gateway")!);
          if (map.has("fastag_api")) setFastagApi(map.get("fastag_api")!);
        }
      } catch (err: any) {
        // Fallback default
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = [
      { setting_key: "timezone", setting_value: timezone, category: "localization" },
      { setting_key: "currency", setting_value: currency, category: "localization" },
      { setting_key: "sms_gateway", setting_value: smsGateway, category: "integrations" },
      { setting_key: "fastag_api", setting_value: fastagApi, category: "integrations" },
    ];

    try {
      await Promise.all(
        payload.map((s) =>
          apiClient("/api/v1/settings/admin-settings", {
            method: "POST",
            body: JSON.stringify(s),
          })
        )
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to persist admin settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Administration & Preferences"
        description="Global tenant operating parameters, telematics API gateways, SMS dispatch alerts, and localization."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Admin Setting" },
        ]}
      />

      <div className="max-w-3xl">
        <Card className="p-6 space-y-6">
          <h4 className="text-sm font-semibold text-[#172033] pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C9A227]" />
            Operating System Configuration
          </h4>

          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Admin settings saved and propagated across tenant cluster.
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-control text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex justify-center items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Loading system preferences...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="System Timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled
                />
                <Input
                  label="Base Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled
                />
                <Input
                  label="SMS / WhatsApp Notification Gateway"
                  value={smsGateway}
                  onChange={(e) => setSmsGateway(e.target.value)}
                  placeholder="Karix / Gupshup API"
                />
                <Input
                  label="FASTag Toll Auto-Reconciliation API"
                  value={fastagApi}
                  onChange={(e) => setFastagApi(e.target.value)}
                  placeholder="IDFC / ICICI FASTag Gateway"
                />
              </div>

              <div className="pt-3 border-t border-[#E4E7EC] flex justify-end">
                <Button variant="primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Admin Settings"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
