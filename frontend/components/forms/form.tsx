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
 * Standardized Enterprise Form Component per docs/design.md §5:
 * - Card-sectioned with H2 headers (18px/24px 600) and 1px dividers
 * - Max width constrained to 720px
 * - Label-above inputs with required marker in --danger-600
 * - Inline validation below fields with small alert icon
 * - Disabled-field tooltips explaining exact reason
 * - Sticky action footer with primary --primary-600 + outline Cancel
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
    <form onSubmit={handleSubmit} className={cn("max-w-[720px] space-y-6 mx-auto", className)}>
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
            className="bg-white rounded-card border border-[#E4E7EC] p-5 sm:p-6 space-y-4"
          >
            {/* H2 Section Header per docs/design.md §5 */}
            {(section.title || section.description) && (
              <div className="border-b border-[#E4E7EC] pb-3">
                {section.title && (
                  <h2 className="text-[18px] leading-[24px] font-semibold text-[#101828]">
                    {section.title}
                  </h2>
                )}
                {section.description && (
                  <p className="text-[13px] leading-[18px] text-[#667085] mt-0.5">
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
                    {/* Label Above Input per docs/design.md §5 */}
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={inputId}
                        className="block text-xs font-medium text-[#344054]"
                      >
                        {field.label}
                        {field.required && (
                          <span className="text-[#F04438] ml-0.5 font-bold" title="Required">
                            *
                          </span>
                        )}
                      </label>

                      {/* Tooltip for Disabled Fields or Helpers */}
                      {field.disabled ? (
                        <Tooltip content={field.disabledReason || "This field is locked and cannot be edited in current state"}>
                          <span className="cursor-help text-[#667085] hover:text-[#101828]">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </span>
                        </Tooltip>
                      ) : field.helperText ? (
                        <Tooltip content={field.helperText}>
                          <span className="cursor-help text-[#667085] hover:text-[#101828]">
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
                            "w-full h-9 px-3 text-xs rounded-control border bg-white text-[#101828] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-colors",
                            field.disabled
                              ? "bg-[#F1F3F6] text-[#667085] cursor-not-allowed border-[#E4E7EC]"
                              : "border-[#E4E7EC]",
                            fieldError && "border-[#F04438] focus:ring-[#F04438]"
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
                          "w-full px-3 py-2 text-xs rounded-control border bg-white text-[#101828] placeholder:text-[#667085] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-colors resize-y",
                          field.disabled
                            ? "bg-[#F1F3F6] text-[#667085] cursor-not-allowed border-[#E4E7EC]"
                            : "border-[#E4E7EC]",
                          fieldError && "border-[#F04438] focus:ring-[#F04438]"
                        )}
                      />
                    ) : field.type === "checkbox" ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={Boolean(val)}
                          disabled={field.disabled || loading}
                          onChange={(e) => handleChange(field.name, e.target.checked)}
                          onBlur={() => handleBlur(field)}
                          className="w-4 h-4 rounded border-[#D0D5DD] text-[#4F46E5] focus:ring-[#4F46E5] cursor-pointer"
                        />
                        <span className="text-xs text-[#344054]">{field.placeholder || "Enable"}</span>
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
                          "w-full h-9 px-3 text-xs rounded-control border bg-white text-[#101828] placeholder:text-[#667085] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-colors",
                          field.disabled
                            ? "bg-[#F1F3F6] text-[#667085] cursor-not-allowed border-[#E4E7EC]"
                            : "border-[#E4E7EC]",
                          fieldError && "border-[#F04438] focus:ring-[#F04438]"
                        )}
                      />
                    )}

                    {/* Inline Validation Error below field per docs/design.md §5 */}
                    {fieldError && (
                      <p className="flex items-center gap-1 text-xs text-[#F04438] font-medium pt-0.5 animate-in fade-in">
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

      {/* Sticky Action Footer per docs/design.md §5 */}
      <div
        className={cn(
          "bg-white border border-[#E4E7EC] rounded-card p-4 flex items-center justify-end gap-3",
          stickyFooter ? "sticky bottom-4 z-20 shadow-floating" : ""
        )}
      >
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
