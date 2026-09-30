import React from "react";

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface FormFieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "password" | "select" | "textarea" | "checkbox" | "date" | "file" | "country" | "state" | "custom";
  placeholder?: string;
  required?: boolean;
  options?: FormFieldOption[]; // for select
  countryFieldName?: string; // Optional field name of corresponding country (defaults to 'country')
  disabled?: boolean;
  disabledReason?: string; // Tooltip explaining why disabled per design.md §3
  helperText?: string;
  defaultValue?: any;
  colSpan?: 1 | 2 | 3 | 4;
  onChange?: (value: any) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  addNewTitle?: string;
  addNewHref?: string;
  accept?: string;
  hideLabel?: boolean;
  customRender?: (props: {
    value: any;
    onChange: (value: any) => void;
    values: Record<string, any>;
    setFieldValue: (name: string, value: any) => void;
    error?: string;
  }) => React.ReactNode;
}

export interface FormSectionDef {
  id?: string;
  title: string;
  description?: string;
  fields: FormFieldDef[];
  columns?: 1 | 2 | 3 | 4;
  customContent?: React.ReactNode;
}
