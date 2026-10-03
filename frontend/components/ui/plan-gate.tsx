"use client";

import React, { useEffect, useRef } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function formatPlanName(plan?: string | null) {
  const normalized = (plan || "BUSINESS").trim().toUpperCase();
  if (normalized === "BUSINESS") return "Business Scale";
  if (normalized === "PRO") return "Pro Fleet";
  if (normalized === "ENTERPRISE") return "Enterprise Unlimited";
  return plan || "Business Scale";
}

interface PlanGateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPlan?: string | null;
  featureName?: string;
}

export function PlanGateDialog({ isOpen, onClose, requiredPlan, featureName }: PlanGateDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const planName = formatPlanName(requiredPlan);
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4" role="presentation">
      <button className="absolute inset-0 bg-slate-950/45" onClick={onClose} aria-label="Close plan information" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-gate-title"
        aria-describedby="plan-gate-description"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
          <Lock className="h-5 w-5" />
        </div>
        <h2 id="plan-gate-title" className="text-lg font-bold text-slate-900">
          {featureName || "This feature"} requires {planName}
        </h2>
        <p id="plan-gate-description" className="mt-2 text-sm leading-relaxed text-slate-600">
          Your current subscription does not include this feature. An administrator can review the subscription before access is enabled.
        </p>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

