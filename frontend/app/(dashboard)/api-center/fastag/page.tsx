"use client";

import React, { useState, useEffect } from "react";
import {
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  Receipt,
  CreditCard,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { ApiCenterNavTabs } from "@/components/api-center/api-center-nav-tabs";

interface FastagWalletTxn {
  id: number;
  created_at: string;
  transaction_type: string;
  api_calls_count: number;
  rate_per_call: number;
  amount: number;
  vehicle_number?: string | null;
  description: string;
  balance_after: number;
}

interface FastagWalletData {
  api_calls_left: number;
  rate_per_fetch: number;
  equivalent_balance_inr: number;
  is_exhausted: boolean;
  pricing_notice: string;
  transactions: FastagWalletTxn[];
}

export default function FastagApiPage() {
  const [walletData, setWalletData] = useState<FastagWalletData>({
    api_calls_left: 0,
    rate_per_fetch: 1.5,
    equivalent_balance_inr: 0,
    is_exhausted: true,
    pricing_notice:
      "Standard tariff: ₹1.50 per vehicle fetch. Calls are blocked when balance reaches 0. Recharges are managed by system administrator.",
    transactions: [],
  });
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletTxFilter, setWalletTxFilter] = useState<string>("");

  const fetchWallet = async () => {
    try {
      setIsWalletLoading(true);
      const data = await apiClient.get<FastagWalletData>("/api/v1/profile/api-center/fastag-wallet");
      if (data) {
        setWalletData(data);
      }
    } catch (err) {
      console.warn("Failed loading FASTag wallet:", err);
    } finally {
      setIsWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const filteredTransactions = (walletData?.transactions || []).filter((tx) => {
    if (!walletTxFilter) return true;
    const q = walletTxFilter.toLowerCase();
    return (
      (tx.vehicle_number && tx.vehicle_number.toLowerCase().includes(q)) ||
      tx.transaction_type.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="API Center"
        description="Unified external gateway credentials, real-time telemetry integrations, and developer hooks."
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchWallet}
            disabled={isWalletLoading}
            className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isWalletLoading ? "animate-spin" : "text-indigo-600"}`} />
            <span>Refresh Wallet</span>
          </Button>
        </div>
      </PageHeader>

      {/* API Center Sub-Nav Tabs */}
      <ApiCenterNavTabs />

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Calls Left */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              FASTag Calls Available
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {walletData.api_calls_left}{" "}
              <span className="text-sm font-semibold text-slate-500 font-sans">Calls Left</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Standard Tariff: <strong className="text-slate-800">₹{Number(walletData.rate_per_fetch).toFixed(2)} / Fetch</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                walletData.api_calls_left > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              {walletData.api_calls_left > 0 ? "Active Telemetry" : "Exhausted (0 Calls)"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">NETC Telemetry</span>
          </div>
        </div>

        {/* Equivalent Balance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Equivalent Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              ₹{Number(walletData.equivalent_balance_inr).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pre-paid tenant telemetry quota pool
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 text-[11px]">NPCI Toll Gateways</span>
            <span className="text-[10px] font-mono text-slate-400">INR Balance</span>
          </div>
        </div>

        {/* Gateway Pipeline Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              NETC Gateway Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <span>National Toll Plaza Grid</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Vehicle crossing feeds &amp; highway checkpoint pings
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">Automatic Toll Logging</span>
            <span className="text-[10px] font-mono text-slate-400">Active Pipe</span>
          </div>
        </div>
      </div>

      {/* Main Ledger Card */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>FASTag &amp; Toll Telemetry Wallet Ledger</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every API call consumes from this wallet at standard rate. Recharges are managed by system administrator.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2 max-w-md">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">{walletData.pricing_notice}</p>
          </div>
        </div>

        {/* Transaction History Ledger */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              <span>Audit Transactions &amp; Deductions Ledger</span>
            </h3>
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={walletTxFilter}
                onChange={(e) => setWalletTxFilter(e.target.value)}
                placeholder="Search by vehicle, type, or note..."
                className="h-8 pl-8 text-xs bg-slate-50"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3 text-right">Calls</th>
                  <th className="py-2.5 px-3 text-right">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <div className="space-y-1">
                        <Receipt className="w-6 h-6 mx-auto text-slate-300" />
                        <p className="font-medium text-xs">No FASTag wallet transactions recorded yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Current API calls left: {walletData.api_calls_left}. Live queries will log deduction
                          records here once quota is allocated.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono ${
                            tx.transaction_type === "DEBIT"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {tx.vehicle_number || "--"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {tx.api_calls_count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        ₹{Number(tx.rate_per_call).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                        {tx.balance_after}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {tx.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
