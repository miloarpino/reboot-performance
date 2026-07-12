create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach', 'client', 'admin')),
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_client_relations (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, client_id)
);

create table if not exists public.client_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  age integer not null,
  sex text not null,
  height_cm numeric,
  weight_kg numeric,
  body_fat_percent numeric,
  level text not null,
  formula text not null,
  goal text not null,
  sport text not null,
  activity_hours numeric not null default 0,
  physical_job boolean not null default false,
  injuries text[] not null default '{}',
  pain text[] not null default '{}',
  food_preferences text[] not null default '{}',
  allergies text[] not null default '{}',
  restrictions text[] not null default '{}',
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fat integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  status text not null check (status in ('draft', 'scheduled', 'published', 'archived')),
  payload jsonb not null default '{}'::jsonb,
  publish_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_targets (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  mode text not null check (mode in ('all', 'manual', 'profile')),
  client_ids uuid[] not null default '{}',
  formulas text[] not null default '{}',
  goals text[] not null default '{}',
  sexes text[] not null default '{}',
  levels text[] not null default '{}',
  sports text[] not null default '{}',
  min_age integer,
  max_age integer
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  level text not null check (level in ('information', 'attention', 'urgent')),
  title text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'postponed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  client_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_id uuid,
  summary text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.coach_client_relations enable row level security;
alter table public.client_assessments enable row level security;
alter table public.contents enable row level security;
alter table public.publication_targets enable row level security;
alter table public.notifications enable row level security;
alter table public.templates enable row level security;
alter table public.approval_requests enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "coach sees related clients" on public.profiles
  for select using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = profiles.id
    )
  );

create policy "client sees own assessments" on public.client_assessments
  for select using (client_id = auth.uid());

create policy "coach sees related assessments" on public.client_assessments
  for all using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = client_assessments.client_id
    )
  );

create policy "coach manages own contents" on public.contents
  for all using (coach_id = auth.uid());

create policy "coach manages own templates" on public.templates
  for all using (coach_id = auth.uid());

create policy "coach sees own notifications" on public.notifications
  for all using (coach_id = auth.uid());

create policy "client sees own notifications" on public.notifications
  for select using (client_id = auth.uid());

create policy "coach manages approvals" on public.approval_requests
  for all using (coach_id = auth.uid());

create policy "actor sees own audit logs" on public.audit_logs
  for select using (actor_id = auth.uid() or client_id = auth.uid());
