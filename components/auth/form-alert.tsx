import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  error: {
    Icon: AlertCircle,
    className: "border-danger/20 bg-danger-soft text-danger",
  },
  success: {
    Icon: CheckCircle2,
    className: "border-primary/20 bg-success-soft text-success",
  },
  info: {
    Icon: Info,
    className: "border-info/20 bg-info-soft text-info",
  },
} as const;

export function FormAlert({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
}) {
  const { Icon, className } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-5 flex gap-3 rounded-[var(--radius-control)] border p-4 text-[0.8125rem] leading-relaxed",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
