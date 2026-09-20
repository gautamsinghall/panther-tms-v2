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
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
      icon: <FileText className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Core Billing",
    },
    {
      title: "General Invoice",
      desc: "Bill non-freight revenue, warehousing fees, handling, and ancillary services.",
      href: "/accounts/general-invoice",
      icon: <Receipt className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Commercial",
    },
    {
      title: "Proforma Invoice",
      desc: "Issue provisional estimates and freight quotations prior to cargo dispatch.",
      href: "/accounts/proforma-invoice",
      icon: <FileSpreadsheet className="w-5 h-5 text-[#B54708]" />,
      badge: "Quotes",
    },
    {
      title: "Purchase Register",
      desc: "Operational truck expenses (tyres, fuel, spares) and general overheads with ITC.",
      href: "/accounts/purchases",
      icon: <ShoppingCart className="w-5 h-5 text-[#4F46E5]" />,
      badge: "Input Tax Credit",
    },
    {
      title: "Receipt Voucher",
      desc: "Customer inflows and freight remittances via bank NEFT/RTGS or cash.",
      href: "/accounts/receipt-voucher",
      icon: <ArrowDownLeft className="w-5 h-5 text-[#027A48]" />,
      badge: "Inflows",
    },
    {
      title: "Payment Voucher (ATH / BTH)",
      desc: "Lorry advance payments (ATH) and balance settlements (BTH) with Hire Challans.",
      href: "/accounts/payment-voucher",
      icon: <ArrowUpRight className="w-5 h-5 text-[#B42318]" />,
      badge: "Settlements",
    },
    {
      title: "Contra Voucher",
      desc: "Internal liquidity movements between physical cash and company bank accounts.",
      href: "/accounts/contra-voucher",
      icon: <ArrowLeftRight className="w-5 h-5 text-[#175CD3]" />,
      badge: "Transfers",
    },
    {
      title: "Credit & Debit Notes",
      desc: "Customer shortage adjustments, rate disputes, vendor deductions, and GST reversals.",
      href: "/accounts/credit-debit-notes",
      icon: <Split className="w-5 h-5 text-[#B54708]" />,
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
        description="Enterprise double-entry ledger maintaining mathematical balance across all transaction vouchers."
        primaryAction={{
          label: "Create Transport Invoice",
          href: "/accounts/transport-invoice",
          icon: Plus,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard
          title="Total Revenue Invoices"
          value={totalInvoices}
          subtext="Transport & general customer billings"
          icon={<FileText className="w-4 h-4 text-[#4F46E5]" />}
        />
        <KpiCard
          title="Net Billed Value"
          value={`₹${totalNetBilled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Active freight and service revenue"
          icon={<Receipt className="w-4 h-4 text-[#027A48]" />}
        />
        <KpiCard
          title="Lorry Hire Settlements"
          value={totalSettlements}
          subtext="ATH advances & BTH balance disbursements"
          icon={<ArrowUpRight className="w-4 h-4 text-[#B54708]" />}
        />
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group p-5 bg-white rounded-card border border-[#E4E7EC] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-[#D0D5DD] hover:shadow-[0_4px_6px_-2px_rgba(16,24,40,0.05)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-control bg-[#F8F9FB] border border-[#E4E7EC] flex items-center justify-center group-hover:bg-[#EEF2FF] group-hover:border-[#C7D2FE] transition-colors">
                  {m.icon}
                </div>
                <Badge variant="neutral" className="text-[11px] font-medium">
                  {m.badge}
                </Badge>
              </div>
              <h3 className="font-semibold text-sm text-[#101828] group-hover:text-[#4F46E5] transition-colors">
                {m.title}
              </h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed line-clamp-2">
                {m.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-xs font-semibold text-[#4F46E5]">
              <span>Open Register</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
