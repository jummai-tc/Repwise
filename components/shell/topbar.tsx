"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, Settings } from "lucide-react";
import { titleForPath } from "./nav-config";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import type { ActivityItem } from "@/lib/data/activity";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar({
  fullName,
  subtitle,
  notifications,
}: {
  fullName: string;
  subtitle: string;
  notifications: ActivityItem[];
}) {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  const [openMenu, setOpenMenu] = useState<"none" | "bell" | "avatar">("none");
  const wrapRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  // Close whichever popover is open when clicking away or pressing Escape.
  useEffect(() => {
    if (openMenu === "none") return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenMenu("none");
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenu("none");
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-lg">
      <div className="flex h-[var(--topbar-height)] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="shrink-0">
          <Logo showText={false} />
        </Link>

        <h1 className="min-w-0 flex-1 truncate text-page-title">{title}</h1>

        <div ref={wrapRef} className="flex shrink-0 items-center gap-2">
          <Link href="/train" className="hidden sm:block">
            <Button size="sm">
              <Plus /> Log a Workout
            </Button>
          </Link>

          {/* ----------------------------------------------- notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === "bell" ? "none" : "bell"))}
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              aria-expanded={openMenu === "bell"}
              className="relative flex size-10 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <Bell className="size-[18px]" />
              {unread > 0 && (
                <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>

            {openMenu === "bell" && (
              <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-lg)]">
                <p className="border-b border-border px-4 py-3 text-card-title">
                  Notifications
                </p>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && (
                    <li className="text-caption px-4 py-6 text-center">
                      Nothing yet. Log a session and it shows up here.
                    </li>
                  )}
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={cn(
                        "flex gap-3 border-b border-border px-4 py-3 last:border-0",
                        !n.read && "bg-primary-soft/40",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          n.read ? "bg-border-strong" : "bg-primary",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-medium">
                          {n.title}
                        </span>
                        <span className="text-caption block">{n.body}</span>
                        <span className="mt-0.5 block text-xs text-subtle">
                          {n.when}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------ avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === "avatar" ? "none" : "avatar"))}
              aria-label="Account menu"
              aria-expanded={openMenu === "avatar"}
              className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-[0.8125rem] font-semibold text-primary transition-colors hover:bg-primary-soft-strong"
            >
              {initials(fullName)}
            </button>

            {openMenu === "avatar" && (
              <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-lg)]">
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-[0.9375rem] font-semibold">
                    {fullName}
                  </p>
                  <p className="text-caption truncate">{subtitle}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setOpenMenu("none")}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                >
                  <Settings className="size-4" /> Your Profile
                </Link>
                <form action="/auth/sign-out" method="post" className="border-t border-border">
                  <button
                    type="submit"
                    className="w-full px-4 py-3 text-left text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
