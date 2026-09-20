"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Radio, MapPin, Gauge, Info, RefreshCw } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@/types/table";
import { FormSectionDef } from "@/types/form";
import { apiClient } from "@/lib/api-client";

interface TrackingPingRecord {
  id: number;
  vehicle_number: string;
  tracking_mode: "FASTAG" | "GPS" | "SIM";
  identifier: string;
  last_latitude?: string | number;
  last_longitude?: string | number;
  location_name?: string;
  speed_kmh?: string | number;
  last_ping_at: string;
  status: string;
}

export default function TrackingPage() {
  const [data, setData] = useState<TrackingPingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<TrackingPingRecord[]>("/api/v1/transport/tracking");
      setData(res);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load telemetry pings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<TrackingPingRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold uppercase text-slate-900 dark:text-slate-100">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "tracking_mode",
      header: "Tracking Mode",
      align: "center",
      cell: (row) => {
        let variant: "primary" | "secondary" | "neutral" = "neutral";
        if (row.tracking_mode === "GPS") variant = "primary";
        if (row.tracking_mode === "FASTAG") variant = "secondary";
        return (
          <Badge variant={variant} className="font-mono text-xs">
            {row.tracking_mode}
          </Badge>
        );
      },
    },
    {
      key: "location",
      header: "Last Location / Coordinates",
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-500" />
            {row.location_name || "En route"}
          </div>
          {row.last_latitude && (
            <div className="text-[11px] font-mono text-slate-400">
              {Number(row.last_latitude).toFixed(4)}, {Number(row.last_longitude).toFixed(4)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "speed",
      header: "Speed",
      isNumeric: true,
      cell: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.speed_kmh ? `${parseFloat(String(row.speed_kmh)).toFixed(1)} km/h` : "Idle / Stopped"}
        </span>
      ),
    },
    {
      key: "last_ping_at",
      header: "Last Telemetry Ping",
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.last_ping_at).toLocaleTimeString()} ({new Date(row.last_ping_at).toLocaleDateString()})
        </span>
      ),
    },
  ];

  const formSections: FormSectionDef[] = [
    {
      id: "ping_info",
      title: "Simulate Telemetry Ping",
      description: "Record telemetry ping across FASTag, GPS, or SIM tracking modes",
      columns: 2,
      fields: [
        {
          name: "vehicle_number",
          label: "Vehicle Registration Number *",
          placeholder: "e.g. MH12AB1234",
          required: true,
        },
        {
          name: "tracking_mode",
          label: "Tracking Mode *",
          type: "select",
          required: true,
          options: [
            { label: "GPS Telemetry Device", value: "GPS" },
            { label: "FASTag Toll Plaza Ping", value: "FASTAG" },
            { label: "SIM / Cell Tower Triangulation", value: "SIM" },
          ],
        },
        {
          name: "identifier",
          label: "Device Identifier (IMEI / Tag ID / Phone) *",
          placeholder: "e.g. 867530901234567",
          required: true,
        },
        {
          name: "location_name",
          label: "Checkpoint / Location Landmark",
          placeholder: "e.g. Khed-Shivapur Toll Plaza",
          required: true,
        },
        {
          name: "last_latitude",
          label: "Latitude",
          type: "number",
          placeholder: "18.5204",
        },
        {
          name: "last_longitude",
          label: "Longitude",
          type: "number",
          placeholder: "73.8567",
        },
        {
          name: "speed_kmh",
          label: "Vehicle Speed (km/h)",
          type: "number",
          placeholder: "65.0",
        },
      ],
    },
  ];

  const handleCreate = async (values: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        last_latitude: values.last_latitude ? parseFloat(values.last_latitude) : null,
        last_longitude: values.last_longitude ? parseFloat(values.last_longitude) : null,
        speed_kmh: values.speed_kmh ? parseFloat(values.speed_kmh) : 0,
      };
      await apiClient("/api/v1/transport/tracking", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record telemetry ping.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Tracking (FASTag / GPS / SIM)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fleet tracking telemetry shell supporting GPS devices, toll gate FASTag pings, and SIM tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            Simulate Ping
          </Button>
        </div>
      </div>

      {/* Integration Gap Notice per Rules §2 */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
          <p className="font-semibold">
            Telemetry Shell (Rules.md §2 — Do-Not-Invent Principle)
          </p>
          <p className="text-amber-700/80 dark:text-amber-300/80">
            External hardware/telecom providers (NPCI NETC FASTag, WheelsEye/LocoNav GPS, telecom SIM consent gateways)
            are marked as{" "}
            <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">
              UNKNOWN / NEEDS VERIFICATION
            </code>{" "}
            until specific carrier agreements are configured. The data model and telemetry display pipeline are fully operational.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search by vehicle number, location, or mode..."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Telemetry Ping
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <Form
              sections={formSections}
              onSubmit={handleCreate}
              onCancel={() => setIsModalOpen(false)}
              submitLabel="Transmit Ping"
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
