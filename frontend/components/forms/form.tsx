"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { FormSectionDef, FormFieldDef } from "@/types/form";
import { HelpCircle, AlertCircle } from "lucide-react";

interface FormProps {
  sections: FormSectionDef[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  stickyFooter?: boolean;
  className?: string;
}

export function Form({
  sections,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  isLoading = false,
  isSubmitting = false,
  stickyFooter = false,
  className,
}: FormProps) {
  const loading = isLoading || isSubmitting;
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.required && !field.disabled) {
          const val = values[field.name];
          if (val === undefined || val === null || String(val).trim() === "") {
            newErrors[field.name] = `${field.label} is required`;
          }
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-8", className)}>
      {sections.map((section, sIndex) => {
        const gridCols = {
          1: "grid-cols-1",
          2: "grid-cols-1 md:grid-cols-2",
          3: "grid-cols-1 md:grid-cols-3",
          4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
        }[section.columns || 2];

        return (
          <div
            key={section.id || section.title || sIndex}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-5"
          >
            {/* Section Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {section.title}
              </h4>
              {section.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {section.description}
                </p>
              )}
            </div>

            {/* Field Grid */}
            <div className={cn("grid gap-4", gridCols)}>
              {section.fields.map((field) => {
                const colSpanClass = {
                  1: "col-span-1",
                  2: "col-span-1 md:col-span-2",
                  3: "col-span-1 md:col-span-3",
                  4: "col-span-full",
                }[field.colSpan || 1];

                const fieldId = `field-${field.name}`;
                const error = errors[field.name];
                const value = values[field.name] ?? "";

                return (
                  <div key={field.name} className={cn("space-y-1.5", colSpanClass)}>
                    {/* Label with Tooltip for Disabled Explanation per design.md §3 */}
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={fieldId}
                        className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {field.label}
                        {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                        {field.disabled && field.disabledReason && (
                          <Tooltip content={field.disabledReason} side="top">
                            <span className="cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                              <HelpCircle className="w-3.5 h-3.5 ml-0.5" />
                            </span>
                          </Tooltip>
                        )}
                      </label>
                    </div>

                    {/* Field input rendering */}
                    {field.type === "select" ? (
                      <div className="relative">
                        <select
                          id={fieldId}
                          disabled={field.disabled}
                          value={value}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          className={cn(
                            "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
                            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200",
                            "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60",
                            error && "border-rose-500"
                          )}
                        >
                          <option value="">Select an option...</option>
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : field.type === "textarea" ? (
                      <textarea
                        id={fieldId}
                        rows={3}
                        disabled={field.disabled}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={cn(
                          "flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
                          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200",
                          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                          error && "border-rose-500"
                        )}
                      />
                    ) : (
                      <input
                        id={fieldId}
                        type={field.type || "text"}
                        disabled={field.disabled}
                        value={value}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={cn(
                          "flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
                          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200",
                          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800/60",
                          error && "border-rose-500"
                        )}
                      />
                    )}

                    {/* Inline Error */}
                    {error ? (
                      <p className="flex items-center gap-1 text-xs text-rose-600 font-medium mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {error}
                      </p>
                    ) : field.helperText ? (
                      <p className="text-xs text-slate-500 mt-1">{field.helperText}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Action Footer (Save bottom-right, Cancel beside it per design.md §3) */}
      <div
        className={cn(
          "flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800",
          stickyFooter && "sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur py-3 px-4 rounded-xl shadow-lg border z-20"
        )}
      >
        {onCancel && (
          <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" variant="primary" size="md" isLoading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
