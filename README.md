# Repwisely

**Train smarter, every rep.** An AI-powered fitness and nutrition web app: it
turns your body stats, goal and available equipment into a personalised workout
plan and diet plan, then adapts them as you actually train.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres,
Auth, Storage) · Google Gemini · Recharts · Framer Motion

## Running locally

```bash
npm install
npm run build && npm start   # http://localhost:3000  (production build)
npm run dev                  # http://localhost:3000  (hot reload)
```

The app deliberately runs **without credentials** so the interface can be built
and reviewed before any account exists — auth is skipped until a real Supabase
URL is present in the environment.

## Design system

Predominantly **white**, with a **deep green** (`#14764a`) used strategically for
primary actions, active navigation, progress and headings — never as wallpaper.
Body text is dark charcoal (`#1a1d1b`) rather than pure black, and borders are a
light neutral grey (`#e6eae8`).

All tokens live in one place, `app/globals.css`:

| Token group | Notes |
|---|---|
| Colour | `--primary` + hover/active/soft variants, semantic `success`/`warning`/`danger`/`info`, macro colours |
| Elevation | `--shadow-xs` → `--shadow-lg`. Subtle borders + soft shadows; no glass or glow |
| Radius | Two-step scale: `--radius-control` (12px) for buttons/inputs/chips, `--radius-card` (16px) for cards, `--radius-panel` (20px) for sheets |
| Typography | Plus Jakarta Sans for headings and stats, Inter for body. Scale classes: `.text-page-title`, `.text-section-title`, `.text-card-title`, `.text-stat`, `.text-stat-lg`, `.text-caption`, `.text-label` |
| Layout | `--sidebar-width`, `--content-max`, `--topbar-height` |

> **Tailwind v4 note:** reference CSS variables as `rounded-[var(--radius-card)]`.
> The v3 shorthand `rounded-[--radius-card]` silently compiles to nothing in v4.

Buttons expose hover, active, disabled and focus-visible states. Cards opt into
hover elevation with `interactive`. Statistics use tabular numerals so they
don't jitter while animating.

## Layout

- **Desktop** — fixed sidebar, sticky top header (page title, quick action, notifications, avatar), centred content capped at 1280px, multi-column card grids.
- **Tablet** — sidebar collapses; sections fall back to two columns.
- **Mobile** — single column, bottom tab bar, 56px minimum touch targets.

Nothing scrolls horizontally at any width down to 320px.

## Current state: connected to Supabase

Every screen reads and writes real rows. There is no demo dataset left in the
codebase.

| Route | Reads | Writes |
|---|---|---|
| `/onboarding` | `profiles` | `profiles`, then builds the first plan |
| `/dashboard` | plan, diet targets, food and water logs, sessions, weights, streak | — |
| `/train` | `workout_plans`, `plan_days`, `plan_exercises` | rebuild plan |
| `/train/[day]/session` | the day plus your last logged weights | `workout_sessions`, `set_logs`, `streaks`, `achievements` |
| `/fuel` | `diet_plans`, `diet_plan_meals`, `food_logs`, `water_logs` | `food_logs`, `water_logs` |
| `/progress` | `body_metrics`, `workout_sessions`, `set_logs`, `achievements` | `body_metrics` (+ profile weight) |
| `/coach` | `chat_threads`, `chat_messages` | `chat_threads`, `chat_messages` |
| `/settings` | `profiles` | `profiles` |

Two things are still rules rather than a model, and both are swap-in points
rather than placeholders — they write the same rows an AI version would:

- **Plan generation** (`lib/plan/starter.ts`, `lib/plan/nutrition.ts`) picks the
  split, exercises, sets and rest from the profile, and works out calories with
  Mifflin-St Jeor.
- **Coach replies** (`lib/coach/reply.ts`) are composed from your own logs.

Meal macros are typed in by hand until `ANTHROPIC_API_KEY` is set.

## Setup

### 1. Supabase

`.env.local` already points at the project. To apply the schema to a fresh
project, from the repo root:

```bash
npm run db:login          # opens the browser, paste the token back
npm run db:link           # links this repo to the project ref
npm run db:push           # applies both migrations, exercise library included
npm run db:status         # confirms which migrations are live
```

Or, without the CLI, paste these into the Supabase **SQL Editor** in order:

- `supabase/migrations/0001_init.sql` — tables, RLS, storage bucket
- `supabase/migrations/0002_exercise_library.sql` — the shared exercise library

If `db push` stops on the `storage.objects` policies at the end of `0001`,
create the `progress-photos` bucket and its owner-only policies from
*Storage → Policies* in the dashboard instead; everything else will already have
applied.

`SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is only needed for admin scripts —
the app itself runs entirely on the publishable key plus Row Level Security.

### 1b. Google sign-in (optional)

In the Supabase dashboard, *Authentication → Providers → Google*: enable it and
paste in a Google OAuth client ID and secret. Set the authorised redirect URI to
the one Supabase shows you, and add `http://localhost:3000/auth/callback` (plus
your production equivalent) to *Authentication → URL Configuration → Redirect
URLs*. Email and password sign-in works without any of this.

### 2. Gemini

Create a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
and set `GEMINI_API_KEY` in `.env.local`. The free tier runs everything here —
no billing account needed.

`GEMINI_MODEL` defaults to **`gemini-3.5-flash-lite`**. That choice is about
quota, not quality, and the reason is worth knowing before you change it.

Free-tier quota is applied **per model**, and the good models are capped per
*day*:

| Model | Free-tier limit | Verdict |
|---|---|---|
| `gemini-3.5-flash-lite` | 15 / **minute** | **Default.** The only one an app can live within |
| `gemini-3.6-flash` | 20 / **day** | Better plans, but one onboarding costs 2 |
| `gemini-3.7-flash` | 20 / day | Strongest, and also often 503s under load |
| `gemini-3.5-flash` | 20 / day | Slow as well — up to 36s |
| `gemini-2.5-*` | — | Closed to API keys created recently |

Twenty a day is not a rate limit you can build on: finishing onboarding makes
two calls, and a handful of coach messages spends the rest. Flash-lite's limit
is per-minute, so it refills continuously.

**If you enable billing, switch to `gemini-3.6-flash`** — it writes noticeably
better plans, and the day cap disappears.

Check any of this yourself with `npm run test:live`, which calls all four
features with your real key and validates what comes back. It paces itself to
stay under the rate limit and takes about two minutes; `LIVE_PACE_MS=0` skips
the waiting. Google moves these limits around, so when plans start failing that
script tells you whether it is the model or the code.

The key powers four features:

| Feature | Where | Falls back to |
|---|---|---|
| Workout plan generation | `lib/ai/workout.ts` | The rules engine in `lib/plan/starter.ts` |
| Diet plan generation | `lib/ai/diet.ts` | The static meal library in `lib/plan/meals.ts` |
| AI coach | `lib/ai/coach.ts` | The keyword responder in `lib/coach/reply.ts` |
| Meal macro estimates | `lib/ai/food.ts` | Nothing — the button is hidden and macros stay hand-typed |

### Latency

Measured end to end with the default `gemini-3.5-flash-lite`, with
`gemini-3.6-flash` alongside for comparison:

| Call | flash-lite | 3.6-flash |
|---|---|---|
| Workout plan | ~3s | ~12s |
| Diet plan | ~6s | ~43s |
| Coach reply | ~1s | ~4s |
| Macro estimate | ~1s | ~2s |

Both plan calls run in parallel, so finishing onboarding costs about 7 seconds
on the default model. Two things still worth knowing:

- The diet generator asks for **four distinct daily menus** and rotates them
  across the week rather than writing seven separate days. On the slower models
  seven days took about a minute; four is also closer to how people shop.
- The pages that trigger these calls set `export const maxDuration`. Server
  Actions inherit their timeout from the page that invokes them, and the
  headroom matters on a slower model or a retry — without it, plan generation
  on `gemini-3.6-flash` would be killed mid-flight in production.

### Free-tier rate limits

Whichever model you pick, the free tier will rate-limit you eventually:
`npm run test:live` alone makes six calls.

**After changing `.env.local`, restart `next dev`.** The key is read at server
start; editing the file under a running server leaves every AI feature silently
falling back, which looks exactly like the AI being broken. Rate-limited responses carry the cooldown they want, often 30-60
seconds. `lib/ai/gemini.ts` reads that value and stops immediately rather than
retrying when it is longer than `MAX_HONOURED_RETRY_MS` — retrying sooner
cannot succeed, and each attempt spends more of the quota that just ran out.
The user gets the deterministic fallback and a `[gemini]` warning is logged
server-side saying why.

**The app works without the key.** Every AI path degrades rather than breaks,
so a missing key, an unreachable API or a spent free-tier quota costs you the
feature and nothing else. The first three fall back to the deterministic
engines they replaced; the macro estimator simply is not offered, and the
fields it fills stay typeable by hand. Calorie and macro targets are never
generated — they stay with the Mifflin-St Jeor arithmetic in
`lib/plan/nutrition.ts`, which enforces the minimum-calorie floor. The model
writes meals to fit those targets, not the targets themselves.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:ai` | Exercises the three AI features against a stubbed Gemini endpoint |
| `npm run lint` | Next lint |
| `npm run db:login` | Authenticate the Supabase CLI |
| `npm run db:link` | Link the repo to the Supabase project |
| `npm run db:push` | Apply migrations to the linked project |
| `npm run db:status` | List applied vs pending migrations |

## Layout

```
app/(marketing)      landing page
app/(app)            signed-in surfaces: dashboard, train, fuel, progress, coach, settings
components/ui        design-system primitives
components/shell     navigation and layout chrome
lib/supabase         browser / server / admin clients + typed schema
lib/data             server-only reads, one module per surface
lib/plan             plan and nutrition-target generation
lib/coach            coach reply composition
lib/ai               Gemini client, prompts, and the three AI features
test                 AI generator checks (no API key or network needed)
supabase/migrations  schema, RLS policies, storage bucket, exercise library
proxy.ts             session refresh + route gating (Next 16 renamed `middleware` to `proxy`)
```

## Security notes

- Every user-owned table has **Row Level Security** keyed to `auth.uid()`.
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only and never
  reach the browser bundle.
- Progress photos live in a **private** storage bucket, scoped per user by path.

## Disclaimer

Repwisely provides general fitness and nutrition guidance, not medical advice.
