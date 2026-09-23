"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Radio, MapPin, Gauge, Info, RefreshCw, Navigation, Activity, Signal } from "lucide-react";
import { DataTable } from "@/components/tables/data-table";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EntityDrawer } from "@/components/ui/entity-drawer";
import { KpiCard } from "@/components/ui/kpi-card";
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const stats = useMemo(() => {
    const totalVehicles = new Set(data.map((d) => d.vehicle_number)).size;
    const gpsPings = data.filter((d) => d.tracking_mode === "GPS").length;
    const fastagPings = data.filter((d) => d.tracking_mode === "FASTAG").length;
    const movingVehicles = data.filter((d) => parseFloat(String(d.speed_kmh || 0)) > 0).length;
    return { totalVehicles, gpsPings, fastagPings, movingVehicles };
  }, [data]);

  const columns: ColumnDef<TrackingPingRecord>[] = [
    {
      key: "vehicle_number",
      header: "Vehicle Number",
      sortable: true,
      cell: (row) => (
        <span className="font-mono font-bold uppercase text-slate-900">
          {row.vehicle_number}
        </span>
      ),
    },
    {
      key: "tracking_mode",
      header: "Tracking Mode",
      cell: (row) => {
        let variant: "info" | "primary" | "neutral" = "neutral";
        if (row.tracking_mode === "GPS") variant = "primary";
        if (row.tracking_mode === "FASTAG") variant = "info";
        return (
          <Badge variant={variant} dot className="font-mono text-xs">
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
          <div className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            {row.location_name || "En route"}
          </div>
          {row.last_latitude && (
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
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
        <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">
          {row.speed_kmh ? `${parseFloat(String(row.speed_kmh)).toFixed(1)} km/h` : "Idle / Stopped"}
        </span>
      ),
    },
    {
      key: "last_ping_at",
      header: "Last Telemetry Ping",
      cell: (row) => (
        <span className="text-xs font-mono text-slate-500 tabular-nums">
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
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record telemetry ping.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Transport", href: "/transport" },
          { label: "Fleet Tracking" },
        ]}
        title="Fleet Tracking (FASTag / GPS / SIM)"
        description="Unified fleet tracking telemetry shell supporting GPS devices, toll gate FASTag pings, and SIM tracking."
        primaryAction={{
          label: "Simulate Ping",
          icon: Plus,
          onClick: () => setIsDrawerOpen(true),
        }}
      />

      {/* Telemetry KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Monitored Fleet Units"
          value={stats.totalVehicles.toLocaleString()}
          subtext="Active tracked registration plates"
          icon={<Navigation className="w-4 h-4 text-indigo-600" />}
        />
        <KpiCard
          title="Active GPS Devices"
          value={stats.gpsPings.toLocaleString()}
          subtext="High-frequency telemetry fixes"
          icon={<Radio className="w-4 h-4 text-emerald-600" />}
        />
        <KpiCard
          title="FASTag Toll Gate Pings"
          value={stats.fastagPings.toLocaleString()}
          subtext="NETC corridor checkpoint hits"
          icon={<Signal className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          title="Moving In Transit"
          value={stats.movingVehicles.toLocaleString()}
          subtext="Speed > 0 km/h active velocity"
          icon={<Activity className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Integration Gap Notice per Rules §2 */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-800 space-y-1">
          <p className="font-semibold text-amber-900">
            Telemetry Shell (Rules.md §2 — Do-Not-Invent Principle)
          </p>
          <p className="text-amber-800/90 leading-relaxed">
            External hardware/telecom providers (NPCI NETC FASTag, WheelsEye/LocoNav GPS, telecom SIM consent gateways)
            are marked as{" "}
            <code className="font-mono bg-amber-100/70 px-1.5 py-0.5 rounded border border-amber-300/80 text-amber-900 font-semibold">
              UNKNOWN / NEEDS VERIFICATION
            </code>{" "}
            until specific carrier agreements are configured. The data model and telemetry display pipeline are fully operational.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={loadData}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        searchPlaceholder="Search by vehicle number, location, or mode..."
      />

      <EntityDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Record Telemetry Ping"
        subtitle="Simulate GPS, FASTag or SIM ping for vehicle location tracking"
        size="lg"
      >
        <Form
          sections={formSections}
          onSubmit={handleCreate}
          onCancel={() => setIsDrawerOpen(false)}
          submitLabel="Transmit Ping"
          isLoading={isSubmitting}
        />
      </EntityDrawer>
    </div>
  );
}
