"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";

interface LocationRecord {
  id: number;
  country: string;
  state: string;
  city_name: string;
  location_code?: string;
  is_pickup_point: boolean;
  is_drop_point: boolean;
  address?: string;
  pincode?: string;
  is_active: boolean;
}

export default function LocationPage() {
  const [data, setData] = useState<LocationRecord[]>([]);
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
      const res = await apiClient<LocationRecord[]>("/api/v1/general/locations");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load locations.");
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

  const columns: ColumnDef<LocationRecord>[] = [
    {
      key: "city_name",
      header: "City / Hub",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.city_name}
        </span>
      ),
    },
    {
      key: "state",
      header: "State / Country",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-[#344054]">
          {row.state}, {row.country}
        </span>
      ),
    },
    {
      key: "location_code",
      header: "Hub Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs text-[#667085]">
          {row.location_code || "-"}
        </span>
      ),
    },
    {
      key: "pincode",
      header: "Pincode",
      cell: (row) => (
        <span className="font-mono text-xs text-[#344054]">
          {row.pincode || "-"}
        </span>
      ),
    },
    {
      key: "pickup_drop",
      header: "Capabilities",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs">
          {row.is_pickup_point && (
            <span className="bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] px-2 py-0.5 rounded-[4px] text-[11px] font-medium">
              Pickup
            </span>
          )}
          {row.is_drop_point && (
            <span className="bg-[#EFF8FF] text-[#175CD3] border border-[#BFDBFE] px-2 py-0.5 rounded-[4px] text-[11px] font-medium">
              Drop
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  const actions: RowAction<LocationRecord>[] = [
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      onClick: async (row) => {
        if (!confirm(`Are you sure you want to deactivate ${row.city_name}?`)) return;
        try {
          await apiClient(`/api/v1/general/locations/${row.id}`, { method: "DELETE" });
          loadData();
        } catch (err: any) {
          alert(err.message || "Failed to deactivate location.");
        }
      },
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "location_info",
      title: "Location Details",
      description: "Hub and transit point definition",
      columns: 2,
      fields: [
        {
          name: "city_name",
          label: "City / Terminal Name",
          placeholder: "e.g. Mundra Port",
          required: true,
        },
        {
          name: "state",
          label: "State",
          placeholder: "e.g. Gujarat",
          required: true,
        },
        {
          name: "country",
          label: "Country",
          type: "select",
          options: COUNTRY_OPTIONS,
          placeholder: "Select Country",
          defaultValue: DEFAULT_COUNTRY,
          required: true,
        },
        {
          name: "location_code",
          label: "Location Code",
          placeholder: "e.g. MUN-01",
        },
        {
          name: "pincode",
          label: "Pincode",
          placeholder: "370421",
        },
        {
          name: "address",
          label: "Full Address / Landmark",
          type: "textarea",
          colSpan: 2,
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await apiClient("/api/v1/general/locations", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          country: values.country || "India",
          is_pickup_point: true,
          is_drop_point: true,
        }),
      });
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create location.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations (Hubs & Terminals)"
        description="Manage origin and destination pickup/drop transit hubs."
        breadcrumbs={[
          { label: "General", href: "/general/location" },
          { label: "Locations" },
        ]}
        primaryAction={{
          label: "Add Location",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by city, state, code..."
        filters={[
          {
            id: "status",
            label: "All Statuses",
            value: statusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
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
        emptyMessage="No locations yet"
        emptySubtext="Add transport transit hubs and terminals to enable booking routes."
        emptyAction={{
          label: "Add Location",
          onClick: () => setIsDrawerOpen(true),
        }}
        searchable={false}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Create New Location"
        description="Register a new hub or terminal in the master network."
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Create Location"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
