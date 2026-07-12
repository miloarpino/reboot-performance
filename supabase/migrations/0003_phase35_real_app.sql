do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'client_assessments_client_id_key'
  ) then
    alter table public.client_assessments
      add constraint client_assessments_client_id_key unique (client_id);
  end if;
end $$;

create table if not exists public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade unique,
  calories integer not null check (calories > 0),
  protein integer not null check (protein >= 0),
  carbs integer not null check (carbs >= 0),
  fat integer not null check (fat >= 0),
  water_liters numeric not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  focus text not null default '',
  scheduled_for date not null default current_date,
  duration_minutes integer not null default 45,
  exercises text[] not null default '{}',
  notes text not null default '',
  status text not null default 'planned' check (status in ('planned', 'completed', 'missed', 'archived')),
  completed_at timestamptz,
  feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric,
  body_fat_percent numeric,
  waist_cm numeric,
  hip_cm numeric,
  chest_cm numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.nutrition_targets enable row level security;
alter table public.workouts enable row level security;
alter table public.measurements enable row level security;
alter table public.messages enable row level security;

create policy "client reads own nutrition" on public.nutrition_targets
  for select using (client_id = auth.uid());

create policy "coach manages related nutrition" on public.nutrition_targets
  for all using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = nutrition_targets.client_id
    )
  );

create policy "client reads own workouts" on public.workouts
  for select using (client_id = auth.uid());

create policy "coach manages related workouts" on public.workouts
  for all using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = workouts.client_id
    )
  );

create policy "client reads own measurements" on public.measurements
  for select using (client_id = auth.uid());

create policy "coach manages related measurements" on public.measurements
  for all using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = measurements.client_id
    )
  );

create policy "users read own messages" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "users send own messages" on public.messages
  for insert with check (sender_id = auth.uid());

create policy "users update received messages" on public.messages
  for update using (recipient_id = auth.uid());

create index if not exists nutrition_targets_client_idx on public.nutrition_targets(client_id);
create index if not exists workouts_client_idx on public.workouts(client_id);
create index if not exists workouts_coach_idx on public.workouts(coach_id);
create index if not exists measurements_client_idx on public.measurements(client_id);
create index if not exists messages_sender_idx on public.messages(sender_id);
create index if not exists messages_recipient_idx on public.messages(recipient_id);
