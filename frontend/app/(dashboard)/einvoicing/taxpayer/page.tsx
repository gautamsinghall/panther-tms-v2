"use client";

import React, { useState } from "react";
import { Search, Building2, ShieldCheck, MapPin, Calendar, CheckCircle2, AlertTriangle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { apiClient } from "@/lib/api-client";

interface TaxpayerDetails {
  gstin: string;
  legal_name: string;
  trade_name: string;
  taxpayer_type: string;
  status: string;
  state_jurisdiction: string;
  center_jurisdiction: string;
  registration_date: string;
  address: string;
  is_sandbox?: boolean;
}

export default function TaxpayerDetailsPage() {
  const [gstin, setGstin] = useState("24AAACT1234F1Z1");
  const [details, setDetails] = useState<TaxpayerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = gstin.trim().toUpperCase();
    if (query.length !== 15) {
      alert("GSTIN must be exactly 15 alphanumeric characters.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setDetails(null);

    try {
      const res = await apiClient<TaxpayerDetails>(`/api/v1/einvoicing/taxpayer/${query}`);
      setDetails(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to retrieve taxpayer records from GST registry.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Verify Taxpayer & GSTIN Search"
        description="Perform live online taxpayer validation to verify vendor, consignor, and customer GST registrations prior to billing."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "E-Invoicing", href: "/einvoicing" },
          { label: "Taxpayer Verification" },
        ]}
      />

      {/* Integration Notice Alert (rules.md §2) */}
      <div className="p-4 rounded-xl bg-warning-light border border-warning/20 text-warning text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">Mock Sandbox Registry Active (rules.md §2)</strong>
          Taxpayer lookups are processed through the GSP Provider Sandbox adapter. Real-time production GSTIN lookups will activate seamlessly upon GSP API credential configuration.
        </div>
      </div>

      {/* Search Card */}
      <div className="bg-surface rounded-card border border-border p-6 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              required
              maxLength={15}
              placeholder="Enter 15-character GSTIN (e.g. 24AAACT1234F1Z1)..."
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-border bg-surface text-text-primary font-mono uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Search className="w-4 h-4" />
            {isLoading ? "Searching GST Registry..." : "Verify GSTIN"}
          </Button>
        </form>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}

      {/* Result Card */}
      {details && (
        <div className="bg-surface rounded-card border border-border p-6 shadow-xs animate-in fade-in space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-semibold text-primary">
                  {details.gstin}
                </span>
                <StatusBadge
                  status={details.status}
                  variant={details.status === "ACTIVE" ? "success" : "danger"}
                />
                {details.is_sandbox && (
                  <Badge variant="neutral">Sandbox</Badge>
                )}
              </div>
              <h2 className="text-xl font-semibold text-text-primary mt-1">
                {details.legal_name}
              </h2>
              {details.trade_name && details.trade_name !== details.legal_name && (
                <span className="text-xs text-text-muted block mt-0.5">
                  Trade Name: {details.trade_name}
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="text-xs text-text-muted block">Taxpayer Type</span>
              <span className="font-semibold text-text-primary text-sm">
                {details.taxpayer_type}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-text-muted mt-0.5" />
                <div>
                  <span className="text-text-muted block">State Jurisdiction:</span>
                  <span className="font-semibold text-text-primary">{details.state_jurisdiction}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-text-muted mt-0.5" />
                <div>
                  <span className="text-text-muted block">Center Jurisdiction:</span>
                  <span className="font-semibold text-text-primary">{details.center_jurisdiction}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-text-muted mt-0.5" />
                <div>
                  <span className="text-text-muted block">Date of Registration:</span>
                  <span className="font-semibold text-text-primary">{details.registration_date}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-text-muted mt-0.5" />
                <div>
                  <span className="text-text-muted block">Principal Place of Business:</span>
                  <p className="font-semibold text-text-primary leading-relaxed mt-0.5">
                    {details.address}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
