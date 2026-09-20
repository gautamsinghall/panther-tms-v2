"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl" | "full";
  footer?: React.ReactNode;
}

/**
 * EntityDrawer pattern per docs/design.md §16:
 * Right-side drawer for simple and medium CRUD workflows, preserving list context.
 */
export function EntityDrawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = "lg",
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

  const widthClasses = {
    md: "max-w-md",
    lg: "max-w-xl",
    xl: "max-w-2xl",
    full: "max-w-4xl",
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#172033]/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
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
          <div className="px-6 py-5 border-b border-[#E4E7EC] flex items-start justify-between bg-white shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#172033]">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-[#667085] mt-0.5">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-control text-[#98A2B3] hover:text-[#172033] hover:bg-[#F2F4F7] transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#F7F8FA]">
            {children}
          </div>

          {/* Optional Footer */}
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
