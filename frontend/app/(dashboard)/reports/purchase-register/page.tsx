"use client";

import React, { useState, useEffect } from "react";
import { Download, Printer, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

interface PurchaseRegisterItem {
  voucher_id: number;
  voucher_number: string;
  voucher_date: string;
  voucher_type: string;
  supplier_name?: string;
  supplier_gstin?: string;
  reference_number?: string;
  reference_date?: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  net_amount: number;
}

interface PurchaseRegisterResponse {
  purchases: PurchaseRegisterItem[];
  total_taxable: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  total_net_amount: number;
  purchase_count: number;
}

export default function PurchaseRegisterPage() {
  const [data, setData] = useState<PurchaseRegisterResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPurchaseRegister() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<PurchaseRegisterResponse>("/api/v1/reports/purchase-register");
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load Purchase Register");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPurchaseRegister();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "purchase-register", format: "csv" }),
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

  const columns: ColumnDef<PurchaseRegisterItem>[] = [
    {
      key: "voucher_number",
      header: "Bill / Voucher #",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-xs text-[#172033]">
          {row.voucher_number}
        </span>
      ),
    },
    {
      key: "voucher_type",
      header: "Type",
      cell: (row) => (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] font-medium border border-[#E4E7EC]">
          {row.voucher_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "voucher_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#475467]">{formatDate(row.voucher_date)}</span>,
    },
    {
      key: "supplier_name",
      header: "Supplier / Vendor / Owner",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.supplier_name || "Unassigned"}</div>
          {row.reference_number && (
            <div className="text-[10px] text-[#667085]">Ref: {row.reference_number}</div>
          )}
        </div>
      ),
    },
    {
      key: "taxable_amount",
      header: "Taxable (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#172033]">
          {formatCurrency(Number(row.taxable_amount))}
        </span>
      ),
    },
    {
      key: "total_tax",
      header: "GST Tax (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs text-amber-700">
          {formatCurrency(Number(row.total_tax))}
        </span>
      ),
    },
    {
      key: "net_amount",
      header: "Net Amount (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#172033]">
          {formatCurrency(Number(row.net_amount))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Register"
        description="Audit record of supplier purchases, tyre bills, diesel fuel logs, and hired market truck payments."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Purchase Register" },
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
            onClick: loadPurchaseRegister,
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

      <DataTable
        columns={columns}
        data={data?.purchases || []}
        isLoading={isLoading}
        searchPlaceholder="Search bills by vendor name or voucher number..."
        searchColumn="supplier_name"
        emptyMessage="No purchase bills recorded."
      />

      {data && (
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E4E7EC] rounded-xl text-sm font-semibold text-[#172033]">
          <span>Purchase Summary ({data.purchase_count} bills)</span>
          <div className="flex items-center gap-8 font-mono">
            <div>
              <span className="text-xs text-[#667085] mr-2">Taxable:</span>
              <span>₹{Number(data.total_taxable).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Total GST:</span>
              <span className="text-amber-700">₹{Number(data.total_tax).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-xs text-[#667085] mr-2">Total Invoiced:</span>
              <span className="text-[#172033]">₹{Number(data.total_net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
