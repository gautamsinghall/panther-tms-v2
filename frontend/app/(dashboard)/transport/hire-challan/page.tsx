"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, CheckCircle, FileText } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface HireChallanRecord {
  id: number;
  challan_number: string;
  challan_date: string;
  vehicle_number: string;
  owner_name?: string;
  driver_name?: string;
  driver_phone?: string;
  hire_rate: string | number;
  advance_amount: string | number;
  balance_amount: string | number;
  net_payable_amount: string | number;
  status: string;
}

interface SelectOption {
  id: number;
  name?: string;
  vehicle_number?: string;
}

export default function HireChallansPage() {
  const [data, setData] = useState<HireChallanRecord[]>([]);
  const [owners, setOwners] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [challansRes, ownersRes] = await Promise.all([
        apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans"),
        apiClient<SelectOption[]>("/api/v1/transport/vehicle-owners"),
      ]);
      setData(challansRes);
      setOwners(ownersRes);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load hire challans.");
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
      case "ISSUED":
        return <Badge variant="primary">Issued</Badge>;
      case "TRANSIT":
        return <Badge variant="warning">In Transit</Badge>;
      case "SETTLED":
        return <Badge variant="success">Settled</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const columns: ColumnDef<HireChallanRecord>[] = [
    {
      key: "challan_number",
      header: "Challan Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.challan_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.challan_date}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle / Driver",
      cell: (row) => (
        <div>
          <span className="font-mono font-bold uppercase text-slate-900 dark:text-slate-100">
            {row.vehicle_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.driver_name || "Unassigned"} {row.driver_phone ? `(${row.driver_phone})` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Vehicle Owner / Broker",
      cell: (row) => row.owner_name || "Direct Driver",
    },
    {
      key: "rate",
      header: "Agreed Rate",
      isNumeric: true,
      cell: (row) => `₹${parseFloat(String(row.hire_rate)).toLocaleString()}`,
    },
    {
      key: "balance",
      header: "Balance Due",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
          ₹{parseFloat(String(row.balance_amount)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Challan Status",
      align: "center",
      cell: (row) => getStatusBadge(row.status),
    },
  ];

  const actions: RowAction<HireChallanRecord>[] = [
    {
      label: "Settle Balance",
      disabled: (row) => row.status === "SETTLED" || row.status === "CANCELLED",
      onClick: async (row) => {
        if (!confirm(`Settle final balance for challan ${row.challan_number}?`)) return;
        try {
          await apiClient(`/api/v1/transport/hire-challans/${row.id}/settle`, {
            method: "POST",
            body: JSON.stringify({ settlement_notes: "Settled via banking channel" }),
          });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to settle challan.");
        }
      },
    },
  ];

  const ownerOptions = [
    { label: "Direct Driver / Other", value: "" },
    ...owners.map((o) => ({ label: o.name || `Owner ${o.id}`, value: String(o.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "hc_core",
      title: "Hired Vehicle Details",
      description: "Hired transport vehicle agreement and trip allocation",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Vehicle Registration Number *",
          placeholder: "e.g. NL01AB1234",
          required: true,
        },
        {
          name: "owner_id",
          label: "Registered Owner / Broker",
          type: "select",
          options: ownerOptions,
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
          name: "from_location",
          label: "From Origin",
          placeholder: "e.g. Pune Hub",
        },
        {
          name: "to_location",
          label: "To Destination",
          placeholder: "e.g. Bengaluru Hub",
        },
      ],
    },
    {
      id: "hc_financials",
      title: "Hire Charges & TDS Deduction",
      description: "Agreed hiring rates, advance payment, and statutory TDS deduction",
      columns: 2,
      fields: [
        {
          name: "hire_rate",
          label: "Total Agreed Hire Rate (₹) *",
          type: "number",
          placeholder: "32000",
          required: true,
        },
        {
          name: "advance_amount",
          label: "Advance Paid (₹)",
          type: "number",
          placeholder: "10000",
        },
        {
          name: "tds_rate",
          label: "TDS Rate (%)",
          type: "number",
          placeholder: "1.0",
        },
        {
          name: "detention_charge",
          label: "Detention / Halting Rate (₹/day)",
          type: "number",
          placeholder: "1500",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        owner_id: values.owner_id ? parseInt(values.owner_id, 10) : null,
        hire_rate: values.hire_rate ? parseFloat(values.hire_rate) : 0,
        advance_amount: values.advance_amount ? parseFloat(values.advance_amount) : 0,
        tds_rate: values.tds_rate ? parseFloat(values.tds_rate) : 0,
        detention_charge: values.detention_charge ? parseFloat(values.detention_charge) : 0,
      };
      await apiClient("/api/v1/transport/hire-challans", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue hire challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hire Challan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Issue hire challans for market fleet vehicles, track advances, and settle balances.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Issue Hire Challan
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
        searchPlaceholder="Search by challan number, vehicle, or owner..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Issue Market Vehicle Hire Challan
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
              submitLabel="Issue Challan"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
