"use client";

import React from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  BarChart3,
  Truck,
  Clock,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Hash,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TransportReportsHubPage() {
  const reports = [
    {
      title: "LR Booking Register",
      desc: "Complete operational register of all booked and in-transit lorry receipts with weights and balances.",
      href: "/transport-reports/lr-register",
      icon: <FileSpreadsheet className="w-5 h-5 text-blue-600" />,
      badge: "Operational",
    },
    {
      title: "Invoice Register",
      desc: "Comprehensive billing ledger with GST splits, freight totals, and electronic IRN statuses.",
      href: "/transport-reports/invoice-register",
      icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
      badge: "Commercial",
    },
    {
      title: "Client-Wise LR Summary",
      desc: "Aggregated consignments by client showing total freight turnover, MT tonnage, and trip frequency.",
      href: "/transport-reports/lr-client-wise",
      icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
      badge: "Analytics",
    },
    {
      title: "Hire Challan Register",
      desc: "Master record of all truck hiring notes, vehicle contracts, agreed hire, and supplier payout balances.",
      href: "/transport-reports/hc-register",
      icon: <Truck className="w-5 h-5 text-amber-600" />,
      badge: "Fleet & Hire",
    },
    {
      title: "Pending Hire Challan",
      desc: "Dispatched or booked consignments awaiting vehicle hiring confirmation or driver settlement note.",
      href: "/transport-reports/pending-hc",
      icon: <Clock className="w-5 h-5 text-rose-600" />,
      badge: "Action Required",
    },
    {
      title: "Unbilled Consignments",
      desc: "Delivered and active LRs that have not yet been converted into customer freight invoices.",
      href: "/transport-reports/unbilled",
      icon: <AlertCircle className="w-5 h-5 text-indigo-600" />,
      badge: "Revenue Leakage",
    },
    {
      title: "Arrival Report Register",
      desc: "Destination branch inward arrivals, unloading logs, shortage checks, and seal integrity inspections.",
      href: "/transport-reports/arrival-register",
      icon: <CheckCircle2 className="w-5 h-5 text-cyan-600" />,
      badge: "Delivery & POD",
    },
    {
      title: "Unused Series Audit",
      desc: "Audit check for sequence gaps, skipped series, or cancelled document indices across LRs and invoices.",
      href: "/transport-reports/unused-series",
      icon: <Hash className="w-5 h-5 text-slate-600" />,
      badge: "Compliance",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />
            Transport & Operational Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time operational registers, financial reconciliations, and compliance audits for enterprise transport logistics.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/transport-reports/lr-register">
            <Button className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              View LR Register
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                  {r.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {r.badge}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                {r.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                {r.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
              <span>Generate Report</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
