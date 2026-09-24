"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface TyreItem {
  id: number;
  serial_number: string;
  brand: string;
  size: string;
  vehicle_number?: string;
  axle_position?: string;
  initial_tread_depth_mm: number;
  current_tread_depth_mm: number;
  installed_date?: string;
  installed_odometer_km: number;
  total_km_run: number;
  purchase_cost: number;
  status: string;
  remarks?: string;
}

export default function TyreManagementPage() {
  const [data, setData] = useState<TyreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    serial_number: "",
    brand: "",
    size: "295/90 R20",
    vehicle_number: "",
    axle_position: "Front Right (FR)",
    initial_tread_depth_mm: "15.0",
    current_tread_depth_mm: "15.0",
    purchase_cost: "",
    remarks: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<TyreItem[]>("/api/v1/fleet/tyres");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load tyre inventory:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient("/api/v1/fleet/tyres", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          initial_tread_depth_mm: parseFloat(formData.initial_tread_depth_mm) || 15.0,
          current_tread_depth_mm: parseFloat(formData.current_tread_depth_mm) || 15.0,
          purchase_cost: parseFloat(formData.purchase_cost) || 0,
        }),
      });
      setIsAddOpen(false);
      setFormData({
        serial_number: "",
        brand: "",
        size: "295/90 R20",
        vehicle_number: "",
        axle_position: "Front Right (FR)",
        initial_tread_depth_mm: "15.0",
        current_tread_depth_mm: "15.0",
        purchase_cost: "",
        remarks: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to register tyre.");
    }
  };

  const columns: ColumnDef<TyreItem>[] = [
    {
      key: "serial_number",
      header: "Tyre Serial #",
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#172033]">{row.serial_number}</span>
          <div className="text-xs text-[#667085]">{row.brand} ({row.size})</div>
        </div>
      ),
    },
    {
      key: "vehicle_number",
      header: "Mounted Vehicle & Axle",
      cell: (row) => (
        <div>
          {row.vehicle_number ? (
            <VehiclePlate vehicleNumber={row.vehicle_number} />
          ) : (
            <span className="text-xs text-[#667085]">Depot Inventory</span>
          )}
          <div className="text-xs text-[#344054] mt-0.5">{row.axle_position || "Spare"}</div>
        </div>
      ),
    },
    {
      key: "current_tread_depth_mm",
      header: "Tread Depth",
      align: "right",
      isNumeric: true,
      cell: (row) => {
        const isCritical = row.current_tread_depth_mm <= 4.0;
        return (
          <span className={`font-mono font-bold ${isCritical ? "text-rose-600" : "text-emerald-600"}`}>
            {row.current_tread_depth_mm} mm
          </span>
        );
      },
    },
    {
      key: "total_km_run",
      header: "Total KM Run",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-[#172033]">{row.total_km_run.toLocaleString()} KM</span>,
    },
    {
      key: "purchase_cost",
      header: "Cost (₹)",
      align: "right",
      isNumeric: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatCurrency(row.purchase_cost)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status.replace("_", " ")}
          variant={
            row.status === "MOUNTED_GOOD"
              ? "completed"
              : row.status === "RETREAD_DUE"
              ? "pending"
              : "danger"
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tyre Inventory & Lifecycle Management"
        description="Monitor axle fitments, tread depth wear inspection, retreading schedules, and scrap disposal."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Tyre Management" },
        ]}
        primaryAction={{
          label: "Add New Tyre",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setIsAddOpen(true),
        }}
        secondaryActions={[
          {
            label: "Refresh",
            icon: <RefreshCw className="w-4 h-4" />,
            variant: "outline",
            onClick: fetchData,
          },
        ]}
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
      />

      {/* Add Tyre Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card border border-[#E4E7EC] w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#101828]">Register New Tyre</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-[#667085] hover:text-[#101828]">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#344054]">Tyre Serial Number *</label>
                <Input
                  required
                  placeholder="e.g. MRF-99210-A"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Brand *</label>
                  <Input
                    required
                    placeholder="e.g. MRF / Apollo / JK"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Size *</label>
                  <Input
                    required
                    placeholder="e.g. 295/90 R20"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Mounted Vehicle</label>
                  <Input
                    placeholder="e.g. MH-12-RN-4821"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Axle Position</label>
                  <SearchableSelect
                    size="sm"
                    value={formData.axle_position}
                    onChange={(val) => setFormData({ ...formData, axle_position: String(val) })}
                    options={[
                      { value: "Front Right (FR)", label: "Front Right (FR)" },
                      { value: "Front Left (FL)", label: "Front Left (FL)" },
                      { value: "Rear Axle 1 Inner (R1I)", label: "Rear Axle 1 Inner (R1I)" },
                      { value: "Rear Axle 1 Outer (R1O)", label: "Rear Axle 1 Outer (R1O)" },
                      { value: "Rear Axle 2 Inner (R2I)", label: "Rear Axle 2 Inner (R2I)" },
                      { value: "Rear Axle 2 Outer (R2O)", label: "Rear Axle 2 Outer (R2O)" },
                      { value: "Spare", label: "Spare" },
                    ]}
                    placeholder="Select axle position..."
                    searchPlaceholder="Search position..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Tread Depth (mm)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.current_tread_depth_mm}
                    onChange={(e) => setFormData({ ...formData, current_tread_depth_mm: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Purchase Cost (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Remarks</label>
                <Input
                  placeholder="Installation notes, rim specs, or retread count"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7EC]">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Register Tyre</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
