"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { FormSectionDef, FormFieldDef } from "@/types/form";
import { AlertCircle, HelpCircle } from "lucide-react";

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

/**
 * Standardized Enterprise Form Component:
 * - Card-sectioned with clear headers and subtle dividers
 * - Accessible label-above layout with red required indicator
 * - Focus rings and validation alerts
 * - Sticky bottom action bar
 */
export function Form({
  sections,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  isLoading = false,
  isSubmitting = false,
  stickyFooter = true,
  className,
}: FormProps) {
  const loading = isLoading || isSubmitting;
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (field: FormFieldDef) => {
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    if (field.required && !field.disabled) {
      const val = values[field.name];
      if (val === undefined || val === null || String(val).trim() === "") {
        setErrors((prev) => ({ ...prev, [field.name]: `${field.label} is required` }));
      }
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
    <form onSubmit={handleSubmit} className={cn("max-w-[760px] space-y-6 mx-auto", className)}>
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
            className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-2xs"
          >
            {/* Section Header */}
            {(section.title || section.description) && (
              <div className="border-b border-slate-100 pb-3">
                {section.title && (
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                    {section.title}
                  </h2>
                )}
                {section.description && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    {section.description}
                  </p>
                )}
              </div>
            )}

            {/* Field Grid */}
            <div className={cn("grid gap-4", gridCols)}>
              {section.fields.map((field) => {
                const fieldError = errors[field.name];
                const inputId = `form-field-${field.name}`;
                const val = values[field.name] ?? field.defaultValue ?? "";

                return (
                  <div
                    key={field.name}
                    className={cn(
                      "space-y-1.5",
                      field.colSpan === 2 ? "col-span-1 md:col-span-2" : "",
                      field.colSpan === 3 ? "col-span-1 md:col-span-3" : "",
                      field.colSpan === 4 ? "col-span-full" : ""
                    )}
                  >
                    {/* Label Above Input */}
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={inputId}
                        className="block text-xs font-semibold text-slate-700 tracking-tight"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-rose-500 ml-0.5 font-bold" title="Required">
                            *
                          </span>
                        )}
                      </label>

                      {/* Tooltip for Disabled Fields or Helpers */}
                      {field.disabled ? (
                        <Tooltip content={field.disabledReason || "This field is locked and cannot be edited in current state"}>
                          <span className="cursor-help text-slate-400 hover:text-slate-700">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </span>
                        </Tooltip>
                      ) : field.helperText ? (
                        <Tooltip content={field.helperText}>
                          <span className="cursor-help text-slate-400 hover:text-slate-700">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </span>
                        </Tooltip>
                      ) : null}
                    </div>

                    {/* Inputs */}
                    {field.type === "select" ? (
                      <div className="relative">
                        <select
                          id={inputId}
                          value={val}
                          disabled={field.disabled || loading}
                          onChange={(e) => handleChange(field.name, e.target.value)}
                          onBlur={() => handleBlur(field)}
                          className={cn(
                            "w-full h-10 px-3 text-xs sm:text-sm font-medium rounded-xl border bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs",
                            field.disabled
                              ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
                              : "border-slate-200",
                            fieldError && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                          )}
                        >
                          <option value="">{field.placeholder || `Select ${field.label}`}</option>
                          {field.options?.map((opt) => (
                            <option key={String(opt.value)} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : field.type === "textarea" ? (
                      <textarea
                        id={inputId}
                        value={val}
                        disabled={field.disabled || loading}
                        placeholder={field.placeholder}
                        rows={3}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        className={cn(
                          "w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-y shadow-2xs",
                          field.disabled
                            ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
                            : "border-slate-200",
                          fieldError && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        )}
                      />
                    ) : field.type === "checkbox" ? (
                      <div className="flex items-center gap-2 pt-1.5">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={Boolean(val)}
                          disabled={field.disabled || loading}
                          onChange={(e) => handleChange(field.name, e.target.checked)}
                          onBlur={() => handleBlur(field)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-700">{field.placeholder || "Enable"}</span>
                      </div>
                    ) : (
                      <input
                        id={inputId}
                        type={field.type || "text"}
                        value={val}
                        disabled={field.disabled || loading}
                        placeholder={field.placeholder}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        className={cn(
                          "w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs",
                          field.disabled
                            ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
                            : "border-slate-200",
                          fieldError && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        )}
                      />
                    )}

                    {/* Inline Validation Error */}
                    {fieldError && (
                      <p className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldError}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Sticky Action Footer */}
      <div
        className={cn(
          "bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-end gap-3",
          stickyFooter ? "sticky bottom-4 z-20 shadow-lg shadow-slate-900/5 backdrop-blur-md bg-white/95" : ""
        )}
      >
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl h-10 px-4 text-xs font-semibold"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          className="rounded-xl h-10 px-5 text-xs font-semibold shadow-xs"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
