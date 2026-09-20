"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Info, ShieldAlert } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [ewayRes, lrsRes] = await Promise.all([
        apiClient<EWayBillRecord[]>("/api/v1/transport/eway-bills"),
        apiClient<LROption[]>("/api/v1/transport/lrs"),
      ]);
      setData(ewayRes);
      setLrs(lrsRes);
    } catch (err: any) {
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
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.eway_bill_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.lr_number ? `LR: ${row.lr_number}` : "Standalone"}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      cell: (row) => (
        <span className="font-mono font-bold uppercase text-slate-900 dark:text-slate-100">
          {row.vehicle_number || "-"}
        </span>
      ),
    },
    {
      key: "route",
      header: "Pin Route / Dist",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {row.from_pincode || "..."} → {row.to_pincode || "..."} ({row.approx_distance_km} km)
        </span>
      ),
    },
    {
      key: "valid_until",
      header: "Valid Until",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {new Date(row.valid_until).toLocaleString()}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Entry Mode",
      align: "center",
      cell: (row) => (
        <Badge variant="neutral" className="text-[11px]">
          {row.is_manual_entry ? "Manual Entry" : "API Synced"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <Badge variant={row.status === "ACTIVE" ? "success" : "danger"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  const lrOptions = [
    { label: "Standalone (No linked LR)", value: "" },
    ...lrs.map((l) => ({ label: l.lr_number, value: String(l.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "eway_core",
      title: "Government E-Way Bill Entry",
      description: "Manual registration of statutory 12-digit E-Way Bill number",
      columns: 2,
      fields: [
        {
          name: "eway_bill_number",
          label: "12-Digit E-Way Bill Number *",
          placeholder: "e.g. 241012345678",
          required: true,
        },
        {
          name: "lr_id",
          label: "Link to Consignment LR",
          type: "select",
          options: lrOptions,
        },
        {
          name: "valid_until",
          label: "Validity Expiry Date & Time *",
          type: "date",
          required: true,
        },
        {
          name: "vehicle_number",
          label: "Assigned Vehicle Number",
          placeholder: "e.g. MH12AB1234",
        },
        {
          name: "from_pincode",
          label: "Origin Pincode",
          placeholder: "e.g. 411019",
        },
        {
          name: "to_pincode",
          label: "Destination Pincode",
          placeholder: "e.g. 560100",
        },
        {
          name: "approx_distance_km",
          label: "Approx Distance (km)",
          type: "number",
          placeholder: "450",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        lr_id: values.lr_id ? parseInt(values.lr_id, 10) : null,
        approx_distance_km: values.approx_distance_km ? parseInt(values.approx_distance_km, 10) : 0,
        valid_until: `${values.valid_until}T23:59:59Z`,
      };
      await apiClient("/api/v1/transport/eway-bills", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record E-Way bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Update E-Way Bill
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record government GST E-Way Bill numbers, transit validity, and vehicle linkages.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Record E-Way Bill
        </Button>
      </div>

      {/* Integration Notice per Rules §2 */}
      <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
        <div className="text-xs text-sky-800 dark:text-sky-200 space-y-1">
          <p className="font-semibold">
            Manual Entry Mode (Rules.md §2 — Do-Not-Invent Principle)
          </p>
          <p className="text-sky-700/80 dark:text-sky-300/80">
            External NIC / GSP E-Way Bill API provider is marked as{" "}
            <code className="font-mono bg-sky-100 dark:bg-sky-900 px-1 py-0.5 rounded">
              UNKNOWN / NEEDS VERIFICATION
            </code>{" "}
            until vendor selection is finalized. Record E-Way Bill details manually to attach statutory validity to consignments.
          </p>
        </div>
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
        searchPlaceholder="Search by E-Way bill number, vehicle, or LR..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Manual E-Way Bill
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
              submitLabel="Save E-Way Bill"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
