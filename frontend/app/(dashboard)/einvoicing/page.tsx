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
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      badge: "Core Workflow",
    },
    {
      title: "IRN Generated List",
      desc: "Audit trail of all generated e-invoices with signed QR code payloads, Ack numbers, and timestamps.",
      href: "/einvoicing/irn-list",
      icon: <FileCheck2 className="w-5 h-5 text-blue-600" />,
      badge: "Register",
    },
    {
      title: "Cancel IRN",
      desc: "Submit official 24-hour window cancellation requests with standardized NIC cancellation codes.",
      href: "/einvoicing/cancel-irn",
      icon: <Ban className="w-5 h-5 text-rose-600" />,
      badge: "24h Window",
    },
    {
      title: "Taxpayer Details",
      desc: "Perform real-time GSTIN validation and verify client or vendor business name, status, and jurisdiction.",
      href: "/einvoicing/taxpayer",
      icon: <Search className="w-5 h-5 text-indigo-600" />,
      badge: "GST Registry",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-[var(--color-primary)]" />
            E-Invoicing Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Government of India GST Suvidha Provider (GSP) electronic invoicing integration.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/einvoicing/generate-irn">
            <Button className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Generate IRN
            </Button>
          </Link>
        </div>
      </div>

      {/* GSP Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">
            INTEGRATION NOTICE: GSP Sandbox Active (rules.md §2)
          </strong>
          The backend is operating with an isolated adapter producing deterministic SHA-256 IRNs and digital signatures matching the NIC algorithm. Production provider credentials will plug in seamlessly without architectural modification.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Active IRNs Generated</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
              {totalGenerated}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Digitally signed e-invoices with valid QR codes
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Cancelled IRNs</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-rose-600">
              {totalCancelled}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Cancelled within statutory 24-hour window
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">GSP Status</CardDescription>
            <CardTitle className="text-lg font-bold text-blue-600 flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Sandbox Adapter Ready
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            NIC standard SHA-256 compliant
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                  {f.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {f.badge}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                {f.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {f.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
              <span>Launch Feature</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
