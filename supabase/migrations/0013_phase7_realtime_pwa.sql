create table if not exists public.workout_assignments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references public.workouts(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'seen', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'unlocked' check (status in ('locked', 'unlocked', 'archived')),
  unlocked_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'completed', 'archived')),
  starts_at timestamptz default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_assignments enable row level security;
alter table public.user_badges enable row level security;
alter table public.challenges enable row level security;

drop policy if exists "client reads own workout assignments" on public.workout_assignments;
create policy "client reads own workout assignments" on public.workout_assignments
  for select using (client_id = auth.uid());

drop policy if exists "coach manages related workout assignments" on public.workout_assignments;
create policy "coach manages related workout assignments" on public.workout_assignments
  for all using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = workout_assignments.client_id
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = workout_assignments.client_id
    )
  );

drop policy if exists "client reads own badges" on public.user_badges;
create policy "client reads own badges" on public.user_badges
  for select using (client_id = auth.uid());

drop policy if exists "coach manages related badges" on public.user_badges;
create policy "coach manages related badges" on public.user_badges
  for all using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = user_badges.client_id
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = user_badges.client_id
    )
  );

drop policy if exists "client reads own challenges" on public.challenges;
create policy "client reads own challenges" on public.challenges
  for select using (client_id = auth.uid());

drop policy if exists "coach manages related challenges" on public.challenges;
create policy "coach manages related challenges" on public.challenges
  for all using (
    coach_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1 from public.coach_client_relations r
        where r.coach_id = auth.uid() and r.client_id = challenges.client_id
      )
    )
  )
  with check (
    coach_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1 from public.coach_client_relations r
        where r.coach_id = auth.uid() and r.client_id = challenges.client_id
      )
    )
  );

create index if not exists workout_assignments_client_idx on public.workout_assignments(client_id);
create index if not exists workout_assignments_coach_idx on public.workout_assignments(coach_id);
create index if not exists user_badges_client_idx on public.user_badges(client_id);
create index if not exists user_badges_coach_idx on public.user_badges(coach_id);
create index if not exists challenges_client_idx on public.challenges(client_id);
create index if not exists challenges_coach_idx on public.challenges(coach_id);

do $$
declare
  table_name text;
  realtime_tables text[] := array[
    'nutrition_targets',
    'workouts',
    'workout_assignments',
    'notifications',
    'messages',
    'contents',
    'publication_targets',
    'recipe_assignments',
    'user_badges',
    'challenges',
    'ai_recommendations'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array realtime_tables loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end $$;
