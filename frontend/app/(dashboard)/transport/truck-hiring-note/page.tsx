"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, FileText } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface TruckHiringNoteRecord {
  id: number;
  note_number: string;
  note_date: string;
  vehicle_number: string;
  owner_name?: string;
  broker_name?: string;
  driver_name?: string;
  loading_point?: string;
  unloading_point?: string;
  agreed_rate: string | number;
  advance_cash: string | number;
  advance_diesel_slip: string | number;
  balance_payable: string | number;
}

export default function TruckHiringNotePage() {
  const [data, setData] = useState<TruckHiringNoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<TruckHiringNoteRecord[]>("/api/v1/transport/truck-hiring-notes");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load truck hiring notes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<TruckHiringNoteRecord>[] = [
    {
      key: "note_number",
      header: "Note Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {row.note_number}
          </span>
          <span className="block text-[11px] text-slate-400">
            {row.note_date}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold uppercase text-slate-900 dark:text-slate-100">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "owner_broker",
      header: "Owner / Broker",
      cell: (row) => row.owner_name || row.broker_name || "Direct",
    },
    {
      key: "agreed_rate",
      header: "Agreed Rate",
      isNumeric: true,
      cell: (row) => `₹${parseFloat(String(row.agreed_rate)).toLocaleString()}`,
    },
    {
      key: "advances",
      header: "Advances (Cash / Diesel)",
      isNumeric: true,
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          ₹{parseFloat(String(row.advance_cash)).toLocaleString()} / ₹{parseFloat(String(row.advance_diesel_slip)).toLocaleString()}
        </span>
      ),
    },
    {
      key: "balance_payable",
      header: "Balance Payable",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
          ₹{parseFloat(String(row.balance_payable)).toLocaleString()}
        </span>
      ),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "thn_info",
      title: "Hiring Memorandum Details",
      description: "Truck hiring contract terms and advance split",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Vehicle Registration Number *",
          placeholder: "e.g. MH12AB9999",
          required: true,
        },
        {
          name: "owner_name",
          label: "Owner / Transporter Name",
          placeholder: "e.g. Royal Transport",
        },
        {
          name: "broker_name",
          label: "Truck Broker / Agent",
          placeholder: "e.g. Nagpur Freight Agency",
        },
        {
          name: "driver_name",
          label: "Driver Name",
          placeholder: "e.g. Surinder Singh",
        },
        {
          name: "loading_point",
          label: "Loading Point",
          placeholder: "e.g. Chakan Plant 2",
        },
        {
          name: "unloading_point",
          label: "Unloading Destination",
          placeholder: "e.g. Hosur Central Warehouse",
        },
        {
          name: "agreed_rate",
          label: "Agreed Freight Rate (₹) *",
          type: "number",
          placeholder: "32000",
          required: true,
        },
        {
          name: "advance_cash",
          label: "Cash Advance (₹)",
          type: "number",
          placeholder: "5000",
        },
        {
          name: "advance_diesel_slip",
          label: "Diesel Slip Value (₹)",
          type: "number",
          placeholder: "5000",
        },
        {
          name: "terms_and_conditions",
          label: "Contract Terms",
          type: "textarea",
          placeholder: "Detention charges Rs 1500/day after 24 hrs loading/unloading.",
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
        agreed_rate: values.agreed_rate ? parseFloat(values.agreed_rate) : 0,
        advance_cash: values.advance_cash ? parseFloat(values.advance_cash) : 0,
        advance_diesel_slip: values.advance_diesel_slip ? parseFloat(values.advance_diesel_slip) : 0,
      };
      await apiClient("/api/v1/transport/truck-hiring-notes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue hiring note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Truck Hiring Notes
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Memorandum notes for truck brokers with diesel slip advances and payment contracts.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Hiring Note
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
        searchPlaceholder="Search by note number, vehicle, or broker..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Truck Hiring Note
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
              submitLabel="Issue Note"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
