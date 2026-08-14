"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Large tappable radio card — the main answer control in onboarding. */
export function OptionCard({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-4 rounded-[var(--radius-card)] border p-4 text-left transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected
          ? "border-primary bg-primary-soft shadow-[var(--shadow-xs)]"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span className="text-caption mt-0.5 block">{description}</span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3.5} />}
      </span>
    </button>
  );
}

/** Multi-select chip, for equipment and allergens. */
export function ChoiceChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** Segmented switch for units and short numeric choices. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface-muted p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[8px] px-3 py-2 text-[0.8125rem] font-medium transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "bg-surface text-primary shadow-[var(--shadow-xs)]"
                : "text-muted hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Numeric input with a unit suffix pinned inside the field. */
export function NumberField({
  id,
  value,
  onChange,
  suffix,
  placeholder,
  min,
  max,
  step = 1,
  invalid,
}: {
  id?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={cn(
          "h-11 w-full rounded-[var(--radius-control)] border bg-surface px-3.5 text-[0.9375rem] text-foreground",
          "placeholder:text-subtle transition-colors duration-150",
          "focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]",
          suffix && "pr-12",
          invalid ? "border-danger" : "border-border hover:border-border-strong",
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[0.8125rem] font-medium text-subtle">
          {suffix}
        </span>
      )}
    </div>
  );
}
