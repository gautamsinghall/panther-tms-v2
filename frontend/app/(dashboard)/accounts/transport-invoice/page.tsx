"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, FileText, Ban, CheckCircle, AlertCircle, ArrowUpRight, ShieldCheck, Eye } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  narration?: string;
  is_reversal: boolean;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  party_gstin?: string;
  lr_id?: number;
  lr_number?: string;
  hire_challan_id?: number;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  irn?: string;
  irn_status?: string;
  ledger_entries: LedgerEntry[];
  created_at: string;
}

interface LRRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  status: string;
  chargeable_weight_mt?: number;
  package_count?: number;
}

interface TaxCategoryRecord {
  id: number;
  name: string;
  igst_rate: string | number;
}

export default function TransportInvoicePage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [lrs, setLrs] = useState<LRRecord[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLrId, setSelectedLrId] = useState<string>("");
  const [selectedTaxCatId, setSelectedTaxCatId] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Modal state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [vouchersRes, lrsRes, taxesRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=TRANSPORT_INVOICE"),
        apiClient<LRRecord[]>("/api/v1/transport/lrs"),
        apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories"),
      ]);
      setData(vouchersRes);
      setLrs(lrsRes);
      setTaxCategories(taxesRes);
      if (taxesRes.length > 0 && !selectedTaxCatId) {
        // Default to GST 12% if present
        const g12 = taxesRes.find((t) => t.name.includes("12")) || taxesRes[0];
        setSelectedTaxCatId(g12.id.toString());
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load transport invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLrId) {
      alert("Please select a valid LR.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/transport-invoices", {
        method: "POST",
        body: JSON.stringify({
          lr_id: parseInt(selectedLrId, 10),
          tax_category_id: selectedTaxCatId ? parseInt(selectedTaxCatId, 10) : undefined,
          narration: narration.trim() || undefined,
        }),
      });
      setSuccessMessage("Transport Invoice created successfully with balanced double-entry ledger entries!");
      setIsCreateOpen(false);
      setSelectedLrId("");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create transport invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidVoucherId) return;
    if (voidReason.trim().length < 10) {
      alert("Void reason must be at least 10 characters as per audit rules.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      setSuccessMessage(`Voucher #${voidVoucherId} has been voided and reversing entries posted.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to void voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleGenerateIRN = async (voucher: VoucherRecord) => {
    if (!confirm(`Generate E-Invoice IRN for ${voucher.voucher_number}?`)) return;
    try {
      await apiClient("/api/v1/einvoicing/generate-irn", {
        method: "POST",
        body: JSON.stringify({ voucher_id: voucher.id }),
      });
      setSuccessMessage(`IRN successfully generated for ${voucher.voucher_number}!`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate IRN.");
    }
  };

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Invoice No.",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            {row.voucher_number}
            {row.is_void && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded">
                VOIDED
              </span>
            )}
          </span>
          <span className="block text-[11px] text-slate-400">{row.voucher_date}</span>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Party / Customer",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {row.party_name || "Direct Customer"}
          </span>
          {row.party_gstin && (
            <span className="block font-mono text-[11px] text-slate-400">
              GSTIN: {row.party_gstin}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Linked LR",
      cell: (row) => (
        row.lr_number ? (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {row.lr_number}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )
      ),
    },
    {
      key: "net_amount",
      header: "Net Amount",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="block text-[11px] text-slate-400">
            Tax: ₹{Number(row.tax_amount).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      key: "irn_status",
      header: "IRN Status",
      align: "center",
      cell: (row) => {
        if (row.irn_status === "GENERATED") {
          return (
            <div className="flex flex-col items-center">
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3 h-3" />
                Generated
              </Badge>
              {row.irn && (
                <span className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]" title={row.irn}>
                  {row.irn.substring(0, 10)}...
                </span>
              )}
            </div>
          );
        }
        if (row.irn_status === "CANCELLED") {
          return <Badge variant="danger">Cancelled</Badge>;
        }
        return <Badge variant="neutral">Not Generated</Badge>;
      },
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Ledger",
      icon: <Eye className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => setSelectedVoucher(row),
    },
    {
      label: "Generate IRN",
      icon: <ArrowUpRight className="w-3.5 h-3.5" />,
      variant: "default",
      hidden: (row) => row.is_void || row.irn_status === "GENERATED",
      onClick: (row) => handleGenerateIRN(row),
    },
    {
      label: "Void Voucher",
      icon: <Ban className="w-3.5 h-3.5" />,
      variant: "danger",
      hidden: (row) => row.is_void,
      onClick: (row) => {
        setVoidVoucherId(row.id);
        setIsVoidOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[var(--color-primary)]" />
            Transport Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate and manage billing for transport freight, linked directly to operational LRs with automatic double-entry ledger postings.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Invoice from LR
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchPlaceholder="Search invoices, party, or LR..."
          searchColumn="voucher_number"
          actions={actions}
        />
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--color-primary)]" />
                Create Transport Invoice from LR
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select LR *
                </label>
                <select
                  required
                  value={selectedLrId}
                  onChange={(e) => setSelectedLrId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">-- Choose Consignment Note / LR --</option>
                  {lrs.map((lr) => (
                    <option key={lr.id} value={lr.id}>
                      {lr.lr_number} ({lr.lr_date}) — {lr.status} — {lr.chargeable_weight_mt || 0} MT
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tax Category *
                </label>
                <select
                  required
                  value={selectedTaxCatId}
                  onChange={(e) => setSelectedTaxCatId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">-- Choose GST Tax Rate --</option>
                  {taxCategories.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} ({Number(tc.igst_rate)}% IGST)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional invoice remarks..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Posting..." : "Create & Post to Ledger"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Voucher Modal */}
      {isVoidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Void Voucher #{voidVoucherId}
              </h3>
              <button onClick={() => setIsVoidOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidVoucher} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Per financial audit rules (§7), voiding is non-destructive. The voucher status will be set to void and automated reversing ledger entries will be posted to keep your accounts balanced.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Voiding * (Min 10 chars)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this voucher is being voided..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsVoidOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" disabled={isVoiding || voidReason.trim().length < 10}>
                  {isVoiding ? "Voiding..." : "Confirm Void Entry"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Ledger Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[var(--color-primary)]" />
                  Double-Entry Ledger: {selectedVoucher.voucher_number}
                </h3>
                <p className="text-xs text-slate-400">
                  Total Amount: ₹{Number(selectedVoucher.net_amount).toFixed(2)} | Date: {selectedVoucher.voucher_date}
                </p>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">Account</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                      <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedVoucher.ledger_entries.map((entry) => (
                      <tr key={entry.id} className={entry.is_reversal ? "bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200" : ""}>
                        <td className="px-4 py-2.5 font-medium">
                          {entry.account_name || `Account #${entry.account_id}`}
                          {entry.is_reversal && (
                            <span className="ml-2 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                              [Reversal]
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {Number(entry.debit_amount) > 0 ? "Debit" : "Credit"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right">
                          {Number(entry.debit_amount) > 0 ? `₹${Number(entry.debit_amount).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right">
                          {Number(entry.credit_amount) > 0 ? `₹${Number(entry.credit_amount).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                    <tr>
                      <td colSpan={2} className="px-4 py-2.5 text-right">Total Balance Check:</td>
                      <td className="px-4 py-2.5 font-mono text-right text-emerald-600">
                        ₹{selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.debit_amount), 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right text-emerald-600">
                        ₹{selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.credit_amount), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selectedVoucher.is_void && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                  <strong>Void Reason:</strong> {selectedVoucher.void_reason}
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
