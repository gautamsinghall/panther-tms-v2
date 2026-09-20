"use client";

import React, { useEffect, useState } from "react";
import { Plus, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface FleetDoc {
  id: number;
  vehicle_number: string;
  vehicle_type: string;
  doc_type: string;
  document_number: string;
  issuing_authority?: string;
  valid_from?: string;
  valid_till: string;
  days_to_expire: number;
  status: string;
  remarks?: string;
}

export default function FleetDocumentsPage() {
  const [data, setData] = useState<FleetDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [formData, setFormData] = useState({
    vehicle_number: "",
    vehicle_type: "COMPANY",
    doc_type: "FITNESS_CERT",
    document_number: "",
    issuing_authority: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_till: "",
    remarks: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<FleetDoc[]>("/api/v1/fleet/documents");
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Failed to load vehicle documents:", e);
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
      await apiClient("/api/v1/fleet/documents", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      setIsAddOpen(false);
      setFormData({
        vehicle_number: "",
        vehicle_type: "COMPANY",
        doc_type: "FITNESS_CERT",
        document_number: "",
        issuing_authority: "",
        valid_from: new Date().toISOString().split("T")[0],
        valid_till: "",
        remarks: "",
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to upload document record.");
    }
  };

  const columns: ColumnDef<FleetDoc>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Plate",
      sortable: true,
      cell: (row) => <VehiclePlate vehicleNumber={row.vehicle_number} />,
    },
    {
      key: "doc_type",
      header: "Document Classification",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-xs text-[#101828]">
          {row.doc_type.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "document_number",
      header: "Certificate / Policy #",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#172033]">{row.document_number}</span>
          <div className="text-[11px] text-[#667085]">{row.issuing_authority || "—"}</div>
        </div>
      ),
    },
    {
      key: "valid_till",
      header: "Validity",
      sortable: true,
      cell: (row) => (
        <div className="text-xs font-mono">
          <div>{formatDate(row.valid_till)}</div>
          <div className={row.days_to_expire <= 15 ? "text-amber-600 font-bold" : "text-[#667085]"}>
            {row.days_to_expire > 0 ? `${row.days_to_expire} days left` : "Expired"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Compliance Status",
      cell: (row) => {
        const isExpiring = row.days_to_expire <= 30 && row.days_to_expire > 0;
        const isExpired = row.days_to_expire <= 0;
        return (
          <StatusBadge
            status={isExpired ? "EXPIRED" : isExpiring ? "EXPIRING SOON" : "VALID"}
            variant={isExpired ? "danger" : isExpiring ? "pending" : "completed"}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Documents & Compliance"
        description="Track commercial fitness certificates, national permits, comprehensive insurance, PUC, and RTO taxes with auto-expiry alerts."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Documents" },
        ]}
        primaryAction={{
          label: "Upload Document",
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

      {/* Upload Document Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card border border-[#E4E7EC] w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#E4E7EC] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#101828]">Upload Vehicle Compliance Certificate</h2>
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
                  <label className="text-xs font-semibold text-[#344054]">Vehicle Source</label>
                  <select
                    className="w-full h-9 rounded-control border border-[#D0D5DD] px-3 text-xs bg-white"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  >
                    <option value="COMPANY">COMPANY</option>
                    <option value="MARKET">MARKET</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Document Type *</label>
                <select
                  className="w-full h-9 rounded-control border border-[#D0D5DD] px-3 text-xs bg-white"
                  value={formData.doc_type}
                  onChange={(e) => setFormData({ ...formData, doc_type: e.target.value })}
                >
                  <option value="FITNESS_CERT">FITNESS CERTIFICATE</option>
                  <option value="INSURANCE">COMPREHENSIVE INSURANCE</option>
                  <option value="NATIONAL_PERMIT">NATIONAL PERMIT</option>
                  <option value="PUC">POLLUTION UNDER CONTROL (PUC)</option>
                  <option value="ROAD_TAX">RTO ROAD TAX</option>
                  <option value="REGISTRATION_RC">RC BOOK</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Policy / Certificate Number *</label>
                <Input
                  required
                  placeholder="e.g. NIC-COMM-992102"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Issuing Authority</label>
                <Input
                  placeholder="e.g. National Insurance Co / RTO Pune"
                  value={formData.issuing_authority}
                  onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Valid From</label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#344054]">Valid Till *</label>
                  <Input
                    required
                    type="date"
                    value={formData.valid_till}
                    onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#344054]">Remarks</label>
                <Input
                  placeholder="Coverage, endorsement, or renewal notes"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4E7EC]">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Document</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
