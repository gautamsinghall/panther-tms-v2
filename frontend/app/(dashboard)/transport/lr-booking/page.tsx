"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ArrowRight, Truck, CheckCircle2, Send, Navigation } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

interface LRRecord {
  id: number;
  lr_number: string;
  lr_date: string;
  job_number?: string;
  consigner_name?: string;
  consignee_name?: string;
  origin_city?: string;
  destination_city?: string;
  vehicle_source: string;
  vehicle_number: string;
  driver_name?: string;
  driver_phone?: string;
  package_count: number;
  chargeable_weight_mt: string | number;
  total_freight_amount: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  status: string;
}

interface SelectOption {
  id: number;
  name?: string;
  city_name?: string;
  job_number?: string;
}

export default function LRBookingPage() {
  const router = useRouter();
  const [data, setData] = useState<LRRecord[]>([]);
  const [consigners, setConsigners] = useState<SelectOption[]>([]);
  const [consignees, setConsignees] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [jobs, setJobs] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [lrsRes, consignersRes, consigneesRes, locationsRes, jobsRes] = await Promise.all([
        apiClient<LRRecord[]>("/api/v1/transport/lrs"),
        apiClient<SelectOption[]>("/api/v1/general/consigners"),
        apiClient<SelectOption[]>("/api/v1/general/consignees"),
        apiClient<SelectOption[]>("/api/v1/general/locations"),
        apiClient<SelectOption[]>("/api/v1/transport/jobs"),
      ]);
      setData(lrsRes);
      setConsigners(consignersRes);
      setConsignees(consigneesRes);
      setLocations(locationsRes);
      setJobs(jobsRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load LRs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="neutral">Draft</Badge>;
      case "BOOKED":
        return <Badge variant="primary">Booked</Badge>;
      case "LOADED":
        return <Badge variant="secondary">Loaded</Badge>;
      case "IN_TRANSIT":
        return <Badge variant="warning">In Transit</Badge>;
      case "ARRIVED":
        return <Badge variant="secondary">Arrived</Badge>;
      case "DELIVERED":
        return <Badge variant="primary">Delivered</Badge>;
      case "POD_RECEIVED":
        return <Badge variant="warning">POD Received</Badge>;
      case "POD_VERIFIED":
        return <Badge variant="success">POD Verified</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns: ColumnDef<LRRecord>[] = [
    {
      key: "lr_number",
      header: "LR / GR Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.lr_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.lr_date} {row.job_number ? `· ${row.job_number}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "parties",
      header: "Consigner -> Consignee",
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">
            {row.consigner_name || "N/A"}
          </div>
          <div className="text-xs text-slate-500">
            {row.consignee_name || "N/A"}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle Assigned",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold uppercase text-slate-900 dark:text-slate-100">
            {row.vehicle_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.driver_name || row.vehicle_source}
          </span>
        </div>
      ),
    },
    {
      key: "freight",
      header: "Freight / Balance",
      isNumeric: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            ₹{parseFloat(String(row.total_freight_amount)).toLocaleString()}
          </span>
          <span className="block text-[11px] font-mono text-amber-600 dark:text-amber-400">
            Bal: ₹{parseFloat(String(row.balance_amount)).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Lifecycle Status",
      align: "center",
      cell: (row) => getStatusBadge(row.status),
    },
  ];

  const actions: RowAction<LRRecord>[] = [
    {
      label: "Dispatch / In Transit",
      disabled: (row) => row.status !== "BOOKED" && row.status !== "LOADED",
      onClick: async (row) => {
        try {
          await apiClient(`/api/v1/transport/lrs/${row.id}/transition`, {
            method: "POST",
            body: JSON.stringify({ target_status: "IN_TRANSIT" }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to dispatch LR.");
        }
      },
    },
    {
      label: "Record Destination Arrival",
      disabled: (row) => row.status !== "IN_TRANSIT",
      onClick: (row) => {
        router.push(`/transport/arrival-reports?lr_id=${row.id}`);
      },
    },
    {
      label: "Upload / Verify POD",
      disabled: (row) => row.status !== "ARRIVED" && row.status !== "DELIVERED" && row.status !== "POD_RECEIVED",
      onClick: (row) => {
        router.push(`/transport/pod-records?lr_id=${row.id}`);
      },
    },
  ];

  const consignerOptions = consigners.map((c) => ({ label: c.name || `Consigner ${c.id}`, value: String(c.id) }));
  const consigneeOptions = consignees.map((c) => ({ label: c.name || `Consignee ${c.id}`, value: String(c.id) }));
  const locationOptions = locations.map((l) => ({ label: l.city_name || `Location ${l.id}`, value: String(l.id) }));
  const jobOptions = [
    { label: "Direct Booking (No Job)", value: "" },
    ...jobs.map((j) => ({ label: `${j.job_number} (ID: ${j.id})`, value: String(j.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "parties_sec",
      title: "Consignment & Parties",
      description: "Origin and destination trading parties",
      columns: 2,
      fields: [
        {
          name: "job_id",
          label: "Linked Transport Job",
          type: "select",
          options: jobOptions,
        },
        {
          name: "lr_date",
          label: "Booking Date",
          type: "date",
          required: true,
        },
        {
          name: "consigner_id",
          label: "Consigner (Sender) *",
          type: "select",
          required: true,
          options: consignerOptions,
        },
        {
          name: "consignee_id",
          label: "Consignee (Receiver) *",
          type: "select",
          required: true,
          options: consigneeOptions,
        },
        {
          name: "origin_location_id",
          label: "Origin Location",
          type: "select",
          options: locationOptions,
        },
        {
          name: "destination_location_id",
          label: "Destination Location",
          type: "select",
          options: locationOptions,
        },
      ],
    },
    {
      id: "vehicle_sec",
      title: "Vehicle & Cargo",
      description: "Vehicle allocation and weight metrics",
      columns: 2,
      fields: [
        {
          name: "vehicle_source",
          label: "Fleet Source",
          type: "select",
          required: true,
          options: [
            { label: "Market / Hired Vehicle", value: "MARKET" },
            { label: "Company Fleet Asset", value: "COMPANY" },
          ],
        },
        {
          name: "vehicle_number",
          label: "Assigned Vehicle Number *",
          placeholder: "e.g. MH12AB1234",
          required: true,
        },
        {
          name: "driver_name",
          label: "Driver Name",
          placeholder: "e.g. Surinder Singh",
        },
        {
          name: "driver_phone",
          label: "Driver Contact Number",
          placeholder: "+91 9822233344",
        },
        {
          name: "package_count",
          label: "Number of Packages",
          type: "number",
          placeholder: "e.g. 50",
          required: true,
        },
        {
          name: "chargeable_weight_mt",
          label: "Chargeable Weight (MT)",
          type: "number",
          placeholder: "e.g. 19.5",
          required: true,
        },
      ],
    },
    {
      id: "freight_sec",
      title: "Commercial Freight",
      description: "Freight rates, advances, and payment terms (Numeric 12,2)",
      columns: 2,
      fields: [
        {
          name: "freight_amount",
          label: "Freight Amount (₹) *",
          type: "number",
          placeholder: "35000",
          required: true,
        },
        {
          name: "advance_amount",
          label: "Advance Received (₹)",
          type: "number",
          placeholder: "5000",
        },
        {
          name: "payment_terms",
          label: "Payment Terms",
          type: "select",
          options: [
            { label: "To Pay (Consignee)", value: "TO_PAY" },
            { label: "Paid (Consigner)", value: "PAID" },
            { label: "To Be Billed (Account Credit)", value: "TO_BE_BILLED" },
          ],
        },
        {
          name: "eway_bill_number",
          label: "E-Way Bill Number",
          placeholder: "e.g. 241012345678",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        job_id: values.job_id ? parseInt(values.job_id, 10) : null,
        consigner_id: parseInt(values.consigner_id, 10),
        consignee_id: parseInt(values.consignee_id, 10),
        origin_location_id: values.origin_location_id ? parseInt(values.origin_location_id, 10) : null,
        destination_location_id: values.destination_location_id ? parseInt(values.destination_location_id, 10) : null,
        package_count: values.package_count ? parseInt(values.package_count, 10) : 0,
        actual_weight_mt: values.chargeable_weight_mt ? parseFloat(values.chargeable_weight_mt) : 0,
        chargeable_weight_mt: values.chargeable_weight_mt ? parseFloat(values.chargeable_weight_mt) : 0,
        freight_amount: values.freight_amount ? parseFloat(values.freight_amount) : 0,
        total_freight_amount: values.freight_amount ? parseFloat(values.freight_amount) : 0,
        advance_amount: values.advance_amount ? parseFloat(values.advance_amount) : 0,
      };
      await apiClient("/api/v1/transport/lrs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to book LR.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            GR / LR Booking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Book consignments, assign vehicles, issue lorry receipts, and track operational transit.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Book New GR/LR
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
        searchPlaceholder="Search by LR number, vehicle, or party..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Book Consignment GR / LR
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
              submitLabel="Confirm & Issue LR"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
