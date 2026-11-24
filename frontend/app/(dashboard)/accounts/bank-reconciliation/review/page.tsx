"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { UploadCloud, FileSpreadsheet, ArrowLeft, RefreshCw, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { BankStatementReviewQueue } from "@/components/accounts/bank-statement-review-queue";
import { BankStatementImportModal } from "@/components/accounts/bank-statement-import-modal";

export default function BankStatementReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const importIdParam = searchParams.get("id");

  const [importData, setImportData] = useState<any | null>(null);
  const [pastImports, setPastImports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (importIdParam) {
      loadImport(Number(importIdParam));
    } else {
      loadLatestOrList();
    }
  }, [importIdParam]);

  async function loadImport(id: number) {
    setIsLoading(true);
    try {
      const res = await apiClient<any>(`/api/v1/accounts/bank-statements/${id}`);
      setImportData(res);
    } catch (err: any) {
      toast.error("Failed to load import session: " + (err?.detail || err?.message));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLatestOrList() {
    setIsLoading(true);
    try {
      const list = await apiClient<any[]>("/api/v1/accounts/bank-statements");
      setPastImports(list);
      if (list && list.length > 0) {
        // Load the most recent import with lines
        await loadImport(list[0].id);
      } else {
        setImportData(null);
      }
    } catch (err: any) {
      toast.error("Failed to load bank statement imports: " + (err?.detail || err?.message));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Reconciliation & Statement Import (Auto BRS)"
        description="Review statement lines, match parties, resolve bill allocations, and post double-entry Payment & Receipt vouchers with zero guess-work."
        primaryAction={{
          label: "Upload Statement File",
          icon: <UploadCloud className="w-4 h-4" />,
          onClick: () => setIsImportModalOpen(true),
        }}
        secondaryActions={[
          {
            label: "Skipped Entries Report",
            icon: <FileText className="w-4 h-4 text-amber-600" />,
            onClick: () => router.push("/accounts/bank-reconciliation/skipped-entries"),
            variant: "outline",
          },
        ]}
      />

      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading bank statement review queue...
          </p>
        </div>
      ) : importData ? (
        <BankStatementReviewQueue
          importData={importData}
          onRefresh={() => loadImport(importData.id)}
          onViewSkippedReport={() => router.push("/accounts/bank-reconciliation/skipped-entries")}
        />
      ) : (
        <div className="py-20 text-center bg-white dark:bg-[#17171B] rounded-2xl border border-slate-200 dark:border-[#303036] p-8 space-y-3">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Bank Statement Imported Yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload your ICICI, HDFC, or any standard bank statement (.xls, .xlsx, .csv) to auto-match transactions and generate Payment & Receipt review queues.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <UploadCloud className="w-4 h-4" /> Upload Statement Now
            </Button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <BankStatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(imported) => {
          setImportData(imported);
          router.push(`/accounts/bank-reconciliation/review?id=${imported.id}`);
        }}
      />
    </div>
  );
}
