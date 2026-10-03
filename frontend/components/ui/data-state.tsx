import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  FileSearch,
  Loader2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataStateKind =
  | "loading"
  | "error"
  | "not-configured"
  | "not-selected"
  | "no-records"
  | "no-results"
  | "success";

interface DataStateProps {
  kind: DataStateKind;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
  className?: string;
}

const defaults: Record<DataStateKind, { title: string; description: string }> = {
  loading: { title: "Loading records", description: "Please wait while the latest data is retrieved." },
  error: { title: "Unable to load records", description: "The data could not be loaded. Try again." },
  "not-configured": { title: "Setup required", description: "Configure the required master before using this view." },
  "not-selected": { title: "Select an item", description: "Choose an item to view its records." },
  "no-records": { title: "No records yet", description: "Records will appear here after they are created." },
  "no-results": { title: "No search results", description: "No records match the current search or filters." },
  success: { title: "Complete", description: "The requested operation is complete." },
};

export function DataState({ kind, title, description, action, compact = false, className }: DataStateProps) {
  const Icon =
    kind === "loading"
      ? Loader2
      : kind === "error"
      ? AlertCircle
      : kind === "not-configured"
      ? Settings2
      : kind === "not-selected"
      ? FileQuestion
      : kind === "success"
      ? CheckCircle2
      : FileSearch;

  const tone =
    kind === "error"
      ? "bg-rose-50 border-rose-100 text-rose-600"
      : kind === "not-configured"
      ? "bg-amber-50 border-amber-100 text-amber-700"
      : kind === "success"
      ? "bg-emerald-50 border-emerald-100 text-emerald-700"
      : "bg-slate-50 border-slate-200/80 text-slate-500";

  return (
    <div className={cn("mx-auto max-w-sm text-center", compact ? "space-y-2 py-4" : "space-y-3 py-8", className)}>
      <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border shadow-2xs", tone)}>
        <Icon className={cn("h-6 w-6", kind === "loading" && "animate-spin")} />
      </div>
      <h4 className="text-sm font-bold text-slate-900">{title || defaults[kind].title}</h4>
      <p className="text-xs leading-normal text-slate-500">{description || defaults[kind].description}</p>
      {action && (
        <Button type="button" variant="secondary" size="sm" onClick={action.onClick} className="rounded-xl">
          {action.label}
        </Button>
      )}
    </div>
  );
}

