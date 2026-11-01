import React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-slate-200/80 dark:border-[#303036] bg-white dark:bg-[#17171B] shadow-card transition-all duration-150 hover:border-slate-300 dark:hover:border-[#42424A]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-5 border-b border-slate-100 dark:border-[#303036]", className)} {...props} />;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function CardTitle({ className, as: Component = "h2", ...props }: CardTitleProps) {
  const Tag = Component;
  return (
    <Tag
      className={cn("text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-white", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-normal", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-5 pt-4 border-t border-slate-100 dark:border-[#303036] mt-2", className)}
      {...props}
    />
  );
}
