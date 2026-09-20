"use client";

import React, { useState, useEffect } from "react";
import { Plus, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { Form } from "@/components/forms/form";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<TruckHiringNoteRecord[]>("/api/v1/transport/truck-hiring-notes");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
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
      header: "Note Reference",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#101828] block">
            {row.note_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {formatDate(row.note_date)}
          </span>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle / Driver",
      cell: (row) => (
        <div>
          <span className="font-mono font-bold uppercase text-[#101828] block text-xs">
            {row.vehicle_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {row.driver_name || "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "route",
      header: "Loading → Unloading",
      cell: (row) => (
        <span className="text-xs text-[#344054]">
          {row.loading_point || "Origin"} → {row.unloading_point || "Destination"}
        </span>
      ),
    },
    {
      key: "agreed_rate",
      header: "Agreed Rate",
      isNumeric: true,
      cell: (row) => formatCurrency(row.agreed_rate),
    },
    {
      key: "advances",
      header: "Advance (Cash / Diesel)",
      isNumeric: true,
      cell: (row) => (
        <div className="font-mono text-xs text-[#667085]">
          <span>Cash: {formatCurrency(row.advance_cash)}</span>
          <span className="block text-[11px]">Diesel: {formatCurrency(row.advance_diesel_slip)}</span>
        </div>
      ),
    },
    {
      key: "balance_payable",
      header: "Balance Payable",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-[#B42318]">
          {formatCurrency(row.balance_payable)}
        </span>
      ),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "hiring_note_info",
      title: "Truck Hiring Engagement Note",
      description: "Driver advance slip and agreed transport hire rate",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Truck Registration",
          placeholder: "e.g. MH-12-PQ-4567",
          required: true,
        },
        {
          name: "note_date",
          label: "Engagement Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "driver_name",
          label: "Driver Name",
          placeholder: "e.g. Raju Yadav",
        },
        {
          name: "owner_name",
          label: "Owner / Supplier Name",
          placeholder: "e.g. Western Fleet Corp",
        },
        {
          name: "loading_point",
          label: "Loading Hub",
          placeholder: "Mumbai",
          required: true,
        },
        {
          name: "unloading_point",
          label: "Unloading Hub",
          placeholder: "Delhi",
          required: true,
        },
        {
          name: "agreed_rate",
          label: "Agreed Freight Rate (₹)",
          type: "number",
          placeholder: "55000",
          required: true,
        },
        {
          name: "advance_cash",
          label: "Cash Advance Given (₹)",
          type: "number",
          placeholder: "15000",
        },
        {
          name: "advance_diesel_slip",
          label: "Diesel Pump Slip Amount (₹)",
          type: "number",
          placeholder: "20000",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        agreed_rate: parseFloat(values.agreed_rate) || 0,
        advance_cash: parseFloat(values.advance_cash) || 0,
        advance_diesel_slip: parseFloat(values.advance_diesel_slip) || 0,
      };
      await apiClient("/api/v1/transport/truck-hiring-notes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create hiring note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Truck Hiring Notes"
        description="Issue vehicle hiring slips, disburse pump diesel slips, and track driver cash advances."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Truck Hiring Notes" },
        ]}
        primaryAction={{
          label: "Issue Hiring Note",
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
        searchPlaceholder="Search notes by reference, vehicle, or route..."
        emptyMessage="No hiring notes recorded"
        emptySubtext="Issue hiring notes to log vehicle hiring agreements, diesel pump slips, and cash advances."
        emptyAction={{
          label: "Issue Hiring Note",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Issue Truck Hiring Note"
        description="Record driver cash advance, diesel slip, and destination payment terms."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Issue Note"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
