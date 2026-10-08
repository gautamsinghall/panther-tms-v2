"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Radio,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Signal,
  Activity,
  Server,
  Zap,
  Copy,
  Check,
  Info,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApiCenterNavTabs } from "@/components/api-center/api-center-nav-tabs";

export default function SimApiPage() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingInterval, setPingInterval] = useState("15");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
        title="API Center"
        description="Unified external gateway credentials, real-time telemetry integrations, and developer hooks."
      >
        <div className="flex items-center gap-2">
          <Link href="/transport/tracking">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5 cursor-pointer bg-white"
            >
              <span>View Active SIM Sessions</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* API Center Sub-Nav Tabs */}
      <ApiCenterNavTabs />

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gateway Pipeline Status */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Telecom Operator Grid
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Signal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Airtel • Jio • Vi Gateway</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Nationwide cellular cell tower triangulation
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">Auto Gateway Fallback</span>
            <span className="text-[10px] font-mono text-slate-400">TRAI Compliant</span>
          </div>
        </div>

        {/* Consent Protocol */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Driver Consent Pipeline
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <span>Double Opt-In SMS Protocol</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Automated operator consent dispatched on trip initiation
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-indigo-600 font-medium">Automatic Handshake</span>
            <span className="text-[10px] font-mono text-slate-400">Live Pings</span>
          </div>
        </div>

        {/* Polling Frequency */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Default Sampling Cadence
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-xl font-bold text-slate-900 font-mono">
              Every {pingInterval} Minutes
            </div>
            <p className="text-xs text-slate-500 mt-1">
              High-cadence cellular GPS checkpoint sync
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-purple-700 font-medium">Highway Optimized</span>
            <span className="text-[10px] font-mono text-slate-400">Telemetry Engine</span>
          </div>
        </div>
      </div>

      {/* Main SIM Integration & Webhook Card */}
      <Card className="p-6 rounded-2xl border border-slate-200 shadow-xs bg-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>SIM Based Tracking Gateway &amp; Webhooks</span>
                <Badge variant="success" className="text-[10px]">
                  Pipeline Active
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage mobile operator subscriber consent dispatch, telemetry ping sampling frequency, and webhook callbacks.
              </p>
            </div>
          </div>
        </div>

        {/* Driver Consent Protocol Flow */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Driver Consent Protocol Flow</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                1
              </div>
              <h4 className="text-xs font-bold text-slate-800">Trip Dispatched</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                When a tracking trip is started with a driver phone, PANTHER dispatches an automated consent request to the telecom gateway.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <h4 className="text-xs font-bold text-slate-800">Driver SMS Confirmation</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Driver receives official operator SMS (e.g. from Airtel/Jio) and replies with consent code. No smartphone or app install required.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <h4 className="text-xs font-bold text-slate-800">Live Triangulation Fixes</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Operator streams cellular tower coordinates directly into PANTHER trip telemetry timeline until trip is marked closed.
              </p>
            </div>
          </div>
        </div>

        {/* Polling Cadence Selector */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block text-xs">Cellular Sampling Cadence</span>
              <span className="text-slate-500 text-[11px]">
                Frequency at which telecom cell towers are polled for moving vehicles.
              </span>
            </div>
            <select
              value={pingInterval}
              onChange={(e) => setPingInterval(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="15">Every 15 Minutes (Standard)</option>
              <option value="30">Every 30 Minutes</option>
              <option value="60">Every 1 Hour (Battery Saver)</option>
            </select>
          </div>
        </div>

        {/* Webhook Endpoints */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Telecom Inbound Webhook Callback</h3>
          <p className="text-xs text-slate-500">
            Registered with telecom partners for real-time consent grant notifications and telemetry fix packets.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-slate-700 truncate">
              https://api.panther-tms.com/api/v1/transport/tracking/sim/webhook
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  "https://api.panther-tms.com/api/v1/transport/tracking/sim/webhook",
                  "webhook"
                )
              }
              className="text-xs h-8 gap-1.5 shrink-0 bg-white"
            >
              {copiedKey === "webhook" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === "webhook" ? "Copied" : "Copy URL"}</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
