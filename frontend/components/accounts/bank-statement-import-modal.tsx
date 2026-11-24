"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  Building2,
  CreditCard,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { BankStatementReviewQueue } from "@/components/accounts/bank-statement-review-queue";

interface BankAccountOption {
  id: number;
  bank_name: string;
  account_type: string;
  account_number_masked: string;
  account_number?: string;
  ifsc_code: string;
  current_balance: number | string;
  balance_type?: string;
  is_active: boolean;
}

interface BankStatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (importData: any) => void;
  defaultBankAccountId?: number;
  targetVoucherType?: "PAYMENT" | "RECEIPT";
}

export function BankStatementImportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultBankAccountId,
  targetVoucherType = "PAYMENT",
}: BankStatementImportModalProps) {
  const [view, setView] = useState<"upload" | "review">("upload");
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>(
    defaultBankAccountId ? String(defaultBankAccountId) : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Review Session
  const [activeImportData, setActiveImportData] = useState<any | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts();
      checkForExistingSession();
      setErrorMessage(null);
      setFile(null);
    } else {
      setActiveImportData(null);
      setView("upload");
    }
  }, [isOpen]);

  async function loadBankAccounts() {
    try {
      const res = await apiClient<BankAccountOption[]>("/api/v1/accounts/bank-accounts?is_active=true");
      setBankAccounts(res);
      if (!selectedBankId && res.length > 0) {
        setSelectedBankId(String(res[0].id));
      }
    } catch (err: any) {
      console.error("Failed to load bank accounts:", err);
    }
  }

  async function checkForExistingSession() {
    try {
      setIsLoadingSession(true);
      const imports = await apiClient<any[]>("/api/v1/accounts/bank-statements");
      const inReview = imports?.find((i) => i.status === "IN_REVIEW");
      if (inReview) {
        // Fetch full import with lines
        await loadImportSession(inReview.id);
      } else {
        setView("upload");
      }
    } catch {
      // Default to upload
      setView("upload");
    } finally {
      setIsLoadingSession(false);
    }
  }

  async function loadImportSession(importId: number) {
    try {
      setIsLoadingSession(true);
      const fullImport = await apiClient<any>(`/api/v1/accounts/bank-statements/${importId}`);
      setActiveImportData(fullImport);
      setView("review");
    } catch (err: any) {
      const msg = err?.detail || err?.message || "Failed to load import session.";
      toast.error(msg);
      setView("upload");
    } finally {
      setIsLoadingSession(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const ext = f.name.toLowerCase();
      if (!ext.endsWith(".xls") && !ext.endsWith(".xlsx") && !ext.endsWith(".csv")) {
        setErrorMessage("Invalid file format. Please upload an Excel (.xls / .xlsx) or CSV (.csv) file.");
        setFile(null);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        setErrorMessage("File exceeds 5 MB limit. Please upload a smaller file.");
        setFile(null);
        return;
      }
      setErrorMessage(null);
      setFile(f);
    }
  }

  async function handleUpload() {
    if (!selectedBankId) {
      setErrorMessage("Please select a bank account before uploading.");
      return;
    }
    if (!file) {
      setErrorMessage("Please select a statement file to upload.");
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("bank_account_id", selectedBankId);
    formData.append("file", file);

    try {
      const res = await apiClient<any>("/api/v1/accounts/bank-statements/import", {
        method: "POST",
        body: formData,
      });
      toast.success(
        `Imported ${res.total_lines} transactions (${res.ready_count} ready, ${res.needs_decision_count} needs decision).`
      );
      // Immediately load the imported lines and switch to review view
      await loadImportSession(res.id);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      const detail = err?.detail || err?.message || "Failed to import bank statement.";
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setIsUploading(false);
    }
  }

  if (!isOpen) return null;

  const selectedAccount = bankAccounts.find((b) => String(b.id) === selectedBankId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`relative w-full bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          view === "review"
            ? "max-w-6xl max-h-[92vh] h-[92vh]"
            : "max-w-xl max-h-[90vh]"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#26262B] shrink-0 bg-slate-50/60 dark:bg-[#141417]">
          <div className="flex items-center gap-3">
            {view === "review" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("upload")}
                className="text-xs h-8 px-2.5 gap-1.5 dark:bg-[#1F202B] dark:border-[#2B2D3D]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Upload New
              </Button>
            ) : (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                <UploadCloud className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {view === "review" ? (
                  <>
                    <span>Bank Statement Review Queue</span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      ({targetVoucherType === "PAYMENT" ? "Money Out → Payment Vouchers" : "Money In → Receipt Vouchers"})
                    </span>
                  </>
                ) : (
                  <span>Import Bank Statement (Auto BRS)</span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {view === "review"
                  ? "Match parties, confirm bill allocations, and post balanced double-entry vouchers without guessing"
                  : "Upload statement to match parties and create balanced vouchers"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === "upload" && activeImportData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView("review")}
                className="text-xs h-8 gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900"
              >
                Resume Review ({activeImportData.file_name})
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202024]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isLoadingSession ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Loading bank statement review queue...
            </p>
          </div>
        ) : view === "review" && activeImportData ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30 dark:bg-transparent">
            <BankStatementReviewQueue
              importData={activeImportData}
              onRefresh={() => loadImportSession(activeImportData.id)}
              directionFilter={targetVoucherType === "PAYMENT" ? "DR" : "CR"}
            />
          </div>
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Step 0 Requirement 1: Company (Fixed, not changeable) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Company (Locked)
              </label>
              <div className="w-full bg-slate-50 dark:bg-[#121215] border border-slate-200 dark:border-[#28282D] rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>PANTHER LOGISTICS PRIVATE LIMITED</span>
                <span className="text-[11px] bg-slate-200 dark:bg-[#202024] px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">
                  Current Company
                </span>
              </div>
            </div>

            {/* Step 0 Requirement 2: Bank Account (Mandatory Dropdown) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Bank Account *
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => {
                  setSelectedBankId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full bg-white dark:bg-[#101013] border border-slate-300 dark:border-[#333339] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-[#F5F5F7] font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
              >
                <option value="" disabled>
                  -- Select Bank Account to Reconcile --
                </option>
                {bankAccounts.map((b) => {
                  const last4 = b.account_number_masked.slice(-4);
                  const bal = formatCurrency(Number(b.current_balance || 0));
                  return (
                    <option key={b.id} value={b.id}>
                      {b.bank_name} — {b.account_type} — ...{last4} — {b.ifsc_code} — Balance {bal}
                    </option>
                  );
                })}
              </select>
              {selectedAccount && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Selected: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedAccount.bank_name}</span> (...{selectedAccount.account_number_masked.slice(-4)}). All vouchers created will have Pay From / Receive In locked to this bank.
                </p>
              )}
            </div>

            {/* Step 0 Requirement 3: Statement File */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Upload Statement File *
              </label>
              <div className="relative border-2 border-dashed border-slate-300 dark:border-[#333339] rounded-2xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-[#1E1E24]/30 transition-colors">
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <FileSpreadsheet className="w-8 h-8 text-indigo-500 mb-1" />
                  {file ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB — Click to change file
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Drop statement file here or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Supports ICICI, HDFC, SBI (.xls, .xlsx, .csv) — Max 1,000 rows / 5 MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-semibold">Import Rejected</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Safety Notice */}
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex items-start gap-2 text-indigo-900 dark:text-indigo-300 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Auto-Post Guarantee:</strong> Import creates a review queue. No voucher is ever created or posted until you confirm it. Duplicate lines and overlapping files are automatically detected.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-[#26262B]">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedBankId || !file || isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {isUploading ? "Verifying & Parsing..." : "Upload & Review Statement"}
              </Button>
            </div>
          </div>
        )}

        {/* Review View Footer */}
        {view === "review" && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-[#26262B] bg-slate-50 dark:bg-[#141417] shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Locked to {activeImportData?.bank_name} (...{activeImportData?.account_number_masked})
            </span>
            <Button
              size="sm"
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs h-8 px-4 font-medium"
            >
              Done & Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
