import Link from "next/link";
import Image from "next/image";
import {
  Apple,
  ArrowRight,
  Check,
  Flame,
  Home,
  LineChart,
  Sparkles,
  Timer,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { SiteHeader } from "@/components/marketing/site-header";
import { TestimonialMarquee } from "@/components/marketing/testimonial-marquee";
import { GlassmorphismTrustHero } from "@/components/ui/glassmorphism-trust-hero";

const FEATURES = [
  {
    icon: Sparkles,
    title: "A plan built for your body",
    body: "Your height, weight, goal and experience go in. A structured training week comes out — not a template with your name on it.",
  },
  {
    icon: Home,
    title: "Home or gym, your call",
    body: "Training in a spare room with two dumbbells? Say so, and every exercise you get is one you can actually do today.",
  },
  {
    icon: Apple,
    title: "Nutrition that adds up",
    body: "Calorie and macro targets calculated from your real numbers, plus meals that respect your diet and allergies.",
  },
  {
    icon: Timer,
    title: "Log it while you lift",
    body: "A full-screen session player with set logging, automatic rest timers and form cues — built for one thumb.",
  },
  {
    icon: LineChart,
    title: "See it working",
    body: "Weight trends, training volume and personal records charted over time, so progress is something you can point at.",
  },
  {
    icon: Flame,
    title: "Keep the streak alive",
    body: "Daily streaks, achievements and a consistency grid. The unglamorous truth is that showing up is most of it.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Tell us about you",
    body: "Six short steps: your details, your body, your experience, your goal, where you train and how you eat.",
  },
  {
    n: "02",
    title: "Get your plan",
    body: "Repwise builds a full training week and matching nutrition targets, and explains the reasoning behind both.",
  },
  {
    n: "03",
    title: "Train, log, adapt",
    body: "Follow the plan and log your sets. Each week it reviews what you actually did and suggests what to change.",
  },
];

/** Product facts, not social proof — every number here is something Repwise does. */
const PROOF = [
  { value: 6, suffix: "", label: "Onboarding questions", sub: "About two minutes, start to finish" },
  { value: 40, suffix: "+", label: "Exercises in the library", sub: "Barbell, dumbbell, machine and bodyweight" },
  { value: 3, suffix: "", label: "Macro targets", sub: "Protein, carbs and fat, calculated from your stats" },
  { value: 7, suffix: " days", label: "Of training planned", sub: "A full week, rest days included" },
];

const WEEK_ONE = [
  "A training week matched to your equipment and experience",
  "Calorie and macro targets built from your own body stats",
  "Rest timers and form cues inside every logged session",
  "Your first weight, volume and streak data plotted",
];

export default function LandingPage() {
  return (
    <div className="bg-surface">
      <SiteHeader />

      {/* ------------------------------------------------------- hero -- */}
      <GlassmorphismTrustHero />

      {/* ------------------------------------------------------ proof -- */}
      <section id="proof" className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PROOF.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 90} from="up">
                <div className="border-l-2 border-primary/25 pl-5">
                  <p className="text-stat-lg text-primary">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-2 font-display text-[0.9375rem] font-semibold">
                    {stat.label}
                  </p>
                  <p className="text-caption mt-1">{stat.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- features -- */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-[2rem] font-bold tracking-[-0.026em] lg:text-[2.5rem]">
                Everything in one place
              </h2>
              <p className="mt-4 text-muted">
                Most people stop tracking because it lives across four different
                apps. Repwise keeps training, food and progress on one screen.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={(i % 3) * 110} from="up" className="h-full">
                <div className="card card-interactive group h-full p-6">
                  <span className="mb-5 flex size-11 items-center justify-center rounded-[12px] bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-section-title">{title}</h3>
                  <p className="text-caption mt-2 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- week one -- */}
      <section className="border-b border-border overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
          <Reveal from="left">
            <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-panel)] border border-border shadow-[var(--shadow-lg)]">
              <Image
                src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200"
                alt="An athlete performing a barbell curl in a gym"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07110c]/70 via-transparent to-transparent"
              />
              <div className="absolute bottom-5 left-5 flex items-center gap-2.5 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-light opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary-mid" />
                </span>
                <span className="text-xs font-medium text-white">
                  Week 1 · Upper Body A
                </span>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal from="right">
              <h2 className="font-display text-[2rem] font-bold tracking-[-0.026em] lg:text-[2.5rem]">
                What your first week
                <br />
                <span className="text-primary">actually looks like</span>
              </h2>
              <p className="mt-4 text-muted">
                No blank dashboard to fill in yourself. You finish onboarding
                with a plan already written and today&apos;s session ready to
                start.
              </p>
            </Reveal>

            <ul className="mt-8 space-y-3">
              {WEEK_ONE.map((item, i) => (
                <Reveal key={item} delay={140 + i * 90} from="right">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                    <span className="text-[0.9375rem] leading-relaxed">{item}</span>
                  </li>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={520} from="right">
              <Link href="/sign-up" className="mt-8 inline-block">
                <Button size="lg">
                  Build my plan — free <ArrowRight />
                </Button>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- how it works -- */}
      <section id="how" className="border-b border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-[2rem] font-bold tracking-[-0.026em] lg:text-[2.5rem]">
                How it works
              </h2>
              <p className="mt-4 text-muted">
                From sign-up to your first session in about two minutes.
              </p>
            </div>
          </Reveal>

          <ol className="relative grid gap-4 md:grid-cols-3 lg:gap-6">
            {/* The line that visually threads the three steps together. */}
            <span
              aria-hidden
              className="absolute top-14 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-primary/0 via-primary/35 to-primary/0 md:block"
            />
            {STEPS.map(({ n, title, body }, i) => (
              <Reveal key={n} delay={i * 140} from="scale" className="h-full">
                <li className="card relative h-full p-6">
                  <span className="font-display text-[2rem] font-bold tracking-tight text-primary tabular">
                    {n}
                  </span>
                  <h3 className="text-section-title mt-4">{title}</h3>
                  <p className="text-caption mt-2 leading-relaxed">{body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------------------------------- stories -- */}
      {/* Placeholder quotes — see the header of lib/marketing/testimonials.ts
          before this section goes anywhere near production. */}
      <section id="stories" className="border-b border-border bg-background">
        <div className="py-16 lg:py-24">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl px-5 text-center sm:px-8">
              <h2 className="font-display text-[2rem] font-bold tracking-[-0.026em] lg:text-[2.5rem]">
                What changed for them
              </h2>
              <p className="mt-4 text-muted">
                Different bodies, different equipment, different goals. The
                common thread is that they kept logging.
              </p>
            </div>
          </Reveal>

          <Reveal from="scale">
            <TestimonialMarquee />
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- cta -- */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal from="scale">
            <div className="panel-hero px-6 py-14 text-center sm:px-12">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/10 blur-3xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-info/10 blur-3xl"
              />
              <div className="relative z-10">
                <h2 className="font-display text-[2rem] font-bold tracking-[-0.026em] lg:text-[2.5rem]">
                  Your first plan is two minutes away
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-muted">
                  Answer six short questions and Repwise writes your training
                  week and your nutrition targets before you close the tab.
                </p>
                <Link href="/sign-up" className="mt-8 inline-block">
                  <Button size="lg" className="glow">
                    Get started <ArrowRight />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------- footer -- */}
      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p className="max-w-md text-[0.8125rem] leading-relaxed text-subtle">
            Repwise offers general fitness and nutrition guidance and is not
            medical advice. Talk to a doctor or registered dietitian before
            starting a new programme, especially if you have an existing health
            condition.
          </p>
        </div>
      </footer>
    </div>
  );
}
