"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  consequence?: string;
  description?: string;
  entityName?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Enterprise ConfirmDialog:
 * High-clarity confirmation modal for destructive or irreversible actions.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  consequence,
  description,
  entityName,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  variant = "danger",
  isLoading = false,
  disabled = false,
  children,
}: ConfirmDialogProps) {
  const desc = consequence || description;
  const cLabel = confirmText || confirmLabel || "Confirm";
  const canLabel = cancelText || cancelLabel || "Cancel";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={isLoading ? undefined : onClose}
          aria-hidden="true"
        />

        {/* Dialog Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl border border-slate-200 transition-all animate-in zoom-in-95">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                variant === "danger"
                  ? "bg-rose-50 border border-rose-100 text-rose-600 shadow-2xs"
                  : "bg-amber-50 border border-amber-100 text-amber-600 shadow-2xs"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {title}
              </h3>
              {entityName && (
                <div className="text-xs font-mono font-semibold bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-slate-800 inline-block">
                  {entityName}
                </div>
              )}
              {desc && (
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {desc}
                </p>
              )}
              {children}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Footer */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs font-semibold rounded-xl h-9 px-4"
            >
              {canLabel}
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              size="md"
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={disabled || isLoading}
              className="text-xs font-semibold rounded-xl h-9 px-4 shadow-sm"
            >
              {cLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
