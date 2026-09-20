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
import { PageHeader } from "@/components/ui/page-header";

export default function TransportReportsHubPage() {
  const reports = [
    {
      title: "LR Booking Register",
      desc: "Complete operational register of all booked and in-transit lorry receipts with weights and balances.",
      href: "/transport-reports/lr-register",
      icon: <FileSpreadsheet className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Operational",
    },
    {
      title: "Invoice Register",
      desc: "Comprehensive billing ledger with GST splits, freight totals, and electronic IRN statuses.",
      href: "/transport-reports/invoice-register",
      icon: <FileCheck className="w-5 h-5 text-[#027A48]" />,
      badge: "Commercial",
    },
    {
      title: "Client-Wise LR Summary",
      desc: "Aggregated consignments by client showing total freight turnover, MT tonnage, and trip frequency.",
      href: "/transport-reports/lr-client-wise",
      icon: <TrendingUp className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Analytics",
    },
    {
      title: "Hire Challan Register",
      desc: "Master record of all truck hiring notes, vehicle contracts, agreed hire, and supplier payout balances.",
      href: "/transport-reports/hc-register",
      icon: <Truck className="w-5 h-5 text-[#B54708]" />,
      badge: "Fleet & Hire",
    },
    {
      title: "Pending Hire Challan",
      desc: "Dispatched or booked consignments awaiting vehicle hiring confirmation or driver settlement note.",
      href: "/transport-reports/pending-hc",
      icon: <Clock className="w-5 h-5 text-[#B42318]" />,
      badge: "Action Required",
    },
    {
      title: "Unbilled Consignments",
      desc: "Delivered and active LRs that have not yet been converted into customer freight invoices.",
      href: "/transport-reports/unbilled",
      icon: <AlertCircle className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Revenue Leakage",
    },
    {
      title: "Arrival Report Register",
      desc: "Destination branch inward arrivals, unloading logs, shortage checks, and seal integrity inspections.",
      href: "/transport-reports/arrival-register",
      icon: <CheckCircle2 className="w-5 h-5 text-[#175CD3]" />,
      badge: "Delivery & POD",
    },
    {
      title: "Unused Series Audit",
      desc: "Audit check for sequence gaps, skipped series, or cancelled document indices across LRs and invoices.",
      href: "/transport-reports/unused-series",
      icon: <Hash className="w-5 h-5 text-[#667085]" />,
      badge: "Compliance",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport Reports" },
        ]}
        title="Transport & Operational Reports"
        description="Real-time operational registers, financial reconciliations, and compliance audits for enterprise transport logistics."
        primaryAction={{
          label: "View LR Register",
          href: "/transport-reports/lr-register",
          icon: FileSpreadsheet,
        }}
      />

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group p-5 bg-white rounded-card border border-[#E4E7EC] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-[#D0D5DD] hover:shadow-[0_4px_6px_-2px_rgba(16,24,40,0.05)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-control bg-[#F8F9FB] border border-[#E4E7EC] flex items-center justify-center group-hover:bg-[#EEF2FF] group-hover:border-[#C7D2FE] transition-colors">
                  {r.icon}
                </div>
                <Badge variant="neutral" className="text-[11px] font-medium">
                  {r.badge}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm text-[#101828] group-hover:text-[#4F46E5] transition-colors">
                {r.title}
              </h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed line-clamp-2">
                {r.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-xs font-semibold text-[#4F46E5]">
              <span>Generate Report</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
