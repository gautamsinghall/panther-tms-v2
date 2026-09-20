"use client";

import React, { useState, useEffect } from "react";
import { Plus, CheckCircle, FileCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [podsRes, lrsRes] = await Promise.all([
        apiClient<PODRecord[]>("/api/v1/transport/pod-records"),
        apiClient<LROption[]>("/api/v1/transport/lrs"),
      ]);
      setData(Array.isArray(podsRes) ? podsRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
    } catch (err: any) {
      setIsError(true);
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
      header: "POD Reference",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#101828] block">
            {row.pod_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            Delivered: {formatDate(row.delivery_date)}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "LR Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#4F46E5]">
          {row.lr_number || `LR #${row.lr_id}`}
        </span>
      ),
    },
    {
      key: "receiver",
      header: "Consignee Signature",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-medium block">
            {row.receiver_name}
          </span>
          {row.receiver_phone && (
            <span className="text-[11px] text-[#667085]">
              {row.receiver_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "condition",
      header: "Cargo Condition",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span
            className={
              row.received_condition === "OK"
                ? "bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] px-2 py-0.5 rounded-[4px] text-[11px] font-medium"
                : "bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] px-2 py-0.5 rounded-[4px] text-[11px] font-medium"
            }
          >
            {row.received_condition}
          </span>
          <span className="font-mono text-xs text-[#667085]">
            {row.packages_delivered} pkgs
          </span>
        </div>
      ),
    },
    {
      key: "verification_status",
      header: "Audit Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.verification_status} />,
    },
  ];

  const actions: RowAction<PODRecord>[] = [
    {
      label: "Verify & Approve",
      disabled: (row) => row.verification_status === "VERIFIED",
      onClick: async (row) => {
        try {
          await apiClient(`/api/v1/transport/pod-records/${row.id}/verify`, {
            method: "POST",
            body: JSON.stringify({ status: "VERIFIED" }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to verify POD.");
        }
      },
    },
  ];

  const lrOptions = lrs.map((l) => ({
    label: l.lr_number,
    value: String(l.id),
  }));

  const formSections: FormSectionDef[] = [
    {
      id: "pod_info",
      title: "Proof of Delivery (POD)",
      description: "Signed delivery challan acknowledgment",
      columns: 2,
      fields: [
        {
          name: "lr_id",
          label: "Consignment (LR/GR)",
          type: "select",
          options: lrOptions,
          required: true,
        },
        {
          name: "delivery_date",
          label: "Actual Delivery Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "receiver_name",
          label: "Receiver Name (Consignee Signature)",
          placeholder: "e.g. Ramesh Chandra (Security/Store)",
          required: true,
        },
        {
          name: "receiver_phone",
          label: "Receiver Phone",
          placeholder: "9876543210",
        },
        {
          name: "packages_delivered",
          label: "Total Delivered Packages",
          type: "number",
          placeholder: "100",
          required: true,
        },
        {
          name: "received_condition",
          label: "Delivery Condition",
          type: "select",
          required: true,
          options: [
            { label: "Intact & Undamaged (OK)", value: "OK" },
            { label: "Damaged In Transit", value: "DAMAGED" },
            { label: "Shortage Upon Unloading", value: "SHORTAGE" },
          ],
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
        packages_delivered: parseInt(values.packages_delivered, 10) || 0,
      };
      await apiClient("/api/v1/transport/pod-records", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record POD.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proof of Delivery (POD)"
        description="Verify signed delivery receipts, track delivery acknowledgments, and approve freight billing."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "POD Records" },
        ]}
        primaryAction={{
          label: "Upload POD",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchPlaceholder="Search by POD reference, LR, receiver..."
        emptyMessage="No PODs uploaded"
        emptySubtext="Upload signed consignee delivery acknowledgments to clear LRs for transport billing."
        emptyAction={{
          label: "Upload POD",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Upload Consignee POD Acknowledgment"
        description="Record physical signature verification from the receiving party."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Save POD"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
