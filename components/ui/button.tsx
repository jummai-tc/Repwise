import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "rounded-[var(--radius-control)] transition-colors duration-150 select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "border border-border bg-surface text-foreground shadow-[var(--shadow-xs)] hover:bg-surface-hover hover:border-border-strong active:bg-surface-muted",
        soft: "bg-primary-soft text-primary hover:bg-primary-soft-strong active:bg-primary-soft-strong",
        ghost:
          "text-muted hover:bg-surface-hover hover:text-foreground active:bg-surface-muted",
        outline:
          "border border-primary text-primary hover:bg-primary-soft active:bg-primary-soft-strong",
        danger:
          "bg-danger text-background shadow-[var(--shadow-xs)] hover:brightness-110 active:brightness-95",
      },
      size: {
        sm: "h-9 px-3.5 text-[0.8125rem] [&_svg]:size-4",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[0.9375rem] [&_svg]:size-[18px]",
        icon: "size-10 [&_svg]:size-[18px]",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
