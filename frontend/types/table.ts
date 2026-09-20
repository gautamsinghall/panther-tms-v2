import React from "react";

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  isNumeric?: boolean; // Uses tabular-nums formatting
  width?: string;
  cell?: (row: T, index: number) => React.ReactNode;
}

export interface RowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export type TableDensity = "comfortable" | "compact";
