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
 * Explicit ConfirmDialog conforming to docs/design.md §24:
 * Title, Consequence, Entity name, Cancel, Confirm.
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
          className="fixed inset-0 bg-[#172033]/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={isLoading ? undefined : onClose}
          aria-hidden="true"
        />

        {/* Dialog Modal */}
        <div className="relative w-full max-w-md transform overflow-hidden rounded-card bg-white p-6 text-left shadow-floating border border-[#E4E7EC] transition-all animate-in zoom-in-95">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-full shrink-0 ${
                variant === "danger"
                  ? "bg-[#FEF2F2] text-[#DC2626]"
                  : "bg-[#FFFAEB] text-[#D97706]"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold text-[#172033]">
                {title}
              </h3>
              {entityName && (
                <div className="text-xs font-mono font-semibold bg-[#F2F4F7] px-2 py-1 rounded text-[#172033] inline-block">
                  {entityName}
                </div>
              )}
              {desc && (
                <p className="text-xs text-[#667085] leading-relaxed">
                  {desc}
                </p>
              )}
              {children && (
                <div className="pt-3">
                  {children}
                </div>
              )}
            </div>

            {!isLoading && (
              <button
                type="button"
                onClick={onClose}
                className="text-[#98A2B3] hover:text-[#172033] p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              {canLabel}
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              size="sm"
              onClick={onConfirm}
              isLoading={isLoading}
              disabled={disabled || isLoading}
            >
              {cLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
