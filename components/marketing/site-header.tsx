"use client";

import * as React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#proof", label: "Results" },
  { href: "#stories", label: "Stories" },
];

/**
 * Landing-page header.
 *
 * The hero below is a dark band, so at the top of the page the bar is
 * transparent and inverted. Once it scrolls off the hero it solidifies into
 * the usual white app bar.
 */
export function SiteHeader() {
  const [solid, setSolid] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setSolid(window.scrollY > 72);
        const scrollable = document.body.scrollHeight - window.innerHeight;
        setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        solid
          ? "border-b border-border bg-surface/90 backdrop-blur-lg"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[var(--topbar-height)] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Repwisely home">
          <Logo tone={solid ? "default" : "inverted"} />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                solid
                  ? "text-muted hover:text-foreground"
                  : "text-white/70 hover:text-white",
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                !solid && "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              Sign in
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button
              size="sm"
              className={cn(
                !solid && "bg-white text-[#0c4b2d] hover:bg-white/90 active:bg-white/80",
              )}
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>

      {/* Reading progress — only meaningful once the bar is solid. */}
      <div
        aria-hidden
        className={cn(
          "h-0.5 origin-left bg-primary transition-opacity duration-300",
          solid ? "opacity-100" : "opacity-0",
        )}
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </header>
  );
}
