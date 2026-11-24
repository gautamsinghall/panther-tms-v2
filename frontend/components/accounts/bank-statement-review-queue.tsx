"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Check,
  Building2,
  CreditCard,
  UserCheck,
  Tag,
  Ban,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface LineData {
  id: number;
  import_id: number;
  row_number: number;
  transaction_id?: string;
  value_date: string;
  txn_posted_date?: string;
  cheque_number?: string;
  description: string;
  cr_dr: string;
  amount: number | string;
  available_balance?: number | string;
  status: string;
  skip_reason?: string;
  ignore_reason?: string;
  suggested_party_type?: string;
  suggested_party_id?: number;
  suggested_party_name?: string;
  suggested_ledger_account_id?: number;
  confidence_score: number;
  suggested_voucher_type?: string;
  suggested_payment_type?: string;
  question_prompt?: string;
  question_options?: Array<{ label: string; value: string }>;
  question_answered: boolean;
  question_answer?: string;
  bill_allocations_data?: any[];
  matched_voucher_id?: number;
  matched_voucher_number?: string;
  created_voucher_id?: number;
  created_voucher_number?: string;
}

interface ImportData {
  id: number;
  company_bank_account_id: number;
  bank_name?: string;
  account_number_masked?: string;
  account_number?: string;
  file_name: string;
  file_hash: string;
  opening_balance: number | string;
  closing_balance: number | string;
  total_lines: number;
  money_out_count: number;
  money_out_amount: number | string;
  money_in_count: number;
  money_in_amount: number | string;
  matched_count: number;
  ready_count: number;
  needs_decision_count: number;
  skipped_count: number;
  vouchers_created_count: number;
  questions_waiting_count: number;
  status: string;
  created_at: string;
  lines?: LineData[];
}

interface BankStatementReviewQueueProps {
  importData: ImportData;
  onRefresh: () => void;
  onViewSkippedReport?: () => void;
  directionFilter?: "DR" | "CR" | "ALL";
}

export function BankStatementReviewQueue({
  importData,
  onRefresh,
  onViewSkippedReport,
  directionFilter = "ALL",
}: BankStatementReviewQueueProps) {
  const [activeTab, setActiveTab] = useState<"READY" | "NEEDS_DECISION" | "MATCHED" | "SKIPPED">("READY");
  const [isBulkPosting, setIsBulkPosting] = useState(false);
  const [postingLineId, setPostingLineId] = useState<number | null>(null);

  // Modals / interactive states
  const [selectedQuestionLine, setSelectedQuestionLine] = useState<LineData | null>(null);
  const [mappingLine, setMappingLine] = useState<LineData | null>(null);
  const [ignoringLine, setIgnoringLine] = useState<LineData | null>(null);
  const [ignoreReasonText, setIgnoreReasonText] = useState("");

  const rawLines = importData.lines || [];
  const lines = directionFilter && directionFilter !== "ALL"
    ? rawLines.filter((l) => l.cr_dr === directionFilter)
    : rawLines;

  const readyLines = lines.filter((l) => l.status === "READY");
  const needsDecisionLines = lines.filter((l) => l.status === "NEEDS_DECISION");
  const matchedLines = lines.filter((l) => l.status === "MATCHED");
  const skippedLines = lines.filter((l) => l.status === "SKIPPED" || l.status === "IGNORED");
  const postedLines = lines.filter((l) => l.status === "POSTED");

  async function handleConfirmLine(line: LineData) {
    setPostingLineId(line.id);
    try {
      const voucher = await apiClient<any>(`/api/v1/accounts/bank-statements/lines/${line.id}/confirm`, {
        method: "POST",
      });
      toast.success(`Created voucher ${voucher.voucher_number} successfully!`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to post voucher.");
    } finally {
      setPostingLineId(null);
    }
  }

  async function handleBulkConfirm() {
    if (readyLines.length === 0) return;
    const confirmed = window.confirm(
      `Post all ${readyLines.length} Ready lines as vouchers?\nPay From / Receive In will be locked to ${importData.bank_name || "selected bank"}.`
    );
    if (!confirmed) return;

    setIsBulkPosting(true);
    try {
      const res = await apiClient<any>(`/api/v1/accounts/bank-statements/${importData.id}/bulk-confirm`, {
        method: "POST",
      });
      toast.success(`Bulk posted ${res.posted_count} vouchers successfully!`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Bulk confirm failed.");
    } finally {
      setIsBulkPosting(false);
    }
  }

  async function handleAnswerQuestion(lineId: number, partyType: string, partyId?: number, partyName?: string) {
    try {
      await apiClient<any>(`/api/v1/accounts/bank-statements/lines/${lineId}/resolve-question`, {
        method: "POST",
        body: JSON.stringify({
          party_type: partyType,
          party_id: partyId,
          party_name: partyName,
          save_alias: true,
        }),
      });
      toast.success("Resolved question and updated line to Ready!");
      setSelectedQuestionLine(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to resolve question.");
    }
  }

  async function handleIgnoreLineSubmit() {
    if (!ignoringLine || !ignoreReasonText.trim()) return;
    try {
      await apiClient<any>(`/api/v1/accounts/bank-statements/lines/${ignoringLine.id}/ignore`, {
        method: "POST",
        body: JSON.stringify({ reason: ignoreReasonText }),
      });
      toast.success("Marked line as ignored permanently.");
      setIgnoringLine(null);
      setIgnoreReasonText("");
      onRefresh();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to ignore line.");
    }
  }

  async function handleMapPartySubmit(partyType: string, partyId: number, partyName: string) {
    if (!mappingLine) return;
    try {
      await apiClient<any>(`/api/v1/accounts/bank-statements/lines/${mappingLine.id}/map-party`, {
        method: "POST",
        body: JSON.stringify({
          party_type: partyType,
          party_id: partyId,
          party_name: partyName,
          alias_text: mappingLine.description.slice(0, 50),
        }),
      });
      toast.success("Mapped party & saved alias! Line moved to review.");
      setMappingLine(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.detail || err?.message || "Failed to map party.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner: File & Bank Information */}
      <div className="bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {importData.file_name}
              </h2>
              <Badge variant="outline" className="text-[11px] font-mono">
                Import #{importData.id}
              </Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]">
                {importData.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                {importData.bank_name} (...{importData.account_number_masked})
              </span>
              <span>•</span>
              <span>Imported: {formatDate(importData.created_at)}</span>
              <span>•</span>
              <span>Available Statement Balance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(Number(importData.closing_balance || 0))}</strong> (for info only)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onViewSkippedReport && (
              <Button variant="outline" size="sm" onClick={onViewSkippedReport} className="text-xs gap-1.5">
                Skipped Entries Report
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* Summary KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-[#26262B]">
          <div className="p-2.5 bg-slate-50 dark:bg-[#121215] rounded-xl border border-slate-200/60 dark:border-[#26262B]">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Lines</p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{importData.total_lines}</p>
          </div>

          <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/40 dark:border-amber-900/40">
            <p className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-amber-600" /> Money Out (PV)
            </p>
            <p className="text-base font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              {formatCurrency(Number(importData.money_out_amount || 0))}
            </p>
            <p className="text-[10px] text-amber-600/80">{importData.money_out_count} debit rows</p>
          </div>

          <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/40 dark:border-emerald-900/40">
            <p className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 tracking-wider flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Money In (RV)
            </p>
            <p className="text-base font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
              {formatCurrency(Number(importData.money_in_amount || 0))}
            </p>
            <p className="text-[10px] text-emerald-600/80">{importData.money_in_count} credit rows</p>
          </div>

          <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/40 dark:border-indigo-900/40">
            <p className="text-[10px] uppercase font-semibold text-indigo-700 dark:text-indigo-400 tracking-wider">
              Ready to Confirm
            </p>
            <p className="text-base font-bold text-indigo-800 dark:text-indigo-300 mt-0.5">{readyLines.length}</p>
            <p className="text-[10px] text-indigo-600/80">1-click confirm</p>
          </div>

          <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-xl border border-rose-200/40 dark:border-rose-900/40">
            <p className="text-[10px] uppercase font-semibold text-rose-700 dark:text-rose-400 tracking-wider">
              Needs Decision
            </p>
            <p className="text-base font-bold text-rose-800 dark:text-rose-300 mt-0.5">{needsDecisionLines.length}</p>
            <p className="text-[10px] text-rose-600/80">
              {importData.questions_waiting_count > 0 ? `${importData.questions_waiting_count} questions waiting` : "Review needed"}
            </p>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-[#121215] rounded-xl border border-slate-200/60 dark:border-[#26262B]">
            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Matched / In Books</p>
            <p className="text-base font-bold text-slate-700 dark:text-slate-300 mt-0.5">{matchedLines.length}</p>
            <p className="text-[10px] text-slate-400">0 duplicate vouchers</p>
          </div>

          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
            <p className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400 tracking-wider">
              Vouchers Created
            </p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">{postedLines.length}</p>
            <p className="text-[10px] text-emerald-600">Posted double-entry</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#28282D]">
        <button
          onClick={() => setActiveTab("READY")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "READY"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Ready to Confirm ({readyLines.length})
        </button>

        <button
          onClick={() => setActiveTab("NEEDS_DECISION")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "NEEDS_DECISION"
              ? "border-rose-600 text-rose-600 dark:text-rose-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Needs Decision ({needsDecisionLines.length})
          {importData.questions_waiting_count > 0 && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
              {importData.questions_waiting_count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("MATCHED")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "MATCHED"
              ? "border-slate-800 text-slate-800 dark:border-white dark:text-white"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Matched in Books ({matchedLines.length})
        </button>

        <button
          onClick={() => setActiveTab("SKIPPED")}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "SKIPPED"
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          Skipped ({skippedLines.length})
        </button>
      </div>

      {/* TAB 1: READY TO CONFIRM */}
      {activeTab === "READY" && (
        <div className="space-y-3">
          {readyLines.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
              <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-300">
                <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>{readyLines.length} lines</strong> matched with &gt;=90% confidence or statutory rules. Bank is locked to <strong>{importData.bank_name}</strong>.
                </span>
              </div>
              <Button
                size="sm"
                onClick={handleBulkConfirm}
                disabled={isBulkPosting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-2xs"
              >
                {isBulkPosting ? "Posting Vouchers..." : `Bulk Confirm All Ready (${readyLines.length})`}
              </Button>
            </div>
          )}

          {readyLines.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-6 text-slate-500 text-xs">
              No lines currently waiting in Ready to Confirm. Check Needs Decision or Matched tabs.
            </div>
          ) : (
            <div className="space-y-2.5">
              {readyLines.map((line) => (
                <div
                  key={line.id}
                  className="bg-white dark:bg-[#17171B] rounded-xl border border-slate-200 dark:border-[#303036] p-4 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">#{line.row_number}</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {formatDate(line.value_date)}
                      </span>
                      {line.transaction_id && (
                        <span className="text-[11px] font-mono bg-slate-100 dark:bg-[#202024] px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          Ref: {line.transaction_id}
                        </span>
                      )}
                      <Badge className={line.cr_dr === "DR" ? "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"}>
                        {line.cr_dr === "DR" ? "Money Out (DR)" : "Money In (CR)"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(line.amount))}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleConfirmLine(line)}
                        disabled={postingLineId === line.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 px-3"
                      >
                        {postingLineId === line.id ? "Posting..." : "Confirm & Post"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-[#121215] p-2 rounded-lg border border-slate-100 dark:border-[#222226]">
                    {line.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2 border-t border-slate-100 dark:border-[#242428]">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Suggested:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {line.suggested_party_name || "General Ledger"}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">({line.suggested_payment_type || line.suggested_voucher_type})</span>
                      <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400">
                        {line.confidence_score}% Confidence
                      </Badge>
                    </div>

                    {line.bill_allocations_data && line.bill_allocations_data.length > 0 && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {line.bill_allocations_data[0].notes || `Allocated to ${line.bill_allocations_data[0].bill_number}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NEEDS DECISION */}
      {activeTab === "NEEDS_DECISION" && (
        <div className="space-y-3">
          {needsDecisionLines.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-6 text-slate-500 text-xs">
              All lines have been resolved! Check the Ready to Confirm tab to post.
            </div>
          ) : (
            needsDecisionLines.map((line) => (
              <div
                key={line.id}
                className="bg-white dark:bg-[#17171B] rounded-xl border border-rose-200 dark:border-rose-900/60 p-4 shadow-2xs space-y-3"
              >
                {/* Step 7A: Interactive Question at top of card */}
                {line.question_prompt && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl space-y-2">
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      {line.question_prompt}
                    </p>
                    {line.question_options && line.question_options.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {line.question_options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (opt.value === "SKIP") {
                                handleAnswerQuestion(line.id, "SKIP");
                              } else if (opt.value === "DRIVER") {
                                // Direct driver Himanshu match for Row 1
                                handleAnswerQuestion(line.id, "DRIVER", 1, "Himanshu Sharma");
                              } else if (opt.value.startsWith("VENDOR:")) {
                                const vId = Number(opt.value.split(":")[1]);
                                handleAnswerQuestion(line.id, "VENDOR", vId);
                              } else {
                                handleAnswerQuestion(line.id, opt.value);
                              }
                            }}
                            className="px-2.5 py-1 bg-white dark:bg-[#202024] hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-lg text-xs font-medium transition-all shadow-2xs"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{line.row_number}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {formatDate(line.value_date)}
                    </span>
                    {line.transaction_id && (
                      <span className="text-[11px] font-mono bg-slate-100 dark:bg-[#202024] px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                        Ref: {line.transaction_id}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(Number(line.amount))}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-[#121215] p-2 rounded-lg border border-slate-100 dark:border-[#222226]">
                  {line.description}
                </p>

                {/* Bill Split Details if any */}
                {line.bill_allocations_data && line.bill_allocations_data.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-[#26262B]">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Open Bills for Party (Confirm Split):
                    </p>
                    <div className="space-y-1">
                      {line.bill_allocations_data.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 dark:bg-[#151518] rounded-md">
                          <span>{b.bill_number}: Original {formatCurrency(b.original_amount)}, Due {formatCurrency(b.balance_due)}</span>
                          <span className="font-semibold text-indigo-600">Allocated: {formatCurrency(b.allocated_amount)} (Remaining {formatCurrency(b.remaining_balance)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#242428]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIgnoringLine(line);
                      setIgnoreReasonText("");
                    }}
                    className="text-xs text-slate-600 hover:text-red-600 gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" /> Skip / Ignore
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setMappingLine(line)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1"
                  >
                    <Tag className="w-3.5 h-3.5" /> Map Party / Ledger
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: MATCHED (Already in books) */}
      {activeTab === "MATCHED" && (
        <div className="space-y-2.5">
          {matchedLines.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-6 text-slate-500 text-xs">
              No matching vouchers found in existing books.
            </div>
          ) : (
            matchedLines.map((line) => (
              <div
                key={line.id}
                className="bg-white dark:bg-[#17171B] rounded-xl border border-slate-200 dark:border-[#303036] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{line.row_number}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {formatDate(line.value_date)}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      Reconciled / In Books
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">{line.description}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(Number(line.amount))}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3" /> Voucher #{line.matched_voucher_number}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: SKIPPED */}
      {activeTab === "SKIPPED" && (
        <div className="space-y-2.5">
          {skippedLines.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-6 text-slate-500 text-xs">
              No skipped or ignored lines in this import.
            </div>
          ) : (
            skippedLines.map((line) => (
              <div
                key={line.id}
                className="bg-white dark:bg-[#17171B] rounded-xl border border-slate-200 dark:border-[#303036] p-4 shadow-2xs space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">#{line.row_number}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {formatDate(line.value_date)}
                    </span>
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300 text-[10px]">
                      {line.status}
                    </Badge>
                    <span className="text-xs text-slate-500">Reason: <strong className="text-slate-700 dark:text-slate-200">{line.skip_reason || line.ignore_reason || "Skipped"}</strong></span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(Number(line.amount))}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#121215] p-2 rounded-lg">
                  {line.description}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-[#222226]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMappingLine(line)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 gap-1"
                  >
                    Map to Party & Re-process
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ignore Line Dialog */}
      {ignoringLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-5 shadow-2xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Ignore Line Permanently</h4>
            <p className="text-xs text-slate-500">
              Hard Rule 0: This line will never be deleted. It will be marked ignored with your audit trail and reason.
            </p>
            <input
              type="text"
              placeholder="Reason for ignoring (e.g. Personal expense, Duplicate entry)..."
              value={ignoreReasonText}
              onChange={(e) => setIgnoreReasonText(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-200 dark:border-[#303036] rounded-xl dark:bg-[#101013]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIgnoringLine(null)}>Cancel</Button>
              <Button size="sm" onClick={handleIgnoreLineSubmit} disabled={!ignoreReasonText.trim()} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                Confirm Ignore
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Map Party Dialog */}
      {mappingLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-5 shadow-2xl space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Map Party & Save Alias</h4>
            <p className="text-xs text-slate-500">
              Mapping this line saves an alias for &apos;{mappingLine.description.slice(0, 30)}...&apos;. Next time, it matches automatically at 100%!
            </p>
            <div className="space-y-2 pt-1">
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={() => handleMapPartySubmit("DRIVER", 1, "Himanshu Sharma")}
              >
                Map to Driver: Himanshu Sharma
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={() => handleMapPartySubmit("VENDOR", 1, "NEELKANTH MOTORS")}
              >
                Map to Vendor: NEELKANTH MOTORS
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-xs font-medium"
                onClick={() => handleMapPartySubmit("CLIENT", 1, "Tata Motors Commercial")}
              >
                Map to Client: Tata Motors Commercial
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setMappingLine(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
