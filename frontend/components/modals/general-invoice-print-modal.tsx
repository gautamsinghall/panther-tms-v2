"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice } from "@/lib/auth";

export interface GeneralInvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  client?: any;
  companySettings?: any;
  branches?: any[];
  bankAccounts?: any[];
}

const GST_STATE_CODES: Record<string, string> = {
  "01": "JAMMU AND KASHMIR",
  "02": "HIMACHAL PRADESH",
  "03": "PUNJAB",
  "04": "CHANDIGARH",
  "05": "UTTARAKHAND",
  "06": "HARYANA",
  "07": "DELHI",
  "08": "RAJASTHAN",
  "09": "UTTAR PRADESH",
  "10": "BIHAR",
  "11": "SIKKIM",
  "12": "ARUNACHAL PRADESH",
  "13": "NAGALAND",
  "14": "MANIPUR",
  "15": "MIZORAM",
  "16": "TRIPURA",
  "17": "MEGHALAYA",
  "18": "ASSAM",
  "19": "WEST BENGAL",
  "20": "JHARKHAND",
  "21": "ODISHA",
  "22": "CHHATTISGARH",
  "23": "MADHYA PRADESH",
  "24": "GUJARAT",
  "26": "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
  "27": "MAHARASHTRA",
  "29": "KARNATAKA",
  "30": "GOA",
  "31": "LAKSHADWEEP",
  "32": "KERALA",
  "33": "TAMIL NADU",
  "34": "PUDUCHERRY",
  "35": "ANDAMAN AND NICOBAR ISLANDS",
  "36": "TELANGANA",
  "37": "ANDHRA PRADESH",
  "38": "LADAKH",
};

function formatStateOfSupply(stateNameOrCode?: string | null, gstin?: string | null): string {
  if (gstin && gstin.trim().length >= 2) {
    const code = gstin.trim().slice(0, 2);
    if (GST_STATE_CODES[code]) {
      return `${GST_STATE_CODES[code]} (${code})`;
    }
  }
  if (!stateNameOrCode) return "—";
  const trimmed = stateNameOrCode.trim().toUpperCase();
  for (const [code, name] of Object.entries(GST_STATE_CODES)) {
    if (trimmed === name || trimmed.includes(name) || name.includes(trimmed)) {
      return `${name} (${code})`;
    }
  }
  return trimmed;
}

function extractPan(gstin?: string | null, fallbackPan?: string | null): string {
  if (fallbackPan && fallbackPan.trim()) return fallbackPan.trim().toUpperCase();
  if (gstin && gstin.trim().length === 15) {
    return gstin.trim().slice(2, 12).toUpperCase();
  }
  return "—";
}

function formatDocDate(d?: string | null): string {
  if (!d) return "—";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return d;
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatInr(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === "") return "0.00";
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function amountToWords(num: number | string): string {
  const n = typeof num === "number" ? num : parseFloat(String(num).replace(/,/g, ""));
  if (isNaN(n) || n === 0) return "ZERO RUPEES ONLY";

  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function convertChunk(val: number): string {
    let out = "";
    if (val >= 100) {
      out += ones[Math.floor(val / 100)] + " HUNDRED ";
      val %= 100;
    }
    if (val > 0) {
      if (val < 20) {
        out += ones[val] + " ";
      } else {
        out += tens[Math.floor(val / 10)] + " ";
        if (val % 10 > 0) out += ones[val % 10] + " ";
      }
    }
    return out;
  }

  let whole = Math.floor(Math.abs(n));
  const paise = Math.round((Math.abs(n) - whole) * 100);

  let result = "";
  if (whole >= 10000000) {
    result += convertChunk(Math.floor(whole / 10000000)) + "CRORE ";
    whole %= 10000000;
  }
  if (whole >= 100000) {
    result += convertChunk(Math.floor(whole / 100000)) + "LAKH ";
    whole %= 100000;
  }
  if (whole >= 1000) {
    result += convertChunk(Math.floor(whole / 1000)) + "THOUSAND ";
    whole %= 1000;
  }
  if (whole > 0) {
    result += convertChunk(whole);
  }

  result = result.trim() + " RUPEES";
  if (paise > 0) {
    result += " AND " + convertChunk(paise).trim() + " PAISE";
  }
  return result + " ONLY";
}

export function GeneralInvoicePrintModal({
  isOpen,
  onClose,
  invoice,
  client: propClient,
  companySettings: propCompany,
  branches: propBranches,
  bankAccounts: propBankAccounts,
}: GeneralInvoicePrintModalProps) {
  const [mounted, setMounted] = useState(false);
  const [company, setCompany] = useState<any>(propCompany || null);
  const [branches, setBranches] = useState<any[]>(propBranches || []);
  const [bankAccounts, setBankAccounts] = useState<any[]>(propBankAccounts || []);
  const [resolvedClient, setResolvedClient] = useState<any>(propClient || null);
  const [selectedCopy, setSelectedCopy] = useState<string>("ORIGINAL FOR RECIPIENT");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Load company details if not provided
    if (!propCompany) {
      apiClient<any>("/api/v1/profile/company")
        .then((data) => setCompany(data))
        .catch(() => {});
    } else {
      setCompany(propCompany);
    }

    // Load branches if not provided
    if (!propBranches || propBranches.length === 0) {
      apiClient<any[]>("/api/v1/profile/branches")
        .then((data) => setBranches(Array.isArray(data) ? data : []))
        .catch(() => {});
    } else {
      setBranches(propBranches);
    }

    // Load bank accounts if not provided
    if (!propBankAccounts || propBankAccounts.length === 0) {
      apiClient<any[]>("/api/v1/accounts/bank-accounts")
        .then((data) => setBankAccounts(Array.isArray(data) ? data : []))
        .catch(() => {});
    } else {
      setBankAccounts(propBankAccounts);
    }

    // Resolve client details if missing
    if (propClient) {
      setResolvedClient(propClient);
    } else if (invoice?.billing_client_id) {
      apiClient<any>(`/api/v1/general/billing-clients/${invoice.billing_client_id}`)
        .then((data) => setResolvedClient(data))
        .catch(() => {
          if (invoice?.billing_client) setResolvedClient(invoice.billing_client);
        });
    } else if (invoice?.billing_client) {
      setResolvedClient(invoice.billing_client);
    }
  }, [isOpen, invoice, propCompany, propBranches, propBankAccounts, propClient]);

  if (!mounted || !isOpen || !invoice) return null;

  const auth = getStoredAuth();
  const activeOffice = getActiveOffice();

  // 1. Resolve Company Details
  const companyName = company?.company_name?.trim() || auth?.tenantName || "PANTHER LOGISTICS & SERVICES";
  const companyLogoUrl = company?.logo_url || null;
  const companyFirstLetter = companyName.charAt(0).toUpperCase() || "P";

  // 2. Resolve Issuing Office / Branch
  const targetOfficeId = invoice.issuing_office_id || activeOffice?.id;
  const issuingBranch =
    branches.find((b) => b.id === targetOfficeId) ||
    branches.find((b) => b.is_head_office) ||
    branches[0] ||
    null;

  const issuingOfficeName =
    invoice.issuing_office_details?.name ||
    invoice.issuing_office_name ||
    issuingBranch?.name ||
    activeOffice?.name ||
    "HEAD OFFICE";

  const companyGstin =
    issuingBranch?.gstin?.trim() || company?.gstin?.trim() || invoice.issuing_office_details?.gstin || "—";
  const companyPan =
    company?.pan?.trim() ||
    issuingBranch?.pan?.trim() ||
    invoice.issuing_office_details?.pan ||
    extractPan(companyGstin);
  const companyMsme =
    company?.msme_registration_no?.trim() ||
    issuingBranch?.msme_registration_no?.trim() ||
    invoice.issuing_office_details?.msme_registration_no ||
    "—";

  // Company Address for Header
  const headOfficeAddress =
    company?.address?.trim() ||
    issuingBranch?.address?.trim() ||
    `${issuingBranch?.city || "Delhi"}, ${issuingBranch?.state || "Delhi"}`;
  const headOfficePhone = company?.phone?.trim() || issuingBranch?.phone?.trim() || "—";
  const headOfficeEmail = company?.email?.trim() || issuingBranch?.email?.trim() || "—";

  // 3. Resolve Client / Recipient Details
  const clientData = resolvedClient || invoice.client_details || invoice.billing_client || null;
  const clientName =
    invoice.party_name ||
    clientData?.name ||
    clientData?.company_name ||
    "General Client";
  const clientTradeName =
    clientData?.company_name && clientData.company_name !== clientName ? clientData.company_name : null;
  const clientAddress =
    clientData?.address ||
    invoice.party_address ||
    "—";
  const clientCity = clientData?.city || invoice.party_city || "";
  const clientState = clientData?.state || invoice.party_state || invoice.place_of_supply || "";
  const clientGstin = invoice.party_gstin || clientData?.gstin || "—";
  const clientPan = clientData?.pan || extractPan(clientGstin);

  // 4. Resolve Invoice Credentials
  const invoiceNo = invoice.voucher_number || invoice.invoice_number || "—";
  const invoiceDate = formatDocDate(invoice.voucher_date);
  const dueDate = formatDocDate(invoice.due_date || invoice.voucher_date);
  const creditDays = invoice.credit_period_days || 30;
  const stateOfSupply = formatStateOfSupply(
    invoice.place_of_supply || clientState,
    clientGstin !== "—" ? clientGstin : null
  );
  const isRcm = invoice.gst_treatment === "RCM";
  const referenceNumber = invoice.reference_number || "—";
  const referenceDate = invoice.reference_date ? formatDocDate(invoice.reference_date) : null;
  const costCenter = invoice.cost_center || "General Corporate";
  const narration = invoice.narration || "—";

  // 5. Financials & Line Items
  const rawItems: any[] = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [];
  const taxableAmount = parseFloat(String(invoice.total_amount || 0));
  const taxAmount = parseFloat(String(invoice.tax_amount || 0));
  const netAmount = parseFloat(String(invoice.net_amount || taxableAmount + taxAmount));

  // Determine if Intra-State or Inter-State
  const companyStateCode = companyGstin.length >= 2 ? companyGstin.slice(0, 2) : "";
  const clientStateCode = clientGstin.length >= 2 ? clientGstin.slice(0, 2) : "";
  const isIntraState = Boolean(
    companyStateCode && clientStateCode
      ? companyStateCode === clientStateCode
      : invoice.place_of_supply && headOfficeAddress
      ? headOfficeAddress.toUpperCase().includes(invoice.place_of_supply.toUpperCase())
      : true
  );

  // Tax breakdown
  const taxBreakup = invoice.tax_breakup || {};
  let cgstRate = taxBreakup.cgst_rate !== undefined ? Number(taxBreakup.cgst_rate) : 0;
  let sgstRate = taxBreakup.sgst_rate !== undefined ? Number(taxBreakup.sgst_rate) : 0;
  let igstRate = taxBreakup.igst_rate !== undefined ? Number(taxBreakup.igst_rate) : 0;
  let cgstAmount = taxBreakup.cgst_amount !== undefined ? Number(taxBreakup.cgst_amount) : 0;
  let sgstAmount = taxBreakup.sgst_amount !== undefined ? Number(taxBreakup.sgst_amount) : 0;
  let igstAmount = taxBreakup.igst_amount !== undefined ? Number(taxBreakup.igst_amount) : 0;

  if (taxAmount > 0 && cgstAmount === 0 && sgstAmount === 0 && igstAmount === 0) {
    const calcRate = taxableAmount > 0 ? Math.round((taxAmount / taxableAmount) * 100) : 18;
    if (isIntraState) {
      cgstRate = calcRate / 2;
      sgstRate = calcRate / 2;
      cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
      sgstAmount = taxAmount - cgstAmount;
    } else {
      igstRate = calcRate;
      igstAmount = taxAmount;
    }
  }

  // Group line items by HSN/SAC for Tax Matrix
  const hsnSummaryMap: Record<
    string,
    {
      hsn_sac: string;
      taxable: number;
      rate: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
    }
  > = {};

  if (rawItems.length > 0) {
    rawItems.forEach((itm) => {
      const hsn = itm.hsn_sac?.trim() || "9967";
      const q = parseFloat(String(itm.quantity || 1));
      const r = parseFloat(String(itm.rate || 0));
      const d = parseFloat(String(itm.discount_amount || 0));
      const lineTaxable = itm.taxable_amount !== undefined ? parseFloat(String(itm.taxable_amount)) : Math.max(0, q * r - d);
      const lineTax = parseFloat(String(itm.tax_amount || 0));

      let effectiveRate = 18;
      if (lineTaxable > 0 && lineTax > 0) {
        effectiveRate = Math.round((lineTax / lineTaxable) * 100);
      } else if (cgstRate > 0 || igstRate > 0) {
        effectiveRate = igstRate || (cgstRate + sgstRate);
      }

      if (!hsnSummaryMap[hsn]) {
        hsnSummaryMap[hsn] = {
          hsn_sac: hsn,
          taxable: 0,
          rate: effectiveRate,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
        };
      }
      hsnSummaryMap[hsn].taxable += lineTaxable;
      hsnSummaryMap[hsn].totalTax += lineTax;
      if (isIntraState) {
        hsnSummaryMap[hsn].cgst += lineTax / 2;
        hsnSummaryMap[hsn].sgst += lineTax / 2;
      } else {
        hsnSummaryMap[hsn].igst += lineTax;
      }
    });
  } else {
    const defaultHsn = "9967";
    hsnSummaryMap[defaultHsn] = {
      hsn_sac: defaultHsn,
      taxable: taxableAmount,
      rate: igstRate || (cgstRate + sgstRate) || 18,
      cgst: cgstAmount,
      sgst: sgstAmount,
      igst: igstAmount,
      totalTax: taxAmount,
    };
  }

  const hsnSummaryList = Object.values(hsnSummaryMap);

  // Check if any items have discounts
  const hasDiscounts = rawItems.some((itm) => parseFloat(String(itm.discount_amount || 0)) > 0);

  // 6. Bank Account Details
  const defaultBank =
    bankAccounts.find((b) => b.is_default) ||
    bankAccounts.find((b) => b.issuing_office_id === targetOfficeId) ||
    bankAccounts[0] ||
    null;

  const bankName =
    defaultBank?.custom_bank_name ||
    defaultBank?.bank_name ||
    issuingBranch?.bank_name ||
    company?.bank_name ||
    "";
  const bankBranch =
    defaultBank?.branch_name ||
    issuingBranch?.bank_branch ||
    company?.bank_branch ||
    "";
  const bankAccountNo =
    defaultBank?.account_number ||
    defaultBank?.account_number_masked ||
    issuingBranch?.bank_account_no ||
    company?.bank_account_no ||
    "—";
  const bankIfsc =
    defaultBank?.ifsc_code ||
    issuingBranch?.bank_ifsc ||
    company?.bank_ifsc ||
    "—";
  const bankSwift =
    issuingBranch?.swift_code ||
    company?.swift_code ||
    defaultBank?.micr_code ||
    "";

  // Jurisdiction city for Terms
  const jurisdictionCity =
    issuingBranch?.city ||
    company?.city ||
    (companyGstin.startsWith("07") ? "Delhi" : companyGstin.startsWith("27") ? "Mumbai" : "Head Office");

  return createPortal(
    <div className="general-invoice-modal-portal fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto">
      {/* Backdrop */}
      <div
        className="general-invoice-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="general-invoice-container relative w-full max-w-5xl my-auto bg-white dark:bg-[#111217] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#22232E] overflow-hidden z-10 flex flex-col print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Controls Bar (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 dark:bg-[#161722] border-b border-slate-200 dark:border-[#22232E]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">General Tax Invoice Preview</span>
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
              {[
                "ORIGINAL FOR RECIPIENT",
                "DUPLICATE FOR SUPPLIER",
                "TRIPLICATE FOR BUYER",
              ].map((copy) => (
                <button
                  key={copy}
                  onClick={() => setSelectedCopy(copy)}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    selectedCopy === copy
                      ? "bg-white dark:bg-[#2A2B36] text-indigo-700 dark:text-indigo-400 font-bold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {copy.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => window.print()}
              className="gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Document Area in Modal */}
        <div className="max-h-[85vh] overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-[#0B0B0E] flex justify-center items-start print:p-0 print:bg-white print:overflow-visible print:max-h-none">
          {/* Printable Document Sheet (Exact A4 Styling) */}
          <div
            id="printable-tax-invoice"
            className="printable-paper-sheet printable-document-sheet w-full max-w-[210mm] bg-white p-6 sm:p-8 border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 text-slate-900 font-sans min-h-[280mm] h-fit flex flex-col justify-between"
          >
            <div className="bg-transparent">
              {/* Header: Logo, Company Name, Contact, TAX INVOICE title */}
              <div className="flex items-start justify-between gap-4">
                {/* Left: Monogram / Logo + Company Info */}
                <div className="flex items-start gap-3.5">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt={companyName}
                      className="w-12 h-12 object-contain rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-[#1e40af] text-white flex items-center justify-center font-black text-2xl shadow-xs shrink-0">
                      {companyFirstLetter}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight leading-tight">
                      {companyName}
                    </h1>
                    <p className="text-xs text-slate-600 mt-1 leading-normal">
                      Head Office: {headOfficeAddress}
                    </p>
                    <p className="text-xs text-slate-600 leading-normal">
                      Phone: {headOfficePhone} &nbsp;|&nbsp; Email: {headOfficeEmail}
                    </p>
                  </div>
                </div>

                {/* Right: TAX INVOICE + Copy Badge */}
                <div className="text-right shrink-0">
                  <h2 className="text-2xl font-black uppercase text-[#1d4ed8] tracking-tight">
                    TAX INVOICE
                  </h2>
                  <div className="mt-1">
                    <span className="inline-block bg-blue-50 text-[#1d4ed8] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm border border-blue-200">
                      {selectedCopy}
                    </span>
                  </div>
                </div>
              </div>

              {/* Blue Divider Bar */}
              <div className="h-[3px] bg-[#1d4ed8] mt-3.5 mb-3.5" />

              {/* Row 1: Company Registration Details & Invoice Credentials (Two Columns) */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                {/* Company Registration Details */}
                <div className="border border-slate-200 border-t-2 border-t-[#1e40af] rounded-xs p-2.5 bg-slate-50/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1.5">
                    COMPANY REGISTRATION DETAILS
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">GSTIN:</span>
                      <span className="font-mono font-bold text-slate-900">{companyGstin}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">PAN Number:</span>
                      <span className="font-mono font-bold text-slate-900">{companyPan}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">MSME Registration No:</span>
                      <span className="font-bold text-slate-900">{companyMsme}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Issuing Office:</span>
                      <span className="font-bold uppercase text-slate-900">{issuingOfficeName}</span>
                    </div>
                  </div>
                </div>

                {/* Invoice Credentials */}
                <div className="border border-slate-200 border-t-2 border-t-[#1e40af] rounded-xs p-2.5 bg-slate-50/40">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1.5">
                    INVOICE CREDENTIALS
                  </span>
                  <div className="space-y-1 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Invoice No:</span>
                      <span className="font-mono font-bold text-[#1e40af]">{invoiceNo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Invoice Date:</span>
                      <span className="font-bold text-slate-900">{invoiceDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-bold text-slate-900">{dueDate} ({creditDays} Days)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">State of Supply:</span>
                      <span className="font-bold text-slate-900">{stateOfSupply}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Reverse Charge (RCM):</span>
                      <span className="font-bold text-slate-900">{isRcm ? "YES (Sec 9(3))" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: IRN & ACK Strip (Shown when IRN exists) */}
              {invoice.irn && (
                <div className="bg-[#f0f7ff] border border-blue-200 rounded-xs p-2 text-xs mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#1e40af] shrink-0">IRN:</span>
                    <span className="font-mono text-[10px] text-slate-800 break-all select-all">
                      {invoice.irn}
                    </span>
                  </div>
                  {(invoice.ack_no || invoice.ack_date) && (
                    <div className="flex items-center gap-6 mt-1 text-[11px]">
                      <div>
                        <span className="font-bold text-[#1e40af]">ACK No:</span>{" "}
                        <span className="font-mono text-slate-900">{invoice.ack_no || "—"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#1e40af]">ACK Date:</span>{" "}
                        <span className="text-slate-900">{invoice.ack_date || "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 3: Billed To / Recipient & Compliance & Reference Details */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                {/* Billed To / Recipient */}
                <div className="border border-slate-200 border-t-2 border-t-[#1e40af] rounded-xs p-2.5 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1">
                    BILLED TO / RECIPIENT
                  </span>
                  <p className="font-black text-slate-900 text-xs uppercase leading-snug">
                    {clientName}
                  </p>
                  {clientTradeName && (
                    <p className="text-[11px] font-semibold text-slate-700 mt-0.5">
                      M/S: {clientTradeName}
                    </p>
                  )}
                  <p className="text-slate-600 mt-1 leading-normal text-[11px]">
                    {clientAddress}
                  </p>
                  {(clientCity || clientState) && (
                    <p className="text-slate-600 text-[11px]">
                      {[clientCity, clientState].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>

                {/* Recipient Compliance & Reference Details */}
                <div className="border border-slate-200 border-t-2 border-t-[#1e40af] rounded-xs p-2.5 bg-white flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1.5">
                      COMPLIANCE & COMMERCIAL REFERENCE
                    </span>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Client GSTIN:</span>
                      <span className="font-mono font-bold text-slate-900">{clientGstin}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Client PAN:</span>
                      <span className="font-mono font-bold text-slate-900">{clientPan}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">PO / Order Ref:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {referenceNumber}
                        {referenceDate ? ` (Dated: ${referenceDate})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="text-slate-500">Cost Center:</span>
                      <span className="font-medium text-slate-900">{costCenter}</span>
                    </div>
                  </div>
                  {narration && narration !== "—" && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-start gap-2">
                      <span className="text-slate-500 shrink-0 text-[10px]">Remarks:</span>
                      <span className="font-medium text-slate-800 text-[10px] leading-snug line-clamp-2">
                        {narration}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* General Goods & Services Itemized Table */}
              <div className="border border-slate-300 rounded-xs overflow-hidden mb-3 bg-white">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#0f172a] text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-2 border-r border-slate-700 text-center w-10">S.NO</th>
                      <th className="p-2 border-r border-slate-700 text-left">DESCRIPTION OF GOODS / SERVICES</th>
                      <th className="p-2 border-r border-slate-700 text-center w-20">HSN / SAC</th>
                      <th className="p-2 border-r border-slate-700 text-right w-16">QTY</th>
                      <th className="p-2 border-r border-slate-700 text-right w-24">RATE (₹)</th>
                      <th className="p-2 border-r border-slate-700 text-right w-24">AMOUNT (₹)</th>
                      {hasDiscounts && (
                        <th className="p-2 border-r border-slate-700 text-right w-20">DISC (₹)</th>
                      )}
                      <th className="p-2 border-r border-slate-700 text-right w-24">TAXABLE (₹)</th>
                      <th className="p-2 border-r border-slate-700 text-right w-20">TAX (₹)</th>
                      <th className="p-2 text-right w-28">TOTAL (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rawItems.length > 0 ? (
                      rawItems.map((itm: any, idx: number) => {
                        const q = parseFloat(String(itm.quantity || 1));
                        const r = parseFloat(String(itm.rate || 0));
                        const grossAmount = q * r;
                        const disc = parseFloat(String(itm.discount_amount || 0));
                        const lineTaxable =
                          itm.taxable_amount !== undefined && itm.taxable_amount !== null
                            ? parseFloat(String(itm.taxable_amount))
                            : Math.max(0, grossAmount - disc);
                        const lineTax = parseFloat(String(itm.tax_amount || 0));
                        const lineTotal =
                          itm.total_amount !== undefined && itm.total_amount !== null
                            ? parseFloat(String(itm.total_amount))
                            : lineTaxable + lineTax;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-200 text-left">
                              <span className="font-bold text-slate-900 block leading-tight">
                                {itm.description || itm.charge_head_name || "General Service"}
                              </span>
                              {itm.charge_head_name && itm.charge_head_name !== itm.description && (
                                <span className="text-[10px] text-slate-500 block uppercase">
                                  Head: {itm.charge_head_name}
                                </span>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-center font-mono">
                              {itm.hsn_sac || "9967"}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {q.toFixed(2)}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {formatInr(r)}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {formatInr(grossAmount > 0 ? grossAmount : lineTaxable)}
                            </td>
                            {hasDiscounts && (
                              <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600">
                                {disc > 0 ? formatInr(disc) : "—"}
                              </td>
                            )}
                            <td className="p-2 border-r border-slate-200 text-right font-mono font-semibold">
                              {formatInr(lineTaxable)}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-700">
                              {formatInr(lineTax)}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {formatInr(lineTotal)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">1</td>
                        <td className="p-2.5 border-r border-slate-200 text-left font-bold text-slate-900">
                          {narration !== "—" ? narration : "General Professional / Business Services"}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">9967</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">1.00</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">{formatInr(taxableAmount)}</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">{formatInr(taxableAmount)}</td>
                        {hasDiscounts && (
                          <td className="p-2.5 border-r border-slate-200 text-right font-mono">—</td>
                        )}
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-semibold">{formatInr(taxableAmount)}</td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono">{formatInr(taxAmount)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatInr(netAmount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Middle Section: Amount in Words + Tax Breakdown (Left) & Financial Summary Box (Right) */}
              <div className="grid grid-cols-12 gap-3 text-xs mb-3">
                {/* Left Column (Span 7) */}
                <div className="col-span-7 space-y-2.5">
                  {/* Amount Chargeable In Words Box */}
                  <div className="bg-[#f0f7ff] border border-blue-200 rounded-xs p-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1">
                      AMOUNT CHARGEABLE IN WORDS
                    </span>
                    <p className="font-bold text-slate-900 uppercase text-[11px] leading-relaxed">
                      {amountToWords(netAmount)}
                    </p>
                  </div>

                  {/* Tax Breakdown Matrix Table */}
                  <div className="border border-slate-300 rounded-xs overflow-hidden bg-white">
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                          <th className="p-1.5 border-r border-slate-300 text-center">HSN/SAC</th>
                          <th className="p-1.5 border-r border-slate-300 text-right">Taxable Value</th>
                          {isIntraState ? (
                            <>
                              <th className="p-1.5 border-r border-slate-300 text-right">CGST</th>
                              <th className="p-1.5 border-r border-slate-300 text-right">SGST</th>
                            </>
                          ) : (
                            <th className="p-1.5 border-r border-slate-300 text-right">IGST</th>
                          )}
                          <th className="p-1.5 text-right">Total Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hsnSummaryList.map((row, rIdx) => (
                          <tr key={rIdx} className="border-b border-slate-200 bg-white">
                            <td className="p-1.5 border-r border-slate-200 text-center font-mono text-slate-900">
                              {row.hsn_sac}
                            </td>
                            <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-900">
                              {formatInr(row.taxable)}
                            </td>
                            {isIntraState ? (
                              <>
                                <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-900">
                                  {formatInr(row.cgst)}
                                  <span className="block text-[9px] text-slate-400">
                                    @{((row.rate || cgstRate * 2 || 18) / 2).toFixed(1)}%
                                  </span>
                                </td>
                                <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-900">
                                  {formatInr(row.sgst)}
                                  <span className="block text-[9px] text-slate-400">
                                    @{((row.rate || sgstRate * 2 || 18) / 2).toFixed(1)}%
                                  </span>
                                </td>
                              </>
                            ) : (
                              <td className="p-1.5 border-r border-slate-200 text-right font-mono text-slate-900">
                                {formatInr(row.igst)}
                                <span className="block text-[9px] text-slate-400">
                                  @{row.rate || igstRate || 18}%
                                </span>
                              </td>
                            )}
                            <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                              {formatInr(row.totalTax)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column (Span 5): Financial Totals Box */}
                <div className="col-span-5 border border-slate-300 rounded-xs overflow-hidden flex flex-col justify-between bg-white">
                  <div className="p-2 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Sub Total (Taxable):</span>
                      <span className="font-mono font-semibold">₹ {formatInr(taxableAmount)}</span>
                    </div>
                    {isIntraState ? (
                      <>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Add CGST:</span>
                          <span className="font-mono font-semibold">₹ {formatInr(cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Add SGST:</span>
                          <span className="font-mono font-semibold">₹ {formatInr(sgstAmount)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Add IGST:</span>
                        <span className="font-mono font-semibold">₹ {formatInr(igstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-900 pt-1 border-t border-slate-200 font-bold">
                      <span>Total Tax Amount:</span>
                      <span className="font-mono">₹ {formatInr(taxAmount)}</span>
                    </div>
                  </div>

                  {/* Grand Total Bar */}
                  <div className="bg-[#1e3a8a] text-white p-2.5 flex justify-between items-center font-bold text-xs tracking-wide">
                    <span className="uppercase">Grand Total (INR):</span>
                    <span className="font-mono text-sm">₹ {formatInr(netAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Bank & Terms (Left) + Authorized Signatory Block (Right) */}
              <div className="grid grid-cols-12 gap-3 text-xs">
                {/* Left Column (Span 7): Bank Account Details & Terms */}
                <div className="col-span-7 space-y-3">
                  {/* Bank Account Details */}
                  <div className="border border-slate-200 border-t-2 border-t-[#1e40af] rounded-xs p-2.5 bg-slate-50/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1">
                      BANK ACCOUNT DETAILS (RTGS / NEFT)
                    </span>
                    <div className="space-y-1 text-slate-700 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Name:</span>
                        <span className="font-bold text-slate-900 uppercase">{companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bank & Branch:</span>
                        <span className="font-bold text-slate-900">
                          {bankName || "—"}
                          {bankBranch ? `, ${bankBranch}` : ""}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account No:</span>
                        <span className="font-mono font-bold text-slate-900">{bankAccountNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">IFSC Code:</span>
                        <span className="font-mono font-bold text-slate-900">{bankIfsc}</span>
                      </div>
                      {bankSwift && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Swift Code:</span>
                          <span className="font-mono font-bold text-slate-900">{bankSwift}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="pt-1 bg-transparent">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e40af] block mb-1">
                      TERMS & CONDITIONS
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-600 leading-normal pb-2">
                      <li>Payment is due within {creditDays} days from the date of invoice presentation.</li>
                      <li>
                        Interest @ 18% per annum will be charged on all outstanding balances overdue after the credit period.
                      </li>
                      <li>Any discrepancies or claims regarding this bill must be notified within 7 business days.</li>
                      <li>All commercial disputes are subject to {jurisdictionCity} jurisdiction only.</li>
                      {companyMsme && companyMsme !== "—" && (
                        <li>Registered Enterprise under MSMED Act 2006 (Udyam: {companyMsme}).</li>
                      )}
                    </ol>
                  </div>
                </div>

                {/* Right Column (Span 5): Authorized Signatory */}
                <div className="col-span-5 border border-slate-200 rounded-xs p-3 flex flex-col justify-between bg-white text-right">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-900">
                      For {companyName}
                    </p>
                  </div>

                  {/* Signature Box */}
                  {company?.signature_url ? (
                    <div className="my-2 flex flex-col items-end justify-center min-h-[75px]">
                      <img
                        src={company.signature_url}
                        alt="Signature"
                        crossOrigin="anonymous"
                        className="h-20 max-h-24 max-w-[220px] object-contain mr-1"
                      />
                    </div>
                  ) : (
                    <div className="my-4 flex flex-col items-end">
                      <div className="border border-dashed border-slate-300 rounded px-4 py-3 text-center text-slate-400 text-[10px] w-48">
                        Authorized Signatory / Seal
                      </div>
                    </div>
                  )}

                  {/* Signatory Footer */}
                  <div className="pt-2 border-t border-slate-200">
                    <p className="font-bold text-xs text-slate-900">
                      {company?.signing_authority_name || "Authorized Signatory"}
                    </p>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">
                      This is a computer-generated invoice, no physical signature required.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="border-t border-slate-200 mt-6 pt-2 flex justify-between items-center text-[10px] text-slate-500">
              <span>
                {companyName} — TAX INVOICE {invoiceNo}
              </span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS for Print */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
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
          body > *:not(.general-invoice-modal-portal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .general-invoice-modal-portal,
          .general-invoice-modal-portal * {
            visibility: visible;
          }
          .no-print,
          .no-print *,
          .general-invoice-backdrop {
            display: none !important;
            visibility: hidden !important;
          }
          .general-invoice-modal-portal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            inset: auto !important;
            z-index: auto !important;
          }
          .general-invoice-container {
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
            background: #ffffff !important;
          }
          #printable-tax-invoice {
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
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
