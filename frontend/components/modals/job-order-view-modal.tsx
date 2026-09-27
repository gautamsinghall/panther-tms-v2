"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Pencil,
  Truck,
  Calendar,
  Building2,
  MapPin,
  Package,
  Weight,
  FileText,
  User,
  CreditCard,
  PenTool,
  FileSignature,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";

export interface JobViewRecord {
  id: number;
  job_number: string;
  job_date: string;
  consigner_id: number;
  consignee_id: number;
  origin_location_id?: number;
  destination_location_id?: number;
  billing_client_id?: number;
  billing_party?: string;
  billing_client_name?: string;
  consigner_name?: string;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  expected_dispatch_date?: string;
  cargo_description?: string;
  estimated_weight_mt?: string | number;
  estimated_packages?: number;
  status: string;
  created_at: string;
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
}

interface JobOrderViewModalProps {
  isOpen: boolean;
  job: JobViewRecord | null;
  onClose: () => void;
  onEdit: (job: JobViewRecord) => void;
  onBookLR: (jobId: number) => void;
}

export function JobOrderViewModal({
  isOpen,
  job,
  onClose,
  onEdit,
  onBookLR,
}: JobOrderViewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [company, setCompany] = useState<CompanySettingData | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadCompanyDetails() {
      try {
        const data = await apiClient<CompanySettingData>("/api/v1/profile/company");
        if (data) {
          setCompany(data);
        }
      } catch {
        const auth = getStoredAuth();
        if (auth?.tenantName) {
          setCompany({ company_name: auth.tenantName });
        }
      }
    }

    if (isOpen) {
      loadCompanyDetails();
    }
  }, [isOpen]);

  if (!isOpen || !mounted || !job) return null;

  const handlePrint = () => {
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
        logging: false,
        backgroundColor: "#ffffff",
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById("job-order-printable-document");
          if (el) {
            el.style.width = "720px";
            el.style.maxWidth = "720px";
            el.style.margin = "0 auto";
            el.style.boxShadow = "none";
            el.style.overflow = "visible";

            // Prevent any text clipping in cloned canvas
            el.querySelectorAll("*").forEach((node) => {
              const hNode = node as HTMLElement;
              if (hNode.style) {
                hNode.style.overflow = "visible";
              }
            });
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");

      // Standard A4 portrait: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      // Generous 10mm margins for professional look
      const margin = 10;
      const maxW = pdfWidth - margin * 2; // 190mm
      const maxH = pdfHeight - margin * 2; // 277mm

      // Ensure the document fits perfectly on EXACTLY 1 page
      const scaleX = maxW / canvas.width;
      const scaleY = maxH / canvas.height;
      const scale = Math.min(scaleX, scaleY);

      const renderWidth = canvas.width * scale;
      const renderHeight = canvas.height * scale;

      // Perfectly center on A4 page
      const posX = (pdfWidth - renderWidth) / 2;
      const posY = (pdfHeight - renderHeight) / 2;

      pdf.addImage(imgData, "PNG", posX, posY, renderWidth, renderHeight, undefined, "FAST");
      pdf.save(`Trip_Order_${job.job_number}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const formatCreatedAt = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
      return `${year}-${month}-${day}, ${strTime}`;
    } catch {
      return dateStr;
    }
  };

  const companyName = company?.company_name?.trim() || "";
  const companyInitial = companyName ? companyName.charAt(0).toUpperCase() : "";

  // Split company name into parts if multiple words for styling
  const nameParts = companyName ? companyName.split(" ") : [];
  const firstPart = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : (nameParts[0] || "");
  const lastPart = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  const modalNode = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:absolute print:inset-0">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
      />

      {/* Print Style Injector */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #job-order-printable-document,
          #job-order-printable-document * {
            visibility: visible;
          }
          #job-order-printable-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 14px !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            background: white !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trip Order Specification
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs font-bold text-slate-900">
              {job.job_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf}
              onClick={handleDownloadPdf}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>Download PDF</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(job);
              }}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit</span>
            </Button>

            {job.status === "OPEN" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs font-medium h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Book GR/LR</span>
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Body - SINGLE A4 PAGE FORMAT */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-[#F8FAFC]/30">
          <div
            id="job-order-printable-document"
            ref={printRef}
            className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3.5 max-w-2xl mx-auto print:border-none print:shadow-none print:p-0"
          >
            {/* Header: Company Profile & Job Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-1 gap-3">
              {/* Left: Square logo + Company Name + Subtitle */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0c1427] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-2xs select-none">
                  {companyInitial}
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black tracking-wide uppercase leading-tight">
                    {firstPart && <span className="text-slate-900">{firstPart} </span>}
                    {lastPart && <span className="text-[#3B82F6]">{lastPart}</span>}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Trip Order Specification
                  </div>
                  {company?.gstin && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      GSTIN: {company.gstin}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Job Number pill + Status Badge + Created Date */}
              <div className="sm:text-right space-y-1">
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-900 bg-[#F1F5F9] px-3 py-0.5 rounded-lg border border-slate-200/90">
                    {job.job_number}
                  </span>
                  <span className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] px-2.5 py-0.5 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
                    <span>{job.status}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium flex items-center sm:justify-end gap-1.5 pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Created: {formatCreatedAt(job.created_at || job.job_date)}</span>
                </div>
              </div>
            </div>

            {/* Section 1: Route Corridor & Scheduled Dispatch Date Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC]/50 p-4">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Origin Hub */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]/60 text-[#10B981] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#10B981] tracking-wider">
                      Origin Hub / City
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {job.origin_city || ""}
                    </div>
                  </div>
                </div>

                {/* Corridor Truck Flow */}
                <div className="flex-1 flex items-center justify-center px-2 sm:px-4">
                  <div className="flex-1 border-t-2 border-dashed border-slate-300 min-w-[24px]" />
                  <div className="mx-2 px-2.5 py-1.5 rounded-xl bg-[#1E293B] text-white flex items-center gap-1 shrink-0 shadow-xs">
                    <Truck className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-bold text-white/80 leading-none">→</span>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-slate-300 min-w-[24px] flex items-center justify-end relative">
                    <span className="text-slate-400 font-bold text-xs leading-none -mr-1">›</span>
                  </div>
                </div>

                {/* Destination Hub */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE]/60 text-[#4F46E5] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#4F46E5] tracking-wider">
                      Destination Hub / City
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {job.destination_city || ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scheduled Dispatch Date */}
              <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Scheduled Dispatch Date</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-0.5 font-mono font-bold text-slate-800 text-xs shadow-2xs">
                  {job.expected_dispatch_date || ""}
                </div>
              </div>
            </div>

            {/* Section 2: Consigner & Consignee 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Consigner Card */}
              <div className="rounded-2xl border border-slate-200/90 p-4 bg-white flex items-start gap-3 shadow-2xs">
                <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#3B82F6] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Consigner (Shipper)
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      ID #{job.consigner_id}
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 leading-snug break-words pb-0.5">
                    {job.consigner_name || ""}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-normal break-words pb-0.5">
                    Origin Dispatch Station: {job.origin_city || ""}
                  </div>
                </div>
              </div>

              {/* Consignee Card */}
              <div className="rounded-2xl border border-slate-200/90 p-4 bg-white flex items-start gap-3 shadow-2xs">
                <div className="w-11 h-11 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]/60 text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Consignee (Receiver)
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      ID #{job.consignee_id}
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 leading-snug break-words pb-0.5">
                    {job.consignee_name || ""}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-normal break-words pb-0.5">
                    Destination Delivery Hub: {job.destination_city || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Contracting Billing Client */}
            <div className="rounded-2xl border border-slate-200/90 p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA]/60 text-[#F97316] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Contracting Billing Client
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                    {job.billing_client_name || job.billing_party || ""}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 bg-white text-xs font-semibold text-slate-600 shadow-2xs self-start sm:self-center">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Payment / Freight:</span>
                <span className="bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] px-2 py-0.5 rounded font-bold text-xs">
                  To Pay / Billed
                </span>
              </div>
            </div>

            {/* Section 4: Cargo & Load Specifications */}
            <div className="rounded-2xl border border-[#DBEAFE] overflow-hidden bg-white shadow-2xs">
              {/* Header Banner */}
              <div className="bg-[#EFF6FF] px-4 py-2.5 flex items-center gap-2.5 border-b border-[#DBEAFE]">
                <div className="w-6 h-6 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Package className="w-3.5 h-3.5 text-[#1D4ED8]" />
                </div>
                <div className="text-xs font-extrabold tracking-wider text-[#1E3A8A] uppercase">
                  Cargo & Load Specifications
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3.5">
                {/* Cargo Description */}
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Commodity / Cargo Description</span>
                  </div>
                  <div className="border border-slate-200 bg-white rounded-xl p-3 text-slate-900 font-bold text-sm sm:text-base leading-snug">
                    {job.cargo_description || ""}
                  </div>
                </div>

                {/* Estimated Weight & Total Packages Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Weight */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white relative flex flex-col justify-between">
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Weight className="w-4 h-4 text-slate-700" />
                      <span>Estimated Weight</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1.5">
                      {job.estimated_weight_mt !== null && job.estimated_weight_mt !== undefined && String(job.estimated_weight_mt).trim() !== ""
                        ? `${parseFloat(String(job.estimated_weight_mt)).toFixed(2)} MT`
                        : "0.00 MT"}
                    </div>
                    <span className="absolute right-3.5 bottom-3.5 bg-[#F1F5F9] text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-xs font-mono font-bold">
                      MT
                    </span>
                  </div>

                  {/* Packages */}
                  <div className="border border-slate-200 rounded-xl p-3.5 bg-white relative flex flex-col justify-between">
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-indigo-700" />
                      <span>Total Packages</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-1.5">
                      {job.estimated_packages !== null && job.estimated_packages !== undefined
                        ? `${job.estimated_packages} pkgs`
                        : "0 pkgs"}
                    </div>
                    <span className="absolute right-3.5 bottom-3.5 bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] px-2 py-0.5 rounded text-xs font-mono font-bold">
                      PKGS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Signature & Authorization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-0.5">
              {/* Officer Authorization */}
              <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                  <PenTool className="w-4 h-4" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="italic text-xs font-medium text-slate-500">
                    Digitally Authorized
                  </div>
                  <div className="w-full border-b border-dashed border-slate-300 my-1.5" />
                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                    Booking Dispatch Officer
                  </div>
                </div>
              </div>

              {/* Carrier / Driver Acknowledgment */}
              <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center shrink-0">
                  <FileSignature className="w-4 h-4" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="italic text-xs font-medium text-slate-500">
                    Signature & Seal
                  </div>
                  <div className="w-full border-b border-dashed border-slate-300 my-1.5" />
                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                    Carrier / Driver Acknowledgment
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between no-print">
          <div className="text-xs text-slate-500">
            Status: <span className="font-semibold text-slate-800">{job.status}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs cursor-pointer"
            >
              Close
            </Button>
            {job.status === "OPEN" && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer"
              >
                Proceed to Book GR/LR
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
