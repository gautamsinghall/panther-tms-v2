"use client";

import React, { useState, useEffect } from "react";
import { Plus, Hash, Layers, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/tables/data-table";
import { ColumnDef } from "@/types/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";

interface SeriesMasterItem {
  id: number;
  category_id?: number | null;
  document_type: string;
  prefix: string;
  suffix?: string | null;
  starting_number: number;
  current_number: number;
  financial_year: string;
  is_active: boolean;
}

interface SeriesCategoryItem {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
}

export default function SeriesMasterPage() {
  const [activeTab, setActiveTab] = useState<"series" | "categories">("series");
  const [seriesList, setSeriesList] = useState<SeriesMasterItem[]>([]);
  const [categoryList, setCategoryList] = useState<SeriesCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / Create forms
  const [showAddSeriesModal, setShowAddSeriesModal] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New series form
  const [docType, setDocType] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [startingNum, setStartingNum] = useState(1);
  const [finYear, setFinYear] = useState("2026-2027");
  const [selectedCatId, setSelectedCatId] = useState<number | undefined>(undefined);

  // New category form
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [seriesRes, catRes] = await Promise.all([
        apiClient<SeriesMasterItem[]>("/api/v1/settings/series"),
        apiClient<SeriesCategoryItem[]>("/api/v1/settings/series-categories"),
      ]);
      setSeriesList(Array.isArray(seriesRes) ? seriesRes : []);
      setCategoryList(Array.isArray(catRes) ? catRes : []);
    } catch (err: any) {
      setError(err.message || "Failed to load series configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient("/api/v1/settings/series", {
        method: "POST",
        body: JSON.stringify({
          document_type: docType,
          prefix,
          suffix: suffix || null,
          starting_number: startingNum,
          current_number: startingNum - 1,
          financial_year: finYear,
          category_id: selectedCatId || null,
          is_active: true,
        }),
      });
      setShowAddSeriesModal(false);
      setDocType("");
      setPrefix("");
      setSuffix("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create series.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient("/api/v1/settings/series-categories", {
        method: "POST",
        body: JSON.stringify({
          name: catName,
          code: catCode.toUpperCase(),
          description: catDesc || null,
          is_active: true,
        }),
      });
      setShowAddCatModal(false);
      setCatName("");
      setCatCode("");
      setCatDesc("");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create category.");
    } finally {
      setSubmitting(false);
    }
  };

  const seriesColumns: ColumnDef<SeriesMasterItem>[] = [
    {
      key: "document_type",
      header: "Document Module / Type",
      sortable: true,
      cell: (row) => (
        <span className="font-semibold text-xs text-[#172033]">{row.document_type}</span>
      ),
    },
    {
      key: "prefix",
      header: "Format Sequence",
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-indigo-600">
          {row.prefix}
          {String(row.current_number + 1).padStart(4, "0")}
          {row.suffix || ""}
        </span>
      ),
    },
    {
      key: "current_number",
      header: "Current Running #",
      align: "right",
      isNumeric: true,
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-[#172033]">{row.current_number}</span>
      ),
    },
    {
      key: "financial_year",
      header: "Financial Year",
      cell: (row) => <span className="font-mono text-xs text-[#667085]">{row.financial_year}</span>,
    },
    {
      key: "is_active",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} variant="active" />
      ),
    },
  ];

  const categoryColumns: ColumnDef<SeriesCategoryItem>[] = [
    {
      key: "code",
      header: "Category Code",
      sortable: true,
      cell: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800">{row.code}</span>
      ),
    },
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      cell: (row) => <span className="font-semibold text-xs text-[#172033]">{row.name}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row) => (
        <span className="text-xs text-slate-500">{row.description || "—"}</span>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      cell: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} variant="active" />
      ),
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
          label: activeTab === "series" ? "Add Series Master" : "Add Series Category",
          icon: <Plus className="w-4 h-4" />,
          onClick: () => {
            if (activeTab === "series") setShowAddSeriesModal(true);
            else setShowAddCatModal(true);
          },
        }}
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("series")}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "series"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Document Series ({seriesList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === "categories"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Series Categories ({categoryList.length})
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Loading series records...</span>
        </div>
      ) : activeTab === "series" ? (
        <DataTable columns={seriesColumns} data={seriesList} />
      ) : (
        <DataTable columns={categoryColumns} data={categoryList} />
      )}

      {/* Add Series Modal */}
      {showAddSeriesModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add New Document Series</h3>
              <button
                type="button"
                onClick={() => setShowAddSeriesModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className="space-y-3">
              <Input
                label="Document Type / Title"
                placeholder="e.g. Delivery Challan (DC)"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prefix"
                  placeholder="DC-2026-"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  required
                />
                <Input
                  label="Suffix (Optional)"
                  placeholder="/HQ"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Starting Number"
                  type="number"
                  value={String(startingNum)}
                  onChange={(e) => setStartingNum(parseInt(e.target.value) || 1)}
                  required
                />
                <Input
                  label="Financial Year"
                  placeholder="2026-2027"
                  value={finYear}
                  onChange={(e) => setFinYear(e.target.value)}
                  required
                />
              </div>

              {categoryList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Series Category (Optional)
                  </label>
                  <select
                    value={selectedCatId || ""}
                    onChange={(e) =>
                      setSelectedCatId(e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">No Category</option>
                    {categoryList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSeriesModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? "Saving..." : "Create Series"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Series Category</h3>
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <Input
                label="Category Name"
                placeholder="e.g. Transport Logistics"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />

              <Input
                label="Category Code (Uppercase)"
                placeholder="e.g. LOGISTICS"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                required
              />

              <Input
                label="Description (Optional)"
                placeholder="Dispatches, haulage and hire orders"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCatModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? "Saving..." : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
