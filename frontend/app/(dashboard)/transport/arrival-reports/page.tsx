"use client";

import React, { useState, useEffect } from "react";
import { Plus, PackageCheck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [reportsRes, lrsRes] = await Promise.all([
        apiClient<ArrivalReportRecord[]>("/api/v1/transport/arrival-reports"),
        apiClient<LROption[]>("/api/v1/transport/lrs"),
      ]);
      setData(Array.isArray(reportsRes) ? reportsRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
    } catch (err: any) {
      setIsError(true);
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
          <span className="font-mono font-bold text-[#101828] block">
            {row.report_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {formatDate(row.arrival_date)}
          </span>
        </div>
      ),
    },
    {
      key: "lr_number",
      header: "Linked Consignment (LR)",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-[#4F46E5]">
          {row.lr_number || `LR #${row.lr_id}`}
        </span>
      ),
    },
    {
      key: "hub",
      header: "Destination Hub / Receiver",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-medium block">
            {row.destination_hub || "Destination Hub"}
          </span>
          {row.receiver_name && (
            <span className="text-[11px] text-[#667085]">
              Recv by: {row.receiver_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "packages",
      header: "Received / Damaged / Short",
      isNumeric: true,
      cell: (row) => (
        <div className="font-mono text-xs">
          <span className="text-[#027A48] font-bold">{row.packages_received} Recv</span>
          {(row.packages_damaged > 0 || row.packages_short > 0) && (
            <span className="text-[#B42318] ml-2 font-medium">
              ({row.packages_damaged} Dmg / {row.packages_short} Short)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const lrOptions = lrs.map((l) => ({
    label: `${l.lr_number} (${l.vehicle_number || "Truck"})`,
    value: String(l.id),
  }));

  const formSections: FormSectionDef[] = [
    {
      id: "arrival_info",
      title: "Cargo Arrival Assessment",
      description: "Destination unloading tally and cargo condition inspection",
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
          name: "arrival_date",
          label: "Arrival & Unloading Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "destination_hub",
          label: "Destination Hub / Warehouse",
          placeholder: "e.g. Pune Central Warehouse",
          required: true,
        },
        {
          name: "receiver_name",
          label: "Receiving Officer / Incharge",
          placeholder: "e.g. Anand Shinde",
        },
        {
          name: "packages_received",
          label: "Intact Packages Received",
          type: "number",
          placeholder: "100",
          required: true,
        },
        {
          name: "packages_damaged",
          label: "Damaged Packages",
          type: "number",
          placeholder: "0",
          defaultValue: "0",
        },
        {
          name: "packages_short",
          label: "Shortage Packages",
          type: "number",
          placeholder: "0",
          defaultValue: "0",
        },
        {
          name: "condition_remarks",
          label: "Remarks & Exception Details",
          type: "textarea",
          placeholder: "Note any seal tampering, carton wetness, or shortage specifics",
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
        packages_received: parseInt(values.packages_received, 10) || 0,
        packages_damaged: parseInt(values.packages_damaged, 10) || 0,
        packages_short: parseInt(values.packages_short, 10) || 0,
      };
      await apiClient("/api/v1/transport/arrival-reports", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record arrival report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arrival Reports"
        description="Inspect destination unloading, record tally, and document cargo exceptions."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Arrival Reports" },
        ]}
        primaryAction={{
          label: "File Arrival Report",
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
        searchPlaceholder="Search by report number, LR, or destination..."
        emptyMessage="No arrival reports filed"
        emptySubtext="Record cargo arrival at destination hub to track transit completion and shortages."
        emptyAction={{
          label: "File Arrival Report",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="File Destination Arrival Report"
        description="Record physical unloading tally and damage/shortage conditions."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="File Report"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
