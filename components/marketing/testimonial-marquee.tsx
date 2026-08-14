import { Quote } from "lucide-react";
import { TESTIMONIALS, type Testimonial } from "@/lib/marketing/testimonials";
import { cn } from "@/lib/utils";

/**
 * Two parallel rows of testimonials travelling right-to-left.
 *
 * Both rows move the same direction, at different speeds, with the second row
 * offset by half the roster so the two never show the same card side by side.
 *
 * There are no photographs here on purpose: pairing a stock portrait of a real
 * person with an invented quote attributes words to someone who never said
 * them. Monograms carry the same visual rhythm and claim nothing. If real
 * testimonials replace these, real photos can come with them.
 *
 * Server component — the animation is pure CSS, so none of this needs to ship
 * as client JavaScript.
 */

const HALF = Math.ceil(TESTIMONIALS.length / 2);
const ROW_ONE = TESTIMONIALS.slice(0, HALF);
const ROW_TWO = TESTIMONIALS.slice(HALF);

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="card mx-3 flex w-[19rem] shrink-0 flex-col p-6 sm:w-[22rem]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          {t.result}
        </span>
        <Quote aria-hidden className="size-4 shrink-0 text-border-strong" />
      </div>

      <blockquote className="flex-1 text-[0.9375rem] leading-relaxed text-foreground">
        {t.quote}
      </blockquote>

      <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted font-display text-xs font-semibold text-muted"
        >
          {t.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[0.875rem] font-semibold">
            {t.name}
          </span>
          <span className="text-caption block truncate">{t.meta}</span>
        </span>
        <span className="text-caption ml-auto shrink-0 whitespace-nowrap">
          {t.duration}
        </span>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({
  items,
  duration,
  className,
}: {
  items: Testimonial[];
  /** Seconds for one full pass. Longer row, longer duration, same felt speed. */
  duration: number;
  className?: string;
}) {
  return (
    <div className={cn("marquee", className)}>
      <div
        className="marquee__track"
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {/* The second copy is what makes the loop seamless. It is duplicate
            content, so it is hidden from screen readers — they read the first
            copy once, in order, like a normal list. */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1 || undefined}>
            {items.map((t) => (
              <TestimonialCard key={`${copy}-${t.id}`} t={t} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TestimonialMarquee() {
  return (
    <div className="flex flex-col gap-5">
      <MarqueeRow items={ROW_ONE} duration={64} />
      <MarqueeRow items={ROW_TWO} duration={78} />
    </div>
  );
}
