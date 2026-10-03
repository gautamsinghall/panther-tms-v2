"use client";

import React from "react";
import {
  Truck,
  MapPin,
  Building2,
  Package,
  Scale,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface LinkedJobData {
  id: number;
  job_number: string;
  job_date?: string;
  status?: string;
  consigner_id?: number;
  consignee_id?: number;
  origin_location_id?: number;
  destination_location_id?: number;
  billing_client_id?: number;
  origin_city?: string;
  destination_city?: string;
  billing_client_name?: string;
  billing_party?: string;
  consigner_name?: string;
  consigner_code?: string;
  consignee_name?: string;
  consignee_code?: string;
  cargo_description?: string;
  estimated_weight_mt?: number | string;
  estimated_packages?: number;
  expected_dispatch_date?: string;
  special_instructions?: string;
}

interface LinkedJobSummaryCardProps {
  job: LinkedJobData;
  onUnlink: () => void;
}

const VEHICLE_REG_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i;
const STATUS_KEYWORD_REGEX = /^(assigned|open|booked|pending|closed|cancelled|in_transit|in transit)$/i;

export const LinkedJobSummaryCard: React.FC<LinkedJobSummaryCardProps> = ({
  job,
  onUnlink,
}) => {
  const consignerLooksLikePlate = Boolean(
    job.consigner_name && VEHICLE_REG_REGEX.test(job.consigner_name.trim())
  );
  const consigneeLooksLikeStatus = Boolean(
    job.consignee_name && STATUS_KEYWORD_REGEX.test(job.consignee_name.trim())
  );

  return (
    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/50 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-700 shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-950 font-mono">
                Linked Job Order: {job.job_number}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {job.status || "OPEN"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Source Indent #{job.id} · Details imported into LR Booking below
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onUnlink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
          title="Disconnect this Job Order and switch back to Direct Booking"
        >
          <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
          <span>Unlink Job</span>
        </button>
      </div>

      {/* 3-Column Specifications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
        {/* Column 1: Corridor & Dates */}
        <div className="p-3 bg-white/90 rounded-xl border border-indigo-100/80 space-y-2 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-500" />
            Transit Corridor
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <span className="truncate">{job.origin_city || "Origin Hub"}</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{job.destination_city || "Destination Hub"}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Expected Dispatch: </span>
            <strong className="text-slate-700 font-medium">
              {job.expected_dispatch_date ? formatDate(job.expected_dispatch_date) : "Immediate"}
            </strong>
          </div>
        </div>

        {/* Column 2: Parties */}
        <div className="p-3 bg-white/90 rounded-xl border border-indigo-100/80 space-y-1.5 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-500" />
            Commercial Parties
          </div>
          <div className="truncate text-slate-800">
            <span className="text-[10px] font-medium text-slate-400 mr-1.5">CLIENT:</span>
            <span className="font-semibold">{job.billing_client_name || job.billing_party || "—"}</span>
          </div>
          <div className="truncate text-slate-800">
            <span className="text-[10px] font-medium text-slate-400 mr-1.5">FROM:</span>
            <span className="font-medium">{job.consigner_name || job.consigner_code || "—"}</span>
          </div>
          <div className="truncate text-slate-800">
            <span className="text-[10px] font-medium text-slate-400 mr-1.5">TO:</span>
            <span className="font-medium">{job.consignee_name || job.consignee_code || "—"}</span>
          </div>
        </div>

        {/* Column 3: Cargo Specifications */}
        <div className="p-3 bg-white/90 rounded-xl border border-indigo-100/80 space-y-2 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Package className="w-3 h-3 text-indigo-500" />
            Cargo Specifications
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 font-semibold text-slate-900">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.estimated_packages ?? 0} Pkgs</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-slate-900">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {job.estimated_weight_mt !== undefined && job.estimated_weight_mt !== null
                  ? `${parseFloat(String(job.estimated_weight_mt)).toFixed(3)} MT`
                  : "0.000 MT"}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 truncate pt-1 border-t border-slate-100" title={job.cargo_description}>
            <span className="text-slate-400 font-medium">Cargo: </span>
            {job.cargo_description || "Commercial goods / standard cargo"}
          </div>
        </div>
      </div>

      {/* Import Status Checklist & Missing Field Banner */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2 text-xs">
        <div className="font-semibold text-indigo-950 flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Job Order Source Mapping Status:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Route & Corridor: Imported</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Parties & Client: Imported</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Packages & Weight: Imported</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Truck & Driver: Required Below</span>
          </div>
        </div>
      </div>

      {/* Advisory Warnings for Suspicious Party Records */}
      {consignerLooksLikePlate && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">
              Consignor Record Notice: &ldquo;{job.consigner_name}&rdquo; resembles a vehicle registration plate
            </span>
            <p className="text-[11px] text-amber-800">
              The linked Job Order lists this value under Consignor (Sender). Panther TMS has preserved the exact party mapping without automatically guessing it as a vehicle. Please verify that this is your intended Consignor, and assign the actual vehicle in the <strong>Truck No.</strong> field below.
            </p>
          </div>
        </div>
      )}

      {consigneeLooksLikeStatus && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold block">
              Consignee Record Notice: &ldquo;{job.consignee_name}&rdquo; resembles a workflow status keyword
            </span>
            <p className="text-[11px] text-amber-800">
              The linked Job Order lists this value under Consignee (Receiver). Please verify the delivery party in the Consignee dropdown below before issuing the official carrier note.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
