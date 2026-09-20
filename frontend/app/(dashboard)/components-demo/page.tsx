"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Eye, Edit3, Trash2, Printer, RefreshCw, CheckCircle2 } from "lucide-react";

interface MockLRRecord {
  id: string;
  lrNumber: string;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  vehicleNo: string;
  amount: number;
  status: string;
}

const INITIAL_MOCK_DATA: MockLRRecord[] = [
  {
    id: "1",
    lrNumber: "LR-2026-00101",
    consignor: "Tata Steel Ltd",
    consignee: "Maruti Suzuki India",
    origin: "Jamshedpur",
    destination: "Gurugram",
    vehicleNo: "HR-55-AJ-9021",
    amount: 45000.0,
    status: "Delivered",
  },
  {
    id: "2",
    lrNumber: "LR-2026-00102",
    consignor: "Reliance Industries",
    consignee: "Adani Ports",
    origin: "Jamnagar",
    destination: "Mundra",
    vehicleNo: "GJ-12-BV-4412",
    amount: 28500.0,
    status: "In Transit",
  },
  {
    id: "3",
    lrNumber: "LR-2026-00103",
    consignor: "UltraTech Cement",
    consignee: "L&T Construction",
    origin: "Kotputli",
    destination: "Noida",
    vehicleNo: "RJ-14-GH-1109",
    amount: 32000.0,
    status: "Pending",
  },
  {
    id: "4",
    lrNumber: "LR-2026-00104",
    consignor: "ITC Paperboards",
    consignee: "Amazon Fulfillment",
    origin: "Bhadrachalam",
    destination: "Hyderabad",
    vehicleNo: "TS-09-UB-8831",
    amount: 19800.0,
    status: "Paid",
  },
  {
    id: "5",
    lrNumber: "LR-2026-00105",
    consignor: "Jindal Stainless",
    consignee: "BHEL Haridwar",
    origin: "Hisar",
    destination: "Haridwar",
    vehicleNo: "HR-20-KL-5561",
    amount: 51200.0,
    status: "Overdue",
  },
  {
    id: "6",
    lrNumber: "LR-2026-00106",
    consignor: "Ambuja Cements",
    consignee: "DLF Builders",
    origin: "Ropar",
    destination: "Chandigarh",
    vehicleNo: "PB-65-AX-3290",
    amount: 14500.0,
    status: "Cancelled",
  },
];

export default function ComponentsDemoPage() {
  const [activeTab, setActiveTab] = useState<"table" | "form">("table");
  const [tableData, setTableData] = useState<MockLRRecord[]>(INITIAL_MOCK_DATA);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // DataTable column definitions per design.md §3
  const columns: ColumnDef<MockLRRecord>[] = [
    {
      key: "lrNumber",
      header: "LR Number",
      sortable: true,
      width: "160px",
      cell: (row) => (
        <span className="font-mono font-semibold text-[var(--color-primary)]">
          {row.lrNumber}
        </span>
      ),
    },
    {
      key: "consignor",
      header: "Consignor",
      sortable: true,
    },
    {
      key: "consignee",
      header: "Consignee",
      sortable: true,
    },
    {
      key: "route",
      header: "Route",
      cell: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {row.origin} → {row.destination}
        </span>
      ),
    },
    {
      key: "vehicleNo",
      header: "Vehicle No",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium">
          {row.vehicleNo}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Freight (₹)",
      sortable: true,
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="tabular-nums font-semibold">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "center",
      width: "130px",
    },
  ];

  // DataTable row actions menu per design.md §3
  const actions: RowAction<MockLRRecord>[] = [
    {
      label: "View LR Details",
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (row) => alert(`Viewing ${row.lrNumber}`),
    },
    {
      label: "Print Challan",
      icon: <Printer className="w-3.5 h-3.5" />,
      onClick: (row) => alert(`Printing challan for ${row.lrNumber}`),
    },
    {
      label: "Edit Record",
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: (row) => alert(`Editing ${row.lrNumber}`),
      disabled: (row) => row.status === "Cancelled",
    },
    {
      label: "Void LR",
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: "danger",
      onClick: (row) => {
        setTableData((prev) => prev.filter((item) => item.id !== row.id));
      },
    },
  ];

  // Shared Form sections definition per design.md §3
  const formSections: FormSectionDef[] = [
    {
      id: "consignor_details",
      title: "1. Consignor & Pickup Information",
      description: "Primary shipper and origin dispatch point",
      columns: 2,
      fields: [
        {
          name: "consignor_name",
          label: "Consignor Company Name",
          placeholder: "e.g. Tata Steel Ltd",
          required: true,
        },
        {
          name: "origin_city",
          label: "Origin Location / Hub",
          placeholder: "e.g. Jamshedpur Dispatch Yard",
          required: true,
        },
        {
          name: "pickup_contact",
          label: "Pickup Contact Person",
          placeholder: "Name & Phone Number",
        },
        {
          name: "gstin_locked",
          label: "Verified GSTIN",
          placeholder: "20AAACT2727Q1ZW",
          disabled: true,
          disabledReason: "GSTIN is locked after GST Suvidha Provider (GSP) validation.",
          helperText: "Locked after compliance check.",
        },
      ],
    },
    {
      id: "consignee_details",
      title: "2. Consignee & Delivery Information",
      description: "Receiving party and drop destination",
      columns: 2,
      fields: [
        {
          name: "consignee_name",
          label: "Consignee Company Name",
          placeholder: "e.g. Maruti Suzuki India",
          required: true,
        },
        {
          name: "destination_city",
          label: "Destination Drop Point",
          placeholder: "e.g. Manesar Plant 2",
          required: true,
        },
        {
          name: "eway_bill_no",
          label: "E-Way Bill Number",
          placeholder: "12-digit E-Way Bill Number",
        },
        {
          name: "delivery_notes",
          label: "Delivery Instructions",
          type: "textarea",
          placeholder: "Special handling or gate entry instructions...",
          colSpan: 2,
        },
      ],
    },
    {
      id: "commercials",
      title: "3. Freight Charges & Terms",
      description: "Billing values and payment conditions",
      columns: 3,
      fields: [
        {
          name: "freight_amount",
          label: "Base Freight (₹)",
          type: "number",
          placeholder: "45000",
          required: true,
        },
        {
          name: "advance_paid",
          label: "Advance Paid (₹)",
          type: "number",
          placeholder: "10000",
        },
        {
          name: "payment_basis",
          label: "Payment Basis",
          type: "select",
          options: [
            { label: "To Pay (Consignee)", value: "to_pay" },
            { label: "Paid (Consignor)", value: "paid" },
            { label: "TBB (To Be Billed)", value: "tbb" },
          ],
          required: true,
        },
      ],
    },
  ];

  const handleFormSubmit = async (values: Record<string, any>) => {
    setFormSuccessMessage(`Form submitted successfully for: ${values.consignor_name || "New Entity"}`);
    setTimeout(() => setFormSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Shared Design System Showcase
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Built once per design.md §3 for uniform usage across all 12 modules.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-lg bg-slate-200/80 p-1 dark:bg-slate-800">
          <button
            onClick={() => setActiveTab("table")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "table"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Shared DataTable
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "form"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            }`}
          >
            Shared Form System
          </button>
        </div>
      </div>

      {activeTab === "table" ? (
        <div className="space-y-4">
          {/* Table Controls Demo Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs">
            <span className="font-medium text-blue-900 dark:text-blue-300">
              Interactive Test Controls:
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] bg-white dark:bg-slate-800"
                onClick={() => setIsTableLoading(!isTableLoading)}
              >
                Toggle Loading Skeleton ({isTableLoading ? "On" : "Off"})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] bg-white dark:bg-slate-800"
                onClick={() => setTableData(tableData.length === 0 ? INITIAL_MOCK_DATA : [])}
              >
                Toggle Empty State ({tableData.length === 0 ? "Empty" : "Populated"})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] bg-white dark:bg-slate-800"
                onClick={() => setTableData(INITIAL_MOCK_DATA)}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset Data
              </Button>
            </div>
          </div>

          {/* The Shared DataTable */}
          <DataTable
            columns={columns}
            data={tableData}
            isLoading={isTableLoading}
            actions={actions}
            searchPlaceholder="Search by LR number, consignor, or city..."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {formSuccessMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          {/* The Shared Form */}
          <Form
            sections={formSections}
            initialValues={{
              consignor_name: "Tata Steel Ltd",
              origin_city: "Jamshedpur Dispatch Yard",
              gstin_locked: "20AAACT2727Q1ZW",
              freight_amount: 45000,
              payment_basis: "to_pay",
            }}
            onSubmit={handleFormSubmit}
            onCancel={() => alert("Cancelled form changes")}
            submitLabel="Save LR Booking"
          />
        </div>
      )}
    </div>
  );
}
