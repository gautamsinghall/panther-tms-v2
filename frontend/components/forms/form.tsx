"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { FormSectionDef, FormFieldDef } from "@/types/form";
import { AlertCircle, HelpCircle, Upload, CheckCircle2, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StateSelect } from "@/components/ui/state-select";
import { CountrySelect } from "@/components/ui/country-select";
import { isIndia } from "@/lib/states";
import { DEFAULT_COUNTRY } from "@/lib/countries";

interface FormProps {
  sections: FormSectionDef[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  stickyFooter?: boolean;
  className?: string;
  setFieldValueRef?: React.MutableRefObject<((name: string, value: any) => void) | null>;
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
  submitDisabled = false,
  stickyFooter = false,
  className,
  setFieldValueRef,
}: FormProps) {
  const loading = isLoading || isSubmitting;
  // Seed initial values with field defaultValues where initialValues does not provide them
  const getMergedInitialValues = () => {
    const defaults: Record<string, any> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      }
    }
    return { ...defaults, ...initialValues };
  };

  const [values, setValues] = useState<Record<string, any>>(getMergedInitialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<Array<{ name: string; label: string; message: string; id: string }>>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const defaults: Record<string, any> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      }
    }
    setValues((prev) => ({ ...defaults, ...prev, ...initialValues }));
  }, [initialValues]);

  const handleChange = (name: string, value: any) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "country") {
        const prevCountry = prev.country ?? DEFAULT_COUNTRY;
        const wasIndia = isIndia(prevCountry);
        const nowIndia = isIndia(value);
        if (wasIndia !== nowIndia) {
          next["state"] = "";
        }
      }
      return next;
    });
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setErrorList((prev) => prev.filter((item) => item.name !== name));
    }
  };

  useEffect(() => {
    if (setFieldValueRef) {
      setFieldValueRef.current = handleChange;
    }
  });

  const handleBlur = (field: FormFieldDef) => {
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    if (field.required && !field.disabled) {
      const val = values[field.name] ?? field.defaultValue;
      if (val === undefined || val === null || String(val).trim() === "") {
        const msg = `${field.label} is required`;
        setErrors((prev) => ({ ...prev, [field.name]: msg }));
        setErrorList((prev) => {
          if (prev.some((p) => p.name === field.name)) return prev;
          return [...prev, { name: field.name, label: field.label, message: msg, id: `form-field-${field.name}` }];
        });
      }
    }
  };

  const scrollToField = (fieldId: string, fieldName: string) => {
    const el = document.getElementById(fieldId) || (document.querySelector(`[name="${fieldName}"]`) as HTMLElement);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if ("focus" in el && typeof el.focus === "function") {
        el.focus();
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newErrorList: Array<{ name: string; label: string; message: string; id: string }> = [];

    for (const section of sections) {
      for (const field of section.fields) {
        if (field.required && !field.disabled) {
          const val = values[field.name] ?? field.defaultValue;
          if (val === undefined || val === null || String(val).trim() === "") {
            const msg = `${field.label} is required`;
            newErrors[field.name] = msg;
            newErrorList.push({
              name: field.name,
              label: field.label,
              message: msg,
              id: `form-field-${field.name}`,
            });
          }
        }
      }
    }

    setErrors(newErrors);
    setErrorList(newErrorList);

    if (newErrorList.length > 0) {
      // Auto-scroll and focus the first invalid field
      const firstError = newErrorList[0];
      setTimeout(() => {
        scrollToField(firstError.id, firstError.name);
      }, 50);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isSubmitting) return; // Prevent duplicate submissions
    if (!validate()) return;

    const finalValues = { ...values };
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.defaultValue !== undefined && (finalValues[field.name] === undefined || finalValues[field.name] === "")) {
          finalValues[field.name] = field.defaultValue;
        }
      }
    }
    await onSubmit(finalValues);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("w-full max-w-5xl space-y-6 mx-auto", className)}>
      {sections.map((section, sIndex) => {
        const gridCols = {
          1: "grid-cols-1",
          2: "grid-cols-1 md:grid-cols-2",
          3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        }[section.columns || 2];

        return (
          <div
            key={section.id || section.title || sIndex}
            className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 lg:p-7 space-y-5 shadow-2xs"
          >
            {/* Section Header */}
            {(section.title || section.description) && (
              <div className="border-b border-slate-100 pb-3.5">
                {section.title && (
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                    {section.title}
                  </h2>
                )}
                {section.description && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-normal">
                    {section.description}
                  </p>
                )}
              </div>
            )}

            {/* Field Grid */}
            <div className={cn("grid gap-4 sm:gap-5", gridCols)}>
              {section.fields.map((field) => {
                const fieldError = errors[field.name];
                const inputId = `form-field-${field.name}`;
                const val = values[field.name] ?? field.defaultValue ?? "";

                return (
                  <div
                    key={field.name}
                    className={cn(
                      "space-y-1.5 min-w-0",
                      field.colSpan === 2 ? "col-span-1 md:col-span-2" : "",
                      field.colSpan === 3 ? "col-span-1 md:col-span-3" : "",
                      field.colSpan === 4 ? "col-span-full" : ""
                    )}
                  >
                    {/* Label Above Input */}
                    {!field.hideLabel && field.label && (
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
                    )}

                    {/* Inputs */}
                    {field.type === "custom" && field.customRender ? (
                      field.customRender({
                        value: val,
                        onChange: (selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        },
                        values,
                        setFieldValue: handleChange,
                        error: fieldError,
                      })
                    ) : field.type === "state" || field.name === "state" ? (
                      <StateSelect
                        id={inputId}
                        name={field.name}
                        country={values[field.countryFieldName || "country"] ?? DEFAULT_COUNTRY}
                        value={val}
                        placeholder={field.placeholder || `Select ${field.label}`}
                        disabled={field.disabled || loading}
                        error={Boolean(fieldError)}
                        required={field.required}
                        onChange={(selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        }}
                        onBlur={() => handleBlur(field)}
                      />
                    ) : field.type === "country" || (field.name === "country" && field.type === "select") ? (
                      <CountrySelect
                        id={inputId}
                        name={field.name}
                        value={val}
                        placeholder={field.placeholder || `Select ${field.label}`}
                        disabled={field.disabled || loading}
                        error={Boolean(fieldError)}
                        required={field.required}
                        onChange={(selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        }}
                        onBlur={() => handleBlur(field)}
                      />
                    ) : field.type === "select" ? (
                      <SearchableSelect
                        id={inputId}
                        name={field.name}
                        value={val}
                        options={field.options || []}
                        placeholder={field.placeholder || `Select ${field.label}`}
                        disabled={field.disabled || loading}
                        error={Boolean(fieldError)}
                        required={field.required}
                        onChange={(selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        }}
                        onBlur={() => handleBlur(field)}
                        onAddNew={
                          field.onAddNew
                            ? field.onAddNew
                            : field.addNewHref
                            ? () => {
                                if (field.addNewHref?.startsWith("/")) {
                                  window.location.href = field.addNewHref;
                                } else {
                                  window.open(field.addNewHref, "_blank");
                                }
                              }
                            : undefined
                        }
                        addNewLabel={field.addNewLabel || `+ Add new ${field.label.replace(" *", "")}`}
                        addNewTitle={field.addNewTitle || `Add new ${field.label}`}
                      />
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
                    ) : field.type === "file" ? (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <input
                            id={inputId}
                            type="file"
                            accept={field.accept}
                            disabled={field.disabled || loading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  handleChange(field.name, reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                handleChange(field.name, "");
                              }
                            }}
                            onBlur={() => handleBlur(field)}
                            className="hidden"
                          />
                          <label
                            htmlFor={inputId}
                            className={cn(
                              "flex items-center justify-between w-full h-10 px-3.5 text-xs font-medium rounded-xl border bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-2xs group",
                              field.disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
                              fieldError && "border-rose-400"
                            )}
                          >
                            <span className="truncate max-w-[220px] text-slate-600 font-normal">
                              {val ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  Document Attached
                                </span>
                              ) : (
                                field.placeholder || "Choose document file..."
                              )}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-slate-200 text-slate-700 text-xs font-semibold shrink-0 transition-colors">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>Browse</span>
                            </span>
                          </label>
                        </div>
                        {val && typeof val === "string" && (
                          <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                            <span className="text-emerald-600 font-medium">✓ File ready to save</span>
                            <button
                              type="button"
                              onClick={() => handleChange(field.name, "")}
                              className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        id={inputId}
                        type={field.type || "text"}
                        value={val}
                        disabled={field.disabled || loading}
                        placeholder={field.placeholder}
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby={fieldError ? `error-${field.name}` : undefined}
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
                      <p
                        id={`error-${field.name}`}
                        role="alert"
                        className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5 animate-in fade-in"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{fieldError}</span>
                      </p>
                    )}

                    {/* Inline Helper / Address Preview */}
                    {field.helperText && !fieldError && (
                      <p className="text-[11px] text-slate-500 font-normal pt-0.5 leading-tight">
                        {field.helperText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {section.customContent && (
              <div className="pt-1">
                {section.customContent}
              </div>
            )}
          </div>
        );
      })}

      {/* Visible Error Summary Banner on failed submission */}
      {errorList.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-50/95 border border-rose-300 rounded-2xl p-4 sm:p-5 text-rose-900 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please resolve {errorList.length} required field{errorList.length === 1 ? "" : "s"} before saving:</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-rose-700 font-medium pl-1">
            {errorList.map((err) => (
              <li key={err.name} className="flex items-center gap-1.5">
                <span className="text-rose-400">•</span>
                <button
                  type="button"
                  onClick={() => scrollToField(err.id, err.name)}
                  className="underline hover:text-rose-950 font-semibold cursor-pointer text-left"
                >
                  {err.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form Action Footer - Permanently positioned at the very end/last of all sections */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex items-center justify-end gap-3 shadow-2xs mt-8">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={loading}
          disabled={loading || submitDisabled}
          className="rounded-xl h-10 px-6 text-xs font-semibold shadow-xs cursor-pointer"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
