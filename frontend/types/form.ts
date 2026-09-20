import React from "react";

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface FormFieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "password" | "select" | "textarea" | "checkbox" | "date";
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[]; // for select
  disabled?: boolean;
  disabledReason?: string; // Tooltip explaining why disabled per design.md §3
  helperText?: string;
  defaultValue?: any;
  colSpan?: 1 | 2 | 3 | 4;
}

export interface FormSectionDef {
  id?: string;
  title: string;
  description?: string;
  fields: FormFieldDef[];
  columns?: 1 | 2 | 3 | 4;
}
