"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bike,
  Crown,
  Dumbbell,
  Flame,
  HeartPulse,
  Mountain,
  Play,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp, usePrefersReducedMotion } from "@/components/ui/count-up";

/* ==========================================================================
   Glassmorphism trust hero — Repwise edition
   A dark, cinematic band that opens the light-themed landing page. The photo
   carries the drama; frosted panels sit on top of it holding real product
   numbers. Everything below this section returns to the yellow canvas.
   ========================================================================== */

/** The disciplines strip. Icons stand in for the training styles Repwise plans. */
const DISCIPLINES = [
  { name: "Strength", icon: Dumbbell },
  { name: "Hypertrophy", icon: Trophy },
  { name: "Conditioning", icon: HeartPulse },
  { name: "Powerlifting", icon: Zap },
  { name: "Endurance", icon: Bike },
  { name: "Mobility", icon: Activity },
  { name: "Hyrox", icon: Mountain },
  { name: "Home Training", icon: Timer },
] as const;

/* --------------------------------------------------------------- motion -- */

/** Subtle pointer parallax. Returns a ref to attach to the moving layer. */
function usePointerParallax(strength = 14) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const node = ref.current;
    if (!node || reduced) return;
    // Pointer parallax is a mouse affordance; skip it on touch entirely.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;

    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        node.style.transform = `translate3d(${(-x * strength).toFixed(2)}px, ${(
          -y * strength * 0.6
        ).toFixed(2)}px, 0) scale(1.06)`;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, [strength, reduced]);

  return ref;
}

/* ----------------------------------------------------------- primitives -- */

/** One entrance-animated block. `delay` staggers it behind the ones above. */
function Rise({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rw-rise", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex cursor-default flex-col items-center justify-center transition-transform duration-200 hover:-translate-y-0.5">
      <span className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
        {value}
      </span>
      <span className="mt-0.5 text-[10px] font-medium tracking-wider text-white/45 uppercase sm:text-[11px]">
        {label}
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- hero -- */

export function GlassmorphismTrustHero() {
  const parallaxRef = usePointerParallax();

  // The satisfaction bar animates from 0 to its value once mounted.
  const [barFilled, setBarFilled] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setBarFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#07110c] text-white">
      {/* Scoped keyframes. Class names are `rw-` prefixed so they can never
          collide with Tailwind's own animation and delay utilities. */}
      <style>{`
        @keyframes rwRise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rwMarquee {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes rwFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(0, -26px, 0) scale(1.08); }
        }
        @keyframes rwSheen {
          from { transform: translateX(-120%) skewX(-18deg); }
          to   { transform: translateX(320%) skewX(-18deg); }
        }
        .rw-rise {
          opacity: 0;
          animation: rwRise 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .rw-marquee { animation: rwMarquee 38s linear infinite; }
        .rw-marquee-track:hover .rw-marquee { animation-play-state: paused; }
        .rw-float { animation: rwFloat 14s ease-in-out infinite; }
        .rw-sheen::after {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 36%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          animation: rwSheen 3.6s ease-in-out infinite;
          animation-delay: 1.4s;
        }
      `}</style>

      {/* ---------------------------------------------------- backdrop -- */}

      {/* The athlete. Masked on the left so the headline always sits on a
          near-solid field, and at the bottom so the band melts into the page. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-full lg:w-[68%]">
        <div
          ref={parallaxRef}
          className="absolute inset-0 scale-[1.06] transition-transform duration-500 ease-out will-change-transform"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.28) 14%, black 42%), linear-gradient(to bottom, black 68%, transparent 98%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.28) 14%, black 42%), linear-gradient(to bottom, black 68%, transparent 98%)",
            maskComposite: "intersect",
            WebkitMaskComposite: "source-in",
          }}
        >
          <Image
            src="https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1600"
            alt=""
            aria-hidden
            fill
            sizes="(max-width: 1024px) 100vw, 68vw"
            loading="eager"
            fetchPriority="high"
            className="object-cover object-[50%_16%] opacity-[0.85]"
          />
        </div>
      </div>

      {/* Green wash + vignette that tie the photo back to the brand. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(7,17,12,0.75) 0%, rgba(7,17,12,0.15) 12%, transparent 30%), linear-gradient(to right, #07110c 0%, rgba(7,17,12,0.94) 26%, rgba(7,17,12,0.55) 46%, rgba(7,17,12,0.12) 72%, rgba(7,17,12,0.35) 100%), radial-gradient(55% 55% at 78% 6%, rgba(47,158,106,0.22), transparent 72%), linear-gradient(to bottom, transparent 48%, rgba(7,17,12,0.80) 84%, #07110c 97%)",
        }}
      />

      {/* Floating brand orbs. */}
      <div
        aria-hidden
        className="rw-float pointer-events-none absolute -top-24 left-[8%] z-0 size-[26rem] rounded-full bg-[#14764a]/25 blur-[110px]"
      />
      <div
        aria-hidden
        className="rw-float pointer-events-none absolute right-[10%] bottom-[18%] z-0 size-[18rem] rounded-full bg-[#f9e08a]/8 blur-[130px]"
        style={{ animationDelay: "-7s" }}
      />

      {/* ----------------------------------------------------- content -- */}

      <div className="relative z-10 mx-auto max-w-6xl px-5 pt-[calc(var(--topbar-height)+2.5rem)] pb-20 sm:px-8 lg:pt-[calc(var(--topbar-height)+4.5rem)] lg:pb-28">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-10">
          {/* ------------------------------------------------ left -- */}
          <div className="flex flex-col justify-center space-y-7 lg:col-span-7 lg:pt-6">
            <Rise delay={80}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md transition-colors hover:bg-white/15">
                <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-white/85 uppercase sm:text-xs">
                  Personalised training &amp; nutrition
                  <Star className="size-3.5 fill-[#f9e08a] text-[#f9e08a]" />
                </span>
              </span>
            </Rise>

            <Rise delay={180}>
              <h1 className="font-display text-[2.75rem] leading-[0.95] font-bold tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
                Train smarter,
                <br />
                <span className="bg-gradient-to-br from-white via-[#d8f3e5] to-[#f9e08a] bg-clip-text text-transparent">
                  every rep.
                </span>
              </h1>
            </Rise>

            <Rise delay={280}>
              <p className="max-w-xl text-base leading-relaxed text-white/65 lg:text-[1.0625rem]">
                Repwise turns your body stats, your goal and your equipment into
                a training plan and a nutrition plan that fit your actual life —
                then adapts them as you train.
              </p>
            </Rise>

            <Rise delay={380}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="rw-sheen group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-control)] bg-white px-7 text-[0.9375rem] font-semibold text-[#0c4b2d] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Build my plan — free
                    <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>

                <a
                  href="#how"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/15 bg-white/10 px-7 text-[0.9375rem] font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:border-white/30 hover:bg-white/15"
                >
                  <Play className="size-4 fill-current transition-transform duration-200 group-hover:scale-110" />
                  See how it works
                </a>
              </div>
            </Rise>

            <Rise delay={470}>
              <dl className="flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">
                {[
                  { value: 2, suffix: " min", label: "To your first plan" },
                  { value: 40, suffix: "+", label: "Exercises library" },
                  { value: 0, prefix: "£", label: "To get started" },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="font-display text-2xl font-bold tracking-tight text-white">
                      <CountUp
                        value={item.value}
                        prefix={item.prefix}
                        suffix={item.suffix}
                      />
                    </dt>
                    <dd className="mt-0.5 text-[11px] font-medium tracking-wider text-white/45 uppercase">
                      {item.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </Rise>
          </div>

          {/* ----------------------------------------------- right -- */}
          <div className="space-y-5 lg:col-span-5 lg:mt-8">
            {/* --- live session card --- */}
            <Rise delay={560}>
              <div className="relative overflow-hidden rounded-[var(--radius-panel)] border border-white/12 bg-white/8 p-6 shadow-2xl backdrop-blur-2xl sm:p-7">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-[#2f9e6a]/20 blur-3xl"
                />

                <div className="relative z-10">
                  <div className="mb-7 flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
                      <Flame className="size-6 text-[#f9e08a]" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-3xl font-bold tracking-tight text-white">
                        <CountUp value={12} suffix=" days" />
                      </div>
                      <div className="text-sm text-white/55">Current streak</div>
                    </div>
                  </div>

                  {/* Weekly plan completion */}
                  <div className="mb-7 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/55">This week&apos;s plan</span>
                      <span className="font-medium text-white tabular">4 / 5</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2f9e6a] via-[#7cc5a0] to-[#f9e08a] transition-[width] duration-[1600ms] ease-out"
                        style={{ width: barFilled ? "80%" : "0%" }}
                      />
                    </div>
                  </div>

                  <div className="mb-6 h-px w-full bg-white/10" />

                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center">
                    <MiniStat value="18.4k" label="Volume kg" />
                    <span aria-hidden className="h-9 w-px bg-white/10" />
                    <MiniStat value="1,610" label="Calories" />
                    <span aria-hidden className="h-9 w-px bg-white/10" />
                    <MiniStat value="113g" label="Protein" />
                  </div>

                  <div className="mt-7 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-medium tracking-wide text-white/75">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7cc5a0] opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-[#2f9e6a]" />
                      </span>
                      UPPER BODY A · TODAY
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[10px] font-medium tracking-wide text-white/75">
                      <Crown className="size-3 text-[#f9e08a]" />
                      ADAPTIVE PLAN
                    </span>
                  </div>
                </div>
              </div>
            </Rise>

            {/* --- disciplines marquee --- */}
            <Rise delay={660}>
              <div className="rw-marquee-track relative overflow-hidden rounded-[var(--radius-panel)] border border-white/12 bg-white/8 py-6 backdrop-blur-2xl">
                <h2 className="mb-5 flex items-center gap-2 px-6 text-sm font-medium text-white/55">
                  <TrendingUp className="size-4" />
                  Built for every way you train
                </h2>

                <div
                  className="relative flex overflow-hidden"
                  style={{
                    maskImage:
                      "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
                  }}
                >
                  {/* Two identical halves, shifted by exactly 50% — that is what
                      makes the loop seamless rather than jumping. */}
                  <div className="rw-marquee flex w-max">
                    {[0, 1].map((half) => (
                      <div
                        key={half}
                        aria-hidden={half === 1}
                        className="flex shrink-0 items-center gap-10 pr-10 pl-6"
                      >
                        {DISCIPLINES.map(({ name, icon: Icon }) => (
                          <span
                            key={name}
                            className="flex cursor-default items-center gap-2 whitespace-nowrap text-white/50 transition-all duration-200 hover:scale-105 hover:text-white"
                          >
                            <Icon className="size-5" />
                            <span className="font-display text-base font-bold tracking-tight">
                              {name}
                            </span>
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Rise>
          </div>
        </div>
      </div>

      {/* Soft hand-off into the yellow canvas below. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-b from-transparent to-[var(--background)]"
      />
    </section>
  );
}

export default GlassmorphismTrustHero;
