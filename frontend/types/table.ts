import React from "react";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef<T> {
  key: string;
  header?: string;
  label?: string; // alias for header
  sortable?: boolean;
  align?: "left" | "center" | "right";
  isNumeric?: boolean; // Uses tabular-nums formatting
  width?: string;
  cell?: (row: T, index: number) => React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode; // alias for cell
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
  danger?: boolean; // alias for variant="danger"
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export type TableDensity = "comfortable" | "compact";
