"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Download,
  Pencil,
  Truck,
  Loader2,
  Building2,
  MapPin,
  Calendar,
  Package,
  Scale,
  FileText,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";

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
  issuing_office_name?: string;
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
  default_issuing_office_id?: number;
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
  document_notes?: string | null;
  is_head_office: boolean;
}

interface JobOrderViewModalProps {
  isOpen: boolean;
  job: JobViewRecord | null;
  onClose: () => void;
  onEdit: (job: JobViewRecord) => void;
  onBookLR: (jobId: number) => void;
}

const VEHICLE_REG_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i;
const STATUS_KEYWORD_REGEX = /^(assigned|open|booked|pending|closed|cancelled|in_transit|in transit)$/i;

export function JobOrderViewModal({
  isOpen,
  job,
  onClose,
  onEdit,
  onBookLR,
}: JobOrderViewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"details" | "voucher">("details");
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanySettingData | null>(null);
  const [issuingBranch, setIssuingBranch] = useState<BranchData | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  // Mount on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch company & branch details with loading stabilization
  const loadCompanyDetails = useCallback(async () => {
    setIsLoadingDetails(true);
    setLoadingError(null);
    try {
      const [compData, branchList] = await Promise.all([
        apiClient<CompanySettingData>("/api/v1/profile/company").catch(() => null),
        apiClient<BranchData[]>("/api/v1/profile/branches").catch(() => []),
      ]);

      if (compData) {
        setCompany(compData);
      }

      const validBranches = Array.isArray(branchList) ? branchList : [];
      if (validBranches.length > 0) {
        const activeOffice = getActiveOffice();
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

        // 2. Second priority: job order record's specific issuing office
        if (!selected && (job as any)?.issuing_office_id) {
          selected = validBranches.find((b) => b.id === (job as any).issuing_office_id);
        }
        if (!selected && (job as any)?.issuing_office_code) {
          selected = validBranches.find(
            (b) => b.code?.toUpperCase() === (job as any).issuing_office_code?.toUpperCase()
          );
        }
        if (!selected && job?.issuing_office_name) {
          selected = validBranches.find(
            (b) => b.name?.toLowerCase() === job.issuing_office_name?.toLowerCase()
          );
        }

        // 3. Fallback to company default issuing office
        if (!selected && compData?.default_issuing_office_id) {
          selected = validBranches.find((b) => b.id === compData.default_issuing_office_id);
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
      setLoadingError("Unable to fetch fresh company settings; using fallback workspace profile.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [job]);

  // Re-sync whenever the user switches active office in the top bar
  useEffect(() => {
    if (!isOpen) return;
    const handleOfficeChange = () => {
      loadCompanyDetails();
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => {
      window.removeEventListener("panther_office_changed", handleOfficeChange);
    };
  }, [isOpen, loadCompanyDetails]);

  // Focus trap, scroll lock, and ESC key listener
  useEffect(() => {
    if (!isOpen) return;

    // 1. Capture triggering element to restore focus on close
    triggerElementRef.current = document.activeElement as HTMLElement;

    // 2. Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 3. Load company settings
    loadCompanyDetails();

    // 4. Initial focus inside dialog
    const focusTimer = setTimeout(() => {
      if (primaryActionRef.current) {
        primaryActionRef.current.focus();
      } else if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    // 5. Keydown handler for Escape and Tab trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(focusTimer);
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === "function") {
        triggerElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, loadCompanyDetails]);

  if (!isOpen || !mounted || !job) return null;

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
          const wrapper = clonedDoc.getElementById("job-order-voucher-wrapper");
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
      pdf.save(`Job_Order_${job.job_number}.pdf`);
      toast.success(`Job Order ${job.job_number} PDF downloaded.`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Failed to export Job Order PDF. You can also use the Print button to print or save as PDF.");
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
  const activeOffice = getActiveOffice();
  const companyName = company?.company_name?.trim() || auth?.tenantName || "PANTHER LOGISTICS";
  const officeName = issuingBranch?.name?.trim() || activeOffice?.name?.trim() || company?.issuing_office?.trim() || "Head Office";
  const officeCode = issuingBranch?.code?.trim() || activeOffice?.code?.trim() || "";
  const officeCity = issuingBranch?.city?.trim() || activeOffice?.city?.trim() || (officeCode === "MUM" ? "Mumbai" : company?.city?.trim() || "DELHI");
  const officeState = issuingBranch?.state?.trim() || activeOffice?.state?.trim() || (officeCode === "MUM" ? "Maharashtra" : company?.state?.trim() || "DELHI");
  const officePincode = issuingBranch?.pincode?.trim() || company?.pincode?.trim() || "";
  const officePhone = issuingBranch?.phone?.trim() || company?.phone?.trim() || "—";
  const officeEmail = issuingBranch?.email?.trim() || company?.email?.trim() || "—";
  const officeGstin = issuingBranch?.gstin?.trim() || company?.gstin?.trim() || "—";
  const officePan = company?.pan?.trim() || issuingBranch?.pan?.trim() || "—";
  const officeAddress = issuingBranch?.address?.trim() || (officeCity.toLowerCase() !== (company?.city || "").toLowerCase() ? `${officeName} Branch Office` : company?.address?.trim()) || "Registered Corporate Office";
  const jurisdictionText = issuingBranch?.document_notes?.trim() || `Subject to ${officeCity} Jurisdiction only`;
  const issuingOfficeState = issuingBranch?.state?.trim() || issuingBranch?.city?.trim() || activeOffice?.state?.trim() || activeOffice?.city?.trim() || (officeCode === "MUM" ? "Maharashtra" : company?.state?.trim() || "Delhi");

  // Anomaly checks
  const consignerLooksLikePlate = Boolean(
    job.consigner_name && VEHICLE_REG_REGEX.test(job.consigner_name.trim())
  );
  const consigneeLooksLikeStatus = Boolean(
    job.consignee_name && STATUS_KEYWORD_REGEX.test(job.consignee_name.trim())
  );
  const cargoLooksLikeNumber = Boolean(
    job.cargo_description && /^\d+$/.test(job.cargo_description.trim())
  );

  // Packages display
  const hasPackages = job.estimated_packages !== null && job.estimated_packages !== undefined;
  const packagesDisplay = hasPackages
    ? `${job.estimated_packages} Pkgs${job.estimated_packages === 0 ? " (Declared 0)" : ""}`
    : "— (Not Specified)";

  // Weight display
  const hasWeight =
    job.estimated_weight_mt !== null &&
    job.estimated_weight_mt !== undefined &&
    String(job.estimated_weight_mt).trim() !== "";
  const weightDisplay = hasWeight
    ? `${parseFloat(String(job.estimated_weight_mt)).toFixed(3)} MT`
    : "— (Not Specified)";

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-order-dialog-title"
      aria-describedby="job-order-dialog-description"
      className="job-order-modal-portal fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:m-0 print:static print:overflow-visible print:block print:inset-auto"
    >
      {/* Accessible Backdrop */}
      <div
        className="job-order-modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in print:hidden"
        onClick={onClose}
        aria-hidden="true"
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
          /* Completely hide the rest of the application outside the modal portal */
          body > *:not(.job-order-modal-portal) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .job-order-modal-portal,
          .job-order-modal-portal * {
            visibility: visible;
          }
          .no-print,
          .no-print *,
          .job-order-modal-backdrop,
          .job-order-modal-backdrop *,
          .job-order-details-container,
          .job-order-details-container * {
            display: none !important;
            visibility: hidden !important;
          }
          .job-order-modal-portal {
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
          .job-order-modal-container {
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
          .job-order-modal-body {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: transparent !important;
          }
          #job-order-voucher-wrapper {
            position: static !important;
            display: flex !important;
            justify-content: center !important;
            left: auto !important;
            top: auto !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            visibility: visible !important;
          }
          #job-order-printable-document {
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
            visibility: visible !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="job-order-modal-container relative w-full max-w-4xl h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col focus:outline-none print:h-auto print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none"
      >
        {/* Top Control Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-700 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="job-order-dialog-title" className="font-mono text-sm font-bold text-slate-900 truncate">
                  Job Order: {job.job_number}
                </h3>
                <StatusBadge status={job.status} />
              </div>
              <p id="job-order-dialog-description" className="text-[11px] text-slate-500 truncate">
                Trip Indent #{job.id} · Created {formatDate(job.job_date || job.created_at)}
              </p>
            </div>
          </div>

          {/* Action Group: Mode Switcher, Secondary Actions, Primary Action, and Close */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("details")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === "details"
                    ? "bg-white text-indigo-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Details View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("voucher")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${viewMode === "voucher"
                    ? "bg-white text-indigo-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Print Preview
              </button>
            </div>

            {/* Secondary: Edit */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(job);
              }}
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit</span>
            </Button>

            {/* Secondary: Print */}
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

            {/* Secondary: Download PDF */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloadingPdf || isLoadingDetails}
              onClick={handleDownloadPdf}
              title="Download Job Order PDF"
              className="text-xs font-medium h-8 gap-1.5 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>PDF</span>
            </Button>

            {/* Prioritized Primary Action: Single Book GR/LR button */}
            {job.status === "OPEN" && (
              <Button
                ref={primaryActionRef}
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onBookLR(job.id);
                }}
                className="text-xs font-semibold h-8 gap-1.5 shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Book GR/LR</span>
              </Button>
            )}

            {/* Dialog Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Close Job Order dialog (Esc)"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={modalBodyRef} className="job-order-modal-body overflow-y-auto flex-1 bg-slate-50/60">
          {isLoadingDetails ? (
            <div className="min-h-[420px] flex flex-col items-center justify-center p-8 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-slate-500 font-mono">
                Loading Trip Order details & branch profile...
              </p>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* MODE A: RESPONSIVE JOB DETAILS VIEW (DEFAULT)                             */}
              {/* ========================================================================= */}
              {viewMode === "details" && (
                <div className="job-order-details-container p-5 sm:p-7 space-y-5 max-w-4xl mx-auto print:hidden no-print">
                  {/* Hero Corridor Banner */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Transit Corridor</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg font-bold flex-wrap">
                        <span>{job.origin_city || "Ghaziabad"}</span>
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-300 shrink-0" />
                        <span>{job.destination_city || "Faridabad"}</span>
                      </div>
                    </div>

                    <div className="sm:text-right space-y-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-700/60">
                      <div className="text-[11px] text-indigo-200 font-medium">Scheduled Dispatch Date</div>
                      <div className="text-sm font-mono font-bold text-white flex items-center sm:justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                        <span>{job.expected_dispatch_date ? formatDate(job.expected_dispatch_date) : "Immediate / Unscheduled"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Advisory Notice for Suspicious Data */}
                  {(consignerLooksLikePlate || consigneeLooksLikeStatus || cargoLooksLikeNumber) && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Imported Record Data Notice</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1">
                        {consignerLooksLikePlate && (
                          <li>
                            Consignor name <strong>&ldquo;{job.consigner_name}&rdquo;</strong> resembles a vehicle registration format. The true recorded value is displayed without silent reinterpretation.
                          </li>
                        )}
                        {consigneeLooksLikeStatus && (
                          <li>
                            Consignee name <strong>&ldquo;{job.consignee_name}&rdquo;</strong> resembles an operational status keyword.
                          </li>
                        )}
                        {cargoLooksLikeNumber && (
                          <li>
                            Cargo description <strong>&ldquo;{job.cargo_description}&rdquo;</strong> contains purely numeric digits.
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* 2-Column Grouped Details Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Commercial Parties */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Commercial Parties
                        </h4>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Billing Customer:</span>
                          <span className="font-semibold text-slate-900 text-sm block">
                            {job.billing_client_name || job.billing_party || "— (Not Specified)"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Consignor (Sender):</span>
                            <span className="font-medium text-slate-900 block font-mono">
                              {job.consigner_name || job.consigner_code || "—"}
                            </span>
                            {job.consigner_code && job.consigner_name && (
                              <span className="text-[10px] text-slate-500 font-mono">Code: {job.consigner_code}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Consignee (Receiver):</span>
                            <span className="font-medium text-slate-900 block">
                              {job.consignee_name || job.consignee_code || "—"}
                            </span>
                            {job.consignee_code && (
                              <span className="text-[10px] text-slate-500 font-mono">Code: {job.consignee_code}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Cargo & Consignment Specifications */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Cargo & Weight Specifications
                        </h4>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                              <Package className="w-3 h-3 text-slate-500" />
                              Total Packages
                            </span>
                            <span className="text-sm font-bold text-slate-900 block">
                              {packagesDisplay}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center gap-1">
                              <Scale className="w-3 h-3 text-slate-500" />
                              Estimated Weight
                            </span>
                            <span className="text-sm font-bold text-slate-900 font-mono block">
                              {weightDisplay}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[11px] font-medium text-slate-400 block mb-0.5">Cargo Description:</span>
                          <span className="text-slate-800 font-medium block break-words">
                            {job.cargo_description || "— (No description provided)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Dispatch & Operations Context */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Dispatch & Office Authorization
                        </h4>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Issuing Branch:</span>
                          <span className="font-semibold text-slate-800">
                            {job.issuing_office_name || officeName}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Job Order Date:</span>
                          <span className="font-mono font-medium text-slate-800">
                            {formatDate(job.job_date)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Order Lifecycle Status:</span>
                          <StatusBadge status={job.status} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Carrier Document State:</span>
                          <span className="text-slate-700 font-medium">
                            {job.status === "BOOKED"
                              ? "Consignment LR Booked"
                              : "Pending Vehicle Assignment"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 4: Special Instructions */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Special Instructions & Remarks
                        </h4>
                      </div>

                      <div className="text-xs text-slate-700 min-h-[75px] bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
                        {job.special_instructions ? (
                          <p className="whitespace-pre-line leading-relaxed">{job.special_instructions}</p>
                        ) : (
                          <span className="text-slate-400 italic">No special instructions or delivery caveats recorded for this order.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* MODE B: 1-PAGE A4 PRINT VOUCHER PREVIEW                                   */}
              {/* ========================================================================= */}
              <div
                id="job-order-voucher-wrapper"
                className={`justify-center ${viewMode === "voucher"
                    ? "flex p-4 sm:p-6"
                    : "fixed left-0 top-0 pointer-events-none opacity-0 z-[-50] print:static print:opacity-100 print:pointer-events-auto print:flex print:p-0 print:z-auto"
                  }`}
                style={viewMode === "voucher" ? undefined : { width: "780px", maxWidth: "780px" }}
              >
                <div
                  id="job-order-printable-document"
                  ref={printRef}
                  className="w-full max-w-[780px] bg-white border border-slate-300 text-black font-sans select-text shadow-sm"
                  style={{
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {/* 1. Top Header: Logo (Left), Dynamic Company Info (Center), Issuing Office/Tax (Right) */}
                  <div className="flex items-center justify-between p-3.5 border-b border-slate-300 gap-2">
                    {/* Left: Dynamic Company Logo */}
                    <div className="w-[24%] min-h-[56px] flex flex-col items-center justify-center shrink-0">
                      {company?.logo_url ? (
                        <img
                          src={company.logo_url}
                          alt={companyName}
                          crossOrigin="anonymous"
                          className="max-h-14 max-w-full object-contain mx-auto"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <img
                            src="/panther-logo-transparent.png"
                            alt="Panther Logo"
                            crossOrigin="anonymous"
                            className="h-9 sm:h-10 w-auto object-contain mx-auto"
                          />
                          <div className="text-[10px] font-black text-[#0f2147] tracking-wider leading-tight text-center mt-0.5">
                            PANTHER
                          </div>
                          <div className="text-[8.5px] font-black text-[#0f2147] tracking-wide text-center leading-tight">
                            DIGITAL SOLUTIONS
                          </div>
                          <div className="text-[7px] font-bold text-[#0f2147] tracking-widest text-center leading-tight">
                            PRIVATE LIMITED
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Middle: Company Legal Name & Registered Office */}
                    <div className="w-[52%] text-center px-2">
                      <div className="text-base sm:text-[17px] font-black text-[#0f2147] uppercase tracking-wide leading-tight">
                        {companyName}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium leading-tight mt-1">
                        {officeAddress} · {officeCity}, {officeState} {officePincode ? `- ${officePincode}` : ""}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                        Phone: {officePhone} | Email: {officeEmail}
                      </div>
                    </div>

                    {/* Right: Issuing Office, GST No, PAN No */}
                    <div className="w-[24%] text-right text-[11px] text-slate-800 leading-snug space-y-0.5 pr-1">
                      <div>
                        <span className="font-semibold text-slate-700">ISSUING OFFICE </span>
                        <span className="font-medium text-slate-900">{officeName}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">GST NO. </span>
                        <span className="font-medium font-mono text-slate-900">{officeGstin}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">PAN NO. </span>
                        <span className="font-medium font-mono text-slate-900">{officePan}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Dark Navy Ribbon + 4 KPI blocks */}
                  <div className="grid grid-cols-12 border-b border-slate-300 divide-x divide-slate-300 text-[11px]">
                    <div className="col-span-2 bg-[#1a365d] text-white font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center p-2 text-center uppercase">
                      JOB ORDER
                    </div>
                    <div className="col-span-3 bg-[#f1f5f9] p-2 pl-3">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        JOB NO.
                      </span>
                      <span className="text-xs font-bold font-mono text-slate-900 block mt-0.5">
                        {job.job_number}
                      </span>
                    </div>
                    <div className="col-span-2 bg-[#f1f5f9] p-2 pl-3">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        ORDER DATE
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-900 block mt-0.5">
                        {formatDateDMY(job.job_date || job.created_at)}
                      </span>
                    </div>
                    <div className="col-span-3 bg-[#f1f5f9] p-2 pl-3">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        SCHEDULED DISPATCH
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-900 block mt-0.5">
                        {formatDateDMY(job.expected_dispatch_date || job.job_date)}
                      </span>
                    </div>
                    <div className="col-span-2 bg-[#f1f5f9] p-2 pl-3">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        ORDER STATUS
                      </span>
                      <span className="text-xs font-bold text-emerald-700 uppercase block mt-0.5">
                        {job.status}
                      </span>
                    </div>
                  </div>

                  {/* 3. Route Corridor & Date Row */}
                  <div className="grid grid-cols-12 border-b border-slate-300 divide-x divide-slate-300 text-[11px]">
                    <div className="col-span-5 p-2 pl-3">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        FROM
                      </span>
                      <span className="text-xs font-semibold text-slate-900 block mt-0.5">
                        {job.origin_city || "Ghaziabad"}
                      </span>
                    </div>
                    <div className="col-span-5 p-2 pl-3">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        TO
                      </span>
                      <span className="text-xs font-semibold text-slate-900 block mt-0.5">
                        {job.destination_city || "Faridabad"}
                      </span>
                    </div>
                    <div className="col-span-2 p-2 pr-3 text-right">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-600 block">
                        DATE
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-900 block mt-0.5">
                        {formatDateDMY(job.job_date || job.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* 4. Parties & Dispatch Row */}
                  <div className="border-b border-slate-300 text-[11px]">
                    {/* Row 1: Consignor & Consignee */}
                    <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-200">
                      <div className="p-2 pl-3 flex items-center">
                        <span className="font-bold text-slate-800 w-28 shrink-0">CONSIGNOR</span>
                        <span className="font-medium text-slate-900 truncate">
                          {job.consigner_name || job.consigner_code || "—"}
                        </span>
                      </div>
                      <div className="p-2 pl-3 flex items-center">
                        <span className="font-bold text-slate-800 w-28 shrink-0">CONSIGNEE</span>
                        <span className="font-medium text-slate-900 truncate">
                          {job.consignee_name || job.consignee_code || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Job No & Scheduled Dispatch Date */}
                    <div className="grid grid-cols-2 divide-x divide-slate-300">
                      <div className="p-2 pl-3 flex items-center">
                        <span className="font-bold text-slate-800 w-28 shrink-0">JOB NO.</span>
                        <span className="font-bold font-mono text-slate-900">
                          {job.job_number}
                        </span>
                      </div>
                      <div className="p-2 pl-3 flex items-center">
                        <span className="font-bold text-slate-800 w-52 shrink-0">SCHEDULED DISPATCH DATE</span>
                        <span className="font-mono font-medium text-slate-900">
                          {formatDateDMY(job.expected_dispatch_date || job.job_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5. CARGO / CONSIGNMENT DETAILS Table */}
                  <div className="border-b border-slate-300">
                    <div className="bg-slate-50 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300">
                      CARGO / CONSIGNMENT DETAILS
                    </div>
                    <div className="grid grid-cols-12 bg-[#eef4f9] border-b border-slate-300 divide-x divide-slate-300 text-[10px] font-bold text-slate-700 uppercase text-center">
                      <div className="col-span-3 py-2 px-2">
                        NO. OF PACKAGES
                      </div>
                      <div className="col-span-4 py-2 px-2">
                        PARTICULARS / CARGO DESCRIPTION
                      </div>
                      <div className="col-span-3 py-2 px-2">
                        ESTIMATED WEIGHT (MT)
                      </div>
                      <div className="col-span-2 py-2 px-2">
                        ORDER STATUS
                      </div>
                    </div>

                    <div className="grid grid-cols-12 divide-x divide-slate-300 min-h-[110px] text-xs">
                      {/* Packages */}
                      <div className="col-span-3 p-3 text-center flex flex-col justify-center">
                        <span className="font-bold text-slate-900 text-sm">
                          {job.estimated_packages !== null && job.estimated_packages !== undefined
                            ? `${job.estimated_packages} Pkgs`
                            : "—"}
                        </span>
                        {job.estimated_packages !== null && job.estimated_packages !== undefined && (
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            Declared: {job.estimated_packages}
                          </span>
                        )}
                      </div>

                      {/* Cargo Description */}
                      <div className="col-span-4 p-3 flex items-center justify-center text-slate-800 break-words text-center">
                        {job.cargo_description || "—"}
                      </div>

                      {/* Weight */}
                      <div className="col-span-3 p-3 flex items-center justify-center font-mono font-bold text-slate-900 text-sm">
                        {weightDisplay}
                      </div>

                      {/* Status */}
                      <div className="col-span-2 p-3 bg-[#f0fdf4] flex items-center justify-center font-bold text-emerald-700 uppercase tracking-wide">
                        {job.status}
                      </div>
                    </div>
                  </div>

                  {/* 6. Footer 3-Column Block */}
                  <div>
                    {/* Headers */}
                    <div className="grid grid-cols-12 bg-[#eef4f9] border-b border-slate-300 divide-x divide-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                      <div className="col-span-5 py-1.5 px-3">
                        SPECIAL INSTRUCTIONS
                      </div>
                      <div className="col-span-3 py-1.5 px-3">
                        BILLING CUSTOMER
                      </div>
                      <div className="col-span-4 py-1.5 px-3 text-right">
                        AUTHORIZED DISPATCHER
                      </div>
                    </div>

                    {/* Content */}
                    <div className="grid grid-cols-12 divide-x divide-slate-300 min-h-[95px] text-[11px]">
                      {/* Special Instructions */}
                      <div className="col-span-5 p-3 flex flex-col justify-between">
                        <div className="text-slate-800 break-words leading-relaxed">
                          {job.special_instructions || "None"}
                        </div>
                        <div className="text-[9.5px] text-slate-500 mt-3">
                          {jurisdictionText}
                        </div>
                      </div>

                      {/* Billing Customer */}
                      <div className="col-span-3 p-3 flex flex-col justify-between">
                        <div className="font-bold text-slate-900 text-xs break-words">
                          {job.billing_client_name || job.billing_party || "—"}
                        </div>
                        <div className="text-center mt-3">
                          <div className="text-[10px] font-bold tracking-wider text-slate-900 uppercase">
                            AT OWNER&apos;S RISK
                          </div>
                          <div className="text-[10.5px] font-bold text-slate-700 uppercase mt-0.5">
                            DISPATCH COPY
                          </div>
                        </div>
                      </div>

                      {/* Authorized Dispatcher */}
                      <div className="col-span-4 p-3 flex flex-col justify-between text-right">
                        <div>
                          <div className="font-bold text-slate-900 uppercase text-xs">
                            {companyName}
                          </div>
                          <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                            {company?.signing_authority_name || "Authorized Dispatcher"}
                            {company?.signing_authority_designation ? ` (${company.signing_authority_designation})` : ""}
                          </div>
                          {company?.signature_url && (
                            <div className="flex justify-end mt-1">
                              <img
                                src={company.signature_url}
                                alt="Signing Authority"
                                crossOrigin="anonymous"
                                className="h-7 max-w-[100px] object-contain"
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-700 font-mono mt-3">
                          Signature: ____________________
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Footer Bar */}
                    <div className="bg-black text-white text-center py-2 px-3 text-[10px] sm:text-[11px] font-medium tracking-wide">
                      This Trip Job Order is electronically generated from {issuingOfficeState}.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Bottom Bar (Hidden in Print) */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Trip Order:</span>
            <span className="font-mono font-semibold text-slate-800">{job.job_number}</span>
            <span>·</span>
            <span>Status:</span>
            <StatusBadge status={job.status} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold px-4 cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
