"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface FleetDoc {
  id: number;
  vehicle_no: string;
  doc_type: "FITNESS_CERT" | "INSURANCE" | "NATIONAL_PERMIT" | "PUC" | "ROAD_TAX";
  policy_number: string;
  issuer: string;
  valid_from: string;
  valid_till: string;
  days_to_expire: number;
  status: "VALID" | "EXPIRING_SOON" | "EXPIRED";
}

const SAMPLE_DOCS: FleetDoc[] = [
  {
    id: 1,
    vehicle_no: "MH-12-RN-4821",
    doc_type: "INSURANCE",
    policy_number: "NIC-COMM-992102",
    issuer: "National Insurance Co Ltd",
    valid_from: "2026-01-01",
    valid_till: "2026-12-31",
    days_to_expire: 102,
    status: "VALID",
  },
  {
    id: 2,
    vehicle_no: "MH-12-RN-4821",
    doc_type: "NATIONAL_PERMIT",
    policy_number: "NP-MH-2024-8839",
    issuer: "Ministry of Road Transport & Highways",
    valid_from: "2024-05-01",
    valid_till: "2029-04-30",
    days_to_expire: 952,
    status: "VALID",
  },
  {
    id: 3,
    vehicle_no: "DL-01-AB-1290",
    doc_type: "PUC",
    policy_number: "PUC-DL-88201",
    issuer: "Delhi Transport Dept",
    valid_from: "2026-03-25",
    valid_till: "2026-09-24",
    days_to_expire: 4,
    status: "EXPIRING_SOON",
  },
  {
    id: 4,
    vehicle_no: "KA-04-DE-5567",
    doc_type: "FITNESS_CERT",
    policy_number: "FIT-KA-2025-0012",
    issuer: "RTO Bangalore Central",
    valid_from: "2025-08-11",
    valid_till: "2027-08-10",
    days_to_expire: 324,
    status: "VALID",
  },
];

export default function FleetDocumentsPage() {
  const [data] = useState<FleetDoc[]>(SAMPLE_DOCS);

  const columns: ColumnDef<FleetDoc>[] = [
    {
      key: "vehicle_no",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.vehicle_no}</span>,
    },
    {
      key: "doc_type",
      header: "Document Type",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-xs text-[#172033]">
          {row.doc_type.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "policy_number",
      header: "Permit / Certificate #",
      cell: (row) => (
        <div>
          <span className="font-mono text-xs text-[#172033]">{row.policy_number}</span>
          <div className="text-[11px] text-[#667085]">{row.issuer}</div>
        </div>
      ),
    },
    {
      key: "valid_till",
      header: "Validity",
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
      header: "Status",
      cell: (row) => (
        <StatusBadge
          status={row.status.replace("_", " ")}
          variant={row.status === "VALID" ? "completed" : "pending"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Documents & Compliance"
        description="Track commercial fitness, national permits, comprehensive insurance, PUC, and RTO taxes with auto-expiry alerts."
        breadcrumbs={[
          { label: "Fleet", href: "/fleet/trip-expense" },
          { label: "Documents" },
        ]}
        primaryAction={{
          label: "Upload Vehicle Document",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {},
        }}
      />

      <DataTable
        columns={columns}
        data={data}
      />
    </div>
  );
}
