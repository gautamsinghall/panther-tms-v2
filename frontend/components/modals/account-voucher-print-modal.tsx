"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Loader2,
  Pencil,
  FileText,
  Building2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/lib/toast";

export interface AccountLedgerEntry {
  id?: number;
  account_id?: number;
  account_name?: string;
  account_code?: string;
  debit_amount?: string | number;
  credit_amount?: string | number;
  is_reversal?: boolean;
  narration?: string;
}

export interface AccountBillAllocation {
  id?: number;
  voucher_id?: number;
  invoice_id?: number;
  allocated_amount?: number | string;
  tds_amount?: number | string;
  discount_amount?: number | string;
  total_settled?: number | string;
  adjustment_type?: string;
  notes?: string;
  voucher_number?: string;
  invoice_number?: string;
  bill_number?: string;
}

export interface AccountVoucherItem {
  id?: number;
  description: string;
  hsn_sac?: string;
  quantity: string | number;
  rate: string | number;
  discount_amount?: string | number;
  tax_amount?: string | number;
  total_amount: string | number;
  charge_head_name?: string;
  tax_category_name?: string;
}

export interface AccountVoucherRecord {
  id: number;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name?: string | null;
  party_gstin?: string | null;
  party_type?: string | null;
  place_of_supply?: string | null;
  reference_number?: string | null;
  reference_date?: string | null;
  against_voucher_id?: number | null;
  against_voucher_number?: string | null;
  total_amount?: string | number;
  tax_amount?: string | number;
  net_amount: string | number;
  paid_amount?: string | number;
  balance_amount?: string | number;
  payment_status?: string | null;
  note_category?: string | null;
  reason_code?: string | null;
  cost_center?: string | null;
  hire_challan_id?: number | null;
  hire_challan_number?: string | null;
  due_date?: string | null;
  gst_treatment?: string | null;
  itc_eligibility?: string | null;
  narration?: string | null;
  is_void?: boolean;
  void_reason?: string | null;
  issuing_office_id?: number | null;
  issuing_office_name?: string | null;
  issuing_office_code?: string | null;
  tax_breakup?: Record<string, any> | null;
  ledger_entries?: AccountLedgerEntry[] | null;
  bill_allocations?: AccountBillAllocation[] | null;
  items?: AccountVoucherItem[] | null;
  created_at?: string;
  updated_at?: string;
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

export interface AccountVoucherPrintModalProps {
  isOpen: boolean;
  voucher: AccountVoucherRecord | null;
  onClose: () => void;
  onEdit?: (voucher: AccountVoucherRecord) => void;
  title?: string;
  subtitle?: string;
  copyTag?: string;
}

function formatDateDMY(d?: string | null): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    const day = String(dt.getDate()).padStart(2, "0");
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return d;
  }
}

function numberToWords(num: number | string): string {
  const n = typeof num === "number" ? num : parseFloat(String(num).replace(/,/g, ""));
  if (isNaN(n) || n === 0) return "Zero Rupees Only";

  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const integerPart = Math.floor(Math.abs(n));
  const paise = Math.round((Math.abs(n) - integerPart) * 100);

  function convertGroup(val: number): string {
    let str = "";
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + "Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + " ";
      val %= 10;
    }
    if (val > 0) {
      str += a[val];
    }
    return str;
  }

  let result = "";
  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const remainder = integerPart % 1000;

  if (crore > 0) result += convertGroup(crore) + "Crore ";
  if (lakh > 0) result += convertGroup(lakh) + "Lakh ";
  if (thousand > 0) result += convertGroup(thousand) + "Thousand ";
  if (remainder > 0) result += convertGroup(remainder);

  result = result.trim() + " Rupees";
  if (paise > 0) {
    result += " and " + convertGroup(paise).trim() + " Paise";
  }
  return result + " Only";
}

function extractPan(gstin?: string | null, fallbackPan?: string | null): string {
  if (fallbackPan && fallbackPan.trim()) return fallbackPan.trim().toUpperCase();
  if (gstin && gstin.trim().length === 15) {
    return gstin.trim().slice(2, 12).toUpperCase();
  }
  return "—";
}

export function AccountVoucherPrintModal({
  isOpen,
  voucher,
  onClose,
  onEdit,
  title,
  subtitle,
  copyTag,
}: AccountVoucherPrintModalProps) {
  const [mounted, setMounted] = useState(false);
  const [company, setCompany] = useState<CompanySettingData | null>(null);
  const [issuingBranch, setIssuingBranch] = useState<BranchData | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    async function fetchMasterData() {
      try {
        const activeOffice = getActiveOffice();
        const [compData, branchList] = await Promise.all([
          apiClient<CompanySettingData>("/api/v1/profile/company").catch(() => null),
          apiClient<BranchData[]>("/api/v1/profile/branches").catch(() => []),
        ]);

        if (!isSubscribed) return;

        if (compData) {
          setCompany(compData);
        }

        const validBranches: BranchData[] = Array.isArray(branchList) ? branchList : [];
        if (validBranches.length > 0) {
          const targetId = voucher?.issuing_office_id || activeOffice?.id;
          const targetName = voucher?.issuing_office_name;

          let matched = validBranches.find((b: BranchData) => b.id === targetId);
          if (!matched && targetName) {
            matched = validBranches.find((b: BranchData) => b.name?.toLowerCase() === targetName.toLowerCase());
          }
          if (!matched) {
            matched = validBranches.find((b: BranchData) => b.is_head_office) || validBranches[0] || null;
          }
          setIssuingBranch(matched || null);
        }
      } catch (err) {
        console.error("Failed to load company profile for voucher print preview:", err);
      }
    }

    fetchMasterData();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, voucher?.issuing_office_id, voucher?.issuing_office_name]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || !voucher) return;
    try {
      setIsDownloadingPdf(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc) => {
          const wrapper = clonedDoc.getElementById("voucher-print-wrapper");
          if (wrapper) {
            wrapper.style.position = "static";
            wrapper.style.left = "auto";
            wrapper.style.top = "auto";
            wrapper.style.opacity = "1";
            wrapper.style.display = "flex";
            wrapper.style.justifyContent = "center";
            wrapper.style.width = "780px";
            wrapper.style.height = "auto";
            wrapper.style.overflow = "visible";
          }
          const el = clonedDoc.getElementById("account-voucher-printable-document");
          if (el) {
            el.style.width = "780px";
            el.style.maxWidth = "780px";
            el.style.margin = "0 auto";
            el.style.boxShadow = "none";
            el.style.overflow = "visible";
          }
        },
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas render failed with zero dimensions");
      }

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 8;
      const maxW = pdfWidth - margin * 2;
      const maxH = pdfHeight - margin * 2;

      let renderWidth = maxW;
      let renderHeight = (canvas.height * renderWidth) / canvas.width;

      if (renderHeight > maxH) {
        renderHeight = maxH;
        renderWidth = (canvas.width * renderHeight) / canvas.height;
      }

      const posX = (pdfWidth - renderWidth) / 2;
      const posY = margin;

      pdf.addImage(imgData, "PNG", posX, posY, renderWidth, renderHeight, undefined, "FAST");
      pdf.save(`Voucher_${voucher.voucher_number || voucher.id}.pdf`);
      toast.success(`Voucher ${voucher.voucher_number || ""} PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate voucher PDF:", err);
      toast.error("Failed to export PDF. Please use the Print button to save as PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!mounted || !isOpen || !voucher) return null;

  // Resolve Company / Branch info
  const companyName = company?.company_name || "PANTHER LOGISTICS & TRANSPORT";
  const officeName = issuingBranch?.name || voucher.issuing_office_name || company?.issuing_office || "Head Office";
  const officeCode = issuingBranch?.code || voucher.issuing_office_code || "";
  const officeAddress = issuingBranch?.address || company?.address || "Corporate Logistics Hub";
  const officeCity = issuingBranch?.city || company?.city || "Mumbai";
  const officeState = issuingBranch?.state || company?.state || "Maharashtra";
  const officePincode = issuingBranch?.pincode || company?.pincode || "";
  const officePhone = issuingBranch?.phone || company?.phone || "+91 98765 43210";
  const officeEmail = issuingBranch?.email || company?.email || "accounts@pantherlogistics.com";
  const officeGstin = issuingBranch?.gstin || company?.gstin || "27AABCP1234M1Z5";
  const officePan = extractPan(officeGstin, issuingBranch?.pan || company?.pan);

  // Derive Type, Title & Subtitles
  const vType = (voucher.voucher_type || "").toUpperCase();
  const netAmountNum = parseFloat(String(voucher.net_amount)) || 0;

  let computedTitle = title;
  let computedSubtitle = subtitle;
  let computedCopyTag = copyTag;

  if (!computedTitle) {
    if (vType.includes("PAYMENT")) {
      computedTitle = "PAYMENT VOUCHER";
      computedSubtitle = "Bank & Cash Disbursement Voucher (Double-Entry Record)";
      computedCopyTag = computedCopyTag || "PAYEE COPY / ORIGINAL";
    } else if (vType.includes("RECEIPT")) {
      computedTitle = "RECEIPT VOUCHER";
      computedSubtitle = "Bank & Cash Inflow Receipt Voucher";
      computedCopyTag = computedCopyTag || "ORIGINAL FOR CUSTOMER";
    } else if (vType.includes("CONTRA")) {
      computedTitle = "CONTRA VOUCHER";
      computedSubtitle = "Internal Bank & Cash Fund Movement Voucher";
      computedCopyTag = computedCopyTag || "OFFICE ACCOUNTS COPY";
    } else if (vType.includes("JOURNAL")) {
      computedTitle = "JOURNAL VOUCHER";
      computedSubtitle = "Double-Entry Financial Adjustment & Audit Record";
      computedCopyTag = computedCopyTag || "OFFICE AUDIT COPY";
    } else if (vType.includes("CREDIT")) {
      computedTitle = "CREDIT NOTE";
      computedSubtitle = "GST Credit Note Adjustment Record u/s 34 of CGST Act";
      computedCopyTag = computedCopyTag || "ORIGINAL FOR RECIPIENT";
    } else if (vType.includes("DEBIT")) {
      computedTitle = "DEBIT NOTE";
      computedSubtitle = "GST Debit Note Adjustment Record u/s 34 of CGST Act";
      computedCopyTag = computedCopyTag || "ORIGINAL FOR RECIPIENT";
    } else if (vType.includes("PURCHASE")) {
      computedTitle = "PURCHASE VOUCHER";
      computedSubtitle = "Commercial Inward Bill & Input Tax Credit Record";
      computedCopyTag = computedCopyTag || "ACCOUNTS VOUCHER COPY";
    } else {
      computedTitle = `${vType.replace(/_/g, " ")} VOUCHER`;
      computedSubtitle = "Official Financial Transaction & Audit Record";
      computedCopyTag = computedCopyTag || "OFFICE COPY";
    }
  }

  // Derived Category / Mode
  const categoryOrMode =
    voucher.tax_breakup?.transfer_mode ||
    voucher.tax_breakup?.payment_mode ||
    voucher.note_category?.replace(/_/g, " ") ||
    (voucher.gst_treatment ? `GST: ${voucher.gst_treatment}` : null) ||
    "STANDARD";

  // Derived Status
  const statusDisplay = voucher.is_void
    ? "REVERSED / VOID"
    : voucher.payment_status
    ? voucher.payment_status.toUpperCase()
    : "POSTED";

  // Signatures 3rd party label
  let thirdColTitle = "Beneficiary / Payee";
  let thirdColSub = "Sign & Verified";
  if (vType.includes("RECEIPT")) {
    thirdColTitle = "Depositor / Payer";
    thirdColSub = "Sign & Verified";
  } else if (vType.includes("CONTRA")) {
    thirdColTitle = "Depositor / Receiver";
    thirdColSub = "Internal Verification";
  } else if (vType.includes("JOURNAL")) {
    thirdColTitle = "Operations / Branch In-charge";
    thirdColSub = "Adjustment Verified";
  } else if (vType.includes("CREDIT") || vType.includes("DEBIT")) {
    thirdColTitle = "Customer / Vendor Signature";
    thirdColSub = "Party Seal & Sign";
  } else if (vType.includes("PURCHASE")) {
    thirdColTitle = "Vendor / Receiver Rep";
    thirdColSub = "Goods / Bill Verified";
  }

  const modalContent = (
    <div className="account-voucher-modal-portal fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Isolation Print CSS */}
      <style jsx global>{`
        @media print {
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .account-voucher-modal-portal,
          .account-voucher-modal-portal * {
            visibility: visible !important;
          }
          .account-voucher-modal-portal {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          .no-print, .no-print * {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #account-voucher-printable-document {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl h-[94dvh] sm:h-[90dvh] bg-white dark:bg-[#12131A] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#22232E] overflow-hidden z-10 flex flex-col print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#22232E] bg-slate-50 dark:bg-[#161722] flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              {computedTitle}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {voucher.voucher_number}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
              {formatDateDMY(voucher.voucher_date)}
            </span>
            {officeCode && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
                {officeCode} - {officeName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Option in Print Preview */}
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(voucher);
                }}
                className="text-xs font-medium h-8 gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 dark:bg-[#1F202B] dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/40 shadow-2xs cursor-pointer"
                title="Edit this voucher"
              >
                <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Edit</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-[#1F202B] dark:border-[#2B2D3D] dark:text-slate-200 dark:hover:bg-[#262837] shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Print</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-[#1F202B] dark:border-[#2B2D3D] dark:text-slate-200 dark:hover:bg-[#262837] shadow-2xs cursor-pointer"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-slate-300" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              )}
              <span>Download PDF</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          ref={modalBodyRef}
          className="p-2 sm:p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-100 dark:bg-[#0B0B0E] [webkit-overflow-scrolling:touch]"
        >
          {/* Printable Voucher Wrapper */}
          <div id="voucher-print-wrapper" className="w-full min-w-fit">
            <div
              id="account-voucher-printable-document"
              ref={printRef}
              className="min-w-[660px] md:min-w-0 w-full max-w-[780px] mx-auto bg-white border border-slate-300 text-slate-900 font-sans select-text shadow-sm printable-paper-sheet printable-document-sheet print:min-w-0"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                backgroundColor: "#ffffff",
                color: "#0f172a",
              }}
            >
              {/* 1. Header: Branding + Company Master Info */}
              <div className="flex items-center justify-between p-3.5 border-b border-slate-300 gap-2">
                {/* Left: Logo */}
                <div className="w-[28%] flex flex-col items-center justify-center shrink-0">
                  {company?.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={companyName}
                      crossOrigin="anonymous"
                      className="max-h-14 max-w-full object-contain mx-auto"
                    />
                  ) : (
                    <>
                      <img
                        src="/panther-logo-transparent.png"
                        alt="Panther Logo"
                        className="h-10 sm:h-12 w-auto object-contain mx-auto"
                      />
                      <div className="text-[10px] sm:text-[11px] font-black text-[#0f2147] tracking-wider leading-tight text-center mt-1">
                        PANTHER
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-black text-[#0f2147] tracking-wide text-center leading-tight">
                        LOGISTICS TMS
                      </div>
                    </>
                  )}
                </div>

                {/* Middle: Company Legal Name & Branch Address */}
                <div className="w-[44%] text-center px-1">
                  <div className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide leading-tight">
                    {companyName}
                  </div>
                  <div className="text-[10.5px] text-slate-600 font-normal leading-tight mt-0.5">
                    {officeAddress}
                  </div>
                  <div className="text-[10.5px] text-slate-600 font-normal leading-tight">
                    {officeCity}, {officeState} {officePincode ? `- ${officePincode}` : ""}
                  </div>
                  <div className="text-[10.5px] text-slate-600 font-normal leading-tight">
                    Phone: {officePhone} | Email: {officeEmail}
                  </div>
                  <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mt-1">
                    BRANCH: {officeCode ? `${officeCode} - ` : ""}{officeName}
                  </div>
                </div>

                {/* Right: Registration & Document Copy Identifier */}
                <div className="w-[28%] text-right text-[10.5px] text-slate-700 leading-tight space-y-0.5">
                  <div className="inline-block px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] bg-slate-100 border border-slate-300 text-slate-800 rounded mb-1">
                    {computedCopyTag}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">GSTIN:</span>{" "}
                    <span className="font-mono">{officeGstin}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">PAN:</span>{" "}
                    <span className="font-mono">{officePan}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-1">
                    Subject to {officeCity} Jurisdiction
                  </div>
                </div>
              </div>

              {/* 2. Banner: Voucher Title */}
              <div className="bg-slate-900 text-white text-center py-2 px-3 border-b border-slate-300">
                <div className="text-sm font-extrabold uppercase tracking-widest leading-none">
                  {computedTitle}
                </div>
                <div className="text-[10px] text-slate-300 tracking-wider uppercase mt-0.5">
                  {computedSubtitle}
                </div>
              </div>

              {/* 3. Four-Column Metadata Grid */}
              <div className="grid grid-cols-4 border-b border-slate-300 text-[11px] divide-x divide-slate-300 bg-slate-50/70">
                <div className="p-2">
                  <div className="text-[9.5px] uppercase font-bold text-slate-500">Voucher Number</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{voucher.voucher_number}</div>
                </div>
                <div className="p-2">
                  <div className="text-[9.5px] uppercase font-bold text-slate-500">Voucher Date</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{formatDateDMY(voucher.voucher_date)}</div>
                </div>
                <div className="p-2">
                  <div className="text-[9.5px] uppercase font-bold text-slate-500">Mode / Category</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{categoryOrMode}</div>
                </div>
                <div className="p-2">
                  <div className="text-[9.5px] uppercase font-bold text-slate-500">Status / Ref</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {voucher.is_void ? (
                      <span className="text-rose-700 font-bold">VOIDED</span>
                    ) : (
                      statusDisplay
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Voucher Specific Particulars / Summary Box */}
              <div className="p-3 border-b border-slate-300 text-[11px] bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Left Column: Party / Transfer Source */}
                  <div className="space-y-1">
                    {vType.includes("CONTRA") ? (
                      <>
                        <div>
                          <span className="text-slate-500 font-medium">Transfer Nature: </span>
                          <span className="font-bold text-slate-900">{voucher.party_name || "Internal Fund Movement"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Instrument / Mode: </span>
                          <span className="font-semibold text-slate-800 uppercase">{voucher.tax_breakup?.transfer_mode || "BANK_TRANSFER"}</span>
                        </div>
                        {voucher.reference_number && (
                          <div>
                            <span className="text-slate-500 font-medium">Slip / UTR Ref #: </span>
                            <span className="font-mono font-semibold text-slate-900">{voucher.reference_number}</span>
                          </div>
                        )}
                        {voucher.tax_breakup?.cheque_number && (
                          <div>
                            <span className="text-slate-500 font-medium">Cheque #: </span>
                            <span className="font-mono font-semibold text-slate-900">{voucher.tax_breakup.cheque_number}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-medium">Source Account (Cr): </span>
                          <span className="font-semibold text-slate-900">{voucher.tax_breakup?.source_account_name || "Cash/Bank"}</span>
                        </div>
                      </>
                    ) : vType.includes("PAYMENT") ? (
                      <>
                        <div>
                          <span className="text-slate-500 font-medium">Paid with thanks to (Beneficiary): </span>
                          <span className="font-bold text-slate-900">{voucher.party_name || "Beneficiary / Vendor"}</span>
                        </div>
                        {voucher.party_gstin && (
                          <div>
                            <span className="text-slate-500 font-medium">Beneficiary GSTIN: </span>
                            <span className="font-mono text-slate-800">{voucher.party_gstin}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-medium">Payment Mode: </span>
                          <span className="font-semibold text-slate-800 uppercase">{voucher.tax_breakup?.payment_mode || "BANK"}</span>
                        </div>
                        {voucher.reference_number && (
                          <div>
                            <span className="text-slate-500 font-medium">Ref / Cheque #: </span>
                            <span className="font-mono font-semibold text-slate-900">{voucher.reference_number}</span>
                          </div>
                        )}
                        {(voucher.tax_breakup?.challan_number || voucher.hire_challan_id || voucher.hire_challan_number) && (
                          <div>
                            <span className="text-slate-500 font-medium">Hire Challan: </span>
                            <span className="font-mono font-semibold text-indigo-700">
                              {voucher.tax_breakup?.challan_number || voucher.hire_challan_number || `#${voucher.hire_challan_id}`}
                            </span>
                          </div>
                        )}
                      </>
                    ) : vType.includes("RECEIPT") ? (
                      <>
                        <div>
                          <span className="text-slate-500 font-medium">Received with thanks from: </span>
                          <span className="font-bold text-slate-900">{voucher.party_name || "Direct Customer / Party"}</span>
                        </div>
                        {voucher.party_gstin && (
                          <div>
                            <span className="text-slate-500 font-medium">Party GSTIN: </span>
                            <span className="font-mono text-slate-800">{voucher.party_gstin}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-medium">Receipt Mode: </span>
                          <span className="font-semibold text-slate-800 uppercase">{voucher.tax_breakup?.payment_mode || "BANK"}</span>
                        </div>
                        {voucher.reference_number && (
                          <div>
                            <span className="text-slate-500 font-medium">Ref / Cheque #: </span>
                            <span className="font-mono font-semibold text-slate-900">{voucher.reference_number}</span>
                          </div>
                        )}
                      </>
                    ) : vType.includes("CREDIT") || vType.includes("DEBIT") ? (
                      <>
                        <div>
                          <span className="text-slate-500 font-medium">Party / Trade Ledger: </span>
                          <span className="font-bold text-slate-900">{voucher.party_name || "N/A"}</span>
                        </div>
                        {voucher.party_gstin && (
                          <div>
                            <span className="text-slate-500 font-medium">Party GSTIN: </span>
                            <span className="font-mono text-slate-800">{voucher.party_gstin}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-medium">Place of Supply: </span>
                          <span className="font-semibold text-slate-800">{voucher.place_of_supply || officeState}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Original Invoice #: </span>
                          <span className="font-mono font-semibold text-slate-900">
                            {voucher.against_voucher_number || voucher.reference_number || "N/A"}
                          </span>
                        </div>
                      </>
                    ) : vType.includes("PURCHASE") ? (
                      <>
                        <div>
                          <span className="text-slate-500 font-medium">Supplier / Vendor: </span>
                          <span className="font-bold text-slate-900">{voucher.party_name || "Supplier Ledger"}</span>
                        </div>
                        {voucher.party_gstin && (
                          <div>
                            <span className="text-slate-500 font-medium">Vendor GSTIN: </span>
                            <span className="font-mono text-slate-800">{voucher.party_gstin}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 font-medium">Supplier Bill / Ref #: </span>
                          <span className="font-mono font-semibold text-slate-900">{voucher.reference_number || "—"}</span>
                        </div>
                        {voucher.reference_date && (
                          <div>
                            <span className="text-slate-500 font-medium">Bill Date: </span>
                            <span className="text-slate-800">{formatDateDMY(voucher.reference_date)}</span>
                          </div>
                        )}
                        {voucher.place_of_supply && (
                          <div>
                            <span className="text-slate-500 font-medium">Place of Supply: </span>
                            <span className="text-slate-800">{voucher.place_of_supply}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-500 font-medium">Account / Party Reference: </span>
                          <span className="font-bold text-slate-900">{voucher.party_name || "Double-Entry Adjustment"}</span>
                        </div>
                        {voucher.reference_number && (
                          <div>
                            <span className="text-slate-500 font-medium">Reference #: </span>
                            <span className="font-mono font-semibold text-slate-900">{voucher.reference_number}</span>
                          </div>
                        )}
                        {voucher.cost_center && (
                          <div>
                            <span className="text-slate-500 font-medium">Cost Center / Fleet: </span>
                            <span className="font-semibold text-slate-800">{voucher.cost_center}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right Column: Account Head / Amount Highlight */}
                  <div className="space-y-1 flex flex-col justify-between">
                    <div>
                      {vType.includes("CONTRA") ? (
                        <div>
                          <span className="text-slate-500 font-medium">Destination Account (Dr): </span>
                          <span className="font-semibold text-slate-900">
                            {voucher.tax_breakup?.destination_account_name || "Bank/Cash"}
                          </span>
                        </div>
                      ) : vType.includes("PAYMENT") ? (
                        <div>
                          <span className="text-slate-500 font-medium">Debited From (Bank/Cash): </span>
                          <span className="font-semibold text-slate-900">
                            {voucher.tax_breakup?.payment_account_name ||
                              voucher.tax_breakup?.bank_account_name ||
                              "Disbursement Account Head"}
                          </span>
                        </div>
                      ) : vType.includes("RECEIPT") ? (
                        <div>
                          <span className="text-slate-500 font-medium">Credited To (Bank/Cash): </span>
                          <span className="font-semibold text-slate-900">
                            {voucher.tax_breakup?.payment_account_name ||
                              voucher.tax_breakup?.bank_account_name ||
                              "Inflow Account Head"}
                          </span>
                        </div>
                      ) : vType.includes("PURCHASE") ? (
                        <div>
                          {voucher.due_date && (
                            <div>
                              <span className="text-slate-500 font-medium">Due Date: </span>
                              <span className="text-slate-800">{formatDateDMY(voucher.due_date)}</span>
                            </div>
                          )}
                          {(voucher.tax_amount !== undefined && parseFloat(String(voucher.tax_amount)) > 0) && (
                            <div>
                              <span className="text-slate-500 font-medium">Total GST (Input Tax): </span>
                              <span className="font-mono font-semibold text-slate-800">
                                {formatCurrency(parseFloat(String(voucher.tax_amount)) || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {voucher.tax_amount !== undefined && parseFloat(String(voucher.tax_amount)) > 0 && (
                            <div>
                              <span className="text-slate-500 font-medium">Tax Value: </span>
                              <span className="font-mono font-semibold text-slate-800">
                                {formatCurrency(parseFloat(String(voucher.tax_amount)) || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="text-slate-600 font-semibold uppercase text-[10.5px]">
                        {vType.includes("PAYMENT")
                          ? "Net Amount Disbursed:"
                          : vType.includes("RECEIPT")
                          ? "Net Amount Received:"
                          : vType.includes("CONTRA")
                          ? "Net Transfer Amount:"
                          : vType.includes("PURCHASE")
                          ? "Net Payable Amount:"
                          : "Net Voucher Amount:"}
                      </span>
                      <span className="text-lg font-bold font-mono text-slate-900">
                        {formatCurrency(netAmountNum)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Amount in Words Banner */}
              <div className="text-[11px] border-b border-slate-300 px-3.5 py-1.5 bg-slate-50/80 italic text-slate-800">
                <span className="not-italic text-slate-700 font-bold">Amount in Words: </span>
                {numberToWords(netAmountNum)}
              </div>

              {/* 6. Bill Allocation Table (If Available) */}
              {voucher.bill_allocations && voucher.bill_allocations.length > 0 && (
                <div className="border-b border-slate-300">
                  <div className="px-3.5 py-1.5 bg-slate-100 font-bold uppercase text-[10px] text-slate-700 tracking-wider">
                    Settlement Breakdown Against Invoices / Bills ({voucher.bill_allocations.length})
                  </div>
                  <table className="w-full text-[10.5px] border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3 text-left">Bill / Invoice #</th>
                        <th className="py-1.5 px-3 text-right">Bank / Cash Applied (₹)</th>
                        <th className="py-1.5 px-3 text-right">TDS (₹)</th>
                        <th className="py-1.5 px-3 text-right">Discount (₹)</th>
                        <th className="py-1.5 px-3 text-right">Total Settled (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {voucher.bill_allocations.map((ba, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-1 px-3 font-semibold text-slate-900 text-left">
                            {ba.invoice_number || ba.bill_number || `Bill #${ba.invoice_id}`}
                          </td>
                          <td className="py-1 px-3 text-right">
                            {formatCurrency(parseFloat(String(ba.allocated_amount)) || 0)}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-600">
                            {parseFloat(String(ba.tds_amount)) > 0
                              ? formatCurrency(parseFloat(String(ba.tds_amount)))
                              : "—"}
                          </td>
                          <td className="py-1 px-3 text-right text-slate-600">
                            {parseFloat(String(ba.discount_amount)) > 0
                              ? formatCurrency(parseFloat(String(ba.discount_amount)))
                              : "—"}
                          </td>
                          <td className="py-1 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(parseFloat(String(ba.total_settled)) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-mono">
                      <tr>
                        <td className="py-1 px-3 uppercase font-sans text-[9.5px] text-slate-600">Total:</td>
                        <td className="py-1 px-3 text-right">
                          {formatCurrency(
                            voucher.bill_allocations.reduce(
                              (acc, ba) => acc + (parseFloat(String(ba.allocated_amount)) || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="py-1 px-3 text-right text-slate-600">
                          {formatCurrency(
                            voucher.bill_allocations.reduce(
                              (acc, ba) => acc + (parseFloat(String(ba.tds_amount)) || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="py-1 px-3 text-right text-slate-600">
                          {formatCurrency(
                            voucher.bill_allocations.reduce(
                              (acc, ba) => acc + (parseFloat(String(ba.discount_amount)) || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="py-1 px-3 text-right font-bold text-indigo-700">
                          {formatCurrency(
                            voucher.bill_allocations.reduce(
                              (acc, ba) => acc + (parseFloat(String(ba.total_settled)) || 0),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* 7. Line Items Table (For Purchase / Detailed Vouchers) */}
              {voucher.items && voucher.items.length > 0 && (
                <div className="border-b border-slate-300">
                  <div className="px-3.5 py-1.5 bg-slate-100 font-bold uppercase text-[10px] text-slate-700 tracking-wider">
                    Purchased Goods &amp; Service Items ({voucher.items.length})
                  </div>
                  <table className="w-full text-[10.5px] border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3 text-left">Description</th>
                        <th className="py-1.5 px-3 text-center w-20">HSN/SAC</th>
                        <th className="py-1.5 px-3 text-right w-16">Qty</th>
                        <th className="py-1.5 px-3 text-right w-24">Rate (₹)</th>
                        <th className="py-1.5 px-3 text-right w-24">Tax (₹)</th>
                        <th className="py-1.5 px-3 text-right w-28">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {voucher.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-1 px-3 font-sans font-medium text-slate-900 text-left">
                            {it.description}
                          </td>
                          <td className="py-1 px-3 text-center text-slate-600">{it.hsn_sac || "—"}</td>
                          <td className="py-1 px-3 text-right">{it.quantity}</td>
                          <td className="py-1 px-3 text-right">{formatCurrency(parseFloat(String(it.rate)) || 0)}</td>
                          <td className="py-1 px-3 text-right text-slate-600">
                            {it.tax_amount ? formatCurrency(parseFloat(String(it.tax_amount)) || 0) : "—"}
                          </td>
                          <td className="py-1 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(parseFloat(String(it.total_amount)) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-mono">
                      <tr>
                        <td colSpan={2} className="py-1 px-3 uppercase font-sans text-[9.5px] text-slate-600">
                          Total:
                        </td>
                        <td className="py-1 px-3 text-right">
                          {voucher.items.reduce((acc, it) => acc + (parseFloat(String(it.quantity)) || 0), 0)}
                        </td>
                        <td className="py-1 px-3 text-right">—</td>
                        <td className="py-1 px-3 text-right text-slate-700">
                          {formatCurrency(
                            voucher.items.reduce((acc, it) => acc + (parseFloat(String(it.tax_amount)) || 0), 0)
                          )}
                        </td>
                        <td className="py-1 px-3 text-right font-bold text-indigo-700">
                          {formatCurrency(
                            voucher.items.reduce((acc, it) => acc + (parseFloat(String(it.total_amount)) || 0), 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* 8. Balanced Double-Entry Journal Postings Table */}
              {voucher.ledger_entries && voucher.ledger_entries.length > 0 && (
                <div className="border-b border-slate-300">
                  <div className="px-3.5 py-1.5 bg-slate-100 font-bold uppercase text-[10px] text-slate-700 tracking-wider">
                    Double-Entry Balanced Journal Postings
                  </div>
                  <table className="w-full text-[10.5px] border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3 text-left">Particulars / Account Head</th>
                        <th className="py-1.5 px-3 text-right w-32">Debit (Dr) ₹</th>
                        <th className="py-1.5 px-3 text-right w-32">Credit (Cr) ₹</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {voucher.ledger_entries.map((le, idx) => {
                        const dr = parseFloat(String(le.debit_amount)) || 0;
                        const cr = parseFloat(String(le.credit_amount)) || 0;
                        return (
                          <tr key={idx} className={le.is_reversal ? "opacity-60 italic" : "hover:bg-slate-50/60"}>
                            <td className="py-1 px-3 font-sans">
                              <div className="font-semibold text-slate-900">
                                {dr > 0 ? "Dr. " : "    To "}
                                {le.account_name || `Account #${le.account_id}`}
                              </div>
                              {le.narration && (
                                <div className="text-[9.5px] text-slate-500 pl-4 mt-0.5">({le.narration})</div>
                              )}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-slate-900">
                              {dr > 0 ? formatCurrency(dr) : "—"}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-slate-900">
                              {cr > 0 ? formatCurrency(cr) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900 font-mono">
                      <tr>
                        <td className="py-1 px-3 text-right uppercase font-sans text-[9.5px] text-slate-600">
                          Total:
                        </td>
                        <td className="py-1 px-3 text-right text-slate-900">
                          {formatCurrency(
                            voucher.ledger_entries
                              .filter((e) => !e.is_reversal)
                              .reduce((acc, e) => acc + (parseFloat(String(e.debit_amount)) || 0), 0)
                          )}
                        </td>
                        <td className="py-1 px-3 text-right text-slate-900">
                          {formatCurrency(
                            voucher.ledger_entries
                              .filter((e) => !e.is_reversal)
                              .reduce((acc, e) => acc + (parseFloat(String(e.credit_amount)) || 0), 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* 9. Narration & Reversal Audit Reason */}
              {(voucher.narration || voucher.is_void) && (
                <div className="p-3 border-b border-slate-300 text-[10.5px] space-y-1.5 bg-slate-50/50">
                  {voucher.narration && (
                    <div>
                      <span className="font-bold text-slate-700 uppercase text-[9.5px] block">
                        Narration / Commercial Justification:
                      </span>
                      <span className="text-slate-800 italic mt-0.5 block">&quot;{voucher.narration}&quot;</span>
                    </div>
                  )}
                  {voucher.is_void && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-medium">
                      <span className="font-bold uppercase text-[9.5px]">Reversal Audit Reason: </span>
                      {voucher.void_reason || "Voided by authorized accounts personnel."}
                    </div>
                  )}
                </div>
              )}

              {/* 10. Four-Column Standard Signatures (Exact Match with Image & Aligned Spacers) */}
              <div className="grid grid-cols-4 border-t border-slate-300 text-center text-[10.5px] p-3 pt-6 pb-4">
                <div className="flex flex-col justify-end items-center px-1">
                  <div className="h-10 sm:h-12" />
                  <div className="w-28 sm:w-36 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">Prepared By</span>
                  <span className="text-[9.5px] text-slate-500">Accounts Staff</span>
                </div>

                <div className="flex flex-col justify-end items-center px-1">
                  <div className="h-10 sm:h-12" />
                  <div className="w-28 sm:w-36 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">Verified By</span>
                  <span className="text-[9.5px] text-slate-500">Accounts Head / Audit</span>
                </div>

                <div className="flex flex-col justify-end items-center px-1">
                  <div className="h-10 sm:h-12" />
                  <div className="w-28 sm:w-36 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">{thirdColTitle}</span>
                  <span className="text-[9.5px] text-slate-500">{thirdColSub}</span>
                </div>

                <div className="flex flex-col justify-end items-center px-1">
                  {company?.signature_url ? (
                    <div className="flex justify-center mb-1 h-10 sm:h-12 items-end">
                      <img
                        src={company.signature_url}
                        alt="Authorized Signature"
                        crossOrigin="anonymous"
                        className="max-h-10 sm:max-h-12 max-w-[140px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 sm:h-12 flex items-end justify-center">
                      <span className="text-[9.5px] text-slate-400 italic">Authorized Signature / Seal</span>
                    </div>
                  )}
                  <div className="w-28 sm:w-36 border-b border-slate-400 mb-1"></div>
                  <span className="font-bold text-slate-900">For {companyName}</span>
                  <span className="text-[9.5px] text-slate-600 font-medium">
                    {company?.signing_authority_name || "Authorized Signatory"}
                    {company?.signing_authority_designation ? ` (${company.signing_authority_designation})` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}
