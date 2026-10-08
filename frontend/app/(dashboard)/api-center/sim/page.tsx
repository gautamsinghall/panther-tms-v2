"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radio,
  Signal,
  Zap,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  Wallet,
  Receipt,
  Lock,
  Search,
  Database,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { ApiCenterNavTabs } from "@/components/api-center/api-center-nav-tabs";

interface SimWalletTxn {
  id: number;
  created_at: string;
  transaction_type: "DEBIT" | "CREDIT";
  amount: number;
  rate_per_day: number;
  days_billed: number;
  vehicle_number?: string | null;
  trip_id?: number | null;
  description: string;
  balance_after: number;
}

interface SimWalletData {
  balance_inr: number;
  rate_per_day: number;
  active_trips_count: number;
  is_exhausted: boolean;
  pricing_notice: string;
  transactions: SimWalletTxn[];
}

export default function SimApiPage() {
  const [walletData, setWalletData] = useState<SimWalletData>({
    balance_inr: 0.0,
    rate_per_day: 8.5,
    active_trips_count: 0,
    is_exhausted: true,
    pricing_notice:
      "Standard tariff: ₹8.50 per trip per 24 hours (unlimited location fetch in a day). Wallet balance is maintained directly in database by system administrator.",
    transactions: [],
  });
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletTxFilter, setWalletTxFilter] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fetchWallet = async () => {
    try {
      setIsWalletLoading(true);
      const data = await apiClient.get<SimWalletData>(
        "/api/v1/profile/api-center/sim-wallet"
      );
      if (data) {
        setWalletData(data);
      }
    } catch (err) {
      console.warn("Failed loading SIM tracking wallet:", err);
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
      (tx.trip_id && String(tx.trip_id).includes(q)) ||
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
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isWalletLoading ? "animate-spin" : "text-indigo-600"
              }`}
            />
            <span>Refresh Wallet</span>
          </Button>

          <Link href="/tracking/sim">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
            >
              <span>View Active SIM Sessions</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* API Center Sub-Nav Tabs */}
      <ApiCenterNavTabs />

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* SIM Wallet Balance */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              SIM Tracking Wallet Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              ₹{Number(walletData.balance_inr).toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tariff:{" "}
              <strong className="text-slate-800">
                ₹{Number(walletData.rate_per_day).toFixed(2)} / trip / 24 hours
              </strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                !walletData.is_exhausted
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {!walletData.is_exhausted
                ? "Active Quota"
                : "Exhausted (Contact Admin)"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              panther_control Default: ₹0.00
            </span>
          </div>
        </div>

        {/* Active 24-hr Trips */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Active SIM Trips
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Signal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {walletData.active_trips_count}{" "}
              <span className="text-sm font-semibold text-slate-500 font-sans">
                Active Trips
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Daily burn:{" "}
              <strong className="text-slate-800">
                ₹{(walletData.active_trips_count * 8.5).toFixed(2)} / 24hr cycle
              </strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-indigo-700 font-medium text-[11px]">
              Cellular Triangulation
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Airtel • Jio • Vi
            </span>
          </div>
        </div>

        {/* Unlimited Daily Pings */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Daily Location Sampling
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <span>Unlimited Pings / Day</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ₹0 charge for all location refreshes within the active 24-hr cycle
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">Free GPS Polls</span>
            <span className="text-[10px] font-mono text-slate-400">
              24h Window
            </span>
          </div>
        </div>
      </div>

      {/* Database Administrator Balance Management Notice */}
      <Card className="p-5 rounded-2xl border border-slate-200/90 shadow-2xs bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs shrink-0">
              <Database className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Database-Managed Wallet Allocation
                </h3>
                <Badge variant="neutral" className="text-[10px] bg-slate-100 text-slate-700">
                  Database Direct
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                SIM Tracking Wallet balance is maintained directly in the <code className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">panther_control</code> database by the system administrator. Deductions occur automatically upon trip dispatch and when trips exceed 24 hours.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2 max-w-md">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              {walletData.pricing_notice}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Ledger Card */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>SIM Tracking Wallet Ledger &amp; Deductions</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full immutable audit trail of ₹8.50/trip/24h debits recorded in the tenant database.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History Ledger */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              <span>Audit Transactions Ledger</span>
            </h3>
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={walletTxFilter}
                onChange={(e) => setWalletTxFilter(e.target.value)}
                placeholder="Search by vehicle, trip ID, or description..."
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
                  <th className="py-2.5 px-3">Trip ID</th>
                  <th className="py-2.5 px-3 text-right">Cycle (24h)</th>
                  <th className="py-2.5 px-3 text-right">Rate / Day</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <div className="space-y-1">
                        <Receipt className="w-6 h-6 mx-auto text-slate-300" />
                        <p className="font-medium text-xs">
                          No SIM wallet transactions recorded yet.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Current wallet balance: ₹
                          {Number(walletData.balance_inr).toFixed(2)}. Trip starts and 24-hr renewals will log audit entries here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
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
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {tx.trip_id ? `#${tx.trip_id}` : "--"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {tx.days_billed > 0 ? `${tx.days_billed} x 24h` : "--"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        ₹{Number(tx.rate_per_day).toFixed(2)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          tx.transaction_type === "DEBIT"
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {tx.transaction_type === "DEBIT" ? "-" : "+"}₹
                        {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                        ₹{Number(tx.balance_after).toFixed(2)}
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

      {/* Rules Breakdown & Protocol Architecture */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>SIM Tracking Rules &amp; Tariff Policy</span>
                <Badge variant="success" className="text-[10px]">
                  Active Engine
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rules governing ₹8.50 per trip per 24 hours tariff, 24-hr renewal cycles, and driver telecom consent.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono">
              ₹8.50
            </div>
            <h4 className="text-xs font-bold text-slate-800">Trip Initiation</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              When a SIM trip is started, exactly ₹8.50 is deducted from the wallet for the first 24-hour cycle.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center font-mono">
              24h
            </div>
            <h4 className="text-xs font-bold text-slate-800">Unlimited 24h Pings</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Within each 24-hour paid window, all location fetches and cell-tower syncs are completely free with ₹0 deduction.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center font-mono">
              +24h
            </div>
            <h4 className="text-xs font-bold text-slate-800">Exceeding 24 Hours</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              If an active trip exceeds 24 hours, the system charges an additional ₹8.50 for the next 24-hour tracking cycle.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center font-mono">
              DB
            </div>
            <h4 className="text-xs font-bold text-slate-800">DB Administration</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Default SIM wallet balance in panther_control is ₹0.00. Balances are added directly from the database by system administrators.
            </p>
          </div>
        </div>

        {/* Webhook Endpoints */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900">
            Telecom Inbound Webhook Callback
          </h3>
          <p className="text-xs text-slate-500">
            Registered with telecom partners for real-time consent grant notifications and telemetry fix packets.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-slate-700 truncate">
              https://api.panther-tms.com/api/v1/transport/tracking/sim/webhook
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  "https://api.panther-tms.com/api/v1/transport/tracking/sim/webhook",
                  "webhook"
                )
              }
              className="text-xs h-8 gap-1.5 shrink-0 bg-white"
            >
              {copiedKey === "webhook" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === "webhook" ? "Copied" : "Copy URL"}</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
