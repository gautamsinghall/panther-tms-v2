"use client";

import React, { useState, useEffect } from "react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { FormSectionDef, FormFieldDef } from "@/types/form";
import { AlertCircle, HelpCircle, Upload, CheckCircle2, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StateSelect } from "@/components/ui/state-select";
import { CountrySelect } from "@/components/ui/country-select";
import { PincodeInput } from "@/components/ui/pincode-input";
import { GstinInput } from "@/components/ui/gstin-input";
import { PanInput } from "@/components/ui/pan-input";
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
  onChange?: (values: Record<string, any>) => void;
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
  onChange,
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
      onChange?.(next);
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
    <form onSubmit={handleSubmit} className={cn("w-full max-w-[1440px] space-y-6 mx-auto pb-6", className)}>
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
            className="bg-white dark:bg-[#12131A] rounded-2xl border border-slate-200/90 dark:border-[#22232E] p-4 sm:p-6 lg:p-7 space-y-4 sm:space-y-5 shadow-2xs"
          >
            {/* Section Header */}
            {(section.title || section.description) && (
              <div className="border-b border-slate-100 dark:border-[#22232E] pb-3.5">
                {section.title && (
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {section.title}
                  </h2>
                )}
                {section.description && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
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
                      "space-y-1.5 min-w-0 scroll-mb-6",
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
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight"
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
                    ) : field.type === "gstin" || field.name === "gstin" ? (
                      <GstinInput
                        id={inputId}
                        name={field.name}
                        value={val}
                        placeholder={field.placeholder || "e.g. 27AAACT2727Q1ZW"}
                        disabled={field.disabled || loading}
                        error={Boolean(fieldError)}
                        required={field.required}
                        onChange={(selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        }}
                        onBlur={() => handleBlur(field)}
                        onFetch={(result) => {
                          const allFieldNames = new Set(sections.flatMap((s) => s.fields.map((f) => f.name)));
                          const updates: Record<string, any> = { [field.name]: result.gstin };

                          // Auto-populate PAN
                          for (const pKey of ["pan", "pan_no", "pan_number"]) {
                            if (allFieldNames.has(pKey) && result.pan) {
                              updates[pKey] = result.pan;
                            }
                          }

                          // Auto-populate corporate / legal / trade name
                          if (allFieldNames.has("company_name") && result.legal_name) {
                            updates["company_name"] = result.legal_name;
                          }
                          if (allFieldNames.has("legal_name") && result.legal_name) {
                            updates["legal_name"] = result.legal_name;
                          }
                          if (allFieldNames.has("name") && (result.trade_name || result.legal_name)) {
                            updates["name"] = result.trade_name || result.legal_name;
                          }
                          if (allFieldNames.has("owner_name") && (result.trade_name || result.legal_name)) {
                            updates["owner_name"] = result.trade_name || result.legal_name;
                          }

                          // Incorporation date
                          for (const dKey of ["incorporation_date", "date_of_incorporation"]) {
                            if (allFieldNames.has(dKey) && result.incorporation_date) {
                              updates[dKey] = result.incorporation_date;
                            }
                          }

                          // Legal status
                          if (allFieldNames.has("legal_status") && result.legal_status) {
                            updates["legal_status"] = result.legal_status;
                          }

                          // Address & Location fields
                          if (allFieldNames.has("address") && result.address) {
                            updates["address"] = result.address;
                          }
                          if (allFieldNames.has("city") && result.city) {
                            updates["city"] = result.city;
                          } else if (allFieldNames.has("city_name") && result.city) {
                            updates["city_name"] = result.city;
                          }
                          if (allFieldNames.has("state") && result.state) {
                            updates["state"] = result.state;
                          }
                          if (allFieldNames.has("billing_state") && (result.billing_state || result.state)) {
                            updates["billing_state"] = result.billing_state || result.state;
                          }
                          if (allFieldNames.has("pincode") && result.pincode) {
                            updates["pincode"] = result.pincode;
                          }
                          if (allFieldNames.has("country")) {
                            updates["country"] = result.country || DEFAULT_COUNTRY;
                          }

                          setValues((prev) => ({ ...prev, ...updates }));

                          setErrors((prev) => {
                            const next = { ...prev };
                            Object.keys(updates).forEach((k) => delete next[k]);
                            return next;
                          });
                          setErrorList((prev) => prev.filter((item) => !(item.name in updates)));
                        }}
                      />
                    ) : field.type === "pan" || field.name === "pan" || field.name === "pan_no" || field.name === "pan_number" ? (
                      <PanInput
                        id={inputId}
                        name={field.name}
                        value={val}
                        stateCode={values["pan_state"] || (values["gstin"] ? values["gstin"].substring(0, 2) : "07")}
                        onStateCodeChange={(st) => {
                          const allFieldNames = new Set(sections.flatMap((s) => s.fields.map((f) => f.name)));
                          if (allFieldNames.has("pan_state")) {
                            handleChange("pan_state", st);
                          }
                        }}
                        placeholder={field.placeholder || "e.g. AAACT2727Q"}
                        disabled={field.disabled || loading}
                        error={Boolean(fieldError)}
                        required={field.required}
                        onChange={(selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        }}
                        onBlur={() => handleBlur(field)}
                        onFetch={(result) => {
                          const allFieldNames = new Set(sections.flatMap((s) => s.fields.map((f) => f.name)));
                          const updates: Record<string, any> = { [field.name]: result.pan };

                          if (allFieldNames.has("gstin") && result.gstin) {
                            updates["gstin"] = result.gstin;
                          }
                          if (allFieldNames.has("company_name") && result.legal_name) {
                            updates["company_name"] = result.legal_name;
                          }
                          if (allFieldNames.has("legal_name") && result.legal_name) {
                            updates["legal_name"] = result.legal_name;
                          }
                          if (allFieldNames.has("name") && (result.trade_name || result.legal_name)) {
                            updates["name"] = result.trade_name || result.legal_name;
                          }
                          if (allFieldNames.has("owner_name") && (result.trade_name || result.legal_name)) {
                            updates["owner_name"] = result.trade_name || result.legal_name;
                          }
                          for (const dKey of ["incorporation_date", "date_of_incorporation"]) {
                            if (allFieldNames.has(dKey) && result.incorporation_date) {
                              updates[dKey] = result.incorporation_date;
                            }
                          }
                          if (allFieldNames.has("legal_status") && result.legal_status) {
                            updates["legal_status"] = result.legal_status;
                          }
                          if (allFieldNames.has("address") && result.address) {
                            updates["address"] = result.address;
                          }
                          if (allFieldNames.has("city") && result.city) {
                            updates["city"] = result.city;
                          } else if (allFieldNames.has("city_name") && result.city) {
                            updates["city_name"] = result.city;
                          }
                          if (allFieldNames.has("state") && result.state) {
                            updates["state"] = result.state;
                          }
                          if (allFieldNames.has("billing_state") && (result.billing_state || result.state)) {
                            updates["billing_state"] = result.billing_state || result.state;
                          }
                          if (allFieldNames.has("pincode") && result.pincode) {
                            updates["pincode"] = result.pincode;
                          }
                          if (allFieldNames.has("country")) {
                            updates["country"] = result.country || DEFAULT_COUNTRY;
                          }

                          setValues((prev) => ({ ...prev, ...updates }));

                          setErrors((prev) => {
                            const next = { ...prev };
                            Object.keys(updates).forEach((k) => delete next[k]);
                            return next;
                          });
                          setErrorList((prev) => prev.filter((item) => !(item.name in updates)));
                        }}
                      />
                    ) : field.type === "pincode" || field.name === "pincode" ? (
                      <PincodeInput
                        id={inputId}
                        name={field.name}
                        value={val}
                        placeholder={field.placeholder || "e.g. 496001"}
                        disabled={field.disabled || loading}
                        error={Boolean(fieldError)}
                        required={field.required}
                        onChange={(selectedVal) => {
                          handleChange(field.name, selectedVal);
                          field.onChange?.(selectedVal);
                        }}
                        onBlur={() => handleBlur(field)}
                        onFetch={(result) => {
                          const allFieldNames = new Set(sections.flatMap((s) => s.fields.map((f) => f.name)));
                          const cityKey = field.cityFieldName || (allFieldNames.has("city_name") ? "city_name" : "city");
                          const stateKey = field.stateFieldName || "state";
                          const countryKey = field.countryFieldName || "country";

                          setValues((prev) => ({
                            ...prev,
                            [field.name]: result.pincode,
                            ...(allFieldNames.has(cityKey) ? { [cityKey]: result.city } : {}),
                            ...(allFieldNames.has(stateKey) ? { [stateKey]: result.state } : {}),
                            ...(allFieldNames.has(countryKey) ? { [countryKey]: result.country } : {}),
                          }));

                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next[field.name];
                            delete next[cityKey];
                            delete next[stateKey];
                            delete next[countryKey];
                            return next;
                          });
                          setErrorList((prev) =>
                            prev.filter(
                              (item) =>
                                item.name !== field.name &&
                                item.name !== cityKey &&
                                item.name !== stateKey &&
                                item.name !== countryKey
                            )
                          );
                        }}
                      />
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
                          "w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-xl border bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-y shadow-2xs",
                          field.disabled
                            ? "bg-slate-50 dark:bg-[#151620] text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-[#22232E]"
                            : "border-slate-200 dark:border-[#2B2E42]",
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
                            className="sr-only peer"
                          />
                          <label
                            htmlFor={inputId}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                document.getElementById(inputId)?.click();
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between w-full h-10 px-3.5 text-xs font-medium rounded-xl border bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/20 peer-focus-visible:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-600 transition-all cursor-pointer shadow-2xs group",
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
                        placeholder={field.placeholder || (field.type === "date" ? "YYYY-MM-DD" : undefined)}
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby={fieldError ? `error-${field.name}` : undefined}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        className={cn(
                          "w-full h-10 px-3.5 text-xs sm:text-sm font-medium rounded-xl border bg-white dark:bg-[#0E0F15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs",
                          field.disabled
                            ? "bg-slate-50 dark:bg-[#151620] text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-[#22232E]"
                            : "border-slate-200 dark:border-[#2B2E42]",
                          fieldError && "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        )}
                      />
                    )}

                    {/* Unambiguous Date Confirmation Display */}
                    {field.type === "date" && val && !fieldError && (
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium pt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-400 font-normal">Date:</span>
                        <span className="font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-800/60">{formatDate(val)}</span>
                      </p>
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

      {/* Form Action Footer - Positioned at the very end of the form */}
      <div className="bg-white dark:bg-[#12131A] border border-slate-200/90 dark:border-[#22232E] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs mt-6 sm:mt-8">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Active Form Draft</span>
        </div>
        <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onCancel}
              disabled={loading}
              className="rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer flex-1 sm:flex-initial"
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
            className="rounded-xl h-10 px-6 text-xs font-semibold cursor-pointer flex-1 sm:flex-initial"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
