import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const POINTS = [
  "A training plan built around your body and your equipment",
  "Calorie and macro targets calculated from your real numbers",
  "Log every set, meal and weigh-in in one place",
  "An AI coach that has actually seen your data",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* -------------------------------------------- brand panel (lg+) -- */}
      <aside className="panel-hero relative hidden w-[46%] max-w-2xl flex-col justify-between rounded-none border-y-0 border-l-0 p-12 lg:flex">
        <Link href="/" className="relative z-10">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
              <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
                <path
                  d="M4 9v6M20 9v6M7 7v10M17 7v10M10 12h4"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="font-display text-[1.0625rem] font-bold tracking-[-0.02em]">
              Repwise
            </span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-[2.25rem] leading-[1.15] font-bold tracking-[-0.028em]">
            Train smarter,
            <br />
            every rep.
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted">
            Everything you need to train and eat well, in one place — and a plan
            that adapts as you go.
          </p>

          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-[0.9375rem] text-muted">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[0.8125rem] text-subtle">
          Repwise gives general fitness guidance, not medical advice.
        </p>
      </aside>

      {/* -------------------------------------------------------- form -- */}
      <div className="flex flex-1 flex-col px-5 py-8 sm:px-8">
        <Link href="/" className="lg:hidden">
          <Logo />
        </Link>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
