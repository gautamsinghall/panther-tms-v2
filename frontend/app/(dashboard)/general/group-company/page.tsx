"use client";
import { toast, confirmModal } from "@/lib/toast";
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Pencil, Building2, CheckCircle2, Users, Search,
  X, ChevronRight, Tag, BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { StatusBadge } from "@/components/ui/badge";
import { ColumnDef, RowAction } from "@/types/table";
import { apiClient } from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BillingClientRef {
  id: number;
  name: string;
  gstin?: string | null;
  city?: string | null;
}

interface GroupCompanyRecord {
  id: number;
  company_name: string;
  smart_ledger_group?: string | null;
  billing_clients: BillingClientRef[];
  is_active: boolean;
}

// ─── Multi-select Billing Client Picker ──────────────────────────────────────

function BillingClientPicker({
  allAvailable,  // clients not in any other group
  selected,
  onChange,
}: {
  allAvailable: BillingClientRef[];
  selected: BillingClientRef[];
  onChange: (clients: BillingClientRef[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selectedIds = new Set(selected.map((c) => c.id));

  const filtered = allAvailable.filter(
    (c) =>
      !selectedIds.has(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.gstin || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.city || "").toLowerCase().includes(search.toLowerCase()))
  );

  const addClient = (c: BillingClientRef) => onChange([...selected, c]);
  const removeClient = (id: number) => onChange(selected.filter((c) => c.id !== id));

  return (
    <div className="space-y-3">
      {/* Selected clients */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" /> Assigned Clients ({selected.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => removeClient(c.id)}
                  className="text-indigo-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search + available list */}
      <div>
        <label className="block text-xs font-medium text-[#344054] mb-1.5">
          Add Billing Clients
        </label>
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#98A2B3]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, GSTIN, city…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#D0D5DD] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] bg-white"
          />
        </div>
        <div className="max-h-44 overflow-y-auto rounded-md border border-[#E4E7EC] bg-white divide-y divide-[#F2F4F7]">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-[#98A2B3] py-4">
              {search ? "No matching clients found" : "All available clients already assigned"}
            </p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addClient(c)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#F9FAFB] transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-[#101828]">{c.name}</p>
                  <p className="text-[10px] text-[#667085]">
                    {[c.gstin, c.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3]" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drawer Form ─────────────────────────────────────────────────────────────

function GroupCompanyForm({
  record,
  unassignedClients,  // globally unassigned clients
  onSubmit,
  onCancel,
  isLoading,
}: {
  record: GroupCompanyRecord | null;
  unassignedClients: BillingClientRef[];
  onSubmit: (values: { company_name: string; smart_ledger_group: string; billing_client_ids: number[] }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(record?.company_name ?? "");
  const [ledgerGroup, setLedgerGroup] = useState(record?.smart_ledger_group ?? "");
  const [selected, setSelected] = useState<BillingClientRef[]>(record?.billing_clients ?? []);

  // Available = unassigned + already assigned to THIS group
  const available: BillingClientRef[] = [
    ...unassignedClients,
    ...(record?.billing_clients ?? []),
  ];
  // Deduplicate by id
  const availableDeduped = Array.from(new Map(available.map((c) => [c.id, c])).values());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      company_name: name.trim(),
      smart_ledger_group: ledgerGroup.trim(),
      billing_client_ids: selected.map((c) => c.id),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">
        {/* Group Company Name – first field */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5">
            Group Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Panther Logistics Group"
            className="w-full px-3 py-2 text-sm border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] bg-white"
          />
        </div>

        {/* Smart Ledger Grouping */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#4F46E5]" />
            Smart Ledger Grouping
          </label>
          <p className="text-[11px] text-[#667085] mb-1.5">
            Ledger category name applied to all billing clients in this group (e.g. "Sundry Debtors – North Region").
          </p>
          <input
            type="text"
            value={ledgerGroup}
            onChange={(e) => setLedgerGroup(e.target.value)}
            placeholder="e.g. Sundry Debtors – North Region"
            className="w-full px-3 py-2 text-sm border border-[#D0D5DD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] bg-white"
          />
        </div>

        {/* Billing Client multi-select */}
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#4F46E5]" />
            Billing Clients
          </label>
          <p className="text-[11px] text-[#667085] mb-2">
            Only unassigned billing clients are shown. Clients already in another group are excluded.
          </p>
          <BillingClientPicker
            allAvailable={availableDeduped}
            selected={selected}
            onChange={setSelected}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#E4E7EC] pt-4 flex gap-2.5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-[#344054] border border-[#D0D5DD] rounded-lg hover:bg-[#F9FAFB] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#4F46E5] rounded-lg hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Saving…" : record ? "Save Changes" : "Create Group"}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GroupCompanyPage() {
  const [data, setData] = useState<GroupCompanyRecord[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<BillingClientRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GroupCompanyRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);
    try {
      const [companies, unassigned] = await Promise.all([
        apiClient<GroupCompanyRecord[]>("/api/v1/general/group-companies"),
        apiClient<BillingClientRef[]>("/api/v1/general/group-companies/unassigned-clients"),
      ]);
      setData(Array.isArray(companies) ? companies : []);
      setUnassignedClients(Array.isArray(unassigned) ? unassigned : []);
    } catch (err: any) {
      setIsError(true);
      setErrorMessage(err.message || "Failed to load group companies.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => { setEditingRecord(null); setIsDrawerOpen(true); };
  const openEdit = (row: GroupCompanyRecord) => { setEditingRecord(row); setIsDrawerOpen(true); };
  const closeDrawer = () => { setIsDrawerOpen(false); setEditingRecord(null); };

  const columns: ColumnDef<GroupCompanyRecord>[] = [
    {
      key: "company_name",
      header: "Group Company Name",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-[#101828] flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
          {row.company_name}
        </span>
      ),
    },
    {
      key: "billing_clients",
      header: "Billing Clients",
      cell: (row) => {
        const clients = row.billing_clients ?? [];
        if (!clients.length) return <span className="text-[#98A2B3] text-xs">None assigned</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {clients.slice(0, 3).map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                <Users className="w-2.5 h-2.5" />{c.name}
              </span>
            ))}
            {clients.length > 3 && (
              <span className="text-[10px] text-[#667085] font-medium">+{clients.length - 3} more</span>
            )}
          </div>
        );
      },
    },
    {
      key: "smart_ledger_group",
      header: "Smart Ledger Group",
      cell: (row) =>
        row.smart_ledger_group ? (
          <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
            <Tag className="w-2.5 h-2.5" />{row.smart_ledger_group}
          </span>
        ) : (
          <span className="text-[#98A2B3] text-xs">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (row) => <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
  ];

  const actions: RowAction<GroupCompanyRecord>[] = [
    {
      label: "Edit",
      icon: <Pencil className="w-3.5 h-3.5 text-slate-600" />,
      onClick: openEdit,
    },
    {
      label: "Deactivate",
      icon: <Trash2 className="w-3.5 h-3.5 text-[#F04438]" />,
      variant: "danger",
      hidden: (row) => !row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Deactivate Group Company",
          description: "Are you sure? Billing clients will remain but lose the group assignment.",
          confirmText: "Deactivate",
          variant: "danger",
        });
        if (!ok) return;
        setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: false } : item));
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: false }),
          });
          toast.success("Deactivated successfully.");
        } catch (err: any) {
          setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: true } : item));
          toast.error(err.message || "Failed to deactivate.");
        }
      },
    },
    {
      label: "Activate",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      variant: "default",
      hidden: (row) => !!row.is_active,
      onClick: async (row) => {
        const ok = await confirmModal({
          title: "Activate Group Company",
          description: "Are you sure you want to activate this group?",
          confirmText: "Activate",
          variant: "primary",
        });
        if (!ok) return;
        setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: true } : item));
        try {
          await apiClient(`/api/v1/general/group-companies/${row.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: true }),
          });
          toast.success("Activated successfully.");
        } catch (err: any) {
          setData((prev) => prev.map((item) => item.id === row.id ? { ...item, is_active: false } : item));
          toast.error(err.message || "Failed to activate.");
        }
      },
    },
  ];

  const handleSubmit = async (values: { company_name: string; smart_ledger_group: string; billing_client_ids: number[] }) => {
    setIsSubmitting(true);
    try {
      if (editingRecord) {
        const updated = await apiClient<GroupCompanyRecord>(`/api/v1/general/group-companies/${editingRecord.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
        toast.success("Group company updated successfully.");
        setData((prev) => prev.map((item) => item.id === editingRecord.id ? (updated as GroupCompanyRecord) : item));
      } else {
        await apiClient("/api/v1/general/group-companies", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success("Group company created successfully.");
      }
      closeDrawer();
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save group company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Companies"
        description="Assign billing clients to group companies and configure smart ledger grouping per entity."
        breadcrumbs={[
          { label: "General", href: "/general/group-company" },
          { label: "Group Companies" },
        ]}
        primaryAction={{
          label: "Add Group Company",
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: openCreate,
        }}
      />

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={errorMessage}
        onRetry={loadData}
        actions={actions}
        searchPlaceholder="Search by group name or ledger group…"
        emptyMessage="No group companies registered"
        emptySubtext="Create a group company and assign billing clients to it."
        emptyAction={{ label: "Add Group Company", onClick: openCreate }}
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingRecord ? "Edit Group Company" : "Create Group Company"}
        description={
          editingRecord
            ? "Update group name, ledger grouping, and assigned billing clients."
            : "Set a group name, smart ledger group, and pick billing clients to assign."
        }
      >
        <GroupCompanyForm
          key={editingRecord ? `edit-${editingRecord.id}` : "new"}
          record={editingRecord}
          unassignedClients={unassignedClients}
          onSubmit={handleSubmit}
          onCancel={closeDrawer}
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
