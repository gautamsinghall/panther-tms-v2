"use client";

import React, { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";

interface BranchItem {
  id: number;
  code: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  is_head_office: boolean;
  status: string;
}

const INITIAL_BRANCHES: BranchItem[] = [
  {
    id: 1,
    code: "B-MUM-01",
    name: "Mumbai Central Hub & HQ",
    city: "Navi Mumbai",
    state: "Maharashtra",
    phone: "+91 22 2345 6789",
    email: "mumbai@demo.com",
    is_head_office: true,
    status: "ACTIVE",
  },
  {
    id: 2,
    code: "B-DEL-01",
    name: "Delhi NCR Transshipment Facility",
    city: "New Delhi",
    state: "Delhi",
    phone: "+91 11 4567 8901",
    email: "delhi@demo.com",
    is_head_office: false,
    status: "ACTIVE",
  },
  {
    id: 3,
    code: "B-BLR-01",
    name: "Bangalore Logistics Center",
    city: "Bengaluru",
    state: "Karnataka",
    phone: "+91 80 3456 7890",
    email: "bangalore@demo.com",
    is_head_office: false,
    status: "ACTIVE",
  },
];

export default function BranchesPage() {
  const [branches] = useState<BranchItem[]>(INITIAL_BRANCHES);

  const columns: ColumnDef<BranchItem>[] = [
    {
      key: "code",
      header: "Branch Code",
      sortable: true,
      cell: (row) => <span className="font-mono font-semibold text-[#172033]">{row.code}</span>,
    },
    {
      key: "name",
      header: "Branch Name & Role",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium text-[#172033] flex items-center gap-1.5">
            {row.name}
            {row.is_head_office && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#C9A227]/15 text-[#C9A227]">
                HQ
              </span>
            )}
          </div>
          <div className="text-xs text-[#667085] flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {row.city}, {row.state}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Contact",
      cell: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-[#172033]">{row.phone}</div>
          <div className="text-[#667085]">{row.email}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} variant="active" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Locations"
        description="Manage regional transshipment hubs, dispatch centers, and operating branches."
        breadcrumbs={[
          { label: "Profile", href: "/profile/account" },
          { label: "Branches" },
        ]}
        primaryAction={{
          label: "Add New Branch",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {},
        }}
      />

      <DataTable
        columns={columns}
        data={branches}
      />
    </div>
  );
}
