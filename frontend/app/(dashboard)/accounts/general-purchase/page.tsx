"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Receipt,
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
  Briefcase,
  Laptop,
  Check,
  Paperclip,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Pencil,
  Upload,
  ExternalLink,
  Scale,
  Zap,
  Monitor,
  ShoppingBag,
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
import { getActiveOffice, getStoredAuth } from "@/lib/auth";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { canAccessRoute } from "@/lib/permissions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";

function formatInr(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0.00";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

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
  tax_category_id?: number;
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
  issuing_office_id?: number;
  issuing_office_name?: string;
  vendor_id?: number;
  vendor_name?: string;
  due_date?: string;
  credit_period_days?: number;
  tds_amount?: string | number;
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

interface TaxCategoryOption {
  id: number;
  name: string;
  code: string;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
}

interface CompanySettingData {
  id?: number;
  company_name: string;
  gstin?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
  signing_authority_name?: string | null;
  signing_authority_designation?: string | null;
  issuing_office?: string | null;
}

interface BranchData {
  id: number;
  code: string;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  pan?: string | null;
  is_head_office?: boolean;
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

export default function GeneralPurchasePage() {
  const { openMasterTab } = useWorkspaceTabs();
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryOption[]>([]);
  const [company, setCompany] = useState<CompanySettingData | null>(null);
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedGstTreatment, setSelectedGstTreatment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Series Master
  const [generalSeries, setGeneralSeries] = useState<any>(null);

  // Drawer 1: Record General Purchase Bill
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseCategory, setPurchaseCategory] = useState<string>("OFFICE_ADMIN");
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
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [attachmentSize, setAttachmentSize] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [narration, setNarration] = useState<string>("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      id: "line-1",
      description: "",
      hsn_sac: "998311",
      quantity: "1",
      rate: "",
      discount_amount: "0",
      tax_category_id: "",
    },
  ]);

  // Drawer 2: View Voucher Journal & Ledger
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherRecord | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // Modal 3: Print Voucher
  const [printVoucher, setPrintVoucher] = useState<VoucherRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Modal 4: Quick Payment
  const [paymentBill, setPaymentBill] = useState<VoucherRecord | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isPaying, setIsPaying] = useState(false);

  // Modal 5: Void Voucher
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidVoucherNumber, setVoidVoucherNumber] = useState<string>("");
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const openAttachedDocument = (urlOrDataUrl?: string, title?: string) => {
    if (!urlOrDataUrl) return;
    if (urlOrDataUrl.startsWith("http://") || urlOrDataUrl.startsWith("https://")) {
      window.open(urlOrDataUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (urlOrDataUrl.startsWith("data:")) {
      try {
        const parts = urlOrDataUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        return;
      } catch (e) {
        console.error("Failed to open data URL blob", e);
      }
    }
    window.open(urlOrDataUrl, "_blank");
  };

  const handleFileUpload = (file?: File | null) => {
    if (!file) return;
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("File size exceeds 10 MB limit. Please select a smaller document.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      toast.error("Unsupported file type. Please upload a PDF or an Image (JPG, PNG, WebP).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAttachmentUrl(result);
      setAttachmentName(file.name);
      setAttachmentSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
      toast.success(`Attached "${file.name}" successfully.`);
    };
    reader.onerror = () => {
      toast.error("Failed to read document file.");
    };
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setAttachmentUrl("");
    setAttachmentName("");
    setAttachmentSize("");
    setShowUrlInput(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";

      const [gpRes, sGen, vendorsRes, tcRes, compRes, brRes] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=GENERAL_PURCHASE"),
        apiClient<any>(`/api/v1/settings/series/check/GENERAL_PURCHASE${officeParam}`).catch(() => null),
        apiClient<VendorOption[]>("/api/v1/general/vendors").catch(() => []),
        apiClient<TaxCategoryOption[]>("/api/v1/misc/tax-categories").catch(() => []),
        apiClient<CompanySettingData>("/api/v1/profile/company").catch(() => null),
        apiClient<BranchData[]>("/api/v1/profile/branches").catch(() => []),
      ]);

      const sorted = [...gpRes].sort((a, b) => b.id - a.id);
      setData(sorted);
      setGeneralSeries(sGen);
      setVendors(vendorsRes);
      setTaxCategories(tcRes);
      if (compRes) setCompany(compRes);
      if (brRes) setBranches(brRes);

      if (tcRes.length > 0 && lineItems.length === 1 && !lineItems[0].tax_category_id) {
        const defaultTc = tcRes.find((t) => Number(t.igst_rate) === 18) || tcRes[0];
        setLineItems([{ ...lineItems[0], tax_category_id: String(defaultTc.id) }]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load general purchases.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  useEffect(() => {
    if (isPrintModalOpen && !company) {
      apiClient<CompanySettingData>("/api/v1/profile/company")
        .then((c) => setCompany(c))
        .catch(() => {});
      apiClient<BranchData[]>("/api/v1/profile/branches")
        .then((b) => setBranches(Array.isArray(b) ? b : []))
        .catch(() => {});
    }
  }, [isPrintModalOpen, company]);

  const handleVendorSelect = (vendorIdStr: string) => {
    setSelectedVendorId(vendorIdStr);
    const vend = vendors.find((v) => String(v.id) === vendorIdStr);
    if (vend) {
      setVendorGstin(vend.gstin || "");
      setVendorState(vend.billing_state || vend.state || "");
      setManualVendorName(vend.name);
    } else {
      setVendorGstin("");
      setVendorState("");
      setManualVendorName("");
    }
  };

  const handleVendorCreated = (newVendor: any) => {
    const formatted: VendorOption = {
      id: Number(newVendor.id),
      name: newVendor.name || newVendor.label || `Vendor #${newVendor.id}`,
      gstin: newVendor.gstin || "",
      state: newVendor.state || newVendor.billing_state || "",
      billing_state: newVendor.state || newVendor.billing_state || "",
    };
    setVendors((prev) => [formatted, ...prev.filter((v) => v.id !== formatted.id)]);
    setSelectedVendorId(String(formatted.id));
    setVendorGstin(formatted.gstin || "");
    setVendorState(formatted.billing_state || formatted.state || "");
    setManualVendorName(formatted.name);
    toast.success(`Vendor "${formatted.name}" created and selected.`);
  };

  const handleCategoryChange = (cat: string) => {
    setPurchaseCategory(cat);
    const defaultSacMap: Record<string, string> = {
      OFFICE_ADMIN: "998311",
      RENT: "997212",
      LEGAL_PROFESSIONAL: "998222",
      SOFTWARE_IT: "998313",
      PRINTING_STATIONERY: "998912",
      UTILITIES: "996911",
      EQUIPMENT: "84713010",
      OTHER: "9983",
    };
    const newSac = defaultSacMap[cat] || "9983";
    setLineItems((prev) => prev.map((l) => (l.hsn_sac === "998311" || l.hsn_sac === "9983" ? { ...l, hsn_sac: newSac } : l)));
  };

  const addLineItem = () => {
    const defaultTc = taxCategories.find((t) => Number(t.igst_rate) === 18) || taxCategories[0];
    setLineItems([
      ...lineItems,
      {
        id: `line-${Date.now()}`,
        description: "",
        hsn_sac: "998311",
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
    };
  }, [lineItems, taxCategories, gstTreatment, vendorState, placeOfSupply]);

  const resetForm = () => {
    setEditingVoucher(null);
    setPurchaseCategory("OFFICE_ADMIN");
    setSelectedVendorId("");
    setManualVendorName("");
    setVendorGstin("");
    setVendorState("");
    setBillNumber("");
    setBillDate(new Date().toISOString().split("T")[0]);
    setCreditPeriodDays("30");
    setGstTreatment("FCM");
    setItcEligibility("ELIGIBLE");
    setPlaceOfSupply("");
    setSelectedBranchId("");
    setAttachmentUrl("");
    setAttachmentName("");
    setAttachmentSize("");
    setShowUrlInput(false);
    setNarration("");
    const defaultTc = taxCategories.find((t) => Number(t.igst_rate) === 18) || taxCategories[0];
    setLineItems([
      {
        id: "line-1",
        description: "",
        hsn_sac: "998311",
        quantity: "1",
        rate: "",
        discount_amount: "0",
        tax_category_id: defaultTc ? String(defaultTc.id) : "",
      },
    ]);
  };

  const handleEditBill = (row: VoucherRecord) => {
    setEditingVoucher(row);
    const tb = row.tax_breakup || {};
    setPurchaseCategory(tb.purchase_category || "OFFICE_ADMIN");
    setSelectedVendorId(row.vendor_id ? String(row.vendor_id) : "");
    setManualVendorName(row.party_name || "");
    setVendorGstin(row.party_gstin || "");
    setVendorState(tb.vendor_state || "");
    setBillNumber(row.reference_number || "");
    setBillDate(row.reference_date || row.voucher_date || new Date().toISOString().split("T")[0]);
    setCreditPeriodDays(String(row.credit_period_days || 30));
    setGstTreatment(row.gst_treatment || "FCM");
    setItcEligibility(row.itc_eligibility || "ELIGIBLE");
    setPlaceOfSupply(row.place_of_supply || "");
    setSelectedBranchId(row.issuing_office_id ? String(row.issuing_office_id) : "");
    setAttachmentUrl(row.attachment_url || "");
    setAttachmentName(row.attachment_url ? "Attached Invoice Document" : "");
    setAttachmentSize("");
    setShowUrlInput(false);
    setNarration(row.narration || "");

    if (row.items && row.items.length > 0) {
      setLineItems(
        row.items.map((it, idx) => ({
          id: `edit-line-${idx}-${it.id}`,
          description: it.description,
          hsn_sac: it.hsn_sac || "998311",
          quantity: String(it.quantity),
          rate: String(it.rate),
          discount_amount: String(it.discount_amount || 0),
          tax_category_id: it.tax_category_id ? String(it.tax_category_id) : "",
        }))
      );
    } else {
      const defaultTc = taxCategories.find((t) => Number(t.igst_rate) === 18) || taxCategories[0];
      setLineItems([
        {
          id: "line-1",
          description: row.party_name ? `General Admin Invoice - ${row.party_name}` : "General Purchase",
          hsn_sac: "998311",
          quantity: "1",
          rate: String(row.total_amount || 0),
          discount_amount: "0",
          tax_category_id: defaultTc ? String(defaultTc.id) : "",
        },
      ]);
    }
    setIsCreateOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.warning("Please select a supplier / vendor from the list.");
      return;
    }
    if (!billNumber.trim()) {
      toast.warning("Please enter the supplier's Invoice / Bill Number.");
      return;
    }
    const invalidLine = lineItems.some((l) => !parseFloat(l.quantity) || !parseFloat(l.rate));
    if (invalidLine) {
      toast.warning("Each line item must have a valid quantity (> 0) and unit rate (> 0).");
      return;
    }

    setIsSubmitting(true);
    try {
      const selVendor = vendors.find((v) => String(v.id) === selectedVendorId);
      const payload: any = {
        purchase_type: "GENERAL_PURCHASE",
        purchase_category: purchaseCategory,
        vendor_id: parseInt(selectedVendorId),
        party_name: (selVendor?.name || manualVendorName).trim() || undefined,
        party_gstin: vendorGstin.trim() || undefined,
        vendor_state: vendorState.trim() || undefined,
        bill_number: billNumber.trim(),
        bill_date: billDate,
        credit_period_days: parseInt(creditPeriodDays) || 30,
        gst_treatment: gstTreatment,
        itc_eligibility: itcEligibility,
        place_of_supply: placeOfSupply.trim() || undefined,
        cost_center: selectedBranchId ? `BRANCH-${selectedBranchId}` : undefined,
        attachment_url: attachmentUrl.trim() || undefined,
        items: lineItems.map((l) => ({
          description: l.description.trim() || `${purchaseCategory} Overhead`,
          hsn_sac: l.hsn_sac.trim() || "998311",
          quantity: parseFloat(l.quantity),
          rate: parseFloat(l.rate),
          discount_amount: parseFloat(l.discount_amount) || 0,
          tax_category_id: l.tax_category_id ? parseInt(l.tax_category_id) : undefined,
        })),
        narration: narration.trim() || undefined,
      };

      if (editingVoucher) {
        await apiClient(`/api/v1/accounts/purchases/${editingVoucher.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`General Purchase Bill ${editingVoucher.voucher_number} updated successfully.`);
      } else {
        const res = await apiClient<VoucherRecord>("/api/v1/accounts/purchases", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`General Purchase Bill ${res.voucher_number} posted successfully.`);
      }

      setIsCreateOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post general purchase bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPayment = async () => {
    if (!paymentBill || !payAmount || parseFloat(payAmount) <= 0) {
      toast.warning("Please enter a valid payment disbursement amount.");
      return;
    }
    setIsPaying(true);
    try {
      await apiClient(`/api/v1/accounts/purchases/${paymentBill.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          payment_date: payDate,
        }),
      });
      toast.success(`Payment of ${formatCurrency(payAmount)} disbursed for ${paymentBill.voucher_number}.`);
      setIsPaymentOpen(false);
      setPaymentBill(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Payment disbursement failed.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleVoidVoucher = async () => {
    if (!voidVoucherId || !voidReason.trim() || voidReason.trim().length < 5) {
      toast.warning("Please enter an audit reason for voiding (minimum 5 characters).");
      return;
    }
    setIsVoiding(true);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      toast.success(`General Purchase ${voidVoucherNumber} voided and reversed successfully.`);
      setIsVoidOpen(false);
      setVoidVoucherId(null);
      setVoidReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void general purchase bill.");
    } finally {
      setIsVoiding(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((v) => {
      const tb = v.tax_breakup || {};
      const cat = (tb.purchase_category || "OFFICE_ADMIN").toUpperCase();

      if (selectedCategory !== "ALL" && cat !== selectedCategory) return false;
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "VOID" && !v.is_void) return false;
        if (selectedStatus !== "VOID" && (v.is_void || v.payment_status !== selectedStatus)) return false;
      }
      if (selectedGstTreatment !== "ALL" && v.gst_treatment !== selectedGstTreatment) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (v.voucher_number || "").toLowerCase();
        const ref = (v.reference_number || "").toLowerCase();
        const party = (v.party_name || "").toLowerCase();
        const gstin = (v.party_gstin || "").toLowerCase();
        if (!num.includes(q) && !ref.includes(q) && !party.includes(q) && !gstin.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data, selectedCategory, selectedStatus, selectedGstTreatment, searchQuery]);

  const kpis = useMemo(() => {
    let totalPurchases = 0;
    let officeAdmin = 0;
    let rentFacilities = 0;
    let professionalIt = 0;

    data.forEach((v) => {
      if (v.is_void) return;
      const amt = parseFloat(String(v.net_amount || 0)) || 0;
      totalPurchases += amt;
      const cat = ((v.tax_breakup?.purchase_category || "OFFICE_ADMIN") as string).toUpperCase();
      if (cat === "OFFICE_ADMIN" || cat === "PRINTING_STATIONERY") officeAdmin += amt;
      else if (cat === "RENT" || cat === "UTILITIES") rentFacilities += amt;
      else if (cat === "LEGAL_PROFESSIONAL" || cat === "SOFTWARE_IT" || cat === "EQUIPMENT") professionalIt += amt;
    });

    return { totalPurchases, officeAdmin, rentFacilities, professionalIt, count: data.length };
  }, [data]);

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.warning("No records to export.");
      return;
    }
    const headers = [
      "Voucher No",
      "Supplier Bill No",
      "Bill Date",
      "Supplier Name",
      "Supplier GSTIN",
      "Category",
      "Taxable Value (₹)",
      "Tax Amount (₹)",
      "Total Amount (₹)",
      "Paid Amount (₹)",
      "Balance Due (₹)",
      "Payment Status",
      "GST Treatment",
      "ITC Eligibility",
    ];
    const rows = filteredData.map((r) => [
      r.voucher_number,
      `"${r.reference_number || ""}"`,
      r.voucher_date,
      `"${(r.party_name || "").replace(/"/g, '""')}"`,
      r.party_gstin || "",
      r.tax_breakup?.purchase_category || "OFFICE_ADMIN",
      parseFloat(String(r.total_amount)) || 0,
      parseFloat(String(r.tax_amount)) || 0,
      parseFloat(String(r.net_amount)) || 0,
      parseFloat(String(r.paid_amount || 0)),
      parseFloat(String(r.balance_amount || 0)),
      r.is_void ? "VOID" : r.payment_status || "UNPAID",
      r.gst_treatment || "FCM",
      r.itc_eligibility || "ELIGIBLE",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `General_Purchases_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV export downloaded successfully.");
  };

  const columns: ColumnDef<VoucherRecord>[] = [
    {
      key: "voucher_number",
      label: "Invoice No & Date",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
            <Receipt className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            {v.voucher_number}
          </span>
          {v.reference_number && (
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1 mt-0.5" title="Supplier Invoice No">
              <FileText className="h-3 w-3 text-slate-400" />
              Bill #{v.reference_number}
            </span>
          )}
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {formatDate(v.voucher_date)}
          </span>
        </div>
      ),
    },
    {
      key: "party_name",
      label: "Supplier / Service Provider",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate" title={v.party_name || "Supplier"}>
            {v.party_name || "Supplier"}
          </span>
          {v.party_gstin && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              GST: {v.party_gstin}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      label: "Overhead Category",
      render: (v) => {
        const cat = v.tax_breakup?.purchase_category || "OFFICE_ADMIN";
        return (
          <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60">
            {cat}
          </Badge>
        );
      },
    },
    {
      key: "total_amount",
      label: "Taxable Value",
      sortable: true,
      render: (v) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
          {formatCurrency(v.total_amount)}
        </span>
      ),
    },
    {
      key: "tax_amount",
      label: "GST Breakdown",
      render: (v) => {
        const tb = v.tax_breakup || {};
        const cgst = parseFloat(String(tb.cgst_amount || 0));
        const sgst = parseFloat(String(tb.sgst_amount || 0));
        const igst = parseFloat(String(tb.igst_amount || 0));
        const isRcm = v.gst_treatment === "RCM";

        return (
          <div className="flex flex-col text-xs">
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrency(v.tax_amount)}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {isRcm ? (
                <span className="px-1 py-0.2 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300">
                  RCM
                </span>
              ) : igst > 0 ? (
                <span className="text-[10px] text-slate-500 font-mono">IGST: {formatCurrency(igst)}</span>
              ) : (
                <span className="text-[10px] text-slate-500 font-mono">C+S: {formatCurrency(cgst + sgst)}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "net_amount",
      label: "Net Invoice Total",
      sortable: true,
      render: (v) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-white font-mono text-sm">
            {formatCurrency(v.net_amount)}
          </span>
          {parseFloat(String(v.paid_amount || 0)) > 0 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
              Paid: {formatCurrency(v.paid_amount)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Payment Status",
      render: (v) => {
        if (v.is_void) {
          return <StatusBadge status="VOID" customLabel="VOIDED" />;
        }
        const st = v.payment_status || "UNPAID";
        if (st === "PAID") return <StatusBadge status="CLEARED" customLabel="PAID" />;
        if (st === "PARTIALLY_PAID") {
          return (
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 text-[11px]">
              Partial Due
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 text-[11px]">
            Unpaid
          </Badge>
        );
      },
    },
  ];

  const actions: RowAction<VoucherRecord>[] = [
    {
      label: "Edit General Purchase",
      icon: <Pencil className="h-4 w-4 text-blue-400" />,
      hidden: (v) => v.is_void,
      onClick: (v) => handleEditBill(v),
    },
    {
      label: "Quick Disburse Payment",
      icon: <CreditCard className="h-4 w-4 text-emerald-400" />,
      hidden: (v) => v.is_void || v.payment_status === "PAID",
      onClick: (v) => {
        setPaymentBill(v);
        setPayAmount(String(v.balance_amount || v.net_amount));
        setPayDate(new Date().toISOString().split("T")[0]);
        setIsPaymentOpen(true);
      },
    },
    {
      label: "View Journal & Ledger",
      icon: <Eye className="h-4 w-4 text-cyan-400" />,
      onClick: (v) => {
        setSelectedVoucher(v);
        setIsLedgerOpen(true);
      },
    },
    {
      label: "Print Purchase Bill",
      icon: <Printer className="h-4 w-4 text-indigo-400" />,
      onClick: (v) => {
        setPrintVoucher(v);
        setIsPrintModalOpen(true);
      },
    },
    {
      label: "Void Purchase Bill",
      icon: <Ban className="h-4 w-4 text-rose-400" />,
      hidden: (v) => v.is_void,
      danger: true,
      onClick: (v) => {
        setVoidVoucherId(v.id);
        setVoidVoucherNumber(v.voucher_number);
        setVoidReason("");
        setIsVoidOpen(true);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Series Warning Banner */}
      {generalSeries && !generalSeries.configured && (
        <div className="rounded-lg border border-amber-600/50 bg-amber-950/20 p-4 text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Series Configuration Warning</p>
              <p className="text-xs text-amber-400/90 mt-0.5">
                No active sequence series is configured for General Purchases (GP). Please configure the series in Settings &gt; Series Master.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-600 text-amber-300 hover:bg-amber-900/40 shrink-0"
            onClick={() => window.location.href = "/settings/series"}
          >
            Configure Series
          </Button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="General Purchase Register"
        description="Non-operational & administrative overheads: office rent, legal & professional fees, software & IT, utilities, printing, and supplies."
        primaryAction={{
          label: "Record General Purchase",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            resetForm();
            setIsCreateOpen(true);
          },
        }}
        secondaryActions={[
          {
            label: "Export CSV",
            icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
            onClick: handleExportCSV,
            variant: "outline",
          },
        ]}
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total General Purchases"
          value={formatCurrency(kpis.totalPurchases)}
          subtext="Total administrative overheads recorded"
          badge={<span className="text-[11px] text-slate-500 font-medium">({kpis.count} bills)</span>}
          icon={<Receipt className="h-4 w-4" />}
        />
        <KpiCard
          title="Office & Admin"
          value={formatCurrency(kpis.officeAdmin)}
          subtext="Office supplies, stationery & printing"
          icon={<Briefcase className="h-4 w-4" />}
        />
        <KpiCard
          title="Rent & Facilities"
          value={formatCurrency(kpis.rentFacilities)}
          subtext="Office/warehouse rent & utilities"
          icon={<Building2 className="h-4 w-4" />}
        />
        <KpiCard
          title="Professional & IT"
          value={formatCurrency(kpis.professionalIt)}
          subtext="Legal, audit, cloud & IT subscriptions"
          icon={<Laptop className="h-4 w-4" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search bill #, supplier, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            >
              <option value="ALL">All Overhead Categories</option>
              <option value="OFFICE_ADMIN">Office Supplies</option>
              <option value="RENT">Office Rent</option>
              <option value="LEGAL_PROFESSIONAL">Legal & Professional</option>
              <option value="SOFTWARE_IT">Software & IT</option>
              <option value="PRINTING_STATIONERY">Printing & Stationery</option>
              <option value="UTILITIES">Utilities & Electricity</option>
              <option value="EQUIPMENT">Office Equipment</option>
              <option value="OTHER">Other Overheads</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Fully Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="UNPAID">Unpaid Due</option>
              <option value="VOID">Voided</option>
            </select>

            <select
              value={selectedGstTreatment}
              onChange={(e) => setSelectedGstTreatment(e.target.value)}
              className="bg-white dark:bg-[#101013] border border-slate-200 dark:border-[#303036] rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            >
              <option value="ALL">All GST Treatments</option>
              <option value="FCM">FCM (Forward Charge)</option>
              <option value="RCM">RCM (Reverse Charge)</option>
              <option value="EXEMPT">Exempt / Nil Rated</option>
            </select>

            {(searchQuery || selectedCategory !== "ALL" || selectedStatus !== "ALL" || selectedGstTreatment !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                  setSelectedStatus("ALL");
                  setSelectedGstTreatment("ALL");
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        actions={actions}
        searchable={false}
        emptyState={
          <div className="py-12 text-center">
            <Receipt className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No General Purchase Bills found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Click &quot;Record General Purchase&quot; to log administrative overhead bills (rent, legal, software, utilities).
            </p>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateOpen(true);
              }}
              className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record General Purchase
            </Button>
          </div>
        }
      />

      {/* DRAWER 1: Record General Purchase Bill */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingVoucher(null);
        }}
        title={editingVoucher ? `Edit General Purchase (${editingVoucher.voucher_number})` : "Record General Purchase (Admin Overheads)"}
        description={editingVoucher ? "Update administrative overhead bill details, rent, professional services, or utilities." : "Log incoming supplier invoices for office rent, professional services, software, stationery, and utilities."}
        size="xl"
      >
        <form onSubmit={handleSavePurchase} className="space-y-6 pb-20">
          {/* Step 1: Who is the supplier? */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                1
              </span>
              Who is the Supplier / Service Provider?
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Supplier / Vendor <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedVendorId}
                      onChange={(e) => handleVendorSelect(e.target.value)}
                      className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    >
                      <option value="">-- Choose Supplier / Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.gstin ? `(${v.gstin})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openMasterTab({
                        type: "vendor",
                        title: "Add Vendor",
                        onSuccess: handleVendorCreated,
                      })
                    }
                    title="Add Vendor in new TMS tab"
                    aria-label="Add Vendor"
                    className="w-10 h-10 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier GSTIN (Optional)
                </label>
                <input
                  type="text"
                  placeholder="27AAAAA0000A1Z5"
                  value={vendorGstin}
                  onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-mono uppercase font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier State / Place of Supply
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={vendorState}
                  onChange={(e) => setVendorState(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-[#303036]">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier Bill / Invoice # <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. RENT-OCT-2026"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium font-mono rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Period (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={creditPeriodDays}
                  onChange={(e) => setCreditPeriodDays(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Step 2: What did you purchase? (Overhead Expense Classification) */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                2
              </span>
              Overhead Expense Classification & Branch Allocation
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: "OFFICE_ADMIN", label: "Office Supplies", icon: Briefcase },
                { id: "RENT", label: "Office Rent", icon: Building2 },
                { id: "LEGAL_PROFESSIONAL", label: "Legal & Professional", icon: Scale },
                { id: "SOFTWARE_IT", label: "Software & IT", icon: Laptop },
                { id: "PRINTING_STATIONERY", label: "Printing & Courier", icon: FileText },
                { id: "UTILITIES", label: "Electricity & Utilities", icon: Zap },
                { id: "EQUIPMENT", label: "Office Equipment", icon: Monitor },
                { id: "OTHER", label: "Other Overheads", icon: ShoppingBag },
              ].map((c) => {
                const IconComp = c.icon;
                const isSel = purchaseCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategoryChange(c.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer",
                      isSel
                        ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-300 font-semibold shadow-xs"
                        : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    )}
                  >
                    <IconComp className={cn("w-4 h-4 shrink-0", isSel ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")} />
                    <span className="text-xs">{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#303036]">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Allocate to Branch / Office Cost Center
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
              >
                <option value="">-- Company-Wide Overhead (Corporate / Head Office) --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) - {b.city || "Branch"}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Allocates administrative expense to specific office cost center</span>
            </div>
          </div>

          {/* Step 3: Itemized Line Items */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#303036] pb-3">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                  3
                </span>
                Itemized Services / Goods & SAC/HSN
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addLineItem} className="text-xs gap-1">
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2.5 items-center p-3 rounded-xl border border-slate-100 dark:border-[#303036] bg-slate-50/50 dark:bg-[#101013]/60">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Description #{index + 1}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Office Monthly Rent"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      className="w-full h-9 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      SAC / HSN
                    </label>
                    <input
                      type="text"
                      placeholder="998311"
                      value={item.hsn_sac}
                      onChange={(e) => updateLineItem(item.id, "hsn_sac", e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, "quantity", e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={item.rate}
                      onChange={(e) => updateLineItem(item.id, "rate", e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="col-span-10 sm:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      GST Tax Rate
                    </label>
                    <select
                      value={item.tax_category_id}
                      onChange={(e) => updateLineItem(item.id, "tax_category_id", e.target.value)}
                      className="w-full h-9 px-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013] text-slate-900 dark:text-white"
                    >
                      {taxCategories.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({Number(t.igst_rate)}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1 pt-4 text-center">
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations summary banner */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#303036] bg-slate-50 dark:bg-[#101013] flex flex-wrap items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500">Taxable: </span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(calculatedTotals.taxable)}</span>
              </div>
              <div>
                <span className="text-slate-500">GST: </span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(calculatedTotals.tax)}</span>
              </div>
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                <span>Net Total: </span>
                <span>{formatCurrency(calculatedTotals.net)}</span>
              </div>
            </div>
          </div>

          {/* Step 4: Tax Treatment & ITC */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                4
              </span>
              GST Treatment & Input Tax Credit (ITC)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  GST Treatment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "FCM", label: "Forward Charge (FCM)" },
                    { id: "RCM", label: "Reverse Charge (RCM)" },
                    { id: "EXEMPT", label: "Exempt / Nil Rated" },
                  ].map((gt) => (
                    <button
                      key={gt.id}
                      type="button"
                      onClick={() => setGstTreatment(gt.id)}
                      className={cn(
                        "py-2 px-2 text-xs rounded-xl font-medium border text-center transition-all cursor-pointer",
                        gstTreatment === gt.id
                          ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-300 font-semibold"
                          : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {gt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ITC Eligibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ELIGIBLE", label: "Eligible for ITC" },
                    { id: "INELIGIBLE", label: "Ineligible / Blocked" },
                  ].map((itc) => (
                    <button
                      key={itc.id}
                      type="button"
                      onClick={() => setItcEligibility(itc.id)}
                      className={cn(
                        "py-2 px-2 text-xs rounded-xl font-medium border text-center transition-all cursor-pointer",
                        itcEligibility === itc.id
                          ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-300 font-semibold"
                          : "bg-white dark:bg-[#101013] border-slate-200 dark:border-[#303036] text-slate-600 dark:text-slate-400"
                      )}
                    >
                      {itc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Document Attachment */}
          <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200/90 dark:border-[#303036] p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#303036] pb-3 text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                5
              </span>
              Attach Supplier Bill Document (PDF / Image)
            </div>

            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              {!attachmentUrl ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                      : "border-slate-200 dark:border-[#303036] hover:border-indigo-400 hover:bg-slate-50/50"
                  )}
                >
                  <Upload className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to browse or drag & drop supplier invoice (PDF, JPG, PNG)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Maximum file size: 10 MB</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-emerald-600" />
                    <div>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-300 block truncate max-w-xs">
                        {attachmentName || "Attached Invoice Document"}
                      </span>
                      {attachmentSize && <span className="text-[10px] text-emerald-600">{attachmentSize}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openAttachedDocument(attachmentUrl, attachmentName)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearAttachment}
                      className="text-xs text-rose-500 hover:text-rose-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#303036]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
              {isSubmitting ? "Posting Bill..." : editingVoucher ? "Update General Purchase" : "Post General Purchase"}
            </Button>
          </div>
        </form>
      </EntityDrawer>

      {/* MODAL 2: Quick Disburse Payment */}
      <EntityDrawer
        isOpen={isPaymentOpen}
        onClose={() => {
          setIsPaymentOpen(false);
          setPaymentBill(null);
        }}
        title={`Disburse Payment for ${paymentBill?.voucher_number || ""}`}
        description="Quick payment disbursement against this general purchase bill."
        size="md"
      >
        <div className="space-y-4 pb-20">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supplier / Beneficiary
            </label>
            <input
              type="text"
              readOnly
              value={paymentBill?.party_name || "Supplier"}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-[#303036] bg-slate-50 dark:bg-[#101013]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Amount (₹) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full h-10 px-3 text-xs font-mono font-medium rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-[#303036] bg-white dark:bg-[#101013]"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#303036]">
            <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickPayment} disabled={isPaying} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
              {isPaying ? "Disbursing..." : "Disburse Payment"}
            </Button>
          </div>
        </div>
      </EntityDrawer>

      {/* MODAL 3: View Journal & Ledger */}
      <EntityDrawer
        isOpen={isLedgerOpen}
        onClose={() => {
          setIsLedgerOpen(false);
          setSelectedVoucher(null);
        }}
        title={`Journal & Ledger Postings (${selectedVoucher?.voucher_number || ""})`}
        description="Double-entry ledger debit & credit postings for this administrative purchase bill."
        size="lg"
      >
        <div className="space-y-4 pb-20">
          <div className="rounded-xl border border-slate-200 dark:border-[#303036] overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-[#101013] text-slate-500 border-b border-slate-200 dark:border-[#303036]">
                <tr>
                  <th className="p-3">Account Ledger</th>
                  <th className="p-3 text-right">Debit (₹)</th>
                  <th className="p-3 text-right">Credit (₹)</th>
                  <th className="p-3">Narration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303036]">
                {(selectedVoucher?.ledger_entries || []).map((e) => (
                  <tr key={e.id}>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{e.account_name || `Account #${e.account_id}`}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 font-semibold">{parseFloat(String(e.debit_amount)) > 0 ? formatCurrency(e.debit_amount) : "—"}</td>
                    <td className="p-3 text-right font-mono text-rose-600 font-semibold">{parseFloat(String(e.credit_amount)) > 0 ? formatCurrency(e.credit_amount) : "—"}</td>
                    <td className="p-3 text-slate-500">{e.narration || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedVoucher && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full justify-center text-xs h-9 border-slate-200 dark:border-[#22232E]"
                onClick={() => {
                  setPrintVoucher(selectedVoucher);
                  setIsPrintModalOpen(true);
                }}
              >
                <Printer className="h-4 w-4 mr-1.5 text-indigo-500" />
                Print Purchase Bill
              </Button>
            </div>
          )}
        </div>
      </EntityDrawer>

      {/* MODAL 4: Void Confirmation */}
      <ConfirmDialog
        isOpen={isVoidOpen}
        onClose={() => setIsVoidOpen(false)}
        title={`Void General Purchase ${voidVoucherNumber}`}
        message="Are you sure you want to void this general purchase bill? All linked ledger debit and credit entries will be reversed."
        confirmText={isVoiding ? "Voiding..." : "Void Bill"}
        onConfirm={handleVoidVoucher}
        variant="danger"
      />

      {/* MODAL 5: Print General Purchase Bill (Standard Administrative Overheads Document) */}
      {mounted && isPrintModalOpen && printVoucher && typeof document !== "undefined" && createPortal(
        (() => {
          const activeOffice = getActiveOffice();
          const targetOfficeId = printVoucher.issuing_office_id || activeOffice?.id;
          const issuingBranch =
            branches.find((b) => b.id === targetOfficeId) ||
            branches.find((b) => b.name === printVoucher.issuing_office_name) ||
            branches.find((b) => b.is_head_office) ||
            branches[0] ||
            null;

          const officeName =
            printVoucher.issuing_office_name ||
            issuingBranch?.name ||
            activeOffice?.name ||
            company?.issuing_office ||
            "Head Office";

          const officeCode = issuingBranch?.code || activeOffice?.code || "";

          const headOfficeBranch = branches.find((b) => b.is_head_office) || branches[0];
          const rawAddress =
            company?.address?.trim() ||
            headOfficeBranch?.address?.trim() ||
            issuingBranch?.address?.trim() ||
            "";

          const city = company?.city || headOfficeBranch?.city || issuingBranch?.city || "";
          const state = company?.state || headOfficeBranch?.state || issuingBranch?.state || "";
          const pincode = company?.pincode || headOfficeBranch?.pincode || issuingBranch?.pincode || "";

          const fullAddressLine = [
            rawAddress,
            city && !rawAddress.toLowerCase().includes(city.toLowerCase()) ? city : null,
            state && !rawAddress.toLowerCase().includes(state.toLowerCase()) ? state : null,
            pincode && !rawAddress.includes(pincode) ? `- ${pincode}` : null,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          const companyName = company?.company_name || "Company Administration Accounts";
          const companyFirstLetter = (companyName[0] || "C").toUpperCase();
          const companyPhone = company?.phone?.trim() || headOfficeBranch?.phone?.trim() || issuingBranch?.phone?.trim() || "";
          const companyEmail = company?.email?.trim() || headOfficeBranch?.email?.trim() || issuingBranch?.email?.trim() || "";
          const companyWebsite = company?.website?.trim() || "";

          const companyGstin =
            company?.gstin?.trim() ||
            issuingBranch?.gstin?.trim() ||
            headOfficeBranch?.gstin?.trim() ||
            "";

          const companyPan =
            company?.pan?.trim() ||
            headOfficeBranch?.pan?.trim() ||
            issuingBranch?.pan?.trim() ||
            (companyGstin.length === 15 ? companyGstin.slice(2, 12).toUpperCase() : "");

          const officeGstin = issuingBranch?.gstin?.trim() || "";

          return (
            <div className="general-purchase-modal-portal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto">
              {/* Backdrop */}
              <div
                className="general-purchase-backdrop fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity print:hidden"
                onClick={() => setIsPrintModalOpen(false)}
              />

              {/* Print Isolation & Layout CSS */}
              <style jsx global>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 8mm;
                  }
                  html,
                  body {
                    margin: 0 !important;
                    padding: 0 !important;
                    height: auto !important;
                    min-height: 0 !important;
                    background: #ffffff !important;
                    overflow: visible !important;
                  }
                  body > *:not(.general-purchase-modal-portal) {
                    display: none !important;
                  }
                  body * {
                    visibility: hidden;
                  }
                  .general-purchase-modal-portal,
                  .general-purchase-modal-portal * {
                    visibility: visible;
                  }
                  .no-print,
                  .no-print *,
                  .general-purchase-backdrop,
                  .general-purchase-backdrop * {
                    display: none !important;
                    visibility: hidden !important;
                  }
                  .general-purchase-modal-portal {
                    position: static !important;
                    display: block !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    inset: auto !important;
                    z-index: auto !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .general-purchase-container {
                    position: static !important;
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    max-height: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    overflow: visible !important;
                    transform: none !important;
                    animation: none !important;
                    background: #ffffff !important;
                  }
                  #general-purchase-printable-document,
                  .general-purchase-print-sheet {
                    position: static !important;
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 auto !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    background: #ffffff !important;
                    color: #0f172a !important;
                    overflow: visible !important;
                  }
                }

                /* Dark Mode Immunity for the Printable Document Sheet */
                html.dark #general-purchase-printable-document,
                html.dark #general-purchase-printable-document * {
                  color-scheme: light !important;
                }
                html.dark #general-purchase-printable-document {
                  background-color: #ffffff !important;
                  background: #ffffff !important;
                  color: #0f172a !important;
                  border-color: #cbd5e1 !important;
                }
                html.dark #general-purchase-printable-document h1,
                html.dark #general-purchase-printable-document h2,
                html.dark #general-purchase-printable-document h3,
                html.dark #general-purchase-printable-document h4,
                html.dark #general-purchase-printable-document p,
                html.dark #general-purchase-printable-document span,
                html.dark #general-purchase-printable-document td,
                html.dark #general-purchase-printable-document th {
                  color-scheme: light !important;
                }
                html.dark #general-purchase-printable-document h2,
                html.dark #general-purchase-printable-document .text-slate-900 {
                  color: #0f172a !important;
                }
                html.dark #general-purchase-printable-document .text-slate-800 {
                  color: #1e293b !important;
                }
                html.dark #general-purchase-printable-document .text-slate-700 {
                  color: #334155 !important;
                }
                html.dark #general-purchase-printable-document .text-slate-600 {
                  color: #475569 !important;
                }
                html.dark #general-purchase-printable-document .text-slate-500 {
                  color: #64748b !important;
                }
                html.dark #general-purchase-printable-document .bg-white {
                  background-color: #ffffff !important;
                  background: #ffffff !important;
                }
                html.dark #general-purchase-printable-document .bg-slate-50,
                html.dark #general-purchase-printable-document .bg-slate-50\/80 {
                  background-color: #f8fafc !important;
                  background: #f8fafc !important;
                  border-color: #e2e8f0 !important;
                }
                html.dark #general-purchase-printable-document .bg-indigo-50,
                html.dark #general-purchase-printable-document .bg-indigo-50\/60 {
                  background-color: #eef2ff !important;
                  background: #eef2ff !important;
                }
                html.dark #general-purchase-printable-document .bg-slate-100,
                html.dark #general-purchase-printable-document .bg-slate-100\/90 {
                  background-color: #f1f5f9 !important;
                  background: #f1f5f9 !important;
                }
                html.dark #general-purchase-printable-document table {
                  background-color: transparent !important;
                  background: transparent !important;
                  color: #0f172a !important;
                }
                html.dark #general-purchase-printable-document table thead th {
                  background-color: #f1f5f9 !important;
                  background: #f1f5f9 !important;
                  color: #334155 !important;
                  border-color: #e2e8f0 !important;
                }
                html.dark #general-purchase-printable-document table tbody td {
                  border-color: #f1f5f9 !important;
                  color: #0f172a !important;
                  background-color: transparent !important;
                  background: transparent !important;
                }
                html.dark #general-purchase-printable-document table tbody tr {
                  background-color: transparent !important;
                  background: transparent !important;
                }
                html.dark #general-purchase-printable-document table tbody tr:hover {
                  background-color: #f8fafc !important;
                  background: #f8fafc !important;
                }
                html.dark #general-purchase-printable-document table tfoot,
                html.dark #general-purchase-printable-document table tfoot tr,
                html.dark #general-purchase-printable-document table tfoot td {
                  background-color: #f8fafc !important;
                  background: #f8fafc !important;
                  color: #0f172a !important;
                }
              `}</style>

              <div className="general-purchase-container relative bg-white dark:bg-[#111217] text-slate-900 rounded-2xl border border-slate-200 dark:border-[#22232E] shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden z-10 print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:m-0 print:p-0 print:overflow-visible print:rounded-none">
                {/* Modal Controls Bar */}
                <div className="no-print flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#22232E] bg-slate-50 dark:bg-[#161722] sticky top-0 z-10 print:hidden shrink-0">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Print Preview: Administrative Purchase Bill
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => window.print()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 h-8 gap-1.5 shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Now
                    </Button>
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202025] transition-colors"
                      title="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Document Area in Modal */}
                <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-[#0B0B0E] flex justify-center items-start print:p-0 print:bg-white print:overflow-visible print:max-h-none">
                  {/* Printable Document Sheet */}
                  <div
                    id="general-purchase-printable-document"
                    className="printable-paper-sheet printable-document-sheet general-purchase-print-sheet w-full max-w-[210mm] bg-white p-6 sm:p-8 border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 text-slate-900 font-sans space-y-5 print:space-y-6 h-fit flex flex-col justify-between"
                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                  >
                    {/* Document Header */}
                    <div className="border-b-2 border-slate-900 pb-3.5 flex justify-between items-start gap-4">
                      {/* Left: Logo + Company Info */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {company?.logo_url ? (
                          <img
                            src={company.logo_url}
                            alt={companyName}
                            crossOrigin="anonymous"
                            className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                            {companyFirstLetter}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h2 className="text-xl font-bold tracking-tight uppercase text-slate-900 leading-tight">
                            {companyName}
                          </h2>
                          {fullAddressLine ? (
                            <p className="text-xs text-slate-600 mt-1 leading-normal">
                              {fullAddressLine}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-500 mt-0.5">Corporate & Administrative Management</p>
                          )}
                          {(companyPhone || companyEmail || companyWebsite) && (
                            <p className="text-xs text-slate-600 leading-normal mt-0.5">
                              {companyPhone && <span>Phone: {companyPhone}</span>}
                              {companyPhone && companyEmail && <span> &nbsp;|&nbsp; </span>}
                              {companyEmail && <span>Email: {companyEmail}</span>}
                              {(companyPhone || companyEmail) && companyWebsite && <span> &nbsp;|&nbsp; </span>}
                              {companyWebsite && <span>Web: {companyWebsite}</span>}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-700 mt-1">
                            {companyGstin && (
                              <span className="font-mono text-[11px]">
                                <strong className="font-sans font-semibold text-slate-500">GSTIN: </strong>
                                {companyGstin}
                              </span>
                            )}
                            {companyPan && (
                              <span className="font-mono text-[11px]">
                                <strong className="font-sans font-semibold text-slate-500">PAN: </strong>
                                {companyPan}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Voucher Badge + Metadata */}
                      <div className="text-right shrink-0">
                        <span className="inline-block px-3 py-1 bg-slate-800 text-white text-xs font-bold uppercase rounded-md shadow-xs">
                          ADMINISTRATIVE PURCHASE BILL
                        </span>
                        <p className="text-sm font-mono font-bold mt-1 text-slate-900">{printVoucher.voucher_number}</p>
                        <p className="text-xs text-slate-600">{formatDate(printVoucher.voucher_date)}</p>
                        <p className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                          {printVoucher.is_void ? "STATUS: VOIDED" : `STATUS: ${printVoucher.payment_status || "PENDING"}`}
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          <span className="text-slate-500">Issuing Office: </span>
                          <span className="font-bold text-slate-800 uppercase">{officeName}</span>
                          {officeCode ? ` (${officeCode})` : ""}
                        </p>
                        {officeGstin && officeGstin !== companyGstin && (
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Office GSTIN: {officeGstin}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Supplier / Service Provider Grid */}
                    <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                      <div className="space-y-1">
                        <p className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Supplier / Service Provider:</p>
                        <p className="font-bold text-sm text-slate-900">{printVoucher.party_name || "Supplier / Vendor"}</p>
                        {printVoucher.party_gstin && (
                          <p className="text-slate-600 font-mono text-[11px]">GSTIN: {printVoucher.party_gstin}</p>
                        )}
                        {printVoucher.place_of_supply && (
                          <p className="text-slate-600 text-[11px]">Place of Supply: {printVoucher.place_of_supply}</p>
                        )}
                        <div className="pt-1 text-slate-700 space-y-0.5">
                          {printVoucher.reference_number && (
                            <p>
                              <span className="text-slate-500 font-medium">Supplier Invoice Ref #:</span>{" "}
                              <span className="font-mono font-semibold text-slate-900">{printVoucher.reference_number}</span>
                            </p>
                          )}
                          {printVoucher.reference_date && (
                            <p>
                              <span className="text-slate-500 font-medium">Invoice Date:</span>{" "}
                              <span className="text-slate-800">{formatDate(printVoucher.reference_date)}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          {(printVoucher.tax_breakup?.category || printVoucher.cost_center) && (
                            <p>
                              <span className="text-slate-500 font-medium">Expense Overhead:</span>{" "}
                              <span className="text-slate-800 font-semibold">{printVoucher.tax_breakup?.category || printVoucher.cost_center}</span>
                            </p>
                          )}
                          {printVoucher.due_date && (
                            <p>
                              <span className="text-slate-500 font-medium">Payment Due Date:</span>{" "}
                              <span className="text-slate-800">{formatDate(printVoucher.due_date)}</span>
                            </p>
                          )}
                          {printVoucher.credit_period_days ? (
                            <p>
                              <span className="text-slate-500 font-medium">Credit Period:</span>{" "}
                              <span className="text-slate-800">{printVoucher.credit_period_days} Days</span>
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-baseline">
                          <span className="text-slate-600 font-semibold uppercase text-[11px]">Net Payable Amount:</span>
                          <span className="text-xl font-bold font-mono text-indigo-700">
                            {formatCurrency(parseFloat(String(printVoucher.net_amount)) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount in Words */}
                    <div className="text-xs border-l-4 border-slate-700 pl-3 py-2 bg-slate-100 rounded-r-lg italic text-slate-800">
                      <span className="font-semibold text-slate-700 not-italic">Amount in Words: </span>
                      {numberToWords(parseFloat(String(printVoucher.net_amount)) || 0)}
                    </div>

                    {/* Line Items Table */}
                    {printVoucher.items && printVoucher.items.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          Administrative Expense Items ({printVoucher.items.length}):
                        </h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 text-left">#</th>
                                <th className="py-2 px-3 text-left">Expense Particulars</th>
                                <th className="py-2 px-3 text-center">HSN/SAC</th>
                                <th className="py-2 px-3 text-right">Qty</th>
                                <th className="py-2 px-3 text-right">Rate (₹)</th>
                                <th className="py-2 px-3 text-right">Tax (₹)</th>
                                <th className="py-2 px-3 text-right">Total (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              {printVoucher.items.map((it, idx) => (
                                <tr key={it.id || idx} className="hover:bg-slate-50/80">
                                  <td className="py-2 px-3 text-slate-500 font-sans text-left">{idx + 1}</td>
                                  <td className="py-2 px-3 font-sans font-semibold text-slate-900 text-left">
                                    {it.description}
                                    {it.tax_category_name && (
                                      <span className="text-[10px] text-slate-500 font-normal block font-sans">
                                        GST: {it.tax_category_name}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center text-slate-600">{it.hsn_sac || "—"}</td>
                                  <td className="py-2 px-3 text-right font-semibold text-slate-900">{it.quantity}</td>
                                  <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(it.rate)}</td>
                                  <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(it.tax_amount)}</td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(it.total_amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-mono text-[11px]">
                              <tr>
                                <td colSpan={3} className="py-2 px-3 uppercase font-sans text-[10px] text-slate-600">Subtotals:</td>
                                <td className="py-2 px-3 text-right">
                                  {printVoucher.items.reduce((acc, it) => acc + (parseFloat(String(it.quantity)) || 0), 0)}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-600">—</td>
                                <td className="py-2 px-3 text-right text-slate-700">{formatCurrency(printVoucher.tax_amount)}</td>
                                <td className="py-2 px-3 text-right font-bold text-indigo-700">{formatCurrency(printVoucher.net_amount)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Double-Entry Balanced Journal Postings Table */}
                    {printVoucher.ledger_entries && printVoucher.ledger_entries.length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          Double-Entry Balanced Journal Postings:
                        </h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                          <table className="w-full text-xs border-collapse">
                            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-3 text-left">Particulars / Account Head</th>
                                <th className="py-2 px-3 text-right w-36">Debit (Dr) ₹</th>
                                <th className="py-2 px-3 text-right w-36">Credit (Cr) ₹</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                              {printVoucher.ledger_entries.map((le) => (
                                <tr key={le.id} className={le.is_reversal ? "opacity-60 italic" : "hover:bg-slate-50/80"}>
                                  <td className="py-2 px-3 font-sans">
                                    <div className="font-semibold text-slate-900">
                                      {parseFloat(String(le.debit_amount)) > 0 ? "Dr. " : "    To "}
                                      {le.account_name || `Account #${le.account_id}`}
                                    </div>
                                    {le.narration && (
                                      <div className="text-[10px] text-slate-500 pl-4 mt-0.5">
                                        ({le.narration})
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                    {parseFloat(String(le.debit_amount)) > 0
                                      ? formatCurrency(parseFloat(String(le.debit_amount)))
                                      : "—"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                    {parseFloat(String(le.credit_amount)) > 0
                                      ? formatCurrency(parseFloat(String(le.credit_amount)))
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-mono text-[11px]">
                              <tr>
                                <td className="py-2 px-3 text-right uppercase font-sans text-[10px] text-slate-600">Total:</td>
                                <td className="py-2 px-3 text-right text-slate-900">
                                  {formatCurrency(
                                    printVoucher.ledger_entries
                                      .filter((e) => !e.is_reversal)
                                      .reduce((acc, e) => acc + (parseFloat(String(e.debit_amount)) || 0), 0)
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900">
                                  {formatCurrency(
                                    printVoucher.ledger_entries
                                      .filter((e) => !e.is_reversal)
                                      .reduce((acc, e) => acc + (parseFloat(String(e.credit_amount)) || 0), 0)
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Narration */}
                    {printVoucher.narration && (
                      <div className="text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                        <span className="font-semibold text-slate-700 uppercase text-[10px] tracking-wider block">Narration / Remarks:</span>
                        <span className="text-slate-800 italic mt-0.5 block">&quot;{printVoucher.narration}&quot;</span>
                      </div>
                    )}

                    {/* Signatures */}
                    <div className="pt-6 border-t border-slate-300 grid grid-cols-4 gap-4 text-center text-xs">
                      <div>
                        <div className="border-b border-slate-400 mb-1 h-8" />
                        <span className="text-slate-600 font-medium">Prepared By</span>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 mb-1 h-8" />
                        <span className="text-slate-600 font-medium">Passed / Accounts Head</span>
                      </div>
                      <div className="flex flex-col justify-end">
                        {company?.signature_url ? (
                          <div className="flex justify-center mb-1 h-8 items-end">
                            <img
                              src={company.signature_url}
                              alt="Signature"
                              crossOrigin="anonymous"
                              className="max-h-8 max-w-[110px] object-contain"
                            />
                          </div>
                        ) : (
                          <div className="border-b border-slate-400 mb-1 h-8" />
                        )}
                        <span className="text-slate-600 font-medium">
                          {company?.signing_authority_name || "Authorized Signatory"}
                        </span>
                        {company?.signing_authority_designation && (
                          <span className="text-[10px] text-slate-400"> ({company.signing_authority_designation})</span>
                        )}
                      </div>
                      <div>
                        <div className="border-b border-slate-400 mb-1 h-8" />
                        <span className="text-slate-600 font-medium">Supplier / Vendor Signature</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Actions Footer Bar */}
                <div className="no-print flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-[#2A2B36] bg-slate-50 dark:bg-[#161722] sticky bottom-0 z-10 print:hidden shrink-0">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {printVoucher.voucher_number} • {formatDate(printVoucher.voucher_date)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPrintModalOpen(false)}
                      className="text-xs h-8 px-3 rounded-lg dark:bg-[#1F202B] dark:border-[#2B2D3D] dark:text-slate-200 dark:hover:bg-[#262837]"
                    >
                      Close
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.print()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3.5 rounded-lg font-medium shadow-xs gap-1.5"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Voucher
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
