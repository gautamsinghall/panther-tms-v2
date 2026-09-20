"use client";

import React, { useState } from "react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VehiclePlate } from "@/components/ui/vehicle-plate";
import { KpiCard } from "@/components/ui/kpi-card";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Eye,
  Edit3,
  Trash2,
  Printer,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Truck,
  ShieldCheck,
  Receipt,
  Download,
  Plus,
  Clock,
  AlertCircle,
} from "lucide-react";

interface MockLRRecord {
  id: string;
  lrNumber: string;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  vehicleNo: string;
  vehicleSource: "COMPANY" | "MARKET";
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
    vehicleSource: "COMPANY",
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
    vehicleSource: "MARKET",
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
    vehicleSource: "COMPANY",
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
    vehicleSource: "MARKET",
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
    vehicleSource: "COMPANY",
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
    vehicleSource: "MARKET",
    amount: 14500.0,
    status: "Cancelled",
  },
];

export default function ComponentsDemoPage() {
  const [activeTab, setActiveTab] = useState<"table" | "form" | "tokens">("table");
  const [tableData, setTableData] = useState<MockLRRecord[]>(INITIAL_MOCK_DATA);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // DataTable column definitions with Design System v2 typography and color grading
  const columns: ColumnDef<MockLRRecord>[] = [
    {
      key: "lrNumber",
      header: "LR Number",
      sortable: true,
      width: "150px",
      cell: (row) => (
        <span className="font-mono font-bold text-xs text-[#4F46E5] hover:text-[#4338CA] hover:underline cursor-pointer">
          {row.lrNumber}
        </span>
      ),
    },
    {
      key: "consignor",
      header: "Consignor (Shipper)",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-xs text-[#101828]">
          {row.consignor}
        </span>
      ),
    },
    {
      key: "consignee",
      header: "Consignee (Receiver)",
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-[#475467]">
          {row.consignee}
        </span>
      ),
    },
    {
      key: "route",
      header: "Corridor / Route",
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-[#344054]">
          <span className="font-medium text-[#101828]">{row.origin}</span>
          <ArrowRight className="w-3 h-3 text-[#98A2B3] shrink-0" />
          <span className="font-medium text-[#101828]">{row.destination}</span>
        </div>
      ),
    },
    {
      key: "vehicleNo",
      header: "Vehicle Plate",
      sortable: true,
      cell: (row) => (
        <VehiclePlate
          vehicleNumber={row.vehicleNo}
          source={row.vehicleSource}
        />
      ),
    },
    {
      key: "amount",
      header: "Freight (₹)",
      sortable: true,
      align: "right",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono tabular-nums font-bold text-xs text-[#101828]">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Dispatch Status",
      sortable: true,
      align: "center",
      width: "140px",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  // Row actions menu per docs/design.md §5
  const actions: RowAction<MockLRRecord>[] = [
    {
      label: "View LR Details",
      icon: <Eye className="w-3.5 h-3.5" />,
      onClick: (row) => alert(`Viewing ${row.lrNumber}`),
    },
    {
      label: "Print Consignment Challan",
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

  // Shared Form sections definition per docs/design.md §3
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
          helperText: "Locked after statutory compliance check.",
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
      {/* Top Header */}
      <PageHeader
        title="Component Showcase & Design Tokens"
        description="Live preview and stress-test suite for Design System v2 tokens, tables, vehicle plates, status badges, and forms."
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Component Showcase" },
        ]}
        primaryAction={{
          label: "New LR Entry",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => setActiveTab("form"),
        }}
        secondaryActions={[
          {
            label: "Export Mock Data",
            icon: <Download className="w-3.5 h-3.5" />,
            onClick: () => alert("Exporting mock dataset as CSV..."),
          },
        ]}
      />

      {/* Segmented Tab Navigation per Design System v2 */}
      <div className="flex items-center justify-between border-b border-[#E4E7EC] pb-3">
        <div className="inline-flex rounded-control bg-[#F2F4F7] p-1 border border-[#E4E7EC]">
          <button
            onClick={() => setActiveTab("table")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[5px] transition-all ${
              activeTab === "table"
                ? "bg-white text-[#101828] shadow-xs"
                : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            DataTable & Fleet Table
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[5px] transition-all ${
              activeTab === "form"
                ? "bg-white text-[#101828] shadow-xs"
                : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            Shared Form System
          </button>
          <button
            onClick={() => setActiveTab("tokens")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[5px] transition-all ${
              activeTab === "tokens"
                ? "bg-white text-[#101828] shadow-xs"
                : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            Vehicle Plates & Tokens
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#667085]">
          <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
          <span>Design System v2 Active</span>
        </div>
      </div>

      {/* Tab 1: DataTable */}
      {activeTab === "table" && (
        <div className="space-y-4">
          {/* Table Sandbox Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-card border border-[#E4E7EC] shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              <span className="text-xs font-semibold text-[#101828]">
                Table State Sandbox
              </span>
              <span className="text-xs text-[#667085]">
                ({tableData.length} records loaded)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
                onClick={() => setIsTableLoading(!isTableLoading)}
              >
                {isTableLoading ? "Stop Loading Skeleton" : "Simulate Skeleton"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
                onClick={() => setTableData(tableData.length === 0 ? INITIAL_MOCK_DATA : [])}
              >
                {tableData.length === 0 ? "Populate Rows" : "Simulate Empty State"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs bg-white"
                onClick={() => {
                  setIsTableLoading(false);
                  setTableData(INITIAL_MOCK_DATA);
                }}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset Data
              </Button>
            </div>
          </div>

          {/* The Shared DataTable */}
          <div className="bg-white rounded-card border border-[#E4E7EC] shadow-xs p-4">
            <DataTable
              columns={columns}
              data={tableData}
              isLoading={isTableLoading}
              actions={actions}
              searchPlaceholder="Search by LR number, consignor, or city..."
              searchColumn="lrNumber"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Shared Form System */}
      {activeTab === "form" && (
        <div className="space-y-4 max-w-4xl">
          {formSuccessMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-card bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#12B76A]" />
              <span>{formSuccessMessage}</span>
            </div>
          )}

          <div className="bg-white rounded-card border border-[#E4E7EC] shadow-xs p-6">
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
              onCancel={() => setActiveTab("table")}
              submitLabel="Save LR Booking"
            />
          </div>
        </div>
      )}

      {/* Tab 3: Vehicle Plates & Design Tokens */}
      {activeTab === "tokens" && (
        <div className="space-y-6">
          {/* Section 1: Vehicle Plates Styling & Color Grading */}
          <div className="bg-white rounded-card border border-[#E4E7EC] shadow-xs p-5 space-y-4">
            <div className="border-b border-[#E4E7EC] pb-3">
              <h3 className="text-sm font-bold text-[#101828] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#4F46E5]" />
                Vehicle Registration Number Plates
              </h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Indian transport vehicle registration plates styled with high-contrast typography, crisp 1px borders, and fleet category indicators.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 rounded-card bg-[#FCFCFD] border border-[#E4E7EC] space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] block">
                  Company Fleet Plate
                </span>
                <VehiclePlate vehicleNumber="HR-55-AJ-9021" source="COMPANY" />
                <span className="text-[11px] text-[#667085] block">
                  Indigo indicator for owned asset
                </span>
              </div>

              <div className="p-3.5 rounded-card bg-[#FCFCFD] border border-[#E4E7EC] space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] block">
                  Market Hired Plate
                </span>
                <VehiclePlate vehicleNumber="GJ-12-BV-4412" source="MARKET" />
                <span className="text-[11px] text-[#667085] block">
                  Slate indicator for hired market truck
                </span>
              </div>

              <div className="p-3.5 rounded-card bg-[#FCFCFD] border border-[#E4E7EC] space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] block">
                  Compact Monospace Plate
                </span>
                <VehiclePlate vehicleNumber="MH-04-KF-7719" showIcon={false} />
                <span className="text-[11px] text-[#667085] block">
                  Clean border tag without icon
                </span>
              </div>

              <div className="p-3.5 rounded-card bg-[#FCFCFD] border border-[#E4E7EC] space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#667085] block">
                  Active Movement Plate
                </span>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#ECFDF3] border border-[#A6F4C5] font-mono text-[11px] font-bold text-[#027A48] uppercase tracking-wider shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-pulse" />
                  DL-01-AB-1234
                </div>
                <span className="text-[11px] text-[#667085] block">
                  Active GPS tracking status
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: StatusBadges per docs/design.md §1 & §5 */}
          <div className="bg-white rounded-card border border-[#E4E7EC] shadow-xs p-5 space-y-4">
            <div className="border-b border-[#E4E7EC] pb-3">
              <h3 className="text-sm font-bold text-[#101828]">
                Status Badges & Semantic Dot Indicators
              </h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Always pair a 6px semantic color dot with title-case text on rounded-[6px] pills.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#667085] block">Success Category</span>
                <div className="flex flex-col gap-1.5 items-start">
                  <StatusBadge status="Delivered" />
                  <StatusBadge status="Paid" />
                  <StatusBadge status="Reconciled" />
                  <StatusBadge status="Pod Verified" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#667085] block">Warning Category</span>
                <div className="flex flex-col gap-1.5 items-start">
                  <StatusBadge status="In Transit" />
                  <StatusBadge status="Pending" />
                  <StatusBadge status="Booked" />
                  <StatusBadge status="Due Soon" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#667085] block">Danger Category</span>
                <div className="flex flex-col gap-1.5 items-start">
                  <StatusBadge status="Overdue" />
                  <StatusBadge status="Cancelled" />
                  <StatusBadge status="Rejected" />
                  <StatusBadge status="Void" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-[#667085] block">Info / Neutral Category</span>
                <div className="flex flex-col gap-1.5 items-start">
                  <StatusBadge status="Scheduled" />
                  <StatusBadge status="Processing" />
                  <Badge variant="primary" dot>Primary Tag</Badge>
                  <Badge variant="neutral" dot>Standard Tag</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Buttons & Interactive Elements */}
          <div className="bg-white rounded-card border border-[#E4E7EC] shadow-xs p-5 space-y-4">
            <div className="border-b border-[#E4E7EC] pb-3">
              <h3 className="text-sm font-bold text-[#101828]">
                Button Hierarchy & Visual States
              </h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Strict single-primary rule: Exactly one primary CTA per view. All other actions are secondary/outline or ghost.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="primary" size="md">
                Primary Button (#4F46E5)
              </Button>
              <Button variant="secondary" size="md">
                Secondary Button
              </Button>
              <Button variant="outline" size="md">
                Outline Action
              </Button>
              <Button variant="danger" size="md">
                Destructive Action
              </Button>
              <Button variant="ghost" size="md">
                Ghost Action
              </Button>
              <Button variant="primary" size="md" isLoading>
                Loading State
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
