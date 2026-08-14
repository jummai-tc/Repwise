import { BottomNav } from "@/components/shell/bottom-nav";
import { Topbar } from "@/components/shell/topbar";
import { getRecentActivity } from "@/lib/data/activity";
import { getProfile } from "@/lib/data/user";
import { GOAL_OPTIONS } from "@/lib/constants/fitness";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, notifications] = await Promise.all([
    getProfile(),
    getRecentActivity(),
  ]);

  const goalLabel = GOAL_OPTIONS.find(
    (g) => g.value === profile?.primary_goal,
  )?.label;

  const subtitle = [
    goalLabel,
    profile?.days_per_week ? `${profile.days_per_week} days a week` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-dvh bg-background">
      <Topbar
        fullName={profile?.full_name ?? profile?.email ?? "Your account"}
        subtitle={subtitle || "Finish your profile to personalise your plan"}
        notifications={notifications}
      />

      {/* The tab bar is fixed at every breakpoint, so every page needs
          bottom clearance for it. */}
      <main className="mx-auto w-full max-w-[var(--content-max)] px-4 pt-6 pb-32 sm:px-6 lg:px-8 lg:pt-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
