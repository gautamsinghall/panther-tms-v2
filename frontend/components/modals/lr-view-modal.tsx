"use client";
import { toast } from "@/lib/toast";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Printer,
  Download,
  FileText,
  Loader2,
  Building2,
  Phone,
  Mail,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice } from "@/lib/auth";
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
  onEdit?: (lr: LRViewRecord) => void;
}

export function LRViewModal({ isOpen, lr, onClose, onEdit }: LRViewModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [company, setCompany] = useState<CompanySettingData | null>(null);
  const [issuingBranch, setIssuingBranch] = useState<BranchData | null>(null);
  const [selectedCopy, setSelectedCopy] = useState<"Consignor" | "Consignee" | "Driver" | "Office">("Consignor");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingAllPdf, setIsDownloadingAllPdf] = useState(false);
  const [printMode, setPrintMode] = useState<"single" | "all">("single");
  const printRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintMode("single");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("afterprint", handleAfterPrint);
    };
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

          // 2. Exact match on LR issuing_office_id
          if (!selected && lr.issuing_office_id) {
            selected = validBranches.find((b) => b.id === lr.issuing_office_id);
          }

          // 3. Match on issuing_office_code
          if (!selected && lr.issuing_office_code) {
            selected = validBranches.find((b) => b.code?.toUpperCase() === lr.issuing_office_code?.toUpperCase());
          }

          // 4. Match on issuing_office_name
          if (!selected && lr.issuing_office_name) {
            selected = validBranches.find((b) => b.name?.toLowerCase() === lr.issuing_office_name?.toLowerCase());
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

    loadOfficeAndCompanyDetails();
  }, [isOpen, lr]);

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

  if (!isOpen || !mounted || !lr) return null;

  const handlePrint = () => {
    setPrintMode("single");
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const handlePrintAll = () => {
    setPrintMode("all");
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    setTimeout(() => {
      window.print();
    }, 50);
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
          const el = clonedDoc.getElementById("lr-printable-document");
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
      pdf.save(`LR_${lr.lr_number}_${selectedCopy}_Copy.pdf`);
      toast.success(`LR ${lr.lr_number} (${selectedCopy} Copy) PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate LR PDF:", err);
      toast.error("Failed to export LR PDF. You can also use the browser Print dialog.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDownloadAllPdf = async () => {
    setIsDownloadingAllPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

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

      const copies = ["Consignor", "Consignee", "Driver", "Office"] as const;
      let addedPages = 0;

      for (let i = 0; i < copies.length; i++) {
        const copyName = copies[i];
        const elementId = `lr-printable-document-${copyName.toLowerCase()}`;
        const element = document.getElementById(elementId);
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2.5,
          useCORS: true,
          allowTaint: false,
          logging: false,
          backgroundColor: "#ffffff",
          scrollY: 0,
          scrollX: 0,
          onclone: (clonedDoc) => {
            const wrapper = clonedDoc.getElementById("lr-all-copies-wrapper");
            if (wrapper) {
              wrapper.style.position = "static";
              wrapper.style.left = "auto";
              wrapper.style.top = "auto";
              wrapper.style.opacity = "1";
              wrapper.style.display = "block";
              wrapper.style.width = "780px";
              wrapper.style.height = "auto";
              wrapper.style.overflow = "visible";
            }
            const el = clonedDoc.getElementById(elementId);
            if (el) {
              el.style.width = "780px";
              el.style.maxWidth = "780px";
              el.style.margin = "0 auto";
              el.style.boxShadow = "none";
              el.style.overflow = "visible";
              el.style.display = "block";
              el.style.visibility = "visible";
              el.style.opacity = "1";
            }
          },
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

        let renderWidth = maxW;
        let renderHeight = (canvas.height * renderWidth) / canvas.width;

        if (renderHeight > maxH) {
          renderHeight = maxH;
          renderWidth = (canvas.width * renderHeight) / canvas.height;
        }

        const posX = (pdfWidth - renderWidth) / 2;
        const posY = margin;
        const imgData = canvas.toDataURL("image/png");

        if (addedPages > 0) {
          pdf.addPage("a4", "portrait");
        }
        pdf.addImage(imgData, "PNG", posX, posY, renderWidth, renderHeight, undefined, "FAST");
        addedPages++;
      }

      if (addedPages === 0) {
        throw new Error("No copies rendered");
      }

      pdf.save(`LR_${lr.lr_number}_All_Copies.pdf`);
      toast.success(`LR ${lr.lr_number} (All 4 Copies) PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate LR all copies PDF:", err);
      toast.error("Failed to export all copies PDF. You can also use Print All.");
    } finally {
      setIsDownloadingAllPdf(false);
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

  const formatWeight = (val: string | number) => {
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
    if (isNaN(num)) return "0.000";
    return num.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const auth = getStoredAuth();
  const activeOffice = getActiveOffice();
  const companyName = company?.company_name?.trim() || auth?.tenantName || "PANTHER LOGISTICS";
  const officeName = issuingBranch?.name?.trim() || activeOffice?.name?.trim() || lr.issuing_office_name || "Head Office";
  const officeCode = issuingBranch?.code?.trim() || activeOffice?.code?.trim() || lr.issuing_office_code || "";
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

  const ALL_COPIES = ["Consignor", "Consignee", "Driver", "Office"] as const;

  const renderLRDocument = (
    copyType: "Consignor" | "Consignee" | "Driver" | "Office",
    isAllPage = false
  ) => {
    const docId = isAllPage
      ? `lr-printable-document-${copyType.toLowerCase()}`
      : "lr-printable-document";
    const docRef = !isAllPage ? printRef : undefined;

    return (
      <div
        key={copyType}
        id={docId}
        ref={docRef}
        className={`w-full max-w-[780px] bg-white border border-slate-300 text-slate-900 font-sans select-text shadow-sm ${
          isAllPage ? "lr-print-all-page mb-6 print:mb-0" : ""
        }`}
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* 1. Header: Branding + Company Master + Branch Issuing Office */}
        <div className="flex items-center justify-between p-2.5 sm:p-3 border-b border-slate-300 gap-2">
          {/* Left: Logo */}
          <div className="w-[28%] flex flex-col items-center justify-center shrink-0">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={companyName}
                crossOrigin="anonymous"
                className="max-h-12 max-w-full object-contain mx-auto"
              />
            ) : (
              <>
                <img
                  src="/panther-logo-transparent.png"
                  alt="Panther Logo"
                  className="h-8 sm:h-9 w-auto object-contain mx-auto"
                />
                <div className="text-[10px] sm:text-[11px] font-black text-[#0f2147] tracking-wider leading-tight text-center mt-0.5">
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
            <div className="text-[10px] sm:text-[10.5px] text-slate-600 font-normal leading-tight mt-0.5">
              {officeAddress}
            </div>
            <div className="text-[10px] sm:text-[10.5px] text-slate-600 font-normal leading-tight">
              {officeCity}, {officeState} {officePincode ? `- ${officePincode}` : ""}
            </div>
            <div className="text-[10px] sm:text-[10.5px] text-slate-600 font-normal leading-tight">
              Phone: {officePhone} | Email: {officeEmail}
            </div>
            <div className="text-[10.5px] sm:text-[11px] font-bold text-slate-900 uppercase tracking-wide mt-0.5">
              GOODS CONSIGNMENT NOTE / LORRY RECEIPT
            </div>
          </div>

          {/* Right: Issuing Office details from Branch Master */}
          <div className="w-[28%] text-right text-[10px] sm:text-[10.5px] text-slate-800 leading-snug space-y-0.5 pr-1">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">ISSUING OFFICE</div>
            <div className="font-bold text-xs text-slate-900">{officeName} {officeCode ? `(${officeCode})` : ""}</div>
            <div className="pt-0.5">
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
          <div className="py-1 px-3">
            <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">LR / GR NUMBER</span>
            <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">{lr.lr_number}</span>
          </div>
          <div className="py-1 px-3">
            <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">BOOKING DATE</span>
            <span className="font-mono font-semibold text-xs text-slate-900 block mt-0.5">{formatDateDMY(lr.lr_date)}</span>
          </div>
          <div className="py-1 px-3">
            <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">TRIP JOB ORDER</span>
            <span className="font-mono font-semibold text-xs text-slate-900 block mt-0.5">{lr.job_number || "DIRECT BOOKING"}</span>
          </div>
          <div className="py-1 px-3 bg-[#fef3c7]/60">
            <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">DOCUMENT COPY</span>
            <span className="font-bold text-xs text-amber-900 uppercase block mt-0.5">{copyType} COPY</span>
          </div>
        </div>

        {/* 3. Route corridor */}
        <div className="grid grid-cols-12 border-b border-slate-300 text-[11px] divide-x divide-slate-300">
          <div className="col-span-5 py-1 px-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">ORIGIN STATION</span>
            <div className="flex items-center justify-between mt-0.5 pr-2">
              <span className="font-bold text-xs text-slate-900">{lr.origin_city || "—"}</span>
              <span className="text-slate-400 font-bold">→</span>
            </div>
          </div>
          <div className="col-span-4 py-1 px-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">DESTINATION STATION</span>
            <span className="font-bold text-xs text-slate-900 block mt-0.5">{lr.destination_city || "—"}</span>
          </div>
          <div className="col-span-3 py-1 px-3 text-right pr-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">E-WAY BILL</span>
            <span className="font-bold font-mono text-xs text-slate-900 block mt-0.5">{lr.eway_bill_number || "NOT APPLICABLE"}</span>
          </div>
        </div>

        {/* 4. Consignor and Consignee Row */}
        <div className="grid grid-cols-2 border-b border-slate-300 text-[11px] divide-x divide-slate-300">
          <div className="bg-[#f8fafc] px-3 py-0.5 font-bold text-[9px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
            CONSIGNOR (SHIPPER)
          </div>
          <div className="bg-[#f8fafc] px-3 py-0.5 font-bold text-[9px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
            CONSIGNEE (RECEIVER)
          </div>
          <div className="py-1.5 px-3">
            <div className="font-bold text-sm text-slate-900">
              {lr.consigner_name || "Direct Shipper"}
            </div>
            <div className="text-[10.5px] text-slate-600 mt-1">
              Place of Booking: {lr.origin_city || officeCity}
            </div>
          </div>
          <div className="py-1.5 px-3">
            <div className="font-bold text-sm text-slate-900">
              {lr.consignee_name || "Direct Receiver"}
            </div>
            <div className="text-[10.5px] text-slate-600 mt-1">
              Delivery Destination: {lr.destination_city || "As per order"}
            </div>
          </div>
        </div>

        {/* 5. Assigned Vehicle & Driver */}
        <div className="grid grid-cols-12 border-b border-slate-300 text-[11px] divide-x divide-slate-300">
          <div className="col-span-4 py-1 px-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">VEHICLE NUMBER</span>
            <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
              {lr.vehicle_number} {lr.vehicle_source ? `(${lr.vehicle_source.toUpperCase()})` : ""}
            </span>
          </div>
          <div className="col-span-4 py-1 px-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">DRIVER NAME</span>
            <span className="font-bold text-xs text-slate-900 block mt-0.5">{lr.driver_name || "Assigned Driver"}</span>
          </div>
          <div className="col-span-4 py-1 px-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">DRIVER CONTACT</span>
            <span className="font-mono font-semibold text-xs text-slate-900 block mt-0.5">{lr.driver_phone || "—"}</span>
          </div>
        </div>

        {/* 6. Cargo Particulars & Weight */}
        <table className="w-full border-b border-slate-300 text-[11px] text-left">
          <thead>
            <tr className="bg-[#f1f5f9] border-b border-slate-300 text-[9px] font-bold uppercase tracking-wider text-slate-700">
              <th className="p-1.5 pl-3 border-r border-slate-300 text-center w-24">PACKAGES</th>
              <th className="p-1.5 pl-3 border-r border-slate-300">DESCRIPTION OF GOODS</th>
              <th className="p-1.5 pr-3 border-r border-slate-300 text-right w-36">ACTUAL WT (MT)</th>
              <th className="p-1.5 pr-3 text-right w-40">CHARGEABLE WT (MT)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="min-h-[36px]">
              <td className="py-1.5 px-2.5 border-r border-slate-300 text-center font-mono font-bold text-xs text-slate-900">
                {lr.package_count !== undefined && lr.package_count !== null ? lr.package_count : 0}
              </td>
              <td className="py-1.5 px-2.5 border-r border-slate-300">
                <span className="font-medium text-slate-900">
                  {lr.particulars || "Commercial Cargo Freight Consignment"}
                </span>
                {lr.remarks && <div className="text-[10px] text-slate-500 mt-0.5">Note: {lr.remarks}</div>}
              </td>
              <td className="py-1.5 px-2.5 border-r border-slate-300 text-right font-mono font-bold text-xs text-slate-900 pr-3">
                {formatWeight(
                  lr.actual_weight_mt !== undefined && lr.actual_weight_mt !== null && String(lr.actual_weight_mt).trim() !== ""
                    ? lr.actual_weight_mt
                    : lr.chargeable_weight_mt || 0
                )}{" "}
                MT
              </td>
              <td className="py-1.5 px-2.5 text-right font-mono font-bold text-xs text-slate-900 pr-3">
                {formatWeight(lr.chargeable_weight_mt || 0)} MT
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6b. Invoices & E-Way Bills Compliance Table (Only if invoice items exist) */}
        {Boolean(lr.invoice_items && lr.invoice_items.length > 0) && (
          <div className="border-b border-slate-300">
            <div className="bg-[#f1f5f9] px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300">
              INVOICES & E-WAY BILLS COMPLIANCE
            </div>
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 font-semibold text-slate-800 divide-x divide-slate-300 bg-slate-50">
                  <th className="p-1 text-center w-8">#</th>
                  <th className="p-1 pl-2">Invoice No & Date</th>
                  <th className="p-1 pl-2 text-right">Invoice Value</th>
                  <th className="p-1 pl-2">E-Way Bill No.</th>
                  <th className="p-1 pl-2">EWB Expiry</th>
                  <th className="p-1 pl-2 text-slate-700">Particulars / Commodity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lr.invoice_items!.map((it: any, i: number) => (
                  <tr key={i} className="divide-x divide-slate-200">
                    <td className="p-1 text-center font-mono">{i + 1}</td>
                    <td className="p-1 pl-2 font-medium">
                      {it.invoice_no || "—"} {it.invoice_date ? `(${it.invoice_date})` : ""}
                    </td>
                    <td className="p-1 pl-2 text-right font-mono font-medium">
                      {it.invoice_value ? formatCurrency(parseFloat(it.invoice_value)) : "—"}
                    </td>
                    <td className="p-1 pl-2 font-mono">{it.eway_bill_number || "—"}</td>
                    <td className="p-1 pl-2">{it.eway_bill_expiry || "—"}</td>
                    <td className="p-1 pl-2 text-slate-700">{it.particulars || it.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Financial Breakdown & Payment Terms */}
        <div className="flex border-b border-slate-300 text-[11px]">
          {/* Left: Bank Details from Issuing Office Master */}
          <div className="w-[58%] py-1.5 px-3 border-r border-slate-300 flex flex-col justify-between">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                BRANCH BANK ACCOUNT DETAILS (FOR REMITTANCE)
              </div>
              {issuingBranch?.bank_name ? (
                <div className="text-[10px] sm:text-[10.5px] space-y-0.5 text-slate-800">
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
                <div className="text-[10px] sm:text-[10.5px] text-slate-500 italic">
                  Remit to Head Office corporate accounts or consult issuing office counter.
                </div>
              )}
            </div>

            <div className="mt-2 pt-1 border-t border-slate-200">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-700">
                PAYMENT TERMS{" "}
              </span>
              <span className="font-bold text-xs uppercase text-slate-900 ml-1">
                {lr.payment_terms || "TO_PAY"}
              </span>
            </div>
          </div>

          {/* Right: Freight Summary */}
          <div className="w-[42%] divide-y divide-slate-200 text-[11px]">
            <div className="flex justify-between py-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                BASIC FREIGHT
              </span>
              <span className="font-mono font-semibold text-slate-900">
                {formatCurrency(lr.freight_amount || lr.total_freight_amount)}
              </span>
            </div>
            {Number(lr.loading_charges || 0) > 0 && (
              <div className="flex justify-between py-1 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  LOADING CHARGES
                </span>
                <span className="font-mono">{formatCurrency(lr.loading_charges)}</span>
              </div>
            )}
            {Number(lr.unloading_charges || 0) > 0 && (
              <div className="flex justify-between py-1 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  UNLOADING CHARGES
                </span>
                <span className="font-mono">{formatCurrency(lr.unloading_charges)}</span>
              </div>
            )}
            {Number(lr.other_charges || 0) > 0 && (
              <div className="flex justify-between py-1 px-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  OTHER CHARGES
                </span>
                <span className="font-mono">{formatCurrency(lr.other_charges)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 px-3 font-bold bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
                TOTAL FREIGHT
              </span>
              <span className="font-mono text-xs text-slate-900">
                {formatCurrency(lr.total_freight_amount)}
              </span>
            </div>
            <div className="flex justify-between py-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                ADVANCE RECEIVED
              </span>
              <span className="font-mono font-semibold text-slate-900">
                {formatCurrency(lr.advance_amount)}
              </span>
            </div>
            <div className="flex justify-between py-1 px-3 font-bold text-slate-900 bg-slate-50/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">
                BALANCE PAYABLE
              </span>
              <span className="font-mono text-xs text-slate-900">
                {formatCurrency(lr.balance_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* 8. Terms, Jurisdiction & Signature */}
        <div className="flex items-center justify-between py-1.5 px-3 border-b border-slate-300 text-[11px]">
          <div className="w-1/3 text-left text-[10px] text-slate-700 font-normal leading-relaxed">
            <div>{jurisdictionText}</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">
              Goods booked at owner&apos;s risk unless insured.
            </div>
          </div>
          <div className="w-1/3 text-center">
            <div className="text-[9.5px] font-bold tracking-wider text-slate-900 uppercase">
              AT OWNER&apos;S RISK
            </div>
            <div className="text-[11px] font-bold text-slate-900 mt-0.5 uppercase">
              {copyType} COPY
            </div>
          </div>
          <div className="w-1/3 text-right">
            {company?.signature_url && (
              <div className="flex justify-end mb-0.5">
                <img
                  src={company.signature_url}
                  alt="Signing Authority"
                  crossOrigin="anonymous"
                  className="h-7 max-w-[100px] object-contain"
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

        {/* 9. Bottom Footer Bar with Dynamic Issuing Office State */}
        <div className="bg-black text-white text-center py-1.5 px-3 text-[10px] sm:text-[11px] font-medium tracking-wide">
          This Lorry Receipt / Goods Consignment Note is electronically generated from {issuingOfficeState}.
        </div>
      </div>
    );
  };

  const modalNode = (
    <div
      className={`lr-modal-portal fixed inset-0 z-[85] flex items-center justify-center p-2 sm:p-3 overflow-y-auto print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto ${
        printMode === "all" ? "print-mode-all" : "print-mode-single"
      }`}
    >
      <div
        className="lr-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
      />

      {/* Print Style Injector for 1-page A4 output or 4-page All Copies output */}
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
          /* Completely hide the rest of the application outside the modal portal */
          body > *:not(.lr-modal-portal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .lr-modal-portal,
          .lr-modal-portal * {
            visibility: visible;
          }
          .no-print,
          .no-print *,
          .lr-modal-backdrop,
          .lr-modal-backdrop * {
            display: none !important;
            visibility: hidden !important;
          }
          .lr-modal-portal {
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
          .lr-modal-container {
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
          .lr-modal-body {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }

          /* Single copy print */
          .print-mode-single #lr-single-print-wrapper {
            display: block !important;
            width: 100% !important;
          }
          .print-mode-single #lr-all-copies-wrapper {
            display: none !important;
          }
          .print-mode-single #lr-printable-document {
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

          /* All copies print (4 separate pages) */
          .print-mode-all #lr-single-print-wrapper {
            display: none !important;
          }
          .print-mode-all #lr-all-copies-wrapper {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            visibility: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-mode-all .lr-print-all-page {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 1px solid #94a3b8 !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-mode-all .lr-print-all-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="lr-modal-container relative w-full max-w-4xl h-auto my-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-4 sm:px-6 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print flex-wrap gap-2">
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

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Copy Selector */}
            <div className="flex bg-slate-200 rounded-lg p-0.5 text-xs font-semibold">
              {ALL_COPIES.map((copy) => (
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

            {/* Print Current Copy */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
              title={`Print current ${selectedCopy} copy (1 page)`}
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </Button>

            {/* Print All 4 Copies */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrintAll}
              className="text-xs font-semibold h-8 gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-2xs cursor-pointer"
              title="Print all 4 copies (Consignor, Consignee, Driver, Office) in one 4-page print job"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>Print All</span>
            </Button>

            {/* Download Current Copy PDF */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf || isDownloadingAllPdf}
              onClick={handleDownloadPdf}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
              title={`Download current ${selectedCopy} copy as single-page PDF`}
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>Download PDF</span>
            </Button>

            {/* Download All 4 Copies as Single PDF */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf || isDownloadingAllPdf}
              onClick={handleDownloadAllPdf}
              className="text-xs font-semibold h-8 gap-1.5 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-2xs cursor-pointer"
              title="Download single PDF containing all 4 copies across 4 pages"
            >
              {isDownloadingAllPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>{isDownloadingAllPdf ? "Downloading..." : "Download All"}</span>
            </Button>

            {/* Edit LR Option (Matching Reference UI) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onEdit) {
                  onEdit(lr);
                } else if (lr?.id) {
                  router.push(`/transport/lr-booking?id=${lr.id}`);
                }
                onClose();
              }}
              className="text-xs font-semibold h-8 gap-1.5 bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 shadow-2xs cursor-pointer ml-0.5"
              title="Edit this LR booking"
            >
              <Edit className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Edit LR</span>
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
        <div ref={modalBodyRef} className="lr-modal-body p-2 sm:p-2.5 bg-slate-100 flex flex-col items-center">
          {/* 1. Single View (Active Copy on screen, and printed when printMode === 'single') */}
          <div
            id="lr-single-print-wrapper"
            className={`w-full flex justify-center ${
              printMode === "all" ? "print:hidden" : ""
            }`}
          >
            {renderLRDocument(selectedCopy, false)}
          </div>

          {/* 2. All 4 Copies (Hidden on screen, rendered in DOM for html2canvas & Print All) */}
          <div
            id="lr-all-copies-wrapper"
            className={`w-full ${
              printMode === "all"
                ? "print:block print:w-full print:static"
                : "fixed left-0 top-0 pointer-events-none opacity-0 z-[-50] print:hidden"
            }`}
            style={
              printMode === "all"
                ? undefined
                : { width: "780px", maxWidth: "780px" }
            }
          >
            {ALL_COPIES.map((copy) =>
              renderLRDocument(copy, true)
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print">
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
