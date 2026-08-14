"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, SECONDARY_NAV, isActivePath } from "./nav-config";
import { cn } from "@/lib/utils";

/**
 * The only navigation in the app: a tab bar pinned to the bottom at every
 * breakpoint, so the desktop experience is the same shape as the phone one.
 * On wide screens it floats as a centred pill rather than spanning the page.
 */
export function BottomNav() {
  const pathname = usePathname();
  const tabs = [...NAV, ...SECONDARY_NAV];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 pb-safe sm:bottom-2 sm:pb-0"
    >
      <div
        className={cn(
          "mx-auto flex max-w-lg items-stretch gap-0.5 border-t border-border bg-surface/95 px-1.5 backdrop-blur-lg",
          // Detaches into a floating pill once there is room around it.
          "sm:rounded-full sm:border sm:px-2 sm:py-1.5 sm:shadow-[var(--shadow-lg)]",
        )}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // 56px min height keeps every tab a comfortable touch target.
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[0.625rem] font-medium transition-colors sm:min-h-12 sm:rounded-full sm:px-3",
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
                  : "text-muted hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Icon className="size-[22px] sm:size-5" strokeWidth={active ? 2.3 : 1.9} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
