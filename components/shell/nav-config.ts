import {
  Dumbbell,
  House,
  Salad,
  Settings,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Primary destinations, in tab-bar order. */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Today", icon: House },
  { href: "/train", label: "Training", icon: Dumbbell },
  { href: "/fuel", label: "Nutrition", icon: Salad },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Sparkles },
];

/** Trailing tab, also reachable from the avatar menu. */
export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "Profile", icon: Settings },
];

/** Shown in the top header. */
export const PAGE_TITLES: { match: string; title: string }[] = [
  { match: "/dashboard", title: "Your Fitness Today" },
  { match: "/train", title: "Today's Training" },
  { match: "/fuel", title: "Nutrition" },
  { match: "/progress", title: "Your Progress" },
  { match: "/coach", title: "Your AI Coach" },
  { match: "/settings", title: "Your Profile" },
];

export function titleForPath(pathname: string) {
  const hit = PAGE_TITLES.find(
    (p) => pathname === p.match || pathname.startsWith(`${p.match}/`),
  );
  return hit?.title ?? "Repwisely";
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
