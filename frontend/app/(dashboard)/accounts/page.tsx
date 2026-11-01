"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Receipt,
  FileSpreadsheet,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Split,
  ArrowRight,
  Plus,
  BookOpen,
  Landmark,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
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
        setVouchers(Array.isArray(res) ? res : []);
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
      title: "Company Bank Accounts",
      desc: "Maintain bank accounts linked to issuing offices, automated ledger creation, and balances.",
      href: "/accounts/bank-accounts",
      icon: <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Banking Master",
    },
    {
      title: "Master Ledger",
      desc: "Complete financial ledgers and statements for Billing Clients, Vendors, and Drivers.",
      href: "/accounts/master-ledger",
      icon: <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Core Ledgers",
    },
    {
      title: "Transport Invoice",
      desc: "Convert operational LR bookings to freight invoices with automated double-entry postings.",
      href: "/accounts/transport-invoice",
      icon: <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Core Billing",
    },
    {
      title: "General Invoice",
      desc: "Bill non-freight revenue, warehousing fees, handling, and ancillary services.",
      href: "/accounts/general-invoice",
      icon: <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Commercial",
    },
    {
      title: "Proforma Invoice",
      desc: "Issue provisional estimates and freight quotations prior to cargo dispatch.",
      href: "/accounts/proforma-invoice",
      icon: <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Quotes",
    },
    {
      title: "Purchase Register",
      desc: "Operational truck expenses (tyres, fuel, spares) and general overheads with ITC.",
      href: "/accounts/purchases",
      icon: <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Input Tax Credit",
    },
    {
      title: "Receipt Voucher",
      desc: "Customer inflows and freight remittances via bank NEFT/RTGS or cash.",
      href: "/accounts/receipt-voucher",
      icon: <ArrowDownLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Inflows",
    },
    {
      title: "Payment Voucher (ATH / BTH)",
      desc: "Lorry advance payments (ATH) and balance settlements (BTH) with Hire Challans.",
      href: "/accounts/payment-voucher",
      icon: <ArrowUpRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Settlements",
    },
    {
      title: "Contra Voucher",
      desc: "Internal liquidity movements between physical cash and company bank accounts.",
      href: "/accounts/contra-voucher",
      icon: <ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Transfers",
    },
    {
      title: "Journal Voucher",
      desc: "Tally-style non-cash accounting adjustments, provisions, accruals, depreciation, and rectifications.",
      href: "/accounts/journal-voucher",
      icon: <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Adjustments",
    },
    {
      title: "Credit & Debit Notes",
      desc: "Customer shortage adjustments, rate disputes, vendor deductions, and GST reversals.",
      href: "/accounts/credit-debit-notes",
      icon: <Split className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      badge: "Adjustments",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts" },
        ]}
        title="Accounts & Financial Ledger"
        description="Enterprise double-entry ledger maintaining balance across transaction vouchers."
        primaryAction={{
          label: "Create Transport Invoice",
          href: "/accounts/transport-invoice",
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard
          title="Total Revenue Invoices"
          value={isLoading ? "..." : totalInvoices}
          subtext="Transport & general customer billings"
          icon={<FileText className="w-4 h-4" />}
        />
        <KpiCard
          title="Net Billed Value"
          value={isLoading ? "..." : `₹${totalNetBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Active freight and service revenue"
          icon={<Receipt className="w-4 h-4" />}
        />
        <KpiCard
          title="Lorry Hire Settlements"
          value={isLoading ? "..." : totalSettlements}
          subtext="ATH advances & BTH balance disbursements"
          icon={<ArrowUpRight className="w-4 h-4" />}
        />
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group p-5 bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#202025] border border-slate-200/80 dark:border-[#303036] flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-colors shadow-2xs">
                  {m.icon}
                </div>
                <Badge variant="neutral" className="text-[11px] font-medium">
                  {m.badge}
                </Badge>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                {m.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#262630] flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>Open Register</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
