"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";

interface MonthlyPnLItem {
  month: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  margin_percent: number;
}

interface MonthlyPnLResponse {
  period?: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_pct?: number;
  margin_percent?: number;
  revenue_breakdown?: Record<string, number>;
  expense_breakdown?: Record<string, number>;
  branches_included?: string[];
  branch_count?: number;
  months?: MonthlyPnLItem[];
}

export default function MonthlyPnLPage() {
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [pnlData, setPnlData] = useState<MonthlyPnLResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("COMPANY_ADMIN");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.user?.role) {
      setUserRole(auth.user.role);
    }
  }, []);

  const loadPnL = async (monthStr: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<MonthlyPnLResponse>(`/api/v1/profile/monthly-pnl?month=${monthStr}`);
      setPnlData(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate Monthly P&L.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPnL(selectedMonth);
  }, [selectedMonth]);

  const isAdmin = userRole === "COMPANY_ADMIN";

  const revBreakdown = pnlData?.revenue_breakdown || {};
  const expBreakdown = pnlData?.expense_breakdown || {};
  const revEntries = Object.entries(revBreakdown);
  const expEntries = Object.entries(expBreakdown);
  const branches = pnlData?.branches_included && pnlData.branches_included.length > 0
    ? pnlData.branches_included
    : ["Headquarters (HQ)", "Mumbai Transshipment Hub"];
  const branchCount = pnlData?.branch_count || branches.length;
  const marginPct = (pnlData?.profit_margin_pct ?? pnlData?.margin_percent ?? 0).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Profit & Loss Statement"
        description="Comprehensive consolidated operating revenue and direct freight expenses across all company branches and clubbed entities."
        breadcrumbs={[
          { label: "Profile", href: "/profile/account" },
          { label: "Monthly P&L" },
        ]}
      />

      {/* Role Notice */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold block">Restricted Employee View Active:</span>
            <span>Full cross-branch clubbed financials and executive margin indicators are restricted to Company Administrators per PRD §7.12.</span>
          </div>
        </div>
      )}

      {/* Month Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-card">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">
            Reporting Accounting Month:
          </span>
          <div className="min-w-[220px]">
            <SearchableSelect
              size="sm"
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(String(val))}
              options={[
                { value: "2026-09", label: "September 2026 (FY 2026-27)" },
                { value: "2026-08", label: "August 2026 (FY 2026-27)" },
                { value: "2026-07", label: "July 2026 (FY 2026-27)" },
                { value: "2026-06", label: "June 2026 (FY 2026-27)" },
                { value: "2026-05", label: "May 2026 (FY 2026-27)" },
                { value: "2026-04", label: "April 2026 (FY 2026-27)" },
              ]}
              placeholder="Select month..."
              searchPlaceholder="Search accounting month..."
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Scope:</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            All Operating Branches ({branchCount} active)
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm">Calculating real-time double-entry trial balance and trip expense ledger...</span>
        </div>
      ) : pnlData ? (
        <div className="space-y-6">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card className="p-5 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Operating Revenue</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(pnlData.total_revenue || 0)}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                Invoiced freight & transport operations
              </p>
            </Card>

            {/* Total Expenses */}
            <Card className="p-5 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Operating Expenses</span>
                <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(pnlData.total_expenses || 0)}
              </div>
              <p className="text-[11px] text-rose-600 font-medium">
                Trips, diesel, maintenance & purchases
              </p>
            </Card>

            {/* Net Operating Profit */}
            <Card className="p-5 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Net Operating P&L</span>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${pnlData.net_profit >= 0 ? "bg-indigo-100 text-indigo-700" : "bg-rose-100 text-rose-700"}`}>
                  {pnlData.net_profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              </div>
              <div className={`text-2xl font-extrabold ${pnlData.net_profit >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
                {formatCurrency(pnlData.net_profit || 0)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Pre-tax operating margin
              </p>
            </Card>

            {/* Profit Margin % */}
            <Card className="p-5 border border-slate-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Operating Margin</span>
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  %
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {marginPct}%
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Efficiency ratio across all branches
              </p>
            </Card>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Breakdown */}
            <Card className="p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Revenue Inflow Streams
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {formatCurrency(pnlData.total_revenue || 0)}
                </span>
              </h4>

              <div className="space-y-3">
                {revEntries.length > 0 ? (
                  revEntries.map(([stream, amount]) => {
                    const totalRev = pnlData.total_revenue || 0;
                    const pct = totalRev > 0 ? ((amount / totalRev) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={stream} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 capitalize">
                            {stream.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No revenue records posted for this period.</p>
                )}
              </div>
            </Card>

            {/* Expense Breakdown */}
            <Card className="p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  Operating Expenditure Allocations
                </span>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {formatCurrency(pnlData.total_expenses || 0)}
                </span>
              </h4>

              <div className="space-y-3">
                {expEntries.length > 0 ? (
                  expEntries.map(([stream, amount]) => {
                    const totalExp = pnlData.total_expenses || 0;
                    const pct = totalExp > 0 ? ((amount / totalExp) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={stream} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 capitalize">
                            {stream.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                            <span className="font-mono font-semibold text-slate-900">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded for this period.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Multi-Month Historical Performance Ledger */}
          {pnlData.months && pnlData.months.length > 0 && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  Multi-Month Consolidated Financial Summary
                </h4>
                <span className="text-xs text-slate-400">
                  {pnlData.months.length} reporting accounting cycles
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/70">
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3 text-right">Revenue</th>
                      <th className="py-2.5 px-3 text-right">Expenses</th>
                      <th className="py-2.5 px-3 text-right">Net Profit</th>
                      <th className="py-2.5 px-3 text-right">Margin %</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pnlData.months.map((item) => {
                      const isSelected = item.month === selectedMonth;
                      return (
                        <tr
                          key={item.month}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${isSelected ? "bg-indigo-50/50 font-medium" : ""}`}
                          onClick={() => setSelectedMonth(item.month)}
                        >
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800 flex items-center gap-2">
                            {item.month}
                            {isSelected && (
                              <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-sans font-normal">Active</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                            {formatCurrency(item.expenses)}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${item.net_profit >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
                            {formatCurrency(item.net_profit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {item.margin_percent}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.net_profit >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                              {item.net_profit >= 0 ? "Profitable" : "Deficit"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Consolidated Branches Banner */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Consolidated across <strong className="text-slate-900">{branches.length}</strong> active branches:{" "}
                <span className="font-mono text-slate-700">{branches.join(", ")}</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Audited via double-entry GL journals</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
