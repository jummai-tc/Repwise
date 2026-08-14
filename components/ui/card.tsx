import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Standard surface. Padding is consistent everywhere: 20px on mobile,
 * 24px from `lg` up. Pass `interactive` for cards that behave as links.
 */
export function Card({
  className,
  interactive = false,
  padded = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "card",
        padded && "p-5 lg:p-6",
        interactive && "card-interactive",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-5 flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-card-title", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-caption", className)} {...props} />;
}
