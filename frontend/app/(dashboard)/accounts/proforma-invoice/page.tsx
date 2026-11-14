"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, FileSpreadsheet, Ban, CheckCircle, AlertCircle, Eye, Lock } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  is_reversal: boolean;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  billing_client_id?: number;
  reference_number?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  ledger_entries: LedgerEntry[];
  created_at: string;
}

interface BillingClientItem {
  id: number;
  name: string;
  code?: string;
  company_name?: string;
  gstin?: string;
  city?: string;
  state?: string;
}

export default function ProformaInvoicePage() {
  const { openMasterTab } = useWorkspaceTabs();
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [billingClients, setBillingClients] = useState<BillingClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Details Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>("");

  const loadData = async (isRetry = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";
      const [res, sInfo, clientsRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=PROFORMA_INVOICE"),
        apiClient<any>(`/api/v1/settings/series/check/PROFORMA_INVOICE${officeParam}`).catch(() => null),
        apiClient<any[]>("/api/v1/general/billing-clients").catch(() => []),
      ]);
      setData(res);
      setSeriesInfo(sInfo);
      setBillingClients(Array.isArray(clientsRes) ? clientsRes : []);
      if (sInfo?.series_options?.length > 0) {
        setSelectedSeriesId(String(sInfo.series_options[0].id));
      }
    } catch (err: any) {
      const msg = err.message || "";
      const isSchemaErr =
        msg.toLowerCase().includes("column") ||
        msg.toLowerCase().includes("does not exist") ||
        msg.toLowerCase().includes("programmingerror") ||
        msg.toLowerCase().includes("logger") ||
        msg.toLowerCase().includes("name '") ||
        msg.toLowerCase().includes("500");
      if (isSchemaErr && !isRetry) {
        try {
          await apiClient("/api/v1/accounts/sync-tally-schema", { method: "POST" });
          return await loadData(true);
        } catch {
          // fall through
        }
      }
      setErrorMessage(isSchemaErr ? "Database schema update required. Please click refresh." : (msg || "Failed to load proforma invoices."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const seriesOptions = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      return seriesInfo.series_options.map((s: any) => ({
        value: String(s.id),
        label: s.display_label || `${s.series_name} (${s.next_number_formatted})`,
      }));
    }
    if (seriesInfo?.configured) {
      return [{
        value: "default",
        label: `Default Series (${seriesInfo.next_number_formatted})`,
      }];
    }
    return [{ value: "default", label: "Default Proforma Invoice Sequence" }];
  }, [seriesInfo]);

  const activeSeries = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      if (selectedSeriesId && selectedSeriesId !== "default") {
        const found = seriesInfo.series_options.find((s: any) => String(s.id) === String(selectedSeriesId));
        if (found) return found;
      }
      return seriesInfo.series_options[0];
    }
    return seriesInfo;
  }, [seriesInfo, selectedSeriesId]);

  const activeNextNumber = activeSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";

  const billingClientOptions = useMemo(() => {
    return billingClients.map((c) => ({
      value: String(c.id),
      label: c.name || c.company_name || `Client #${c.id}`,
      subLabel: [c.code, c.gstin, c.city].filter(Boolean).join(" • "),
      keywords: [c.name, c.company_name, c.code, c.gstin, c.city].filter(Boolean) as string[],
    }));
  }, [billingClients]);

  const handleBillingClientCreated = (newClient: any) => {
    const formatted: BillingClientItem = {
      id: Number(newClient.id),
      name: newClient.name || newClient.company_name || newClient.label || `Client #${newClient.id}`,
      code: newClient.code,
      gstin: newClient.gstin,
      city: newClient.city,
      state: newClient.state,
    };
    setBillingClients((prev) => [formatted, ...prev.filter((c) => c.id !== formatted.id)]);
    setSelectedClientId(String(formatted.id));
    setPartyName(formatted.name);
    toast.success(`Billing client "${formatted.name}" created and selected.`);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesInfo?.configured && (!seriesInfo?.series_options || seriesInfo.series_options.length === 0)) {
      toast.error("Proforma Invoice cannot be recorded because no series is configured for this issuing office. Please setup or import the default series in Settings > Series Master.");
      return;
    }

    if (!selectedClientId) {
      toast.warning("Please select a billing client.");
      return;
    }

    const matchedClient = billingClients.find((c) => String(c.id) === String(selectedClientId));
    const finalPartyName = matchedClient ? (matchedClient.name || matchedClient.company_name) : partyName.trim();
    if (!finalPartyName) {
      toast.warning("Please select a billing client.");
      return;
    }

    const tot = parseFloat(totalAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    if (tot <= 0) {
      toast.warning("Estimated total amount must be greater than 0.");
      return;
    }

    const parsedSeriesId = selectedSeriesId && selectedSeriesId !== "default" ? parseInt(selectedSeriesId, 10) : undefined;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/vouchers", {
        method: "POST",
        body: JSON.stringify({
          voucher_type: "PROFORMA_INVOICE",
          voucher_number: activeNextNumber || undefined,
          series_id: parsedSeriesId,
          billing_client_id: parseInt(selectedClientId, 10),
          party_name: finalPartyName,
          party_gstin: matchedClient?.gstin || undefined,
          reference_number: refNumber.trim() || undefined,
          total_amount: tot,
          tax_amount: tax,
          net_amount: tot + tax,
          narration: narration.trim() || undefined,
        }),
      });
      setSuccessMessage("Proforma Invoice issued successfully!");
      setIsCreateOpen(false);
      setSelectedClientId("");
      setPartyName("");
      setRefNumber("");
      setTotalAmount("");
      setTaxAmount("0");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create proforma invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidVoucher = async () => {
    if (!voidVoucherId) return;
    if (voidReason.trim().length < 10) {
      toast.warning("Void reason must be at least 10 characters as per audit rules.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      setSuccessMessage(`Proforma Invoice #${voidVoucherId} marked as void.`);
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

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Proforma No.",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            {row.voucher_number}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{row.voucher_date}</span>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Billing Client",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-medium text-slate-900 dark:text-white">
            {row.party_name || "—"}
          </span>
          {row.reference_number && (
            <span className="block font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ref: {row.reference_number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "net_amount",
      header: "Estimated Total",
      align: "right",
      sortable: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-semibold text-slate-900 dark:text-white text-sm tabular-nums">
            ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            Tax: ₹{Number(row.tax_amount).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      key: "is_void",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.is_void ? "VOIDED" : "ACTIVE"}
          variant={row.is_void ? "danger" : "warning"}
        />
      ),
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "View Details",
      icon: <Eye className="w-3.5 h-3.5" />,
      variant: "default",
      onClick: (row) => setSelectedVoucher(row),
    },
    {
      label: "Void Proforma",
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
        title="Proforma Invoices"
        description="Generate provisional estimates and quotations prior to final freight dispatch."
        breadcrumbs={[
          { label: "Accounts", href: "/accounts" },
          { label: "Proforma Invoices" },
        ]}
        primaryAction={{
          label: "New Proforma Invoice",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsCreateOpen(true),
        }}
      />

      {errorMessage && (
        <div className="p-4 rounded-xl bg-danger-light border border-danger/20 text-danger text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-danger hover:opacity-80">×</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-success-light border border-success/20 text-success text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-success hover:opacity-80">×</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={Boolean(errorMessage)}
        errorMessage={errorMessage || undefined}
        onRetry={() => loadData(true)}
        searchPlaceholder="Search proforma by number or billing client..."
        searchColumn="party_name"
        actions={actions}
        emptyMessage="No proforma invoices created"
        emptySubtext="Create a proforma invoice to prepare a non-posting customer estimate."
        emptyAction={{ label: "New Proforma Invoice", onClick: () => setIsCreateOpen(true) }}
      />

      {/* Create Proforma Drawer */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New Proforma Invoice"
        description="Provisional commercial quotation without impact on General Ledger"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              form="proforma-invoice-form"
              disabled={!seriesInfo?.configured || isSubmitting}
              className="rounded-xl h-10 px-6 text-xs font-semibold cursor-pointer"
            >
              {isSubmitting ? "Generating..." : "Issue Proforma"}
            </Button>
          </div>
        }
      >
        <form id="proforma-invoice-form" onSubmit={handleCreateInvoice} className="space-y-4">
          {!seriesInfo?.configured && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Series Not Configured</span>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
                  No series is configured for Proforma Invoice in the active issuing office. Invoices cannot be created until a series is configured or imported.
                </p>
                <a
                  href="/settings/series-master"
                  className="inline-block mt-1.5 font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Setup Series in Master &rarr;
                </a>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-5 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1 flex items-center justify-between">
                  <span>
                    Select Series <span className="text-[#DC2626]">*</span>
                  </span>
                  {seriesOptions.length <= 1 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#17171B] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2B2E42]">
                      <Lock className="w-2.5 h-2.5 text-slate-500" /> Frozen
                    </span>
                  )}
                </label>
                <select
                  value={selectedSeriesId || (seriesOptions[0]?.value ?? "default")}
                  disabled={seriesOptions.length <= 1}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                  className={cn(
                    "w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all cursor-pointer",
                    seriesOptions.length <= 1 && "bg-slate-100 dark:bg-[#17171B] text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                  )}
                >
                  {seriesOptions.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {seriesOptions.length <= 1
                    ? "Single series configured for this branch (Frozen / Read-only)."
                    : "Select series to allocate sequence."}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1 flex items-center justify-between">
                  <span>
                    Proforma Number <span className="text-[#DC2626]">*</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#17171B] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#2B2E42]">
                    <Lock className="w-2.5 h-2.5 text-slate-500" /> Auto / Locked
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={activeNextNumber || ""}
                    placeholder={activeNextNumber || "Auto-allocated"}
                    className="w-full h-10 pl-3.5 pr-9 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-slate-100 dark:bg-[#17171B] text-slate-700 dark:text-slate-300 cursor-not-allowed select-none focus:outline-none shadow-2xs"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {activeNextNumber
                    ? `Allocated sequence number: ${activeNextNumber}`
                    : "Auto-allocated upon creation from active series."}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1 flex items-center justify-between">
                <span>
                  Billing Client <span className="text-[#DC2626]">*</span>
                </span>
                <span className="text-[11px] text-slate-500 font-normal">Compulsory</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={selectedClientId}
                    onChange={(val) => {
                      const strVal = String(val || "");
                      setSelectedClientId(strVal);
                      const matched = billingClients.find((c) => String(c.id) === strVal);
                      if (matched) {
                        setPartyName(matched.name || matched.company_name || "");
                      } else {
                        setPartyName("");
                      }
                    }}
                    options={billingClientOptions}
                    required
                    placeholder="Select Billing Client"
                    searchPlaceholder="Search client by name, code, GSTIN..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openMasterTab({
                      type: "billing_client",
                      title: "Add Billing Client",
                      onSuccess: handleBillingClientCreated,
                    })
                  }
                  title="Add Billing Client in new TMS tab"
                  aria-label="Add Billing Client"
                  className="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                Enquiry / Reference Number
              </label>
              <input
                type="text"
                placeholder="e.g. ENQ-4412"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/90 dark:border-[#22232E] bg-surface text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Estimated Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/90 dark:border-[#22232E] bg-surface text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                  Estimated Tax (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/90 dark:border-[#22232E] bg-surface text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                Quotation Terms & Narration
              </label>
              <textarea
                rows={3}
                placeholder="Proforma notes and validity period..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/90 dark:border-[#22232E] bg-surface text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </form>
      </EntityDrawer>

      {/* Details Drawer */}
      <EntityDrawer
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        title={`Proforma: ${selectedVoucher?.voucher_number || ""}`}
        description={`Commercial quotation overview • ${selectedVoucher?.voucher_date || ""}`}
        size="md"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedVoucher && (
          <div className="space-y-4">
            <div className="p-5 bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] space-y-3 text-xs shadow-2xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Billing Client</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedVoucher.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Quotation Date</span>
                <span className="text-slate-900 dark:text-white">{selectedVoucher.voucher_date}</span>
              </div>
              {selectedVoucher.reference_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Enquiry Reference</span>
                  <span className="font-mono text-slate-900 dark:text-white">{selectedVoucher.reference_number}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200/90 dark:border-[#22232E] pt-2 text-sm font-semibold">
                <span className="text-slate-900 dark:text-white">Net Estimated Amount</span>
                <span className="font-mono text-primary tabular-nums">
                  ₹{Number(selectedVoucher.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {selectedVoucher.narration && (
              <div className="p-4 bg-white dark:bg-[#12131A] border border-slate-200/90 dark:border-[#22232E] rounded-2xl text-xs shadow-2xs">
                <strong className="text-slate-900 dark:text-white block mb-1">Terms & Notes:</strong>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedVoucher.narration}</p>
              </div>
            )}

            {selectedVoucher.is_void && (
              <div className="p-3 bg-danger-light border border-danger/20 rounded-xl text-danger text-xs">
                <strong>Cancellation Reason:</strong> {selectedVoucher.void_reason}
              </div>
            )}
          </div>
        )}
      </EntityDrawer>

      {/* Void Confirm Dialog */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidVoucher}
        title={`Cancel Proforma #${voidVoucherId || ""}`}
        description="Marking a proforma invoice as void deactivates the quotation. This action cannot be undone."
        confirmText="Confirm Cancellation"
        variant="danger"
        isLoading={isVoiding}
        disabled={voidReason.trim().length < 10}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
            Reason for Cancellation * (Min 10 characters)
          </label>
          <textarea
            required
            rows={3}
            placeholder="Reason for cancelling this proforma..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200/90 dark:border-[#22232E] bg-surface text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-danger/20"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
