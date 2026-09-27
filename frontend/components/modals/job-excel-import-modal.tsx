"use client";

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient, getApiBaseUrl } from "@/lib/api-client";
import { getStoredAuth } from "@/lib/auth";

interface SkippedDuplicate {
  row: number;
  job_number?: string;
  reason: string;
  duplicate_type?: string;
}

interface RowError {
  row: number;
  job_number?: string;
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

interface JobExcelImportResult {
  total_rows: number;
  imported_count: number;
  skipped_duplicate_count: number;
  failed_count: number;
  skipped_duplicates: SkippedDuplicate[];
  errors: RowError[];
  imported_jobs: ImportedJob[];
}

interface JobExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function JobExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
}: JobExcelImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<JobExcelImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImportResult(null);
      setUploadError(null);
      setIsUploading(false);
    }
  }, [isOpen]);

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
      alert(err.message || "Failed to download template.");
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

      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await apiClient<JobExcelImportResult>(
        "/api/v1/transport/jobs/import-excel",
        {
          method: "POST",
          body: formData,
        }
      );

      setImportResult(result);
      if (result.imported_count > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setUploadError(err.message || "An unexpected error occurred during Excel import.");
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
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
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
            /* Results Screen */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-center">
                  <div className="text-xs font-medium text-slate-500">Total Rows</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {importResult.total_rows}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-center">
                  <div className="text-xs font-medium text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Imported
                  </div>
                  <div className="text-xl font-bold text-emerald-800 mt-1">
                    {importResult.imported_count}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-center">
                  <div className="text-xs font-medium text-amber-700 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Skipped Dups
                  </div>
                  <div className="text-xl font-bold text-amber-800 mt-1">
                    {importResult.skipped_duplicate_count}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 text-center">
                  <div className="text-xs font-medium text-rose-700 flex items-center justify-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Errors
                  </div>
                  <div className="text-xl font-bold text-rose-800 mt-1">
                    {importResult.failed_count}
                  </div>
                </div>
              </div>

              {/* Skipped Duplicates Section */}
              {importResult.skipped_duplicate_count > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Skipped Duplicate Orders ({importResult.skipped_duplicates.length})
                    </h5>
                    <span className="text-[11px] text-amber-700">Protected against double-entry</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-amber-200 rounded-lg bg-amber-50/30 divide-y divide-amber-200/60">
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

              {/* Failed / Error Rows Section */}
              {importResult.failed_count > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Failed Rows ({importResult.errors.length})
                  </h5>
                  <div className="max-h-36 overflow-y-auto border border-rose-200 rounded-lg bg-rose-50/30 divide-y divide-rose-200/60">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-center justify-between gap-3 text-rose-800">
                        <span className="font-semibold">Row {err.row}:</span>
                        <span className="text-rose-700 flex-1">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imported Jobs List */}
              {importResult.imported_count > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Successfully Created Jobs ({importResult.imported_jobs.length})
                  </h5>
                  <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50/50 divide-y divide-slate-100">
                    {importResult.imported_jobs.map((job) => (
                      <div key={job.id} className="p-2.5 text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {job.job_number}
                          </span>
                          <span className="text-slate-700 font-medium truncate max-w-[200px]">
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
                    Validating & Importing...
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportResult(null);
                  setSelectedFile(null);
                }}
                className="text-slate-700 hover:bg-slate-100 border-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Import Another File
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCloseAndFinish}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 shadow-xs"
              >
                Done & View Trips
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
