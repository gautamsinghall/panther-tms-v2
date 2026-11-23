"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, Printer, RefreshCw, Eye, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ColumnDef } from "@/types/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface DaybookEntry {
  id: number;
  voucher_id: number;
  voucher_number: string;
  voucher_type: string;
  entry_date: string;
  account_id: number;
  account_name: string;
  account_code: string;
  party_name?: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
  is_reversal: boolean;
}

interface DaybookResponse {
  entries: DaybookEntry[];
  total_debit: number;
  total_credit: number;
  total_entries: number;
  from_date?: string;
  to_date?: string;
}

interface VoucherItemDetail {
  id: number;
  description: string;
  hsn_sac?: string;
  quantity: number;
  rate: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  charge_head_name?: string;
  tax_category_name?: string;
}

interface LedgerEntryDetail {
  id: number;
  voucher_id: number;
  account_id: number;
  account_name?: string;
  entry_date: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
  is_reversal: boolean;
}

interface BillAllocationDetail {
  id: number;
  voucher_id: number;
  invoice_id: number;
  allocated_amount: number;
  tds_amount: number;
  discount_amount: number;
  total_settled: number;
  adjustment_type?: string;
  notes?: string;
  created_at: string;
  voucher_number?: string;
  invoice_number?: string;
}

interface VoucherDetail {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  party_type?: string;
  reference_number?: string;
  reference_date?: string;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  lr_number?: string;
  hire_challan_number?: string;
  issuing_office_name?: string;
  billing_client_name?: string;
  vendor_name?: string;
  driver_name?: string;
  party_gstin?: string;
  due_date?: string;
  paid_amount?: number;
  balance_amount?: number;
  payment_status?: string;
  gst_treatment?: string;
  place_of_supply?: string;
  against_voucher_number?: string;
  irn?: string;
  irn_status?: string;
  tax_breakup?: {
    payment_mode?: string;
    [key: string]: any;
  };
  items?: VoucherItemDetail[];
  ledger_entries: LedgerEntryDetail[];
  bill_allocations?: BillAllocationDetail[];
}

function getVoucherSourceRoute(voucherType: string): { label: string; href: string } | null {
  const type = (voucherType || "").toUpperCase();
  switch (type) {
    case "TRANSPORT_INVOICE":
      return { label: "Transport Invoices", href: "/accounts/transport-invoice" };
    case "RECEIPT_VOUCHER":
      return { label: "Receipt Vouchers", href: "/accounts/receipt-voucher" };
    case "PAYMENT_VOUCHER":
    case "PAYMENT_ATH":
    case "PAYMENT_BTH":
      return { label: "Payment Vouchers", href: "/accounts/payment-voucher" };
    case "CONTRA_VOUCHER":
      return { label: "Contra Vouchers", href: "/accounts/contra-voucher" };
    case "JOURNAL_VOUCHER":
      return { label: "Journal Vouchers", href: "/accounts/journal-voucher" };
    case "CREDIT_NOTE":
    case "DEBIT_NOTE":
      return { label: "Credit / Debit Notes", href: "/accounts/credit-debit-notes" };
    case "NORMAL_PURCHASE":
      return { label: "Normal Purchase", href: "/accounts/normal-purchase" };
    case "GENERAL_PURCHASE":
      return { label: "General Purchase", href: "/accounts/general-purchase" };
    case "GENERAL_INVOICE":
      return { label: "General Invoices", href: "/accounts/general-invoice" };
    case "PROFORMA_INVOICE":
      return { label: "Proforma Invoices", href: "/accounts/proforma-invoice" };
    default:
      return null;
  }
}

export default function DaybookReportPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<DaybookEntry[]>([]);
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Voucher Drawer State
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
  const [isLoadingVoucher, setIsLoadingVoucher] = useState<boolean>(false);
  const [loadingRowId, setLoadingRowId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  async function loadDaybook() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<DaybookResponse>("/api/v1/reports/daybook");
      setEntries(data.entries || []);
      setTotalDebit(Number(data.total_debit || 0));
      setTotalCredit(Number(data.total_credit || 0));
    } catch (err: any) {
      setError(err?.message || "Failed to load Daybook transactions");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDaybook();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const job = await apiClient<any>("/api/v1/reports/export", {
        method: "POST",
        body: JSON.stringify({ report_name: "daybook", format: "csv" }),
      });
      if (job.download_url) {
        window.open(job.download_url, "_blank");
      }
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleViewVoucher(row: DaybookEntry) {
    setLoadingRowId(row.id);
    setIsDrawerOpen(true);
    setIsLoadingVoucher(true);

    try {
      const data = await apiClient<VoucherDetail>(`/api/v1/accounts/vouchers/${row.voucher_id}`);
      setSelectedVoucher(data);
    } catch (err: any) {
      // Graceful fallback from daybook entry row if API lookup encounters issues
      setSelectedVoucher({
        id: row.voucher_id,
        voucher_number: row.voucher_number,
        voucher_type: row.voucher_type,
        voucher_date: row.entry_date,
        party_name: row.party_name,
        total_amount: Number(row.debit_amount || row.credit_amount || 0),
        tax_amount: 0,
        net_amount: Number(row.debit_amount || row.credit_amount || 0),
        narration: row.narration,
        is_void: false,
        ledger_entries: [
          {
            id: row.id,
            voucher_id: row.voucher_id,
            account_id: row.account_id,
            account_name: row.account_name,
            entry_date: row.entry_date,
            debit_amount: row.debit_amount,
            credit_amount: row.credit_amount,
            narration: row.narration,
            is_reversal: row.is_reversal,
          },
        ],
      });
    } finally {
      setIsLoadingVoucher(false);
      setLoadingRowId(null);
    }
  }

  const columns: ColumnDef<DaybookEntry>[] = [
    {
      key: "voucher_number",
      header: "Voucher #",
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
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] font-medium border border-[#E4E7EC]">
          {row.voucher_type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "entry_date",
      header: "Date",
      sortable: true,
      cell: (row) => <span className="text-xs text-[#475467]">{formatDate(row.entry_date)}</span>,
    },
    {
      key: "account_name",
      header: "Account / Particulars",
      cell: (row) => (
        <div>
          <div className="font-semibold text-xs text-[#172033]">{row.account_name}</div>
          <div className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5">
            {row.party_name && (
              <span className="font-medium text-[#344054]">Party: {row.party_name} •</span>
            )}
            <span className="truncate max-w-xs sm:max-w-sm lg:max-w-md" title={row.narration || undefined}>
              {row.narration || "No narration"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "debit_amount",
      header: "Debit (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-slate-900 dark:text-[#F5F5F7]">
          {Number(row.debit_amount) > 0 ? formatCurrency(Number(row.debit_amount)) : <span className="text-slate-400 dark:text-slate-600 font-normal">-</span>}
        </span>
      ),
    },
    {
      key: "credit_amount",
      header: "Credit (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-emerald-600">
          {Number(row.credit_amount) > 0 ? formatCurrency(Number(row.credit_amount)) : <span className="text-slate-400 dark:text-slate-600 font-normal">-</span>}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      cell: (row) => (
        <Button
          size="sm"
          variant="outline"
          disabled={loadingRowId === row.id}
          className="text-xs h-7 px-2.5 font-medium hover:border-indigo-300 hover:text-indigo-600 flex items-center gap-1.5"
          onClick={() => handleViewVoucher(row)}
        >
          {loadingRowId === row.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          View
        </Button>
      ),
    },
  ];

  const sourceRoute = selectedVoucher ? getVoucherSourceRoute(selectedVoucher.voucher_type) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daybook"
        description="Chronological record of daily debit and credit transactions across vouchers."
        breadcrumbs={[
          { label: "Reports", href: "/reports/daybook" },
          { label: "Daybook" },
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
            onClick: loadDaybook,
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
        data={entries}
        isLoading={isLoading}
        isError={Boolean(error)}
        errorMessage={error || undefined}
        searchPlaceholder="Search by voucher number or account name..."
        emptyMessage="No daybook transactions found for the selected period."
      />

      {/* Summary Footer */}
      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] dark:bg-[#17171B] border border-[#E4E7EC] dark:border-[#303036] rounded-xl text-sm font-semibold text-[#172033] dark:text-white">
        <span>Total Postings ({entries.length} records)</span>
        <div className="flex items-center gap-8 font-mono">
          <div>
            <span className="text-xs text-[#667085] mr-2">Total Debit:</span>
            <span className="text-[#172033]">₹{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-xs text-[#667085] mr-2">Total Credit:</span>
            <span className="text-emerald-600">₹{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-xs text-[#667085] mr-2">Net Variance:</span>
            <span className={Math.abs(totalDebit - totalCredit) === 0 ? "text-[#027A48]" : "text-[#B42318]"}>
              ₹{Math.abs(totalDebit - totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* View Voucher Entity Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedVoucher(null);
        }}
        title={
          selectedVoucher
            ? `${selectedVoucher.voucher_type.replace(/_/g, " ")}: ${selectedVoucher.voucher_number}`
            : "Voucher Details"
        }
        description="Inspect complete transaction metadata, double-entry postings, and bill-wise settlements."
        size="lg"
      >
        {isLoadingVoucher && !selectedVoucher ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Loading voucher records...</p>
          </div>
        ) : selectedVoucher ? (
          <div className="space-y-6 pb-12">
            {/* Header / Summary Card */}
            <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] font-semibold border border-[#E4E7EC]">
                      {selectedVoucher.voucher_type.replace(/_/g, " ")}
                    </span>
                    {selectedVoucher.is_void ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        VOIDED
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedVoucher.payment_status || "POSTED"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedVoucher.party_name || selectedVoucher.billing_client_name || selectedVoucher.vendor_name || selectedVoucher.driver_name || "General Account"}
                  </h3>
                  {selectedVoucher.party_gstin && (
                    <span className="text-xs text-slate-500 font-mono">
                      GSTIN: {selectedVoucher.party_gstin}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Total Net Amount</span>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {formatCurrency(Number(selectedVoucher.net_amount || 0))}
                  </p>
                  {selectedVoucher.balance_amount !== undefined && selectedVoucher.balance_amount !== null && (
                    <span className="text-xs font-mono text-amber-700 block">
                      Balance: {formatCurrency(Number(selectedVoucher.balance_amount))}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-[#22232E] text-xs">
                <div>
                  <span className="text-slate-500 block">Voucher Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(selectedVoucher.voucher_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Issuing Office</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedVoucher.issuing_office_name || "Head Office"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reference #</span>
                  <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                    {selectedVoucher.reference_number || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Mode</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedVoucher.tax_breakup?.payment_mode || "BANK / LEDGER"}
                  </span>
                </div>
                {selectedVoucher.lr_number && (
                  <div>
                    <span className="text-slate-500 block">Consignment (LR #)</span>
                    <span className="font-mono font-semibold text-indigo-600">
                      {selectedVoucher.lr_number}
                    </span>
                  </div>
                )}
                {selectedVoucher.hire_challan_number && (
                  <div>
                    <span className="text-slate-500 block">Hire Challan #</span>
                    <span className="font-mono font-semibold text-indigo-600">
                      {selectedVoucher.hire_challan_number}
                    </span>
                  </div>
                )}
                {selectedVoucher.irn && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block">E-Invoice IRN</span>
                    <span className="font-mono text-[11px] text-emerald-600 truncate block" title={selectedVoucher.irn}>
                      {selectedVoucher.irn}
                    </span>
                  </div>
                )}
              </div>

              {selectedVoucher.narration && (
                <div className="pt-2 border-t border-slate-100 dark:border-[#22232E] text-xs text-slate-600 dark:text-slate-300 italic">
                  &quot;{selectedVoucher.narration}&quot;
                </div>
              )}
            </div>

            {/* Line Items Table (if present) */}
            {selectedVoucher.items && selectedVoucher.items.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Voucher Items / Line Particulars ({selectedVoucher.items.length})
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-[#22232E] shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#181926] text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#22232E]">
                      <tr>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">HSN/SAC</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Tax (₹)</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                      {selectedVoucher.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {item.description}
                            {item.charge_head_name && (
                              <span className="text-[11px] text-slate-400 block">{item.charge_head_name}</span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                            {item.hsn_sac || "—"}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {Number(item.quantity || 1).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(Number(item.rate || 0))}
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-600">
                            {formatCurrency(Number(item.tax_amount || 0))}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(Number(item.total_amount || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Bill Allocations Table (if present) */}
            {selectedVoucher.bill_allocations && selectedVoucher.bill_allocations.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Settled Invoices / Bill Allocations ({selectedVoucher.bill_allocations.length})
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-[#22232E] shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#181926] text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#22232E]">
                      <tr>
                        <th className="p-2.5">Invoice / Ref #</th>
                        <th className="p-2.5 text-right">Settled Amount</th>
                        <th className="p-2.5 text-right">TDS u/s 194C</th>
                        <th className="p-2.5 text-right">Discount</th>
                        <th className="p-2.5 text-right">Total Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                      {selectedVoucher.bill_allocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td className="p-2.5 font-mono text-indigo-600 font-semibold">
                            {alloc.invoice_number || alloc.voucher_number || alloc.notes || `Voucher #${alloc.voucher_id}`}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(Number(alloc.allocated_amount || 0))}
                          </td>
                          <td className="p-2.5 text-right font-mono text-amber-600">
                            {formatCurrency(Number(alloc.tds_amount || 0))}
                          </td>
                          <td className="p-2.5 text-right font-mono text-blue-600">
                            {formatCurrency(Number(alloc.discount_amount || 0))}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-emerald-600">
                            {formatCurrency(Number(alloc.total_settled || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Double-Entry Balanced Journal Postings */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Balanced Double-Entry Journal Postings
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-[#22232E] shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#181926] text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-[#22232E]">
                    <tr>
                      <th className="p-2.5">Account Head</th>
                      <th className="p-2.5 text-right">Debit (Dr) ₹</th>
                      <th className="p-2.5 text-right">Credit (Cr) ₹</th>
                      <th className="p-2.5">Entry Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#303036] bg-white dark:bg-[#101013]">
                    {selectedVoucher.ledger_entries?.map((le) => (
                      <tr key={le.id} className={le.is_reversal ? "bg-rose-50/50 dark:bg-rose-950/20" : ""}>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-200">
                          {le.account_name || `Account #${le.account_id}`}
                          {le.is_reversal && (
                            <span className="ml-1.5 text-[10px] text-rose-600 uppercase font-bold">[REVERSAL]</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-slate-900 dark:text-white">
                          {Number(le.debit_amount) > 0 ? formatCurrency(Number(le.debit_amount)) : "—"}
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-emerald-600">
                          {Number(le.credit_amount) > 0 ? formatCurrency(Number(le.credit_amount)) : "—"}
                        </td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs" title={le.narration || undefined}>
                          {le.narration || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-[#17171B] font-semibold border-t border-slate-200 dark:border-[#303036] text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="p-2.5 uppercase text-[10px] text-slate-500">Totals:</td>
                      <td className="p-2.5 text-right font-mono text-slate-900 dark:text-white">
                        {formatCurrency(
                          selectedVoucher.ledger_entries
                            ? selectedVoucher.ledger_entries
                                .filter((e) => !e.is_reversal)
                                .reduce((acc, e) => acc + (Number(e.debit_amount) || 0), 0)
                            : 0
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-600">
                        {formatCurrency(
                          selectedVoucher.ledger_entries
                            ? selectedVoucher.ledger_entries
                                .filter((e) => !e.is_reversal)
                                .reduce((acc, e) => acc + (Number(e.credit_amount) || 0), 0)
                            : 0
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Balanced
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actions Bar inside Drawer */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-[#22232E]">
              {sourceRoute ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(sourceRoute.href)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open in {sourceRoute.label}
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-xs font-medium"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Print Details
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setSelectedVoucher(null);
                  }}
                  className="text-xs font-medium"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </EntityDrawer>
    </div>
  );
}
