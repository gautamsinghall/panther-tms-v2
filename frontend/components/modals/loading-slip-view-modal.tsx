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
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface LoadingSlipRecord {
  id: number;
  slip_number: string;
  slip_date: string;
  slip_series_id?: number | null;
  issuing_office_id?: number | null;
  issuing_office_name?: string | null;
  issuing_office_code?: string | null;
  vehicle_number: string;
  consigner_id?: number | null;
  consigner_name?: string | null;
  phone: string;
  email?: string | null;
  pan?: string | null;
  lorry_coordinator?: string | null;
  lorry_coordinator_phone?: string | null;
  origin_location_id?: number | null;
  destination_location_id?: number | null;
  origin_city?: string | null;
  origin_location_display?: string | null;
  destination_city?: string | null;
  destination_location_display?: string | null;
  loading_point?: string | null;
  unloading_point?: string | null;
  lr_id?: number | null;
  lr_number?: string | null;
  loading_date?: string | null;
  remark?: string | null;
  total_freight: string | number;
  advance_amount: string | number;
  detention_charge: string | number;
  commission_amount: string | number;
  mamul_hammali: string | number;
  total_amount: string | number;
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

export interface LoadingSlipViewModalProps {
  isOpen: boolean;
  slip: LoadingSlipRecord | null;
  onClose: () => void;
  onEdit?: (slip: LoadingSlipRecord) => void;
}

export function LoadingSlipViewModal({
  isOpen,
  slip,
  onClose,
  onEdit,
}: LoadingSlipViewModalProps) {
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
      if (!isOpen || !slip) return;
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

          // 1. First priority: active office from top bar
          if (activeOffice && activeOffice.id !== 0) {
            selected = validBranches.find(
              (b) => b.id === activeOffice.id || b.code === activeOffice.code
            );
          }

          // 2. Second priority: slip issuing office
          if (!selected && slip.issuing_office_id) {
            selected = validBranches.find((b) => b.id === slip.issuing_office_id);
          }

          // 3. Fallback: head office or first branch
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
  }, [isOpen, slip]);

  if (!isOpen || !mounted || !slip) return null;

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
          const wrapper = clonedDoc.getElementById("ls-voucher-wrapper");
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
          const el = clonedDoc.getElementById("loading-slip-printable-document");
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
      pdf.save(`Loading_Slip_${slip.slip_number}.pdf`);
      toast.success(`Loading Slip ${slip.slip_number} PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate Loading Slip PDF:", err);
      toast.error("Failed to export Loading Slip PDF. You can also use the browser Print dialog.");
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

  const originText = slip.origin_city || slip.loading_point || "Origin Hub";
  const destText = slip.destination_city || slip.unloading_point || "Destination Hub";

  const totalFreight = Number(slip.total_freight) || 0;
  const advanceAmount = Number(slip.advance_amount) || 0;
  const detentionCharge = Number(slip.detention_charge) || 0;
  const commissionAmount = Number(slip.commission_amount) || 0;
  const mamulHammali = Number(slip.mamul_hammali) || 0;
  const netPayable = Number(slip.total_amount) || (totalFreight + detentionCharge - advanceAmount - commissionAmount - mamulHammali);

  const modalNode = (
    <div className="ls-modal-portal fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto">
      <div
        className="ls-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
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
          body > *:not(.ls-modal-portal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .ls-modal-portal,
          .ls-modal-portal * {
            visibility: visible;
          }
          .no-print,
          .no-print *,
          .ls-modal-backdrop,
          .ls-modal-backdrop * {
            display: none !important;
            visibility: hidden !important;
          }
          .ls-modal-portal {
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
          .ls-modal-container {
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
          .ls-modal-body {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }
          #ls-voucher-wrapper {
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
          #loading-slip-printable-document {
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
      <div className="ls-modal-container relative w-full max-w-4xl h-[94dvh] sm:h-[88dvh] bg-white dark:bg-[#12131A] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#22232E] overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#22232E] bg-slate-50 dark:bg-[#161722] flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Loading Slip
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {slip.slip_number}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
              {formatDateDMY(slip.slip_date)}
            </span>
            {officeCode && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
                {officeCode} - {officeName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Option in Print Preview */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onEdit) {
                  onEdit(slip);
                } else {
                  router.push(`/transport/loading-slip?id=${slip.id}`);
                }
                onClose();
              }}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 dark:bg-[#1F202B] dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/40 shadow-2xs cursor-pointer"
              title="Edit this loading slip"
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
          className="ls-modal-body p-2 sm:p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-100 dark:bg-[#0B0B0E] [webkit-overflow-scrolling:touch]"
        >
          {/* PRINTABLE VOUCHER WRAPPER */}
          <div id="ls-voucher-wrapper" className="w-full min-w-fit">
            <div
              id="loading-slip-printable-document"
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
                    ORIGINAL FOR CARRIER
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
                <span>VEHICLE LOADING SLIP</span>
                <span className="text-[10px] font-mono font-normal tracking-normal text-slate-300">
                  DISPATCH & FREIGHT SETTLEMENT MEMO
                </span>
              </div>

              {/* 3. Slip Identity Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-300 bg-slate-50/80 text-[11px]">
                <div className="p-2 border-r border-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Slip Number</span>
                  <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">{slip.slip_number}</span>
                </div>
                <div className="p-2 border-r border-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Slip Date</span>
                  <span className="font-bold text-slate-900">{formatDateDMY(slip.slip_date)}</span>
                </div>
                <div className="p-2 border-r border-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Loading Date</span>
                  <span className="font-semibold text-slate-900">{formatDateDMY(slip.loading_date) || formatDateDMY(slip.slip_date)}</span>
                </div>
                <div className="p-2">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Linked LR / GR</span>
                  <span className="font-mono font-bold text-indigo-700">{slip.lr_number ? `LR #${slip.lr_number}` : slip.lr_id ? `LR #${slip.lr_id}` : "Direct Dispatch"}</span>
                </div>
              </div>

              {/* 4. Two-Column Operational Details (Truck / Coordinator & Consignor / Route) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-slate-300 text-[11px]">
                {/* Column Left: Vehicle & Coordinator */}
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-slate-300 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>1. Vehicle & Carrier Details</span>
                    <span className="text-[10px] font-mono text-slate-500">FLEET / BROKER</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-600 font-medium">Truck Number:</span>
                    <span className="font-mono font-black text-sm uppercase text-slate-900 px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded">
                      {slip.vehicle_number || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Lorry Coordinator:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {slip.lorry_coordinator || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Coordinator Phone:</span>
                    <span className="font-mono text-slate-800">
                      {slip.lorry_coordinator_phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Coordinator PAN:</span>
                    <span className="font-mono uppercase font-semibold text-slate-800">
                      {slip.pan || "—"}
                    </span>
                  </div>
                </div>

                {/* Column Right: Consignor & Corridor */}
                <div className="p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>2. Consignor & Corridor Details</span>
                    <span className="text-[10px] font-mono text-slate-500">SHIPMENT</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-slate-600 font-medium">Consignor / Shipper:</span>
                    <span className="font-semibold text-slate-900 text-right max-w-[200px] truncate">
                      {slip.consigner_name || "Direct Customer / Walk-in"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Consignor Phone:</span>
                    <span className="font-mono text-slate-800">
                      {slip.phone || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Consignor Email:</span>
                    <span className="text-slate-800 truncate max-w-[200px]">
                      {slip.email || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-slate-600 font-medium">Route Corridor:</span>
                    <span className="font-bold text-slate-900 text-right">
                      {originText} → {destText}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Freight & Settlement Calculation Table */}
              <div className="border-b border-slate-300">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wide">
                    3. Freight & Charges Settlement Schedule
                  </span>
                  <span className="text-[10px] text-slate-500 italic">
                    Currency: INR (₹)
                  </span>
                </div>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="py-1.5 px-3 text-left font-bold w-12 border-r border-slate-200">#</th>
                      <th className="py-1.5 px-3 text-left font-bold border-r border-slate-200">Particulars / Charge Head</th>
                      <th className="py-1.5 px-3 text-left font-bold border-r border-slate-200">Nature / Terms</th>
                      <th className="py-1.5 px-3 text-right font-bold w-36">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1.5 px-3 font-mono text-slate-500 border-r border-slate-200">1</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                        Total Agreed Freight
                      </td>
                      <td className="py-1.5 px-3 text-slate-600 border-r border-slate-200">
                        Gross contract freight for route {originText} → {destText}
                      </td>
                      <td className="py-1.5 px-3 font-mono font-bold text-right text-slate-900">
                        {formatCurrency(totalFreight)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-mono text-slate-500 border-r border-slate-200">2</td>
                      <td className="py-1.5 px-3 text-slate-800 border-r border-slate-200">
                        Less: Advance Paid at Loading
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 border-r border-slate-200">
                        Advance disbursed at dispatch point
                      </td>
                      <td className="py-1.5 px-3 font-mono text-right text-slate-700">
                        {advanceAmount > 0 ? `(-) ${formatCurrency(advanceAmount)}` : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-mono text-slate-500 border-r border-slate-200">3</td>
                      <td className="py-1.5 px-3 text-slate-800 border-r border-slate-200">
                        Add: Detention Charges
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 border-r border-slate-200">
                        Loading delay detention allowance
                      </td>
                      <td className="py-1.5 px-3 font-mono text-right text-slate-700">
                        {detentionCharge > 0 ? `(+) ${formatCurrency(detentionCharge)}` : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-mono text-slate-500 border-r border-slate-200">4</td>
                      <td className="py-1.5 px-3 text-slate-800 border-r border-slate-200">
                        Less: Commission / Brokerage
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 border-r border-slate-200">
                        Lorry brokerage deduction
                      </td>
                      <td className="py-1.5 px-3 font-mono text-right text-slate-700">
                        {commissionAmount > 0 ? `(-) ${formatCurrency(commissionAmount)}` : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-mono text-slate-500 border-r border-slate-200">5</td>
                      <td className="py-1.5 px-3 text-slate-800 border-r border-slate-200">
                        Less: Mamul / Hammali / Labour
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 border-r border-slate-200">
                        Loading union / hammali charge deduction
                      </td>
                      <td className="py-1.5 px-3 font-mono text-right text-slate-700">
                        {mamulHammali > 0 ? `(-) ${formatCurrency(mamulHammali)}` : "—"}
                      </td>
                    </tr>
                    {/* Final Net Total */}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <td colSpan={3} className="py-2 px-3 text-right text-slate-900 uppercase tracking-wide border-r border-slate-200">
                        Net Total Payable at Unloading / Settlement:
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-indigo-900 text-sm bg-indigo-50/60 font-black">
                        {formatCurrency(netPayable)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. Remarks & Instructions */}
              <div className="p-3 border-b border-slate-300 text-[10.5px] bg-white space-y-1">
                <span className="font-bold text-slate-900 uppercase block">Instructions & Notes:</span>
                <p className="text-slate-600 leading-relaxed">
                  1. The vehicle driver/carrier agrees to convey the consignment to destination safely without transshipment unless authorized.<br />
                  2. Balance payment shall be settled only upon presentation of original acknowledged receiving slip / LR acknowledgement.<br />
                  3. In case of any transit shortage or damage, liability will be assessed and deducted as per contract terms.
                </p>
                {slip.remark && (
                  <div className="mt-1 p-2 rounded bg-slate-50 border border-slate-200 font-mono text-slate-800">
                    <span className="font-bold uppercase text-[10px] text-slate-500 block">Operator Remarks:</span>
                    {slip.remark}
                  </div>
                )}
              </div>

              {/* 7. Signatures */}
              <div className="grid grid-cols-3 border-t border-slate-300 text-center text-[10.5px] p-3 pt-8 pb-4">
                <div className="flex flex-col justify-end items-center px-2">
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">Driver / Vehicle Representative</span>
                  <span className="text-[9.5px] text-slate-500">Sign & Contact No.</span>
                </div>

                <div className="flex flex-col justify-end items-center px-2">
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span className="font-semibold text-slate-800">Loading Supervisor / Prepared By</span>
                  <span className="text-[9.5px] text-slate-500">Dispatched & Verified</span>
                </div>

                <div className="flex flex-col justify-end items-center px-2">
                  <div className="w-40 border-b border-slate-400 mb-1"></div>
                  <span className="font-bold text-slate-900">For {companyName}</span>
                  <span className="text-[9.5px] text-slate-500">Authorized Signatory</span>
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
