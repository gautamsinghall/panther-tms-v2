"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface AccountItem {
  account_id: number;
  account_code: string;
  account_name: string;
  amount: number;
}

interface GroupItem {
  group_name: string;
  accounts: AccountItem[];
  group_total: number;
}

interface BalanceSheetResponse {
  as_of_date: string;
  asset_groups: GroupItem[];
  total_assets: number;
  liability_groups: GroupItem[];
  total_liabilities: number;
  equity_groups: GroupItem[];
  net_profit_transferred: number;
  total_equity: number;
  total_liabilities_and_equity: number;
  difference: number;
  is_balanced: boolean;
}

export default function BalanceSheetPage() {
  const [bsData, setBsData] = useState<BalanceSheetResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBalanceSheet() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<BalanceSheetResponse>("/api/v1/reports/balance-sheet");
      setBsData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load Balance Sheet");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBalanceSheet();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "trial-balance", format: "csv" }),
      });
      if (job.download_url) {
        window.open(job.download_url, "_blank");
      }
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balance Sheet"
        description="Statutory statement of assets, liabilities, and equity reserves computed from real ledger accounts."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Balance Sheet" },
        ]}
        primaryAction={{
          label: isExporting ? "Exporting..." : "Export CSV",
          icon: <Download className="w-4 h-4" />,
          onClick: handleExport,
          disabled: isExporting,
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: loadBalanceSheet,
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {/* Balance Equilibrium Banner */}
      {bsData && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          bsData.is_balanced
            ? "bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]"
            : "bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]"
        }`}>
          <div className="flex items-center gap-3">
            {bsData.is_balanced ? (
              <CheckCircle2 className="w-5 h-5 text-[#12B76A] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#F04438] shrink-0" />
            )}
            <div>
              <h4 className="text-sm font-semibold">
                {bsData.is_balanced
                  ? "Balance Sheet Ties Out (Assets = Liabilities + Equity)"
                  : "Balance Sheet Out of Balance"}
              </h4>
              <p className="text-xs opacity-90">
                {bsData.is_balanced
                  ? `Total Assets ₹${Number(bsData.total_assets).toLocaleString()} exactly balance with Total Liabilities & Equity ₹${Number(bsData.total_liabilities_and_equity).toLocaleString()} as of ${bsData.as_of_date}.`
                  : `Variance of ₹${Number(bsData.difference).toLocaleString()} detected.`}
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold">
            <span>As of: {bsData.as_of_date}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="p-12 text-center text-sm text-[#667085]">
          Computing real balance sheet from ledger entries...
        </div>
      )}

      {!isLoading && bsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Liabilities & Equity */}
          <Card className="p-6 space-y-5 bg-white border border-[#E4E7EC] shadow-xs">
            <div className="pb-3 border-b border-[#E4E7EC] flex justify-between items-center">
              <span className="font-bold text-sm text-[#172033] uppercase tracking-wide">
                Capital & Liabilities
              </span>
              <span className="text-xs font-semibold text-[#667085]">Amount (₹)</span>
            </div>

            {/* Equity Section */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#172033] uppercase tracking-wider text-[11px] text-[#475467]">
                Equity & Reserves
              </div>
              {bsData.equity_groups?.map((grp, idx) => (
                <div key={idx} className="space-y-1 pl-2">
                  <div className="text-xs font-semibold text-[#344054]">{grp.group_name}</div>
                  {grp.accounts?.map((acc) => (
                    <div key={acc.account_id} className="flex justify-between text-xs text-[#667085] py-0.5 pl-2">
                      <span>{acc.account_name}</span>
                      <span className="font-mono text-[#172033]">{formatCurrency(Number(acc.amount))}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex justify-between text-xs py-1 pl-2 bg-[#F8FAFC] rounded px-2">
                <span className="font-semibold text-[#344054]">Net Profit / (Loss) for Period</span>
                <span className={`font-mono font-bold ${bsData.net_profit_transferred >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatCurrency(Number(bsData.net_profit_transferred))}
                </span>
              </div>
            </div>

            {/* Liabilities Section */}
            <div className="space-y-3 pt-3 border-t border-[#F2F4F7]">
              <div className="text-xs font-bold text-[#172033] uppercase tracking-wider text-[11px] text-[#475467]">
                Liabilities
              </div>
              {bsData.liability_groups?.map((grp, idx) => (
                <div key={idx} className="space-y-1 pl-2">
                  <div className="flex justify-between text-xs font-semibold text-[#344054]">
                    <span>{grp.group_name}</span>
                    <span className="font-mono">{formatCurrency(Number(grp.group_total))}</span>
                  </div>
                  {grp.accounts?.map((acc) => (
                    <div key={acc.account_id} className="flex justify-between text-xs text-[#667085] py-0.5 pl-2">
                      <span>{acc.account_name}</span>
                      <span className="font-mono text-[#172033]">{formatCurrency(Number(acc.amount))}</span>
                    </div>
                  ))}
                </div>
              ))}
              {bsData.liability_groups?.length === 0 && (
                <div className="text-xs text-[#98A2B3] italic pl-2">No liabilities recorded</div>
              )}
            </div>

            {/* Total Liabilities & Equity */}
            <div className="pt-4 border-t-2 border-[#172033] flex justify-between items-center text-sm font-bold text-[#172033]">
              <span>Total Liabilities & Equity</span>
              <span className="font-mono font-black text-base text-[#027A48]">
                {formatCurrency(Number(bsData.total_liabilities_and_equity))}
              </span>
            </div>
          </Card>

          {/* Assets */}
          <Card className="p-6 space-y-5 bg-white border border-[#E4E7EC] shadow-xs">
            <div className="pb-3 border-b border-[#E4E7EC] flex justify-between items-center">
              <span className="font-bold text-sm text-[#172033] uppercase tracking-wide">
                Assets
              </span>
              <span className="text-xs font-semibold text-[#667085]">Amount (₹)</span>
            </div>

            <div className="space-y-4">
              {bsData.asset_groups?.map((grp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#344054] pb-1 border-b border-[#F2F4F7]">
                    <span>{grp.group_name}</span>
                    <span className="font-mono">{formatCurrency(Number(grp.group_total))}</span>
                  </div>
                  {grp.accounts?.map((acc) => (
                    <div key={acc.account_id} className="flex justify-between text-xs text-[#667085] py-0.5 pl-2">
                      <span>{acc.account_name}</span>
                      <span className="font-mono text-[#172033]">{formatCurrency(Number(acc.amount))}</span>
                    </div>
                  ))}
                </div>
              ))}
              {bsData.asset_groups?.length === 0 && (
                <div className="text-xs text-[#98A2B3] italic">No assets recorded</div>
              )}
            </div>

            {/* Total Assets */}
            <div className="pt-4 border-t-2 border-[#172033] flex justify-between items-center text-sm font-bold text-[#172033]">
              <span>Total Assets</span>
              <span className="font-mono font-black text-base text-[#027A48]">
                {formatCurrency(Number(bsData.total_assets))}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
