"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  ShoppingCart,
  Ban,
  CheckCircle,
  AlertCircle,
  Eye,
  Printer,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  Trash2,
  Layers,
  X,
  FileSpreadsheet,
  Fuel,
  Disc,
  Wrench,
  Truck,
  Briefcase,
  Laptop,
  Check,
  Paperclip,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
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

// Indian Rupees Number to Words
function numberToWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
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

interface BillAllocationItem {
  id: number;
  voucher_id: number;
  invoice_id: number;
  allocated_amount: number | string;
  tds_amount: number | string;
  discount_amount: number | string;
  total_settled: number | string;
  adjustment_type: string;
  notes?: string;
  created_at: string;
  voucher_number?: string;
}

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  is_reversal: boolean;
  narration?: string;
}

interface VoucherItemRecord {
  id: number;
  description: string;
  hsn_sac?: string;
  quantity: string | number;
  rate: string | number;
  discount_amount?: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  charge_head_name?: string;
  tax_category_name?: string;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string;
  party_gstin?: string;
  reference_number?: string;
  reference_date?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  paid_amount?: string | number;
  balance_amount?: string | number;
  payment_status?: string;
  gst_treatment?: string;
  itc_eligibility?: string;
  place_of_supply?: string;
  cost_center?: string;
  attachment_url?: string;
  hire_challan_id?: number;
  hire_challan_number?: string;
  vendor_id?: number;
  vendor_name?: string;
  due_date?: string;
  credit_period_days?: number;
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  tax_breakup?: Record<string, any>;
  items?: VoucherItemRecord[];
  ledger_entries: LedgerEntry[];
  bill_allocations?: BillAllocationItem[];
  created_at: string;
}

interface VendorOption {
  id: number;
  name: string;
  gstin?: string;
  state?: string;
  billing_state?: string;
  pan?: string;
  phone?: string;
}

interface HireChallanOption {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  from_location?: string;
  to_location?: string;
  hire_rate?: number;
  net_payable_amount?: number;
}

interface TaxCategoryOption {
  id: number;
  name: string;
  code: string;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
}

interface LineItemForm {
  id: string;
  description: string;
  hsn_sac: string;
  quantity: string;
  rate: string;
  discount_amount: string;
  tax_category_id: string;
}

export default function PurchasesPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryOption[]>([]);
  const [hireChallans, setHireChallans] = useState<HireChallanOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<boolean>(false);
  const [isHealingSchema, setIsHealingSchema] = useState<boolean>(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedGstTreatment, setSelectedGstTreatment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Series Master
  const [normalSeries, setNormalSeries] = useState<any>(null);
  const [generalSeries, setGeneralSeries] = useState<any>(null);

  // Drawer 1: Record Purchase Bill
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseCategory, setPurchaseCategory] = useState<string>("SPARES");
  const [purchaseType, setPurchaseType] = useState<"NORMAL_PURCHASE" | "GENERAL_PURCHASE">("NORMAL_PURCHASE");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [manualVendorName, setManualVendorName] = useState<string>("");
  const [vendorGstin, setVendorGstin] = useState<string>("");
  const [vendorState, setVendorState] = useState<string>("");
  const [billNumber, setBillNumber] = useState<string>("");
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [creditPeriodDays, setCreditPeriodDays] = useState<string>("30");
  const [gstTreatment, setGstTreatment] = useState<string>("FCM");
  const [itcEligibility, setItcEligibility] = useState<string>("ELIGIBLE");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState<string>("");
  const [linkedHireChallanId, setLinkedHireChallanId] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [narration, setNarration] = useState<string>("");

  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      id: "line-1",
      description: "",
      hsn_sac: "9967",
      quantity: "1",
      rate: "",
      discount_amount: "0",
      tax_category_id: "",
    },
  ]);

  // Drawer 2: Pay Supplier
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<VoucherRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<"BANK" | "CASH">("BANK");
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [tdsSection, setTdsSection] = useState<string>("NONE");
  const [tdsRate, setTdsRate] = useState<string>("0");
  const [tdsAmount, setTdsAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [paymentNarration, setPaymentNarration] = useState<string>("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Drawer 3: View Ledger
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Modal 4: Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printBill, setPrintBill] = useState<VoucherRecord | null>(null);

  // Modal 5: Void Voucher
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidVoucherNumber, setVoidVoucherNumber] = useState<string>("");
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const activeSeries = purchaseType === "NORMAL_PURCHASE" ? normalSeries : generalSeries;

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSchemaError(false);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";

      const [normalRes, generalRes, sNorm, sGen, vendorsRes, tcRes, hcRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=NORMAL_PURCHASE"),
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=GENERAL_PURCHASE"),
        apiClient<any>(`/api/v1/settings/series/check/NORMAL_PURCHASE${officeParam}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/check/GENERAL_PURCHASE${officeParam}`).catch(() => null),
        apiClient<VendorOption[]>("/api/v1/general/vendors").catch(() => []),
        apiClient<TaxCategoryOption[]>("/api/v1/misc/tax-categories").catch(() => []),
        apiClient<HireChallanOption[]>("/api/v1/transport/hire-challans").catch(() => []),
      ]);

      const combined = [...(normalRes || []), ...(generalRes || [])].sort(
        (a, b) => new Date(b.created_at || b.voucher_date).getTime() - new Date(a.created_at || a.voucher_date).getTime()
      );

      setData(combined);
      setNormalSeries(sNorm);
      setGeneralSeries(sGen);
      setVendors(vendorsRes || []);
      setTaxCategories(tcRes || []);
      setHireChallans(hcRes || []);

      if (tcRes && tcRes.length > 0 && !lineItems[0].tax_category_id) {
        const default18 = tcRes.find((t) => Number(t.igst_rate) === 18) || tcRes[0];
        if (default18) {
          setLineItems((prev) => prev.map((l) => ({ ...l, tax_category_id: String(default18.id) })));
        }
      }
    } catch (err: any) {
      const msg = err.message || "Failed to load purchase records.";
      if (msg.includes("does not exist") || msg.includes("due_date") || msg.includes("column")) {
        setSchemaError(true);
      }
      if (msg.includes("does not exist") || msg.includes("due_date") || msg.includes("column") || msg.includes("ProgrammingError")) {
        setSchemaError(true);
        setErrorMessage("Database schema update required. Please click 'Sync Schema & Retry' to automatically heal missing fields.");
      } else if (msg.includes("name '") || msg.includes("Traceback") || msg.includes("Exception") || msg.includes("500")) {
        setErrorMessage("Unable to load purchase records due to a server response error. Please refresh or click Sync Schema.");
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncSchema = async () => {
    setIsHealingSchema(true);
    try {
      await apiClient("/api/v1/accounts/sync-tally-schema", { method: "POST" });
      toast.success("Database schema synchronized successfully!");
      setSchemaError(false);
      await loadData();
    } catch (err: any) {
      toast.error("Schema synchronization failed: " + err.message);
    } finally {
      setIsHealingSchema(false);
    }
  };

  // Vendor selection auto-fill
  const handleVendorSelect = (vendId: string) => {
    setSelectedVendorId(vendId);
    if (!vendId) {
      setVendorGstin("");
      setVendorState("");
      return;
    }
    const found = vendors.find((v) => String(v.id) === vendId);
    if (found) {
      setVendorGstin(found.gstin || "");
      const st = found.state || found.billing_state || "";
      setVendorState(st);
      if (!placeOfSupply) {
        setPlaceOfSupply(st);
      }
    }
  };

  // Category change handling
  const handleCategoryChange = (cat: string) => {
    setPurchaseCategory(cat);
    if (["OFFICE_ADMIN", "EQUIPMENT"].includes(cat)) {
      setPurchaseType("GENERAL_PURCHASE");
    } else {
      setPurchaseType("NORMAL_PURCHASE");
    }

    // Default SAC/HSN based on category
    const defaultSacMap: Record<string, string> = {
      FUEL: "271019",
      TYRES: "40112000",
      SPARES: "87083000",
      MAINTENANCE: "998729",
      TRUCK_HIRE: "996511",
      TOLL: "996799",
      OFFICE_ADMIN: "998311",
      EQUIPMENT: "84713010",
      OTHER: "9967",
    };
    const newSac = defaultSacMap[cat] || "9967";
    setLineItems((prev) => prev.map((l) => (l.hsn_sac === "9967" ? { ...l, hsn_sac: newSac } : l)));
  };

  // Line item manipulation
  const addLineItem = () => {
    const defaultTc = taxCategories.find((t) => Number(t.igst_rate) === 18) || taxCategories[0];
    setLineItems([
      ...lineItems,
      {
        id: `line-${Date.now()}`,
        description: "",
        hsn_sac: "9967",
        quantity: "1",
        rate: "",
        discount_amount: "0",
        tax_category_id: defaultTc ? String(defaultTc.id) : "",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((l) => l.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItemForm, val: string) => {
    setLineItems(lineItems.map((l) => (l.id === id ? { ...l, [field]: val } : l)));
  };

  // Calculations for current draft
  const calculatedTotals = useMemo(() => {
    let taxable = 0;
    let tax = 0;
    const isExempt = ["EXEMPT", "NIL_RATED"].includes(gstTreatment);

    lineItems.forEach((l) => {
      const q = parseFloat(l.quantity) || 0;
      const r = parseFloat(l.rate) || 0;
      const d = parseFloat(l.discount_amount) || 0;
      const lineTaxable = Math.max(0, q * r - d);
      taxable += lineTaxable;

      if (!isExempt) {
        const tc = taxCategories.find((t) => String(t.id) === l.tax_category_id);
        if (tc) {
          const ratePct = Number(tc.igst_rate) || Number(tc.cgst_rate) + Number(tc.sgst_rate) || 0;
          tax += (lineTaxable * ratePct) / 100;
        }
      }
    });

    const isRcm = gstTreatment === "RCM";
    const net = isRcm ? taxable : taxable + tax;

    // Place of supply test: check against issuing office
    const activeOffice = getActiveOffice();
    const branchState = activeOffice?.state?.trim().toUpperCase() || "";
    const supState = (vendorState || placeOfSupply || "").trim().toUpperCase();
    const isInterstate = Boolean(branchState && supState && branchState !== supState);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = tax;
    } else {
      cgst = tax / 2;
      sgst = tax / 2;
    }

    return {
      taxable,
      tax,
      net,
      cgst,
      sgst,
      igst,
      isInterstate,
      isRcm,
      isExempt,
    };
  }, [lineItems, gstTreatment, taxCategories, vendorState, placeOfSupply]);

  // Create Purchase Bill handler
  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeries?.configured || !activeSeries?.next_number_formatted) {
      toast.error(
        "Purchase Bill cannot be recorded because no sequence series is configured for this issuing office. Please check Settings > Series Master."
      );
      return;
    }

    const party = selectedVendorId
      ? vendors.find((v) => String(v.id) === selectedVendorId)?.name
      : manualVendorName.trim();

    if (!party) {
      toast.warning("Please choose a supplier / vendor from the list or enter the vendor name.");
      return;
    }

    if (!billNumber.trim()) {
      toast.warning("Please enter the supplier's bill / invoice number.");
      return;
    }

    if (calculatedTotals.taxable <= 0) {
      toast.warning("Total bill taxable amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        vendor_id: selectedVendorId ? parseInt(selectedVendorId, 10) : undefined,
        party_name: party,
        party_gstin: vendorGstin.trim() || undefined,
        vendor_state: vendorState.trim() || undefined,
        purchase_type: purchaseType,
        purchase_category: purchaseCategory,
        voucher_number: activeSeries.next_number_formatted,
        voucher_date: billDate,
        credit_period_days: parseInt(creditPeriodDays, 10) || 30,
        bill_number: billNumber.trim(),
        bill_date: billDate,
        gst_treatment: gstTreatment,
        itc_eligibility: itcEligibility,
        place_of_supply: placeOfSupply.trim() || undefined,
        hire_challan_id: linkedHireChallanId ? parseInt(linkedHireChallanId, 10) : undefined,
        vehicle_number: vehicleNumber.trim() || undefined,
        cost_center: vehicleNumber.trim() || undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        narration: narration.trim() || undefined,
        items: lineItems.map((l) => ({
          description: l.description.trim() || `${purchaseCategory} Purchase`,
          hsn_sac: l.hsn_sac.trim() || "9967",
          quantity: parseFloat(l.quantity) || 1,
          rate: parseFloat(l.rate) || 0,
          discount_amount: parseFloat(l.discount_amount) || 0,
          tax_category_id: l.tax_category_id ? parseInt(l.tax_category_id, 10) : undefined,
        })),
      };

      await apiClient("/api/v1/accounts/purchases", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Purchase Bill recorded and posted to double-entry ledger!");
      setSuccessMessage(`Purchase Bill ${billNumber} recorded successfully under Voucher #${activeSeries.next_number_formatted}`);
      setIsCreateOpen(false);

      // Reset form
      setBillNumber("");
      setSelectedVendorId("");
      setManualVendorName("");
      setVendorGstin("");
      setVendorState("");
      setVehicleNumber("");
      setLinkedHireChallanId("");
      setAttachmentUrl("");
      setNarration("");
      setLineItems([
        {
          id: "line-1",
          description: "",
          hsn_sac: "9967",
          quantity: "1",
          rate: "",
          discount_amount: "0",
          tax_category_id: taxCategories[0] ? String(taxCategories[0].id) : "",
        },
      ]);

      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record purchase bill.");
      setErrorMessage(err.message || "Failed to record purchase bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Payment Drawer
  const handleOpenPayment = (row: VoucherRecord) => {
    setPaymentBill(row);
    const bal = row.balance_amount !== undefined ? Number(row.balance_amount) : Number(row.net_amount);
    setPaymentAmount(String(bal > 0 ? bal : ""));
    setPaymentRefNumber("");
    setTdsSection("NONE");
    setTdsRate("0");
    setTdsAmount("0");
    setDiscountAmount("0");
    setPaymentNarration(`Payment against Bill ${row.reference_number || row.voucher_number}`);
    setIsPaymentOpen(true);
  };

  // Recalculate TDS on section or rate change
  const handleTdsSectionChange = (sec: string) => {
    setTdsSection(sec);
    let r = 0;
    if (sec === "194C_1") r = 1;
    else if (sec === "194C_2") r = 2;
    else if (sec === "194J_2") r = 2;
    else if (sec === "194J_10") r = 10;
    else if (sec === "194Q") r = 0.1;

    setTdsRate(String(r));
    const bal = paymentBill?.balance_amount !== undefined ? Number(paymentBill.balance_amount) : Number(paymentBill?.net_amount || 0);
    const taxable = paymentBill?.total_amount ? Number(paymentBill.total_amount) : bal;
    const computedTds = r > 0 ? (taxable * r) / 100 : 0;
    setTdsAmount(computedTds.toFixed(2));
    const netCash = Math.max(0, bal - computedTds - (parseFloat(discountAmount) || 0));
    setPaymentAmount(netCash.toFixed(2));
  };

  // Record Payment Submit
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentBill) return;

    const pAmt = parseFloat(paymentAmount) || 0;
    const tAmt = parseFloat(tdsAmount) || 0;
    const dAmt = parseFloat(discountAmount) || 0;
    const totalSettling = pAmt + tAmt + dAmt;

    const bal = paymentBill.balance_amount !== undefined ? Number(paymentBill.balance_amount) : Number(paymentBill.net_amount);

    if (totalSettling <= 0) {
      toast.warning("Payment settlement amount must be greater than zero.");
      return;
    }

    if (totalSettling > bal + 0.05) {
      toast.error(`Total settlement (₹${totalSettling.toFixed(2)}) cannot exceed remaining bill balance (₹${bal.toFixed(2)}).`);
      return;
    }

    setIsRecordingPayment(true);
    setErrorMessage(null);
    try {
      await apiClient(`/api/v1/accounts/purchases/${paymentBill.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: pAmt,
          payment_date: paymentDate,
          payment_mode: paymentMode,
          reference_number: paymentRefNumber.trim() || undefined,
          tds_section: tdsSection !== "NONE" ? tdsSection.split("_")[0] : undefined,
          tds_rate: parseFloat(tdsRate) || 0,
          tds_amount: tAmt,
          discount_amount: dAmt,
          narration: paymentNarration.trim() || undefined,
        }),
      });

      toast.success("Supplier payment posted and bill balance updated!");
      setSuccessMessage(`Payment of ₹${pAmt.toFixed(2)} recorded against Bill ${paymentBill.reference_number || paymentBill.voucher_number}`);
      setIsPaymentOpen(false);
      setPaymentBill(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Void Purchase
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
      toast.success(`Purchase Voucher #${voidVoucherNumber} has been voided with reversing entries.`);
      setIsVoidOpen(false);
      setVoidReason("");
      setVoidVoucherId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void purchase voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.warning("No purchase records to export.");
      return;
    }

    const headers = [
      "Voucher Number",
      "Voucher Date",
      "Supplier Bill No",
      "Bill Date",
      "Supplier Name",
      "Supplier GSTIN",
      "Category",
      "Vehicle No",
      "Taxable Amount",
      "GST Tax",
      "Total Bill Amount",
      "Amount Paid",
      "Amount Left to Pay",
      "Payment Status",
      "ITC Status",
    ];

    const rows = filteredData.map((r) => [
      r.voucher_number,
      r.voucher_date,
      r.reference_number || "",
      r.reference_date || "",
      `"${r.party_name || "Direct Vendor"}"`,
      r.party_gstin || "",
      r.tax_breakup?.purchase_category || (r.voucher_type === "NORMAL_PURCHASE" ? "Operational" : "General"),
      r.cost_center || "",
      Number(r.total_amount).toFixed(2),
      Number(r.tax_amount).toFixed(2),
      Number(r.net_amount).toFixed(2),
      Number(r.paid_amount || 0).toFixed(2),
      Number(r.balance_amount !== undefined ? r.balance_amount : r.net_amount).toFixed(2),
      r.payment_status || "UNPAID",
      r.itc_eligibility || "ELIGIBLE",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PantherTMS_Purchase_Register_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Purchase Register exported to CSV successfully.");
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totGross = 0;
    let totPaid = 0;
    let totBal = 0;
    let totItc = 0;

    data.forEach((d) => {
      if (d.is_void) return;
      const net = Number(d.net_amount) || 0;
      const paid = Number(d.paid_amount) || 0;
      const bal = d.balance_amount !== undefined ? Number(d.balance_amount) : net;
      const tax = Number(d.tax_amount) || 0;

      totGross += net;
      totPaid += paid;
      totBal += bal;
      if (d.itc_eligibility !== "INELIGIBLE") {
        totItc += tax;
      }
    });

    return { totGross, totPaid, totBal, totItc, count: data.filter((d) => !d.is_void).length };
  }, [data]);

  // Filtering
  const filteredData = useMemo(() => {
    return data.filter((v) => {
      // Category filter
      if (selectedCategory !== "ALL") {
        const cat = v.tax_breakup?.purchase_category || (v.voucher_type === "NORMAL_PURCHASE" ? "SPARES" : "OFFICE_ADMIN");
        if (cat !== selectedCategory) return false;
      }

      // Status filter
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "VOIDED" && !v.is_void) return false;
        if (selectedStatus !== "VOIDED") {
          if (v.is_void) return false;
          const status = v.payment_status || "UNPAID";
          if (status !== selectedStatus) return false;
        }
      }

      // GST Treatment
      if (selectedGstTreatment !== "ALL") {
        if (v.gst_treatment !== selectedGstTreatment) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vNum = (v.voucher_number || "").toLowerCase();
        const pName = (v.party_name || "").toLowerCase();
        const refNo = (v.reference_number || "").toLowerCase();
        const veh = (v.cost_center || "").toLowerCase();
        if (!vNum.includes(q) && !pName.includes(q) && !refNo.includes(q) && !veh.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedCategory, selectedStatus, selectedGstTreatment, searchQuery]);

  // Table Columns
  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "reference_number",
      header: "Bill # & Date",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              {row.reference_number || "Direct Bill"}
            </span>
            {row.is_void ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] rounded">
                VOIDED
              </span>
            ) : (
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-[#F2F4F7] px-1 rounded">
                {row.voucher_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Bill Date: {row.reference_date || row.voucher_date}</span>
            {row.due_date && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                Due: {row.due_date}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "party_name",
      header: "Who did you buy from? (Supplier)",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-slate-900 dark:text-white block">
            {row.party_name || "Direct Supplier"}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            {row.party_gstin ? (
              <span className="font-mono bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200">
                GSTIN: {row.party_gstin}
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-600 px-1 rounded">Unregistered</span>
            )}
            {row.place_of_supply && <span>({row.place_of_supply})</span>}
          </div>
        </div>
      ),
    },
    {
      key: "voucher_type",
      header: "What was purchased?",
      cell: (row) => {
        const cat = row.tax_breakup?.purchase_category || (row.voucher_type === "NORMAL_PURCHASE" ? "SPARES" : "OFFICE_ADMIN");
        const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
          FUEL: { label: "Fuel & Diesel", icon: Fuel, color: "bg-amber-50 text-amber-800 border-amber-200" },
          TYRES: { label: "Tyres & Tubes", icon: Disc, color: "bg-purple-50 text-purple-800 border-purple-200" },
          SPARES: { label: "Spare Parts", icon: Wrench, color: "bg-blue-50 text-blue-800 border-blue-200" },
          MAINTENANCE: { label: "Vehicle Repairs", icon: Wrench, color: "bg-orange-50 text-orange-800 border-orange-200" },
          TRUCK_HIRE: { label: "Truck Hire", icon: Truck, color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
          TOLL: { label: "Toll / FASTag", icon: Truck, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
          OFFICE_ADMIN: { label: "Office & Admin", icon: Briefcase, color: "bg-gray-50 text-gray-800 border-gray-200" },
          EQUIPMENT: { label: "Equipment / GPS", icon: Laptop, color: "bg-cyan-50 text-cyan-800 border-cyan-200" },
        };
        const config = categoryLabels[cat] || { label: cat, icon: ShoppingCart, color: "bg-gray-50 text-gray-700 border-gray-200" };
        const IconComponent = config.icon;

        return (
          <div className="space-y-1">
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border", config.color)}>
              <IconComponent className="w-3 h-3" />
              {config.label}
            </span>
            {row.cost_center && (
              <span className="block font-mono text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                Truck: {row.cost_center}
              </span>
            )}
            {row.hire_challan_id && (
              <span className="block text-[10px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded w-fit">
                Hire Challan #{row.hire_challan_id}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "net_amount",
      header: "Bill Amount & ITC",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block tabular-nums">
            ₹{Number(row.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
            <span>Taxable: ₹{Number(row.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span className="ml-1 text-purple-700">| Tax: ₹{Number(row.tax_amount).toFixed(2)}</span>
          </div>
          {row.itc_eligibility === "INELIGIBLE" ? (
            <span className="text-[9px] font-bold text-[#B42318] bg-[#FEF3F2] px-1 rounded border border-[#FECDCA]">
              Blocked ITC u/s 17(5)
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
              Eligible ITC
            </span>
          )}
        </div>
      ),
    },
    {
      key: "balance_amount",
      header: "Amount Paid & Left to Pay",
      isNumeric: true,
      sortable: true,
      cell: (row) => {
        const net = Number(row.net_amount) || 0;
        const paid = Number(row.paid_amount) || 0;
        const bal = row.balance_amount !== undefined ? Number(row.balance_amount) : Math.max(0, net - paid);
        const status = row.payment_status || (bal <= 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "UNPAID");

        const statusBadges: Record<string, { label: string; variant: "success" | "warning" | "error" | "neutral" | "primary" }> = {
          PAID: { label: "Fully Paid", variant: "success" },
          PARTIALLY_PAID: { label: `Part Paid (₹${paid.toFixed(0)})`, variant: "primary" },
          UNPAID: { label: "Unpaid", variant: "warning" },
          VOID: { label: "Voided", variant: "error" },
        };
        const sb = statusBadges[status] || { label: status, variant: "neutral" };

        return (
          <div>
            <div className="flex items-center justify-end gap-1.5">
              <span className={cn("font-mono font-bold text-xs tabular-nums", bal > 0 ? "text-[#B42318]" : "text-emerald-700")}>
                ₹{bal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Left to Pay |</span>
              <StatusBadge status={sb.variant} className="text-[9px] px-1 py-0">
                {sb.label}
              </StatusBadge>
            </div>
          </div>
        );
      },
    },
  ];

  // Table Row Actions
  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "Pay Supplier",
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" />,
      hidden: (row) => row.is_void || (row.balance_amount !== undefined && Number(row.balance_amount) <= 0),
      onClick: (row) => handleOpenPayment(row),
    },
    {
      label: "View Ledger Impact",
      icon: <Eye className="w-3.5 h-3.5 text-indigo-600" />,
      onClick: (row) => {
        setSelectedVoucher(row);
        setIsLedgerOpen(true);
      },
    },
    {
      label: "Print Purchase Voucher",
      icon: <Printer className="w-3.5 h-3.5 text-gray-700" />,
      onClick: (row) => {
        setPrintBill(row);
        setIsPrintModalOpen(true);
      },
    },
    {
      label: "Void Purchase Bill",
      icon: <Ban className="w-3.5 h-3.5 text-red-600" />,
      variant: "danger",
      hidden: (row) => row.is_void,
      onClick: (row) => {
        setVoidVoucherId(row.id);
        setVoidVoucherNumber(row.voucher_number);
        setIsVoidOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Accounts", href: "/accounts" },
          { label: "Purchase Register" },
        ]}
        title="Purchase Register (Supplier Bills & Expenses)"
        description="Record and track operational purchases (fuel, tyres, spare parts, vehicle repairs, fleet overheads) with automated GST ITC tracking and Tally-style double-entry bookkeeping."
        primaryAction={{
          label: "Add Purchase Bill",
          icon: Plus,
          onClick: () => setIsCreateOpen(true),
        }}
        secondaryActions={[
          {
            label: "Export Register (CSV)",
            icon: FileSpreadsheet,
            onClick: handleExportCSV,
          },
        ]}
      />

      {/* Series Warning Banner */}
      {!activeSeries?.configured && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Series Warning:</strong> No sequence series is configured for Purchase Bills (NP/GP). Please configure under Settings &gt; Series Master.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open("/settings/series-master", "_blank")}>
            Configure Series
          </Button>
        </div>
      )}

      {/* Database Schema Sync Banner if required */}
      {schemaError && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Database Column Notice:</strong> Missing bookkeeping columns detected on the server.
            </span>
          </div>
          <Button variant="primary" size="sm" onClick={handleSyncSchema} isLoading={isHealingSchema}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Sync Schema & Retry
          </Button>
        </div>
      )}

      {/* Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Purchases"
          value={`₹${summaryMetrics.totGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Total vendor expenditure billed"
          badge={<span className="text-[11px] text-slate-500 font-medium">({summaryMetrics.count} Bills)</span>}
          icon={<ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
        />
        <KpiCard
          title="Amount Paid"
          value={`₹${summaryMetrics.totPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Settled via bank transfer / cash"
          icon={<CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-700 dark:text-emerald-400 font-medium" />}
        />
        <KpiCard
          title="Amount Left to Pay"
          value={`₹${summaryMetrics.totBal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Sundry Creditors outstanding liabilities"
          icon={<TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
        />
        <KpiCard
          title="Eligible Input GST (ITC)"
          value={`₹${summaryMetrics.totItc.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          subtext="Claimable against output GST liabilities"
          icon={<ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
        />
      </div>
      {/* Messages */}
      {errorMessage && (
        <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs rounded-lg font-medium flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-[#B42318] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] text-xs rounded-lg font-medium flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-[#027A48] hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-1">Purchase Category:</span>
          {[
            { id: "ALL", label: "All Purchases" },
            { id: "FUEL", label: "Fuel & Diesel" },
            { id: "TYRES", label: "Tyres & Tubes" },
            { id: "SPARES", label: "Spare Parts" },
            { id: "MAINTENANCE", label: "Vehicle Repairs" },
            { id: "TRUCK_HIRE", label: "Truck Hire" },
            { id: "OFFICE_ADMIN", label: "Office & Admin" },
            { id: "EQUIPMENT", label: "Equipment / GPS" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium transition-all shadow-2xs",
                selectedCategory === cat.id
                  ? "bg-[#4F46E5] text-white shadow-xs font-semibold"
                  : "bg-slate-100 dark:bg-[#202025] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#26262D]"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-[#303036]">
          <div className="flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search by vendor, bill #, voucher #, or truck registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-10 px-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="UNPAID">Unpaid (Full Amount Left)</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
              <option value="VOIDED">Voided / Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">GST Type:</span>
            <select
              value={selectedGstTreatment}
              onChange={(e) => setSelectedGstTreatment(e.target.value)}
              className="h-10 px-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            >
              <option value="ALL">All GST Types</option>
              <option value="FCM">Regular (FCM)</option>
              <option value="RCM">Reverse Charge (RCM)</option>
              <option value="EXEMPT">Exempt / Non-GST</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        searchPlaceholder="Filter records..."
        actions={actions}
        emptyMessage="No purchase bills found"
        emptySubtext="Click 'Add Purchase Bill' above to record vendor bills and automatically post double-entry ledger entries."
        emptyAction={{ label: "Add Purchase Bill", onClick: () => setIsCreateOpen(true) }}
      />

      {/* -------------------------------------------------------------------------- */}
      {/* DRAWER 1: Record Purchase Bill                                             */}
      {/* -------------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Purchase Bill"
        subtitle="Log vendor invoice, calculate Input GST, and post double-entry ledger impact"
        size="lg"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-6 pb-20">
          {/* Step 1: Who did you buy from? */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">1. Who did you buy from? (Supplier / Vendor)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Select Supplier / Vendor *</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                >
                  <option value="">-- Choose from existing Vendors / Suppliers --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {v.gstin ? `(${v.gstin})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedVendorId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Or Enter Vendor Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Tyres Agency, Bharat Petroleum"
                    value={manualVendorName}
                    onChange={(e) => setManualVendorName(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAACM1234F1Z5"
                  value={vendorGstin}
                  onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Supplier State / Origin</label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra, Gujarat, Delhi"
                  value={vendorState}
                  onChange={(e) => setVendorState(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-[#303036]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Supplier Bill / Invoice # *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-9901, BILL/2026/04"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Bill Date *</label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Credit Terms (Days)</label>
                <select
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                >
                  <option value="0">Immediate / Cash</option>
                  <option value="15">15 Days</option>
                  <option value="30">30 Days (Standard)</option>
                  <option value="45">45 Days</option>
                  <option value="60">60 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: What did you purchase? */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3">
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">2. What did you purchase? (Expense Classification)</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: "FUEL", label: "Fuel & Diesel", icon: Fuel },
                { id: "TYRES", label: "Tyres & Tubes", icon: Disc },
                { id: "SPARES", label: "Spare Parts", icon: Wrench },
                { id: "MAINTENANCE", label: "Vehicle Repairs", icon: Wrench },
                { id: "TRUCK_HIRE", label: "Truck Hire Freight", icon: Truck },
                { id: "TOLL", label: "Toll & FASTag", icon: Truck },
                { id: "OFFICE_ADMIN", label: "Office Supplies", icon: Briefcase },
                { id: "EQUIPMENT", label: "Hardware & GPS", icon: Laptop },
              ].map((c) => {
                const IconComp = c.icon;
                const isSel = purchaseCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all",
                      isSel
                        ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm"
                        : "bg-white border-[#E4E7EC] text-slate-600 dark:text-slate-400 hover:bg-gray-50"
                    )}
                  >
                    <IconComp className={cn("w-4 h-4 shrink-0", isSel ? "text-indigo-600" : "text-slate-500 dark:text-slate-400")} />
                    <span className="text-xs font-semibold">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-[#303036]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Link to Vehicle (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MH-04-AB-1234, DL-01-AA-9999"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono uppercase font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Allocates expense to vehicle cost centre</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Link to Hire Challan (Optional)</label>
                <select
                  value={linkedHireChallanId}
                  onChange={(e) => setLinkedHireChallanId(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                >
                  <option value="">-- None (Direct Purchase) --</option>
                  {hireChallans.map((hc) => (
                    <option key={hc.id} value={hc.id}>
                      {hc.challan_number} | {hc.vehicle_number} | ₹{hc.net_payable_amount || hc.hire_rate}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-emerald-700 mt-0.5 block">Prevents duplicate liability in Master Ledger</span>
              </div>
            </div>
          </div>

          {/* Step 3: Items & Amount */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#303036] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">3. What did it cost? (Line Items & Rates)</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="p-3.5 bg-slate-50/70 dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Item #{idx + 1}</span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">Description *</label>
                      <input
                        type="text"
                        required
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                        className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">HSN / SAC</label>
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsn_sac}
                        onChange={(e) => updateLineItem(item.id, "hsn_sac", e.target.value)}
                        className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                        className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">Rate (₹) *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => updateLineItem(item.id, "rate", e.target.value)}
                        className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">GST Rate</label>
                      <select
                        value={item.tax_category_id}
                        onChange={(e) => updateLineItem(item.id, "tax_category_id", e.target.value)}
                        className="w-full h-9 px-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      >
                        {taxCategories.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.igst_rate}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Summary Card */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Taxable Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{calculatedTotals.taxable.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>
                  Total GST Tax ({calculatedTotals.isInterstate ? "IGST" : "CGST + SGST"}):
                </span>
                <span className="text-purple-700">₹{calculatedTotals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-indigo-200">
                <span>Total Net Bill Payable:</span>
                <span className="text-indigo-900">₹{calculatedTotals.net.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Step 4: GST & Accounting Live Preview */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">4. GST & Accounting Impact (Double-Entry Preview)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">GST Treatment</label>
                <select
                  value={gstTreatment}
                  onChange={(e) => setGstTreatment(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                >
                  <option value="FCM">Regular Purchase (FCM)</option>
                  <option value="RCM">Reverse Charge (RCM - Inward)</option>
                  <option value="EXEMPT">Exempt / Non-GST Supply</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">ITC Eligibility (Sec 17(5))</label>
                <select
                  value={itcEligibility}
                  onChange={(e) => setItcEligibility(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                >
                  <option value="ELIGIBLE">Eligible for Input Tax Credit</option>
                  <option value="INELIGIBLE">Ineligible / Blocked u/s 17(5)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Place of Supply (State)</label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Live Double-Entry Tally Preview */}
            <div className="p-4 bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#303036] pb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 font-bold">Tally Double-Entry Journal Preview:</span>
                <span className="text-[10px] text-slate-400">Voucher #{activeSeries?.next_number_formatted || "PENDING"}</span>
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>Dr. {purchaseCategory} Expense Account</span>
                  <span>₹{(itcEligibility === "INELIGIBLE" ? calculatedTotals.net : calculatedTotals.taxable).toFixed(2)}</span>
                </div>
                {itcEligibility !== "INELIGIBLE" && calculatedTotals.tax > 0 && (
                  <>
                    {calculatedTotals.isInterstate ? (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                        <span>Dr. GST Input IGST Account</span>
                        <span>₹{calculatedTotals.igst.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                          <span>Dr. GST Input CGST Account</span>
                          <span>₹{calculatedTotals.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                          <span>Dr. GST Input SGST Account</span>
                          <span>₹{calculatedTotals.sgst.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {calculatedTotals.isRcm && calculatedTotals.tax > 0 && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium">
                    <span>Cr. GST RCM Output Liability A/c</span>
                    <span>₹{calculatedTotals.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-indigo-900 dark:text-indigo-300 border-t border-slate-200 dark:border-[#303036] pt-1.5 font-bold">
                  <span>
                    Cr. Supplier Account ({selectedVendorId ? vendors.find((v) => String(v.id) === selectedVendorId)?.name : manualVendorName || "Vendor"})
                  </span>
                  <span>₹{calculatedTotals.net.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Remarks & Attachment */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3">
              <Paperclip className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">5. Bill Notes & Invoice Attachment (Optional)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Bill Narration</label>
                <textarea
                  rows={2}
                  placeholder="Notes, driver delivery reference, or work order notes..."
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Invoice Attachment URL / Link</label>
                <input
                  type="text"
                  placeholder="https://... or doc URL"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">Cloud attachment link for supplier PDF/photo</span>
              </div>
            </div>
          </div>

          <FormActionBar
            actions={[
              {
                label: "Cancel",
                variant: "outline",
                onClick: () => setIsCreateOpen(false),
              },
              {
                label: "Confirm & Post Purchase Bill",
                variant: "primary",
                type: "submit",
                isLoading: isSubmitting,
              },
            ]}
          />
        </form>
      </EntityDrawer>

      {/* -------------------------------------------------------------------------- */}
      {/* DRAWER 2: Pay Supplier                                                     */}
      {/* -------------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        title="Pay Supplier (Payment Voucher)"
        subtitle={`Record disbursement for Bill #${paymentBill?.reference_number || paymentBill?.voucher_number}`}
        size="md"
      >
        <form onSubmit={handleRecordPaymentSubmit} className="space-y-5 pb-20">
          {paymentBill && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Supplier:</span>
                <span className="font-bold text-slate-900 dark:text-white">{paymentBill.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Bill Amount:</span>
                <span className="font-mono font-semibold">₹{Number(paymentBill.net_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Already Paid:</span>
                <span className="font-mono text-emerald-700">₹{Number(paymentBill.paid_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-indigo-200 font-bold text-sm">
                <span className="text-indigo-950">Amount Left to Pay:</span>
                <span className="text-rose-700 font-mono">
                  ₹{Number(paymentBill.balance_amount !== undefined ? paymentBill.balance_amount : paymentBill.net_amount).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Disbursement Amount (from Bank / Cash) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-[#D0D5DD] rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as "BANK" | "CASH")}
                className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
              >
                <option value="BANK">Bank Transfer (NEFT / RTGS / Cheque)</option>
                <option value="CASH">Cash-in-hand</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Payment Date *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Transaction Ref # (UTR / Cheque No.)</label>
            <input
              type="text"
              placeholder="e.g. UTR-HDFC-991204"
              value={paymentRefNumber}
              onChange={(e) => setPaymentRefNumber(e.target.value)}
              className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          {/* TDS Deduction Options */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-semibold block">TDS Deduction (Income Tax)</span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">TDS Section</label>
                <select
                  value={tdsSection}
                  onChange={(e) => handleTdsSectionChange(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="NONE">No TDS Deduction</option>
                  <option value="194C_1">Sec 194C (1% - Individual Contractor)</option>
                  <option value="194C_2">Sec 194C (2% - Company Contractor)</option>
                  <option value="194J_2">Sec 194J (2% - Technical Service)</option>
                  <option value="194J_10">Sec 194J (10% - Professional Service)</option>
                  <option value="194Q">Sec 194Q (0.1% - Purchase of Goods)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">TDS Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={tdsAmount}
                  onChange={(e) => setTdsAmount(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Cash Discount Received (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full h-9 px-3 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex justify-between pt-1 border-t border-gray-200">
              <span>Total Bill Liability Settled:</span>
              <span className="font-bold text-indigo-900">
                ₹{((parseFloat(paymentAmount) || 0) + (parseFloat(tdsAmount) || 0) + (parseFloat(discountAmount) || 0)).toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Payment Narration</label>
            <input
              type="text"
              value={paymentNarration}
              onChange={(e) => setPaymentNarration(e.target.value)}
              className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <FormActionBar
            actions={[
              {
                label: "Cancel",
                variant: "outline",
                onClick: () => setIsPaymentOpen(false),
              },
              {
                label: "Post Payment Voucher",
                variant: "primary",
                type: "submit",
                isLoading: isRecordingPayment,
              },
            ]}
          />
        </form>
      </EntityDrawer>

      {/* -------------------------------------------------------------------------- */}
      {/* DRAWER 3: View Ledger Impact                                               */}
      {/* -------------------------------------------------------------------------- */}
      <EntityDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        title={`Ledger Postings: ${selectedVoucher?.voucher_number || ""}`}
        subtitle="Double-entry journal verification and settlement history"
        size="md"
      >
        {selectedVoucher && (
          <div className="space-y-5 pb-16">
            <div className="p-4 bg-slate-50 dark:bg-[#101013] border border-slate-200/90 dark:border-[#303036] rounded-2xl space-y-2 text-xs shadow-2xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Supplier / Vendor:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedVoucher.party_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Supplier Bill Reference:</span>
                <span className="font-mono font-bold">{selectedVoucher.reference_number || "Direct"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Voucher Date:</span>
                <span>{selectedVoucher.voucher_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Net Amount:</span>
                <span className="font-mono font-bold text-indigo-900">₹{Number(selectedVoucher.net_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Double-entry entries */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">Double-Entry Journal Postings</h4>
              <div className="border border-slate-200 dark:border-[#303036] rounded-xl overflow-hidden text-xs shadow-2xs">
                <table className="w-full">
                  <thead className="bg-[#F9FAFB] border-b border-[#E4E7EC] text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Account / Ledger</th>
                      <th className="px-3 py-2 text-right font-semibold">Debit (₹)</th>
                      <th className="px-3 py-2 text-right font-semibold">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#303036]">
                    {selectedVoucher.ledger_entries.map((ent, idx) => (
                      <tr key={idx} className={ent.is_reversal ? "bg-rose-50/50" : ""}>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-slate-900 dark:text-white block">{ent.account_name || `Account #${ent.account_id}`}</span>
                          {ent.narration && <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{ent.narration}</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700">
                          {Number(ent.debit_amount) > 0 ? `₹${Number(ent.debit_amount).toFixed(2)}` : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-amber-700">
                          {Number(ent.credit_amount) > 0 ? `₹${Number(ent.credit_amount).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill Allocations / Payment History */}
            {selectedVoucher.bill_allocations && selectedVoucher.bill_allocations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#E4E7EC]">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">Payment Settlements</h4>
                <div className="space-y-2">
                  {selectedVoucher.bill_allocations.map((alloc) => (
                    <div key={alloc.id} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between font-bold text-emerald-950">
                        <span>Payment Voucher #{alloc.voucher_number || `PV-${alloc.voucher_id}`}</span>
                        <span>₹{Number(alloc.total_settled).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-emerald-800">
                        <span>Bank Disbursement: ₹{Number(alloc.allocated_amount).toFixed(2)}</span>
                        {Number(alloc.tds_amount) > 0 && <span>TDS: ₹{Number(alloc.tds_amount).toFixed(2)}</span>}
                        {Number(alloc.discount_amount) > 0 && <span>Discount: ₹{Number(alloc.discount_amount).toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </EntityDrawer>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 4: Printable Purchase Voucher                                        */}
      {/* -------------------------------------------------------------------------- */}
      {isPrintModalOpen && printBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-gray-200 pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-indigo-700 font-bold block">PantherTMS ERP</span>
                <h2 className="text-xl font-black text-gray-900 mt-1">PURCHASE VOUCHER</h2>
                <span className="text-xs text-gray-500 font-mono">Voucher #: {printBill.voucher_number}</span>
              </div>
              <div className="text-right text-xs text-gray-600">
                <span className="font-bold text-gray-900 block">Date: {printBill.voucher_date}</span>
                <span>Due Date: {printBill.due_date || printBill.voucher_date}</span>
                <span className="block mt-1 font-mono text-indigo-700">Ref: {printBill.reference_number || "Direct"}</span>
              </div>
            </div>

            {/* Supplier / Branch Details */}
            <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Supplier / Vendor:</span>
                <h4 className="font-bold text-sm text-gray-900 mt-0.5">{printBill.party_name}</h4>
                <p className="text-gray-600 font-mono mt-0.5">GSTIN: {printBill.party_gstin || "Unregistered"}</p>
                <p className="text-gray-600">State: {printBill.place_of_supply || "Maharashtra"}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expense Details:</span>
                <p className="font-semibold text-gray-900 mt-0.5">Category: {printBill.tax_breakup?.purchase_category || "Operational"}</p>
                {printBill.cost_center && <p className="font-mono text-gray-700">Truck: {printBill.cost_center}</p>}
                <p className="text-gray-600">ITC: {printBill.itc_eligibility || "ELIGIBLE"}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 font-semibold text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Particulars / Description</th>
                    <th className="px-3 py-2 text-center">HSN/SAC</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Taxable</th>
                    <th className="px-3 py-2 text-right">GST</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {printBill.items && printBill.items.length > 0 ? (
                    printBill.items.map((itm, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{itm.description}</td>
                        <td className="px-3 py-2 text-center font-mono text-gray-600">{itm.hsn_sac || "-"}</td>
                        <td className="px-3 py-2 text-right font-mono">{itm.quantity}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{Number(itm.rate).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono">₹{((Number(itm.quantity) * Number(itm.rate)) - Number(itm.discount_amount || 0)).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono text-purple-700">₹{Number(itm.tax_amount).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">₹{Number(itm.total_amount).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-2 text-gray-500">1</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{printBill.narration || "Purchase Expense"}</td>
                      <td className="px-3 py-2 text-center font-mono">9967</td>
                      <td className="px-3 py-2 text-right font-mono">1.00</td>
                      <td className="px-3 py-2 text-right font-mono">₹{Number(printBill.total_amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{Number(printBill.total_amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-purple-700">₹{Number(printBill.tax_amount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">₹{Number(printBill.net_amount).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals & Number in Words */}
            <div className="grid grid-cols-2 gap-6 items-end">
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                <span className="font-semibold block text-gray-800">Amount in Words:</span>
                <span className="italic font-medium">{numberToWords(Number(printBill.net_amount))}</span>
              </div>
              <div className="space-y-1 text-xs text-right font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">Taxable Subtotal:</span>
                  <span className="font-bold">₹{Number(printBill.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST Tax:</span>
                  <span className="text-purple-700">₹{Number(printBill.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-300 pt-1">
                  <span>Grand Total:</span>
                  <span className="text-indigo-900">₹{Number(printBill.net_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs text-gray-500">
              <div className="border-t border-gray-300 pt-2">Prepared By</div>
              <div className="border-t border-gray-300 pt-2">Verified By Accounts</div>
              <div className="border-t border-gray-300 pt-2">Authorized Signatory</div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => setIsPrintModalOpen(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Voucher
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 5: Void Voucher Dialog                                               */}
      {/* -------------------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        onConfirm={handleVoidVoucher}
        title={`Void Purchase Bill #${voidVoucherNumber}`}
        message="Voiding this purchase will generate an exact balanced reversal entry in the double-entry ledger. If active payments exist, you must void those first."
        confirmText="Confirm Void"
        variant="danger"
        isLoading={isVoiding}
      >
        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-semibold mb-1">Audit Void Reason (Min 10 chars) *</label>
          <textarea
            rows={2}
            required
            placeholder="Reason for voiding per audit regulations..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
