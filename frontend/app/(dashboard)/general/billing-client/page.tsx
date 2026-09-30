"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Form } from "@/components/forms/form";
import { ColumnDef, RowAction } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";

export interface BillingClientRecord {
  id: number;
  name: string;
  code?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  tds_rate?: number;
  credit_period_days?: number;
  credit_limit?: number;
  payment_terms?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const defaultInitialValues = {
  name: "",
  code: "",
  company_name: "",
  contact_person: "",
  phone: "",
  email: "",
  gstin: "",
  pan: "",
  tds_rate: 0,
  credit_period_days: 30,
  credit_limit: 0,
  payment_terms: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  country: DEFAULT_COUNTRY,
};

export default function BillingClientPage() {
  const [data, setData] = useState<BillingClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [gstFilter, setGstFilter] = useState("ALL");

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BillingClientRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [deactivatingRecord, setDeactivatingRecord] = useState<BillingClientRecord | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const res = await apiClient<BillingClientRecord[]>("/api/v1/general/billing-clients");
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load billing client records.");
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
  }, []);

  const openCreateDrawer = () => {
    setEditingRecord(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (record: BillingClientRecord) => {
    setEditingRecord(record);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: String(values.name || "").trim(),
        code: values.code ? String(values.code).trim() : null,
        company_name: values.company_name ? String(values.company_name).trim() : null,
        contact_person: values.contact_person ? String(values.contact_person).trim() : null,
        phone: values.phone ? String(values.phone).trim() : null,
        email: values.email ? String(values.email).trim() : null,
        gstin: values.gstin ? String(values.gstin).trim().toUpperCase() : null,
        pan: values.pan ? String(values.pan).trim().toUpperCase() : null,
        tds_rate: values.tds_rate !== undefined && values.tds_rate !== "" ? parseFloat(values.tds_rate) : 0,
        credit_period_days:
          values.credit_period_days !== undefined && values.credit_period_days !== ""
            ? parseInt(values.credit_period_days, 10)
            : 30,
        credit_limit:
          values.credit_limit !== undefined && values.credit_limit !== "" ? parseFloat(values.credit_limit) : 0,
        payment_terms: values.payment_terms ? String(values.payment_terms).trim() : null,
        address: values.address ? String(values.address).trim() : null,
        city: values.city ? String(values.city).trim() : null,
        state: values.state ? String(values.state).trim() : null,
        pincode: values.pincode ? String(values.pincode).trim() : null,
        country: values.country || DEFAULT_COUNTRY,
      };

      if (editingRecord) {
        await apiClient(`/api/v1/general/billing-clients/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiClient<any>("/api/v1/general/billing-clients", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (typeof window !== "undefined" && created) {
          localStorage.setItem("panther_party_created", JSON.stringify({ type: "billing_client", id: created.id, name: created.name }));
          window.dispatchEvent(new Event("panther_billing_client_created"));
        }
      }

      setIsDrawerOpen(false);
      setEditingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to save billing client.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingRecord) return;
    setIsDeactivating(true);
    try {
      await apiClient(`/api/v1/general/billing-clients/${deactivatingRecord.id}`, {
        method: "DELETE",
      });
      setDeactivatingRecord(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to deactivate billing client.");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleToggleActivate = async (record: BillingClientRecord) => {
    try {
      await apiClient(`/api/v1/general/billing-clients/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !record.is_active }),
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update client status.");
    }
  };

  // Initial values for Form
  const editingInitialValues = useMemo(() => {
    if (!editingRecord) return defaultInitialValues;
    return {
      name: editingRecord.name || "",
      code: editingRecord.code || "",
      company_name: editingRecord.company_name || "",
      contact_person: editingRecord.contact_person || "",
      phone: editingRecord.phone || "",
      email: editingRecord.email || "",
      gstin: editingRecord.gstin || "",
      pan: editingRecord.pan || "",
      tds_rate: editingRecord.tds_rate ?? 0,
      credit_period_days: editingRecord.credit_period_days ?? 30,
      credit_limit: editingRecord.credit_limit ?? 0,
      payment_terms: editingRecord.payment_terms || "",
      address: editingRecord.address || "",
      city: editingRecord.city || "",
      state: editingRecord.state || "",
      pincode: editingRecord.pincode || "",
      country: editingRecord.country || DEFAULT_COUNTRY,
    };
  }, [editingRecord]);

  // Standardized Form Sections matching global design system
  const formSections: FormSectionDef[] = [
    {
      id: "corporate_info",
      title: "Corporate & Contact Information",
      description: "Primary client identity, trade name, and key contact details for dispatch and billing.",
      columns: 2,
      fields: [
        {
          name: "name",
          label: "Client / Trade Name",
          placeholder: "e.g. Tata Steel Ltd or Reliance Retail",
          required: true,
          colSpan: 2,
        },
        {
          name: "code",
          label: "Client Code (Optional)",
          placeholder: "e.g. CLI-001",
        },
        {
          name: "company_name",
          label: "Legal / Registered Entity Name",
          placeholder: "e.g. Tata Steel BSL Limited",
        },
        {
          name: "contact_person",
          label: "Primary Contact Person",
          placeholder: "e.g. Rajesh Kumar (Logistics Head)",
        },
        {
          name: "phone",
          label: "Phone / Mobile Number",
          placeholder: "+91 98765 43210",
        },
        {
          name: "email",
          label: "Email Address for Invoicing & Statements",
          type: "email",
          placeholder: "accounts.payable@clientcompany.com",
          colSpan: 2,
        },
      ],
    },
    {
      id: "tax_compliance",
      title: "Tax, GST & Regulatory Compliance",
      description: "Indian Goods & Services Tax (GSTIN), Permanent Account Number (PAN), and statutory TDS rate.",
      columns: 3,
      fields: [
        {
          name: "gstin",
          label: "GSTIN (15 Digits)",
          placeholder: "27AAACT1234F1Z5",
          helperText: "15-digit alphanumeric Indian GST identifier",
        },
        {
          name: "pan",
          label: "PAN (10 Digits)",
          placeholder: "AAACT1234F",
          helperText: "10-digit Income Tax PAN",
        },
        {
          name: "tds_rate",
          label: "TDS Deduction Rate (%)",
          type: "number",
          placeholder: "e.g. 1.00 or 2.00",
          defaultValue: 0,
        },
      ],
    },
    {
      id: "credit_terms",
      title: "Credit Terms & Payment Ceiling",
      description: "Debtor terms, maximum outstanding credit limit, and contractual billing milestones.",
      columns: 2,
      fields: [
        {
          name: "credit_period_days",
          label: "Credit Period (Days)",
          type: "number",
          placeholder: "30",
          defaultValue: 30,
          helperText: "Default payment duration allowed after invoice generation",
        },
        {
          name: "credit_limit",
          label: "Credit Limit (INR ₹)",
          type: "number",
          placeholder: "e.g. 500000",
          defaultValue: 0,
          helperText: "Maximum permitted unpaid invoice balance across active jobs",
        },
        {
          name: "payment_terms",
          label: "Payment Terms / Billing Notes",
          placeholder: "e.g. 30 Days from Physical POD Submission / Payment via RTGS",
          colSpan: 2,
        },
      ],
    },
    {
      id: "billing_address",
      title: "Registered Office & Billing Address",
      description: "Official postal address to be printed on GST Tax Invoices and E-Way Bills.",
      columns: 2,
      fields: [
        {
          name: "address",
          label: "Street / Building Address",
          type: "textarea",
          placeholder: "e.g. Plot No 42, Sector 18, Commercial Belt",
          colSpan: 2,
        },
        {
          name: "country",
          label: "Country",
          type: "country",
          defaultValue: DEFAULT_COUNTRY,
        },
        {
          name: "state",
          label: "State / UT",
          type: "state",
          placeholder: "Select State / UT",
        },
        {
          name: "city",
          label: "City",
          placeholder: "e.g. Mumbai",
        },
        {
          name: "pincode",
          label: "Pincode / Postal Code",
          placeholder: "e.g. 400001",
        },
      ],
    },
  ];

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => d.is_active).length;
    const gstCount = data.filter((d) => d.gstin && d.gstin.trim().length > 0).length;
    const totalCreditDays = data.reduce((acc, curr) => acc + (curr.credit_period_days || 0), 0);
    const avgCreditDays = total > 0 ? Math.round(totalCreditDays / total) : 30;

    return {
      total,
      active,
      gstCount,
      avgCreditDays,
    };
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (statusFilter === "ACTIVE" && !item.is_active) return false;
      if (statusFilter === "INACTIVE" && item.is_active) return false;

      if (gstFilter === "REGISTERED" && (!item.gstin || !item.gstin.trim())) return false;
      if (gstFilter === "UNREGISTERED" && item.gstin && item.gstin.trim()) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const match =
          item.name?.toLowerCase().includes(term) ||
          item.code?.toLowerCase().includes(term) ||
          item.company_name?.toLowerCase().includes(term) ||
          item.contact_person?.toLowerCase().includes(term) ||
          item.phone?.toLowerCase().includes(term) ||
          item.email?.toLowerCase().includes(term) ||
          item.gstin?.toLowerCase().includes(term) ||
          item.pan?.toLowerCase().includes(term) ||
          item.city?.toLowerCase().includes(term) ||
          item.state?.toLowerCase().includes(term) ||
          item.address?.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [data, statusFilter, gstFilter, searchTerm]);

  // Format currency in Indian notation
  const formatIndianCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const columns: ColumnDef<BillingClientRecord>[] = [
    {
      key: "name",
      header: "Billing Client",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">{row.name}</span>
            {row.code && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-slate-100 text-slate-600 rounded border border-slate-200">
                {row.code}
              </span>
            )}
          </div>
          {row.company_name && (
            <p className="text-xs text-slate-500 font-normal truncate max-w-[260px]" title={row.company_name}>
              {row.company_name}
            </p>
          )}
          {row.address && !row.company_name && (
            <p className="text-[11px] text-slate-400 font-normal truncate max-w-[260px]" title={row.address}>
              {row.address}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "contact_person",
      header: "Contact & Comms",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          <span className="font-medium text-slate-800 block text-xs">
            {row.contact_person || "-"}
          </span>
          <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
            {row.phone && (
              <a
                href={`tel:${row.phone}`}
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <Phone className="w-3 h-3 text-slate-400" />
                {row.phone}
              </a>
            )}
            {row.email && (
              <a
                href={`mailto:${row.email}`}
                className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors truncate max-w-[200px]"
                title={row.email}
              >
                <Mail className="w-3 h-3 text-slate-400" />
                {row.email}
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <span className="text-xs text-slate-800 font-medium block">
            {row.city || "-"}{row.state ? `, ${row.state}` : ""}
          </span>
          <span className="text-[11px] text-slate-500 block">
            {[row.pincode, row.country || DEFAULT_COUNTRY].filter(Boolean).join(", ")}
          </span>
        </div>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN & PAN",
      sortable: true,
      cell: (row) => (
        <div className="space-y-1">
          {row.gstin ? (
            <span className="font-mono text-xs uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 inline-block font-medium">
              {row.gstin}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal italic">
              Unregistered (Non-GST)
            </span>
          )}
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            {row.pan && (
              <span className="font-mono">
                PAN: <strong className="text-slate-800">{row.pan}</strong>
              </span>
            )}
            {row.tds_rate !== undefined && row.tds_rate > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded border border-amber-200 text-[10px] font-medium">
                TDS {row.tds_rate}%
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "credit_limit",
      header: "Credit Terms",
      sortable: true,
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-900">
              {row.credit_limit ? formatIndianCurrency(row.credit_limit) : "No Limit"}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            {row.credit_period_days !== undefined ? `${row.credit_period_days} Days Credit` : "30 Days"}
          </span>
          {row.payment_terms && (
            <span className="text-[10px] text-slate-400 block truncate max-w-[180px]" title={row.payment_terms}>
              {row.payment_terms}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => (
        <StatusBadge
          status={row.is_active ? "Active" : "Inactive"}
          variant={row.is_active ? "active" : "inactive"}
        />
      ),
    },
  ];

  const actions: RowAction<BillingClientRecord>[] = [
    {
      label: "Edit Client",
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: (row) => {
        openEditDrawer(row);
      },
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-600" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: (row) => {
        setDeactivatingRecord(row);
      },
    },
    {
      label: "Reactivate",
      icon: <Check className="w-3.5 h-3.5 text-emerald-600" />,
      hidden: (row) => row.is_active,
      onClick: (row) => {
        handleToggleActivate(row);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Billing Clients"
        description="Register and manage corporate bill-to parties, debtor accounts, credit ceilings, and GST compliance profiles."
        breadcrumbs={[
          { label: "General", href: "/general/consigner" },
          { label: "Billing Clients" },
        ]}
        primaryAction={{
          label: "Add Billing Client",
          icon: <Plus className="w-4 h-4" />,
          onClick: openCreateDrawer,
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Clients"
          value={metrics.total}
          subtext="Registered corporate clients"
          icon={<Building2 className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Active Accounts"
          value={metrics.active}
          subtext={`${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 100}% Operational`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="GST Registered"
          value={metrics.gstCount}
          subtext="Verified GSTIN clients"
          icon={<ShieldCheck className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Avg Credit Period"
          value={`${metrics.avgCreditDays} Days`}
          subtext="Standard debtor terms"
          icon={<Clock className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Filter & Search Bar */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by client name, code, contact, GSTIN, PAN, city..."
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All Statuses", value: "ALL" },
              { label: "Active Only", value: "ACTIVE" },
              { label: "Inactive Only", value: "INACTIVE" },
            ],
          },
          {
            id: "gst",
            label: "GST Compliance",
            value: gstFilter,
            onChange: setGstFilter,
            options: [
              { label: "All Clients", value: "ALL" },
              { label: "GST Registered", value: "REGISTERED" },
              { label: "Unregistered (Non-GST)", value: "UNREGISTERED" },
            ],
          },
        ]}
        onClear={() => {
          setSearchTerm("");
          setStatusFilter("ALL");
          setGstFilter("ALL");
        }}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        actions={actions}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        searchable={false}
        emptyMessage="No billing clients yet"
        emptySubtext="Add your first corporate billing client to begin creating jobs, bookings, and freight invoices."
        emptyAction={{
          label: "Add Billing Client",
          onClick: openCreateDrawer,
        }}
      />

      {/* Entity Drawer using Global Form UI */}
      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
        }}
        title={editingRecord ? `Edit Billing Client: ${editingRecord.name}` : "Create New Billing Client"}
        description={
          editingRecord
            ? "Update corporate entity profiles, GST/PAN compliance details, credit terms, and billing address."
            : "Register a new corporate client, commercial debtor profile, credit terms, and GST compliance details."
        }
      >
        <Form
          key={editingRecord ? `edit-${editingRecord.id}` : "create"}
          sections={formSections}
          initialValues={editingInitialValues}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsDrawerOpen(false);
            setEditingRecord(null);
          }}
          submitLabel={editingRecord ? "Save Client Changes" : "Create Billing Client"}
          cancelLabel="Cancel"
          isLoading={isSubmitting}
        />
      </EntityDrawer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deactivatingRecord}
        onClose={() => setDeactivatingRecord(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Billing Client"
        entityName={deactivatingRecord?.name}
        consequence="Deactivating this billing client marks their account as inactive. Existing past invoices, jobs, and ledger balances remain fully intact."
        confirmLabel="Deactivate Client"
        isLoading={isDeactivating}
      />
    </div>
  );
}
