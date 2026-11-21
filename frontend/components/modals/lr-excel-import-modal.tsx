"use client";
import { toast } from "@/lib/toast";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  RefreshCw,
  Info,
  Loader2,
  Sparkles,
  Building2,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient, getApiBaseUrl } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice, OfficeSummary } from "@/lib/auth";

interface SkippedDuplicate {
  row: number;
  lr_number?: string;
  reason: string;
  duplicate_type?: string;
}

interface RowError {
  row: number;
  lr_number?: string;
  reason: string;
}

interface ImportedLR {
  id: number;
  lr_number: string;
  job_id: number;
  job_number: string;
  consigner: string;
  consignee: string;
  origin: string;
  destination: string;
  vehicle_number: string;
  lr_date: string;
}

interface LRExcelImportResult {
  total_rows: number;
  imported_count: number;
  skipped_duplicate_count: number;
  failed_count: number;
  skipped_duplicates: SkippedDuplicate[];
  errors: RowError[];
  imported_lrs: ImportedLR[];
}

interface LRExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeOffice?: OfficeSummary | null;
}

export function LRExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
  activeOffice: propActiveOffice,
}: LRExcelImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeOffice, setActiveOfficeState] = useState<OfficeSummary | null>(() => propActiveOffice || getActiveOffice());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<LRExcelImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [applySeriesPrefixSuffix, setApplySeriesPrefixSuffix] = useState<boolean>(true);
  const [seriesInfo, setSeriesInfo] = useState<{
    prefix?: string;
    suffix?: string;
    next_number?: number;
    next_number_formatted?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (propActiveOffice !== undefined) {
      setActiveOfficeState(propActiveOffice);
    } else {
      setActiveOfficeState(getActiveOffice());
    }
  }, [propActiveOffice, isOpen]);

  useEffect(() => {
    const handleOfficeChange = (e: any) => {
      setActiveOfficeState(e.detail || getActiveOffice());
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, []);

  // Reset state and fetch LR Series Master info when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportResult(null);
      setUploadError(null);
      setIsUploading(false);
      setApplySeriesPrefixSuffix(true);

      const effOfficeId = activeOffice?.id && activeOffice.id !== 0 ? activeOffice.id : undefined;
      const checkUrl = effOfficeId 
        ? `/api/v1/settings/series/check/LR?office_id=${effOfficeId}`
        : `/api/v1/settings/series/check/LR`;

      apiClient<any>(checkUrl, { officeId: effOfficeId })
        .then((res) => {
          if (res && res.configured) {
            setSeriesInfo(res);
          } else {
            setSeriesInfo(null);
          }
        })
        .catch(() => setSeriesInfo(null));
    }
  }, [isOpen, activeOffice]);

  if (!isOpen || !mounted) return null;

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const backendBaseUrl = getApiBaseUrl();
      const storedAuth = getStoredAuth();

      const headers: Record<string, string> = {};
      if (storedAuth?.accessToken) {
        headers["Authorization"] = `Bearer ${storedAuth.accessToken}`;
      }
      if (storedAuth?.tenantId) {
        headers["X-Tenant-ID"] = storedAuth.tenantId;
      }
      if (storedAuth?.companyCode) {
        headers["X-Company-Code"] = storedAuth.companyCode;
      }

      const res = await fetch(`${backendBaseUrl}/api/v1/transport/lrs/excel-template`, {
        headers,
      });

      if (!res.ok) {
        throw new Error("Failed to download LR Excel template.");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "PantherTMS_LR_Booking_Import_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (err: any) {
      toast.error(err.message || "Failed to download LR template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError("Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select an Excel or CSV file to upload.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const effOfficeId = activeOffice?.id && activeOffice.id !== 0 ? activeOffice.id : undefined;

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("apply_series_prefix_suffix", applySeriesPrefixSuffix ? "true" : "false");
      if (effOfficeId) {
        formData.append("office_id", String(effOfficeId));
      }

      const queryParams = new URLSearchParams({
        apply_series_prefix_suffix: String(applySeriesPrefixSuffix),
      });
      if (effOfficeId) {
        queryParams.set("office_id", String(effOfficeId));
      }

      const result = await apiClient<LRExcelImportResult>(
        `/api/v1/transport/lrs/import-excel?${queryParams.toString()}`,
        {
          method: "POST",
          body: formData,
          officeId: effOfficeId,
        }
      );

      setImportResult(result);
      if (result.imported_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during LR Excel import.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseAndFinish = () => {
    onClose();
  };

  const modalNode = (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={handleCloseAndFinish}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#161218] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#382638] overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2E1D2E] flex items-center justify-between bg-slate-50/70 dark:bg-[#1C1622]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Import Lorry Receipts from Excel
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                  Auto-Creates Linked Jobs
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mass import LRs in date sequence with automatic Job creation and master matching.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAndFinish}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#2A1B2A] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!importResult ? (
            <>
              {/* Target Office Notice */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A1420] border border-slate-200/90 dark:border-[#301E30] shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold block leading-tight">
                      Target Issuing Office
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activeOffice && activeOffice.id !== 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {activeOffice.name} {activeOffice.code ? `(${activeOffice.code})` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          All Offices (Auto-assigned to Head Office)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  LRs &amp; Jobs will be registered under this office
                </span>
              </div>

              {/* Step 1: Download Template */}
              <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Step 1: Download Standard LR Excel Format
                    </h4>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                      Download the clean Excel format pre-configured with the exact input fields from the LR Booking form. Zero demo data included.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    disabled={isDownloadingTemplate}
                    className="shrink-0 bg-white dark:bg-[#1E1724] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 font-medium text-xs shadow-xs"
                  >
                    {isDownloadingTemplate ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Template (.xlsx)
                      </>
                    )}
                  </Button>
                </div>

                {/* Real input fields badge catalog */}
                <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-800/40">
                  <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 mb-1.5">
                    Real Form Input Fields in Template:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "LR Number",
                      "Date of LR / Booking Date *",
                      "Billing Customer *",
                      "Consignor *",
                      "Consignee *",
                      "Origin Hub / City *",
                      "Destination Hub / City *",
                      "Truck Number *",
                      "Driver Name",
                      "Driver Mobile No.",
                      "Cargo Description",
                      "No. of Packages",
                      "Actual Weight (MT)",
                      "Charged Weight (MT)",
                      "Freight Amount (₹)",
                      "Advance Amount (₹)",
                      "Payment Type",
                      "Invoice No.",
                      "Invoice Value (₹)",
                      "E-Way Bill No.",
                      "Remarks / Instructions",
                    ].map((f) => (
                      <span
                        key={f}
                        className="text-[10px] bg-white/90 dark:bg-[#201927] text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-md font-medium shadow-2xs"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Upload File Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Step 2: Upload Your Filled Spreadsheet
                  </h4>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Supports .xlsx, .xls, .csv</span>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]"
                      : selectedFile
                      ? "border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20"
                      : "border-slate-300 dark:border-[#382638] hover:border-slate-400 dark:hover:border-[#523752] bg-slate-50/50 dark:bg-[#1A1420]/50 hover:bg-slate-50 dark:hover:bg-[#1A1420]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop another to replace
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200/70 dark:bg-[#281A2A] text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Drag and drop your spreadsheet here, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Spreadsheet with Customer, Consignor, Consignee, Truck No, and Date
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 3: Prefix/Postfix Series Formatting Option */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Step 3: Document Number Series Formatting
                    </h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Prefix/postfix handling</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: With Series Prefix & Postfix */}
                    <div
                      onClick={() => setApplySeriesPrefixSuffix(true)}
                      className={`relative rounded-xl border p-3.5 cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        applySeriesPrefixSuffix
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs"
                          : "border-slate-200 dark:border-[#301E30] bg-white dark:bg-[#1A1420] hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-[#201828]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            applySeriesPrefixSuffix ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A1420]"
                          }`}
                        >
                          {applySeriesPrefixSuffix && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            With Prefix &amp; Postfix
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300">
                              Recommended
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Applies Series Master prefix &amp; suffix to all imported LRs and auto-created Jobs (e.g. sequence{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">1</span> will be saved as{" "}
                            <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                              {seriesInfo?.prefix || "LR-2026-"}0001{seriesInfo?.suffix || ""}
                            </span>
                            ).
                          </p>
                        </div>
                      </div>
                      {seriesInfo && (seriesInfo.prefix || seriesInfo.suffix) && (
                        <div className="mt-2.5 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>Prefix: <strong className="text-slate-800 dark:text-slate-200">{seriesInfo.prefix || "(None)"}</strong></span>
                          <span>Suffix: <strong className="text-slate-800 dark:text-slate-200">{seriesInfo.suffix || "(None)"}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Option B: Without Series Prefix & Postfix */}
                    <div
                      onClick={() => setApplySeriesPrefixSuffix(false)}
                      className={`relative rounded-xl border p-3.5 cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        !applySeriesPrefixSuffix
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs"
                          : "border-slate-200 dark:border-[#301E30] bg-white dark:bg-[#1A1420] hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-[#201828]"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            !applySeriesPrefixSuffix ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A1420]"
                          }`}
                        >
                          {!applySeriesPrefixSuffix && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white">
                            Without Prefix &amp; Postfix
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Save exact sequence number or plain integer without prefix/postfix (e.g. sequence{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">1</span> stays{" "}
                            <span className="font-semibold text-slate-800 dark:text-slate-200">1</span>).
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#2A1C2A] text-[10px] text-slate-400 dark:text-slate-500">
                        Imports plain sequence numbers
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date-ordered sequential allocation notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs">
                  <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Automatic Chronological Numbering &amp; Linked Jobs: </span>
                    Rows are automatically sorted by Booking Date (oldest date gets the first available series number; same date follows first-come, first-served). Each LR automatically creates and links its corresponding Job Order!
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Results Screen */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#301E30] bg-slate-50/70 dark:bg-[#1A1420] text-center">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Rows</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {importResult.total_rows}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-center">
                  <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Imported
                  </div>
                  <div className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                    {importResult.imported_count}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-center">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Skipped Dups
                  </div>
                  <div className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                    {importResult.skipped_duplicate_count}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-center">
                  <div className="text-xs font-medium text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Errors
                  </div>
                  <div className="text-xl font-bold text-rose-800 dark:text-rose-300 mt-1">
                    {importResult.failed_count}
                  </div>
                </div>
              </div>

              {/* Skipped Duplicates Section */}
              {importResult.skipped_duplicate_count > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Skipped Duplicate Consignments ({importResult.skipped_duplicates.length})
                    </h5>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">Protected against double-entry</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-amber-200 dark:border-amber-900/60 rounded-lg bg-amber-50/30 dark:bg-amber-950/20 divide-y divide-amber-200/60 dark:divide-amber-900/40">
                    {importResult.skipped_duplicates.map((dup, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Row {dup.row}: {dup.lr_number && dup.lr_number !== "AUTO" ? `LR #${dup.lr_number}` : "Consignment"}
                          </span>
                          <p className="text-slate-600 dark:text-slate-400">{dup.reason}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60">
                          {dup.duplicate_type === "DATABASE_DUPLICATE" ? "DB Existing" : "File Repeated"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed / Error Rows Section */}
              {importResult.failed_count > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Failed Rows ({importResult.errors.length})
                  </h5>
                  <div className="max-h-36 overflow-y-auto border border-rose-200 dark:border-rose-900/60 rounded-lg bg-rose-50/30 dark:bg-rose-950/20 divide-y divide-rose-200/60 dark:divide-rose-900/40">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-3 text-rose-800 dark:text-rose-300">
                        <span className="font-semibold">Row {err.row}:</span>
                        <span className="text-rose-700 dark:text-rose-400 flex-1">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imported LRs List with Linked Jobs */}
              {importResult.imported_count > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Successfully Created LRs &amp; Linked Jobs ({importResult.imported_lrs.length})
                  </h5>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-[#301E30] rounded-lg bg-slate-50/50 dark:bg-[#1A1420]/50 divide-y divide-slate-100 dark:divide-[#281A28]">
                    {importResult.imported_lrs.map((lr) => (
                      <div key={lr.id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {lr.lr_number}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Job #{lr.job_number}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[160px] sm:max-w-[220px]">
                            {lr.consigner} → {lr.consignee}
                          </span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0 flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            {lr.vehicle_number}
                          </span>
                          <span>•</span>
                          <span>{lr.lr_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-[#2E1D2E] bg-slate-50/70 dark:bg-[#1C1622]/90 flex items-center justify-between">
          {!importResult ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseAndFinish}
                disabled={isUploading}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Validating &amp; Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1.5" />
                    Import LRs from File
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportResult(null);
                  setSelectedFile(null);
                }}
                className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A1C2A] border-slate-300 dark:border-[#382638]"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Import Another File
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCloseAndFinish}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-medium px-4 shadow-xs"
              >
                Done &amp; View LRs
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
