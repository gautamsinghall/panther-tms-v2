"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  X,
  FileText,
  Ban,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  IndianRupee,
  Lock,
  Printer,
  CreditCard,
  Building2,
  Calendar,
  Truck,
  Check,
  FileSpreadsheet,
  Info,
} from "lucide-react";
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
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getActiveOffice } from "@/lib/auth";

// Number to Words Converter for Indian Rupees
function numberToWords(num: number): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero Rupees Only";

  const inWords = (n: number): string => {
    let str = "";
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)] + " ";
        if (n % 10) str += a[n % 10];
      }
    }
    return str;
  };

  return `Rupees ${inWords(n).trim()} Only`;
}

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  narration?: string;
  is_reversal: boolean;
}

interface BillAllocationItem {
  id: number;
  voucher_id: number;
  invoice_id: number;
  allocated_amount: string | number;
  tds_amount: string | number;
  discount_amount: string | number;
  total_settled: string | number;
  adjustment_type: string;
  notes?: string;
  created_at: string;
  voucher?: {
    voucher_number?: string;
    voucher_date?: string;
  };
}

interface VoucherItem {
  id?: number;
  description: string;
  quantity?: number;
  rate?: number;
  tax_amount?: number;
  total_amount?: number;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  party_gstin?: string;
  party_type?: string;
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

  // Tally Prime Bill-Wise & Indian GST Fields
  due_date?: string;
  credit_period_days?: number;
  paid_amount?: string | number;
  balance_amount?: string | number;
  payment_status?: string; // UNPAID, PARTIALLY_PAID, PAID, VOID
  gst_treatment?: string; // FCM, RCM, EXEMPT
  place_of_supply?: string;
  cost_center?: string;
  tax_breakup?: {
    taxable_amount?: number;
    cgst_rate?: number;
    cgst_amount?: number;
    sgst_rate?: number;
    sgst_amount?: number;
    igst_rate?: number;
    igst_amount?: number;
    total_tax?: number;
    is_rcm?: boolean;
    is_intra_state?: boolean;
    supplier_state?: string;
    place_of_supply?: string;
  };
  bill_allocations?: BillAllocationItem[];
  items?: VoucherItem[];
  lr?: any;
  billing_client?: any;
  issuing_office?: any;
}

interface LRRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  status: string;
  chargeable_weight_mt?: number;
  package_count?: number;
  vehicle_number?: string;
  freight_amount?: number;
  loading_charges?: number;
  unloading_charges?: number;
  other_charges?: number;
  total_freight_amount?: number;
  consigner_name?: string;
  consignee_name?: string;
  billing_customer_name?: string;
  billing_customer_id?: number;
  destination_city?: string;
}

interface TaxCategoryRecord {
  id: number;
  name: string;
  igst_rate: string | number;
  cgst_rate?: string | number;
  sgst_rate?: string | number;
  is_rcm?: boolean;
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");

  // Create Invoice Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLrId, setSelectedLrId] = useState<string>("");
  const [selectedTaxCatId, setSelectedTaxCatId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Itemized Transport Charges & GST settings
  const [basicFreight, setBasicFreight] = useState<string>("0.00");
  const [loadingCharges, setLoadingCharges] = useState<string>("0.00");
  const [unloadingCharges, setUnloadingCharges] = useState<string>("0.00");
  const [detentionCharges, setDetentionCharges] = useState<string>("0.00");
  const [tollCharges, setTollCharges] = useState<string>("0.00");
  const [otherCharges, setOtherCharges] = useState<string>("0.00");
  const [discountAmount, setDiscountAmount] = useState<string>("0.00");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("Maharashtra");
  const [gstTreatment, setGstTreatment] = useState<string>("FCM");
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);

  interface SeriesRangeItem {
    id: number;
    document_type: string;
    series_name: string;
    prefix: string;
    suffix?: string;
    starting_number: number;
    end_number?: number;
    series_mode: string;
    is_default: boolean;
    total_count: number;
    used_count: number;
    available_count: number;
    display_label: string;
    available_options: { value: string; label: string; number: number }[];
  }

  // Series Master state
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [manualSeriesData, setManualSeriesData] = useState<{
    document_type: string;
    is_mandatory_manual: boolean;
    default_series_id: number | null;
    ranges: SeriesRangeItem[];
  } | null>(null);
  const [selectedRangeId, setSelectedRangeId] = useState<string>("");

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  // Record Payment Drawer state
  const [paymentInvoice, setPaymentInvoice] = useState<VoucherRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentTds, setPaymentTds] = useState<string>("0.00");
  const [paymentDiscount, setPaymentDiscount] = useState<string>("0.00");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "CASH">("BANK");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentNarration, setPaymentNarration] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Print Tax Invoice state
  const [printInvoice, setPrintInvoice] = useState<VoucherRecord | null>(null);
  const [isSyncingSchema, setIsSyncingSchema] = useState(false);

  const handleSyncSchema = async () => {
    setIsSyncingSchema(true);
    try {
      await apiClient("/api/v1/accounts/sync-tally-schema", { method: "POST" });
      toast.success("Database schema synchronized successfully.");
      await loadData();
    } catch (err: any) {
      toast.error("Schema synchronization failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncingSchema(false);
    }
  };

  const loadData = async (isRetry = false) => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";
      const [vouchersRes, lrsRes, taxesRes, seriesRes, manualRangesRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=TRANSPORT_INVOICE"),
        apiClient<LRRecord[]>("/api/v1/transport/lrs").catch(() => []),
        apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/TRANSPORT_INVOICE${officeParam}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/manual-ranges/TRANSPORT_INVOICE${officeParam}`).catch(() => null),
      ]);
      setData(Array.isArray(vouchersRes) ? vouchersRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
      setTaxCategories(Array.isArray(taxesRes) ? taxesRes : []);
      setSeriesInfo(seriesRes);
      setManualSeriesData(manualRangesRes);
      if (taxesRes.length > 0 && !selectedTaxCatId) {
        const g12 = taxesRes.find((t) => t.name.includes("12") || t.igst_rate === 12) || taxesRes[0];
        setSelectedTaxCatId(g12.id.toString());
      }
    } catch (err: any) {
      const msg = err.message || "";
      const isSchemaErr =
        msg.toLowerCase().includes("column") ||
        msg.toLowerCase().includes("does not exist") ||
        msg.toLowerCase().includes("programmingerror") ||
        msg.toLowerCase().includes("schema");
      if (isSchemaErr && !isRetry) {
        try {
          await apiClient("/api/v1/accounts/sync-tally-schema", { method: "POST" });
          return await loadData(true);
        } catch {
          // Fall through to error display
        }
      }
      setIsError(true);
      const cleanMsg =
        isSchemaErr || msg.includes("SELECT") || msg.includes("accounts_vouchers")
          ? "Database schema update required. Please click 'Sync Schema & Retry' below to ensure accounting tables are up to date."
          : msg || "Failed to load transport invoices.";
      setErrorMessage(cleanMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When an LR is selected in the creation drawer, populate transport charges
  useEffect(() => {
    if (!selectedLrId) return;
    const matched = lrs.find((l) => String(l.id) === String(selectedLrId));
    if (matched) {
      setBasicFreight(String(matched.freight_amount ?? matched.total_freight_amount ?? 0));
      setLoadingCharges(String(matched.loading_charges ?? 0));
      setUnloadingCharges(String(matched.unloading_charges ?? 0));
      setOtherCharges(String(matched.other_charges ?? 0));
      setDetentionCharges("0.00");
      setTollCharges("0.00");
      setDiscountAmount("0.00");
      if (matched.destination_city) {
        setPlaceOfSupply("Maharashtra");
      }
    }
  }, [selectedLrId, lrs]);

  const filteredData = useMemo(() => {
    return data.filter((v) => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const vNum = (v.voucher_number || "").toLowerCase();
        const pName = (v.party_name || "").toLowerCase();
        const lrNum = (v.lr_number || "").toLowerCase();
        const gstin = (v.party_gstin || "").toLowerCase();
        if (!vNum.includes(q) && !pName.includes(q) && !lrNum.includes(q) && !gstin.includes(q)) {
          return false;
        }
      }
      // Status filter
      if (statusFilter === "ACTIVE" && v.is_void) return false;
      if (statusFilter === "VOID" && !v.is_void) return false;
      if (statusFilter === "IRN_GENERATED" && v.irn_status !== "GENERATED") return false;

      // Payment Status filter
      if (paymentStatusFilter !== "ALL") {
        if ((v.payment_status || "UNPAID") !== paymentStatusFilter) return false;
      }
      return true;
    });
  }, [data, searchTerm, statusFilter, paymentStatusFilter]);

  const seriesOptions = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      return seriesInfo.series_options.map((s: any) => ({
        value: String(s.id),
        label: s.display_label || `${s.series_name} (${s.next_number_formatted})`,
      }));
    }
    if (manualSeriesData?.ranges && manualSeriesData.ranges.length > 0) {
      return manualSeriesData.ranges.map((r) => ({
        value: String(r.id),
        label: `${r.display_label}${r.is_default ? " ★ (Active)" : ""}`,
      }));
    }
    if (seriesInfo?.configured) {
      return [
        {
          value: "default",
          label: `Default Series (${seriesInfo.next_number_formatted})`,
        },
      ];
    }
    return [{ value: "default", label: "Default Transport Invoice Sequence" }];
  }, [seriesInfo, manualSeriesData]);

  const activeSeries = useMemo(() => {
    if (seriesInfo?.series_options && seriesInfo.series_options.length > 0) {
      if (selectedRangeId && selectedRangeId !== "default") {
        const found = seriesInfo.series_options.find((s: any) => String(s.id) === String(selectedRangeId));
        if (found) return found;
      }
      return seriesInfo.series_options[0];
    }
    return seriesInfo;
  }, [seriesInfo, selectedRangeId]);

  const activeNextNumber = activeSeries?.next_number_formatted || seriesInfo?.next_number_formatted || "";

  // Live calculation of preview in Create Drawer
  const previewCalculation = useMemo(() => {
    const bf = parseFloat(basicFreight) || 0;
    const lc = parseFloat(loadingCharges) || 0;
    const uc = parseFloat(unloadingCharges) || 0;
    const dc = parseFloat(detentionCharges) || 0;
    const tc = parseFloat(tollCharges) || 0;
    const oc = parseFloat(otherCharges) || 0;
    const disc = parseFloat(discountAmount) || 0;

    const taxable = Math.max(0, bf + lc + uc + dc + tc + oc - disc);
    const selectedTax = taxCategories.find((t) => String(t.id) === String(selectedTaxCatId));
    const rate = selectedTax ? parseFloat(String(selectedTax.igst_rate)) : 12;

    const isRcm = gstTreatment === "RCM";
    const isExempt = gstTreatment === "EXEMPT";
    const isIntra = placeOfSupply.toLowerCase().includes("maharashtra") || placeOfSupply === "27";

    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;
    let taxAmt = 0;
    let netReceivable = taxable;

    if (isRcm || isExempt) {
      taxAmt = 0;
      netReceivable = taxable;
    } else if (isIntra) {
      cgstRate = rate / 2;
      sgstRate = rate / 2;
      cgstAmt = Math.round(taxable * cgstRate) / 100;
      sgstAmt = Math.round(taxable * sgstRate) / 100;
      taxAmt = cgstAmt + sgstAmt;
      netReceivable = taxable + taxAmt;
    } else {
      igstRate = rate;
      igstAmt = Math.round(taxable * igstRate) / 100;
      taxAmt = igstAmt;
      netReceivable = taxable + taxAmt;
    }

    return {
      taxable,
      taxAmt,
      netReceivable,
      cgstRate,
      cgstAmt,
      sgstRate,
      sgstAmt,
      igstRate,
      igstAmt,
      isIntra,
      isRcm,
      isExempt,
    };
  }, [
    basicFreight,
    loadingCharges,
    unloadingCharges,
    detentionCharges,
    tollCharges,
    otherCharges,
    discountAmount,
    selectedTaxCatId,
    gstTreatment,
    placeOfSupply,
    taxCategories,
  ]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLrId) {
      toast.warning("Please select a valid LR.");
      return;
    }

    const effectiveNumber = activeNextNumber || invoiceNumber.trim();
    const parsedSeriesId = selectedRangeId && selectedRangeId !== "default" ? parseInt(selectedRangeId, 10) : undefined;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/transport-invoices", {
        method: "POST",
        body: JSON.stringify({
          lr_id: parseInt(selectedLrId, 10),
          invoice_number: effectiveNumber || undefined,
          voucher_number: effectiveNumber || undefined,
          series_id: parsedSeriesId,
          tax_category_id: selectedTaxCatId ? parseInt(selectedTaxCatId, 10) : undefined,
          basic_freight: parseFloat(basicFreight) || 0,
          loading_charges: parseFloat(loadingCharges) || 0,
          unloading_charges: parseFloat(unloadingCharges) || 0,
          detention_charges: parseFloat(detentionCharges) || 0,
          toll_charges: parseFloat(tollCharges) || 0,
          other_charges: parseFloat(otherCharges) || 0,
          discount_amount: parseFloat(discountAmount) || 0,
          place_of_supply: placeOfSupply,
          gst_treatment: gstTreatment,
          credit_period_days: creditPeriodDays,
          narration: narration || undefined,
        }),
      });
      toast.success("Transport invoice generated and posted to double-entry ledger successfully.");
      setSuccessMessage("Transport invoice generated and posted to financial ledger successfully.");
      setIsCreateOpen(false);
      setSelectedLrId("");
      setNarration("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create invoice.");
      setErrorMessage(err.message || "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPaymentDrawer = (invoice: VoucherRecord) => {
    setPaymentInvoice(invoice);
    const balance = parseFloat(String(invoice.balance_amount ?? invoice.net_amount));
    setPaymentAmount(String(balance > 0 ? balance : 0));
    setPaymentTds("0.00");
    setPaymentDiscount("0.00");
    setPaymentMode("BANK");
    setPaymentRef("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNarration(`Payment received for Transport Invoice ${invoice.voucher_number}`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    const amountVal = parseFloat(paymentAmount) || 0;
    const tdsVal = parseFloat(paymentTds) || 0;
    const discVal = parseFloat(paymentDiscount) || 0;

    if (amountVal <= 0 && tdsVal <= 0 && discVal <= 0) {
      toast.warning("Please enter a valid received amount or TDS/discount adjustment.");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await apiClient(`/api/v1/accounts/transport-invoices/${paymentInvoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: amountVal,
          tds_amount: tdsVal,
          discount_amount: discVal,
          payment_mode: paymentMode,
          reference_number: paymentRef || undefined,
          voucher_date: paymentDate,
          narration: paymentNarration || undefined,
        }),
      });
      toast.success(`Payment voucher recorded against ${paymentInvoice.voucher_number} successfully!`);
      setPaymentInvoice(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment voucher.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleVoidVoucher = async () => {
    if (!voidVoucherId || !voidReason.trim()) {
      toast.warning("Please provide an audit reason for voiding this invoice.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason }),
      });
      toast.success("Invoice voided successfully with automatic reversal entries posted.");
      setSuccessMessage("Invoice voided successfully with automatic reversal entries posted.");
      setIsVoidOpen(false);
      setVoidVoucherId(null);
      setVoidReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void invoice.");
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
      toast.success(`IRN Generated successfully for invoice ${voucher.voucher_number}!`);
      setSuccessMessage(`IRN Generated successfully for invoice ${voucher.voucher_number}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate E-Invoice IRN.");
      setErrorMessage(err.message || "Failed to generate E-Invoice IRN.");
    }
  };

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Invoice No & Date",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#172033] block text-xs sm:text-sm">
            {row.voucher_number}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
            <span>{formatDate(row.voucher_date)}</span>
            {row.due_date && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono">
                Due: {formatDate(row.due_date)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Consignment (LR)",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] border border-[#E4E7EC]">
            {row.lr_number || `LR #${row.lr_id}`}
          </span>
          {row.lr?.vehicle_number && (
            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
              Truck: {row.lr.vehicle_number}
            </span>
          )}
        </div>
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
          <div className="flex items-center gap-2 mt-0.5">
            {row.party_gstin && (
              <span className="font-mono text-[10px] text-slate-500 uppercase">
                GST: {row.party_gstin}
              </span>
            )}
            {row.place_of_supply && (
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                POS: {row.place_of_supply}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "gst_treatment",
      header: "GST Type",
      align: "center",
      cell: (row) => {
        const treat = row.gst_treatment || "FCM";
        if (treat === "RCM") {
          return (
            <Badge variant="warning" className="text-[10px] font-semibold">
              GTA RCM (Sec 9(3))
            </Badge>
          );
        }
        if (treat === "EXEMPT") {
          return (
            <Badge variant="neutral" className="text-[10px]">
              Exempt / Nil
            </Badge>
          );
        }
        return (
          <Badge variant="info" className="text-[10px] font-semibold">
            FCM (Forward Charge)
          </Badge>
        );
      },
    },
    {
      key: "net_amount",
      header: "Invoice Value (₹)",
      sortable: true,
      isNumeric: true,
      cell: (row) => (
        <div className="text-right">
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
      key: "balance_amount",
      header: "Outstanding Balance",
      sortable: true,
      isNumeric: true,
      cell: (row) => {
        const bal = parseFloat(String(row.balance_amount ?? row.net_amount));
        const paid = parseFloat(String(row.paid_amount ?? 0));
        return (
          <div className="text-right font-mono">
            <span
              className={cn(
                "font-bold block text-xs sm:text-sm",
                bal > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
              )}
            >
              {formatCurrency(bal)}
            </span>
            {paid > 0 && (
              <span className="text-[10px] text-slate-500 block">
                Paid: {formatCurrency(paid)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "payment_status",
      header: "Payment Status",
      align: "center",
      cell: (row) => {
        if (row.is_void) {
          return <Badge variant="danger">VOID</Badge>;
        }
        const status = row.payment_status || "UNPAID";
        if (status === "PAID") {
          return (
            <Badge variant="success" className="gap-1 font-semibold">
              <Check className="w-3 h-3 text-[#16A34A]" /> Settled
            </Badge>
          );
        }
        if (status === "PARTIALLY_PAID") {
          return (
            <Badge variant="info" className="gap-1 font-semibold">
              Partially Paid
            </Badge>
          );
        }
        return (
          <Badge variant="warning" className="gap-1 font-semibold">
            Unpaid
          </Badge>
        );
      },
    },
    {
      key: "irn_status",
      header: "E-Invoice (IRN)",
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
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "Print Tax Invoice",
      icon: <Printer className="w-3.5 h-3.5" />,
      onClick: (row) => setPrintInvoice(row),
    },
    {
      label: "Record Customer Payment",
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
      hidden: (row) => row.is_void || row.payment_status === "PAID",
      onClick: (row) => handleOpenPaymentDrawer(row),
    },
    {
      label: "View Ledger Entries & Settlements",
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
        if (parseFloat(String(row.paid_amount || 0)) > 0) {
          toast.error(
            `Cannot void ${row.voucher_number} because receipts totaling ₹${row.paid_amount} exist. Please void payments first.`
          );
          return;
        }
        setVoidVoucherId(row.id);
        setIsVoidOpen(true);
      },
    },
  ];

  const openCreateDrawer = () => {
    const firstOption = seriesInfo?.series_options?.[0];
    const initialRangeId = firstOption
      ? String(firstOption.id)
      : manualSeriesData?.ranges?.[0]
      ? String(manualSeriesData.ranges[0].id)
      : "";
    const initialNo =
      firstOption?.next_number_formatted ||
      seriesInfo?.next_number_formatted ||
      manualSeriesData?.ranges?.[0]?.available_options?.[0]?.value ||
      "";
    if (initialRangeId) {
      setSelectedRangeId(initialRangeId);
    }
    setInvoiceNumber(initialNo);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Invoices (Voucher Module)"
        description="Double-entry freight billing, GST calculation (FCM/RCM), bill-wise receivables, and TDS settlement."
        primaryAction={{
          label: "Create Invoice from LR",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Series Master Sequence Required:</span>
            <span>Document series must be configured in Series Master before Transport Invoices can be generated.</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings/series-master")}
            className="text-xs bg-white dark:bg-[#1A1823] text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 shrink-0"
          >
            Configure TI Series
          </Button>
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-card bg-[#FEF2F2] border border-[#FECDCA] text-[#DC2626] text-xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSyncingSchema}
              onClick={handleSyncSchema}
              className="text-xs h-7 px-2.5 bg-white text-[#DC2626] border-[#FECDCA] hover:bg-[#FEF2F2]"
            >
              {isSyncingSchema ? "Syncing Schema..." : "Sync Schema & Retry"}
            </Button>
            <button onClick={() => setErrorMessage(null)} className="text-[#DC2626] hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
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
        searchPlaceholder="Search invoice number, customer, LR, GSTIN..."
        filters={[
          {
            id: "status",
            label: "Voucher Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Vouchers", value: "ALL" },
              { label: "Active Invoices", value: "ACTIVE" },
              { label: "Voided Invoices", value: "VOID" },
              { label: "IRN Generated", value: "IRN_GENERATED" },
            ],
          },
          {
            id: "paymentStatus",
            label: "Bill-Wise Status",
            value: paymentStatusFilter,
            onChange: setPaymentStatusFilter,
            options: [
              { label: "All Payment States", value: "ALL" },
              { label: "Unpaid / Pending", value: "UNPAID" },
              { label: "Partially Paid", value: "PARTIALLY_PAID" },
              { label: "Fully Settled", value: "PAID" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
          setPaymentStatusFilter("ALL");
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
          label: "Create Invoice from LR",
          onClick: openCreateDrawer,
        }}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Create Invoice Drawer (Tally-Style Full Freight Breakdown & GST)      */}
      {/* ---------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Generate Transport Freight Invoice"
        description="Select an unbilled LR to calculate itemized freight charges, apply FCM/RCM GST, and post double-entry vouchers."
        width="xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-6">
          {/* Active Series & Numbering Header */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#101013] border border-slate-200 dark:border-[#303036] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Numbering Series Sequence
              </label>
              <select
                value={selectedRangeId || (seriesOptions[0]?.value ?? "default")}
                disabled={seriesOptions.length <= 1}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedRangeId(newId);
                  const matched = seriesInfo?.series_options?.find((s: any) => String(s.id) === String(newId));
                  if (matched && matched.next_number_formatted) {
                    setInvoiceNumber(matched.next_number_formatted);
                  }
                }}
                className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white dark:bg-[#101013] text-slate-900 dark:text-white border-slate-300 dark:border-[#303036]"
              >
                {seriesOptions.map((opt: any) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Invoice Number (Auto-Allocated)
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={activeNextNumber || invoiceNumber || ""}
                placeholder={activeNextNumber || "Auto-allocated"}
                className="w-full h-9 px-3 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-800 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Consignment LR Selection */}
          <div className="space-y-1.5 bg-white p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-900">
              Select Lorry Receipt (LR) to Bill <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              value={selectedLrId}
              onChange={(val) => setSelectedLrId(String(val))}
              options={lrs.map((lr) => ({
                value: String(lr.id),
                label: `${lr.lr_number} (${formatDate(lr.lr_date)}) — Client: ${
                  lr.billing_customer_name || lr.consigner_name || "General Client"
                } | Truck: ${lr.vehicle_number || "N/A"}`,
              }))}
              placeholder="Search unbilled Lorry Receipt..."
              searchPlaceholder="Type LR number, client name, truck..."
              onAddNew={() => router.push("/transport/lr-booking")}
              addNewLabel="+ Book New Lorry Receipt"
              required
            />
          </div>

          {/* Itemized Transport Freight Charges */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Transport Charges & Tariff Breakdown
              </h4>
              <span className="text-[11px] text-slate-500">Auto-populated from LR, editable</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Basic Freight (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={basicFreight}
                  onChange={(e) => setBasicFreight(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hamali / Loading (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={loadingCharges}
                  onChange={(e) => setLoadingCharges(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Unloading Charges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={unloadingCharges}
                  onChange={(e) => setUnloadingCharges(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Detention / Halting (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={detentionCharges}
                  onChange={(e) => setDetentionCharges(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Toll Charges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tollCharges}
                  onChange={(e) => setTollCharges(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Other Surcharges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-red-600 mb-1">
                  Less: Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs font-mono rounded-lg border border-red-300 bg-red-50/50 text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="bg-slate-100 p-2 rounded-lg flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                  Taxable Freight Total
                </span>
                <span className="text-sm font-bold font-mono text-slate-900">
                  {formatCurrency(previewCalculation.taxable)}
                </span>
              </div>
            </div>
          </div>

          {/* GST Configuration & Place of Supply */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                GST Treatment & Place of Supply (POS)
              </h4>
              <span className="text-[11px] text-slate-500">Sec 9(3) GTA & Sec 12(8) IGST Rules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  GST Treatment Mechanism
                </label>
                <select
                  value={gstTreatment}
                  onChange={(e) => setGstTreatment(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                >
                  <option value="FCM">FCM — Forward Charge (Transporter collects GST)</option>
                  <option value="RCM">RCM — Reverse Charge (Recipient pays GST under GTA)</option>
                  <option value="EXEMPT">EXEMPT / NIL RATED — Agri & Food Consignments</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Place of Supply (State)
                </label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Maharashtra, Gujarat, Karnataka"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Credit Terms (Days)
                </label>
                <input
                  type="number"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(parseInt(e.target.value, 10) || 30)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {gstTreatment === "FCM" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Applicable GST Tax Rate Category
                </label>
                <select
                  value={selectedTaxCatId}
                  onChange={(e) => setSelectedTaxCatId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                >
                  {taxCategories.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name} (IGST: {t.igst_rate}%, CGST: {Number(t.igst_rate) / 2}%, SGST:{" "}
                      {Number(t.igst_rate) / 2}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Double-Entry Ledger Posting Preview (Tally Prime Style) */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                Live Double-Entry Ledger Impact Preview
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Balanced: Dr. = Cr. {formatCurrency(previewCalculation.netReceivable)}
              </span>
            </div>

            <div className="bg-white rounded-lg border border-indigo-100 divide-y text-xs">
              {/* Debit Line */}
              <div className="p-2.5 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700">[Dr.]</span>
                  <span className="font-semibold text-slate-900">
                    Billing Client / Sundry Debtor A/c
                  </span>
                  <span className="text-[10px] text-slate-500">(Trade Receivable Asset)</span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatCurrency(previewCalculation.netReceivable)}
                </span>
              </div>

              {/* Credit Line 1: Revenue */}
              <div className="p-2.5 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2 pl-4">
                  <span className="font-bold text-emerald-700">[Cr.]</span>
                  <span className="text-slate-800">To Freight Revenue A/c</span>
                  <span className="text-[10px] text-slate-500">(Direct Operating Income)</span>
                </div>
                <span className="font-medium text-slate-800">
                  {formatCurrency(previewCalculation.taxable)}
                </span>
              </div>

              {/* Credit Line 2: GST Output or RCM Notice */}
              {previewCalculation.isRcm ? (
                <div className="p-2.5 pl-6 text-[11px] text-amber-800 bg-amber-50/50 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>GTA Reverse Charge:</strong> Service recipient is liable to pay tax to
                    Govt. No Output GST is collected or credited in transporter books.
                  </span>
                </div>
              ) : previewCalculation.isIntra ? (
                <>
                  <div className="p-2.5 flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center gap-2 pl-4">
                      <span className="font-bold text-emerald-700">[Cr.]</span>
                      <span className="text-slate-800">
                        To GST Output CGST A/c ({previewCalculation.cgstRate}%)
                      </span>
                    </div>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(previewCalculation.cgstAmt)}
                    </span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center gap-2 pl-4">
                      <span className="font-bold text-emerald-700">[Cr.]</span>
                      <span className="text-slate-800">
                        To GST Output SGST A/c ({previewCalculation.sgstRate}%)
                      </span>
                    </div>
                    <span className="font-medium text-slate-800">
                      {formatCurrency(previewCalculation.sgstAmt)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-2.5 flex items-center justify-between font-mono text-[11px]">
                  <div className="flex items-center gap-2 pl-4">
                    <span className="font-bold text-emerald-700">[Cr.]</span>
                    <span className="text-slate-800">
                      To GST Output IGST A/c ({previewCalculation.igstRate}%)
                    </span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(previewCalculation.igstAmt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#172033]">
              Voucher Narration / Audit Note
            </label>
            <textarea
              rows={2}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Freight billing for Steel Coils Mumbai to Pune via Corridor 4"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E4E7EC]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={isSubmitting || !selectedLrId}
            >
              Generate & Post Transport Invoice
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Record Customer Payment Drawer (Bill-Wise Settlement & Sec 194C TDS) */}
      {/* ---------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        title={`Record Customer Payment: ${paymentInvoice?.voucher_number}`}
        description="Allocate incoming funds, handle TDS deductions u/s 194C, and settle customer receivable atomically."
        width="lg"
      >
        {paymentInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-5">
            {/* Invoice Financial Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Billed Party</span>
                <strong className="text-slate-900 block truncate">{paymentInvoice.party_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Total Net Bill</span>
                <strong className="font-mono text-slate-900">
                  {formatCurrency(paymentInvoice.net_amount)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Current Outstanding</span>
                <strong className="font-mono text-amber-700 text-sm">
                  {formatCurrency(paymentInvoice.balance_amount ?? paymentInvoice.net_amount)}
                </strong>
              </div>
            </div>

            {/* Payment Inputs */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Received in Bank/Cash (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full h-10 px-3 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="BANK">Bank Account (NEFT / RTGS / IMPS / Cheque)</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>
              </div>

              {/* TDS Section with 1% and 2% helpers */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-900">
                    TDS Deducted by Client u/s 194C (₹)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-700">Quick TDS:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const tot = parseFloat(String(paymentInvoice.total_amount || 0));
                        setPaymentTds((Math.round(tot * 0.01 * 100) / 100).toFixed(2));
                      }}
                      className="px-2 py-0.5 text-[10px] font-mono bg-white border border-amber-300 rounded hover:bg-amber-100 text-amber-900"
                    >
                      1% (Individual/HUF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tot = parseFloat(String(paymentInvoice.total_amount || 0));
                        setPaymentTds((Math.round(tot * 0.02 * 100) / 100).toFixed(2));
                      }}
                      className="px-2 py-0.5 text-[10px] font-mono bg-white border border-amber-300 rounded hover:bg-amber-100 text-amber-900"
                    >
                      2% (Company)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={paymentTds}
                  onChange={(e) => setPaymentTds(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-amber-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="0.00"
                />
                <span className="text-[10px] text-amber-700 block">
                  Debits TDS Receivable A/c (Current Asset) so the customer receivable is credited in full.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount / Deductions Allowed (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentDiscount}
                    onChange={(e) => setPaymentDiscount(e.target.value)}
                    className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-300"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UTR / Cheque / Bank Ref No.
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. UTR-AXIS-998822"
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  value={paymentNarration}
                  onChange={(e) => setPaymentNarration(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Total Settlement Calculation Card */}
            {(() => {
              const rcvd = parseFloat(paymentAmount) || 0;
              const tds = parseFloat(paymentTds) || 0;
              const disc = parseFloat(paymentDiscount) || 0;
              const totalSettled = rcvd + tds + disc;
              const currentBal = parseFloat(
                String(paymentInvoice.balance_amount ?? paymentInvoice.net_amount)
              );
              const remainingBal = Math.max(0, currentBal - totalSettled);

              return (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-emerald-900">Total Settlement Value:</span>
                    <span className="font-mono text-sm text-emerald-800 font-bold">
                      {formatCurrency(totalSettled)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Remaining Balance after Voucher:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(remainingBal)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 text-[11px] text-emerald-800 font-mono">
                    Postings: Dr. {paymentMode} ({formatCurrency(rcvd)}) + Dr. TDS (
                    {formatCurrency(tds)}) + Dr. Disc ({formatCurrency(disc)}) = Cr. Debtor (
                    {formatCurrency(totalSettled)})
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentInvoice(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingPayment}
                disabled={isSubmittingPayment}
              >
                Post Payment Voucher
              </Button>
            </div>
          </form>
        )}
      </EntityDrawer>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. GST Tax Invoice Print Preview (Indian Transport Standard Format)     */}
      {/* ---------------------------------------------------------------------- */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  GST Tax Invoice & Consignment Freight Bill
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => window.print()}
                  className="gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPrintInvoice(null)}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div
              id="printable-tax-invoice"
              className="p-6 border border-slate-300 rounded-xl space-y-6 text-xs text-slate-800 bg-white"
            >
              {/* Header */}
              <div className="text-center border-b pb-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  ORIGINAL FOR RECIPIENT
                </span>
                <h1 className="text-lg font-black uppercase text-slate-900">
                  Panther Logistics & Transport Private Limited
                </h1>
                <p className="text-slate-600">
                  Registered Office: Corridor Road, Sector 18, Vashi, Navi Mumbai, Maharashtra - 400703
                </p>
                <div className="flex items-center justify-center gap-4 text-[11px] font-semibold font-mono text-slate-700">
                  <span>GSTIN: 27AAACP0123M1Z1</span>
                  <span>•</span>
                  <span>State: Maharashtra (Code: 27)</span>
                  <span>•</span>
                  <span>PAN: AAACP0123M</span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    TAX INVOICE DETAILS
                  </span>
                  <div className="mt-1 space-y-0.5">
                    <p>
                      <strong>Invoice No:</strong>{" "}
                      <span className="font-mono font-bold">{printInvoice.voucher_number}</span>
                    </p>
                    <p>
                      <strong>Date of Issue:</strong> {formatDate(printInvoice.voucher_date)}
                    </p>
                    <p>
                      <strong>Place of Supply:</strong>{" "}
                      {printInvoice.place_of_supply || "Maharashtra"}
                    </p>
                    <p>
                      <strong>Reverse Charge (RCM):</strong>{" "}
                      <span className="font-bold">
                        {printInvoice.gst_treatment === "RCM" ? "YES (Sec 9(3))" : "NO"}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    TRANSPORT & CONSIGNMENT DETAILS
                  </span>
                  <div className="mt-1 space-y-0.5">
                    <p>
                      <strong>Lorry Receipt (LR) No:</strong>{" "}
                      <span className="font-mono">{printInvoice.lr_number || printInvoice.lr?.lr_number || "-"}</span>
                    </p>
                    <p>
                      <strong>Vehicle / Truck No:</strong>{" "}
                      <span className="font-mono font-bold">{printInvoice.lr?.vehicle_number || "MH-04-GP-1234"}</span>
                    </p>
                    <p>
                      <strong>Service Accounting Code (SAC):</strong>{" "}
                      <span className="font-mono font-bold">9965 (Goods Transport Agency)</span>
                    </p>
                    <p>
                      <strong>Payment Terms:</strong> {printInvoice.credit_period_days || 30} Days
                    </p>
                  </div>
                </div>
              </div>

              {/* Billed To / Client Party */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4 bg-slate-50 p-3 rounded-lg">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    BILLED TO (RECIPIENT)
                  </span>
                  <p className="font-bold text-sm text-slate-900 mt-1">
                    {printInvoice.party_name || "General Client"}
                  </p>
                  <p className="font-mono font-semibold text-slate-700 mt-0.5">
                    GSTIN: {printInvoice.party_gstin || "27AABCT1332L1Z4"}
                  </p>
                  <p className="text-slate-600">
                    State: {printInvoice.place_of_supply || "Maharashtra"}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">
                    CONSIGNMENT MOVEMENT
                  </span>
                  <p className="mt-1 text-slate-700">
                    <strong>Consignor:</strong> {printInvoice.lr?.consigner_name || "Direct Shipper"}
                  </p>
                  <p className="text-slate-700">
                    <strong>Consignee:</strong> {printInvoice.lr?.consignee_name || "Direct Delivery"}
                  </p>
                  <p className="text-slate-700">
                    <strong>Destination:</strong> {printInvoice.lr?.destination_city || "Maharashtra Hub"}
                  </p>
                </div>
              </div>

              {/* Itemized Freight Table */}
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="p-2 border-r border-slate-300 text-center w-10">Sr.</th>
                    <th className="p-2 border-r border-slate-300 text-left">Description of Service</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">SAC Code</th>
                    <th className="p-2 border-r border-slate-300 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 border-r text-center font-mono">1</td>
                    <td className="p-2 border-r">
                      Freight Charges for LR {printInvoice.lr_number || printInvoice.lr?.lr_number}
                    </td>
                    <td className="p-2 border-r text-center font-mono">9965</td>
                    <td className="p-2 border-r text-right font-mono font-semibold">
                      {formatCurrency(printInvoice.total_amount)}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-300 font-semibold bg-slate-50">
                    <td colSpan={3} className="p-2 text-right border-r">
                      Total Taxable Freight Value:
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {formatCurrency(printInvoice.total_amount)}
                    </td>
                  </tr>
                  {printInvoice.gst_treatment === "RCM" ? (
                    <tr className="border-t border-slate-300 bg-amber-50/70 text-amber-900">
                      <td colSpan={4} className="p-2 text-center text-[11px] font-semibold">
                        TAX PAYABLE UNDER REVERSE CHARGE: YES (Recipient is liable to discharge GST under
                        Section 9(3) of the CGST Act 2017)
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t border-slate-300 font-semibold bg-slate-50">
                      <td colSpan={3} className="p-2 text-right border-r">
                        Output GST Total:
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatCurrency(printInvoice.tax_amount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-400 font-bold bg-slate-100 text-sm">
                    <td colSpan={3} className="p-2.5 text-right border-r uppercase text-slate-900">
                      Total Invoice Amount (INR):
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      {formatCurrency(printInvoice.net_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Amount in Words */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Amount Chargeable (in words):
                </span>
                <span className="font-bold text-slate-800 text-xs">
                  {numberToWords(parseFloat(String(printInvoice.net_amount)))}
                </span>
              </div>

              {/* Bank & Payment Remittance Details */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    BANK REMITTANCE DETAILS (RTGS / NEFT)
                  </span>
                  <p>
                    <strong>Bank Name:</strong> HDFC Bank Limited
                  </p>
                  <p>
                    <strong>Account Name:</strong> Panther Logistics & Transport Pvt Ltd
                  </p>
                  <p>
                    <strong>Account No:</strong> <span className="font-mono font-bold">50200012345678</span>
                  </p>
                  <p>
                    <strong>IFSC Code:</strong> <span className="font-mono font-bold">HDFC0000240</span>
                  </p>
                  <p>
                    <strong>Branch:</strong> Vashi Sector 17, Navi Mumbai
                  </p>
                </div>
                <div className="flex flex-col justify-between text-right p-3">
                  <span className="text-slate-500 text-[10px]">
                    For Panther Logistics & Transport Pvt Ltd
                  </span>
                  <div className="h-12 flex items-center justify-end">
                    <span className="text-slate-400 font-mono text-[10px] italic">
                      [ Digitally Signed & Authorized ]
                    </span>
                  </div>
                  <span className="font-bold text-slate-800">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. View Ledger Entries & Bill Allocations Drawer                         */}
      {/* ---------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={!!selectedVoucher}
        onClose={() => setSelectedVoucher(null)}
        title={`Ledger & Bill Allocations: ${selectedVoucher?.voucher_number}`}
        description="Double-entry journal postings and bill-by-bill customer settlement allocations."
        width="xl"
      >
        {selectedVoucher && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-card border border-[#E4E7EC]">
              <div>
                <span className="text-[11px] text-[#667085] block">Party</span>
                <span className="text-xs font-semibold text-[#172033]">
                  {selectedVoucher.party_name || "-"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#667085] block">Date</span>
                <span className="text-xs font-semibold text-[#172033]">
                  {formatDate(selectedVoucher.voucher_date)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#667085] block">Outstanding</span>
                <span className="text-xs font-mono font-bold text-amber-700">
                  {formatCurrency(selectedVoucher.balance_amount ?? selectedVoucher.net_amount)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-[#667085] block">Net Total</span>
                <span className="text-xs font-mono font-bold text-[#172033]">
                  {formatCurrency(selectedVoucher.net_amount)}
                </span>
              </div>
            </div>

            {/* Bill Allocation Settlement History */}
            {selectedVoucher.bill_allocations && selectedVoucher.bill_allocations.length > 0 && (
              <div className="bg-white rounded-card border border-[#E4E7EC] overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-[#E4E7EC] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Bill-by-Bill Payment Allocations
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total Settled:{" "}
                    {formatCurrency(
                      selectedVoucher.bill_allocations.reduce(
                        (acc, b) => acc + parseFloat(String(b.total_settled || 0)),
                        0
                      )
                    )}
                  </span>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F7F8FA] border-b border-[#E4E7EC] text-[11px] font-semibold uppercase text-[#667085]">
                    <tr>
                      <th className="py-2 px-3">Receipt Ref</th>
                      <th className="py-2 px-3 text-right">Received (₹)</th>
                      <th className="py-2 px-3 text-right">TDS u/s 194C (₹)</th>
                      <th className="py-2 px-3 text-right">Discount (₹)</th>
                      <th className="py-2 px-3 text-right">Total Settled (₹)</th>
                      <th className="py-2 px-3">Settlement Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E7EC]">
                    {selectedVoucher.bill_allocations.map((alloc) => (
                      <tr key={alloc.id} className="hover:bg-slate-50 font-mono">
                        <td className="py-2 px-3 font-semibold text-indigo-700">
                          {alloc.notes || `Receipt #${alloc.voucher_id}`}
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(alloc.allocated_amount)}</td>
                        <td className="py-2 px-3 text-right text-amber-700">
                          {formatCurrency(alloc.tds_amount)}
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(alloc.discount_amount)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {formatCurrency(alloc.total_settled)}
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-500">
                          {formatDate(alloc.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Double-Entry General Ledger Postings */}
            <div className="bg-white rounded-card border border-[#E4E7EC] overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-[#E4E7EC]">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Balanced Double-Entry Journal Postings
                </h4>
              </div>
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
                    <tr
                      key={entry.id}
                      className={cn(
                        "hover:bg-[#F7F8FA]",
                        entry.is_reversal && "bg-red-50/50 text-red-900"
                      )}
                    >
                      <td className="py-2.5 px-4 font-medium">
                        {entry.account_name || `Account #${entry.account_id}`}
                        {entry.is_reversal && (
                          <span className="ml-2 text-[10px] text-red-600 font-bold">[REVERSAL]</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {parseFloat(String(entry.debit_amount)) > 0
                          ? formatCurrency(entry.debit_amount)
                          : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {parseFloat(String(entry.credit_amount)) > 0
                          ? formatCurrency(entry.credit_amount)
                          : "-"}
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

      {/* ---------------------------------------------------------------------- */}
      {/* 5. Void Invoice Dialog                                                 */}
      {/* ---------------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setVoidReason("");
        }}
        onConfirm={handleVoidVoucher}
        title="Void Freight Transport Invoice"
        consequence="Voiding this invoice will post automatic contra-reversal ledger entries, restore the linked LR to unbilled status, and maintain a permanent audit trail. Please provide a formal reason."
        confirmLabel="Confirm & Void Invoice"
        isLoading={isVoiding}
      />
    </div>
  );
}
