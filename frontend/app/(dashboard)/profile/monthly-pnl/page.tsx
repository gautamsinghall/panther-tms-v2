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
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";

interface MonthlyPnLResponse {
  period: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_pct: number;
  revenue_breakdown: Record<string, number>;
  expense_breakdown: Record<string, number>;
  branches_included: string[];
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Reporting Accounting Month:
          </span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
          >
            <option value="2026-09">September 2026 (FY 2026-27)</option>
            <option value="2026-08">August 2026 (FY 2026-27)</option>
            <option value="2026-07">July 2026 (FY 2026-27)</option>
            <option value="2026-06">June 2026 (FY 2026-27)</option>
            <option value="2026-05">May 2026 (FY 2026-27)</option>
            <option value="2026-04">April 2026 (FY 2026-27)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Scope:</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            All Operating Branches (HQ + Transshipment)
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
            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Operating Revenue</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(pnlData.total_revenue)}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                Invoiced freight & transport operations
              </p>
            </Card>

            {/* Total Expenses */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Operating Expenses</span>
                <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(pnlData.total_expenses)}
              </div>
              <p className="text-[11px] text-rose-600 font-medium">
                Trips, diesel, maintenance & purchases
              </p>
            </Card>

            {/* Net Operating Profit */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Net Operating P&L</span>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${pnlData.net_profit >= 0 ? "bg-indigo-100 text-indigo-700" : "bg-rose-100 text-rose-700"}`}>
                  {pnlData.net_profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </span>
              </div>
              <div className={`text-2xl font-extrabold ${pnlData.net_profit >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
                {formatCurrency(pnlData.net_profit)}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Pre-tax operating margin
              </p>
            </Card>

            {/* Profit Margin % */}
            <Card className="p-5 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Operating Margin</span>
                <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  %
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {pnlData.profit_margin_pct}%
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
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Revenue Inflow Streams
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {formatCurrency(pnlData.total_revenue)}
                </span>
              </h4>

              <div className="space-y-3">
                {Object.entries(pnlData.revenue_breakdown).length > 0 ? (
                  Object.entries(pnlData.revenue_breakdown).map(([stream, amount]) => {
                    const pct = pnlData.total_revenue > 0 ? ((amount / pnlData.total_revenue) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={stream} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {stream.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
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
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  Operating Expenditure Allocations
                </span>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {formatCurrency(pnlData.total_expenses)}
                </span>
              </h4>

              <div className="space-y-3">
                {Object.entries(pnlData.expense_breakdown).length > 0 ? (
                  Object.entries(pnlData.expense_breakdown).map(([stream, amount]) => {
                    const pct = pnlData.total_expenses > 0 ? ((amount / pnlData.total_expenses) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={stream} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {stream.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-mono text-[11px]">{pct}%</span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
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

          {/* Consolidated Branches Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>
                Consolidated across <strong className="text-slate-900 dark:text-white">{pnlData.branches_included.length}</strong> active branches:{" "}
                <span className="font-mono">{pnlData.branches_included.join(", ")}</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Audited via double-entry GL journals</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
