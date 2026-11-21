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
  ArrowRight,
  Info,
  Loader2,
  Sparkles,
  Building2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient, getApiBaseUrl } from "@/lib/api-client";
import { getStoredAuth, getActiveOffice, OfficeSummary } from "@/lib/auth";

interface SkippedDuplicate {
  row: number;
  job_number?: string;
  route?: string;
  dispatch_date?: string;
  reason: string;
  duplicate_type?: string;
}

interface RowError {
  row: number;
  job_number?: string;
  field?: string;
  column?: string;
  reason: string;
}

interface ImportedJob {
  id: number;
  job_number: string;
  consigner: string;
  consignee: string;
  origin: string;
  destination: string;
  dispatch_date: string;
}

interface SummaryReport {
  status: string;
  total_rows: number;
  imported_count: number;
  skipped_duplicate_count: number;
  failed_count: number;
  success_rate_percent: number;
  missing_columns: string[];
  execution_summary: string;
  generated_at: string;
}

interface JobExcelImportResult {
  status?: string;
  total_rows: number;
  imported_count: number;
  skipped_duplicate_count: number;
  failed_count: number;
  missing_headers?: string[];
  skipped_duplicates: SkippedDuplicate[];
  errors: RowError[];
  imported_jobs: ImportedJob[];
  summary_report?: SummaryReport;
}

interface JobExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeOffice?: OfficeSummary | null;
}

export function JobExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
  activeOffice: propActiveOffice,
}: JobExcelImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeOffice, setActiveOfficeState] = useState<OfficeSummary | null>(() => propActiveOffice || getActiveOffice());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<JobExcelImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "created" | "skipped" | "errors">("overview");
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

  // Reset state and fetch Series Master info when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportResult(null);
      setUploadError(null);
      setIsUploading(false);
      setApplySeriesPrefixSuffix(true);

      const effOfficeId = activeOffice?.id && activeOffice.id !== 0 ? activeOffice.id : undefined;
      const checkUrl = effOfficeId 
        ? `/api/v1/settings/series/check/JOB?office_id=${effOfficeId}`
        : `/api/v1/settings/series/check/JOB`;

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

      const res = await fetch(`${backendBaseUrl}/api/v1/transport/jobs/excel-template`, {
        headers,
      });

      if (!res.ok) {
        throw new Error("Failed to download Excel template.");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "PantherTMS_Job_Orders_Import_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (err: any) {
      toast.error(err.message || "Failed to download template.");
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

      const result = await apiClient<JobExcelImportResult>(
        `/api/v1/transport/jobs/import-excel?${queryParams.toString()}`,
        {
          method: "POST",
          body: formData,
          officeId: effOfficeId,
        }
      );

      setImportResult(result);
      setActiveTab("overview");
      if (result.imported_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during Excel import.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadAuditReport = () => {
    if (!importResult) return;
    const lines: string[] = [];
    lines.push("================================================================================");
    lines.push("                 PANTHER TMS - JOB ORDER EXCEL IMPORT AUDIT REPORT              ");
    lines.push("================================================================================");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Target Office: ${activeOffice?.name || "All Offices / Head Office"} ${activeOffice?.code ? `(${activeOffice.code})` : ""}`);
    lines.push(`File Uploaded: ${selectedFile?.name || "Uploaded File"}`);
    lines.push(`Overall Status: ${importResult.summary_report?.status || (importResult.imported_count > 0 ? "PARTIAL_SUCCESS" : "FAILED")}`);
    lines.push(`Total Processed Rows: ${importResult.total_rows}`);
    lines.push(`Successfully Created Jobs: ${importResult.imported_count}`);
    lines.push(`Skipped Duplicate Orders: ${importResult.skipped_duplicate_count}`);
    lines.push(`Failed / Exception Rows: ${importResult.failed_count}`);
    if (importResult.summary_report?.success_rate_percent !== undefined) {
      lines.push(`Success Rate: ${importResult.summary_report.success_rate_percent}%`);
    }
    lines.push("");

    if (importResult.missing_headers && importResult.missing_headers.length > 0) {
      lines.push("--------------------------------------------------------------------------------");
      lines.push("CRITICAL HEADER ERROR - MISSING MANDATORY COLUMNS");
      lines.push("--------------------------------------------------------------------------------");
      lines.push(`Missing Columns: ${importResult.missing_headers.join(", ")}`);
      lines.push("");
    }

    lines.push("--------------------------------------------------------------------------------");
    lines.push(`[1] SUCCESSFULLY CREATED JOBS (${importResult.imported_jobs.length})`);
    lines.push("--------------------------------------------------------------------------------");
    if (importResult.imported_jobs.length === 0) {
      lines.push("No jobs were created.");
    } else {
      importResult.imported_jobs.forEach((j, idx) => {
        lines.push(`${idx + 1}. Job Number: ${j.job_number} | Dispatch Date: ${j.dispatch_date}`);
        lines.push(`   Route: ${j.origin} -> ${j.destination}`);
        lines.push(`   Consignor: ${j.consigner} | Consignee: ${j.consignee}`);
      });
    }
    lines.push("");

    lines.push("--------------------------------------------------------------------------------");
    lines.push(`[2] SKIPPED DUPLICATES - DOUBLE-ENTRY PROTECTION (${importResult.skipped_duplicates.length})`);
    lines.push("--------------------------------------------------------------------------------");
    if (importResult.skipped_duplicates.length === 0) {
      lines.push("No duplicates encountered.");
    } else {
      importResult.skipped_duplicates.forEach((dup, idx) => {
        lines.push(`${idx + 1}. Row ${dup.row} | Type: ${dup.duplicate_type || "DUPLICATE"}`);
        lines.push(`   Job Number: ${dup.job_number || "AUTO"}`);
        lines.push(`   Route: ${dup.route || "N/A"} | Date: ${dup.dispatch_date || "N/A"}`);
        lines.push(`   Reason: ${dup.reason}`);
      });
    }
    lines.push("");

    lines.push("--------------------------------------------------------------------------------");
    lines.push(`[3] FAILED ROWS & EXCEPTIONS (${importResult.errors.length})`);
    lines.push("--------------------------------------------------------------------------------");
    if (importResult.errors.length === 0) {
      lines.push("No row-level errors or exceptions encountered.");
    } else {
      importResult.errors.forEach((err, idx) => {
        lines.push(`${idx + 1}. Row ${err.row}${err.field ? ` [Field: ${err.field}]` : ""}${err.column ? ` [Column: ${err.column}]` : ""}`);
        lines.push(`   Reason: ${err.reason}`);
      });
    }
    lines.push("");
    lines.push("================================================================================");
    lines.push("                                END OF AUDIT REPORT                             ");
    lines.push("================================================================================");

    const textContent = lines.join("\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `PantherTMS_Job_Import_Audit_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
    toast.success("Audit report downloaded successfully.");
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
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Import Trip Orders from Excel
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Bulk Load
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Mass import transport jobs with automatic deduplication and master data matching.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseAndFinish}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!importResult ? (
            <>
              {/* Target Office Notice */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-700 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block leading-tight">
                      Target Issuing Office
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {activeOffice && activeOffice.id !== 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {activeOffice.name} {activeOffice.code ? `(${activeOffice.code})` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          All Offices (Auto-assigned to Head Office)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Jobs will be registered under this office
                </span>
              </div>

              {/* Step 1: Download Template */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-600" />
                      Step 1: Download Standard Excel Format
                    </h4>
                    <p className="text-xs text-emerald-800/80 leading-relaxed">
                      Download the clean Excel format pre-configured with the exact input fields from the Job Order creation form. Zero demo data included.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    disabled={isDownloadingTemplate}
                    className="shrink-0 bg-white hover:bg-emerald-50 border-emerald-300 text-emerald-700 hover:text-emerald-800 font-medium text-xs shadow-xs"
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
                <div className="pt-2 border-t border-emerald-200/50">
                  <div className="text-[11px] font-semibold text-emerald-900 mb-1.5">
                    Real Form Input Fields in Template:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Job Number",
                      "Billing Client *",
                      "Origin Location *",
                      "Destination Location *",
                      "Date of Job Creation *",
                      "Scheduled Dispatch Date",
                      "Consigner *",
                      "Consignee *",
                      "Cargo Description",
                      "Estimated Weight",
                      "Total Packages",
                    ].map((f) => (
                      <span
                        key={f}
                        className="text-[10px] bg-white/90 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium shadow-2xs"
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
                  <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Step 2: Upload Your Filled Spreadsheet
                  </h4>
                  <span className="text-[11px] text-slate-400">Supports .xlsx, .xls, .csv</span>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                      : selectedFile
                      ? "border-emerald-400 bg-emerald-50/20"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
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
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-xs sm:max-w-md">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop another to replace
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        Drag and drop your spreadsheet here, or <span className="text-blue-600 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Excel format with required Consigner, Consignee, and Route
                      </p>
                    </div>
                  )}
                </div>

                {/* Step 3: Prefix/Postfix Series Formatting Option */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Step 3: Document Number Series Formatting
                    </h4>
                    <span className="text-[11px] text-slate-400">Choose prefix/postfix handling</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: With Series Prefix & Postfix */}
                    <div
                      onClick={() => setApplySeriesPrefixSuffix(true)}
                      className={`relative rounded-xl border p-3.5 cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        applySeriesPrefixSuffix
                          ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            applySeriesPrefixSuffix ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {applySeriesPrefixSuffix && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                            With Prefix & Postfix
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              Recommended
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Applies Series Master prefix and postfix to all imported jobs (e.g. sequence{" "}
                            <span className="font-semibold text-slate-700">50</span> will be saved as{" "}
                            <span className="font-semibold text-emerald-800">
                              {seriesInfo?.prefix || "job-"}50{seriesInfo?.suffix || "-2026"}
                            </span>
                            ).
                          </p>
                        </div>
                      </div>
                      {seriesInfo && (seriesInfo.prefix || seriesInfo.suffix) && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-100/80 flex items-center justify-between text-[10px] text-slate-500">
                          <span>Prefix: <strong className="text-slate-800">{seriesInfo.prefix || "(None)"}</strong></span>
                          <span>Postfix: <strong className="text-slate-800">{seriesInfo.suffix || "(None)"}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Option B: Without Series Prefix & Postfix */}
                    <div
                      onClick={() => setApplySeriesPrefixSuffix(false)}
                      className={`relative rounded-xl border p-3.5 cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                        !applySeriesPrefixSuffix
                          ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                            !applySeriesPrefixSuffix ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {!applySeriesPrefixSuffix && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-slate-900">
                            Without Prefix & Postfix
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Save exact job numbers as written in Excel without adding series prefix or postfix (e.g. sequence{" "}
                            <span className="font-semibold text-slate-700">50</span> stays{" "}
                            <span className="font-semibold text-slate-800">50</span>).
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        Imports exact raw sequence from file
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duplicacy Protection Feature Notice */}
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-100/70 border border-slate-200 text-slate-600 text-xs">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">Zero Duplication Guarantee: </span>
                    Both duplicates repeated within the Excel sheet and matching active orders already in the database will be automatically identified and safely skipped without interrupting remaining valid imports.
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs animate-in fade-in">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Enhanced Results Screen with Comprehensive Reporting & Audit Download */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Missing Headers Critical Alert Banner */}
              {importResult.missing_headers && importResult.missing_headers.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    Missing Required Columns in Spreadsheet Header
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    The uploaded spreadsheet could not be imported because the header row is missing the following mandatory columns:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {importResult.missing_headers.map((col) => (
                      <span
                        key={col}
                        className="px-2.5 py-1 rounded-md text-xs font-bold bg-white text-rose-800 border border-rose-300 shadow-2xs"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      disabled={isDownloadingTemplate}
                      className="bg-white border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download Correct Template (.xlsx)
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Summary Banner */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  importResult.imported_count > 0 && importResult.failed_count === 0 && importResult.skipped_duplicate_count === 0
                    ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                    : importResult.imported_count > 0
                    ? "bg-amber-50/80 border-amber-200 text-amber-900"
                    : "bg-rose-50/80 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-start sm:items-center gap-2.5">
                  {importResult.imported_count > 0 && importResult.failed_count === 0 && importResult.skipped_duplicate_count === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : importResult.imported_count > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <span>
                        {importResult.summary_report?.status === "COMPLETED" || (importResult.imported_count > 0 && importResult.failed_count === 0 && importResult.skipped_duplicate_count === 0)
                          ? "Import Completed Successfully"
                          : importResult.imported_count > 0
                          ? "Partial Import Completed"
                          : "Import Failed"}
                      </span>
                      {importResult.summary_report?.success_rate_percent !== undefined && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-current">
                          {importResult.summary_report.success_rate_percent}% Success
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">
                      {importResult.summary_report?.execution_summary ||
                        `Processed ${importResult.total_rows} rows: ${importResult.imported_count} imported, ${importResult.skipped_duplicate_count} skipped duplicates, ${importResult.failed_count} errors.`}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAuditReport}
                  className="shrink-0 bg-white border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-medium shadow-2xs self-start sm:self-center"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Download Audit Report (.txt)
                </Button>
              </div>

              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
                  <div className="text-[11px] font-medium text-slate-500">Total Rows</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {importResult.total_rows}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-center">
                  <div className="text-[11px] font-medium text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Created Jobs
                  </div>
                  <div className="text-xl font-bold text-emerald-800 mt-0.5">
                    {importResult.imported_count}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-center">
                  <div className="text-[11px] font-medium text-amber-700 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Skipped Duplicates
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-0.5">
                    {importResult.skipped_duplicate_count}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70 text-center">
                  <div className="text-[11px] font-medium text-rose-700 flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Errors &amp; Exceptions
                  </div>
                  <div className="text-xl font-bold text-rose-800 mt-0.5">
                    {importResult.failed_count}
                  </div>
                </div>
              </div>

              {/* Categorized Tab Bar */}
              <div className="flex border-b border-slate-200 gap-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer ${
                    activeTab === "overview"
                      ? "border-emerald-600 text-emerald-700 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  All Overview
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("created")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "created"
                      ? "border-emerald-600 text-emerald-700 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Created Jobs
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                    {importResult.imported_count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("skipped")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "skipped"
                      ? "border-amber-600 text-amber-700 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Skipped Duplicates
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                    {importResult.skipped_duplicate_count}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("errors")}
                  className={`px-3 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "errors"
                      ? "border-rose-600 text-rose-700 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Errors &amp; Exceptions
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
                    {importResult.failed_count}
                  </span>
                </button>
              </div>

              {/* Tab 1: Overview (All) */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  {/* Skipped Duplicates Preview */}
                  {importResult.skipped_duplicate_count > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Skipped Duplicate Orders ({importResult.skipped_duplicates.length})
                        </h5>
                        <span className="text-[11px] text-amber-700">Protected against double-entry</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto border border-amber-200 rounded-lg bg-amber-50/30 divide-y divide-amber-200/60">
                        {importResult.skipped_duplicates.map((dup, idx) => (
                          <div key={idx} className="p-2.5 text-xs flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800">
                                Row {dup.row}: {dup.job_number && dup.job_number !== "AUTO" ? `Job #${dup.job_number}` : "Trip Order"}
                              </span>
                              <p className="text-slate-600">{dup.reason}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60">
                              {dup.duplicate_type === "DATABASE_DUPLICATE" ? "DB Existing" : "File Repeated"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed / Error Rows Preview */}
                  {importResult.failed_count > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        Exceptions &amp; Failed Rows ({importResult.errors.length})
                      </h5>
                      <div className="max-h-36 overflow-y-auto border border-rose-200 rounded-lg bg-rose-50/30 divide-y divide-rose-200/60">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="p-2.5 text-xs flex items-start justify-between gap-3 text-rose-800">
                            <div>
                              <span className="font-semibold">Row {err.row}: </span>
                              {err.field && <span className="font-medium text-rose-900">[{err.field}] </span>}
                              <span className="text-rose-700">{err.reason}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Imported Jobs Preview */}
                  {importResult.imported_count > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Successfully Created Jobs ({importResult.imported_jobs.length})
                      </h5>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50/50 divide-y divide-slate-100">
                        {importResult.imported_jobs.map((job) => (
                          <div key={job.id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {job.job_number}
                              </span>
                              <span className="text-slate-700 font-medium truncate max-w-[180px] sm:max-w-[260px]">
                                {job.consigner} → {job.consignee}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px] shrink-0">
                              {job.origin} to {job.destination} • {job.dispatch_date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Created Jobs Full View */}
              {activeTab === "created" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>All {importResult.imported_jobs.length} created transport jobs</span>
                  </div>
                  {importResult.imported_jobs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border rounded-xl border-dashed">
                      No jobs were created in this import batch.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                      {importResult.imported_jobs.map((job) => (
                        <div key={job.id} className="p-3 text-xs flex items-center justify-between gap-3 hover:bg-slate-50">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {job.job_number}
                            </span>
                            <div className="text-slate-700 font-medium">
                              {job.consigner} → {job.consignee} ({job.origin} to {job.destination})
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-slate-500 shrink-0">
                            <div>Dispatch: {job.dispatch_date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Skipped Duplicates Full View */}
              {activeTab === "skipped" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Duplicates skipped to protect against double-entry and sequence conflicts</span>
                  </div>
                  {importResult.skipped_duplicates.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border rounded-xl border-dashed">
                      Zero duplicate trip orders encountered.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-amber-200 rounded-xl bg-amber-50/20 divide-y divide-amber-200/60">
                      {importResult.skipped_duplicates.map((dup, idx) => (
                        <div key={idx} className="p-3 text-xs space-y-1 hover:bg-amber-50/50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-[10px] font-mono">
                                Row {dup.row}
                              </span>
                              {dup.job_number && dup.job_number !== "AUTO" ? `Job #${dup.job_number}` : "Trip Order"}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/60">
                              {dup.duplicate_type === "DATABASE_DUPLICATE" ? "Database Existing" : "Excel File Repeated"}
                            </span>
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed">{dup.reason}</p>
                          {(dup.route || dup.dispatch_date) && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-3 pt-0.5">
                              {dup.route && <span>Route: {dup.route}</span>}
                              {dup.dispatch_date && <span>Date: {dup.dispatch_date}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Errors & Exceptions Full View */}
              {activeTab === "errors" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Specific data formatting or validation errors encountered</span>
                  </div>
                  {importResult.errors.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border rounded-xl border-dashed">
                      Zero errors or exceptions encountered.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-rose-200 rounded-xl bg-rose-50/20 divide-y divide-rose-200/60">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="p-3 text-xs space-y-1 hover:bg-rose-50/50">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-rose-900 flex items-center gap-2">
                              <span className="px-1.5 py-0.2 rounded bg-rose-200/70 text-[10px] font-mono text-rose-900">
                                Row {err.row}
                              </span>
                              {err.field ? `Field: ${err.field}` : (err.column ? `Column: ${err.column}` : (err.job_number ? `Job #${err.job_number}` : "Data Error"))}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300/60">
                              Exception
                            </span>
                          </div>
                          <p className="text-rose-700 text-xs leading-relaxed">{err.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          {!importResult ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseAndFinish}
                disabled={isUploading}
                className="text-slate-600 hover:text-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 shadow-xs"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Validating &amp; Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1.5" />
                    Import Jobs from File
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportResult(null);
                    setSelectedFile(null);
                    setActiveTab("overview");
                  }}
                  className="text-slate-700 hover:bg-slate-100 border-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Import Another File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAuditReport}
                  className="text-slate-700 hover:bg-slate-100 border-slate-300 hidden sm:inline-flex"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Audit Report (.txt)
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleCloseAndFinish}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 shadow-xs"
              >
                Done &amp; View Trips
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
