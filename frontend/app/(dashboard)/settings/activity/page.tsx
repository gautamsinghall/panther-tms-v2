"use client";

import React, { useState } from "react";
import { History, Shield, User, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

interface ActivityLog {
  id: number;
  timestamp: string;
  user_email: string;
  user_role: string;
  action: string;
  module: string;
  ip_address: string;
}

const SAMPLE_ACTIVITY: ActivityLog[] = [
  {
    id: 1,
    timestamp: "2026-09-20T17:30:00Z",
    user_email: "admin@demo.com",
    user_role: "COMPANY_ADMIN",
    action: "Generated E-Invoice IRN for INV-2026-0082",
    module: "E-Invoicing",
    ip_address: "192.168.1.104",
  },
  {
    id: 2,
    timestamp: "2026-09-20T17:15:20Z",
    user_email: "admin@demo.com",
    user_role: "COMPANY_ADMIN",
    action: "Created LR-2026-0084 (Mumbai -> Delhi)",
    module: "Transport",
    ip_address: "192.168.1.104",
  },
  {
    id: 3,
    timestamp: "2026-09-20T16:40:10Z",
    user_email: "dispatcher@demo.com",
    user_role: "DISPATCHER",
    action: "Updated GPS Ping & ETA for MH-12-RN-4821",
    module: "Tracking",
    ip_address: "103.21.58.12",
  },
  {
    id: 4,
    timestamp: "2026-09-20T15:22:45Z",
    user_email: "accountant@demo.com",
    user_role: "ACCOUNTANT",
    action: "Posted Receipt Voucher RCP-2026-0019 (₹95,000)",
    module: "Accounts",
    ip_address: "192.168.1.108",
  },
];

export default function UserActivityLogPage() {
  const [data] = useState<ActivityLog[]>(SAMPLE_ACTIVITY);

  const columns: ColumnDef<ActivityLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp (IST)",
      sortable: true,
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{formatDateTime(row.timestamp)}</span>,
    },
    {
      key: "user_email",
      header: "User & Role",
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-medium text-xs text-[#172033]">{row.user_email}</div>
          <div className="text-[11px] font-mono text-[#667085]">{row.user_role}</div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action Performed",
      cell: (row) => <span className="text-xs text-[#172033] font-medium">{row.action}</span>,
    },
    {
      key: "module",
      header: "Module",
      cell: (row) => (
        <span className="px-2 py-0.5 rounded bg-[#F2F4F7] text-[#172033] text-xs font-mono">
          {row.module}
        </span>
      ),
    },
    {
      key: "ip_address",
      header: "IP Address",
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{row.ip_address}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Activity & Audit Trail"
        description="Immutable chronological security log tracking system actions, user logins, records created, and financial postings."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Activity Log" },
        ]}
        primaryAction={{
          label: "Export Audit Log",
          icon: <Download className="w-4 h-4" />,
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
