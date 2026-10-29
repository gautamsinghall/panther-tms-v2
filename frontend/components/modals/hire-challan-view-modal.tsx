"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export interface ExpenseItem {
  id?: string;
  lr_id?: string | number;
  lr_no?: string;
  pkg_count?: string | number;
  gross_weight?: string | number;
  charge_head?: string;
  narration?: string;
  tds_applicable?: boolean;
  inr_amount?: string | number;
}

export interface HireChallanRecord {
  id: number;
  challan_number: string;
  challan_date: string;
  issuing_office_id?: number;
  issuing_office_name?: string;
  issuing_office_code?: string;
  hc_series_id?: number;
  vehicle_number: string;
  owner_id?: number;
  owner_name?: string;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  from_location?: string;
  to_location?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  tds_category?: string;
  tds_rate?: string | number;
  tds_amount: string | number;
  vendor_ref_no?: string;
  detention_charge?: string | number;
  mamul_charges?: string | number;
  net_payable_amount: string | number;
  loading_expenses?: ExpenseItem[];
  unloading_expenses?: ExpenseItem[];
  status: string;
  remarks?: string;
  lr_number?: string;
  created_at?: string;
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
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  document_notes?: string | null;
  is_head_office: boolean;
}

interface HireChallanViewModalProps {
  isOpen: boolean;
  challan: HireChallanRecord | null;
  onClose: () => void;
  onSettle?: (challan: HireChallanRecord) => void;
}

export function HireChallanViewModal({
  isOpen,
  challan,
  onClose,
  onSettle,
}: HireChallanViewModalProps) {
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
    async function loadCompanyAndBranch() {
      if (!isOpen || !challan) return;
      try {
        const [compData, branchList] = await Promise.all([
          apiClient<CompanySettingData>("/api/v1/profile/company").catch(() => null),
          apiClient<BranchData[]>("/api/v1/profile/branches").catch(() => []),
        ]);

        if (compData) {
          setCompany(compData);
        }

        const activeOffice = getActiveOffice();
        const validBranches = Array.isArray(branchList) ? branchList : [];
        if (validBranches.length > 0) {
          let selected: BranchData | undefined;

          // 1. First priority: active office from top bar (current issuing office in view)
          if (activeOffice && activeOffice.id !== 0) {
            selected = validBranches.find(
              (b) =>
                b.id === activeOffice.id ||
                b.code?.toUpperCase() === activeOffice.code?.toUpperCase() ||
                b.name?.toLowerCase() === activeOffice.name?.toLowerCase()
            );
          }

          // 2. Exact match on challan issuing_office_id
          if (!selected && challan.issuing_office_id) {
            selected = validBranches.find((b) => b.id === challan.issuing_office_id);
          }

          // 3. Match on issuing_office_code
          if (!selected && challan.issuing_office_code) {
            selected = validBranches.find(
              (b) => b.code?.toUpperCase() === challan.issuing_office_code?.toUpperCase()
            );
          }

          // 4. Match on issuing_office_name
          if (!selected && challan.issuing_office_name) {
            selected = validBranches.find(
              (b) => b.name?.toLowerCase() === challan.issuing_office_name?.toLowerCase()
            );
          }

          // 5. Fallback to Head Office or first branch
          if (!selected) {
            selected = validBranches.find((b) => b.is_head_office) || validBranches[0];
          }

          setIssuingBranch(selected || null);
        }
      } catch {
        const auth = getStoredAuth();
        if (auth?.tenantName) {
          setCompany({ company_name: auth.tenantName });
        }
      }
    }

    loadCompanyAndBranch();
  }, [isOpen, challan]);

  // Re-sync whenever the user switches active office in top bar
  useEffect(() => {
    if (!isOpen) return;
    const handleOfficeChange = () => {
      const activeOffice = getActiveOffice();
      if (activeOffice && activeOffice.id !== 0) {
        apiClient<BranchData[]>("/api/v1/profile/branches")
          .then((branchList) => {
            const valid = Array.isArray(branchList) ? branchList : [];
            const selected = valid.find(
              (b) =>
                b.id === activeOffice.id ||
                b.code?.toUpperCase() === activeOffice.code?.toUpperCase() ||
                b.name?.toLowerCase() === activeOffice.name?.toLowerCase()
            );
            if (selected) setIssuingBranch(selected);
          })
          .catch(() => { });
      }
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChange);
    };
  }, [isOpen]);

  if (!isOpen || !mounted || !challan) return null;

  const handlePrint = () => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsDownloadingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

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
          const wrapper = clonedDoc.getElementById("hc-voucher-wrapper");
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
          const el = clonedDoc.getElementById("hire-challan-printable-document");
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
      pdf.save(`Hire_Challan_${challan.challan_number}.pdf`);
      toast.success(`Hire Challan ${challan.challan_number} PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate Hire Challan PDF:", err);
      toast.error("Failed to export Hire Challan PDF. You can also use the browser Print dialog.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const formatDateDMY = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const trimmed = dateStr.trim();
      const datePart = trimmed.split("T")[0];
      const ymdMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const auth = getStoredAuth();
  const activeOffice = getActiveOffice();
  const companyName = company?.company_name?.trim() || auth?.tenantName || "PANTHER LOGISTICS";
  const officeName = issuingBranch?.name?.trim() || activeOffice?.name?.trim() || challan.issuing_office_name || "Head Office";
  const officeCode = issuingBranch?.code?.trim() || activeOffice?.code?.trim() || challan.issuing_office_code || "";
  const officeCity = issuingBranch?.city?.trim() || activeOffice?.city?.trim() || (officeCode === "MUM" ? "Mumbai" : company?.city?.trim() || "DELHI");
  const officeState = issuingBranch?.state?.trim() || activeOffice?.state?.trim() || (officeCode === "MUM" ? "Maharashtra" : company?.state?.trim() || "DELHI");
  const officePincode = issuingBranch?.pincode?.trim() || company?.pincode?.trim() || "";
  const officePhone = issuingBranch?.phone?.trim() || company?.phone?.trim() || "—";
  const officeEmail = issuingBranch?.email?.trim() || company?.email?.trim() || "—";
  const officeGstin = issuingBranch?.gstin?.trim() || company?.gstin?.trim() || "—";
  const officePan = company?.pan?.trim() || issuingBranch?.pan?.trim() || "—";
  const officeAddress = issuingBranch?.address?.trim() || (officeCity.toLowerCase() !== (company?.city || "").toLowerCase() ? `${officeName} Branch Office` : company?.address?.trim()) || "Corporate Branch Office";
  const jurisdictionText = issuingBranch?.document_notes?.trim() || `Subject to ${officeCity} Jurisdiction only`;
  const issuingOfficeState = issuingBranch?.state?.trim() || issuingBranch?.city?.trim() || activeOffice?.state?.trim() || activeOffice?.city?.trim() || (officeCode === "MUM" ? "Maharashtra" : company?.state?.trim() || "Delhi");

  const allExpenses = [
    ...(challan.loading_expenses || []).map((e) => ({ ...e, type: "Loading" })),
    ...(challan.unloading_expenses || []).map((e) => ({ ...e, type: "Unloading" })),
  ];

  const modalNode = (
    <div className="hc-modal-portal fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto">
      <div
        className="hc-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
      />

      {/* Print Style Injector for 1-page A4 output */}
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
          body > *:not(.hc-modal-portal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .hc-modal-portal,
          .hc-modal-portal * {
            visibility: visible;
          }
          .no-print,
          .no-print *,
          .hc-modal-backdrop,
          .hc-modal-backdrop *,
          .hc-details-container,
          .hc-details-container * {
            display: none !important;
            visibility: hidden !important;
          }
          .hc-modal-portal {
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
          .hc-modal-container {
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
          .hc-modal-body {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }
          #hc-voucher-wrapper {
            position: static !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            overflow: visible !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          #hire-challan-printable-document {
            position: static !important;
            display: block !important;
            left: auto !important;
            top: auto !important;
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

      {/* Modal Dialog Container */}
      <div className="hc-modal-container relative w-full max-w-4xl h-[88vh] bg-white dark:bg-[#12131A] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#22232E] overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#22232E] bg-slate-50 dark:bg-[#161722] flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Hire Challan
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono text-sm font-bold text-blue-700 dark:text-blue-400">
              {challan.challan_number}
            </span>
            <StatusBadge status={challan.status} />
            {officeCode && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800 hidden sm:inline-block">
                {officeCode} - {officeName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">

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
        <div ref={modalBodyRef} className="hc-modal-body p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-[#0B0B0E] flex justify-center">
          {/* PRINTABLE VOUCHER WRAPPER */}
          <div
            id="hc-voucher-wrapper"
            className="flex justify-center w-full"
          >
            <div
              id="hire-challan-printable-document"
              ref={printRef}
              className="w-full max-w-[780px] bg-white border border-slate-300 text-slate-900 font-sans select-text shadow-sm printable-paper-sheet printable-document-sheet"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                backgroundColor: "#ffffff",
                color: "#0f172a",
              }}
            >
              {/* 1. Top Header: Branding + Company Master + Branch Issuing Office */}
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
                    LORRY HIRE CHALLAN / TRUCK VOUCHER
                  </div>
                </div>

                {/* Right: Issuing Office details from Branch Master */}
                <div className="w-[28%] text-right text-[10.5px] text-slate-800 leading-snug space-y-0.5 pr-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    ISSUING OFFICE
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {officeName} {officeCode ? `(${officeCode})` : ""}
                  </div>
                  <div className="pt-1">
                    <span className="font-normal text-slate-500">GST NO. </span>
                    <span className="font-semibold font-mono text-slate-900">{officeGstin}</span>
                  </div>
                  <div>
                    <span className="font-normal text-slate-500">PAN NO. </span>
                    <span className="font-semibold font-mono text-slate-900">{officePan}</span>
                  </div>
                </div>
              </div>

              {/* 2. Key Document Identifiers Ribbon */}
              <div className="grid grid-cols-4 border-b border-slate-300 text-[11px] bg-[#f1f5f9] divide-x divide-slate-300">
                <div className="p-2 pl-3">
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">
                    CHALLAN NUMBER
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
                    {challan.challan_number}
                  </span>
                </div>
                <div className="p-2 pl-3">
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">
                    CHALLAN DATE
                  </span>
                  <span className="font-mono font-semibold text-xs text-slate-900 block mt-0.5">
                    {formatDateDMY(challan.challan_date)}
                  </span>
                </div>
                <div className="p-2 pl-3">
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">
                    LINKED LR / JOB
                  </span>
                  <span className="font-mono font-semibold text-xs text-slate-900 block mt-0.5">
                    {challan.lr_number || "DIRECT CHALLAN"}
                  </span>
                </div>
                <div className="p-2 pl-3 bg-[#fef3c7]/60">
                  <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">
                    STATUS
                  </span>
                  <span className="font-bold text-xs text-amber-900 uppercase block mt-0.5">
                    {challan.status}
                  </span>
                </div>
              </div>

              {/* 3. Corridor & Vehicle Row */}
              <div className="grid grid-cols-12 border-b border-slate-300 text-[11px] divide-x divide-slate-300">
                <div className="col-span-5 p-2 pl-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                    FROM LOCATION
                  </span>
                  <div className="flex items-center justify-between mt-0.5 pr-2">
                    <span className="font-bold text-xs text-slate-900">{challan.from_location || "—"}</span>
                    <span className="text-slate-400 font-bold">→</span>
                  </div>
                </div>
                <div className="col-span-4 p-2 pl-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                    TO LOCATION
                  </span>
                  <span className="font-bold text-xs text-slate-900 block mt-0.5">
                    {challan.to_location || "—"}
                  </span>
                </div>
                <div className="col-span-3 p-2 pl-3 text-right pr-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                    VEHICLE NUMBER
                  </span>
                  <span className="font-bold font-mono text-xs text-slate-900 block mt-0.5">
                    {challan.vehicle_number}
                  </span>
                </div>
              </div>

              {/* 4. Parties: Owner / Vendor & Driver */}
              <div className="grid grid-cols-2 border-b border-slate-300 text-[11px] divide-x divide-slate-300">
                <div className="bg-[#f8fafc] px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  VEHICLE OWNER / VENDOR (TRANSPORTER)
                </div>
                <div className="bg-[#f8fafc] px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  ASSIGNED DRIVER DETAILS
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-slate-900">
                    {challan.owner_name || "Direct Driver / Market Owner"}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-2 font-mono">
                    Vendor Ref / Slip: {challan.vendor_ref_no || "—"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-slate-900">
                    {challan.driver_name || "Assigned Driver"}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-2 font-mono">
                    Driver Contact: {challan.driver_phone || "—"}
                  </div>
                </div>
              </div>

              {/* 5. Expense Items or Freight Particulars Table */}
              <table className="w-full border-b border-slate-300 text-[11px] text-left">
                <thead>
                  <tr className="bg-[#f1f5f9] border-b border-slate-300 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                    <th className="p-2 pl-3 border-r border-slate-300 w-32">CHARGE HEAD</th>
                    <th className="p-2 pl-3 border-r border-slate-300 w-28">LR / GR NO</th>
                    <th className="p-2 pl-3 border-r border-slate-300 text-center w-20">PACKAGES</th>
                    <th className="p-2 pl-3 border-r border-slate-300 text-right w-28">GROSS WT</th>
                    <th className="p-2 pl-3 border-r border-slate-300">NARRATION / REMARKS</th>
                    <th className="p-2 pr-3 text-right w-32">AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allExpenses.length > 0 ? (
                    allExpenses.map((exp, idx) => (
                      <tr key={idx} className="min-h-[32px]">
                        <td className="p-2 pl-3 border-r border-slate-300 font-semibold text-slate-900">
                          {exp.charge_head || `${exp.type} Expense`}
                        </td>
                        <td className="p-2 pl-3 border-r border-slate-300 font-mono text-slate-700">
                          {exp.lr_no || "—"}
                        </td>
                        <td className="p-2 pl-3 border-r border-slate-300 text-center font-mono">
                          {exp.pkg_count || "—"}
                        </td>
                        <td className="p-2 pl-3 border-r border-slate-300 text-right font-mono">
                          {exp.gross_weight ? `${exp.gross_weight} MT` : "—"}
                        </td>
                        <td className="p-2 pl-3 border-r border-slate-300 text-slate-600">
                          {exp.narration || "Freight transportation loading/unloading"}
                        </td>
                        <td className="p-2 pr-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(exp.inr_amount || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="min-h-[36px]">
                      <td className="p-2.5 pl-3 border-r border-slate-300 font-semibold text-slate-900">
                        Agreed Truck Hire Rate
                      </td>
                      <td className="p-2.5 pl-3 border-r border-slate-300 font-mono text-slate-700">
                        {challan.lr_number || "—"}
                      </td>
                      <td className="p-2.5 pl-3 border-r border-slate-300 text-center font-mono">—</td>
                      <td className="p-2.5 pl-3 border-r border-slate-300 text-right font-mono">—</td>
                      <td className="p-2.5 pl-3 border-r border-slate-300 text-slate-600">
                        Freight transportation from {challan.from_location || "Origin"} to{" "}
                        {challan.to_location || "Destination"}
                      </td>
                      <td className="p-2.5 pr-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(challan.hire_rate)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 6. Financial Breakdown & Payment Terms */}
              <div className="flex border-b border-slate-300 text-[11px]">
                {/* Left: Remittance Bank Details */}
                <div className="w-[58%] p-3 border-r border-slate-300 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      BRANCH BANK ACCOUNT DETAILS (FOR REMITTANCE)
                    </div>
                    {issuingBranch?.bank_name ? (
                      <div className="text-[10.5px] space-y-0.5 text-slate-800">
                        <div>
                          <span className="text-slate-500">Bank:</span>{" "}
                          <span className="font-semibold">{issuingBranch.bank_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">A/C No:</span>{" "}
                          <span className="font-mono font-bold">{issuingBranch.bank_account_no}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">IFSC Code:</span>{" "}
                          <span className="font-mono font-bold">{issuingBranch.bank_ifsc}</span>
                        </div>
                        {issuingBranch.bank_branch && (
                          <div>
                            <span className="text-slate-500">Branch:</span> {issuingBranch.bank_branch}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10.5px] text-slate-500 italic">
                        Remit to Head Office corporate accounts or consult issuing office counter.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-200">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-700">
                      SETTLEMENT STATUS:{" "}
                    </span>
                    <span className="font-bold text-xs uppercase text-slate-900 ml-1">
                      {challan.status}
                    </span>
                    {challan.remarks && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Note: {challan.remarks}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Freight & Deductions Summary */}
                <div className="w-[42%] divide-y divide-slate-200 text-[11px]">
                  <div className="flex justify-between p-2 pl-3 pr-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      AGREED HIRE RATE
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(challan.hire_rate)}
                    </span>
                  </div>
                  {Number(challan.detention_charge || 0) > 0 && (
                    <div className="flex justify-between p-2 pl-3 pr-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        DETENTION CHARGE
                      </span>
                      <span className="font-mono">{formatCurrency(challan.detention_charge)}</span>
                    </div>
                  )}
                  {Number(challan.mamul_charges || 0) > 0 && (
                    <div className="flex justify-between p-2 pl-3 pr-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        MAMUL CHARGES
                      </span>
                      <span className="font-mono">{formatCurrency(challan.mamul_charges)}</span>
                    </div>
                  )}
                  {challan.tds_category && (
                    <div className="flex justify-between p-2 pl-3 pr-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        TDS DEDUCTED ({challan.tds_category})
                      </span>
                      <span className="font-mono text-rose-600">
                        - {formatCurrency(challan.tds_amount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between p-2 pl-3 pr-3 font-bold bg-slate-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
                      NET PAYABLE
                    </span>
                    <span className="font-mono text-xs text-slate-900">
                      {formatCurrency(challan.net_payable_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 pl-3 pr-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      ADVANCE PAID
                    </span>
                    <span className="font-mono font-semibold text-emerald-700">
                      - {formatCurrency(challan.advance_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between p-2 pl-3 pr-3 font-bold text-slate-900 bg-slate-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
                      BALANCE PAYABLE
                    </span>
                    <span className="font-mono text-xs text-rose-700">
                      {formatCurrency(challan.balance_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7. Terms, Jurisdiction & Signature */}
              <div className="flex items-center justify-between p-3 border-b border-slate-300 text-[11px]">
                <div className="w-1/3 text-left text-[10px] text-slate-700 font-normal leading-relaxed">
                  <div>{jurisdictionText}</div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5">
                    Vehicle hired subject to standard fleet operating terms.
                  </div>
                </div>
                <div className="w-1/3 text-center">
                  <div className="text-[9.5px] font-bold tracking-wider text-slate-900 uppercase">
                    DRIVER / VENDOR RECEIPT
                  </div>
                  <div className="text-[10px] text-slate-700 mt-1 font-mono">
                    Sign: ____________________
                  </div>
                </div>
                <div className="w-1/3 text-right">
                  {company?.signature_url && (
                    <div className="flex justify-end mb-1">
                      <img
                        src={company.signature_url}
                        alt="Signing Authority"
                        crossOrigin="anonymous"
                        className="h-8 max-w-[110px] object-contain"
                      />
                    </div>
                  )}
                  <div className="text-[9.5px] text-slate-700 font-medium">
                    {company?.signing_authority_name || "Authorized Signatory"}
                    {company?.signing_authority_designation ? ` (${company.signing_authority_designation})` : ""}
                  </div>
                  <div className="text-[10.5px] font-bold text-slate-900 uppercase mt-0.5">
                    FOR {companyName}
                  </div>
                </div>
              </div>

              {/* 8. Bottom Footer Bar with Dynamic Issuing Office State */}
              <div className="bg-black text-white text-center py-2 px-3 text-[10px] sm:text-[11px] font-medium tracking-wide">
                This Lorry Hire Challan is electronically generated from {issuingOfficeState}.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-[#22232E] bg-slate-50 dark:bg-[#161722] flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Issuing Office: <span className="font-semibold text-slate-800 dark:text-slate-200">{officeName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs cursor-pointer dark:bg-[#1F202B] dark:border-[#2B2D3D] dark:text-slate-200 dark:hover:bg-[#262837]"
            >
              Close
            </Button>
            {challan.status !== "SETTLED" &&
              parseFloat(String(challan.balance_amount)) > 0 &&
              onSettle && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const c = challan;
                    onClose();
                    onSettle(c);
                  }}
                  className="text-xs cursor-pointer"
                >
                  Settle Balance Now
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
