"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl" | "full";
  size?: "md" | "lg" | "xl" | "full";
  footer?: React.ReactNode;
}

/**
 * EntityDrawer pattern:
 * Right-side drawer for creating/editing records while preserving background context.
 */
export function EntityDrawer({
  isOpen,
  onClose,
  title,
  description,
  subtitle,
  children,
  width,
  size,
  footer,
}: EntityDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const effectiveWidth = size || width || "lg";
  const widthClasses = {
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-2xl",
    full: "max-w-4xl",
  }[effectiveWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#101828]/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={cn(
            "w-screen bg-white shadow-floating border-l border-[#E4E7EC] flex flex-col transform transition-transform duration-200 ease-in-out animate-in slide-in-from-right",
            widthClasses
          )}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E4E7EC] flex items-start justify-between bg-white shrink-0">
            <div>
              <h2 className="text-[18px] leading-[24px] font-semibold text-[#101828]">
                {title}
              </h2>
              {(description || subtitle) && (
                <p className="text-[13px] leading-[18px] text-[#667085] mt-0.5">
                  {description || subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-control text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FB] transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body on calm --gray-25 canvas */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#FCFCFD]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-[#E4E7EC] bg-white flex items-center justify-end gap-2.5 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
