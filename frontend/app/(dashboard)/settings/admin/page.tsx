"use client";

import React, { useState } from "react";
import { Sliders, Bell, Globe, CheckCircle2, Server } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST +5:30)");
  const [currency, setCurrency] = useState("INR (₹)");
  const [smsGateway, setSmsGateway] = useState("Karix / Gupshup API");
  const [fastagApi, setFastagApi] = useState("IDFC / ICICI FASTag Gateway");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settings updated successfully.
            </div>
          )}

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
              />
              <Input
                label="FASTag Toll Auto-Reconciliation API"
                value={fastagApi}
                onChange={(e) => setFastagApi(e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-[#E4E7EC] flex justify-end">
              <Button variant="primary" type="submit">
                Save Admin Settings
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
