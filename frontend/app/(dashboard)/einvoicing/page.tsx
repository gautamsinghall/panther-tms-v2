"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileCheck2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Ban,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

interface EInvoiceRecord {
  id: number;
  irn: string;
  status: string;
  ack_number: string;
}

export default function EInvoicingOverviewPage() {
  const [irns, setIrns] = useState<EInvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient<EInvoiceRecord[]>("/api/v1/einvoicing/irn-list");
        setIrns(res);
      } catch (err) {
        console.warn("Could not load IRN list:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalGenerated = irns.filter((r) => r.status === "GENERATED").length;
  const totalCancelled = irns.filter((r) => r.status === "CANCELLED").length;

  const features = [
    {
      title: "Generate IRN",
      desc: "Dispatch invoice payload to the Invoice Registration Portal (IRP) and generate signed 64-character hash.",
      href: "/einvoicing/generate-irn",
      icon: <ShieldCheck className="w-5 h-5 text-success" />,
      badge: "Core Workflow",
    },
    {
      title: "IRN Generated List",
      desc: "Audit trail of all generated e-invoices with signed QR code payloads, Ack numbers, and timestamps.",
      href: "/einvoicing/irn-list",
      icon: <FileCheck2 className="w-5 h-5 text-primary" />,
      badge: "Register",
    },
    {
      title: "Cancel IRN",
      desc: "Submit official 24-hour window cancellation requests with standardized NIC cancellation codes.",
      href: "/einvoicing/cancel-irn",
      icon: <Ban className="w-5 h-5 text-danger" />,
      badge: "24h Window",
    },
    {
      title: "Taxpayer Details",
      desc: "Perform real-time GSTIN validation and verify client or vendor business name, status, and jurisdiction.",
      href: "/einvoicing/taxpayer",
      icon: <Search className="w-5 h-5 text-secondary" />,
      badge: "GST Registry",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Invoicing Management"
        description="Government of India GST Suvidha Provider (GSP) electronic invoicing integration."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "E-Invoicing" },
        ]}
        actions={
          <Link href="/einvoicing/generate-irn">
            <Button className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Generate IRN
            </Button>
          </Link>
        }
      />

      {/* GSP Notice Banner */}
      <div className="p-4 rounded-xl bg-warning-light border border-warning/20 text-warning text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            INTEGRATION NOTICE: GSP Sandbox Active (rules.md §2)
          </strong>
          The backend is operating with an isolated adapter producing deterministic SHA-256 IRNs and digital signatures matching the NIC algorithm. Production provider credentials plug in seamlessly without architectural modification.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard
          title="Active IRNs Generated"
          value={totalGenerated}
          subtext="Digitally signed with valid QR codes"
          icon={<ShieldCheck className="w-4 h-4 text-success" />}
        />
        <KpiCard
          title="Cancelled IRNs"
          value={totalCancelled}
          subtext="Cancelled within statutory 24h window"
          icon={<Ban className="w-4 h-4 text-danger" />}
        />
        <KpiCard
          title="GSP Status"
          value="Ready"
          subtext="NIC SHA-256 compliant adapter"
          icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
        />
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group p-5 bg-surface rounded-card border border-border shadow-xs hover:border-primary hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-surface-secondary group-hover:bg-primary-light transition-colors">
                  {f.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {f.badge}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
                {f.title}
              </h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                {f.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-primary">
              <span>Launch Feature</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
