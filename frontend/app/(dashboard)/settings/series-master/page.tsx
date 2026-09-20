"use client";

import React, { useState } from "react";
import { Plus, Hash, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";

interface SeriesItem {
  id: number;
  document_type: string;
  prefix: string;
  suffix: string;
  starting_number: number;
  current_number: number;
  financial_year: string;
  status: "ACTIVE" | "INACTIVE";
}

const SAMPLE_SERIES: SeriesItem[] = [
  {
    id: 1,
    document_type: "GR / Lorry Receipt (LR)",
    prefix: "LR-2026-",
    suffix: "",
    starting_number: 1,
    current_number: 84,
    financial_year: "2026-2027",
    status: "ACTIVE",
  },
  {
    id: 2,
    document_type: "Transport Invoice",
    prefix: "INV-2026-",
    suffix: "",
    starting_number: 1,
    current_number: 42,
    financial_year: "2026-2027",
    status: "ACTIVE",
  },
  {
    id: 3,
    document_type: "Hire Challan (HC)",
    prefix: "HC-2026-",
    suffix: "",
    starting_number: 1,
    current_number: 56,
    financial_year: "2026-2027",
    status: "ACTIVE",
  },
  {
    id: 4,
    document_type: "Receipt Voucher",
    prefix: "RCP-2026-",
    suffix: "",
    starting_number: 1,
    current_number: 28,
    financial_year: "2026-2027",
    status: "ACTIVE",
  },
  {
    id: 5,
    document_type: "Payment Voucher",
    prefix: "PAY-2026-",
    suffix: "",
    starting_number: 1,
    current_number: 65,
    financial_year: "2026-2027",
    status: "ACTIVE",
  },
];

export default function SeriesMasterPage() {
  const [data] = useState<SeriesItem[]>(SAMPLE_SERIES);

  const columns: ColumnDef<SeriesItem>[] = [
    {
      key: "document_type",
      header: "Document Module / Type",
      sortable: true,
      cell: (row) => <span className="font-semibold text-xs text-[#172033]">{row.document_type}</span>,
    },
    {
      key: "prefix",
      header: "Format Prefix",
      cell: (row) => <span className="font-mono text-xs font-semibold text-[#C9A227]">{row.prefix}XXXX</span>,
    },
    {
      key: "current_number",
      header: "Current Running #",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-bold text-[#172033]">{row.current_number}</span>,
    },
    {
      key: "financial_year",
      header: "Financial Year",
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{row.financial_year}</span>,
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
        title="Document Series Master"
        description="Configure automated alphanumeric numbering sequences, financial year resets, and prefix schemes for transport documents."
        breadcrumbs={[
          { label: "Settings", href: "/settings/users" },
          { label: "Series Master" },
        ]}
        primaryAction={{
          label: "New Series Format",
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
