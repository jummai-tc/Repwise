import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Heading for a dashboard/page section. Keeps section rhythm identical. */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 ${className ?? ""}`}>
      <div className="min-w-0">
        <h2 className="text-section-title">{title}</h2>
        {description && <p className="text-caption mt-1">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-primary transition-colors hover:text-primary-hover"
        >
          {action.label}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
