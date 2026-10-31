"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Plus,
  Ban,
  CheckCircle,
  AlertCircle,
  Eye,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Percent,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  X,
  Check,
  ShieldCheck,
  Layers,
  ArrowRight,
  Calculator,
  Download,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// Indian Rupees Number to Words helper
function numberToWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const n = Math.floor(Math.abs(num));
  const paise = Math.round((Math.abs(num) - n) * 100);
  if (n === 0 && paise === 0) return "Zero Rupees Only";

  const inWords = (val: number): string => {
    let str = "";
    if (val >= 10000000) {
      str += inWords(Math.floor(val / 10000000)) + "Crore ";
      val %= 10000000;
    }
    if (val >= 100000) {
      str += inWords(Math.floor(val / 100000)) + "Lakh ";
      val %= 100000;
    }
    if (val >= 1000) {
      str += inWords(Math.floor(val / 1000)) + "Thousand ";
      val %= 1000;
    }
    if (val >= 100) {
      str += inWords(Math.floor(val / 100)) + "Hundred ";
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) str += a[val];
      else {
        str += b[Math.floor(val / 10)] + " ";
        if (val % 10) str += a[val % 10];
      }
    }
    return str;
  };

  let res = inWords(n).trim() + " Rupees";
  if (paise > 0) {
    res += " and " + inWords(paise).trim() + " Paise";
  }
  return res + " Only";
}

type NoteCategory = "SALES_CREDIT_NOTE" | "SALES_DEBIT_NOTE" | "PURCHASE_DEBIT_NOTE" | "PURCHASE_CREDIT_NOTE";

interface LedgerEntry {
  id: number;
  account_id: number;
  account_name?: string;
  debit_amount: string | number;
  credit_amount: string | number;
  is_reversal: boolean;
  narration?: string;
}

interface BillAllocationRecord {
  id: number;
  voucher_id: number;
  invoice_id: number;
  allocated_amount: number;
  total_settled: number;
  adjustment_type: string;
  notes?: string;
  voucher_number?: string;
  invoice_number?: string;
}

interface VoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: "CREDIT_NOTE" | "DEBIT_NOTE";
  note_category?: NoteCategory;
  reason_code?: string;
  voucher_date: string;
  party_name?: string;
  party_type?: string;
  party_gstin?: string;
  place_of_supply?: string;
  reference_number?: string;
  reference_date?: string;
  against_voucher_id?: number;
  against_voucher_number?: string;
  total_amount: string | number;
  tax_amount: string | number;
  net_amount: string | number;
  paid_amount?: string | number;
  balance_amount?: string | number;
  payment_status?: string;
  tax_breakup?: {
    is_gst_note?: boolean;
    tax_rate?: number;
    taxable_amount?: number;
    tax_amount?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    reason_code?: string;
    reason_description?: string;
  };
  narration?: string;
  is_void: boolean;
  void_reason?: string;
  voided_at?: string;
  ledger_entries: LedgerEntry[];
  bill_allocations?: BillAllocationRecord[];
  created_at: string;
}

interface CustomerOption {
  id: number;
  name: string;
  gstin?: string;
  state?: string;
}

interface VendorOption {
  id: number;
  name: string;
  gstin?: string;
  state?: string;
}

interface EligibleInvoice {
  id: number;
  voucher_number: string;
  voucher_date: string;
  voucher_type: string;
  party_name?: string;
  party_gstin?: string;
  place_of_supply?: string;
  gst_treatment?: string;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  total_adjusted: number;
  allowable_adjustment: number;
}

export default function CreditDebitNotesPage() {
  const [data, setData] = useState<VoucherRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleInvoice[]>([]);

  // Filter state
  const [activeTab, setActiveTab] = useState<"ALL" | NoteCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "VOID">("ALL");
  const [gstFilter, setGstFilter] = useState<"ALL" | "GST" | "COMMERCIAL">("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [isEligibleLoading, setIsEligibleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Series states
  const [creditSeries, setCreditSeries] = useState<any>(null);
  const [debitSeries, setDebitSeries] = useState<any>(null);

  // Creation Drawer State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>("SALES_CREDIT_NOTE");
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [partySearch, setPartySearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [isGstNote, setIsGstNote] = useState(true);
  const [reasonCode, setReasonCode] = useState("04");
  const [reasonDescription, setReasonDescription] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [taxableAmount, setTaxableAmount] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [customCgst, setCustomCgst] = useState("");
  const [customSgst, setCustomSgst] = useState("");
  const [customIgst, setCustomIgst] = useState("");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Void Dialog State
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidVoucherId, setVoidVoucherId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // View Drawers / Modals
  const [viewVoucher, setViewVoucher] = useState<VoucherRecord | null>(null);
  const [printVoucher, setPrintVoucher] = useState<VoucherRecord | null>(null);

  // Load Initial Page Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const officeParam = activeOffice?.id ? `?office_id=${activeOffice.id}` : "";

      const [notesRes, clientsRes, vendorsRes, sCr, sDr] = await Promise.all([
        apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=CREDIT_DEBIT_NOTE").catch(async () => {
          // Fallback if combined query isn't supported
          const [cr, dr] = await Promise.all([
            apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=CREDIT_NOTE").catch(() => []),
            apiClient<VoucherRecord[]>("/api/v1/accounts/vouchers?voucher_type=DEBIT_NOTE").catch(() => []),
          ]);
          return [...cr, ...dr];
        }),
        apiClient<CustomerOption[]>("/api/v1/general/billing-clients").catch(() => []),
        apiClient<VendorOption[]>("/api/v1/general/vendors").catch(() => []),
        apiClient<any>(`/api/v1/settings/series/check/CREDIT_NOTE${officeParam}`).catch(() => null),
        apiClient<any>(`/api/v1/settings/series/check/DEBIT_NOTE${officeParam}`).catch(() => null),
      ]);

      setData(notesRes || []);
      setCustomers(clientsRes || []);
      setVendors(vendorsRes || []);
      setCreditSeries(sCr);
      setDebitSeries(sDr);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load credit and debit notes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch eligible invoices whenever party or category changes in creation drawer
  useEffect(() => {
    if (!isCreateOpen || !selectedPartyId) {
      setEligibleInvoices([]);
      setSelectedInvoiceId(null);
      return;
    }

    const fetchEligible = async () => {
      setIsEligibleLoading(true);
      try {
        const partyType = selectedCategory.startsWith("SALES") ? "CUSTOMER" : "VENDOR";
        const invs = await apiClient<EligibleInvoice[]>(
          `/api/v1/accounts/credit-debit-notes/eligible-invoices?party_type=${partyType}&party_id=${selectedPartyId}&category=${selectedCategory}`
        );
        setEligibleInvoices(invs || []);
      } catch {
        setEligibleInvoices([]);
      } finally {
        setIsEligibleLoading(false);
      }
    };

    fetchEligible();
  }, [isCreateOpen, selectedPartyId, selectedCategory]);

  // Handle invoice selection in drawer: auto-populate reference and max taxable
  const handleSelectInvoice = (invId: number | null) => {
    setSelectedInvoiceId(invId);
    if (!invId) return;
    const inv = eligibleInvoices.find((i) => i.id === invId);
    if (inv) {
      setReferenceNumber(inv.voucher_number);
      if (inv.tax_breakup?.tax_rate !== undefined) {
        setTaxRate(String(inv.tax_breakup.tax_rate));
      }
    }
  };

  // Selected invoice object
  const selectedInvoice = useMemo(() => {
    return eligibleInvoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [eligibleInvoices, selectedInvoiceId]);

  // Active Series based on category
  const activeSeries = selectedCategory === "SALES_CREDIT_NOTE" || selectedCategory === "PURCHASE_CREDIT_NOTE"
    ? creditSeries
    : debitSeries;

  // Auto-calculated Tax Amounts
  const parsedTaxable = parseFloat(taxableAmount) || 0;
  const parsedRate = parseFloat(taxRate) || 0;

  // Tax calculations
  const calculatedTax = useMemo(() => {
    if (!isGstNote || parsedTaxable <= 0 || parsedRate <= 0) {
      return { totalTax: 0, cgst: 0, sgst: 0, igst: 0, net: parsedTaxable };
    }
    const totTax = (parsedTaxable * parsedRate) / 100;
    // Check if intra-state: Maharashtra or default
    const cgst = totTax / 2;
    const sgst = totTax / 2;
    return {
      totalTax: Math.round(totTax * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: 0,
      net: Math.round((parsedTaxable + totTax) * 100) / 100,
    };
  }, [isGstNote, parsedTaxable, parsedRate]);

  // Open Drawer for a specific category
  const openCreateDrawer = (cat: NoteCategory) => {
    setSelectedCategory(cat);
    setSelectedPartyId(null);
    setSelectedInvoiceId(null);
    setTaxableAmount("");
    setReasonCode(cat === "SALES_CREDIT_NOTE" ? "02" : cat === "PURCHASE_DEBIT_NOTE" ? "03" : "06");
    setReasonDescription("");
    setReferenceNumber("");
    setNarration("");
    setIsGstNote(true);
    setIsCreateOpen(true);
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    let salesCn = 0;
    let salesDn = 0;
    let purchDn = 0;
    let netGst = 0;

    data.forEach((v) => {
      if (v.is_void) return;
      const net = parseFloat(String(v.net_amount || 0));
      const tax = parseFloat(String(v.tax_amount || 0));
      const cat = v.note_category || (v.voucher_type === "CREDIT_NOTE" ? "SALES_CREDIT_NOTE" : "SALES_DEBIT_NOTE");

      if (cat === "SALES_CREDIT_NOTE") {
        salesCn += net;
        netGst -= tax; // Reduces output tax liability
      } else if (cat === "SALES_DEBIT_NOTE") {
        salesDn += net;
        netGst += tax; // Increases output tax liability
      } else if (cat === "PURCHASE_DEBIT_NOTE") {
        purchDn += net;
        netGst += tax; // Reverses input tax credit (adds to liability)
      } else if (cat === "PURCHASE_CREDIT_NOTE") {
        netGst -= tax; // Increases input tax credit
      }
    });

    return { salesCn, salesDn, purchDn, netGst };
  }, [data]);

  // Filtered List
  const filteredData = useMemo(() => {
    return data.filter((v) => {
      // Category filter
      if (activeTab !== "ALL") {
        const cat = v.note_category || (v.voucher_type === "CREDIT_NOTE" ? "SALES_CREDIT_NOTE" : "SALES_DEBIT_NOTE");
        if (cat !== activeTab) return false;
      }
      // Status filter
      if (statusFilter === "ACTIVE" && v.is_void) return false;
      if (statusFilter === "VOID" && !v.is_void) return false;
      // GST filter
      const isGst = v.tax_breakup?.is_gst_note !== false && parseFloat(String(v.tax_amount || 0)) > 0;
      if (gstFilter === "GST" && !isGst) return false;
      if (gstFilter === "COMMERCIAL" && isGst) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = v.voucher_number?.toLowerCase().includes(q);
        const matchParty = v.party_name?.toLowerCase().includes(q);
        const matchRef = v.reference_number?.toLowerCase().includes(q) || v.against_voucher_number?.toLowerCase().includes(q);
        if (!matchNum && !matchParty && !matchRef) return false;
      }
      return true;
    });
  }, [data, activeTab, statusFilter, gstFilter, searchQuery]);

  // Submit Note
  const handleSubmitNote = async () => {
    if (!selectedPartyId) {
      toast.warning(`Please select a ${selectedCategory.startsWith("SALES") ? "Customer" : "Supplier/Vendor"}.`);
      return;
    }
    if (parsedTaxable <= 0) {
      toast.warning("Taxable amount must be greater than 0.");
      return;
    }

    const noteType = selectedCategory === "SALES_CREDIT_NOTE" || selectedCategory === "PURCHASE_CREDIT_NOTE"
      ? "CREDIT_NOTE"
      : "DEBIT_NOTE";

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const activeOffice = getActiveOffice();
      const party = selectedCategory.startsWith("SALES")
        ? customers.find((c) => c.id === selectedPartyId)
        : vendors.find((v) => v.id === selectedPartyId);

      await apiClient("/api/v1/accounts/credit-debit-notes", {
        method: "POST",
        body: JSON.stringify({
          note_type: noteType,
          note_category: selectedCategory,
          voucher_date: voucherDate,
          is_gst_note: isGstNote,
          against_voucher_id: selectedInvoiceId || undefined,
          party_type: selectedCategory.startsWith("SALES") ? "CUSTOMER" : "VENDOR",
          billing_client_id: selectedCategory.startsWith("SALES") ? selectedPartyId : undefined,
          vendor_id: !selectedCategory.startsWith("SALES") ? selectedPartyId : undefined,
          party_name: party?.name,
          party_gstin: party?.gstin,
          place_of_supply: party?.state,
          reason_code: reasonCode,
          reason_description: reasonDescription.trim() || undefined,
          reference_number: referenceNumber.trim() || undefined,
          reference_date: referenceDate || undefined,
          total_taxable_amount: parsedTaxable,
          tax_rate: isGstNote ? parsedRate : 0,
          tax_amount: calculatedTax.totalTax,
          cgst_amount: calculatedTax.cgst,
          sgst_amount: calculatedTax.sgst,
          igst_amount: calculatedTax.igst,
          net_amount: calculatedTax.net,
          narration: narration.trim() || undefined,
          series_id: activeSeries?.id || undefined,
        }),
      });

      toast.success(`${selectedCategory.replace(/_/g, " ").toLowerCase()} successfully issued & posted!`);
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to post note voucher.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Void Note
  const handleVoidNote = async () => {
    if (!voidVoucherId) return;
    if (voidReason.trim().length < 10) {
      toast.warning("Void reason must be at least 10 characters as per audit guidelines.");
      return;
    }

    setIsVoiding(true);
    try {
      await apiClient(`/api/v1/accounts/vouchers/${voidVoucherId}/void`, {
        method: "POST",
        body: JSON.stringify({ void_reason: voidReason.trim() }),
      });
      toast.success(`Note voucher #${voidVoucherId} has been voided and ledger entries reversed.`);
      setIsVoidOpen(false);
      setVoidReason("");
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to void voucher.");
    } finally {
      setIsVoiding(false);
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<VoucherRecord>[] = [
    {
      id: "voucher_number",
      header: "NOTE # & DATE",
      cell: (v: VoucherRecord) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground font-mono">{v.voucher_number}</span>
            {v.is_void ? (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 uppercase">VOIDED</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-500 border-emerald-500/30">POSTED</Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(v.voucher_date)}
          </span>
        </div>
      ),
    },
    {
      id: "note_category",
      header: "ADJUSTMENT CATEGORY",
      cell: (v: VoucherRecord) => {
        const cat = v.note_category || (v.voucher_type === "CREDIT_NOTE" ? "SALES_CREDIT_NOTE" : "SALES_DEBIT_NOTE");
        switch (cat) {
          case "SALES_CREDIT_NOTE":
            return (
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Customer Credit Note
                </span>
                <span className="text-[11px] text-muted-foreground">Bill Reduction / Claim</span>
              </div>
            );
          case "SALES_DEBIT_NOTE":
            return (
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Customer Debit Note
                </span>
                <span className="text-[11px] text-muted-foreground">Extra Charge / Detention</span>
              </div>
            );
          case "PURCHASE_DEBIT_NOTE":
            return (
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Supplier Debit Note
                </span>
                <span className="text-[11px] text-muted-foreground">Purchase Return / Shortage</span>
              </div>
            );
          case "PURCHASE_CREDIT_NOTE":
            return (
              <div className="flex flex-col">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-500">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Supplier Credit Note
                </span>
                <span className="text-[11px] text-muted-foreground">Additional Vendor Charge</span>
              </div>
            );
        }
      },
    },
    {
      id: "party_name",
      header: "CUSTOMER / VENDOR",
      cell: (v: VoucherRecord) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground text-sm">{v.party_name || "Unknown Party"}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {v.party_gstin ? `GSTIN: ${v.party_gstin}` : "Unregistered"}
          </span>
        </div>
      ),
    },
    {
      id: "reference",
      header: "ORIGINAL INVOICE",
      cell: (v: VoucherRecord) => (
        <div className="flex flex-col">
          {v.against_voucher_number || v.reference_number ? (
            <span className="font-mono text-xs font-medium text-primary">
              #{v.against_voucher_number || v.reference_number}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">On-Account / Direct</span>
          )}
          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
            {v.tax_breakup?.reason_description || `Reason Code ${v.reason_code || "04"}`}
          </span>
        </div>
      ),
    },
    {
      id: "amounts",
      header: "TAXABLE & GST",
      cell: (v: VoucherRecord) => {
        const taxable = parseFloat(String(v.total_amount || 0));
        const tax = parseFloat(String(v.tax_amount || 0));
        const isGst = v.tax_breakup?.is_gst_note !== false && tax > 0;
        return (
          <div className="flex flex-col text-right">
            <span className="text-xs text-muted-foreground">Taxable: {formatCurrency(taxable)}</span>
            <span className="text-xs font-medium text-muted-foreground">
              GST: {isGst ? formatCurrency(tax) : "₹0.00 (Commercial)"}
            </span>
          </div>
        );
      },
    },
    {
      id: "net_amount",
      header: "NET AMOUNT",
      cell: (v: VoucherRecord) => {
        const net = parseFloat(String(v.net_amount || 0));
        const isCredit = v.voucher_type === "CREDIT_NOTE";
        return (
          <div className="flex flex-col text-right">
            <span className={cn("font-bold text-sm", isCredit ? "text-emerald-500" : "text-amber-500")}>
              {formatCurrency(net)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">{v.voucher_type.replace(/_/g, " ")}</span>
          </div>
        );
      },
    },
  ];

  // Row Actions
  const rowActions: RowAction<VoucherRecord>[] = [
    {
      label: "Print Voucher",
      icon: <Printer className="w-4 h-4 mr-2" />,
      onClick: (v: VoucherRecord) => setPrintVoucher(v),
    },
    {
      label: "View Ledger Entries",
      icon: <Eye className="w-4 h-4 mr-2" />,
      onClick: (v: VoucherRecord) => setViewVoucher(v),
    },
    {
      label: "Void Voucher",
      icon: <Ban className="w-4 h-4 mr-2 text-destructive" />,
      onClick: (v: VoucherRecord) => {
        setVoidVoucherId(v.id);
        setIsVoidOpen(true);
      },
      danger: true,
      disabled: (v: VoucherRecord) => v.is_void,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Credit &amp; Debit Notes"
        description="Comprehensive Tally Prime style credit & debit notes for Indian transport logistics. Handles customer rate rebates, detention demurrage charges, shortage claims, and statutory GST Section 34 corrections."
      />

      {/* Series Master Warnings */}
      {(!creditSeries?.configured || !debitSeries?.configured) && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">Series Configuration Notice:</span>{" "}
              {!creditSeries?.configured && !debitSeries?.configured
                ? "No sequence series is configured for Credit Notes (CN) and Debit Notes (DN)."
                : !creditSeries?.configured
                ? "No sequence series is configured for Credit Notes (CN)."
                : "No sequence series is configured for Debit Notes (DN)."}
              {" Please configure under Settings > Series Master."}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/settings/series-master", "_blank")}
            className="border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
          >
            Configure Series
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CUSTOMER CREDIT NOTES"
          value={formatCurrency(kpis.salesCn)}
          icon={<TrendingDown className="w-5 h-5 text-blue-500" />}
          change="Bill Reductions"
          positive={true}
        />
        <KpiCard
          label="CUSTOMER DEBIT NOTES"
          value={formatCurrency(kpis.salesDn)}
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
          change="Detention & Extra Charges"
          positive={false}
        />
        <KpiCard
          label="SUPPLIER RETURNS & CLAIMS"
          value={formatCurrency(kpis.purchDn)}
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-500" />}
          change="Payables Reduced"
          positive={true}
        />
        <KpiCard
          label="NET GST IMPACT"
          value={formatCurrency(Math.abs(kpis.netGst))}
          icon={<Percent className="w-5 h-5 text-purple-500" />}
          change={kpis.netGst <= 0 ? "Output Liability Reduced" : "Output Liability Increased"}
          positive={kpis.netGst <= 0}
        />
      </div>

      {/* 4 Category Action Triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Button
          onClick={() => openCreateDrawer("SALES_CREDIT_NOTE")}
          className="h-auto py-3.5 px-4 flex flex-col items-start gap-1 bg-card hover:bg-muted border border-blue-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-blue-500 font-semibold text-sm">
            <ArrowDownLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Reduce Customer Bill</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Credit Note: Rate rebate, shortage claim, excess billing
          </span>
        </Button>

        <Button
          onClick={() => openCreateDrawer("SALES_DEBIT_NOTE")}
          className="h-auto py-3.5 px-4 flex flex-col items-start gap-1 bg-card hover:bg-muted border border-amber-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>Add Extra Customer Charge</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Debit Note: Vehicle detention, underbilling, extra drops
          </span>
        </Button>

        <Button
          onClick={() => openCreateDrawer("PURCHASE_DEBIT_NOTE")}
          className="h-auto py-3.5 px-4 flex flex-col items-start gap-1 bg-card hover:bg-muted border border-emerald-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm">
            <ArrowDownLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Reduce Supplier Bill</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Debit Note: Shortage deduction, purchase return, damage
          </span>
        </Button>

        <Button
          onClick={() => openCreateDrawer("PURCHASE_CREDIT_NOTE")}
          className="h-auto py-3.5 px-4 flex flex-col items-start gap-1 bg-card hover:bg-muted border border-purple-500/30 text-left transition-all group"
        >
          <div className="flex items-center gap-2 text-purple-500 font-semibold text-sm">
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>Adjust Supplier Charge</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Credit Note: Additional vendor bill, approved rate escalation
          </span>
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-card p-4 rounded-xl border border-border">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <Button
            variant={activeTab === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("ALL")}
            className="text-xs"
          >
            All Notes ({data.length})
          </Button>
          <Button
            variant={activeTab === "SALES_CREDIT_NOTE" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("SALES_CREDIT_NOTE")}
            className="text-xs text-blue-500 hover:text-blue-400"
          >
            Customer Reductions (CN)
          </Button>
          <Button
            variant={activeTab === "SALES_DEBIT_NOTE" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("SALES_DEBIT_NOTE")}
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            Customer Charges (DN)
          </Button>
          <Button
            variant={activeTab === "PURCHASE_DEBIT_NOTE" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("PURCHASE_DEBIT_NOTE")}
            className="text-xs text-emerald-500 hover:text-emerald-400"
          >
            Supplier Returns (DN)
          </Button>
          <Button
            variant={activeTab === "PURCHASE_CREDIT_NOTE" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("PURCHASE_CREDIT_NOTE")}
            className="text-xs text-purple-500 hover:text-purple-400"
          >
            Supplier Charges (CN)
          </Button>
        </div>

        {/* Search & Select Filters */}
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search note #, party, invoice #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="VOID">Voided Only</option>
          </select>

          <select
            value={gstFilter}
            onChange={(e: any) => setGstFilter(e.target.value)}
            className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="ALL">All Tax Types</option>
            <option value="GST">Statutory GST Notes</option>
            <option value="COMMERCIAL">Financial Commercial Notes</option>
          </select>

          <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          rowActions={rowActions}
          isLoading={isLoading}
          emptyState={
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground text-sm">No Credit or Debit Notes Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Use the buttons above to issue a customer credit note, extra detention charge, or supplier return.
              </p>
            </div>
          }
        />
      </div>

      {/* =========================================================================
          CREATE CREDIT / DEBIT NOTE DRAWER
          ========================================================================= */}
      <EntityDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          selectedCategory === "SALES_CREDIT_NOTE"
            ? "Reduce Customer Bill (Credit Note)"
            : selectedCategory === "SALES_DEBIT_NOTE"
            ? "Add Extra Customer Charge (Debit Note)"
            : selectedCategory === "PURCHASE_DEBIT_NOTE"
            ? "Reduce Supplier Bill (Purchase Return / Debit Note)"
            : "Adjust Supplier Charge (Purchase Credit Note)"
        }
        subtitle="Record Tally Prime double-entry adjustment with Indian GST Section 34 compliance."
        size="lg"
      >
        <div className="flex flex-col gap-6 p-1">
          {/* Category Switcher Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-muted/40 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => openCreateDrawer("SALES_CREDIT_NOTE")}
              className={cn(
                "py-2 px-2 rounded text-xs font-semibold text-center transition-all",
                selectedCategory === "SALES_CREDIT_NOTE"
                  ? "bg-blue-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Customer Credit
            </button>
            <button
              type="button"
              onClick={() => openCreateDrawer("SALES_DEBIT_NOTE")}
              className={cn(
                "py-2 px-2 rounded text-xs font-semibold text-center transition-all",
                selectedCategory === "SALES_DEBIT_NOTE"
                  ? "bg-amber-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Customer Debit
            </button>
            <button
              type="button"
              onClick={() => openCreateDrawer("PURCHASE_DEBIT_NOTE")}
              className={cn(
                "py-2 px-2 rounded text-xs font-semibold text-center transition-all",
                selectedCategory === "PURCHASE_DEBIT_NOTE"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Supplier Return
            </button>
            <button
              type="button"
              onClick={() => openCreateDrawer("PURCHASE_CREDIT_NOTE")}
              className={cn(
                "py-2 px-2 rounded text-xs font-semibold text-center transition-all",
                selectedCategory === "PURCHASE_CREDIT_NOTE"
                  ? "bg-purple-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Supplier Charge
            </button>
          </div>

          {/* Party Selection & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                {selectedCategory.startsWith("SALES") ? "Select Customer (Debtor) *" : "Select Supplier / Vendor (Creditor) *"}
              </label>
              <select
                value={selectedPartyId || ""}
                onChange={(e) => setSelectedPartyId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose {selectedCategory.startsWith("SALES") ? "Billing Client" : "Vendor"} --</option>
                {selectedCategory.startsWith("SALES")
                  ? customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.gstin ? `(${c.gstin})` : ""}
                      </option>
                    ))
                  : vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.gstin ? `(${v.gstin})` : ""}
                      </option>
                    ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Accounting / Note Date *</label>
              <input
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Link to Original Invoice / Bill */}
          {selectedPartyId && (
            <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Link to Original Invoice / Bill (Bill-wise Adjustment)
                </span>
                {isEligibleLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>

              {eligibleInvoices.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <select
                    value={selectedInvoiceId || ""}
                    onChange={(e) => handleSelectInvoice(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Select Original Invoice / Bill (or Leave Unlinked for On-Account) --</option>
                    {eligibleInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.voucher_number} ({formatDate(inv.voucher_date)}) — Original: {formatCurrency(inv.net_amount)} | Unpaid: {formatCurrency(inv.balance_amount)}
                      </option>
                    ))}
                  </select>

                  {/* Selected Invoice Details Pill */}
                  {selectedInvoice && (
                    <div className="mt-2 p-3 rounded-lg bg-background border border-border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-foreground">Invoice #{selectedInvoice.voucher_number}</span>
                        <div className="text-muted-foreground text-[11px] mt-0.5">
                          Total: {formatCurrency(selectedInvoice.net_amount)} | Already Paid: {formatCurrency(selectedInvoice.paid_amount)} | Balance Due: {formatCurrency(selectedInvoice.balance_amount)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setTaxableAmount(String(selectedInvoice.balance_amount || selectedInvoice.net_amount));
                        }}
                        className="text-xs h-7"
                      >
                        Adjust Full Remaining Balance
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  No open invoices found for this party. You can still record an On-Account Note.
                </div>
              )}
            </div>
          )}

          {/* Statutory GST Setting & Reason Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Adjustment Reason (GST Reason Code) *
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="01">01 - Sales / Purchase Return</option>
                <option value="02">02 - Post Sale Discount / Rebate</option>
                <option value="03">03 - Deficiency in Services / Shortage Claim</option>
                <option value="04">04 - Correction in Invoice / Rate Difference</option>
                <option value="05">05 - Demurrage / Vehicle Detention</option>
                <option value="06">06 - Other Operational Adjustments</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Specific Reason Description / Notes
              </label>
              <input
                type="text"
                placeholder="e.g. 5 cartons damaged, approved 10% freight concession..."
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Statutory GST Checkbox */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Statutory GST Note (Section 34 of CGST Act)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Adjusts CGST, SGST, IGST liabilities. If disabled, treated as a purely Commercial / Financial Note without GST adjustment.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isGstNote}
              onChange={(e) => setIsGstNote(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Amount and Taxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Taxable Adjustment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={taxableAmount}
                onChange={(e) => setTaxableAmount(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {isGstNote ? (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">GST Tax Rate *</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5% (GTA Road Freight)</option>
                  <option value="12">12% (Forward Charge Logistics)</option>
                  <option value="18">18% (Standard Business Services)</option>
                  <option value="28">28% (Luxury / Spares)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Tax Treatment</label>
                <div className="py-2 text-xs text-muted-foreground font-medium">
                  Financial Adjustment — Zero Tax Effect
                </div>
              </div>
            )}
          </div>

          {/* Live Before vs After Calculation Card */}
          {selectedInvoice && parsedTaxable > 0 && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2">
              <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                Before &amp; After Bill Settlement Preview
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1">
                <div className="p-2 rounded bg-card border border-border">
                  <div className="text-muted-foreground text-[10px]">CURRENT BALANCE</div>
                  <div className="font-semibold text-foreground text-sm mt-0.5">
                    {formatCurrency(selectedInvoice.balance_amount)}
                  </div>
                </div>
                <div className="p-2 rounded bg-card border border-border">
                  <div className="text-muted-foreground text-[10px]">
                    {selectedCategory === "SALES_CREDIT_NOTE" || selectedCategory === "PURCHASE_DEBIT_NOTE"
                      ? "ADJUSTMENT (REDUCTION)"
                      : "ADJUSTMENT (INCREASE)"}
                  </div>
                  <div className={cn(
                    "font-bold text-sm mt-0.5",
                    selectedCategory === "SALES_CREDIT_NOTE" || selectedCategory === "PURCHASE_DEBIT_NOTE"
                      ? "text-emerald-500"
                      : "text-amber-500"
                  )}>
                    {selectedCategory === "SALES_CREDIT_NOTE" || selectedCategory === "PURCHASE_DEBIT_NOTE" ? "-" : "+"}
                    {formatCurrency(calculatedTax.net)}
                  </div>
                </div>
                <div className="p-2 rounded bg-card border border-border">
                  <div className="text-muted-foreground text-[10px]">REVISED OUTSTANDING</div>
                  <div className="font-bold text-foreground text-sm mt-0.5">
                    {formatCurrency(
                      selectedCategory === "SALES_CREDIT_NOTE" || selectedCategory === "PURCHASE_DEBIT_NOTE"
                        ? Math.max(0, selectedInvoice.balance_amount - calculatedTax.net)
                        : selectedInvoice.balance_amount + calculatedTax.net
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Tally Double-Entry Preview Card */}
          {parsedTaxable > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col gap-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                Tally Prime Balanced Double-Entry Preview
              </span>
              <div className="bg-background rounded-lg border border-border overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-muted/50 p-2 font-medium text-muted-foreground border-b border-border">
                  <span className="col-span-8">PARTICULARS (LEDGER ACCOUNT)</span>
                  <span className="col-span-2 text-right">DEBIT (DR)</span>
                  <span className="col-span-2 text-right">CREDIT (CR)</span>
                </div>

                {selectedCategory === "SALES_CREDIT_NOTE" && (
                  <>
                    <div className="grid grid-cols-12 p-2 border-b border-border/40">
                      <span className="col-span-8 text-foreground">Dr. Freight Revenue / Sales Adjustment A/c</span>
                      <span className="col-span-2 text-right font-mono text-foreground">{formatCurrency(parsedTaxable)}</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                    </div>
                    {isGstNote && calculatedTax.totalTax > 0 && (
                      <div className="grid grid-cols-12 p-2 border-b border-border/40 text-muted-foreground">
                        <span className="col-span-8">Dr. Output GST Liability Reversal (CGST + SGST)</span>
                        <span className="col-span-2 text-right font-mono">{formatCurrency(calculatedTax.totalTax)}</span>
                        <span className="col-span-2 text-right font-mono">-</span>
                      </div>
                    )}
                    <div className="grid grid-cols-12 p-2">
                      <span className="col-span-8 text-foreground pl-4">To Sundry Debtors (Customer Ledger)</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                      <span className="col-span-2 text-right font-mono font-semibold text-emerald-500">{formatCurrency(calculatedTax.net)}</span>
                    </div>
                  </>
                )}

                {selectedCategory === "SALES_DEBIT_NOTE" && (
                  <>
                    <div className="grid grid-cols-12 p-2 border-b border-border/40">
                      <span className="col-span-8 text-foreground">Dr. Sundry Debtors (Customer Ledger)</span>
                      <span className="col-span-2 text-right font-mono font-semibold text-amber-500">{formatCurrency(calculatedTax.net)}</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                    </div>
                    <div className="grid grid-cols-12 p-2 border-b border-border/40">
                      <span className="col-span-8 text-foreground pl-4">To Freight Revenue / Detention Income A/c</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                      <span className="col-span-2 text-right font-mono text-foreground">{formatCurrency(parsedTaxable)}</span>
                    </div>
                    {isGstNote && calculatedTax.totalTax > 0 && (
                      <div className="grid grid-cols-12 p-2 text-muted-foreground">
                        <span className="col-span-8 pl-4">To Output GST Liability (CGST + SGST)</span>
                        <span className="col-span-2 text-right font-mono">-</span>
                        <span className="col-span-2 text-right font-mono">{formatCurrency(calculatedTax.totalTax)}</span>
                      </div>
                    )}
                  </>
                )}

                {selectedCategory === "PURCHASE_DEBIT_NOTE" && (
                  <>
                    <div className="grid grid-cols-12 p-2 border-b border-border/40">
                      <span className="col-span-8 text-foreground">Dr. Sundry Creditors (Vendor Ledger)</span>
                      <span className="col-span-2 text-right font-mono font-semibold text-emerald-500">{formatCurrency(calculatedTax.net)}</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                    </div>
                    <div className="grid grid-cols-12 p-2 border-b border-border/40">
                      <span className="col-span-8 text-foreground pl-4">To Truck Hire / Purchase Expense Reduction</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                      <span className="col-span-2 text-right font-mono text-foreground">{formatCurrency(parsedTaxable)}</span>
                    </div>
                    {isGstNote && calculatedTax.totalTax > 0 && (
                      <div className="grid grid-cols-12 p-2 text-muted-foreground">
                        <span className="col-span-8 pl-4">To Input Tax Credit (ITC) Reversal u/s 34(2)</span>
                        <span className="col-span-2 text-right font-mono">-</span>
                        <span className="col-span-2 text-right font-mono">{formatCurrency(calculatedTax.totalTax)}</span>
                      </div>
                    )}
                  </>
                )}

                {selectedCategory === "PURCHASE_CREDIT_NOTE" && (
                  <>
                    <div className="grid grid-cols-12 p-2 border-b border-border/40">
                      <span className="col-span-8 text-foreground">Dr. Truck Hire / Purchase Expense A/c</span>
                      <span className="col-span-2 text-right font-mono text-foreground">{formatCurrency(parsedTaxable)}</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                    </div>
                    {isGstNote && calculatedTax.totalTax > 0 && (
                      <div className="grid grid-cols-12 p-2 border-b border-border/40 text-muted-foreground">
                        <span className="col-span-8">Dr. Input Tax Credit (ITC) Asset</span>
                        <span className="col-span-2 text-right font-mono">{formatCurrency(calculatedTax.totalTax)}</span>
                        <span className="col-span-2 text-right font-mono">-</span>
                      </div>
                    )}
                    <div className="grid grid-cols-12 p-2">
                      <span className="col-span-8 text-foreground pl-4">To Sundry Creditors (Vendor Ledger)</span>
                      <span className="col-span-2 text-right font-mono text-muted-foreground">-</span>
                      <span className="col-span-2 text-right font-mono font-semibold text-purple-500">{formatCurrency(calculatedTax.net)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* External Reference & Narration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Party Document / Reference # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. VEND-CN-908"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Narration / Internal Remarks</label>
              <input
                type="text"
                placeholder="Brief audit remark for journal voucher..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Form Action Bar */}
          <FormActionBar
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={handleSubmitNote}
            isSubmitting={isSubmitting}
            submitLabel={`Post ${selectedCategory.replace(/_/g, " ").toLowerCase()}`}
          />
        </div>
      </EntityDrawer>

      {/* =========================================================================
          PRINTABLE NOTE MODAL (TALLY PRIME STYLE)
          ========================================================================= */}
      {printVoucher && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <span className="font-semibold text-sm text-foreground">Print / Preview Note Voucher</span>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                  <Printer className="w-3.5 h-3.5" /> Print Voucher
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPrintVoucher(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="bg-white text-black p-8 rounded border border-gray-300 font-sans text-sm flex flex-col gap-6">
              {/* Header */}
              <div className="text-center border-b border-gray-300 pb-4">
                <h1 className="text-xl font-bold uppercase tracking-wider text-black">
                  {printVoucher.note_category?.replace(/_/g, " ") || printVoucher.voucher_type.replace(/_/g, " ")}
                </h1>
                <p className="text-xs text-gray-600 mt-1">
                  Issued under Section 34 of the Central Goods and Services Tax Act, 2017
                </p>
              </div>

              {/* Document Meta Table */}
              <div className="grid grid-cols-2 gap-4 text-xs border border-gray-300 p-3 rounded">
                <div>
                  <div><span className="font-semibold">Voucher Number:</span> {printVoucher.voucher_number}</div>
                  <div><span className="font-semibold">Voucher Date:</span> {formatDate(printVoucher.voucher_date)}</div>
                  <div><span className="font-semibold">Original Invoice #:</span> {printVoucher.against_voucher_number || printVoucher.reference_number || "N/A"}</div>
                </div>
                <div>
                  <div><span className="font-semibold">Party Name:</span> {printVoucher.party_name || "N/A"}</div>
                  <div><span className="font-semibold">Party GSTIN:</span> {printVoucher.party_gstin || "Unregistered"}</div>
                  <div><span className="font-semibold">Place of Supply:</span> {printVoucher.place_of_supply || "Maharashtra"}</div>
                </div>
              </div>

              {/* Item Details */}
              <table className="w-full text-xs border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Description of Adjustment</th>
                    <th className="border border-gray-300 p-2 text-right">Taxable Value</th>
                    <th className="border border-gray-300 p-2 text-right">GST Rate</th>
                    <th className="border border-gray-300 p-2 text-right">Tax Amount</th>
                    <th className="border border-gray-300 p-2 text-right">Total Net (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2">
                      <div className="font-semibold">{printVoucher.tax_breakup?.reason_description || `Reason Code ${printVoucher.reason_code || "04"}`}</div>
                      <div className="text-gray-500 text-[10px]">{printVoucher.narration || "Operational freight adjustment"}</div>
                    </td>
                    <td className="border border-gray-300 p-2 text-right font-mono">{formatCurrency(parseFloat(String(printVoucher.total_amount || 0)))}</td>
                    <td className="border border-gray-300 p-2 text-right font-mono">{printVoucher.tax_breakup?.tax_rate || 0}%</td>
                    <td className="border border-gray-300 p-2 text-right font-mono">{formatCurrency(parseFloat(String(printVoucher.tax_amount || 0)))}</td>
                    <td className="border border-gray-300 p-2 text-right font-mono font-bold">{formatCurrency(parseFloat(String(printVoucher.net_amount || 0)))}</td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in Words */}
              <div className="border border-gray-300 p-3 rounded text-xs bg-gray-50">
                <span className="font-semibold">Amount Chargeable (in words):</span>
                <div className="italic mt-0.5">{numberToWords(parseFloat(String(printVoucher.net_amount || 0)))}</div>
              </div>

              {/* Signatory Footer */}
              <div className="flex justify-between items-end pt-12 text-xs">
                <div>
                  <div className="text-[10px] text-gray-500">Prepared by Accounts Department</div>
                  <div>PantherTMS Integrated ERP</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">For PantherTMS Transport Entity</div>
                  <div className="border-t border-gray-400 mt-12 pt-1 text-gray-600">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW JOURNAL / LEDGER ENTRIES DRAWER
          ========================================================================= */}
      <EntityDrawer
        isOpen={!!viewVoucher}
        onClose={() => setViewVoucher(null)}
        title={`Voucher #${viewVoucher?.voucher_number} Details`}
        subtitle="Double-entry journal ledger postings and audit audit history."
        size="md"
      >
        {viewVoucher && (
          <div className="flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground block text-[10px]">PARTY NAME</span>
                <span className="font-semibold text-foreground">{viewVoucher.party_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">TOTAL AMOUNT</span>
                <span className="font-semibold text-foreground">{formatCurrency(parseFloat(String(viewVoucher.net_amount)))}</span>
              </div>
            </div>

            <span className="font-semibold text-foreground">General Ledger Postings</span>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="p-2 text-left">Account</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {viewVoucher.ledger_entries.map((ent) => (
                    <tr key={ent.id} className={cn("border-b border-border/40", ent.is_reversal && "text-destructive line-through")}>
                      <td className="p-2">
                        <div className="font-medium">{ent.account_name || `Account #${ent.account_id}`}</div>
                        <div className="text-[10px] text-muted-foreground">{ent.narration}</div>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {parseFloat(String(ent.debit_amount)) > 0 ? formatCurrency(parseFloat(String(ent.debit_amount))) : "-"}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {parseFloat(String(ent.credit_amount)) > 0 ? formatCurrency(parseFloat(String(ent.credit_amount))) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EntityDrawer>

      {/* =========================================================================
          VOID CONFIRMATION DIALOG
          ========================================================================= */}
      <ConfirmDialog
        open={isVoidOpen}
        onOpenChange={setIsVoidOpen}
        title="Void Credit / Debit Note Voucher"
        description="Are you sure you want to void this note voucher? This action will generate balanced reversing ledger entries and restore the linked invoice balance. This action cannot be undone."
        confirmText="Void Voucher"
        onConfirm={handleVoidNote}
        isLoading={isVoiding}
        danger={true}
      >
        <div className="mt-4">
          <label className="text-xs font-medium text-foreground block mb-1">
            Audit Reason for Voiding (Min 10 characters) *
          </label>
          <textarea
            rows={3}
            placeholder="e.g. Issued under incorrect dispute head, client agreement revised..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            className="w-full bg-background border border-border rounded-md p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
