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
  Check,
} from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { GeneralInvoicePrintModal } from "@/components/modals/general-invoice-print-modal";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { canAccessRoute } from "@/lib/permissions";

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
  lr_id?: number;
  ledger_entries: LedgerEntry[];
  items?: VoucherItem[];
  bill_allocations?: BillAllocationItem[];
  created_at: string;
}

interface LRRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  status?: string;
  billing_client_id?: number;
  billing_customer_name?: string;
  consigner_name?: string;
  consignee_name?: string;
  vehicle_number?: string;
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

const DEFAULT_TAX_CATEGORIES: TaxCategoryRecord[] = [
  { id: 1, name: "GST 0% (Exempt / Nil Rated)", igst_rate: 0, cgst_rate: 0, sgst_rate: 0 },
  { id: 2, name: "GST 5%", igst_rate: 5, cgst_rate: 2.5, sgst_rate: 2.5 },
  { id: 3, name: "GST 12%", igst_rate: 12, cgst_rate: 6, sgst_rate: 6 },
  { id: 4, name: "GST 18%", igst_rate: 18, cgst_rate: 9, sgst_rate: 9 },
  { id: 5, name: "GST 28%", igst_rate: 28, cgst_rate: 14, sgst_rate: 14 },
];

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
  const [lrs, setLrs] = useState<LRRecord[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryRecord[]>(DEFAULT_TAX_CATEGORIES);
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
  const [selectedLrId, setSelectedLrId] = useState<string>("");
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
      tax_category_id: "4", // Default 18% GST
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
      const [vouchersRes, clientsRes, taxesRes, sInfo, manualRangesRes, lrsRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=GENERAL_INVOICE"),
        apiClient<BillingClientRecord[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<TaxCategoryRecord[]>("/api/v1/misc/tax-categories").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/GENERAL_INVOICE${officeParam}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/manual-ranges/GENERAL_INVOICE${officeParam}`).catch(() => null),
        apiClient<LRRecord[]>("/api/v1/transport/lrs").catch(() => []),
      ]);
      setData(Array.isArray(vouchersRes) ? vouchersRes : []);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);

      // Build comprehensive tax categories ensuring 0%, 5%, and 18% are present
      const rawTaxes: TaxCategoryRecord[] = Array.isArray(taxesRes) && taxesRes.length > 0 ? taxesRes : DEFAULT_TAX_CATEGORIES;
      const mergedTaxes: TaxCategoryRecord[] = [...rawTaxes];

      if (!mergedTaxes.some((t) => Number(t.igst_rate) === 0)) {
        mergedTaxes.unshift({ id: 1, name: "GST 0% (Exempt / Nil Rated)", igst_rate: 0, cgst_rate: 0, sgst_rate: 0 });
      }
      if (!mergedTaxes.some((t) => Number(t.igst_rate) === 5)) {
        mergedTaxes.push({ id: 2, name: "GST 5%", igst_rate: 5, cgst_rate: 2.5, sgst_rate: 2.5 });
      }
      if (!mergedTaxes.some((t) => Number(t.igst_rate) === 18)) {
        mergedTaxes.push({ id: 4, name: "GST 18%", igst_rate: 18, cgst_rate: 9, sgst_rate: 9 });
      }

      setTaxCategories(mergedTaxes);
      setSeriesInfo(sInfo);
      setManualSeriesData(manualRangesRes);

      // Set default tax category (18% GST standard)
      const g18 = mergedTaxes.find((t) => Number(t.igst_rate) === 18 || t.name.includes("18")) || mergedTaxes[0];
      if (g18) {
        setServiceLines((prev) =>
          prev.map((l) => (!l.tax_category_id ? { ...l, tax_category_id: String(g18.id) } : l))
        );
      }
    } catch (err: any) {
      const msg = err.message || "";
      const isSchemaErr =
        msg.toLowerCase().includes("column") ||
        msg.toLowerCase().includes("does not exist") ||
        msg.toLowerCase().includes("programmingerror") ||
        msg.toLowerCase().includes("schema") ||
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

  // When an LR is selected, optionally auto-suggest billing customer and reference number
  useEffect(() => {
    if (!selectedLrId) return;
    const lr = lrs.find((l) => String(l.id) === String(selectedLrId));
    if (lr) {
      if (lr.billing_client_id && !selectedClientId) {
        const clientExists = clients.some((c) => c.id === lr.billing_client_id);
        if (clientExists) setSelectedClientId(String(lr.billing_client_id));
      }
      if (!refNumber && lr.lr_number) {
        setRefNumber(lr.lr_number);
      }
    }
  }, [selectedLrId, lrs, clients, selectedClientId, refNumber]);

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
      const rate = tc ? parseFloat(String(tc.igst_rate)) : (isExempt || isRcm ? 0 : 18);

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
        tax_category_id: g18 ? g18.id.toString() : "4",
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

    if (!selectedClientId) {
      toast.warning("Please select a billing customer.");
      return;
    }

    const client = clients.find((c) => String(c.id) === String(selectedClientId));
    const finalPartyName = client ? (client.company_name || client.name) : "";
    if (!finalPartyName) {
      toast.warning("Please select a valid billing customer.");
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
          billing_client_id: parseInt(selectedClientId, 10),
          party_name: finalPartyName,
          lr_id: selectedLrId ? parseInt(selectedLrId, 10) : undefined,
          party_gstin: customPartyGstin.trim() || undefined,
          place_of_supply: placeOfSupply,
          gst_treatment: gstTreatment,
          voucher_date: invoiceDate,
          credit_period_days: creditPeriodDays,
          reference_number: refNumber.trim() || undefined,
          cost_center: costCenter.trim() || undefined,
          narration: narration.trim() || undefined,
          items: serviceLines.map((l) => {
            const q = parseFloat(l.quantity) || 1.0;
            const r = parseFloat(l.rate) || 0.0;
            const d = parseFloat(l.discount) || 0.0;
            const lineTaxable = Math.max(0, q * r - d);
            const tc = taxCategories.find((t) => String(t.id) === String(l.tax_category_id));
            const rate = tc ? parseFloat(String(tc.igst_rate)) : (gstTreatment === "EXEMPT" ? 0 : 18);
            const lineTax = gstTreatment === "EXEMPT" || gstTreatment === "RCM" ? 0 : Math.round(((lineTaxable * rate) / 100) * 100) / 100;
            return {
              description: l.description.trim() || "Business Service",
              hsn_sac: l.hsn_sac.trim() || "9967",
              quantity: q,
              rate: r,
              discount_amount: d,
              tax_category_id: l.tax_category_id ? parseInt(l.tax_category_id, 10) : (tc ? tc.id : undefined),
              tax_amount: lineTax,
              total_amount: lineTaxable + lineTax,
            };
          }),
        }),
      });
      toast.success("General Invoice posted successfully with double-entry ledgers!");
      setSuccessMessage("General Invoice generated and balanced in customer & revenue ledgers.");
      setIsCreateOpen(false);
      setSelectedClientId("");
      setSelectedLrId("");
      setCustomPartyGstin("");
      setRefNumber("");
      setCostCenter("");
      setNarration("");
      const g18 = taxCategories.find((t) => Number(t.igst_rate) === 18 || t.name.includes("18")) || taxCategories[0];
      setServiceLines([
        {
          id: "1",
          description: "Warehousing & Storage Services",
          hsn_sac: "996729",
          quantity: "1.00",
          rate: "0.00",
          discount: "0.00",
          tax_category_id: g18 ? String(g18.id) : "4",
        },
      ]);
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
        const irnVal = (v.irn || "").toLowerCase();
        if (
          !vNum.includes(q) &&
          !pName.includes(q) &&
          !refNo.includes(q) &&
          !gstin.includes(q) &&
          !irnVal.includes(q)
        ) {
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

  // Helper to extract clean GST tax breakup and rates for table display
  const getVoucherTaxDetails = (row: VoucherRecord) => {
    let tb = row.tax_breakup;
    if (typeof tb === "string") {
      try {
        tb = JSON.parse(tb);
      } catch {
        tb = undefined;
      }
    }

    const taxable =
      parseFloat(String(row.total_amount ?? 0)) ||
      (parseFloat(String(row.net_amount || 0)) - parseFloat(String(row.tax_amount || 0)));
    const totalTax = parseFloat(String(row.tax_amount ?? 0));
    const isRcm = row.gst_treatment === "RCM";
    const isExempt = row.gst_treatment === "EXEMPT" || row.gst_treatment === "NIL_RATED";

    if (tb && typeof tb === "object") {
      const cgstAmt = Number(tb.cgst_amount || 0);
      const sgstAmt = Number(tb.sgst_amount || 0);
      const igstAmt = Number(tb.igst_amount || 0);
      const cgstRate = Number(tb.cgst_rate || 0);
      const sgstRate = Number(tb.sgst_rate || 0);
      const igstRate = Number(tb.igst_rate || 0);

      let rateLabel = "0%";
      if (isExempt) {
        rateLabel = "Exempt";
      } else if (isRcm) {
        rateLabel =
          igstRate > 0
            ? `${igstRate}% RCM`
            : cgstRate + sgstRate > 0
            ? `${cgstRate + sgstRate}% RCM`
            : "5% RCM";
      } else if (igstRate > 0) {
        rateLabel = `${igstRate}%`;
      } else if (cgstRate + sgstRate > 0) {
        rateLabel = `${cgstRate + sgstRate}%`;
      } else if (taxable > 0 && totalTax > 0) {
        rateLabel = `${Math.round((totalTax / taxable) * 100)}%`;
      }

      return {
        taxable,
        cgstAmt,
        sgstAmt,
        igstAmt,
        rateLabel,
      };
    }

    // Fallback calculation when tax_breakup is null
    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;
    let rateLabel = "0%";

    if (isExempt) {
      rateLabel = "Exempt";
    } else if (isRcm) {
      rateLabel = "5% RCM";
    } else if (totalTax > 0 && taxable > 0) {
      const effectiveRate = Math.round((totalTax / taxable) * 100);
      rateLabel = `${effectiveRate}%`;
      const isIntra =
        (row.place_of_supply || "").toLowerCase().includes("maharashtra") ||
        (row.place_of_supply || "") === "27";
      if (isIntra) {
        cgstAmt = Math.round((totalTax / 2) * 100) / 100;
        sgstAmt = totalTax - cgstAmt;
      } else {
        igstAmt = totalTax;
      }
    }

    return {
      taxable,
      cgstAmt,
      sgstAmt,
      igstAmt,
      rateLabel,
    };
  };

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      header: "Invoice / Ref / Date",
      sortable: true,
      minWidth: "175px",
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPrintInvoice(row)}
              className="font-mono font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs text-left cursor-pointer tabular-nums"
              title="Click to view/print Tax Invoice"
            >
              {row.voucher_number}
            </button>
            {row.reference_number && (
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 tabular-nums"
                title={`Ref / PO: ${row.reference_number}`}
              >
                Ref: {row.reference_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>{formatDate(row.voucher_date)}</span>
            {row.due_date && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium tabular-nums">
                Due: {formatDate(row.due_date)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "balance_amount",
      header: "Outstanding / Status",
      sortable: true,
      minWidth: "150px",
      cell: (row) => {
        const bal = parseFloat(String(row.balance_amount ?? row.net_amount));
        const paid = parseFloat(String(row.paid_amount ?? 0));
        const status = row.payment_status || "UNPAID";

        return (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "font-mono font-bold text-xs sm:text-sm tabular-nums",
                  bal > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {formatCurrency(bal)}
              </span>
              {paid > 0 && bal > 0 && (
                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                  (Pd: {formatCurrency(paid)})
                </span>
              )}
            </div>
            <div className="mt-1">
              {row.is_void ? (
                <Badge variant="danger" className="text-[10px] font-semibold py-0.5">
                  VOID
                </Badge>
              ) : status === "PAID" ? (
                <Badge variant="success" className="text-[10px] gap-1 font-semibold py-0.5">
                  <Check className="w-2.5 h-2.5 text-[#16A34A]" /> Settled
                </Badge>
              ) : status === "PARTIALLY_PAID" ? (
                <Badge variant="info" className="text-[10px] gap-1 font-semibold py-0.5">
                  Partially Paid
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] gap-1 font-semibold py-0.5">
                  Unpaid
                </Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "irn",
      header: "IRN",
      align: "center",
      minWidth: "120px",
      cell: (row) => {
        if (row.irn_status === "GENERATED") {
          return (
            <div className="flex flex-col items-center max-w-[125px]">
              <Badge variant="success" className="gap-1 text-[10px] font-semibold py-0.5">
                <ShieldCheck className="w-3 h-3 text-[#16A34A] shrink-0" />
                IRN Active
              </Badge>
              {row.irn && (
                <span
                  className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate block w-full text-center cursor-help"
                  title={`Full IRN: ${row.irn}`}
                >
                  {row.irn.substring(0, 8)}...{row.irn.substring(row.irn.length - 4)}
                </span>
              )}
            </div>
          );
        }
        if (row.irn_status === "CANCELLED") {
          return (
            <Badge variant="danger" className="text-[10px] py-0.5">
              Cancelled
            </Badge>
          );
        }
        return (
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            —
          </span>
        );
      },
    },
    {
      key: "party_name",
      header: "Billing Customer",
      sortable: true,
      minWidth: "175px",
      cell: (row) => {
        const clientName = row.party_name || "General Client";
        return (
          <div className="max-w-[210px]">
            <span
              className="font-semibold text-slate-900 dark:text-slate-100 block text-xs truncate"
              title={clientName}
            >
              {clientName}
            </span>
            {row.party_gstin && (
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase font-medium tracking-wide block truncate mt-0.5">
                GST: {row.party_gstin}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "sac",
      header: "SAC",
      align: "center",
      minWidth: "85px",
      cell: (row) => {
        const sacCode =
          row.items?.find((i: any) => i.hsn_sac)?.hsn_sac ||
          row.items?.[0]?.hsn_sac ||
          "9967";
        return (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 tabular-nums">
            {sacCode}
          </span>
        );
      },
    },
    {
      key: "total_amount",
      header: "Amount",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "110px",
      cell: (row) => {
        const { taxable } = getVoucherTaxDetails(row);
        return (
          <span className="font-mono font-semibold text-slate-900 dark:text-white block text-xs tabular-nums text-right">
            {formatCurrency(taxable)}
          </span>
        );
      },
    },
    {
      key: "tax_rate",
      header: "Tax Rate",
      align: "center",
      minWidth: "90px",
      cell: (row) => {
        const { rateLabel } = getVoucherTaxDetails(row);
        return (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 tabular-nums font-medium">
            {rateLabel}
          </span>
        );
      },
    },
    {
      key: "cgst",
      header: "CGST",
      isNumeric: true,
      align: "right",
      minWidth: "95px",
      cell: (row) => {
        const { cgstAmt } = getVoucherTaxDetails(row);
        return (
          <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 block text-right">
            {cgstAmt > 0 ? formatCurrency(cgstAmt) : "—"}
          </span>
        );
      },
    },
    {
      key: "sgst",
      header: "SGST",
      isNumeric: true,
      align: "right",
      minWidth: "95px",
      cell: (row) => {
        const { sgstAmt } = getVoucherTaxDetails(row);
        return (
          <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 block text-right">
            {sgstAmt > 0 ? formatCurrency(sgstAmt) : "—"}
          </span>
        );
      },
    },
    {
      key: "igst",
      header: "IGST",
      isNumeric: true,
      align: "right",
      minWidth: "95px",
      cell: (row) => {
        const { igstAmt } = getVoucherTaxDetails(row);
        return (
          <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 block text-right">
            {igstAmt > 0 ? formatCurrency(igstAmt) : "—"}
          </span>
        );
      },
    },
    {
      key: "net_amount",
      header: "Total Amount",
      sortable: true,
      isNumeric: true,
      align: "right",
      minWidth: "120px",
      cell: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-white block text-xs sm:text-sm tabular-nums text-right">
          {formatCurrency(row.net_amount)}
        </span>
      ),
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
    const g18 = taxCategories.find((t) => Number(t.igst_rate) === 18 || t.name.includes("18")) || taxCategories[0];
    if (g18) {
      setServiceLines((prev) =>
        prev.map((l) => (!l.tax_category_id ? { ...l, tax_category_id: String(g18.id) } : l))
      );
    }
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="General Invoices"
        description="Double-entry non-freight billing, itemized services, GST calculation (FCM/RCM/Exempt), and bill-wise receivables."
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
            <span>
              {canAccessRoute("/settings/series-master")
                ? "Manual or automatic series must be configured in Series Master before General Invoices can be recorded."
                : "Manual or automatic series must be configured by your Company Admin before General Invoices can be recorded."}
            </span>
          </div>
          {canAccessRoute("/settings/series-master") && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/settings/series-master")}
              className="text-xs bg-white dark:bg-[#1A1823] text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/50 shrink-0"
            >
              Configure GI Series
            </Button>
          )}
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex flex-wrap items-center justify-between gap-2.5">
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
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2.5">
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
        searchPlaceholder="Search invoice number, customer, PO reference, GSTIN, IRN..."
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
        tableId="general-invoices-v2"
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
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200/90 dark:border-[#22232E] bg-slate-50 dark:bg-[#12131A] px-4 py-3 text-xs"
                aria-label="Invoice summary"
              >
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Taxable Value</span>
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(calculationSummary.taxableTotal)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {calculationSummary.isIntra ? "CGST + SGST" : "IGST"}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(calculationSummary.taxTotal)}
                  </span>
                </div>
                <div className="border-l border-slate-200/90 dark:border-[#22232E] pl-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-indigo-600">Net Receivable</span>
                  <output className="font-mono text-sm font-bold text-indigo-700">
                    {formatCurrency(calculationSummary.netReceivable)}
                  </output>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">GST Supply</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-[11px]">
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
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Document Series & Sequencing
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">
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
                    "w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all cursor-pointer",
                    seriesOptions.length <= 1 && "bg-slate-100 dark:bg-[#17171B] text-slate-500 dark:text-slate-400 dark:text-slate-400 cursor-not-allowed select-none"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Invoice Number</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                    <Lock className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" /> Auto-Allocated
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={activeNextNumber || voucherNumber || ""}
                  placeholder={activeNextNumber || "Auto-allocated sequence"}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-slate-100 dark:bg-[#17171B] text-slate-700 dark:text-slate-300 dark:text-slate-300 cursor-not-allowed select-none focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Customer / Debtor & Statutory Details */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Billed Customer & Place of Supply
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Billing Customer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    if (!e.target.value) {
                      setCustomPartyGstin("");
                    }
                  }}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">Select Billing Customer</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ""} {c.gstin ? `[GSTIN: ${c.gstin}]` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Select registered billing customer ledger for invoicing.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lorry Receipt (LR)
                </label>
                <select
                  value={selectedLrId}
                  onChange={(e) => setSelectedLrId(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">-- Select LR (Optional) --</option>
                  {lrs.map((lr) => (
                    <option key={lr.id} value={lr.id}>
                      {lr.lr_number} ({formatDate(lr.lr_date)}){lr.billing_customer_name || lr.consigner_name ? ` — ${lr.billing_customer_name || lr.consigner_name}` : ""}{lr.vehicle_number ? ` | ${lr.vehicle_number}` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Optionally link this general invoice to a consignment LR.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Customer GSTIN</label>
                <input
                  type="text"
                  placeholder="Enter 15-digit GSTIN"
                  maxLength={15}
                  value={customPartyGstin}
                  onChange={(e) => setCustomPartyGstin(e.target.value.toUpperCase())}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">
                  Place of Supply (POS) <span className="text-red-500">*</span>
                </label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#2B2E42] bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs transition-all"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">GST Treatment</label>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Credit Period (Days)</label>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Reference / PO Number</label>
                <input
                  type="text"
                  placeholder="PO-2026-998"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Cost Centre</label>
                <input
                  type="text"
                  placeholder="Enter cost centre code"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Revenue Income Ledger Head</label>
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
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
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

            <div className="border border-slate-200/90 dark:border-[#22232E] rounded-xl overflow-x-auto bg-white dark:bg-[#12131A]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#17171B] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200/90 dark:border-[#22232E]">
                  <tr>
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2 min-w-[200px]">Service Description</th>
                    <th className="px-3 py-2 w-24">SAC Code</th>
                    <th className="px-3 py-2 w-20 text-right">Quantity</th>
                    <th className="px-3 py-2 w-24 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 w-24 text-right">Discount (₹)</th>
                    <th className="px-3 py-2 w-48 min-w-[175px]">GST Category</th>
                    <th className="px-3 py-2 w-24 text-right">Taxable</th>
                    <th className="px-3 py-2 w-28 text-right">Total (₹)</th>
                    <th className="px-2 py-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculationSummary.computedLines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          required
                          placeholder="Enter description of goods / services"
                          value={line.description}
                          onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                          className="w-full h-8 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          placeholder="9967"
                          value={line.hsn_sac}
                          onChange={(e) => handleLineChange(line.id, "hsn_sac", e.target.value)}
                          className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
                          className="w-full h-8 px-2 text-xs font-mono text-right rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
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
                          className="w-full h-8 px-2 text-xs font-mono text-right rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.discount}
                          onChange={(e) => handleLineChange(line.id, "discount", e.target.value)}
                          className="w-full h-8 px-2 text-xs font-mono text-right rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[175px]">
                        <select
                          value={line.tax_category_id || String(taxCategories.find((t) => Number(t.igst_rate) === 18)?.id || "")}
                          onChange={(e) => handleLineChange(line.id, "tax_category_id", e.target.value)}
                          className="w-full h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#22232E] bg-white dark:bg-[#12131A] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                        >
                          {taxCategories.map((tc) => (
                            <option key={tc.id} value={String(tc.id)}>
                              {tc.name.includes("%") ? tc.name : `${tc.name} (${tc.igst_rate}%)`}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-medium">
                        {formatCurrency(line.lineTaxable)}
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(line.lineTotal)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-[#17171B] border-t border-slate-200 dark:border-[#22232E] font-semibold text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={7} className="px-3 py-2 text-right">
                      Subtotals:
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-indigo-700 dark:text-indigo-400">
                      {formatCurrency(calculationSummary.taxableTotal)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-indigo-700 dark:text-indigo-400 font-bold">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">
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
          <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Double-Entry Posting Preview
              </span>
              <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Balanced (Dr = Cr)
              </span>
            </h4>

            <div className="border border-slate-200/90 dark:border-[#22232E] rounded-xl overflow-x-auto bg-white dark:bg-[#12131A]">
              <table className="w-full min-w-[560px] text-xs text-left">
                <thead className="bg-slate-50 dark:bg-[#17171B] text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200/90 dark:border-[#22232E]">
                  <tr>
                    <th className="px-3 py-2">Ledger Name</th>
                    <th className="px-3 py-2">Accounting Group</th>
                    <th className="px-3 py-2 text-right">Debit (Dr)</th>
                    <th className="px-3 py-2 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                      <span className="font-bold text-blue-700 dark:text-blue-400 mr-1.5">[Dr.]</span>
                      {selectedClientId
                        ? clients.find((c) => String(c.id) === String(selectedClientId))?.name || "Sundry Debtors Account"
                        : "Sundry Debtors Account"}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Sundry Debtors (Asset)</td>
                    <td className="px-3 py-2 font-mono text-right text-emerald-700 dark:text-emerald-400 font-bold">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">[Cr.]</span>
                      {incomeHead === "ACC_WAREHOUSE_REV"
                        ? "Warehousing & Storage Income"
                        : incomeHead === "ACC_HANDLING_REV"
                        ? "Loading & Material Handling Income"
                        : "General Sales & Service Revenue"}
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Direct Income (Revenue)</td>
                    <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                    <td className="px-3 py-2 font-mono text-right text-indigo-700 dark:text-indigo-400 font-bold">
                      {formatCurrency(calculationSummary.taxableTotal)}
                    </td>
                  </tr>
                  {!calculationSummary.isRcm && !calculationSummary.isExempt && calculationSummary.taxTotal > 0 && (
                    <>
                      {calculationSummary.isIntra ? (
                        <>
                          <tr>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">[Cr.]</span>
                              GST Output CGST
                            </td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Duties & Taxes (Liability)</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-900 dark:text-white">
                              {formatCurrency(calculationSummary.cgstTotal)}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">[Cr.]</span>
                              GST Output SGST
                            </td>
                            <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Duties & Taxes (Liability)</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                            <td className="px-3 py-2 font-mono text-right text-slate-900 dark:text-white">
                              {formatCurrency(calculationSummary.sgstTotal)}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">[Cr.]</span>
                            GST Output IGST
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Duties & Taxes (Liability)</td>
                          <td className="px-3 py-2 font-mono text-right text-slate-400">—</td>
                          <td className="px-3 py-2 font-mono text-right text-slate-900 dark:text-white">
                            {formatCurrency(calculationSummary.igstTotal)}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-[#17171B] font-bold border-t border-slate-200/90 dark:border-[#22232E] text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right">
                      Total Ledger Impact:
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(calculationSummary.netReceivable)}
                    </td>
                    <td className="px-3 py-2 font-mono text-right text-emerald-700 dark:text-emerald-400">
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
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
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
                <span className="text-slate-500 dark:text-slate-400">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{paymentInvoice.voucher_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Billed Customer:</span>
                <span className="font-semibold text-slate-900">{paymentInvoice.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Invoice Value:</span>
                <span className="font-mono text-slate-900">{formatCurrency(paymentInvoice.net_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Currently Paid:</span>
                <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(paymentInvoice.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">Remaining Balance:</span>
                <span className="font-mono font-bold text-amber-700">
                  {formatCurrency(paymentInvoice.balance_amount ?? paymentInvoice.net_amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as "BANK" | "CASH")}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="BANK">Bank Account (NEFT / RTGS / IMPS / Cheque)</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">TDS Deducted (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentTds}
                  onChange={(e) => setPaymentTds(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">TDS Section</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Agreed Discount / Deduction (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentDiscount}
                  onChange={(e) => setPaymentDiscount(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Receipt Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Cheque / UTR / Reference No.</label>
              <input
                type="text"
                placeholder="UTR / Cheque number..."
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono rounded-lg border border-slate-200 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Receipt Narration</label>
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
            <div className="p-4 bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] flex items-center justify-between text-xs shadow-2xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Total Invoice Value</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(selectedVoucher.net_amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Tax Amount</span>
                <span className="font-mono text-slate-900">{formatCurrency(selectedVoucher.tax_amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Outstanding</span>
                <span className="font-mono font-bold text-amber-700">
                  {formatCurrency(selectedVoucher.balance_amount ?? selectedVoucher.net_amount)}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                Double-Entry Ledger Entries
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-[#17171B] text-slate-700 dark:text-slate-300 dark:text-slate-300 font-semibold border-b border-slate-200/90 dark:border-[#22232E]">
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
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
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
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  Customer Settlement History
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-[#17171B] text-slate-700 dark:text-slate-300 dark:text-slate-300 font-semibold border-b border-slate-200/90 dark:border-[#22232E]">
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
      {/* 4. GST Tax Invoice Print Preview Modal (Standard Corporate Format)     */}
      {/* ---------------------------------------------------------------------- */}
      {printInvoice && (
        <GeneralInvoicePrintModal
          isOpen={!!printInvoice}
          onClose={() => setPrintInvoice(null)}
          invoice={printInvoice}
          client={clients.find(
            (c) =>
              c.id === printInvoice.billing_client_id ||
              c.name === printInvoice.party_name
          )}
        />
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">
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
