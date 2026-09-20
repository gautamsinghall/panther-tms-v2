"use client";

import React, { useState, useEffect } from "react";
import { Mail, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

interface EmailSettingData {
  id?: number;
  smtp_host?: string | null;
  smtp_port: number;
  smtp_username?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  use_tls: boolean;
  use_ssl: boolean;
  is_active: boolean;
}

export default function EmailSettingsPage() {
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEmailSettings() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiClient<EmailSettingData>("/api/v1/profile/email-settings");
        if (data) {
          setSmtpHost(data.smtp_host || "smtp.gmail.com");
          setSmtpPort(data.smtp_port || 587);
          setSmtpUsername(data.smtp_username || "");
          setFromEmail(data.from_email || "");
          setFromName(data.from_name || "PantherTMS Billing");
          setUseTls(data.use_tls !== false);
          setUseSsl(data.use_ssl === true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load email settings.");
      } finally {
        setIsLoading(false);
      }
    }

    loadEmailSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await apiClient("/api/v1/profile/email-settings", {
        method: "PUT",
        body: JSON.stringify({
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_username: smtpUsername || null,
          smtp_password: smtpPassword || undefined,
          from_email: fromEmail || null,
          from_name: fromName || null,
          use_tls: useTls,
          use_ssl: useSsl,
          is_active: true,
        }),
      });

      setSaved(true);
      setSmtpPassword("");
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to update email gateway configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automated Email & Dispatch Gateways"
        description="Configure tenant SMTP parameters for automatic LR booking confirmation, hire challan dispatches, and PDF invoices."
        breadcrumbs={[
          { label: "Profile", href: "/profile/account" },
          { label: "Email Settings" },
        ]}
      />

      <div className="max-w-3xl">
        <Card className="p-6 space-y-6">
          <h4 className="text-sm font-semibold text-[#172033] pb-2 border-b border-[#E4E7EC] flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#C9A227]" />
            Outbound SMTP Gateway Parameters
          </h4>

          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-control text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              SMTP settings saved successfully. Automated notifications will use this gateway.
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-control text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 flex justify-center items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Loading gateway parameters...
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="SMTP Host / Server"
                    placeholder="smtp.mailgun.org or smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="SMTP Port"
                  type="number"
                  placeholder="587"
                  value={String(smtpPort)}
                  onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SMTP Username"
                  placeholder="postmaster@mg.panthertms.in"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                />
                <Input
                  label="SMTP Password / App Secret"
                  type="password"
                  placeholder="••••••••••••"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Sender Display Name"
                  placeholder="PantherTMS Invoicing"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
                <Input
                  label="From Email Address"
                  type="email"
                  placeholder="billing@yourcompany.com"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTls}
                    onChange={(e) => setUseTls(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable STARTTLS (Recommended for Port 587)</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSsl}
                    onChange={(e) => setUseSsl(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Enable SSL / Direct TLS (Port 465)</span>
                </label>
              </div>

              <div className="p-3 bg-slate-50 rounded-control text-xs text-[#667085] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                SMTP credentials are encrypted in the tenant-isolated database and never shared across tenants.
              </div>

              <div className="pt-3 border-t border-[#E4E7EC] flex justify-end">
                <Button variant="primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Email Gateway Settings"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
