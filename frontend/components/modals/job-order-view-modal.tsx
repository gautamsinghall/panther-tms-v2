"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Pencil,
  Truck,
  ArrowRight,
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
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
      } else {
        let position = margin;
        let heightLeft = contentHeight;
        pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
        heightLeft -= (pdfHeight - margin * 2);

        while (heightLeft > 0) {
          position = heightLeft - contentHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position, contentWidth, contentHeight);
          heightLeft -= (pdfHeight - margin * 2);
        }
      }

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
            margin: 8mm;
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
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
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
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
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
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
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
              className="text-xs font-medium h-8 gap-1.5 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 shadow-2xs"
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
                className="text-xs font-medium h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
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

        {/* Modal Printable Body - EXACT MATCH TO REFERENCE IMAGE */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#F8FAFC]/30">
          <div
            id="job-order-printable-document"
            ref={printRef}
            className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4 max-w-2xl mx-auto print:border-none print:shadow-none print:p-0"
          >
            {/* Header: Company Profile & Job Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
              {/* Left: Square logo + Company Name + Subtitle */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#0c1427] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-2xs select-none">
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
                  <span className="font-mono text-sm sm:text-base font-bold text-slate-900 bg-[#F1F5F9] px-3.5 py-1 rounded-lg border border-slate-200/90">
                    {job.job_number}
                  </span>
                  <span className="bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-2xs">
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
            <div className="rounded-2xl border border-slate-200/90 bg-[#F8FAFC]/50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Origin Hub */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]/60 text-[#10B981] flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
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
                <div className="flex-1 flex items-center justify-center px-1 sm:px-3 max-w-[140px]">
                  <div className="flex-1 border-t-2 border-dashed border-slate-300" />
                  <div className="mx-2 bg-[#334155] text-white p-2 rounded-xl flex flex-col items-center justify-center shadow-xs">
                    <Truck className="w-4 h-4" />
                    <ArrowRight className="w-2.5 h-2.5 text-white/90 -mt-0.5" />
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-slate-300 relative flex items-center justify-end">
                    <span className="text-slate-400 text-xs font-bold leading-none -mr-1">›</span>
                  </div>
                </div>

                {/* Destination Hub */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE]/60 text-[#4F46E5] flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
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
              <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Scheduled Dispatch Date</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1 font-mono font-bold text-slate-800 text-xs shadow-2xs">
                  {job.expected_dispatch_date || ""}
                </div>
              </div>
            </div>

            {/* Section 2: Consigner & Consignee 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Consigner Card */}
              <div className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white flex items-start gap-3.5 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#3B82F6] flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Consigner (Shipper)
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      ID #{job.consigner_id}
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 truncate">
                    {job.consigner_name || ""}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    Origin Dispatch Station: {job.origin_city || ""}
                  </div>
                </div>
              </div>

              {/* Consignee Card */}
              <div className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white flex items-start gap-3.5 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE]/60 text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Consignee (Receiver)
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      ID #{job.consignee_id}
                    </span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 truncate">
                    {job.consignee_name || ""}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    Destination Delivery Hub: {job.destination_city || ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Contracting Billing Client */}
            <div className="rounded-2xl border border-slate-200/90 p-4 sm:p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA]/60 text-[#F97316] flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Contracting Billing Client
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {job.billing_client_name || job.billing_party || ""}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl px-3.5 py-1.5 flex items-center gap-2.5 bg-white text-xs font-semibold text-slate-600 shadow-2xs self-start sm:self-center">
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Payment / Freight:</span>
                <span className="bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] px-2.5 py-0.5 rounded font-bold text-xs">
                  To Pay / Billed
                </span>
              </div>
            </div>

            {/* Section 4: Cargo & Load Specifications */}
            <div className="rounded-2xl border border-[#DBEAFE] overflow-hidden bg-white shadow-2xs">
              {/* Header Banner */}
              <div className="bg-[#EFF6FF] px-4 sm:px-5 py-3 flex items-center gap-2.5 border-b border-[#DBEAFE]">
                <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-[#1D4ED8]" />
                </div>
                <div className="text-xs sm:text-sm font-extrabold tracking-wider text-[#1E3A8A] uppercase">
                  Cargo & Load Specifications
                </div>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Cargo Description */}
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Commodity / Cargo Description</span>
                  </div>
                  <div className="border border-slate-200 bg-white rounded-xl p-3.5 text-slate-900 font-bold text-sm sm:text-base">
                    {job.cargo_description || ""}
                  </div>
                </div>

                {/* Estimated Weight & Total Packages Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Weight */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white relative flex flex-col justify-between">
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Weight className="w-4 h-4 text-slate-700" />
                      <span>Estimated Weight</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-2">
                      {job.estimated_weight_mt !== null && job.estimated_weight_mt !== undefined && String(job.estimated_weight_mt).trim() !== ""
                        ? `${parseFloat(String(job.estimated_weight_mt)).toFixed(2)} MT`
                        : "0.00 MT"}
                    </div>
                    <span className="absolute right-4 bottom-4 bg-[#F1F5F9] text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                      MT
                    </span>
                  </div>

                  {/* Packages */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white relative flex flex-col justify-between">
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-indigo-700" />
                      <span>Total Packages</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-2">
                      {job.estimated_packages !== null && job.estimated_packages !== undefined
                        ? `${job.estimated_packages} pkgs`
                        : "0 pkgs"}
                    </div>
                    <span className="absolute right-4 bottom-4 bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] px-2.5 py-0.5 rounded text-xs font-mono font-bold">
                      PKGS
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Signature & Authorization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Officer Authorization */}
              <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
                  <PenTool className="w-5 h-5" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="italic text-xs font-medium text-slate-500">
                    Digitally Authorized
                  </div>
                  <div className="w-full border-b border-dashed border-slate-300 my-2" />
                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                    Booking Dispatch Officer
                  </div>
                </div>
              </div>

              {/* Carrier / Driver Acknowledgment */}
              <div className="bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] flex items-center justify-center shrink-0">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="italic text-xs font-medium text-slate-500">
                    Signature & Seal
                  </div>
                  <div className="w-full border-b border-dashed border-slate-300 my-2" />
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
              className="text-xs"
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
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
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
