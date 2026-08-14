-- Repwise — initial schema
-- Every user-owned table carries user_id and is protected by RLS so one
-- account can never read another's data. Child tables denormalise user_id
-- (rather than joining to the parent in the policy) because RLS runs per row
-- and an EXISTS subquery per row is measurably slower at read time.

-- ---------------------------------------------------------------- enums ----
create type sex_t              as enum ('male', 'female', 'other', 'prefer_not_to_say');
create type experience_level_t as enum ('beginner', 'intermediate', 'advanced');
create type goal_t             as enum ('lose_fat', 'build_muscle', 'gain_strength', 'improve_endurance', 'maintain');
create type training_location_t as enum ('home', 'gym', 'both');
create type activity_level_t   as enum ('sedentary', 'light', 'moderate', 'very', 'extra');
create type dietary_pref_t     as enum ('none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher');
create type unit_system_t      as enum ('metric', 'imperial');
create type plan_status_t      as enum ('active', 'archived');
create type meal_type_t        as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type food_source_t      as enum ('ai_estimate', 'manual', 'plan');
create type chat_role_t        as enum ('user', 'assistant');
create type difficulty_t       as enum ('beginner', 'intermediate', 'advanced');

-- ------------------------------------------------------------- helpers ----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ profiles ----
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  email                 text,
  phone                 text,
  date_of_birth         date,
  sex                   sex_t,

  height_cm             numeric(5,1),
  weight_kg             numeric(5,1),
  target_weight_kg      numeric(5,1),
  units                 unit_system_t not null default 'metric',

  experience_level      experience_level_t,
  years_training        numeric(3,1),
  primary_goal          goal_t,

  training_location     training_location_t,
  days_per_week         smallint check (days_per_week between 1 and 7),
  session_minutes       smallint check (session_minutes between 10 and 240),
  equipment             text[] not null default '{}',

  activity_level        activity_level_t,
  dietary_preference    dietary_pref_t not null default 'none',
  allergies             text[] not null default '{}',
  injuries              text,

  onboarding_step       smallint not null default 0,
  onboarding_completed  boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Create the profile row automatically when a user signs up, carrying over
-- whatever the sign-up form put into user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------- exercises ----
-- Shared, read-only library seeded by us — not user data, so no user_id.
create table public.exercises (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  primary_muscle     text not null,
  secondary_muscles  text[] not null default '{}',
  equipment          text not null,
  location_tags      text[] not null default '{}',
  difficulty         difficulty_t not null default 'beginner',
  is_compound        boolean not null default false,
  instructions       text,
  cues               text[] not null default '{}',
  demo_url           text,
  created_at         timestamptz not null default now()
);

create index exercises_primary_muscle_idx on public.exercises (primary_muscle);
create index exercises_location_tags_idx  on public.exercises using gin (location_tags);
create index exercises_name_trgm_idx      on public.exercises (lower(name));

-- ------------------------------------------------------- workout plans ----
create table public.workout_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  goal              goal_t,
  location          training_location_t,
  days_per_week     smallint,
  weeks             smallint not null default 4,
  status            plan_status_t not null default 'active',
  generated_by      text not null default 'ai',
  ai_rationale      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index workout_plans_user_status_idx on public.workout_plans (user_id, status);

create table public.plan_days (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.workout_plans(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  day_index      smallint not null check (day_index between 1 and 7),
  title          text not null,
  focus          text,
  est_minutes    smallint,
  is_rest_day    boolean not null default false,
  unique (plan_id, day_index)
);

create index plan_days_plan_idx on public.plan_days (plan_id);

create table public.plan_exercises (
  id             uuid primary key default gen_random_uuid(),
  plan_day_id    uuid not null references public.plan_days(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  exercise_id    uuid references public.exercises(id) on delete set null,
  name           text not null,
  order_index    smallint not null default 0,
  sets           smallint not null default 3,
  reps           text not null default '8-12',
  rest_seconds   smallint not null default 90,
  tempo          text,
  notes          text
);

create index plan_exercises_day_idx on public.plan_exercises (plan_day_id, order_index);

-- ---------------------------------------------------- logged workouts ----
create table public.workout_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  plan_day_id       uuid references public.plan_days(id) on delete set null,
  title             text,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  duration_seconds  integer,
  total_volume_kg   numeric(10,1) not null default 0,
  perceived_effort  smallint check (perceived_effort between 1 and 10),
  notes             text
);

create index workout_sessions_user_time_idx on public.workout_sessions (user_id, started_at desc);

create table public.set_logs (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.workout_sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  exercise_id   uuid references public.exercises(id) on delete set null,
  exercise_name text not null,
  set_number    smallint not null,
  reps          smallint,
  weight_kg     numeric(6,2),
  rpe           smallint check (rpe between 1 and 10),
  is_warmup     boolean not null default false,
  completed_at  timestamptz not null default now()
);

create index set_logs_session_idx       on public.set_logs (session_id);
create index set_logs_user_exercise_idx on public.set_logs (user_id, exercise_name, completed_at desc);

-- ----------------------------------------------------------- nutrition ----
create table public.diet_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  status           plan_status_t not null default 'active',
  bmr              integer,
  tdee             integer,
  daily_calories   integer not null,
  protein_g        integer not null,
  carbs_g          integer not null,
  fat_g            integer not null,
  water_ml_target  integer not null default 2500,
  ai_rationale     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index diet_plans_user_status_idx on public.diet_plans (user_id, status);

create table public.diet_plan_meals (
  id            uuid primary key default gen_random_uuid(),
  diet_plan_id  uuid not null references public.diet_plans(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  day_index     smallint check (day_index between 1 and 7),
  meal_type     meal_type_t not null,
  name          text not null,
  description   text,
  calories      integer not null default 0,
  protein_g     numeric(6,1) not null default 0,
  carbs_g       numeric(6,1) not null default 0,
  fat_g         numeric(6,1) not null default 0,
  ingredients   jsonb not null default '[]'::jsonb,
  recipe        text,
  order_index   smallint not null default 0
);

create index diet_plan_meals_plan_idx on public.diet_plan_meals (diet_plan_id, day_index, order_index);

create table public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  logged_at  timestamptz not null default now(),
  log_date   date not null default (now() at time zone 'utc')::date,
  meal_type  meal_type_t not null,
  name       text not null,
  serving    text,
  calories   integer not null default 0,
  protein_g  numeric(6,1) not null default 0,
  carbs_g    numeric(6,1) not null default 0,
  fat_g      numeric(6,1) not null default 0,
  source     food_source_t not null default 'manual'
);

create index food_logs_user_date_idx on public.food_logs (user_id, log_date desc);

create table public.water_logs (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  log_date  date not null default (now() at time zone 'utc')::date,
  ml        integer not null,
  logged_at timestamptz not null default now()
);

create index water_logs_user_date_idx on public.water_logs (user_id, log_date desc);

-- ------------------------------------------------------------ progress ----
create table public.body_metrics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  recorded_on   date not null default (now() at time zone 'utc')::date,
  weight_kg     numeric(5,1),
  body_fat_pct  numeric(4,1),
  chest_cm      numeric(5,1),
  waist_cm      numeric(5,1),
  hips_cm       numeric(5,1),
  arm_cm        numeric(5,1),
  thigh_cm      numeric(5,1),
  photo_path    text,
  created_at    timestamptz not null default now(),
  unique (user_id, recorded_on)
);

create index body_metrics_user_date_idx on public.body_metrics (user_id, recorded_on desc);

create table public.streaks (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_active_date date,
  updated_at       timestamptz not null default now()
);

create table public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

-- --------------------------------------------------------------- coach ----
create table public.chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_threads_user_idx on public.chat_threads (user_id, updated_at desc);

create table public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     uuid not null references public.chat_threads(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          chat_role_t not null,
  content       text not null,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);

create index chat_messages_thread_idx on public.chat_messages (thread_id, created_at);

-- ------------------------------------------------------ updated_at hooks --
create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger workout_plans_updated_at before update on public.workout_plans for each row execute function public.set_updated_at();
create trigger diet_plans_updated_at    before update on public.diet_plans    for each row execute function public.set_updated_at();
create trigger chat_threads_updated_at  before update on public.chat_threads  for each row execute function public.set_updated_at();
create trigger streaks_updated_at       before update on public.streaks       for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ RLS ---
alter table public.profiles         enable row level security;
alter table public.exercises        enable row level security;
alter table public.workout_plans    enable row level security;
alter table public.plan_days        enable row level security;
alter table public.plan_exercises   enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs         enable row level security;
alter table public.diet_plans       enable row level security;
alter table public.diet_plan_meals  enable row level security;
alter table public.food_logs        enable row level security;
alter table public.water_logs       enable row level security;
alter table public.body_metrics     enable row level security;
alter table public.streaks          enable row level security;
alter table public.achievements     enable row level security;
alter table public.chat_threads     enable row level security;
alter table public.chat_messages    enable row level security;

-- profiles: keyed on id rather than user_id.
create policy "own profile: read"   on public.profiles for select using ((select auth.uid()) = id);
create policy "own profile: insert" on public.profiles for insert with check ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- exercises: shared library, readable by any signed-in user, writable by nobody
-- through the anon/authenticated roles (seeded with the service role).
create policy "exercises: read" on public.exercises for select to authenticated using (true);

-- Every remaining table follows the identical own-rows-only shape.
do $$
declare t text;
begin
  foreach t in array array[
    'workout_plans', 'plan_days', 'plan_exercises', 'workout_sessions',
    'set_logs', 'diet_plans', 'diet_plan_meals', 'food_logs', 'water_logs',
    'body_metrics', 'streaks', 'achievements', 'chat_threads', 'chat_messages'
  ]
  loop
    execute format(
      'create policy "own rows: read" on public.%I for select using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows: insert" on public.%I for insert with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows: update" on public.%I for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "own rows: delete" on public.%I for delete using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- ------------------------------------------------------ progress photos ----
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Photos live under <user-id>/<filename>, so ownership is the first path segment.
create policy "progress photos: read own"   on storage.objects for select
  using (bucket_id = 'progress-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "progress photos: insert own" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "progress photos: delete own" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
