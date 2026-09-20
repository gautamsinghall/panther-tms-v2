"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface PnLAccountItem {
  account_id: number;
  account_code: string;
  account_name: string;
  amount: number;
}

interface PnLGroupItem {
  group_name: string;
  accounts: PnLAccountItem[];
  group_total: number;
}

interface ProfitLossResponse {
  from_date?: string;
  to_date?: string;
  direct_income: PnLGroupItem[];
  total_direct_income: number;
  indirect_income: PnLGroupItem[];
  total_indirect_income: number;
  total_revenue: number;
  direct_expenses: PnLGroupItem[];
  total_direct_expenses: number;
  indirect_expenses: PnLGroupItem[];
  total_indirect_expenses: number;
  total_expenses: number;
  gross_profit: number;
  net_profit: number;
}

export default function ProfitLossPage() {
  const [pnlData, setPnlData] = useState<ProfitLossResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPnL() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<ProfitLossResponse>("/api/v1/reports/profit-loss");
      setPnlData(data);
    } catch (err: any) {
      setError(err.message || "Failed to load Profit & Loss statement");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPnL();
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
        title="Profit & Loss Statement"
        description="Operating financial performance summarizing freight revenues, direct transport costs, and net margins."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Profit & Loss" },
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
            onClick: loadPnL,
          },
          {
            label: "Print",
            icon: <Printer className="w-4 h-4" />,
            variant: "outline",
            onClick: () => window.print(),
          },
        ]}
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {pnlData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Total Revenue</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(pnlData.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Operating Expenses</span>
            <div className="text-xl font-bold font-mono text-[#172033] mt-1">
              ₹{Number(pnlData.total_expenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Gross Profit</span>
            <div className={`text-xl font-bold font-mono mt-1 ${pnlData.gross_profit >= 0 ? "text-[#027A48]" : "text-[#B42318]"}`}>
              ₹{Number(pnlData.gross_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </Card>
          <Card className="p-4 bg-white border border-[#E4E7EC]">
            <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Net Profit</span>
            <div className={`text-xl font-bold font-mono mt-1 ${pnlData.net_profit >= 0 ? "text-[#027A48]" : "text-[#B42318]"}`}>
              ₹{Number(pnlData.net_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="p-12 text-center text-sm text-[#667085]">
          Computing Profit & Loss from ledger entries...
        </div>
      )}

      {!isLoading && pnlData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses */}
          <Card className="p-6 space-y-5 bg-white border border-[#E4E7EC] shadow-xs">
            <h3 className="font-bold text-sm text-[#172033] pb-3 border-b border-[#E4E7EC] flex justify-between uppercase tracking-wide">
              <span>Expenses</span>
              <span>Amount (₹)</span>
            </h3>

            <div className="space-y-4">
              <div className="text-xs font-bold text-[#475467] uppercase tracking-wider">
                Direct Operating Expenses
              </div>
              {pnlData.direct_expenses?.map((grp, idx) => (
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
              {pnlData.direct_expenses?.length === 0 && (
                <div className="text-xs text-[#98A2B3] italic pl-2">No direct expenses recorded</div>
              )}

              {pnlData.indirect_expenses?.length > 0 && (
                <>
                  <div className="text-xs font-bold text-[#475467] uppercase tracking-wider pt-2 border-t border-[#F2F4F7]">
                    Indirect Expenses
                  </div>
                  {pnlData.indirect_expenses?.map((grp, idx) => (
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
                </>
              )}
            </div>

            <div className="pt-4 border-t-2 border-[#172033] flex justify-between items-center text-sm font-bold text-[#172033]">
              <span>Total Expenses</span>
              <span className="font-mono font-black text-base text-[#172033]">
                {formatCurrency(Number(pnlData.total_expenses))}
              </span>
            </div>
          </Card>

          {/* Revenue */}
          <Card className="p-6 space-y-5 bg-white border border-[#E4E7EC] shadow-xs">
            <h3 className="font-bold text-sm text-[#172033] pb-3 border-b border-[#E4E7EC] flex justify-between uppercase tracking-wide">
              <span>Revenue & Income</span>
              <span>Amount (₹)</span>
            </h3>

            <div className="space-y-4">
              <div className="text-xs font-bold text-[#475467] uppercase tracking-wider">
                Direct Operational Income
              </div>
              {pnlData.direct_income?.map((grp, idx) => (
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
              {pnlData.direct_income?.length === 0 && (
                <div className="text-xs text-[#98A2B3] italic pl-2">No income recorded</div>
              )}

              {pnlData.indirect_income?.length > 0 && (
                <>
                  <div className="text-xs font-bold text-[#475467] uppercase tracking-wider pt-2 border-t border-[#F2F4F7]">
                    Indirect Revenue
                  </div>
                  {pnlData.indirect_income?.map((grp, idx) => (
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
                </>
              )}
            </div>

            <div className="pt-4 border-t-2 border-[#172033] flex justify-between items-center text-sm font-bold text-[#172033]">
              <span>Total Revenue</span>
              <span className="font-mono font-black text-base text-[#027A48]">
                {formatCurrency(Number(pnlData.total_revenue))}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
