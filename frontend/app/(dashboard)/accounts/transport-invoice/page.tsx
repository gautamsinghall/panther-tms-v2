"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, FileText, Ban, CheckCircle, AlertCircle, ArrowUpRight, ShieldCheck, Eye, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [lrs, setLrs] = useState<LRRecord[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLrId, setSelectedLrId] = useState<string>("");
  const [selectedTaxCatId, setSelectedTaxCatId] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [vouchersRes, lrsRes, taxesRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=TRANSPORT_INVOICE"),
        apiClient<LRRecord[]>("/api/v1/transport/lrs"),
        apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories"),
      ]);
      setData(Array.isArray(vouchersRes) ? vouchersRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
      setTaxCategories(Array.isArray(taxesRes) ? taxesRes : []);
      if (taxesRes.length > 0 && !selectedTaxCatId) {
        const g12 = taxesRes.find((t) => t.name.includes("12")) || taxesRes[0];
        setSelectedTaxCatId(g12.id.toString());
      }
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load transport invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((v) => {
      if (statusFilter === "ACTIVE" && v.is_void) return false;
      if (statusFilter === "VOID" && !v.is_void) return false;
      if (statusFilter === "IRN_GENERATED" && v.irn_status !== "GENERATED") return false;
      return true;
    });
  }, [data, statusFilter]);

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
          narration: narration || undefined,
        }),
      });
      setSuccessMessage("Transport invoice generated and posted to financial ledger successfully.");
      setIsCreateOpen(false);
      setSelectedLrId("");
      setNarration("");
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidVoucher = async () => {
    if (!voidVoucherId || !voidReason.trim()) {
      alert("Please provide an audit reason for voiding this invoice.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason }),
      });
      setSuccessMessage("Invoice voided successfully with automatic reversal entries posted.");
      setIsVoidOpen(false);
      setVoidVoucherId(null);
      setVoidReason("");
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to void invoice.");
    } finally {
      setIsVoiding(false);
    }
  };

  const handleGenerateIRN = async (voucher: VoucherRecord) => {
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/einvoicing/generate-irn", {
        method: "POST",
        body: JSON.stringify({ voucher_id: voucher.id }),
      });
      setSuccessMessage(`IRN Generated successfully for invoice ${voucher.voucher_number}!`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate E-Invoice IRN.");
    }
  };

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Invoice Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#172033] block">
            {row.voucher_number}
          </span>
          <span className="text-[11px] text-[#667085]">
            {formatDate(row.voucher_date)}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Linked Consignment (LR)",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] border border-[#E4E7EC]">
          {row.lr_number || `LR #${row.lr_id}`}
        </span>
      ),
    },
    {
      key: "party_name",
      header: "Billed Customer",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#172033] block text-xs">
            {row.party_name || "General Client"}
          </span>
          {row.party_gstin && (
            <span className="font-mono text-[10px] text-[#667085] uppercase">
              GST: {row.party_gstin}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Net Amount (₹)",
      sortable: true,
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#172033] block text-xs sm:text-sm">
            {formatCurrency(row.net_amount)}
          </span>
          <span className="text-[11px] font-mono text-[#667085]">
            Tax: {formatCurrency(row.tax_amount)}
          </span>
        </div>
      ),
    },
    {
      key: "irn_status",
      header: "E-Invoicing IRN",
      align: "center",
      cell: (row) => {
        if (row.irn_status === "GENERATED") {
          return (
            <div className="flex flex-col items-center">
              <Badge variant="success" className="gap-1">
                <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                IRN Active
              </Badge>
              {row.irn && (
                <span className="font-mono text-[10px] text-[#98A2B3] mt-0.5 truncate max-w-[100px]" title={row.irn}>
                  {row.irn.substring(0, 8)}...
                </span>
              )}
            </div>
          );
        }
        if (row.irn_status === "CANCELLED") {
          return <Badge variant="danger">IRN Cancelled</Badge>;
        }
        return <Badge variant="neutral">Not Generated</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        row.is_void ? (
          <StatusBadge status="Void" />
        ) : (
          <StatusBadge status="Active" />
        )
      ),
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Ledger Entries",
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (row) => setSelectedVoucher(row),
    },
    {
      label: "Generate IRN (E-Invoice)",
      icon: <ArrowUpRight className="w-3.5 h-3.5" />,
      hidden: (row) => row.is_void || row.irn_status === "GENERATED",
      onClick: (row) => handleGenerateIRN(row),
    },
    {
      label: "Void Invoice",
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
      <PageHeader
        title="Transport Invoices"
        description="Freight billing engine: generate double-entry customer invoices linked to delivered LRs with automated GST and NIC E-Invoicing."
        primaryAction={{
          label: "Create Invoice from LR",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsCreateOpen(true),
        }}
      />

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-card bg-[#FEF2F2] border border-[#FECDCA] text-[#DC2626] text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-[#DC2626] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-card bg-[#ECFDF3] border border-[#A6F4C5] text-[#16A34A] text-xs flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto text-[#16A34A] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FilterBar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search invoice number, customer, LR..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Invoices", value: "ALL" },
              { label: "Active Invoices", value: "ACTIVE" },
              { label: "Voided Invoices", value: "VOID" },
              { label: "IRN Generated", value: "IRN_GENERATED" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchable={false}
        emptyMessage="No transport invoices found"
        emptySubtext="Select a delivered or completed Lorry Receipt to generate a formal freight invoice."
        emptyAction={{
          label: "+ Create Invoice from LR",
          onClick: () => setIsCreateOpen(true),
        }}
      />

      {/* Create Invoice Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate Transport Invoice"
        description="Select an unbilled Lorry Receipt to calculate freight charges, GST rate, and post double-entry ledger vouchers."
        width="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-5 bg-white p-5 rounded-card border border-[#E4E7EC]">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#172033]">
              Select Lorry Receipt (LR) <span className="text-[#DC2626]">*</span>
            </label>
            <SearchableSelect
              value={selectedLrId}
              onChange={(val) => setSelectedLrId(String(val))}
              options={lrs.map((lr) => ({
                value: String(lr.id),
                label: `${lr.lr_number} (${formatDate(lr.lr_date)}) — Status: ${lr.status}`,
              }))}
              placeholder="Select LR to bill..."
              searchPlaceholder="Search LR number or status..."
              onAddNew={() => router.push("/transport/lr-booking")}
              addNewLabel="+ Book New Lorry Receipt (LR)"
              addNewTitle="Book a new Lorry Receipt in transport module"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#172033]">
              Applicable Tax / GST Category
            </label>
            <SearchableSelect
              value={selectedTaxCatId}
              onChange={(val) => setSelectedTaxCatId(String(val))}
              options={taxCategories.map((t) => ({
                value: String(t.id),
                label: `${t.name} (IGST: ${t.igst_rate}%)`,
              }))}
              placeholder="Select tax category..."
              searchPlaceholder="Search tax rate or GST..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#172033]">
              Voucher Narration / Remarks
            </label>
            <textarea
              rows={3}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Freight invoice for corridor movement with RCM/FCM terms"
              className="w-full rounded-control border border-[#E4E7EC] bg-white px-3 py-2 text-xs sm:text-sm text-[#172033] placeholder:text-[#98A2B3] focus:outline-none focus:ring-1 focus:ring-[#172033]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E4E7EC]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Generate & Post Invoice
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* View Ledger Entries Drawer */}
      <EntityDrawer
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Ledger Audit: ${selectedVoucher?.voucher_number}`}
        description="Double-entry journal postings associated with this transaction voucher."
        width="xl"
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-card border border-[#E4E7EC]">
              <div>
                <span className="text-[11px] text-[#667085] block">Party</span>
                <span className="text-xs font-semibold text-[#172033]">{selectedVoucher.party_name || "-"}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#667085] block">Date</span>
                <span className="text-xs font-semibold text-[#172033]">{formatDate(selectedVoucher.voucher_date)}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#667085] block">Tax</span>
                <span className="text-xs font-mono font-semibold text-[#172033]">{formatCurrency(selectedVoucher.tax_amount)}</span>
              </div>
              <div>
                <span className="text-[11px] text-[#667085] block">Net Total</span>
                <span className="text-xs font-mono font-bold text-[#172033]">{formatCurrency(selectedVoucher.net_amount)}</span>
              </div>
            </div>

            <div className="bg-white rounded-card border border-[#E4E7EC] overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F7F8FA] border-b border-[#E4E7EC] text-[11px] font-semibold uppercase text-[#667085]">
                  <tr>
                    <th className="py-2.5 px-4">Account Head</th>
                    <th className="py-2.5 px-4 text-right">Debit (₹)</th>
                    <th className="py-2.5 px-4 text-right">Credit (₹)</th>
                    <th className="py-2.5 px-4">Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC] text-[#172033]">
                  {selectedVoucher.ledger_entries?.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#F7F8FA]">
                      <td className="py-2.5 px-4 font-medium">{entry.account_name || `Account #${entry.account_id}`}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {parseFloat(String(entry.debit_amount)) > 0 ? formatCurrency(entry.debit_amount) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {parseFloat(String(entry.credit_amount)) > 0 ? formatCurrency(entry.credit_amount) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-[#667085]">{entry.narration || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* Void Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setVoidReason("");
        }}
        onConfirm={handleVoidVoucher}
        title="Void Freight Invoice"
        consequence="Voiding this invoice will generate automatic contra-reversal ledger postings. You must provide a formal audit reason."
        confirmLabel="Confirm & Void"
        isLoading={isVoiding}
      />
    </div>
  );
}
