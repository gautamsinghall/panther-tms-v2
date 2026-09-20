"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ServiceRecord {
  id: number;
  job_card_number: string;
  vehicle_number: string;
  service_type: string;
  workshop_name: string;
  service_date: string;
  completion_date?: string;
  odometer_km: number;
  description_of_work?: string;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  invoice_number?: string;
  status: string;
  remarks?: string;
}

export default function RepairServicePage() {
  const [data, setData] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_number: "",
    service_type: "SCHEDULED_PM",
    workshop_name: "",
    service_date: new Date().toISOString().split("T")[0],
    odometer_km: "",
    description_of_work: "",
    parts_cost: "",
    labor_cost: "",
    invoice_number: "",
    status: "COMPLETED",
    remarks: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<ServiceRecord[]>("/api/v1/fleet/services");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load service job cards:", e);
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
      const parts = parseFloat(formData.parts_cost) || 0;
      const labor = parseFloat(formData.labor_cost) || 0;
      await apiClient("/api/v1/fleet/services", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          parts_cost: parts,
          labor_cost: labor,
          total_cost: parts + labor,
          odometer_km: formData.odometer_km ? parseInt(formData.odometer_km) : 0,
        }),
      });
      setIsAddOpen(false);
      setFormData({
        vehicle_number: "",
        service_type: "SCHEDULED_PM",
        workshop_name: "",
        service_date: new Date().toISOString().split("T")[0],
        odometer_km: "",
        description_of_work: "",
        parts_cost: "",
        labor_cost: "",
        invoice_number: "",
        status: "COMPLETED",
        remarks: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to create job card.");
    }
  };

  const columns: ColumnDef<ServiceRecord>[] = [
    {
      key: "job_card_number",
      header: "Job Card #",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.job_card_number}</span>,
    },
    {
      key: "vehicle_number",
      header: "Vehicle & Odometer",
      cell: (row) => (
        <div>
          <VehiclePlate vehicleNumber={row.vehicle_number} />
          <div className="text-xs text-[#667085] mt-0.5">{row.odometer_km.toLocaleString()} KM</div>
        </div>
      ),
    },
    {
      key: "service_type",
      header: "Service Classification",
      cell: (row) => (
        <div>
          <div className="font-medium text-xs text-[#172033]">{row.service_type.replace("_", " ")}</div>
          <div className="text-[11px] text-[#667085]">{row.workshop_name}</div>
        </div>
      ),
    },
    {
      key: "service_date",
      header: "Service Date",
      cell: (row) => <span>{formatDate(row.service_date)}</span>,
    },
    {
      key: "total_cost",
      header: "Total Cost (₹)",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <div>
          <span className="font-mono font-semibold text-[#172033]">{formatCurrency(row.total_cost)}</span>
          <div className="text-[11px] text-[#667085]">
            Parts: {formatCurrency(row.parts_cost)} | Labor: {formatCurrency(row.labor_cost)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status.replace("_", " ")}
          variant={row.status === "COMPLETED" ? "completed" : row.status === "IN_PROGRESS" ? "in_progress" : "pending"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repair & Maintenance Workshop"
        description="Schedule preventative maintenance, track breakdown job cards, and manage workshop service invoices."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Repair & Service" },
        ]}
        primaryAction={{
          label: "Open Job Card",
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

      {/* Open Job Card Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card border border-[#E4E7EC] w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#101828]">Open Workshop Job Card</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-[#667085] hover:text-[#101828]">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Vehicle Number *</label>
                  <Input
                    required
                    placeholder="e.g. MH-12-RN-4821"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Service Classification</label>
                  <select
                    className="w-full h-9 rounded-control border border-[#D0D5DD] px-3 text-xs bg-white"
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  >
                    <option value="SCHEDULED_PM">SCHEDULED PM</option>
                    <option value="BREAKDOWN_REPAIR">BREAKDOWN REPAIR</option>
                    <option value="OIL_CHANGE">OIL CHANGE</option>
                    <option value="BRAKE_OVERHAUL">BRAKE OVERHAUL</option>
                    <option value="TYRE_SERVICE">TYRE SERVICE</option>
                    <option value="BODY_ACCIDENT">BODY / ACCIDENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Workshop Hub *</label>
                  <Input
                    required
                    placeholder="e.g. Tata Authorized Service Hub"
                    value={formData.workshop_name}
                    onChange={(e) => setFormData({ ...formData, workshop_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Odometer at Service (KM)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 115000"
                    value={formData.odometer_km}
                    onChange={(e) => setFormData({ ...formData, odometer_km: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Description of Work Carried Out</label>
                <Input
                  placeholder="Engine oil drain, air filter, brake shoe skimming, etc."
                  value={formData.description_of_work}
                  onChange={(e) => setFormData({ ...formData, description_of_work: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Parts Cost (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.parts_cost}
                    onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Labor Cost (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Workshop Invoice #</label>
                  <Input
                    placeholder="e.g. INV-TATA-4412"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Job Card Status</label>
                  <select
                    className="w-full h-9 rounded-control border border-[#D0D5DD] px-3 text-xs bg-white"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7EC]">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Job Card</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
