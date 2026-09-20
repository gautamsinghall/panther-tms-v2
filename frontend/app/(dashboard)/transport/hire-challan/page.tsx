"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Drawer State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [challansRes, ownersRes] = await Promise.all([
        apiClient<HireChallanRecord[]>("/api/v1/transport/hire-challans"),
        apiClient<SelectOption[]>("/api/v1/transport/vehicle-owners"),
      ]);
      setData(Array.isArray(challansRes) ? challansRes : []);
      setOwners(Array.isArray(ownersRes) ? ownersRes : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load hire challans.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<HireChallanRecord>[] = [
    {
      key: "challan_number",
      header: "Challan Number",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-bold text-[#101828] block">
            {row.challan_number}
          </span>
          <span className="block text-[11px] text-[#667085]">
            {formatDate(row.challan_date)}
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
            {row.driver_name || "Unassigned"} {row.driver_phone ? `(${row.driver_phone})` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Vehicle Owner / Broker",
      cell: (row) => (
        <span className="text-xs text-[#344054]">
          {row.owner_name || "Direct Driver"}
        </span>
      ),
    },
    {
      key: "rate",
      header: "Agreed Rate",
      isNumeric: true,
      cell: (row) => formatCurrency(row.hire_rate),
    },
    {
      key: "balance",
      header: "Balance Due",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono font-semibold text-[#B42318]">
          {formatCurrency(row.balance_amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Challan Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.status} />,
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
      id: "challan_info",
      title: "Hire Challan Specification",
      description: "Agreement with vehicle supplier / market truck owner",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Truck Registration Number",
          placeholder: "e.g. RJ-14-GH-9876",
          required: true,
        },
        {
          name: "challan_date",
          label: "Challan Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          name: "owner_id",
          label: "Vehicle Owner / Broker",
          type: "select",
          options: ownerOptions,
        },
        {
          name: "driver_name",
          label: "Driver Name",
          placeholder: "e.g. Suresh Yadav",
        },
        {
          name: "driver_phone",
          label: "Driver Mobile",
          placeholder: "9876543210",
        },
        {
          name: "driver_license_number",
          label: "Driver License No",
          placeholder: "DL-1420110012345",
        },
      ],
    },
    {
      id: "financial_terms",
      title: "Commercial & Payment Terms",
      description: "Hire rates, freight advance, and TDS deductions",
      columns: 2,
      fields: [
        {
          name: "hire_rate",
          label: "Total Agreed Lorry Hire (₹)",
          type: "number",
          placeholder: "45000",
          required: true,
        },
        {
          name: "advance_amount",
          label: "Advance Paid to Driver/Owner (₹)",
          type: "number",
          placeholder: "20000",
        },
        {
          name: "tds_rate",
          label: "TDS Percentage (%)",
          type: "number",
          placeholder: "1.0 or 2.0",
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
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue hire challan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hire Challan"
        description="Issue hire challans for market fleet vehicles, track advances, and settle balances."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Hire Challans" },
        ]}
        primaryAction={{
          label: "Issue Hire Challan",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by challan number, vehicle, owner..."
        filters={[
          {
            id: "status",
            label: "All Statuses",
            value: statusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Draft", value: "DRAFT" },
              { label: "Issued", value: "ISSUED" },
              { label: "In Transit", value: "TRANSIT" },
              { label: "Settled", value: "SETTLED" },
              { label: "Cancelled", value: "CANCELLED" },
            ],
            onChange: setStatusFilter,
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
        hasActiveFilters={Boolean(searchTerm || statusFilter !== "ALL")}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        emptyMessage="No hire challans issued"
        emptySubtext="Issue hire challans to record market vehicle hiring and advance vouchers."
        emptyAction={{
          label: "Issue Hire Challan",
          onClick: () => setIsDrawerOpen(true),
        }}
        searchable={false}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Issue Market Vehicle Hire Challan"
        description="Create an official hire challan contract with vehicle supplier."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Issue Challan"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
