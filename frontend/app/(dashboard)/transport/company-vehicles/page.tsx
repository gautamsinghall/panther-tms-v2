"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Form } from "@/components/forms/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface CompanyVehicleRecord {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  capacity_mt: string | number;
  chassis_number?: string;
  engine_number?: string;
  current_odometer_km: number;
  default_driver_id?: number;
  insurance_expiry?: string;
  national_permit_expiry?: string;
  is_active: boolean;
}

interface DriverOption {
  id: number;
  name: string;
}

export default function CompanyVehiclesPage() {
  const [data, setData] = useState<CompanyVehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [deactivatingRecord, setDeactivatingRecord] = useState<CompanyVehicleRecord | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [vehiclesRes, driversRes] = await Promise.all([
        apiClient<CompanyVehicleRecord[]>("/api/v1/transport/company-vehicles"),
        apiClient<DriverOption[]>("/api/v1/transport/drivers"),
      ]);
      setData(Array.isArray(vehiclesRes) ? vehiclesRes : []);
      setDrivers(Array.isArray(driversRes) ? driversRes : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load company vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;
      return true;
    });
  }, [data, statusFilter]);

  const columns: ColumnDef<CompanyVehicleRecord>[] = [
    {
      key: "vehicle_number",
      header: "Registration Number",
      sortable: true,
      cell: (row) => (
        <VehiclePlate vehicleNumber={row.vehicle_number} source="COMPANY" />
      ),
    },
    {
      key: "vehicle_type",
      header: "Vehicle Type",
      sortable: true,
      cell: (row) => (
        <span className="text-xs font-medium text-[#101828]">
          {row.vehicle_type}
        </span>
      ),
    },
    {
      key: "capacity_mt",
      header: "Capacity (MT)",
      sortable: true,
      isNumeric: true,
      cell: (row) => `${parseFloat(String(row.capacity_mt)).toFixed(2)} MT`,
    },
    {
      key: "current_odometer_km",
      header: "Odometer Reading",
      sortable: true,
      isNumeric: true,
      cell: (row) => `${row.current_odometer_km?.toLocaleString() || 0} km`,
    },
    {
      key: "chassis_engine",
      header: "Chassis / Engine",
      cell: (row) => (
        <span className="font-mono text-xs text-[#667085]">
          {row.chassis_number || "-"} / {row.engine_number || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "Active" : "Inactive"}
          variant={row.is_active ? "active" : "inactive"}
        />
      ),
    },
  ];

  const actions: RowAction<CompanyVehicleRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: (row) => {
        setDeactivatingRecord(row);
      },
    },
  ];

  const driverOptions = drivers.map((d) => ({
    label: d.name,
    value: String(d.id),
  }));

  const formSections: FormSectionDef[] = [
    {
      id: "vehicle_info",
      title: "Vehicle Registration & Specs",
      description: "Company-owned asset technical specifications",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Registration Number",
          placeholder: "e.g. MH-12-AB-1234",
          required: true,
        },
        {
          name: "vehicle_type",
          label: "Body Specification",
          type: "select",
          required: true,
          options: [
            { label: "32 FT Multi-Axle Closed Container", value: "32 FT Container" },
            { label: "20 FT High Bed Trailer", value: "20 FT Trailer" },
            { label: "Open 10-Tyre Heavy Truck", value: "10-Tyre Open" },
            { label: "Taurus 21 MT Truck", value: "Taurus 21MT" },
            { label: "LCV 14 FT Light Commercial", value: "14 FT LCV" },
          ],
        },
        {
          name: "capacity_mt",
          label: "Payload Capacity (MT)",
          placeholder: "e.g. 21.50",
          type: "number",
          required: true,
        },
        {
          name: "current_odometer_km",
          label: "Current Odometer (KM)",
          placeholder: "e.g. 45000",
          type: "number",
          required: true,
        },
        {
          name: "chassis_number",
          label: "Chassis Number",
          placeholder: "e.g. MAT452092K...",
        },
        {
          name: "engine_number",
          label: "Engine Number",
          placeholder: "e.g. E483CD98...",
        },
        {
          name: "default_driver_id",
          label: "Default Assigned Driver",
          type: "select",
          options: [{ label: "None Assigned", value: "" }, ...driverOptions],
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
        current_odometer_km: parseInt(values.current_odometer_km, 10) || 0,
        default_driver_id: values.default_driver_id ? parseInt(values.default_driver_id, 10) : null,
      };

      await apiClient("/api/v1/transport/company-vehicles", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create vehicle record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRecord) return;
    setIsDeactivating(true);
    try {
      await apiClient(`/api/v1/transport/company-vehicles/${deactivatingRecord.id}`, {
        method: "DELETE",
      });
      setDeactivatingRecord(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate vehicle.");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PageHeader */}
      <PageHeader
        title="Company Vehicles"
        description="Manage company-owned fleet assets, capacity limits, odometers, and driver assignments."
        primaryAction={{
          label: "Add Vehicle",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {/* FilterBar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search registration, body spec, chassis..."
        filters={[
          {
            id: "status",
            label: "Filter Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
        }}
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchable={false}
        emptyMessage="No vehicles found"
        emptySubtext="Add your first company truck or trailer to begin assigning fleet to trips."
        emptyAction={{
          label: "+ Add Vehicle",
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {/* EntityDrawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Add Company Fleet Vehicle"
        description="Enter vehicle registration number, payload tonnage, and engine specs."
        width="xl"
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Add Vehicle"
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* ConfirmDialog */}
      <ConfirmDialog
        isOpen={!!deactivatingRecord}
        onClose={() => setDeactivatingRecord(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Vehicle"
        entityName={deactivatingRecord?.vehicle_number}
        consequence="Deactivating this vehicle prevents it from being scheduled for new trips and hire challans."
        confirmLabel="Deactivate Vehicle"
        isLoading={isDeactivating}
      />
    </div>
  );
}
