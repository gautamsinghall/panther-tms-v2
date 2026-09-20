"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Database,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Truck,
  Calculator,
  FileText,
  FileCheck2,
  Sparkles,
  Server,
  Layers,
  TrendingUp,
  FolderTree,
  FileSpreadsheet,
  Receipt,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";

interface CurrentUserContext {
  id: number;
  email: string;
  full_name: string;
  role: string;
  tenant: {
    subdomain: string;
    company_name: string;
    status: string;
  };
}

export default function DashboardOverviewPage() {
  const [userContext, setUserContext] = useState<CurrentUserContext | null>(null);
  const [stats, setStats] = useState({
    totalLRs: 0,
    totalVouchers: 0,
    netBilled: 0,
    totalVehicles: 0,
  });

  useEffect(() => {
    async function initDashboard() {
      try {
        const data = await apiClient<CurrentUserContext>("/api/v1/auth/me");
        setUserContext(data);
      } catch (err: any) {
        const local = getStoredAuth();
        if (local && local.user) {
          setUserContext({
            id: local.user.id,
            email: local.user.email,
            full_name: local.user.full_name,
            role: local.user.role,
            tenant: {
              subdomain: local.subdomain,
              company_name: local.tenantName,
              status: "ACTIVE",
            },
          });
        }
      }

      // Fetch live counts across modules
      try {
        const vouchers = await apiClient<any[]>("/api/v1/accounts/vouchers").catch(() => []);
        const lrs = await apiClient<any[]>("/api/v1/transport/lr-booking").catch(() => []);
        const vehicles = await apiClient<any[]>("/api/v1/transport/market-vehicle").catch(() => []);

        const billed = vouchers
          .filter((v) => !v.is_void && (v.voucher_type === "TRANSPORT_INVOICE" || v.voucher_type === "GENERAL_INVOICE"))
          .reduce((sum, v) => sum + Number(v.net_amount || 0), 0);

        setStats({
          totalLRs: lrs.length || 0,
          totalVouchers: vouchers.length || 0,
          netBilled: billed,
          totalVehicles: vehicles.length || 0,
        });
      } catch (e) {
        console.warn("Could not fetch operational stats:", e);
      }
    }

    initDashboard();
  }, []);

  const coreModules = [
    {
      title: "Transport Operations",
      desc: "End-to-end operational lifecycle: Job Orders, LR / GR Bookings, Hire Challans, Tracking, and POD Receipts.",
      href: "/transport",
      icon: <Truck className="w-6 h-6 text-blue-600" />,
      badge: "Phases 1 & 2 Live",
      links: [
        { label: "Book Lorry Receipt (LR)", href: "/transport/lr-booking" },
        { label: "Hire Challan (HC)", href: "/transport/hire-challan" },
        { label: "Arrival & POD", href: "/transport/pod-records" },
      ],
    },
    {
      title: "Accounts & Financial Ledger",
      desc: "Double-entry accounting engine: Transport Invoices, Purchases, ATH/BTH Lorry Payments, and Contra transfers.",
      href: "/accounts",
      icon: <Calculator className="w-6 h-6 text-emerald-600" />,
      badge: "Phase 3 Live",
      links: [
        { label: "Transport Invoicing", href: "/accounts/transport-invoice" },
        { label: "Lorry Settlements (ATH/BTH)", href: "/accounts/payment-voucher" },
        { label: "Purchase Register", href: "/accounts/purchases" },
      ],
    },
    {
      title: "GST E-Invoicing & Compliance",
      desc: "Govt-compliant E-Invoice integration with real-time IRN generation, signed QR codes, and 24-hr cancellations.",
      href: "/einvoicing",
      icon: <FileCheck2 className="w-6 h-6 text-indigo-600" />,
      badge: "NIC Compliant",
      links: [
        { label: "Generate Live IRN", href: "/einvoicing/generate" },
        { label: "IRN Registry & Status", href: "/einvoicing/registry" },
        { label: "Cancel IRN", href: "/einvoicing/cancel" },
      ],
    },
    {
      title: "Transport Reports & Registers",
      desc: "Executive registers and compliance audits: LR Registers, Invoice Registers, Client Summaries, and Unused Series.",
      href: "/transport-reports",
      icon: <FileSpreadsheet className="w-6 h-6 text-amber-600" />,
      badge: "8 Audit Reports",
      links: [
        { label: "LR Booking Register", href: "/transport-reports/lr-register" },
        { label: "Invoice Register", href: "/transport-reports/invoice-register" },
        { label: "Pending Hire Challans", href: "/transport-reports/pending-hc" },
      ],
    },
  ];

  return (
    <div className="space-y-7">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              PantherTMS Enterprise Edition
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Phases 0, 1, 2 & 3 Active</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Operations & Financial Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time logistics management, double-entry financial ledger, and GST compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/accounts/transport-invoice">
            <Button variant="primary" size="sm" className="gap-1.5 text-xs">
              <Receipt className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </Button>
          </Link>
          <Link href="/transport/lr-booking">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New LR</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Connection & Auth Health Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {userContext?.tenant.company_name || "Demo Logistics Pvt Ltd"}
                </h3>
                <StatusBadge status="ACTIVE" variant="active" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Tenant Domain: <strong className="font-mono text-slate-700 dark:text-slate-300">{userContext?.tenant.subdomain || "demo"}.panthertms.local</strong></span>
                <span>•</span>
                <span>Isolated DB: <strong className="font-mono text-slate-700 dark:text-slate-300">panther_tenant_{userContext?.tenant.subdomain || "demo"}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Role: <strong className="text-slate-800 dark:text-slate-100">{userContext?.role || "COMPANY_ADMIN"}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Server className="w-4 h-4 text-blue-500" />
              <span>API: <strong className="text-emerald-600">Online</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Booked LRs</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalLRs}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Active operational consignments
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Total Billed Revenue</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
              ₹{stats.netBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Net freight & invoice billings
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Financial Vouchers</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalVouchers}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Double-entry ledger journal entries
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Fleet & Drivers</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalVehicles}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Market & company vehicle units
          </CardContent>
        </Card>
      </div>

      {/* Module Hub Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Enterprise Logistics Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {coreModules.map((m) => (
            <div
              key={m.href}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-[var(--color-primary)] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                    {m.icon}
                  </div>
                  <Badge variant="neutral" className="text-[11px]">
                    {m.badge}
                  </Badge>
                </div>

                <Link href={m.href} className="group">
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5">
                    {m.title}
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-primary)]" />
                  </h3>
                </Link>

                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {m.desc}
                </p>

                {/* Sub-feature direct links */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                  {m.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-[11px] font-medium px-2.5 py-1 rounded bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 transition-colors"
                    >
                      {link.label} →
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
                <Link href={m.href} className="hover:underline flex items-center gap-1">
                  Open {m.title} Hub
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Configuration Masters Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/general"
          className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xs">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">General Masters</h4>
              <p className="text-[11px] text-slate-500">Consigners, Consignees, Locations, Units, Packaging</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/misc"
          className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xs">
              <FolderTree className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">Chart of Accounts & Tax Masters</h4>
              <p className="text-[11px] text-slate-500">Primary Groups, Subgroups, Tax Categories, Charge Heads</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
