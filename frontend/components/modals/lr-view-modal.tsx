"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  FileText,
  Loader2,
  Building2,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export interface LRViewRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  issuing_office_id?: number;
  issuing_office_name?: string;
  issuing_office_code?: string;
  job_number?: string;
  consigner_id?: number;
  consigner_name?: string;
  consignee_id?: number;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  vehicle_source: string;
  vehicle_number: string;
  driver_name?: string;
  driver_phone?: string;
  eway_bill_number?: string;
  package_count: number;
  actual_weight_mt?: string | number;
  chargeable_weight_mt: string | number;
  freight_rate?: string | number;
  freight_amount?: string | number;
  loading_charges?: string | number;
  unloading_charges?: string | number;
  other_charges?: string | number;
  total_freight_amount: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  payment_terms?: string;
  particulars?: string;
  remarks?: string;
  created_at?: string;
  invoice_items?: {
    invoice_no?: string;
    invoice_date?: string;
    invoice_value?: string | number;
    eway_bill_number?: string;
    eway_bill_date?: string;
    eway_bill_expiry?: string;
    cha_job_number?: string;
    particulars?: string;
    remarks?: string;
  }[];
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

interface LRViewModalProps {
  isOpen: boolean;
  lr: LRViewRecord | null;
  onClose: () => void;
}

export function LRViewModal({ isOpen, lr, onClose }: LRViewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [company, setCompany] = useState<CompanySettingData | null>(null);
  const [issuingBranch, setIssuingBranch] = useState<BranchData | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<"Consignor" | "Consignee" | "Driver" | "Office">("Consignor");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadOfficeAndCompanyDetails() {
      if (!isOpen || !lr) return;
      try {
        const [compData, branchList] = await Promise.all([
          apiClient<CompanySettingData>("/api/v1/profile/company"),
          apiClient<BranchData[]>("/api/v1/profile/branches").catch(() => []),
        ]);

        if (compData) {
          setCompany(compData);
        }

        const validBranches = Array.isArray(branchList) ? branchList : [];
        if (validBranches.length > 0) {
          // 1. Exact match on LR issuing_office_id
          let selected = lr.issuing_office_id
            ? validBranches.find((b) => b.id === lr.issuing_office_id)
            : undefined;

          // 2. Match on issuing_office_code
          if (!selected && lr.issuing_office_code) {
            selected = validBranches.find((b) => b.code?.toUpperCase() === lr.issuing_office_code?.toUpperCase());
          }

          // 3. Match on issuing_office_name
          if (!selected && lr.issuing_office_name) {
            selected = validBranches.find((b) => b.name?.toLowerCase() === lr.issuing_office_name?.toLowerCase());
          }

          // 4. Fallback to Head Office or first branch
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

    loadOfficeAndCompanyDetails();
  }, [isOpen, lr]);

  if (!isOpen || !mounted || !lr) return null;

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
      });

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
      pdf.save(`LR_${lr.lr_number}.pdf`);
    } catch (err) {
      console.error("Failed to generate LR PDF:", err);
      alert("Failed to export LR PDF. You can also use the browser Print dialog.");
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
  const companyName = company?.company_name?.trim() || auth?.tenantName || "PANTHER LOGISTICS";
  const officeName = issuingBranch?.name?.trim() || lr.issuing_office_name || "Head Office";
  const officeCode = issuingBranch?.code?.trim() || lr.issuing_office_code || "";
  const officeAddress = issuingBranch?.address?.trim() || company?.address?.trim() || "Corporate Branch Office";
  const officeCity = issuingBranch?.city?.trim() || company?.city?.trim() || "DELHI";
  const officeState = issuingBranch?.state?.trim() || company?.state?.trim() || "DELHI";
  const officePincode = issuingBranch?.pincode?.trim() || company?.pincode?.trim() || "";
  const officePhone = issuingBranch?.phone?.trim() || company?.phone?.trim() || "—";
  const officeEmail = issuingBranch?.email?.trim() || company?.email?.trim() || "—";
  const officeGstin = issuingBranch?.gstin?.trim() || company?.gstin?.trim() || "—";
  const officePan = company?.pan?.trim() || issuingBranch?.pan?.trim() || "—";
  const jurisdictionText = issuingBranch?.document_notes?.trim() || `Subject to ${officeCity} Jurisdiction only`;

  const modalNode = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:absolute print:inset-0">
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
          #lr-printable-document,
          #lr-printable-document * {
            visibility: visible;
          }
          #lr-printable-document {
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
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              LR / Consignment Note
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-sm font-bold text-blue-700">
              {lr.lr_number}
            </span>
            {officeCode && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                {officeCode} - {officeName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Selector */}
            <div className="flex bg-slate-200 rounded-lg p-0.5 text-xs font-semibold">
              {(["Consignor", "Consignee", "Driver", "Office"] as const).map((copy) => (
                <button
                  key={copy}
                  type="button"
                  onClick={() => setSelectedCopy(copy)}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedCopy === copy
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {copy}
                </button>
              ))}
            </div>

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

        {/* Modal Printable Body - Clean A4 Goods Receipt / Consignment Note */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            id="lr-printable-document"
            ref={printRef}
            className="w-full max-w-[780px] bg-white border-2 border-black text-black font-sans select-text shadow-sm"
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {/* 1. Header: Branding + Company Master + Branch Issuing Office */}
            <div className="flex items-center justify-between p-3.5 border-b-2 border-black gap-2">
              {/* Left: Logo */}
              <div className="w-[28%] flex flex-col items-center justify-center shrink-0">
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={companyName}
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
                <div className="text-sm sm:text-base font-black text-red-600 uppercase tracking-wide leading-tight">
                  {companyName}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight mt-1">
                  {officeAddress}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight">
                  {officeCity}, {officeState} {officePincode ? `- ${officePincode}` : ""}
                </div>
                <div className="text-[11px] text-black font-medium leading-tight">
                  Phone: {officePhone} | Email: {officeEmail}
                </div>
                <div className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wider mt-0.5">
                  Goods Consignment Note / Lorry Receipt
                </div>
              </div>

              {/* Right: Issuing Office details from Branch Master */}
              <div className="w-[28%] text-right text-[11px] text-black leading-snug space-y-0.5 pr-1">
                <div className="bg-slate-100 p-1.5 rounded border border-slate-300 mb-1 text-left">
                  <div className="text-[9.5px] font-semibold text-slate-500 uppercase">Issuing Office:</div>
                  <div className="font-bold text-xs text-slate-900">{officeName} {officeCode ? `(${officeCode})` : ""}</div>
                </div>
                <div>
                  <span className="font-normal">GST No: </span>
                  <span className="font-semibold font-mono">{officeGstin}</span>
                </div>
                <div>
                  <span className="font-normal">PAN No: </span>
                  <span className="font-semibold font-mono">{officePan}</span>
                </div>
              </div>
            </div>

            {/* 2. Key Document Identifiers */}
            <div className="grid grid-cols-4 border-b border-black text-[11px] bg-slate-50 divide-x divide-black">
              <div className="p-1.5 pl-3">
                <span className="text-slate-500 block text-[9.5px]">LR / GR NUMBER:</span>
                <span className="font-mono font-bold text-xs text-black">{lr.lr_number}</span>
              </div>
              <div className="p-1.5 pl-3">
                <span className="text-slate-500 block text-[9.5px]">BOOKING DATE:</span>
                <span className="font-mono font-semibold text-xs text-black">{formatDateDMY(lr.lr_date)}</span>
              </div>
              <div className="p-1.5 pl-3">
                <span className="text-slate-500 block text-[9.5px]">TRIP JOB ORDER:</span>
                <span className="font-mono font-semibold text-xs text-black">{lr.job_number || "DIRECT BOOKING"}</span>
              </div>
              <div className="p-1.5 pl-3 bg-amber-50">
                <span className="text-slate-500 block text-[9.5px]">DOCUMENT COPY:</span>
                <span className="font-bold text-xs text-amber-900 uppercase">{selectedCopy} Copy</span>
              </div>
            </div>

            {/* 3. Route corridor */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-black text-[11px]">
              <div>
                <span className="font-normal text-slate-500">Origin Station: </span>
                <span className="font-bold text-xs">{lr.origin_city || "—"}</span>
              </div>
              <div className="font-bold text-slate-400">➔</div>
              <div>
                <span className="font-normal text-slate-500">Destination Station: </span>
                <span className="font-bold text-xs">{lr.destination_city || "—"}</span>
              </div>
              <div>
                <span className="font-normal text-slate-500">E-Way Bill: </span>
                <span className="font-bold font-mono text-xs">{lr.eway_bill_number || "NOT APPLICABLE"}</span>
              </div>
            </div>

            {/* 4. Consignor and Consignee Row */}
            <div className="flex border-b border-black">
              {/* Consignor */}
              <div className="w-1/2 p-2.5 border-r border-black">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Consignor (Shipper)</span>
                <div className="font-bold text-[12px] text-black leading-tight">
                  {lr.consigner_name || "Direct Shipper"}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Place of Booking: {lr.origin_city || officeCity}
                </div>
              </div>

              {/* Consignee */}
              <div className="w-1/2 p-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Consignee (Receiver)</span>
                <div className="font-bold text-[12px] text-black leading-tight">
                  {lr.consignee_name || "Direct Receiver"}
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Delivery Destination: {lr.destination_city || "As per order"}
                </div>
              </div>
            </div>

            {/* 5. Assigned Vehicle & Driver */}
            <div className="grid grid-cols-3 border-b border-black text-[11px] divide-x divide-black">
              <div className="p-2">
                <span className="text-slate-500 block text-[9.5px]">VEHICLE NUMBER:</span>
                <span className="font-mono font-bold text-xs text-black">{lr.vehicle_number}</span>
                <span className="text-[10px] text-slate-500 ml-1.5">({lr.vehicle_source})</span>
              </div>
              <div className="p-2">
                <span className="text-slate-500 block text-[9.5px]">DRIVER NAME:</span>
                <span className="font-semibold text-xs text-black">{lr.driver_name || "Assigned Driver"}</span>
              </div>
              <div className="p-2">
                <span className="text-slate-500 block text-[9.5px]">DRIVER CONTACT:</span>
                <span className="font-mono font-semibold text-xs text-black">{lr.driver_phone || "—"}</span>
              </div>
            </div>

            {/* 6. Cargo Particulars & Weight */}
            <table className="w-full border-b border-black text-[11px] text-left">
              <thead>
                <tr className="bg-slate-100 border-b border-black">
                  <th className="p-1.5 pl-3 border-r border-black font-semibold text-center w-16">Packages</th>
                  <th className="p-1.5 pl-3 border-r border-black font-semibold">Description of Goods</th>
                  <th className="p-1.5 pl-3 border-r border-black font-semibold text-right w-28">Actual Wt (MT)</th>
                  <th className="p-1.5 pl-3 font-semibold text-right w-32">Chargeable Wt (MT)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="min-h-[45px]">
                  <td className="p-2 border-r border-black text-center font-mono font-bold">
                    {lr.package_count !== undefined && lr.package_count !== null ? lr.package_count : 0}
                  </td>
                  <td className="p-2 border-r border-black">
                    <span className="font-medium text-slate-900">
                      {lr.particulars || "Commercial Cargo Freight Consignment"}
                    </span>
                    {lr.remarks && <div className="text-[10px] text-slate-500 mt-0.5">Note: {lr.remarks}</div>}
                  </td>
                  <td className="p-2 border-r border-black text-right font-mono">
                    {lr.actual_weight_mt !== undefined && lr.actual_weight_mt !== null && String(lr.actual_weight_mt).trim() !== ""
                      ? lr.actual_weight_mt
                      : (lr.chargeable_weight_mt || 0)}{" "}
                    MT
                  </td>
                  <td className="p-2 text-right font-mono font-bold">
                    {lr.chargeable_weight_mt || 0} MT
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 6b. Invoices & E-Way Bills Compliance Table */}
            {Boolean((lr.invoice_items && lr.invoice_items.length > 0) || lr.eway_bill_number) && (
              <div className="border-b border-black">
                <div className="bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-black">
                  Invoices & E-Way Bills Compliance
                </div>
                <table className="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black font-semibold text-slate-800 divide-x divide-black bg-slate-50">
                      <th className="p-1 text-center w-8">#</th>
                      <th className="p-1 pl-2">Invoice No & Date</th>
                      <th className="p-1 pl-2 text-right">Invoice Value</th>
                      <th className="p-1 pl-2">E-Way Bill No.</th>
                      <th className="p-1 pl-2">EWB Expiry</th>
                      <th className="p-1 pl-2">Particulars / Commodity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {lr.invoice_items && lr.invoice_items.length > 0 ? (
                      lr.invoice_items.map((it: any, i: number) => (
                        <tr key={i} className="divide-x divide-black">
                          <td className="p-1 text-center font-mono">{i + 1}</td>
                          <td className="p-1 pl-2 font-medium">{it.invoice_no || "—"} {it.invoice_date ? `(${it.invoice_date})` : ""}</td>
                          <td className="p-1 pl-2 text-right font-mono font-medium">{it.invoice_value ? formatCurrency(parseFloat(it.invoice_value)) : "—"}</td>
                          <td className="p-1 pl-2 font-mono">{it.eway_bill_number || "—"}</td>
                          <td className="p-1 pl-2">{it.eway_bill_expiry || "—"}</td>
                          <td className="p-1 pl-2 text-slate-700">{it.particulars || it.remarks || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="divide-x divide-black">
                        <td className="p-1 text-center font-mono">1</td>
                        <td className="p-1 pl-2 font-medium">—</td>
                        <td className="p-1 pl-2 text-right font-mono">—</td>
                        <td className="p-1 pl-2 font-mono">{lr.eway_bill_number || "—"}</td>
                        <td className="p-1 pl-2">—</td>
                        <td className="p-1 pl-2 text-slate-700">—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. Financial Breakdown & Payment Terms */}
            <div className="flex border-b border-black text-[11px]">
              {/* Left: Bank Details from Issuing Office Master */}
              <div className="w-[55%] p-2.5 border-r border-black flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Branch Bank Account Details (For Remittance)
                  </div>
                  {issuingBranch?.bank_name ? (
                    <div className="text-[10.5px] space-y-0.5 text-slate-800">
                      <div><span className="text-slate-500">Bank:</span> <span className="font-semibold">{issuingBranch.bank_name}</span></div>
                      <div><span className="text-slate-500">A/C No:</span> <span className="font-mono font-bold">{issuingBranch.bank_account_no}</span></div>
                      <div><span className="text-slate-500">IFSC Code:</span> <span className="font-mono font-bold">{issuingBranch.bank_ifsc}</span></div>
                      {issuingBranch.bank_branch && <div><span className="text-slate-500">Branch:</span> {issuingBranch.bank_branch}</div>}
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-slate-500 italic">
                      Remit to Head Office corporate accounts or consult issuing office counter.
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Payment Terms: </span>
                  <span className="font-bold text-xs uppercase px-1.5 py-0.5 bg-slate-200 rounded">
                    {lr.payment_terms || "TO_PAY"}
                  </span>
                </div>
              </div>

              {/* Right: Freight Summary */}
              <div className="w-[45%] p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Basic Freight:</span>
                  <span className="font-mono font-medium">{formatCurrency(lr.freight_amount || lr.total_freight_amount)}</span>
                </div>
                {Number(lr.loading_charges || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Loading Charges:</span>
                    <span className="font-mono">{formatCurrency(lr.loading_charges)}</span>
                  </div>
                )}
                {Number(lr.unloading_charges || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Unloading Charges:</span>
                    <span className="font-mono">{formatCurrency(lr.unloading_charges)}</span>
                  </div>
                )}
                {Number(lr.other_charges || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Charges:</span>
                    <span className="font-mono">{formatCurrency(lr.other_charges)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-black pt-1 font-bold">
                  <span>Total Freight:</span>
                  <span className="font-mono text-xs">{formatCurrency(lr.total_freight_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Advance Received:</span>
                  <span className="font-mono">{formatCurrency(lr.advance_amount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-0.5 font-bold text-red-700">
                  <span>Balance Payable:</span>
                  <span className="font-mono text-xs">{formatCurrency(lr.balance_amount)}</span>
                </div>
              </div>
            </div>

            {/* 8. Terms, Jurisdiction & Signature */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-black text-[11px]">
              <div className="w-1/3 text-left text-[10px] text-black font-normal">
                <div>{jurisdictionText}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Goods booked at owner&apos;s risk unless insured.</div>
              </div>
              <div className="w-1/3 text-center">
                <div className="text-[10px] font-bold tracking-wider text-black uppercase">
                  AT OWNER&apos;S RISK
                </div>
                <div className="text-[11px] font-bold text-black mt-0.5">
                  {selectedCopy} Copy
                </div>
              </div>
              <div className="w-1/3 text-right">
                {company?.signature_url && (
                  <div className="flex justify-end mb-1">
                    <img
                      src={company.signature_url}
                      alt="Signing Authority"
                      className="h-8 max-w-[110px] object-contain"
                    />
                  </div>
                )}
                <div className="text-[9.5px] text-gray-700 font-medium">
                  {company?.signing_authority_name || "Authorized Signatory"}
                  {company?.signing_authority_designation ? ` (${company.signing_authority_designation})` : ""}
                </div>
                <div className="text-[10.5px] font-bold text-black uppercase mt-0.5">
                  For {companyName}
                </div>
              </div>
            </div>

            {/* 9. Bottom Footer Bar */}
            <div className="bg-black text-white text-center py-1.5 px-3 text-[10px] sm:text-[11px] font-medium tracking-wide">
              This Lorry Receipt / Goods Consignment Note is electronically generated from {officeName}.
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print">
          <div className="text-xs text-slate-500">
            Issuing Office: <span className="font-semibold text-slate-800">{officeName}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
