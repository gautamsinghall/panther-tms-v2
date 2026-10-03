import React from "react";
import { cn } from "@/lib/utils";

interface FormFieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FormFieldLabel({
  children,
  required = false,
  className,
  ...props
}: FormFieldLabelProps) {
  return (
    <label
      className={cn("mb-1 block text-xs font-semibold text-slate-700", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-rose-600" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

