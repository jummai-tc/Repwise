import { cn } from "@/lib/utils";

/** Repwise wordmark: a rep-counter glyph plus the name. */
export function Logo({
  className,
  showText = true,
  tone = "default",
}: {
  className?: string;
  showText?: boolean;
  /** `inverted` is for dark surfaces, where the charcoal wordmark disappears. */
  tone?: "default" | "inverted";
}) {
  const inverted = tone === "inverted";

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-[10px]",
          inverted ? "bg-white/15 ring-1 ring-white/25 backdrop-blur-md" : "bg-primary",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
          <path
            d="M4 9v6M20 9v6M7 7v10M17 7v10M10 12h4"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {showText && (
        <span
          className={cn(
            "font-display text-[1.0625rem] font-bold tracking-[-0.02em]",
            inverted ? "text-white" : "text-foreground",
          )}
        >
          {/* "Rep" carries the mint, "wise" stays neutral. Kept as two spans
              inside one text node so the word is still selected, copied and
              read aloud as "Repwise". On the hero the lighter mint holds up
              over photography, where full-strength --primary goes muddy. */}
          <span className={inverted ? "text-primary-light" : "text-primary"}>
            Rep
          </span>
          wise
        </span>
      )}
    </span>
  );
}
