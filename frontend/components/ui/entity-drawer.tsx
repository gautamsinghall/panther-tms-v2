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
 * Enterprise EntityDrawer:
 * Right-side modal drawer for creating/editing records with backdrop blur and smooth slide animation.
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={cn(
            "w-screen bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out animate-in slide-in-from-right",
            widthClasses
          )}
        >
          {/* Header */}
          <div className="px-6 pt-7 pb-5 sm:px-8 sm:pt-8 sm:pb-6 border-b border-slate-200/80 flex items-start justify-between bg-white shrink-0">
            <div className="space-y-1 pr-4">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {title}
              </h2>
              {(description || subtitle) && (
                <p className="text-xs sm:text-sm text-slate-500 leading-normal">
                  {description || subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1.5 -mt-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
