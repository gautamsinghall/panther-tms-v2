"use client";
import { toast, confirmModal } from "@/lib/toast";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Users,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  Building2,
  MapPin,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { FetchButton } from "@/components/ui/fetch-button";

export interface VendorRecord {
  id: number;
  name: string;
  incorporation_date?: string;
  phone?: string;
  email?: string;
  pan?: string;
  pan_state?: string;
  tan_no?: string;
  gstin?: string;
  billing_state?: string;
  gst_exempt?: string;
  tds_declaration?: string;
  address_type?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  secondary_address_type?: string;
  secondary_address?: string;
  secondary_city?: string;
  secondary_state?: string;
  secondary_pincode?: string;
  secondary_country?: string;
  fax?: string;
  website?: string;
  industry?: string;
  legal_status?: string;
  group_company?: string;
  account_status?: string;
  is_active: boolean;
  issuing_office_id?: number;
  created_at?: string;
  updated_at?: string;
}

const defaultInitialValues = {
  name: "",
  incorporation_date: "",
  phone: "",
  email: "",
  pan: "",
  pan_state: "",
  tan_no: "",
  gstin: "",
  billing_state: "",
  gst_exempt: "No",
  tds_declaration: "Not Applicable",
  address_type: "Registered Office",
  address: "",
  city: "",
  state: "",
  pincode: "",
  country: DEFAULT_COUNTRY,
  secondary_address_type: "Branch Office",
  secondary_address: "",
  secondary_city: "",
  secondary_state: "",
  secondary_pincode: "",
  secondary_country: DEFAULT_COUNTRY,
  fax: "",
  website: "",
  industry: "Logistics & Transport",
  legal_status: "Private Limited",
  group_company: "",
  account_status: "Active",
};

export default function VendorMasterPage() {
  const [data, setData] = useState<VendorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [gstFilter, setGstFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VendorRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<VendorRecord[]>("/api/v1/general/vendors");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load vendors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined" && window.location.search.includes("add=true")) {
      setEditingRecord(null);
      setIsDrawerOpen(true);
    }
    const handleOfficeChange = () => {
      loadData();
    };
    window.addEventListener("panther_office_changed", handleOfficeChange);
    return () => window.removeEventListener("panther_office_changed", handleOfficeChange);
  }, []);

  const openCreateDrawer = () => {
    setEditingRecord(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (record: VendorRecord) => {
    setEditingRecord(record);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: String(values.name || "").trim(),
        incorporation_date: values.incorporation_date ? String(values.incorporation_date).slice(0, 10) : null,
        phone: values.phone ? String(values.phone).trim() : null,
        email: values.email ? String(values.email).trim() : null,
        pan: values.pan ? String(values.pan).trim().toUpperCase() : null,
        pan_state: values.pan_state ? String(values.pan_state).trim() : null,
        tan_no: values.tan_no ? String(values.tan_no).trim().toUpperCase() : null,
        gstin: values.gstin ? String(values.gstin).trim().toUpperCase() : null,
        billing_state: values.billing_state ? String(values.billing_state).trim() : null,
        gst_exempt: values.gst_exempt || "No",
        tds_declaration: values.tds_declaration || "Not Applicable",
        address_type: values.address_type || "Registered Office",
        address: values.address ? String(values.address).trim() : null,
        country: values.country || DEFAULT_COUNTRY,
        state: values.state ? String(values.state).trim() : null,
        city: values.city ? String(values.city).trim() : null,
        pincode: values.pincode ? String(values.pincode).trim() : null,
        secondary_address_type: values.secondary_address_type || "Branch Office",
        secondary_address: values.secondary_address ? String(values.secondary_address).trim() : null,
        secondary_country: values.secondary_country || DEFAULT_COUNTRY,
        secondary_state: values.secondary_state ? String(values.secondary_state).trim() : null,
        secondary_city: values.secondary_city ? String(values.secondary_city).trim() : null,
        secondary_pincode: values.secondary_pincode ? String(values.secondary_pincode).trim() : null,
        fax: values.fax ? String(values.fax).trim() : null,
        website: values.website ? String(values.website).trim() : null,
        industry: values.industry || null,
        legal_status: values.legal_status || null,
        group_company: values.group_company ? String(values.group_company).trim() : null,
        account_status: values.account_status || "Active",
      };

      if (editingRecord) {
        await apiClient(`/api/v1/general/vendors/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Vendor "${payload.name}" updated successfully.`);
      } else {
        const created = await apiClient<VendorRecord>("/api/v1/general/vendors", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (typeof window !== "undefined" && created) {
          localStorage.setItem("panther_party_created", JSON.stringify({ type: "vendor", id: created.id, name: created.name }));
          window.dispatchEvent(new Event("panther_vendor_created"));
        }
        toast.success(`Vendor "${payload.name}" registered successfully.`);
      }

      setIsDrawerOpen(false);
      setEditingRecord(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save vendor record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (record: VendorRecord) => {
    const confirmed = await confirmModal({
      title: "Deactivate Record",
      description: "Are you sure you want to deactivate this record?",
      confirmText: "Deactivate",
      variant: "danger",
    });

    if (confirmed) {
      // Immediate status change with NO page refresh
      setData((prev) => prev.map((item) => (String(item.id) === String(record.id) ? { ...item, is_active: false, account_status: "Inactive" } : item)));
      try {
        const res = await apiClient(`/api/v1/general/vendors/${record.id}`, {
          method: "PUT",
          body: JSON.stringify({ is_active: false, account_status: "Inactive" }),
        });
        toast.success("Deactivated successfully.");
        if (res && typeof res === "object") {
          setData((prev) => prev.map((item) => (String(item.id) === String(record.id) ? { ...item, ...res, is_active: false, account_status: "Inactive" } : item)));
        }
      } catch (err: any) {
        // Revert optimistic update
        setData((prev) => prev.map((item) => (String(item.id) === String(record.id) ? { ...item, is_active: true, account_status: "Active" } : item)));
        toast.error(err.message || "Failed to deactivate record.");
      }
    }
  };

  const handleActivate = async (record: VendorRecord) => {
    const confirmed = await confirmModal({
      title: "Activate Record",
      description: "Are you sure you want to activate this record?",
      confirmText: "Activate",
      variant: "primary",
    });

    if (confirmed) {
      // Immediate status change with NO page refresh
      setData((prev) => prev.map((item) => (String(item.id) === String(record.id) ? { ...item, is_active: true, account_status: "Active" } : item)));
      try {
        const res = await apiClient(`/api/v1/general/vendors/${record.id}`, {
          method: "PUT",
          body: JSON.stringify({ is_active: true, account_status: "Active" }),
        });
        toast.success("Activated successfully.");
        if (res && typeof res === "object") {
          setData((prev) => prev.map((item) => (String(item.id) === String(record.id) ? { ...item, ...res, is_active: true, account_status: "Active" } : item)));
        }
      } catch (err: any) {
        // Revert optimistic update
        setData((prev) => prev.map((item) => (String(item.id) === String(record.id) ? { ...item, is_active: false, account_status: "Inactive" } : item)));
        toast.error(err.message || "Failed to activate record.");
      }
    }
  };

  // Form Sections mapped to the user request and screenshot
  const formSections: FormSectionDef[] = [
    {
      id: "gst_details",
      title: "GST Details",
      description: "Indian Goods & Services Tax (GSTIN), PAN with issuing state, TAN, and TDS declarations.",
      columns: 2,
      fields: [
        {
          name: "gstin",
          label: "GST No.",
          type: "gstin",
          placeholder: "27AAACT1234F1Z5",
          colSpan: 1,
        },
        {
          name: "pan",
          label: "PAN No. & State",
          type: "pan",
          placeholder: "e.g. AAACT1234F",
          colSpan: 1,
        },
        {
          name: "billing_state",
          label: "Billing State",
          type: "state",
          placeholder: "Select State / UT",
        },
        {
          name: "tan_no",
          label: "TAN No",
          placeholder: "e.g. MUMA12345B",
          helperText: "10-digit Tax Deduction and Collection Account Number",
        },
        {
          name: "gst_exempt",
          label: "GST Exempt",
          type: "select",
          options: [
            { label: "No (Standard Taxable)", value: "No" },
            { label: "Yes (Exempted / Non-GST)", value: "Yes" },
          ],
          defaultValue: "No",
        },
        {
          name: "tds_declaration",
          label: "TDS Declaration",
          type: "select",
          options: [
            { label: "Not Applicable", value: "Not Applicable" },
            { label: "Applicable - 194C (Transporter Form 194C)", value: "Applicable - 194C" },
            { label: "Lower Rate / Nil Certificate", value: "Lower Rate Certificate" },
            { label: "Exempted Under IT Act", value: "Exempted" },
          ],
          defaultValue: "Not Applicable",
        },
      ],
    },
    {
      id: "general_details",
      title: "General Details",
      description: "Legal entity identification, incorporation date, primary telephone, and billing email.",
      columns: 3,
      fields: [
        {
          name: "incorporation_date",
          label: "Date of Incorporate",
          type: "date",
          placeholder: "dd-mm-yyyy",
        },
        {
          name: "name",
          label: "Account Name",
          placeholder: "e.g. Acme Logistics & Suppliers Pvt Ltd",
          required: true,
          colSpan: 2,
        },
        {
          name: "phone",
          label: "Phone",
          placeholder: "+91 98765 43210",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          placeholder: "accounts@vendorcompany.com",
          colSpan: 2,
        },
      ],
    },
    {
      id: "address_details_primary",
      title: "Address Details (Primary)",
      description: "Primary registered office or headquarters address with automated PIN code geolocation.",
      columns: 3,
      fields: [
        {
          name: "address_type",
          label: "Address Type",
          type: "select",
          options: [
            { label: "Registered Office", value: "Registered Office" },
            { label: "Corporate Office", value: "Corporate Office" },
            { label: "Branch Office", value: "Branch Office" },
            { label: "Warehouse / Godown", value: "Warehouse" },
            { label: "Other", value: "Other" },
          ],
          defaultValue: "Registered Office",
        },
        {
          name: "address",
          label: "Address",
          type: "textarea",
          placeholder: "Plot / door no., building, street, industrial area",
          colSpan: 2,
        },
        {
          name: "country",
          label: "Country",
          type: "country",
          defaultValue: DEFAULT_COUNTRY,
        },
        {
          name: "pincode",
          label: "Zip",
          type: "text",
          placeholder: "e.g. 400001",
        },
        {
          name: "city",
          label: "City",
          placeholder: "e.g. Mumbai",
        },
        {
          name: "state",
          label: "State",
          type: "state",
          placeholder: "Select State / UT",
        },
      ],
    },
    {
      id: "address_details_secondary",
      title: "Address Details (Secondary)",
      description: "Operating branch, dispatch hub, or secondary warehouse address.",
      columns: 3,
      fields: [
        {
          name: "secondary_address_type",
          label: "Address Type",
          type: "select",
          options: [
            { label: "Branch Office", value: "Branch Office" },
            { label: "Corporate Office", value: "Corporate Office" },
            { label: "Registered Office", value: "Registered Office" },
            { label: "Warehouse / Godown", value: "Warehouse" },
            { label: "Other", value: "Other" },
          ],
          defaultValue: "Branch Office",
        },
        {
          name: "secondary_address",
          label: "Address",
          type: "textarea",
          placeholder: "Secondary premises, dispatch depot, or terminal address",
          colSpan: 2,
        },
        {
          name: "secondary_country",
          label: "Country",
          type: "country",
          defaultValue: DEFAULT_COUNTRY,
        },
        {
          name: "secondary_pincode",
          label: "Zip",
          type: "text",
          placeholder: "e.g. 410206",
        },
        {
          name: "secondary_city",
          label: "City",
          placeholder: "e.g. Navi Mumbai",
        },
        {
          name: "secondary_state",
          label: "State",
          type: "state",
          countryFieldName: "secondary_country",
          placeholder: "Select State / UT",
        },
      ],
    },
    {
      id: "corporate_status_details",
      title: "Corporate & Status Details",
      description: "Business categorization, legal constitution, parent corporate group, and operating status.",
      columns: 3,
      fields: [
        {
          name: "fax",
          label: "Fax",
          placeholder: "e.g. 022-12345678",
        },
        {
          name: "website",
          label: "Website",
          placeholder: "https://vendorwebsite.com",
        },
        {
          name: "industry",
          label: "Industry",
          type: "select",
          options: [
            { label: "Logistics & Transport", value: "Logistics & Transport" },
            { label: "Petroleum & Fuel", value: "Petroleum & Fuel" },
            { label: "Automotive & Spares", value: "Automotive & Spares" },
            { label: "Tyre Manufacturing", value: "Tyre Manufacturing" },
            { label: "Steel & Metals", value: "Steel & Metals" },
            { label: "FMCG & Consumer Goods", value: "FMCG" },
            { label: "Chemicals & Hazardous", value: "Chemicals" },
            { label: "General Supplies", value: "General Supplies" },
            { label: "Other", value: "Other" },
          ],
          defaultValue: "Logistics & Transport",
        },
        {
          name: "legal_status",
          label: "Legal Status",
          type: "select",
          options: [
            { label: "Proprietorship", value: "Proprietorship" },
            { label: "Partnership Firm", value: "Partnership" },
            { label: "Private Limited Company", value: "Private Limited" },
            { label: "Public Limited Company", value: "Public Limited" },
            { label: "Limited Liability Partnership (LLP)", value: "LLP" },
            { label: "Individual", value: "Individual" },
            { label: "HUF (Hindu Undivided Family)", value: "HUF" },
            { label: "Others", value: "Others" },
          ],
          defaultValue: "Private Limited",
        },
        {
          name: "group_company",
          label: "Group of Company",
          placeholder: "Select or type corporate group",
        },
        {
          name: "account_status",
          label: "Account Running Status",
          type: "select",
          options: [
            { label: "Active", value: "Active" },
            { label: "Inactive", value: "Inactive" },
            { label: "On Hold", value: "Hold" },
            { label: "Blacklisted", value: "Blacklisted" },
          ],
          defaultValue: "Active",
        },
      ],
    },
  ];

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => d.is_active && (d.account_status || "Active").toLowerCase() === "active").length;
    const gstCount = data.filter((d) => d.gstin && d.gstin.trim().length > 0).length;
    const holdCount = data.filter((d) => (d.account_status || "").toLowerCase() === "hold" || !d.is_active).length;

    return { total, active, gstCount, holdCount };
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;

      if (gstFilter === "GST" && (!item.gstin || item.gstin.trim() === "")) return false;
      if (gstFilter === "NON_GST" && item.gstin && item.gstin.trim() !== "") return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.name?.toLowerCase().includes(term) ||
          item.phone?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term) ||
          item.gstin?.toLowerCase().includes(term) ||
          item.pan?.toLowerCase().includes(term) ||
          item.city?.toLowerCase().includes(term) ||
          item.state?.toLowerCase().includes(term) ||
          item.pincode?.toLowerCase().includes(term) ||
          item.industry?.toLowerCase().includes(term) ||
          item.legal_status?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [data, statusFilter, gstFilter, searchTerm]);

  // Table Columns
  const columns: ColumnDef<VendorRecord>[] = [
    {
      key: "name",
      header: "Vendor / Account Name",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">{row.name}</span>
            {row.legal_status && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">
                {row.legal_status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {row.industry && <span>{row.industry}</span>}
            {row.group_company && (
              <>
                <span>•</span>
                <span className="text-slate-400">{row.group_company}</span>
              </>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact Details",
      cell: (row) => (
        <div className="space-y-1 text-xs">
          {row.phone && (
            <div className="flex items-center gap-1.5 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[200px]">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{row.email}</span>
            </div>
          )}
          {!row.phone && !row.email && <span className="text-slate-400 italic">No contact details</span>}
        </div>
      ),
    },
    {
      key: "tax_ids",
      header: "GSTIN & PAN",
      cell: (row) => (
        <div className="space-y-1 text-xs">
          {row.gstin ? (
            <div className="flex items-center gap-1 font-mono text-indigo-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{row.gstin}</span>
            </div>
          ) : (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500">
              Unregistered (Non-GST)
            </span>
          )}
          {row.pan && (
            <div className="text-[11px] text-slate-500 font-mono">
              PAN: <span className="text-slate-800 font-semibold">{row.pan}</span>
              {row.pan_state && <span className="text-slate-400 ml-1">({row.pan_state})</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "location",
      header: "Primary Location",
      cell: (row) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-900">
              {row.city || row.state ? `${row.city || "—"}, ${row.state || "—"}` : "—"}
            </span>
          </div>
          {row.pincode && (
            <div className="text-[11px] text-slate-500 font-mono pl-5">PIN: {row.pincode}</div>
          )}
        </div>
      ),
    },
    {
      key: "account_status",
      header: "Running Status",
      cell: (row) => {
        const isActuallyActive = row.is_active !== false && String(row.account_status || "").toUpperCase() !== "INACTIVE";
        const rawStatus = (row.account_status || (isActuallyActive ? "Active" : "Inactive")).toUpperCase();
        let variant: "active" | "inactive" | "pending" | "warning" = "active";
        if (!isActuallyActive || rawStatus === "INACTIVE") variant = "inactive";
        else if (rawStatus === "ACTIVE") variant = "active";
        else if (rawStatus === "HOLD" || rawStatus === "ON HOLD") variant = "warning";
        else variant = "inactive";

        return (
          <StatusBadge
            status={!isActuallyActive ? "Inactive" : (row.account_status || "Active")}
            variant={variant}
          />
        );
      },
    },
  ];

  // Row Actions
  const actions: RowAction<VendorRecord>[] = [
    {
      label: "Edit",
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: (record) => openEditDrawer(record),
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      variant: "danger",
      hidden: (record) => !record.is_active || String(record.account_status || "").toUpperCase() === "INACTIVE",
      onClick: (record) => handleDeactivate(record),
    },
    {
      label: "Activate",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      variant: "default",
      hidden: (record) => !!record.is_active && String(record.account_status || "").toUpperCase() !== "INACTIVE",
      onClick: (record) => handleActivate(record),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vendor Master"
        description="Transporters, suppliers, fuel vendors, GST/TDS tax profiles, and branch address directory."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "General", href: "/general" },
          { label: "Vendor" },
        ]}
        primaryAction={{
          label: "Add Vendor",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Vendors"
          value={metrics.total}
          subtext="Registered vendor accounts"
          icon={<Users className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Active Vendors"
          value={metrics.active}
          subtext="Live operational suppliers"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="GST Registered"
          value={metrics.gstCount}
          subtext="Verified GSTIN profiles"
          icon={<ShieldCheck className="w-4 h-4 text-sky-600" />}
        />
        <KpiCard
          title="On Hold / Inactive"
          value={metrics.holdCount}
          subtext="Restricted vendor profiles"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search vendors by name, phone, GSTIN, PAN, city, state..."
        filters={[
          {
            id: "status",
            label: "Status",
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            id: "gst",
            label: "GST Status",
            options: [
              { label: "All GST Profiles", value: "ALL" },
              { label: "GST Registered", value: "GST" },
              { label: "Non-GST / Exempt", value: "NON_GST" },
            ],
            value: gstFilter,
            onChange: setGstFilter,
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
          setGstFilter("ALL");
        }}
      />

      {/* Error Banner */}
      {isError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium">
          {errorMessage || "Failed to load vendors. Please retry."}
        </div>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        emptyMessage="No vendors registered yet"
        emptySubtext="Get started by adding your first vendor, transporter, or supplier account."
        emptyAction={{
          label: "Add Vendor",
          onClick: openCreateDrawer,
        }}
      />

      {/* Add / Edit Vendor Workspace Tab Drawer */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Vendor: ${editingRecord.name}` : "Add New Vendor"}
        description="Configure vendor profile, GST & TDS statutory compliance, primary & secondary branch addresses."
      >
        <Form
          sections={formSections}
          initialValues={
            editingRecord
              ? {
                  ...defaultInitialValues,
                  ...editingRecord,
                  incorporation_date: editingRecord.incorporation_date
                    ? String(editingRecord.incorporation_date).slice(0, 10)
                    : "",
                }
              : defaultInitialValues
          }
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Changes" : "Submit"}
          isSubmitting={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
