"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Tracks the user's reduced-motion preference reactively. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Counts from zero up to `value` once the element is on screen.
 *
 * The final number is what renders on the server, so the markup is correct
 * without JS and the layout never reflows when the animation starts.
 */
export function useCountUp(
  value: number,
  { duration = 1400, ref }: { duration?: number; ref?: React.RefObject<HTMLElement | null> } = {},
) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    let start: number | null = null;

    const run = () => {
      const tick = (now: number) => {
        start ??= now;
        const progress = Math.min((now - start) / duration, 1);
        // easeOutExpo: quick off the line, long settle — reads as "counting up".
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setDisplay(Math.round(value * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    const node = ref?.current;
    if (!node) {
      setDisplay(0);
      run();
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDisplay(0);
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration, reduced, ref]);

  return display;
}

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const display = useCountUp(value, { duration, ref });

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {prefix}
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}
