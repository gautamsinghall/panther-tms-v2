import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormActionBarProps {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  submitForm?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  summary?: React.ReactNode;
  className?: string;
}

export function FormActionBar({
  onCancel,
  cancelLabel = "Cancel",
  submitLabel,
  submitForm,
  isSubmitting = false,
  submitDisabled = false,
  summary,
  className,
}: FormActionBarProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1">{summary}</div>
      <div className="flex shrink-0 items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
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

