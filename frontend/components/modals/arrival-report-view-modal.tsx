"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Printer,
  Download,
  Loader2,
  Pencil,
  Truck,
  Building2,
  Calendar,
  IndianRupee,
  MapPin,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface ArrivalReportRecord {
  id: number;
  report_number: string;
  series_id?: number | null;
  arrival_date: string;
  delivered_date: string;
  lr_id: number;
  hire_challan_id?: number | null;
  job_id?: number | null;
  issuing_office_id?: number | null;

  customer_name?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  lr_date?: string | null;
  transit_days: number;
  eta?: string | null;
  booked_packages: number;
  booked_weight: number | string;
  issued_by?: string | null;
  vehicle_number?: string | null;

  delivered_packages: number;
  delivered_weight: number | string;
  shortage_packages: number;
  shortage_weight: number | string;
  damage_packages: number;
  damage_remarks?: string | null;

  deduction_shortage: number | string;
  deduction_others: number | string;
  deduction_damage: number | string;
  deduction_delay: number | string;
  total_deductions: number | string;

  payable_detention: number | string;
  payable_mis_others: number | string;
  payable_labour: number | string;
  payable_border_expense: number | string;
  total_additional_payable: number | string;
  net_amount?: number | string;

  condition_remarks?: string | null;
  destination_hub?: string | null;
  receiver_name?: string | null;
  status: string;
  lr_number?: string | null;
  challan_number?: string | null;
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
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  document_notes?: string | null;
  is_head_office: boolean;
}

export interface ArrivalReportViewModalProps {
  isOpen: boolean;
  report: ArrivalReportRecord | null;
  onClose: () => void;
  onEdit?: (report: ArrivalReportRecord) => void;
}

export function ArrivalReportViewModal({
  isOpen,
  report,
  onClose,
  onEdit,
}: ArrivalReportViewModalProps) {
  const router = useRouter();
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
      if (!isOpen || !report) return;
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

          // 1. Active office from top bar
          if (activeOffice && activeOffice.id !== 0) {
            selected = validBranches.find(
              (b) => b.id === activeOffice.id || b.code === activeOffice.code
            );
          }

          // 2. Report office
          if (!selected && report.issuing_office_id) {
            selected = validBranches.find((b) => b.id === report.issuing_office_id);
          }

          // 3. Fallback
          if (!selected) {
            selected = validBranches.find((b) => b.is_head_office) || validBranches[0];
          }

          setIssuingBranch(selected || null);
        }
      } catch (err) {
        console.error("Failed to load company/branch profile:", err);
      }
    }

    loadCompanyAndBranch();
  }, [isOpen, report]);

  if (!isOpen || !mounted || !report) return null;

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
          const wrapper = clonedDoc.getElementById("ar-voucher-wrapper");
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
          const el = clonedDoc.getElementById("arrival-report-printable-document");
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
      pdf.save(`Arrival_Report_${report.report_number}.pdf`);
      toast.success(`Arrival Report ${report.report_number} PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate Arrival Report PDF:", err);
      toast.error("Failed to export Arrival Report PDF. You can also use the browser Print dialog.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const formatDateDMY = (dateStr?: string | null) => {
    if (!dateStr) return "—";
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
  const officeName = issuingBranch?.name?.trim() || activeOffice?.name?.trim() || "Head Office";
  const officeCode = issuingBranch?.code?.trim() || activeOffice?.code?.trim() || "";
  const officeCity = issuingBranch?.city?.trim() || activeOffice?.city?.trim() || company?.city?.trim() || "DELHI";
  const officeState = issuingBranch?.state?.trim() || activeOffice?.state?.trim() || company?.state?.trim() || "DELHI";
  const officePincode = issuingBranch?.pincode?.trim() || company?.pincode?.trim() || "";
  const officePhone = issuingBranch?.phone?.trim() || company?.phone?.trim() || "—";
  const officeEmail = issuingBranch?.email?.trim() || company?.email?.trim() || "—";
  const officeGstin = issuingBranch?.gstin?.trim() || company?.gstin?.trim() || "—";
  const officePan = company?.pan?.trim() || issuingBranch?.pan?.trim() || "—";
  const officeAddress = issuingBranch?.address?.trim() || company?.address?.trim() || "Corporate Branch Office";

  const totalDeductions = Number(report.total_deductions) || 0;
  const totalPayables = Number(report.total_additional_payable) || 0;
  const netTransitAdjustment = totalPayables - totalDeductions;

  const bookedPkgs = report.booked_packages || 0;
  const deliveredPkgs = report.delivered_packages || 0;
  const shortagePkgs = report.shortage_packages || 0;
  const damagePkgs = report.damage_packages || 0;

  const bookedWt = Number(report.booked_weight) || 0;
  const deliveredWt = Number(report.delivered_weight) || 0;
  const shortageWt = Number(report.shortage_weight) || 0;

  const modalNode = (
    <div className="ar-modal-portal fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto">
      <div
        className="ar-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
      />

      {/* Print Style Injector for 1-page clean A4 output */}
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
          body > *:not(.ar-modal-portal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .ar-modal-portal,
          .ar-modal-portal * {
            visibility: visible;
          }
          .no-print,
          .no-print *,
          .ar-modal-backdrop,
          .ar-modal-backdrop * {
            display: none !important;
            visibility: hidden !important;
          }
          .ar-modal-portal {
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
          .ar-modal-container {
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
          .ar-modal-body {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }
          #ar-voucher-wrapper {
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
          #arrival-report-printable-document {
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
      <div className="ar-modal-container relative w-full max-w-4xl h-[94dvh] sm:h-[88dvh] bg-white dark:bg-[#12131A] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#22232E] overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#22232E] bg-slate-50 dark:bg-[#161722] flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Arrival Report
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {report.report_number}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              {report.status || "VERIFIED"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
              {formatDateDMY(report.arrival_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Option in Print Preview */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onEdit) {
                  onEdit(report);
                } else {
                  router.push(`/transport/arrival-reports?id=${report.id}`);
                }
                onClose();
              }}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 dark:bg-[#1F202B] dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/40 shadow-2xs cursor-pointer"
              title="Edit this arrival report"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Edit</span>
            </Button>

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
          className="ar-modal-body p-2 sm:p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-100 dark:bg-[#0B0B0E] [webkit-overflow-scrolling:touch]"
        >
          {/* PRINTABLE VOUCHER WRAPPER */}
          <div id="ar-voucher-wrapper" className="w-full min-w-fit">
            <div
              id="arrival-report-printable-document"
              ref={printRef}
              className="min-w-[660px] md:min-w-0 w-full max-w-[780px] mx-auto bg-white border border-slate-300 text-slate-900 font-sans select-text shadow-sm printable-paper-sheet printable-document-sheet print:min-w-0"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif",
                backgroundColor: "#ffffff",
                color: "#0f172a",
              }}
            >
              {/* 1. Header: Branding + Company Master */}
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
                    DESTINATION HUB: {officeCode ? `${officeCode} - ` : ""}{officeName}
                  </div>
                </div>

                {/* Right: Tax Registration */}
                <div className="w-[28%] text-right text-[10.5px] text-slate-700 leading-tight space-y-0.5">
                  <div className="inline-block px-2 py-0.5 font-bold uppercase tracking-wider text-[10px] bg-emerald-50 border border-emerald-300 text-emerald-800 rounded mb-1">
                    DESTINATION UNLOADING SLIP
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

              {/* 2. Document Banner Title */}
              <div className="bg-slate-900 text-white text-center py-1.5 px-3 uppercase tracking-wider font-bold text-xs sm:text-sm flex items-center justify-between">
                <span>DESTINATION ARRIVAL REPORT</span>
                <span className="text-[10px] font-mono font-normal tracking-normal text-slate-300">
                  CARGO UNLOADING & INSPECTION SLIP
                </span>
              </div>

              {/* 3. Arrival Identity Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-300 bg-slate-50/80 text-[11px]">
                <div className="p-2 border-r border-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Arrival Report No.</span>
                  <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{report.report_number}</span>
                </div>
                <div className="p-2 border-r border-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Arrival Date</span>
                  <span className="font-bold text-slate-900">{formatDateDMY(report.arrival_date)}</span>
                </div>
                <div className="p-2 border-r border-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Delivered Date</span>
                  <span className="font-semibold text-slate-900">{formatDateDMY(report.delivered_date || report.arrival_date)}</span>
                </div>
                <div className="p-2">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Inspection Status</span>
                  <span className="font-mono font-bold text-emerald-700 uppercase">{report.status || "VERIFIED"}</span>
                </div>
              </div>

              {/* 4. Two-Column Operational Details (Consignment Linking & Route) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-300 text-[11px]">
                {/* Column Left: Consignment & Vehicle */}
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-slate-300 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>1. Consignment & Carrier Linking</span>
                    <span className="text-[10px] font-mono text-slate-500">ORIGIN REF</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-600 font-medium">Consignment (LR/GR) No:</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {report.lr_number || `LR #${report.lr_id}`}
                    </span>
                  </div>
                  {report.lr_date && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-600 font-medium">LR Booking Date:</span>
                      <span className="font-mono text-slate-800">{formatDateDMY(report.lr_date)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Hire Challan (HC):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {report.challan_number || (report.hire_challan_id ? `HC #${report.hire_challan_id}` : "Direct Dispatch")}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Vehicle / Truck No:</span>
                    <span className="font-mono font-black text-sm uppercase text-slate-900 px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded">
                      {report.vehicle_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">HC Issued By:</span>
                    <span className="font-semibold text-slate-800">{report.issued_by || "Operations"}</span>
                  </div>
                </div>

                {/* Column Right: Billing Client & Corridor */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>2. Customer & Corridor Details</span>
                    <span className="text-[10px] font-mono text-slate-500">TRANSIT</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-600 font-medium">Billing Client:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[200px] truncate">
                      {report.customer_name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Transit Corridor:</span>
                    <span className="font-bold text-slate-900 text-right">
                      {report.from_location || "Origin"} → {report.to_location || "Destination"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Transit Days / ETA:</span>
                    <span className="font-mono text-slate-800">
                      {report.transit_days ? `${report.transit_days} days` : "—"} {report.eta ? `(ETA: ${report.eta})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Physical Cargo Unloading & Tally Table */}
              <div className="border-b border-slate-300">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                    3. Physical Cargo Unloading Tally & Exceptions
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    Origin vs Destination Verification
                  </span>
                </div>
                <table className="w-full text-[11px] border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="py-1.5 px-3 text-left font-bold border-r border-slate-200">Cargo Metric</th>
                      <th className="py-1.5 px-3 text-right font-bold border-r border-slate-200">Booked Quantity</th>
                      <th className="py-1.5 px-3 text-right font-bold border-r border-slate-200 text-emerald-800">Delivered / Received</th>
                      <th className="py-1.5 px-3 text-right font-bold border-r border-slate-200 text-amber-800">Shortage</th>
                      <th className="py-1.5 px-3 text-right font-bold text-rose-800">Damaged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 font-sans">
                        Package Units (Pkgs / Bags / Cases)
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 border-r border-slate-200">
                        {bookedPkgs} Pkgs
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 border-r border-slate-200 bg-emerald-50/40">
                        {deliveredPkgs} Pkgs
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-700 border-r border-slate-200 bg-amber-50/30">
                        {shortagePkgs > 0 ? `${shortagePkgs} Pkgs` : "0"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-rose-700 bg-rose-50/30">
                        {damagePkgs > 0 ? `${damagePkgs} Pkgs` : "0"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200 font-sans">
                        Gross Cargo Weight (MT)
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 border-r border-slate-200">
                        {bookedWt.toFixed(3)} MT
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 border-r border-slate-200 bg-emerald-50/40">
                        {deliveredWt.toFixed(3)} MT
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-700 border-r border-slate-200 bg-amber-50/30">
                        {shortageWt > 0 ? `${shortageWt.toFixed(3)} MT` : "0.000 MT"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 bg-rose-50/20">
                        {report.damage_remarks || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. Financial Adjustments: Deductions vs Additions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-300 text-[11px]">
                {/* Left: Transit Deductions */}
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-slate-300 space-y-1.5 bg-rose-50/30">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-1 font-bold text-rose-900 uppercase">
                    <span>4A. Transit Deductions Applied</span>
                    <span className="font-mono">{formatCurrency(totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 pt-0.5">
                    <span>Shortage Deduction:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.deduction_shortage) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Damage Deduction:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.deduction_damage) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Transit Delay Penalty:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.deduction_delay) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Other Deductions:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.deduction_others) || 0)}</span>
                  </div>
                </div>

                {/* Right: Additional Payables */}
                <div className="p-3 space-y-1.5 bg-emerald-50/30">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-1 font-bold text-emerald-900 uppercase">
                    <span>4B. Additional Payables / Allowances</span>
                    <span className="font-mono">{formatCurrency(totalPayables)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 pt-0.5">
                    <span>Detention Allowance:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.payable_detention) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Unloading Labour / Hammali:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.payable_labour) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Border / Toll Expenses:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.payable_border_expense) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>MIS / Other Allowances:</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(report.payable_mis_others) || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Net Settlement Banner */}
              <div className="bg-slate-100 p-2.5 px-3 border-b border-slate-300 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 uppercase">
                  Net Transit Settlement Adjustment:
                </span>
                <span className={`font-mono font-black text-sm ${netTransitAdjustment >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {netTransitAdjustment >= 0 ? `(+) ${formatCurrency(netTransitAdjustment)} (Extra Payable)` : `(-) ${formatCurrency(Math.abs(netTransitAdjustment))} (Net Deduction)`}
                </span>
              </div>

              {/* 7. Condition / Unloading Remarks */}
              <div className="p-3 border-b border-slate-300 text-[10.5px] bg-white space-y-1">
                <span className="font-bold text-slate-900 uppercase block">Destination Hub Condition Remarks:</span>
                <p className="text-slate-700 font-mono">
                  {report.condition_remarks || "Cargo verified and unloaded under standard operational supervision. No seal tampering reported."}
                </p>
                {report.damage_remarks && (
                  <p className="text-rose-700 font-mono font-semibold">
                    Exception Note: {report.damage_remarks}
                  </p>
                )}
              </div>

              {/* 8. Signatures */}
              <div className="grid grid-cols-3 border-t border-slate-300 text-center text-[10.5px] p-3 pt-6 pb-4">
                <div className="flex flex-col justify-end items-center px-2">
                  <div className="h-10 sm:h-12" />
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">Unloaded & Received By</span>
                  <span className="text-[9.5px] text-slate-500">
                    {report.receiver_name ? `${report.receiver_name} (Store / Consignee)` : "Store / Consignee Staff"}
                  </span>
                </div>

                <div className="flex flex-col justify-end items-center px-2">
                  <div className="h-10 sm:h-12" />
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">Vehicle Driver Signature</span>
                  <span className="text-[9.5px] text-slate-500">Sign & Verified Count</span>
                </div>

                <div className="flex flex-col justify-end items-center px-2">
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
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span className="font-bold text-slate-900">For {companyName}</span>
                  <span className="text-[9.5px] text-slate-600 font-medium">
                    {company?.signing_authority_name || "Destination Branch In-charge"}
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

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : null;
}
