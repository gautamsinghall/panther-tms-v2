"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calculator,
  FileText,
  Receipt,
  FileSpreadsheet,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Split,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  net_amount: string | number;
  is_void: boolean;
  irn_status?: string;
}

export default function AccountsOverviewPage() {
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers");
        setVouchers(res);
      } catch (err) {
        console.warn("Could not fetch vouchers summary:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSummary();
  }, []);

  const totalInvoices = vouchers.filter((v) => v.voucher_type === "TRANSPORT_INVOICE" || v.voucher_type === "GENERAL_INVOICE").length;
  const totalSettlements = vouchers.filter((v) => v.voucher_type === "ATH_PAYMENT" || v.voucher_type === "BTH_PAYMENT").length;
  const totalNetBilled = vouchers
    .filter((v) => !v.is_void && (v.voucher_type === "TRANSPORT_INVOICE" || v.voucher_type === "GENERAL_INVOICE"))
    .reduce((sum, v) => sum + Number(v.net_amount || 0), 0);

  const modules = [
    {
      title: "Transport Invoice",
      desc: "Convert operational LR bookings to freight invoices with automated double-entry postings.",
      href: "/accounts/transport-invoice",
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      badge: "Core Billing",
    },
    {
      title: "General Invoice",
      desc: "Bill non-freight revenue, warehousing fees, handling, and ancillary services.",
      href: "/accounts/general-invoice",
      icon: <Receipt className="w-5 h-5 text-indigo-600" />,
      badge: "Commercial",
    },
    {
      title: "Proforma Invoice",
      desc: "Issue provisional estimates and freight quotations prior to cargo dispatch.",
      href: "/accounts/proforma-invoice",
      icon: <FileSpreadsheet className="w-5 h-5 text-amber-600" />,
      badge: "Quotes",
    },
    {
      title: "Purchase Register",
      desc: "Operational truck expenses (tyres, fuel, spares) and general overheads with ITC.",
      href: "/accounts/purchases",
      icon: <ShoppingCart className="w-5 h-5 text-purple-600" />,
      badge: "Input Tax Credit",
    },
    {
      title: "Receipt Voucher",
      desc: "Customer inflows and freight remittances via bank NEFT/RTGS or cash.",
      href: "/accounts/receipt-voucher",
      icon: <ArrowDownLeft className="w-5 h-5 text-emerald-600" />,
      badge: "Inflows",
    },
    {
      title: "Payment Voucher (ATH / BTH)",
      desc: "Lorry advance payments (ATH) and balance settlements (BTH) with Hire Challans.",
      href: "/accounts/payment-voucher",
      icon: <ArrowUpRight className="w-5 h-5 text-rose-600" />,
      badge: "Settlements",
    },
    {
      title: "Contra Voucher",
      desc: "Internal liquidity movements between physical cash and company bank accounts.",
      href: "/accounts/contra-voucher",
      icon: <ArrowLeftRight className="w-5 h-5 text-cyan-600" />,
      badge: "Transfers",
    },
    {
      title: "Credit & Debit Notes",
      desc: "Customer shortage adjustments, rate disputes, vendor deductions, and GST reversals.",
      href: "/accounts/credit-debit-notes",
      icon: <Split className="w-5 h-5 text-orange-600" />,
      badge: "Adjustments",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-[var(--color-primary)]" />
            Accounts & Financial Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise double-entry ledger system maintaining mathematical balance (Total Debits = Total Credits) across all voucher types.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/accounts/transport-invoice">
            <Button className="gap-2">
              <FileText className="w-4 h-4" />
              Create Transport Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Total Revenue Invoices</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-blue-600">
              {totalInvoices}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Transport & general customer billings
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Net Billed Value</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
              ₹{totalNetBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            Active freight and service revenue
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold">Lorry Hire Settlements</CardDescription>
            <CardTitle className="text-2xl font-bold font-mono text-amber-600">
              {totalSettlements}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            ATH advances & BTH balance disbursements
          </CardContent>
        </Card>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[var(--color-primary)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                  {m.icon}
                </div>
                <Badge variant="neutral" className="text-[10px]">
                  {m.badge}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-[var(--color-primary)] transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                {m.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
              <span>Open Register</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
