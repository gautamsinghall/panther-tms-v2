"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, PackageCheck, AlertTriangle } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface ArrivalReportRecord {
  id: number;
  report_number: string;
  arrival_date: string;
  lr_id: number;
  lr_number?: string;
  destination_hub?: string;
  packages_received: number;
  packages_damaged: number;
  packages_short: number;
  condition_remarks?: string;
  receiver_name?: string;
  status: string;
}

interface LROption {
  id: number;
  lr_number: string;
  vehicle_number?: string;
}

export default function ArrivalReportsPage() {
  const [data, setData] = useState<ArrivalReportRecord[]>([]);
  const [lrs, setLrs] = useState<LROption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [reportsRes, lrsRes] = await Promise.all([
        apiClient<ArrivalReportRecord[]>("/api/v1/transport/arrival-reports"),
        apiClient<LROption[]>("/api/v1/transport/lrs"),
      ]);
      setData(reportsRes);
      setLrs(lrsRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load arrival reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<ArrivalReportRecord>[] = [
    {
      key: "report_number",
      header: "Report Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.report_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {new Date(row.arrival_date).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Consignment LR",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {row.lr_number || `LR #${row.lr_id}`}
        </span>
      ),
    },
    {
      key: "destination_hub",
      header: "Destination Hub",
      cell: (row) => row.destination_hub || "Unspecified Hub",
    },
    {
      key: "packages",
      header: "Cargo Condition",
      cell: (row) => {
        const hasIssue = row.packages_damaged > 0 || row.packages_short > 0;
        return (
          <div className="text-xs">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {row.packages_received} Received
            </span>
            {hasIssue && (
              <span className="block text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                {row.packages_damaged > 0 ? `${row.packages_damaged} damaged ` : ""}
                {row.packages_short > 0 ? `${row.packages_short} short` : ""}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "receiver_name",
      header: "Unloaded / Inspected By",
      cell: (row) => row.receiver_name || "Warehouse Staff",
    },
  ];

  const lrOptions = lrs.map((l) => ({ label: `${l.lr_number} (${l.vehicle_number || "Vehicle"})`, value: String(l.id) }));

  const formSections: FormSectionDef[] = [
    {
      id: "ar_core",
      title: "Arrival Inspection Details",
      description: "Destination unloading tally and cargo condition inspection (PRD §7.3)",
      columns: 2,
      fields: [
        {
          name: "lr_id",
          label: "Consignment LR *",
          type: "select",
          required: true,
          options: lrOptions,
        },
        {
          name: "destination_hub",
          label: "Receiving Warehouse / Hub",
          placeholder: "e.g. Bengaluru Central Hub",
          required: true,
        },
        {
          name: "packages_received",
          label: "Total Packages Received *",
          type: "number",
          placeholder: "50",
          required: true,
        },
        {
          name: "receiver_name",
          label: "Receiving Executive Name",
          placeholder: "e.g. Sunil Kumar",
          required: true,
        },
        {
          name: "packages_damaged",
          label: "Damaged Package Count",
          type: "number",
          placeholder: "0",
        },
        {
          name: "packages_short",
          label: "Shortage Package Count",
          type: "number",
          placeholder: "0",
        },
        {
          name: "condition_remarks",
          label: "Inspection Observations / Seal Notes",
          type: "textarea",
          placeholder: "Container seals intact, no external package damage observed.",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        lr_id: parseInt(values.lr_id, 10),
        packages_received: values.packages_received ? parseInt(values.packages_received, 10) : 0,
        packages_damaged: values.packages_damaged ? parseInt(values.packages_damaged, 10) : 0,
        packages_short: values.packages_short ? parseInt(values.packages_short, 10) : 0,
      };
      await apiClient("/api/v1/transport/arrival-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record arrival report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Arrival Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record destination warehouse arrivals, shortage tallies, and cargo unloading conditions.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Record Arrival
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search by report number, LR, or hub..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Destination Arrival Inspection
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Form
              sections={formSections}
              onSubmit={handleCreate}
              onCancel={() => setIsModalOpen(false)}
              submitLabel="Confirm Arrival"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
