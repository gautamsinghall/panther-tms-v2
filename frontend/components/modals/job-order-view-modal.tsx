"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Pencil,
  Truck,
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
  consigner_code?: string;
  consignee_name?: string;
  consignee_code?: string;
  origin_city?: string;
  destination_city?: string;
  expected_dispatch_date?: string;
  cargo_description?: string;
  estimated_weight_mt?: string | number;
  estimated_packages?: number;
  status: string;
  special_instructions?: string;
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
        if (data && (data.company_name || data.gstin || data.address)) {
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
            el.style.width = "780px";
            el.style.maxWidth = "780px";
            el.style.margin = "0 auto";
            el.style.boxShadow = "none";
            el.style.overflow = "visible";
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
      const margin = 8;
      const maxW = pdfWidth - margin * 2; // 194mm
      const maxH = pdfHeight - margin * 2; // 281mm

      // Ensure the entire document fits within EXACTLY 1 page
      const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
      const renderWidth = canvas.width * scale;
      const renderHeight = canvas.height * scale;

      const posX = (pdfWidth - renderWidth) / 2;
      const posY = margin;

      pdf.addImage(imgData, "PNG", posX, posY, renderWidth, renderHeight, undefined, "FAST");
      pdf.save(`Trip_Order_${job.job_number}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const formatDateDMY = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const trimmed = dateStr.trim();
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;

      const datePart = trimmed.split("T")[0];
      const ymdMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ymdMatch) {
        return `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`;
      }

      const d = new Date(trimmed);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  const auth = getStoredAuth();
  const companyName = company?.company_name?.trim() || auth?.tenantName || "DEMO PRIVATE LIMITED";
  const companyAddress = company?.address?.trim() || "Plot No XYZ, ABC Area";
  const companyCity = company?.city?.trim() || "DELHI";
  const companyState = company?.state?.trim() || "DELHI";
  const companyPincode = company?.pincode?.trim() || "123456";
  const companyPhone = company?.phone?.trim() || "1234567890";
  const companyEmail = company?.email?.trim() || "demo@panthertms.com";
  const companyGstin = company?.gstin?.trim() || "07ABCDE1234A1ZP";
  const companyPan = company?.pan?.trim() || "ABCDE1234A";

  const modalNode = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:absolute print:inset-0">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
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
            padding: 0 !important;
            box-shadow: none !important;
            border: 1.5px solid black !important;
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
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trip Order Voucher
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
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs font-medium h-8 gap-1.5 shadow-xs cursor-pointer"
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

        {/* Modal Printable Body - EXACT 1-PAGE VOUCHER FORMAT */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            id="job-order-printable-document"
            ref={printRef}
            className="w-full max-w-[780px] bg-white border-2 border-black text-black font-sans select-text shadow-sm"
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {/* 1. Header: Logo (Left), Dynamic Company Info (Center), Issuing Office/Tax (Right) */}
            <div className="flex items-center justify-between p-3.5 border-b-2 border-black gap-2">
              {/* Left: Panther Logo & Brand Name */}
              <div className="w-[28%] flex flex-col items-center justify-center shrink-0">
                <img
                  src="/panther-logo-transparent.png"
                  alt="Panther Logo"
                  className="h-10 sm:h-12 w-auto object-contain mx-auto"
                />
                <div className="text-[10px] sm:text-[11px] font-black text-[#0f2147] tracking-wider leading-tight text-center mt-1">
                  PANTHER
                </div>
                <div className="text-[9px] sm:text-[10px] font-black text-[#0f2147] tracking-wide text-center leading-tight">
                  DIGITAL SOLUTIONS
                </div>
                <div className="text-[7.5px] sm:text-[8px] font-bold text-[#0f2147] tracking-widest text-center leading-tight">
                  PRIVATE LIMITED
                </div>
              </div>

              {/* Middle: Company Details (Fetched dynamically from company settings) */}
              <div className="w-[44%] text-center px-1">
                <div className="text-sm sm:text-base font-black text-red-600 uppercase tracking-wide leading-tight">
                  {companyName}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight mt-1">
                  {companyAddress}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight">
                  {companyCity} {companyState} {companyPincode}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight">
                  Phone: {companyPhone}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight">
                  Email: {companyEmail}
                </div>
              </div>

              {/* Right: Issuing Office, GST No, PAN No */}
              <div className="w-[28%] text-right text-[11px] text-black leading-snug space-y-1 pr-1">
                <div>
                  <span className="font-normal">Issuing Office: </span>
                  <span className="font-semibold">Head Office {companyCity}</span>
                </div>
                <div>
                  <span className="font-normal">GST No: </span>
                  <span className="font-semibold font-mono">{companyGstin}</span>
                </div>
                <div>
                  <span className="font-normal">PAN No: </span>
                  <span className="font-semibold font-mono">{companyPan}</span>
                </div>
              </div>
            </div>

            {/* 2. Route corridor and Date Row */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-black text-[11px]">
              <div>
                <span className="font-normal">From: </span>
                <span className="font-semibold">{job.origin_city || "Ghaziabad, General"}</span>
              </div>
              <div>
                <span className="font-normal">To: </span>
                <span className="font-semibold">{job.destination_city || "Faridabad, General"}</span>
              </div>
              <div>
                <span className="font-normal">Date: </span>
                <span className="font-semibold font-mono">
                  {formatDateDMY(job.job_date || job.created_at)}
                </span>
              </div>
            </div>

            {/* 3. Consignor and Consignee Row */}
            <div className="flex border-b border-black">
              {/* Consignor */}
              <div className="w-1/2 p-2.5 border-r border-black flex">
                <span className="text-[11px] font-medium text-black w-20 shrink-0">Consignor:</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[12px] text-black font-mono leading-tight">
                    {job.consigner_code || (job.consigner_id ? `DL01AB0999` : job.consigner_name || "-")}
                  </div>
                  <div className="text-[11px] font-normal text-black mt-0.5 leading-tight">
                    {job.consigner_name || ""}
                  </div>
                </div>
              </div>

              {/* Consignee */}
              <div className="w-1/2 p-2.5 flex">
                <span className="text-[11px] font-medium text-black w-20 shrink-0">Consignee:</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[12px] text-black leading-tight">
                    {job.consignee_name || "Assigned"}
                  </div>
                  {job.consignee_code && (
                    <div className="text-[11px] font-mono text-gray-700 mt-0.5 leading-tight">
                      {job.consignee_code}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Job No and Scheduled Dispatch Date Row */}
            <div className="flex border-b border-black text-[11px]">
              <div className="w-1/2 px-3 py-1.5 border-r border-black flex items-baseline gap-2">
                <span className="font-normal text-black">Job No:</span>
                <span className="font-bold text-black font-mono">{job.job_number}</span>
              </div>
              <div className="w-1/2 px-3 py-1.5 flex items-baseline gap-2">
                <span className="font-normal text-black">Scheduled Dispatch Date:</span>
                <span className="font-bold text-black font-mono">
                  {formatDateDMY(job.expected_dispatch_date || job.job_date)}
                </span>
              </div>
            </div>

            {/* 5. Table Header */}
            <div className="flex border-b border-black text-[11px] font-bold text-black text-center bg-white">
              <div className="w-[18%] py-1.5 px-2 border-r border-black">
                No. of Packages
              </div>
              <div className="w-[44%] py-1.5 px-2 border-r border-black">
                Particulars (Cargo Description)
              </div>
              <div className="w-[20%] py-1.5 px-2 border-r border-black">
                Estimated Weight
              </div>
              <div className="w-[18%] py-1.5 px-2">
                Remarks
              </div>
            </div>

            {/* 5b. Table Data Row (Single-page proportioned height) */}
            <div className="flex border-b border-black min-h-[220px]">
              <div className="w-[18%] p-3 border-r border-black text-center text-[12px] font-medium text-black">
                {job.estimated_packages !== null && job.estimated_packages !== undefined
                  ? job.estimated_packages
                  : 0}
              </div>
              <div className="w-[44%] p-3 border-r border-black text-left text-[12px] font-medium text-black break-words">
                {job.cargo_description || "-"}
              </div>
              <div className="w-[20%] p-3 border-r border-black text-center text-[12px] font-medium text-black font-mono">
                {job.estimated_weight_mt !== null &&
                job.estimated_weight_mt !== undefined &&
                String(job.estimated_weight_mt).trim() !== ""
                  ? parseFloat(String(job.estimated_weight_mt)).toFixed(3)
                  : "0.000"}
              </div>
              <div className="w-[18%] p-3 text-center text-[11px] font-medium text-black">
                {job.status === "OPEN" ? "" : job.status}
              </div>
            </div>

            {/* 6. Special Instructions & Billing Party Row */}
            <div className="flex border-b border-black min-h-[55px]">
              <div className="w-[62%] p-2.5 border-r border-black text-[11px]">
                <div className="font-normal text-black">Special Instructions:</div>
                <div className="text-[11px] font-normal text-black mt-1 break-words">
                  {job.special_instructions || ""}
                </div>
              </div>
              <div className="w-[38%] p-2.5 text-[11px]">
                <div className="font-normal text-black">Billing Party:</div>
                <div className="text-[11px] font-bold text-black mt-0.5 break-words">
                  {job.billing_client_name || job.billing_party || "Global Foods"}
                </div>
              </div>
            </div>

            {/* 7. Jurisdiction, At Owner's Risk, Company Name */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-black text-[11px]">
              <div className="w-1/3 text-left text-[10px] text-black font-normal">
                Subject to {companyCity} Jurisdiction only
              </div>
              <div className="w-1/3 text-center">
                <div className="text-[10px] font-bold tracking-wider text-black uppercase">
                  AT OWNER&apos;S RISK
                </div>
                <div className="text-[11px] font-bold text-black mt-0.5">
                  Consignor Copy
                </div>
              </div>
              <div className="w-1/3 text-right text-[11px] font-bold text-black uppercase">
                {companyName}
              </div>
            </div>

            {/* 8. Bottom Black Warning Bar */}
            <div className="bg-black text-white text-center py-1.5 px-3 text-[10px] sm:text-[11px] font-medium tracking-wide">
              This LR is computer generated, hence no need to signature and stamp.
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print">
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
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs font-medium cursor-pointer"
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
