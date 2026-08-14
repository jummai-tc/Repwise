export const metadata = { title: "Set up your plan" };

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Deliberately outside the (app) shell — no tab bar or sidebar, so the
  // wizard has the screen to itself.
  return <>{children}</>;
}
