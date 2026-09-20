"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, CheckCircle, FileCheck, ExternalLink } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface PODRecord {
  id: number;
  pod_number: string;
  lr_id: number;
  lr_number?: string;
  delivery_date: string;
  receiver_name: string;
  receiver_phone?: string;
  received_condition: "OK" | "DAMAGED" | "SHORTAGE";
  packages_delivered: number;
  document_path?: string;
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
  verified_at?: string;
}

interface LROption {
  id: number;
  lr_number: string;
}

export default function PODRecordsPage() {
  const [data, setData] = useState<PODRecord[]>([]);
  const [lrs, setLrs] = useState<LROption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [podsRes, lrsRes] = await Promise.all([
        apiClient<PODRecord[]>("/api/v1/transport/pod-records"),
        apiClient<LROption[]>("/api/v1/transport/lrs"),
      ]);
      setData(podsRes);
      setLrs(lrsRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load POD records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<PODRecord>[] = [
    {
      key: "pod_number",
      header: "POD Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.pod_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            Delivered: {row.delivery_date}
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
      key: "receiver",
      header: "Consignee Receiving Rep",
      cell: (row) => (
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {row.receiver_name}
          </span>
          {row.receiver_phone && (
            <span className="block text-[11px] font-mono text-slate-400">
              {row.receiver_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "condition",
      header: "Receiving Condition",
      align: "center",
      cell: (row) => {
        let variant: "success" | "danger" | "warning" = "success";
        if (row.received_condition === "DAMAGED") variant = "danger";
        if (row.received_condition === "SHORTAGE") variant = "warning";
        return (
          <Badge variant={variant} className="text-xs">
            {row.received_condition} ({row.packages_delivered} pkgs)
          </Badge>
        );
      },
    },
    {
      key: "doc",
      header: "POD Copy / Attachment",
      cell: (row) => (
        row.document_path ? (
          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <FileCheck className="w-3 h-3" /> Signed Copy Attached
          </span>
        ) : (
          <span className="text-xs text-slate-400">No copy uploaded</span>
        )
      ),
    },
    {
      key: "status",
      header: "Audit Verification",
      align: "center",
      cell: (row) => {
        let variant: "neutral" | "success" | "danger" = "neutral";
        if (row.verification_status === "VERIFIED") variant = "success";
        if (row.verification_status === "REJECTED") variant = "danger";
        return (
          <Badge variant={variant}>
            {row.verification_status}
          </Badge>
        );
      },
    },
  ];

  const actions: RowAction<PODRecord>[] = [
    {
      label: "Verify & Approve POD",
      disabled: (row) => row.verification_status === "VERIFIED",
      onClick: async (row) => {
        try {
          await apiClient(`/api/v1/transport/pod-records/${row.id}/verify`, {
            method: "POST",
            body: JSON.stringify({
              verification_status: "VERIFIED",
              verification_notes: "Approved by Billing / Audit desk",
            }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to verify POD.");
        }
      },
    },
  ];

  const lrOptions = lrs.map((l) => ({ label: l.lr_number, value: String(l.id) }));

  const formSections: FormSectionDef[] = [
    {
      id: "pod_core",
      title: "Proof of Delivery (POD) Receipt",
      description: "Customer signature, receiving condition, and document attachment (PRD §7.3)",
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
          name: "delivery_date",
          label: "Actual Delivery Date",
          type: "date",
          required: true,
        },
        {
          name: "receiver_name",
          label: "Receiving Party Representative *",
          placeholder: "e.g. Ramesh Kumar (Store Manager)",
          required: true,
        },
        {
          name: "receiver_phone",
          label: "Contact Phone",
          placeholder: "+91 9876543210",
        },
        {
          name: "packages_delivered",
          label: "Delivered Package Count",
          type: "number",
          placeholder: "50",
          required: true,
        },
        {
          name: "received_condition",
          label: "Goods Receiving Condition",
          type: "select",
          required: true,
          options: [
            { label: "Clean / OK (Intact Condition)", value: "OK" },
            { label: "Damaged Package Condition", value: "DAMAGED" },
            { label: "Shortage / Quantity Discrepancy", value: "SHORTAGE" },
          ],
        },
        {
          name: "document_path",
          label: "Signed POD File / R2 Path",
          placeholder: "e.g. r2://panther-tms/demo/pod/POD-2026-0001.pdf",
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
        packages_delivered: values.packages_delivered ? parseInt(values.packages_delivered, 10) : 0,
      };
      await apiClient("/api/v1/transport/pod-records", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record POD.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            POD Records & Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Proof of Delivery records, receiver acknowledgments, and audit verification for billing.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Record POD
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
        actions={actions}
        searchPlaceholder="Search by POD number, LR, or receiver..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Proof of Delivery (POD)
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
              submitLabel="Save POD Record"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
