"use client";

import React, { useState, useEffect } from "react";
import { Plus, Lock, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface EWayBillRecord {
  id: number;
  eway_bill_number: string;
  lr_number?: string;
  generated_date: string;
  valid_until: string;
  from_pincode?: string;
  to_pincode?: string;
  approx_distance_km: number;
  vehicle_number?: string;
  status: string;
  is_manual_entry: boolean;
}

interface LROption {
  id: number;
  lr_number: string;
}

export default function EWayBillsPage() {
  const [data, setData] = useState<EWayBillRecord[]>([]);
  const [lrs, setLrs] = useState<LROption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlanLocked, setIsPlanLocked] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [ewayRes, lrsRes] = await Promise.all([
        apiClient<EWayBillRecord[]>("/api/v1/transport/eway-bills"),
        apiClient<LROption[]>("/api/v1/transport/lrs"),
      ]);
      setData(Array.isArray(ewayRes) ? ewayRes : []);
      setLrs(Array.isArray(lrsRes) ? lrsRes : []);
    } catch (err: any) {
      if (err.error_code === "ENTITLEMENT_LOCKED" || err.message?.includes("not included")) {
        setIsPlanLocked(true);
      }
      setIsError(true);
      setErrorMessage(err.message || "Failed to load E-Way bills.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<EWayBillRecord>[] = [
    {
      key: "eway_bill_number",
      header: "E-Way Bill Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#101828] block">
            {row.eway_bill_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            Gen: {formatDate(row.generated_date)}
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
          {row.lr_number || "-"}
        </span>
      ),
    },
    {
      key: "vehicle_number",
      header: "Vehicle Assigned (Part B)",
      cell: (row) => (
        <span className="font-mono font-bold text-xs uppercase text-[#101828]">
          {row.vehicle_number || "Part-B Pending"}
        </span>
      ),
    },
    {
      key: "pincodes",
      header: "Route & Distance",
      cell: (row) => (
        <div className="text-xs text-[#344054]">
          <div>{row.from_pincode || "-"} → {row.to_pincode || "-"}</div>
          <span className="text-[11px] text-[#667085]">{row.approx_distance_km || 0} km approx</span>
        </div>
      ),
    },
    {
      key: "valid_until",
      header: "Validity Date",
      cell: (row) => (
        <span className="font-mono text-xs text-[#344054]">
          {formatDate(row.valid_until)}
        </span>
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
    label: l.lr_number,
    value: String(l.id),
  }));

  const formSections: FormSectionDef[] = [
    {
      id: "eway_info",
      title: "E-Way Bill Details",
      description: "GST E-Way bill credentials and transport validity",
      columns: 2,
      fields: [
        {
          name: "eway_bill_number",
          label: "12-Digit E-Way Bill Number",
          placeholder: "e.g. 241001928374",
          required: true,
        },
        {
          name: "lr_id",
          label: "Linked Consignment (LR)",
          type: "select",
          options: lrOptions,
          required: true,
        },
        {
          name: "vehicle_number",
          label: "Part-B Transport Vehicle",
          placeholder: "e.g. MH-12-AB-1234",
          required: true,
        },
        {
          name: "approx_distance_km",
          label: "Distance (KM)",
          type: "number",
          placeholder: "450",
          required: true,
        },
        {
          name: "from_pincode",
          label: "Dispatch Pincode",
          placeholder: "411001",
          required: true,
        },
        {
          name: "to_pincode",
          label: "Destination Pincode",
          placeholder: "380001",
          required: true,
        },
        {
          name: "valid_until",
          label: "Validity Expiration Date",
          type: "date",
          required: true,
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
        approx_distance_km: parseInt(values.approx_distance_km, 10) || 0,
        is_manual_entry: true,
      };
      await apiClient("/api/v1/transport/eway-bills", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update E-Way bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Update E-Way Bills"
        description="Attach government GST E-Way bills, update Part-B truck numbers, and monitor validity."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "E-Way Bills" },
        ]}
        primaryAction={{
          label: "Add E-Way Bill",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {isPlanLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-amber-900">E-Way Bill Feature Locked</h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Automated and manual GST E-Way Bill updation is disabled on the <strong>Free Plan</strong>. Upgrade your subscription to <strong>Pro Fleet</strong> or <strong>Business Scale</strong> to activate government e-way compliance and Part-B updates.
            </p>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchPlaceholder="Search by 12-digit number, vehicle, or LR..."
        emptyMessage="No E-Way bills logged"
        emptySubtext="Link government E-Way bills to LRs to maintain statutory compliance in transit."
        emptyAction={{
          label: "Add E-Way Bill",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Register GST E-Way Bill"
        description="Update Part-B vehicle details and validity dates."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Save E-Way Bill"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
