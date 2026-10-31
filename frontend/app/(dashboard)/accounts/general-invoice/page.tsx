"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Receipt,
  Ban,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  Lock,
  Printer,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  Trash2,
  Layers,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
  charge_head_id?: number;
  description: string;
  hsn_sac?: string;
  quantity?: number;
  rate?: number;
  discount_amount?: number;
  tax_category_id?: number;
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
  reference_number?: string;
  reference_date?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  paid_amount?: string | number;
  balance_amount?: string | number;
  payment_status?: string;
  gst_treatment?: string;
  place_of_supply?: string;
  cost_center?: string;
  tax_breakup?: any;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  irn?: string;
  irn_status?: string;
  due_date?: string;
  credit_period_days?: number;
  billing_client_id?: number;
  ledger_entries: LedgerEntry[];
  items?: VoucherItem[];
  bill_allocations?: BillAllocationItem[];
  created_at: string;
}

interface BillingClientRecord {
  id: number;
  name: string;
  code?: string;
  company_name?: string;
  gstin?: string;
  state?: string;
  city?: string;
  credit_period_days?: number;
  account_id?: number;
}

interface TaxCategoryRecord {
  id: number;
  name: string;
  igst_rate: string | number;
  cgst_rate?: string | number;
  sgst_rate?: string | number;
  is_rcm?: boolean;
}

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

interface ServiceLineInput {
  id: string;
  description: string;
  hsn_sac: string;
  quantity: string;
  rate: string;
  discount: string;
  tax_category_id: string;
}

const INDIAN_STATES = [
  "Maharashtra",
  "Gujarat",
  "Delhi",
  "Karnataka",
  "Tamil Nadu",
  "Uttar Pradesh",
  "Rajasthan",
  "Madhya Pradesh",
  "Haryana",
  "West Bengal",
  "Punjab",
  "Telangana",
  "Andhra Pradesh",
  "Bihar",
  "Odisha",
  "Chhattisgarh",
  "Jharkhand",
  "Assam",
  "Uttarakhand",
  "Himachal Pradesh",
  "Goa",
  "Jammu & Kashmir",
  "Puducherry",
  "Chandigarh",
];

export default function GeneralInvoicePage() {
  const router = useRouter();
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [clients, setClients] = useState<BillingClientRecord[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncingSchema, setIsSyncingSchema] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");

  // Create General Invoice Drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [customPartyName, setCustomPartyName] = useState<string>("");
  const [customPartyGstin, setCustomPartyGstin] = useState<string>("");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("Maharashtra");
  const [gstTreatment, setGstTreatment] = useState<string>("FCM");
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);
  const [refNumber, setRefNumber] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [narration, setNarration] = useState("");
  const [incomeHead, setIncomeHead] = useState<string>("ACC_GENERAL_SALES_REV");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Service Line Items in Creation Drawer
  const [serviceLines, setServiceLines] = useState<ServiceLineInput[]>([
    {
      id: "1",
      description: "Warehousing & Storage Services",
      hsn_sac: "996729",
      quantity: "1.00",
      rate: "0.00",
      discount: "0.00",
      tax_category_id: "",
    },
  ]);

  // Series Master state
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [manualSeriesData, setManualSeriesData] = useState<{
    document_type: string;
    is_mandatory_manual: boolean;
    default_series_id: number | null;
    ranges: SeriesRangeItem[];
  } | null>(null);
  const [selectedRangeId, setSelectedRangeId] = useState<string>("");
  const [voucherNumber, setVoucherNumber] = useState("");

  // Void Dialog state
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Ledger Drawer state
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);

  // Record Customer Payment Drawer state
  const [paymentInvoice, setPaymentInvoice] = useState<VoucherRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentTds, setPaymentTds] = useState<string>("0.00");
  const [paymentTdsSec, setPaymentTdsSec] = useState<string>("194C");
  const [paymentDiscount, setPaymentDiscount] = useState<string>("0.00");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "CASH">("BANK");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentNarration, setPaymentNarration] = useState<string>("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Print Tax Invoice state
  const [printInvoice, setPrintInvoice] = useState<VoucherRecord | null>(null);

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
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";
      const [vouchersRes, clientsRes, taxesRes, sInfo, manualRangesRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=GENERAL_INVOICE"),
        apiClient<BillingClientRecord[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/GENERAL_INVOICE${officeParam}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/manual-ranges/GENERAL_INVOICE${officeParam}`).catch(() => null),
      ]);
      setData(Array.isArray(vouchersRes) ? vouchersRes : []);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setTaxCategories(Array.isArray(taxesRes) ? taxesRes : []);
      setSeriesInfo(sInfo);
      setManualSeriesData(manualRangesRes);

      // Set default tax category (18% GST standard)
      if (taxesRes.length > 0) {
        const g18 = taxesRes.find((t) => t.name.includes("18") || Number(t.igst_rate) === 18) || taxesRes[0];
        setServiceLines((prev) =>
          prev.map((l) => (l.tax_category_id ? l : { ...l, tax_category_id: g18.id.toString() }))
        );
      }
    } catch (err: any) {
      const msg = err.message || "";
      const isSchemaErr =
        msg.toLowerCase().includes("column") ||
        msg.toLowerCase().includes("does not exist") ||
        msg.toLowerCase().includes("programmingerror");
      if (isSchemaErr && !isRetry) {
        try {
          await apiClient("/api/v1/accounts/sync-tally-schema", { method: "POST" });
          return await loadData(true);
        } catch {
          // fall through
        }
      }
      const cleanMsg =
        isSchemaErr || msg.includes("SELECT") || msg.includes("accounts_vouchers")
          ? "Database schema update required. Please click 'Sync Schema & Retry' to update accounting tables."
          : msg || "Failed to load general invoices.";
      setErrorMessage(cleanMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When a billing client is selected, auto-populate GSTIN, POS, and credit days
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => String(c.id) === String(selectedClientId));
    if (client) {
      if (client.gstin) setCustomPartyGstin(client.gstin);
      if (client.state) setPlaceOfSupply(client.state);
      if (client.credit_period_days) setCreditPeriodDays(client.credit_period_days);
    }
  }, [selectedClientId, clients]);

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
    return [{ value: "default", label: "Default General Invoice Sequence" }];
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

  // Dynamic calculations for line items & taxes
  const calculationSummary = useMemo(() => {
    const supplierState = "Maharashtra"; // Default office state
    const sClean = supplierState.toLowerCase().replace(/[^a-z]/g, "");
    const rClean = (placeOfSupply || "Maharashtra").toLowerCase().replace(/[^a-z]/g, "");
    const isIntra = sClean === rClean;
    const isRcm = gstTreatment === "RCM";
    const isExempt = gstTreatment === "EXEMPT" || gstTreatment === "NIL_RATED";

    let taxableTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const computedLines = serviceLines.map((line) => {
      const q = parseFloat(line.quantity) || 0;
      const r = parseFloat(line.rate) || 0;
      const d = parseFloat(line.discount) || 0;
      const lineTaxable = Math.max(0, q * r - d);

      const tc = taxCategories.find((t) => String(t.id) === String(line.tax_category_id));
      const rate = tc ? parseFloat(String(tc.igst_rate)) : 0;

      let lineTax = 0;
      let lineCgst = 0;
      let lineSgst = 0;
      let lineIgst = 0;

      if (!isRcm && !isExempt && rate > 0) {
        if (isIntra) {
          lineCgst = Math.round(((lineTaxable * (rate / 2)) / 100) * 100) / 100;
          lineSgst = Math.round(((lineTaxable * (rate / 2)) / 100) * 100) / 100;
          lineTax = lineCgst + lineSgst;
          cgstTotal += lineCgst;
          sgstTotal += lineSgst;
        } else {
          lineIgst = Math.round(((lineTaxable * rate) / 100) * 100) / 100;
          lineTax = lineIgst;
          igstTotal += lineIgst;
        }
      }

      taxableTotal += lineTaxable;
      return {
        ...line,
        lineTaxable,
        lineTax,
        lineTotal: lineTaxable + lineTax,
      };
    });

    const taxTotal = cgstTotal + sgstTotal + igstTotal;
    const netReceivable = taxableTotal + taxTotal;

    return {
      computedLines,
      taxableTotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxTotal,
      netReceivable,
      isIntra,
      isRcm,
      isExempt,
    };
  }, [serviceLines, taxCategories, placeOfSupply, gstTreatment]);

  // Add / remove line items
  const handleAddLine = () => {
    const g18 = taxCategories.find((t) => t.name.includes("18") || Number(t.igst_rate) === 18) || taxCategories[0];
    setServiceLines((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: "",
        hsn_sac: "9967",
        quantity: "1.00",
        rate: "0.00",
        discount: "0.00",
        tax_category_id: g18 ? g18.id.toString() : "",
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    if (serviceLines.length <= 1) {
      toast.warning("At least one invoice line item is required.");
      return;
    }
    setServiceLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleLineChange = (id: string, field: keyof ServiceLineInput, value: string) => {
    setServiceLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  // Create General Invoice Submit Handler
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculationSummary.taxableTotal <= 0) {
      toast.warning("Invoice taxable amount must be greater than zero.");
      return;
    }

    const client = clients.find((c) => String(c.id) === String(selectedClientId));
    const finalPartyName = client ? client.name : customPartyName.trim();
    if (!finalPartyName) {
      toast.warning("Please select a billing client or enter customer name.");
      return;
    }

    const effectiveNumber = activeNextNumber || voucherNumber.trim();
    const parsedSeriesId = selectedRangeId && selectedRangeId !== "default" ? parseInt(selectedRangeId, 10) : undefined;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient("/api/v1/accounts/general-invoices", {
        method: "POST",
        body: JSON.stringify({
          voucher_number: effectiveNumber || undefined,
          invoice_number: effectiveNumber || undefined,
          series_id: parsedSeriesId,
          billing_client_id: selectedClientId ? parseInt(selectedClientId, 10) : undefined,
          party_name: finalPartyName,
          party_gstin: customPartyGstin.trim() || undefined,
          place_of_supply: placeOfSupply,
          gst_treatment: gstTreatment,
          voucher_date: invoiceDate,
          credit_period_days: creditPeriodDays,
          reference_number: refNumber.trim() || undefined,
          cost_center: costCenter.trim() || undefined,
          narration: narration.trim() || undefined,
          items: serviceLines.map((l) => ({
            description: l.description.trim() || "Business Service",
            hsn_sac: l.hsn_sac.trim() || "9967",
            quantity: parseFloat(l.quantity) || 1.0,
            rate: parseFloat(l.rate) || 0.0,
            discount_amount: parseFloat(l.discount) || 0.0,
            tax_category_id: l.tax_category_id ? parseInt(l.tax_category_id, 10) : undefined,
          })),
        }),
      });
      toast.success("General Invoice posted successfully with double-entry ledgers!");
      setSuccessMessage("General Invoice generated and balanced in customer & revenue ledgers.");
      setIsCreateOpen(false);
      setSelectedClientId("");
      setCustomPartyName("");
      setCustomPartyGstin("");
      setRefNumber("");
      setCostCenter("");
      setNarration("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create general invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void General Invoice Handler
  const handleVoidVoucher = async () => {
    if (!voidVoucherId) return;
    if (voidReason.trim().length < 10) {
      toast.warning("Void reason must be at least 10 characters as per statutory audit rules.");
      return;
    }

    setIsVoiding(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      toast.success(`Invoice #${voidVoucherId} voided with automated reversing ledger entries.`);
      setSuccessMessage(`Invoice #${voidVoucherId} voided and reversing entries posted successfully.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to void invoice.");
    } finally {
      setIsVoiding(false);
    }
  };

  // E-Invoicing / IRN Generation Handler
  const handleGenerateIRN = async (voucher: VoucherRecord) => {
    const ok = await confirmModal({
      title: "Generate Statutory E-Invoice IRN",
      description: `Transmit invoice ${voucher.voucher_number} to Invoice Registration Portal (IRP) and generate IRN & signed QR code?`,
      confirmText: "Generate IRN",
      variant: "primary",
    });
    if (!ok) return;
    try {
      await apiClient("/api/v1/einvoicing/generate-irn", {
        method: "POST",
        body: JSON.stringify({ voucher_id: voucher.id }),
      });
      toast.success(`IRN successfully generated for ${voucher.voucher_number}!`);
      setSuccessMessage(`Statutory IRN generated and recorded for ${voucher.voucher_number}.`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate IRN.");
    }
  };

  // Open Payment Drawer
  const handleOpenPaymentDrawer = (invoice: VoucherRecord) => {
    setPaymentInvoice(invoice);
    const bal = invoice.balance_amount !== undefined ? Number(invoice.balance_amount) : Number(invoice.net_amount);
    setPaymentAmount(bal.toFixed(2));
    setPaymentTds("0.00");
    setPaymentTdsSec("194C");
    setPaymentDiscount("0.00");
    setPaymentRef("");
    setPaymentNarration(`Payment receipt against Invoice ${invoice.voucher_number}`);
  };

  // Record Payment Submit Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;

    const amt = parseFloat(paymentAmount) || 0;
    const tds = parseFloat(paymentTds) || 0;
    const disc = parseFloat(paymentDiscount) || 0;
    const totalSettling = amt + tds + disc;

    if (amt <= 0 && tds <= 0 && disc <= 0) {
      toast.warning("Payment amount, TDS, or discount must be greater than zero.");
      return;
    }

    const currentBal = Number(paymentInvoice.balance_amount ?? paymentInvoice.net_amount);
    if (totalSettling > currentBal + 0.01) {
      toast.error(`Total settlement (₹${totalSettling.toFixed(2)}) exceeds outstanding balance (₹${currentBal.toFixed(2)}).`);
      return;
    }

    setIsSubmittingPayment(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/general-invoices/${paymentInvoice.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: amt,
          tds_amount: tds,
          tds_section: paymentTdsSec,
          discount_amount: disc,
          payment_mode: paymentMode,
          voucher_date: paymentDate,
          reference_number: paymentRef || undefined,
          narration: paymentNarration || undefined,
        }),
      });
      toast.success(`Receipt voucher posted! Outstanding on ${paymentInvoice.voucher_number} updated.`);
      setSuccessMessage(`Payment recorded and allocated against invoice ${paymentInvoice.voucher_number}.`);
      setPaymentInvoice(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record payment.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((v) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const vNum = (v.voucher_number || "").toLowerCase();
        const pName = (v.party_name || "").toLowerCase();
        const refNo = (v.reference_number || "").toLowerCase();
        const gstin = (v.party_gstin || "").toLowerCase();
        if (!vNum.includes(q) && !pName.includes(q) && !refNo.includes(q) && !gstin.includes(q)) {
          return false;
        }
      }
      if (statusFilter === "ACTIVE" && v.is_void) return false;
      if (statusFilter === "VOID" && !v.is_void) return false;
      if (statusFilter === "IRN_GENERATED" && v.irn_status !== "GENERATED") return false;

      if (paymentStatusFilter !== "ALL") {
        if ((v.payment_status || "UNPAID") !== paymentStatusFilter) return false;
      }
      return true;
    });
  }, [data, searchTerm, statusFilter, paymentStatusFilter]);

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Invoice No. & Date",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-text-primary text-sm block">
            {row.voucher_number}
          </span>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
            <span>{formatDate(row.voucher_date)}</span>
            {row.due_date && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0.2 rounded font-mono">
                Due: {formatDate(row.due_date)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Customer / Debtor",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-text-primary block text-xs sm:text-sm">
            {row.party_name || "Direct Customer"}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            {row.party_gstin && (
              <span className="font-mono text-[10px] text-text-muted uppercase">
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
      key: "reference_number",
      header: "PO / Ref & Cost Center",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs text-text-primary font-medium block">
            {row.reference_number || "—"}
          </span>
          {row.cost_center && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
              CC: {row.cost_center}
            </span>
          )}
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
          return <Badge variant="warning" className="text-[10px] font-semibold">GTA RCM (Sec 9(3))</Badge>;
        }
        if (treat === "EXEMPT" || treat === "NIL_RATED") {
          return <Badge variant="neutral" className="text-[10px]">Exempt / Nil</Badge>;
        }
        return <Badge variant="info" className="text-[10px] font-semibold">FCM (Forward Charge)</Badge>;
      },
    },
    {
      key: "net_amount",
      header: "Invoice Value (₹)",
      align: "right",
      sortable: true,
      isNumeric: true,
      cell: (row) => (
        <div className="text-right">
          <span className="font-mono font-bold text-text-primary block text-xs sm:text-sm">
            {formatCurrency(row.net_amount)}
          </span>
          <span className="text-[11px] font-mono text-text-muted">
            Tax: {formatCurrency(row.tax_amount)}
          </span>
        </div>
      ),
    },
    {
      key: "balance_amount",
      header: "Outstanding Balance",
      align: "right",
      sortable: true,
      isNumeric: true,
      cell: (row) => {
        const bal = parseFloat(String(row.balance_amount ?? row.net_amount));
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
            {Number(row.paid_amount || 0) > 0 && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                Paid: {formatCurrency(row.paid_amount || 0)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "payment_status",
      header: "Status",
      align: "center",
      cell: (row) => {
        if (row.is_void) {
          return <Badge variant="danger" className="font-bold">VOIDED</Badge>;
        }
        const pStatus = row.payment_status || "UNPAID";
        if (pStatus === "PAID") return <Badge variant="success">PAID</Badge>;
        if (pStatus === "PARTIALLY_PAID") return <Badge variant="warning">PARTIAL</Badge>;
        return <Badge variant="neutral">PENDING</Badge>;
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
                <ShieldCheck className="w-3 h-3 text-[#16A34A]" /> IRN Active
              </Badge>
              {row.irn && (
                <span className="font-mono text-[10px] text-text-muted mt-0.5 truncate max-w-[90px]" title={row.irn}>
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
            `Cannot void ${row.voucher_number} because receipts totaling ₹${row.paid_amount} exist against it. Please void the receipt vouchers first.`
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
    setVoucherNumber(initialNo);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Invoices"
        description="Tally Prime double-entry non-freight billing, itemized services, GST calculation (FCM/RCM/Exempt), and bill-wise receivables."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts", href: "/accounts" },
          { label: "General Invoices" },
        ]}
        primaryAction={{
          label: "New General Invoice",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {/* Series Master Check Alert */}
      {seriesInfo && !seriesInfo.configured && (!manualSeriesData || manualSeriesData.ranges.length === 0) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠️ Series Sequence Required:</span>
            <span>Manual or automatic series must be configured in Series Master before General Invoices can be recorded.</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/settings/series-master")}
            className="text-xs bg-white dark:bg-[#1A1823] text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 shrink-0"
          >
            Configure GI Series
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
        <div className="p-3.5 rounded-card bg-[#ECFDF3] border border-[#A6F4C5] text-[#16A34A] text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[#16A34A] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FilterBar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search invoice number, customer, PO reference, GSTIN..."
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        onRetry={loadData}
        actions={actions}
        searchable={false}
        emptyMessage="No general invoices found"
        emptySubtext="Record a non-freight service invoice to post revenue, GST output, and debtor balances."
        emptyAction={{
          label: "New General Invoice",
          onClick: openCreateDrawer,
        }}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* 1. Create General Invoice Drawer                                       */}
      {/* ---------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="New General Sales & Service Invoice"
        description="Double-entry non-freight billing with SAC codes, GST calculation, and ledger impact preview"
        size="xl"
        footer={
          <FormActionBar
            onCancel={() => setIsCreateOpen(false)}
            submitForm="general-invoice-form"
            submitLabel={
              !seriesInfo?.configured && seriesOptions.length === 0
                ? "Series Config Required"
                : "Post & Generate Invoice"
            }
            isSubmitting={isSubmitting}
            submitDisabled={!seriesInfo?.configured && seriesOptions.length === 0}
            summary={
              <div
                className="grid grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs"
                aria-label="Invoice summary"
              >
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Taxable Value</span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {formatCurrency(calculationSummary.taxableTotal)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {calculationSummary.isIntra ? "CGST + SGST" : "IGST"}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {formatCurrency(calculationSummary.taxTotal)}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-indigo-600">Net Receivable</span>
                  <output className="font-mono text-sm font-bold text-indigo-700">
                    {formatCurrency(calculationSummary.netReceivable)}
                  </output>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">GST Supply</span>
                  <span className="font-semibold text-slate-800 text-[11px]">
                    {calculationSummary.isRcm
                      ? "GTA RCM"
                      : calculationSummary.isExempt
                      ? "Exempt / Nil"
                      : calculationSummary.isIntra
                      ? "Intra-State"
                      : "Inter-State"}
                  </span>
                </div>
              </div>
            }
          />
        }
      >
        <form id="general-invoice-form" onSubmit={handleCreateInvoice} className="space-y-6">
          {/* Section 1: Series & Document Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Document Series & Sequencing
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Series <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRangeId || (seriesOptions[0]?.value ?? "default")}
                  disabled={seriesOptions.length <= 1}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedRangeId(newId);
                    const matched = seriesInfo?.series_options?.find((s: any) => String(s.id) === String(newId));
                    if (matched && matched.next_number_formatted) {
                      setVoucherNumber(matched.next_number_formatted);
                    }
                  }}
                  className={cn(
                    "w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs cursor-pointer",
                    seriesOptions.length <= 1 && "bg-slate-100 text-slate-600 cursor-not-allowed select-none"
                  )}
                >
                  {seriesOptions.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Invoice Number</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                    <Lock className="w-2.5 h-2.5 text-slate-500" /> Auto-Allocated
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={activeNextNumber || voucherNumber || ""}
                  placeholder={activeNextNumber || "Auto-allocated sequence"}
                  className="w-full h-9 px-3 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-slate-100 text-slate-800 cursor-not-allowed select-none focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Customer / Debtor & Statutory Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Billed Customer & Place of Supply
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Customer (Billing Client Ledger)
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (!e.target.value) {
                      setCustomPartyName("");
                      setCustomPartyGstin("");
                    }
                  }}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Manual / Direct Customer Entry --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ""} {c.gstin ? `[GSTIN: ${c.gstin}]` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Select existing debtor ledger, or type custom customer name below.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Debtor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Steel Logistics Ltd"
                  value={
                    selectedClientId
                      ? clients.find((c) => String(c.id) === selectedClientId)?.name || customPartyName
                      : customPartyName
                  }
                  onChange={(e) => setCustomPartyName(e.target.value)}
                  disabled={Boolean(selectedClientId)}
                  className={cn(
                    "w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600",
                    Boolean(selectedClientId) && "bg-slate-100 text-slate-600"
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer GSTIN</label>
                <input
                  type="text"
                  placeholder="27AABCT1332L1Z4"
                  maxLength={15}
                  value={customPartyGstin}
                  onChange={(e) => setCustomPartyGstin(e.target.value.toUpperCase())}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Place of Supply (POS) <span className="text-red-500">*</span>
                </label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Treatment</label>
                <select
                  value={gstTreatment}
                  onChange={(e) => setGstTreatment(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="FCM">FCM (Forward Charge 18% / 12% / 5%)</option>
                  <option value="RCM">GTA RCM (Recipient Pays Tax u/s 9(3))</option>
                  <option value="EXEMPT">Exempt / Nil-Rated Supply (0% Tax)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Period (Days)</label>
                <input
                  type="number"
                  min={0}
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / PO Number</label>
                <input
                  type="text"
                  placeholder="PO-2026-998"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Centre</label>
                <input
                  type="text"
                  placeholder="e.g. WH-MUMBAI-MAIN"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Income Ledger Head</label>
                <select
                  value={incomeHead}
                  onChange={(e) => setIncomeHead(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="ACC_GENERAL_SALES_REV">General Sales & Service Revenue</option>
                  <option value="ACC_WAREHOUSE_REV">Warehousing & Storage Income</option>
                  <option value="ACC_HANDLING_REV">Loading & Material Handling Income</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Itemized Service Lines Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Itemized Services & Charges
              </h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddLine}
                className="text-xs gap-1 h-8"
              >
                <Plus className="w-3.5 h-3.5" /> Add Service Line
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2 min-w-[200px]">Service Description</th>
                    <th className="px-3 py-2 w-28">SAC Code</th>
                    <th className="px-3 py-2 w-24 text-right">Quantity</th>
                    <th className="px-3 py-2 w-28 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 w-24 text-right">Discount (₹)</th>
                    <th className="px-3 py-2 w-32">GST Category</th>
                    <th className="px-3 py-2 w-28 text-right">Taxable</th>
                    <th className="px-3 py-2 w-28 text-right">Total (₹)</th>
                    <th className="px-2 py-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculationSummary.computedLines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pallet Storage / Forklift Handling"
                          value={line.description}
                          onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded border border-slate-200 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="9967"
                          value={line.hsn_sac}
                          onChange={(e) => handleLineChange(line.id, "hsn_sac", e.target.value)}
                          className="w-full h-8 px-2 text-xs font-mono rounded border border-slate-200 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={line.quantity}
                          onChange={(e) => handleLineChange(line.id, "quantity", e.target.value)}
                          className="w-full h-8 px-2 text-xs font-mono text-right rounded border border-slate-200 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={line.rate}
                          onChange={(e) => handleLineChange(line.id, "rate", e.target.value)}
                          className="w-full h-8 px-2 text-xs font-mono text-right rounded border border-slate-200 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.discount}
                          onChange={(e) => handleLineChange(line.id, "discount", e.target.value)}
                          className="w-full h-8 px-2 text-xs font-mono text-right rounded border border-slate-200 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={line.tax_category_id}
                          onChange={(e) => handleLineChange(line.id, "tax_category_id", e.target.value)}
                          className="w-full h-8 px-2 text-xs rounded border border-slate-200 bg-white"
                        >
                          {taxCategories.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              {tc.name} ({tc.igst_rate}%)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-medium">
                        {formatCurrency(line.lineTaxable)}
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-bold text-slate-900">
                        {formatCurrency(line.lineTotal)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-800">
                  <tr>
                    <td colSpan={7} className="px-3 py-2 text-right">
                      Subtotals:
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-indigo-700">
                      {formatCurrency(calculationSummary.taxableTotal)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-indigo-700 font-bold">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Voucher Narration / Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Narration explaining business transaction and invoice terms..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Section 4: Real-time Double-Entry Posting Preview */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" /> Tally Prime Double-Entry Posting Preview
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Balanced (Dr = Cr)
              </span>
            </h4>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="px-3 py-2">Ledger Account</th>
                    <th className="px-3 py-2">Accounting Group</th>
                    <th className="px-3 py-2 text-right">Debit (Dr)</th>
                    <th className="px-3 py-2 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      Dr. {selectedClientId ? clients.find((c) => String(c.id) === selectedClientId)?.name || "Customer Ledger" : customPartyName || "Sundry Debtors A/c"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">Sundry Debtors (Asset)</td>
                    <td className="px-3 py-2 font-mono text-right text-emerald-700 font-bold">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      Cr. {incomeHead === "ACC_WAREHOUSE_REV" ? "Warehousing & Storage Income" : incomeHead === "ACC_HANDLING_REV" ? "Loading & Material Handling Income" : "General Sales & Service Revenue"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">Direct Income (Revenue)</td>
                    <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                    <td className="px-3 py-2 font-mono text-right text-indigo-700 font-bold">
                      {formatCurrency(calculationSummary.taxableTotal)}
                    </td>
                  </tr>
                  {!calculationSummary.isRcm && !calculationSummary.isExempt && calculationSummary.taxTotal > 0 && (
                    <>
                      {calculationSummary.isIntra ? (
                        <>
                          <tr>
                            <td className="px-3 py-2 font-medium text-slate-900">Cr. GST Output CGST A/c</td>
                            <td className="px-3 py-2 text-slate-500">Duties & Taxes (Liability)</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-800">
                              {formatCurrency(calculationSummary.cgstTotal)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 font-medium text-slate-900">Cr. GST Output SGST A/c</td>
                            <td className="px-3 py-2 text-slate-500">Duties & Taxes (Liability)</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-800">
                              {formatCurrency(calculationSummary.sgstTotal)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="px-3 py-2 font-medium text-slate-900">Cr. GST Output IGST A/c</td>
                          <td className="px-3 py-2 text-slate-500">Duties & Taxes (Liability)</td>
                          <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                          <td className="px-3 py-2 font-mono text-right text-slate-800">
                            {formatCurrency(calculationSummary.igstTotal)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t text-slate-900">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right">
                      Total Ledger Impact:
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-emerald-700">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-emerald-700">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </form>
      </EntityDrawer>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. Record Customer Payment Drawer                                      */}
      {/* ---------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        title={`Record Customer Payment: ${paymentInvoice?.voucher_number || ""}`}
        description="Bill-wise payment settlement with Section 194C / 194J TDS and cash discount adjustments"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-mono font-semibold text-slate-600">
              Outstanding:{" "}
              <strong>
                {formatCurrency(
                  paymentInvoice?.balance_amount !== undefined
                    ? Number(paymentInvoice.balance_amount)
                    : Number(paymentInvoice?.net_amount || 0)
                )}
              </strong>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPaymentInvoice(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleRecordPayment}
                disabled={isSubmittingPayment}
                className="gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {isSubmittingPayment ? "Posting Receipt..." : "Post Payment Voucher"}
              </Button>
            </div>
          </div>
        }
      >
        {paymentInvoice && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{paymentInvoice.voucher_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billed Customer:</span>
                <span className="font-semibold text-slate-900">{paymentInvoice.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Invoice Value:</span>
                <span className="font-mono text-slate-900">{formatCurrency(paymentInvoice.net_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currently Paid:</span>
                <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(paymentInvoice.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-bold text-slate-700">Remaining Balance:</span>
                <span className="font-mono font-bold text-amber-700">
                  {formatCurrency(paymentInvoice.balance_amount ?? paymentInvoice.net_amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Net Amount Received (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as "BANK" | "CASH")}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="BANK">Bank Account (HDFC RTGS/NEFT)</option>
                  <option value="CASH">Cash in Hand</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">TDS Deducted (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentTds}
                  onChange={(e) => setPaymentTds(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">TDS Section</label>
                <select
                  value={paymentTdsSec}
                  onChange={(e) => setPaymentTdsSec(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                >
                  <option value="194C">Section 194C (Contractor 1% / 2%)</option>
                  <option value="194J">Section 194J (Professional / Tech 2% / 10%)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agreed Discount / Deduction (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentDiscount}
                  onChange={(e) => setPaymentDiscount(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cheque / UTR / Reference No.</label>
              <input
                type="text"
                placeholder="UTR / Cheque number..."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Narration</label>
              <input
                type="text"
                value={paymentNarration}
                onChange={(e) => setPaymentNarration(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white"
              />
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. Double-Entry Ledger & Bill Settlements Drawer                       */}
      {/* ---------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={Boolean(selectedVoucher)}
        onClose={() => setSelectedVoucher(null)}
        title={`Ledger Audit: ${selectedVoucher?.voucher_number || ""}`}
        description={`Double-entry postings and bill-wise settlements • ${selectedVoucher?.voucher_date || ""}`}
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Close Audit
            </Button>
          </div>
        }
      >
        {selectedVoucher && (
          <div className="space-y-5">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Total Invoice Value</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(selectedVoucher.net_amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Tax Amount</span>
                <span className="font-mono text-slate-900">{formatCurrency(selectedVoucher.tax_amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Outstanding</span>
                <span className="font-mono font-bold text-amber-700">
                  {formatCurrency(selectedVoucher.balance_amount ?? selectedVoucher.net_amount)}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Double-Entry Ledger Entries
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="px-3 py-2">Account Name</th>
                      <th className="px-3 py-2">Posting Type</th>
                      <th className="px-3 py-2 text-right">Debit (Dr)</th>
                      <th className="px-3 py-2 text-right">Credit (Cr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVoucher.ledger_entries.map((entry) => (
                      <tr key={entry.id} className={entry.is_reversal ? "bg-red-50 text-red-700" : ""}>
                        <td className="px-3 py-2 font-medium">
                          {entry.account_name || `Account #${entry.account_id}`}
                          {entry.is_reversal && (
                            <span className="ml-2 text-[10px] font-bold text-red-600 uppercase">[Reversal]</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {Number(entry.debit_amount) > 0 ? "Debit (Dr)" : "Credit (Cr)"}
                        </td>
                        <td className="px-3 py-2 font-mono text-right font-medium">
                          {Number(entry.debit_amount) > 0 ? formatCurrency(entry.debit_amount) : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-right font-medium">
                          {Number(entry.credit_amount) > 0 ? formatCurrency(entry.credit_amount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t text-slate-900">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-right">Total:</td>
                      <td className="px-3 py-2 font-mono text-right text-emerald-700">
                        {formatCurrency(selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.debit_amount), 0))}
                      </td>
                      <td className="px-3 py-2 font-mono text-right text-emerald-700">
                        {formatCurrency(selectedVoucher.ledger_entries.reduce((sum, e) => sum + Number(e.credit_amount), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bill Allocations History */}
            {selectedVoucher.bill_allocations && selectedVoucher.bill_allocations.length > 0 && (
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Customer Settlement History
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                      <tr>
                        <th className="px-3 py-2">Receipt Voucher</th>
                        <th className="px-3 py-2 text-right">Received Amount</th>
                        <th className="px-3 py-2 text-right">TDS Deducted</th>
                        <th className="px-3 py-2 text-right">Total Settled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedVoucher.bill_allocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td className="px-3 py-2 font-mono font-medium">
                            {alloc.voucher?.voucher_number || `Receipt #${alloc.voucher_id}`}
                          </td>
                          <td className="px-3 py-2 font-mono text-right">
                            {formatCurrency(alloc.allocated_amount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-right">
                            {formatCurrency(alloc.tds_amount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-right font-bold text-emerald-700">
                            {formatCurrency(alloc.total_settled)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedVoucher.is_void && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                <strong>Void Audit Reason:</strong> {selectedVoucher.void_reason}
              </div>
            )}
          </div>
        )}
      </EntityDrawer>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. GST Tax Invoice Print Preview Modal                                 */}
      {/* ---------------------------------------------------------------------- */}
      {printInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  GST Tax Invoice & Billing Bill
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
                    REFERENCE & COMMERCIAL DETAILS
                  </span>
                  <div className="mt-1 space-y-0.5">
                    <p>
                      <strong>PO / Order Ref:</strong>{" "}
                      <span className="font-mono">{printInvoice.reference_number || "—"}</span>
                    </p>
                    <p>
                      <strong>Cost Center:</strong>{" "}
                      <span className="font-mono">{printInvoice.cost_center || "General Corporate"}</span>
                    </p>
                    <p>
                      <strong>Payment Terms:</strong> {printInvoice.credit_period_days || 30} Days
                    </p>
                    <p>
                      <strong>Due Date:</strong> {formatDate(printInvoice.due_date || printInvoice.voucher_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Billed To / Recipient */}
              <div className="border-b pb-4 bg-slate-50 p-3 rounded-lg">
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
                  Place of Supply: {printInvoice.place_of_supply || "Maharashtra"}
                </p>
              </div>

              {/* Itemized Table */}
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                    <th className="p-2 border-r border-slate-300 text-center w-10">Sr.</th>
                    <th className="p-2 border-r border-slate-300 text-left">Description of Services</th>
                    <th className="p-2 border-r border-slate-300 text-center w-24">SAC / HSN</th>
                    <th className="p-2 border-r border-slate-300 text-right w-20">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right w-24">Rate (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printInvoice.items && printInvoice.items.length > 0 ? (
                    printInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border-r text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r">{item.description}</td>
                        <td className="p-2 border-r text-center font-mono">{item.hsn_sac || "9967"}</td>
                        <td className="p-2 border-r text-right font-mono">{Number(item.quantity || 1).toFixed(2)}</td>
                        <td className="p-2 border-r text-right font-mono">{formatCurrency(item.rate || 0)}</td>
                        <td className="p-2 border-r text-right font-mono font-semibold">
                          {formatCurrency(item.total_amount || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-2 border-r text-center font-mono">1</td>
                      <td className="p-2 border-r">General Services / Charges</td>
                      <td className="p-2 border-r text-center font-mono">9967</td>
                      <td className="p-2 border-r text-right font-mono">1.00</td>
                      <td className="p-2 border-r text-right font-mono">{formatCurrency(printInvoice.total_amount)}</td>
                      <td className="p-2 border-r text-right font-mono font-semibold">
                        {formatCurrency(printInvoice.total_amount)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-300 font-semibold bg-slate-50">
                    <td colSpan={5} className="p-2 text-right border-r">
                      Total Taxable Value:
                    </td>
                    <td className="p-2 text-right font-mono font-bold">
                      {formatCurrency(printInvoice.total_amount)}
                    </td>
                  </tr>
                  {printInvoice.gst_treatment === "RCM" ? (
                    <tr className="border-t border-slate-300 bg-amber-50/70 text-amber-900">
                      <td colSpan={6} className="p-2 text-center text-[11px] font-semibold">
                        TAX PAYABLE UNDER REVERSE CHARGE: YES (Recipient is liable to discharge GST under
                        Section 9(3) of the CGST Act 2017)
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t border-slate-300 font-semibold bg-slate-50">
                      <td colSpan={5} className="p-2 text-right border-r">
                        Output GST Total:
                      </td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatCurrency(printInvoice.tax_amount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-400 font-bold bg-slate-100 text-sm">
                    <td colSpan={5} className="p-2.5 text-right border-r uppercase text-slate-900">
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
      {/* 5. Void Confirm Dialog                                                 */}
      {/* ---------------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidVoucher}
        title={`Void Invoice #${voidVoucherId || ""}`}
        description="Non-destructive reversal per §7: Automated reversing ledger entries will be created immediately. This action cannot be undone."
        confirmText="Confirm Void Entry"
        variant="danger"
        isLoading={isVoiding}
        disabled={voidReason.trim().length < 10}
      >
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Audit Reason for Voiding * (Min 10 characters)
          </label>
          <textarea
            required
            rows={3}
            placeholder="Explain why this invoice is being voided..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
