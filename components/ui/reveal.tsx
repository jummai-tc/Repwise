"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  /** Milliseconds to stagger this item behind its neighbours. */
  delay?: number;
  /** Direction the content travels in from. */
  from?: "up" | "left" | "right" | "scale";
  className?: string;
  children: React.ReactNode;
};

const OFFSET: Record<NonNullable<RevealProps["from"]>, string> = {
  up: "translate3d(0, 28px, 0)",
  left: "translate3d(-28px, 0, 0)",
  right: "translate3d(28px, 0, 0)",
  scale: "scale(0.94)",
};

/**
 * Reveals its children the first time they scroll into view.
 *
 * Content is visible by default and only hidden once JS confirms an observer
 * is running, so the page still reads fine without JS. Under
 * `prefers-reduced-motion` the whole effect is skipped.
 */
export function Reveal({ delay = 0, from = "up", className, children }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(true);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setShown(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out", className)}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : OFFSET[from],
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
