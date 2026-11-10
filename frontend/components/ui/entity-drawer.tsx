"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceTabs } from "@/lib/workspace-tabs-context";

export interface EntityDrawerProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl" | "full";
  size?: "md" | "lg" | "xl" | "full";
  footer?: React.ReactNode;
  contextLabel?: string;
}

/**
 * Enterprise EntityDrawer (Global In-App Tab & Full-Screen Form Workspace):
 * - Replaces cramped slide-over drawers with a clean, spacious, full-screen creation view.
 * - Opens as an in-app workspace tab at the top with seamless tab switching.
 * - Leaves the main navigation sidebar completely active, visible, and unblocked.
 * - Retains entered form data when switching between the form tab and the record list tab.
 * - Supports multi-drawer pages (Accounts, Settings, Fleet) without sibling drawer state collision.
 */
export function EntityDrawer({
  isOpen: rawIsOpen,
  open: rawOpen,
  onClose,
  title,
  description,
  subtitle,
  children,
  width,
  size,
  footer,
  contextLabel = "Record Form",
}: EntityDrawerProps) {
  const isOpen = Boolean(rawIsOpen ?? rawOpen);
  const { openFormTab, dismissFormTab, setActiveTab, activeTab } = useWorkspaceTabs();
  const [mounted, setMounted] = useState(false);
  const wasOpenedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const topContainerRef = useRef<HTMLDivElement>(null);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync tab state with isOpen prop
  useEffect(() => {
    if (isOpen) {
      wasOpenedRef.current = true;
      openFormTab({
        title,
        subtitle: description || subtitle,
        onClose: () => {
          onCloseRef.current?.();
        },
      });

      // Guarantee the form always opens from the very top (never bottom or residual scroll)
      const scrollToTop = () => {
        const formCanvas = document.getElementById("workspace-form-canvas");
        if (formCanvas) {
          formCanvas.scrollTop = 0;
        }
        const mainCanvas = document.getElementById("workspace-main-canvas");
        if (mainCanvas) {
          mainCanvas.scrollTop = 0;
        }
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
        if (topContainerRef.current) {
          try {
            topContainerRef.current.scrollIntoView({ behavior: "instant", block: "start" });
          } catch {
            // ignore fallback
          }
        }
      };

      scrollToTop();
      const rafId = requestAnimationFrame(scrollToTop);
      const t1 = setTimeout(scrollToTop, 25);
      const t2 = setTimeout(scrollToTop, 100);

      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (wasOpenedRef.current) {
      // ONLY dismiss the form tab if THIS specific drawer instance was previously open!
      // This prevents sibling/closed drawers on multi-drawer pages (e.g. Accounts) from cancelling an open drawer.
      wasOpenedRef.current = false;
      dismissFormTab();
      const formCanvas = document.getElementById("workspace-form-canvas");
      if (formCanvas) {
        formCanvas.scrollTop = 0;
      }
    }
  }, [isOpen, title, description, subtitle, openFormTab, dismissFormTab]);

  // Clean up if component unmounts while open
  useEffect(() => {
    return () => {
      if (wasOpenedRef.current) {
        wasOpenedRef.current = false;
        dismissFormTab();
      }
    };
  }, [dismissFormTab]);

  // Global Escape key listener to close form when in form tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && activeTab === "form") {
        onCloseRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const maxWidthClass = "max-w-[1440px]";

  const formViewContent = (
    <div
      ref={topContainerRef}
      className={cn(
        "w-full mx-auto space-y-6 pb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-75",
        maxWidthClass
      )}
    >
      {/* Top Form Header with Breadcrumbs & Action Buttons */}
      <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                {contextLabel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {(description || subtitle) && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-normal max-w-3xl">
                {description || subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1A1D2B] hover:bg-slate-200/70 dark:hover:bg-[#23273A] rounded-xl transition-colors cursor-pointer border border-slate-200/60 dark:border-[#2B2E42] shadow-2xs flex-1 sm:flex-initial"
              title="Switch to records table without closing form"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Records (Keep Draft)</span>
            </button>
            <button
              type="button"
              onClick={() => onCloseRef.current?.()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-900/60 rounded-xl transition-colors cursor-pointer shadow-2xs flex-1 sm:flex-initial"
              title="Discard changes and close form"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close & Discard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="w-full">
        {children}
      </div>

      {/* Optional Custom Footer - Solid card positioned at the very end of the form */}
      {footer && (
        <div className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-5 sm:p-6 shadow-2xs mt-8">
          {footer}
        </div>
      )}
    </div>
  );

  const targetEl =
    typeof document !== "undefined"
      ? document.getElementById("workspace-form-canvas")
      : null;

  // If portal target container is mounted, portal into layout's workspace-form-canvas
  if (mounted && targetEl) {
    return createPortal(formViewContent, targetEl);
  }

  // Fallback: If portal target is not mounted yet, render within canvas without obscuring sidebar
  return (
    <div className="w-full pt-4">
      {formViewContent}
    </div>
  );
}
