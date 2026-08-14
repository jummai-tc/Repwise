import * as React from "react";
import { cn } from "@/lib/utils";

const field = [
  "w-full rounded-[var(--radius-control)] border border-border bg-surface",
  "text-[0.9375rem] text-foreground placeholder:text-subtle",
  "transition-colors duration-150",
  "hover:border-border-strong",
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20",
].join(" ");

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn(field, "h-11 px-3.5", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(field, "min-h-24 resize-y px-3.5 py-2.5", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(field, "h-11 appearance-none px-3.5", className)} {...props} />
));
Select.displayName = "Select";
