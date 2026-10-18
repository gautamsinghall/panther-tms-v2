"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
} from "lucide-react";
import { toast, ToastItem, ConfirmModalOptions } from "@/lib/toast";

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmModalOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    // Subscribe to toasts
    const unsubscribe = toast.subscribe((updatedToasts) => {
      setToasts(updatedToasts);
    });

    // Subscribe to programmatic confirm modal
    toast.setConfirmListener((options, resolve) => {
      if (options && resolve) {
        setConfirmState({ options, resolve });
      } else {
        setConfirmState(null);
      }
    });

    // Intercept native browser window.alert calls
    const originalAlert = window.alert;
    window.alert = (message?: any) => {
      const str = String(message ?? "").trim();
      if (!str) return;

      const lower = str.toLowerCase();
      if (
        lower.includes("success") ||
        lower.includes("issued") ||
        lower.includes("created") ||
        lower.includes("saved") ||
        lower.includes("updated") ||
        lower.includes("verified") ||
        lower.includes("dispatched") ||
        lower.includes("settled") ||
        lower.includes("approved")
      ) {
        toast.success(str);
      } else if (
        lower.includes("fail") ||
        lower.includes("error") ||
        lower.includes("cannot") ||
        lower.includes("invalid") ||
        lower.includes("exceed") ||
        lower.includes("missing") ||
        lower.includes("denied") ||
        lower.includes("unauthorized")
      ) {
        toast.error(str);
      } else if (
        lower.includes("please") ||
        lower.includes("required") ||
        lower.includes("warning") ||
        lower.includes("caution") ||
        lower.includes("must")
      ) {
        toast.warning(str);
      } else {
        toast.info(str);
      }
    };

    return () => {
      unsubscribe();
      toast.setConfirmListener(null);
      window.alert = originalAlert;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Toast Notification Container (Top Right) */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={() => toast.dismiss(item.id)} />
          ))}
        </AnimatePresence>
      </div>

      {/* Programmatic Confirm Modal */}
      <AnimatePresence>
        {confirmState && (
          <ConfirmModalDialog
            options={confirmState.options}
            onConfirm={() => {
              confirmState.resolve(true);
              setConfirmState(null);
            }}
            onCancel={() => {
              confirmState.resolve(false);
              setConfirmState(null);
            }}
          />
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const isSuccess = item.type === "success";
  const isError = item.type === "error";
  const isWarning = item.type === "warning";
  const isInfo = item.type === "info";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border p-4 shadow-xl transition-all ${
        isSuccess
          ? "border-emerald-200/90 shadow-emerald-500/10"
          : isError
          ? "border-rose-200/90 shadow-rose-500/10"
          : isWarning
          ? "border-amber-200/90 shadow-amber-500/10"
          : "border-indigo-200/90 shadow-indigo-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon Badge */}
        <div
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
            isSuccess
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : isError
              ? "bg-rose-50 text-rose-600 border-rose-200"
              : isWarning
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-indigo-50 text-indigo-600 border-indigo-200"
          }`}
        >
          {isSuccess && <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />}
          {isError && <AlertCircle className="w-5 h-5 stroke-[2.2]" />}
          {isWarning && <AlertTriangle className="w-5 h-5 stroke-[2.2]" />}
          {isInfo && <Info className="w-5 h-5 stroke-[2.2]" />}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {item.title && (
            <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-none mb-1">
              {item.title}
            </h4>
          )}
          <p className="text-xs font-medium text-slate-700 leading-relaxed break-words">
            {item.message}
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar (countdown indicator) */}
      {item.duration > 0 && (
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: item.duration / 1000, ease: "linear" }}
          className={`absolute bottom-0 left-0 h-0.5 ${
            isSuccess
              ? "bg-emerald-500/70"
              : isError
              ? "bg-rose-500/70"
              : isWarning
              ? "bg-amber-500/70"
              : "bg-indigo-500/70"
          }`}
        />
      )}
    </motion.div>
  );
}

function ConfirmModalDialog({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmModalOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isDanger = options.variant === "danger" || !options.variant;
  const isWarning = options.variant === "warning";

  return (
    <div className="fixed inset-0 z-[9999999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={onCancel}
        />

        {/* Dialog Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl border border-slate-200"
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                isDanger
                  ? "bg-rose-50 border border-rose-100 text-rose-600"
                  : isWarning
                  ? "bg-amber-50 border border-amber-100 text-amber-600"
                  : "bg-indigo-50 border border-indigo-100 text-indigo-600"
              }`}
            >
              {isDanger ? (
                <AlertTriangle className="w-5 h-5" />
              ) : isWarning ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {options.title}
              </h3>
              {options.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {options.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold rounded-xl h-9 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {options.cancelText || "Cancel"}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`text-xs font-semibold rounded-xl h-9 px-4 text-white shadow-xs transition-colors ${
                isDanger
                  ? "bg-rose-600 hover:bg-rose-700"
                  : isWarning
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {options.confirmText || "Confirm"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
