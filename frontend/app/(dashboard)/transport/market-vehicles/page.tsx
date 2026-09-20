"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface MarketVehicleRecord {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_mt: string | number;
  owner_id?: number;
  owner_name?: string;
  owner_phone?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
  is_active: boolean;
}

interface OwnerOption {
  id: number;
  name: string;
}

export default function MarketVehiclesPage() {
  const [data, setData] = useState<MarketVehicleRecord[]>([]);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
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
      const [vehiclesRes, ownersRes] = await Promise.all([
        apiClient<MarketVehicleRecord[]>("/api/v1/transport/market-vehicles"),
        apiClient<OwnerOption[]>("/api/v1/transport/vehicle-owners"),
      ]);
      setData(Array.isArray(vehiclesRes) ? vehiclesRes : []);
      setOwners(Array.isArray(ownersRes) ? ownersRes : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load market vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<MarketVehicleRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <VehiclePlate vehicleNumber={row.vehicle_number} source="MARKET" />
      ),
    },
    {
      key: "vehicle_type",
      header: "Type & Capacity",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-medium block">
            {row.vehicle_type}
          </span>
          <span className="text-[11px] text-[#667085]">
            {parseFloat(String(row.capacity_mt)).toFixed(2)} MT Payload
          </span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner / Supplier",
      cell: (row) => (
        <div>
          <span className="text-xs text-[#101828] font-medium block">
            {row.owner_name || "Direct Driver"}
          </span>
          {row.owner_phone && (
            <span className="text-[11px] text-[#667085]">
              {row.owner_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "documents",
      header: "Fitness / Insurance",
      cell: (row) => (
        <div className="text-[11px] text-[#667085]">
          <div>Fitness: {formatDate(row.fitness_expiry)}</div>
          <div>Insurance: {formatDate(row.insurance_expiry)}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<MarketVehicleRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.vehicle_number}?`)) return;
        try {
          await apiClient(`/api/v1/transport/market-vehicles/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate vehicle.");
        }
      },
    },
  ];

  const ownerOptions = [
    { label: "None / Direct Driver", value: "" },
    ...owners.map((o) => ({ label: o.name, value: String(o.id) })),
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "market_vehicle_info",
      title: "Market Vehicle Registration",
      description: "External hired vehicle specifications and documentation",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Vehicle Registration Number",
          placeholder: "e.g. MH-04-AZ-5678",
          required: true,
        },
        {
          name: "vehicle_type",
          label: "Body / Vehicle Type",
          type: "select",
          required: true,
          options: [
            { label: "32 Ft Multi-Axle Container", value: "32 FT MX CONTAINER" },
            { label: "32 Ft Single-Axle Container", value: "32 FT SXL CONTAINER" },
            { label: "20 Ft Open Body Truck", value: "20 FT OPEN" },
            { label: "24 Ft Open Body Truck", value: "24 FT OPEN" },
            { label: "19 Ft Taurus 16 Wheeler", value: "TAURUS 16W" },
            { label: "Trailer 40 Ft Flatbed", value: "40 FT FLATBED TRAILER" },
            { label: "Pickup / LCV 14 Ft", value: "14 FT LCV" },
          ],
        },
        {
          name: "capacity_mt",
          label: "Payload Capacity (MT)",
          type: "number",
          placeholder: "16.5",
          required: true,
        },
        {
          name: "owner_id",
          label: "Vehicle Owner / Broker",
          type: "select",
          options: ownerOptions,
        },
        {
          name: "fitness_expiry",
          label: "Fitness Certificate Expiry",
          type: "date",
        },
        {
          name: "insurance_expiry",
          label: "Insurance Policy Expiry",
          type: "date",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        capacity_mt: parseFloat(values.capacity_mt) || 0,
        owner_id: values.owner_id ? parseInt(values.owner_id, 10) : null,
      };
      await apiClient("/api/v1/transport/market-vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to register market vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Vehicles"
        description="Registry of third-party hired trucks, trailers, and market broker vehicles."
        breadcrumbs={[
          { label: "Transport", href: "/transport/jobs" },
          { label: "Market Vehicles" },
        ]}
        primaryAction={{
          label: "Add Market Vehicle",
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
        searchPlaceholder="Search by registration number, type, or owner..."
        emptyMessage="No market vehicles registered"
        emptySubtext="Add vendor/market vehicles available for trip placement and hire challans."
        emptyAction={{
          label: "Add Market Vehicle",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Register Market Vehicle"
        description="Add a vendor truck into the market fleet registry."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Register Vehicle"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
