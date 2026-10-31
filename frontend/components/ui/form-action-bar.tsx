import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FormActionItem {
  label: string;
  variant?: string;
  type?: string;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface FormActionBarProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  submitForm?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  summary?: React.ReactNode;
  className?: string;
  actions?: FormActionItem[];
}

export function FormActionBar({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel = "Save Changes",
  submitForm,
  isSubmitting = false,
  submitDisabled = false,
  summary,
  className,
  actions,
}: FormActionBarProps) {
  if (actions && actions.length > 0) {
    return (
      <div
        className={cn(
          "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <div className="flex flex-wrap shrink-0 items-center justify-end gap-2.5 sm:gap-3">
          {actions.map((act, i) => (
            <Button
              key={i}
              type={(act.type as "button" | "submit" | "reset") || "button"}
              variant={(act.variant as any) || "outline"}
              onClick={act.onClick}
              isLoading={act.isLoading}
              disabled={act.disabled || act.isLoading}
            >
              {act.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">{summary}</div>
      <div className="flex flex-wrap shrink-0 items-center justify-end gap-2.5 sm:gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          form={submitForm}
          isLoading={isSubmitting}
          disabled={isSubmitting || submitDisabled}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
