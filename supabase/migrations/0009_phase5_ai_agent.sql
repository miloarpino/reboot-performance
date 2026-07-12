create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('single_client', 'all_clients')),
  mode text not null check (mode in ('demo', 'api')),
  status text not null default 'completed' check (status in ('completed', 'failed')),
  summary text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  data_used jsonb not null default '{}'::jsonb,
  signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.ai_analyses(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('training', 'nutrition', 'follow_up', 'message', 'publication', 'alert')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'modified', 'rejected', 'postponed', 'applied', 'failed', 'reverted')),
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  problem text not null,
  current_state jsonb not null default '{}'::jsonb,
  proposed_change jsonb not null default '{}'::jsonb,
  justification text not null,
  expected_benefit text not null default '',
  risks text[] not null default '{}',
  requires_client_visibility boolean not null default true,
  coach_edit jsonb,
  decided_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_changes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.ai_recommendations(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  previous_status text,
  new_status text not null,
  proposed_before jsonb,
  proposed_after jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.ai_recommendations(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  status text not null check (status in ('applied', 'failed', 'reverted')),
  before_data jsonb,
  after_data jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.rollback_events (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.ai_actions(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('applied', 'failed')),
  before_data jsonb,
  restored_data jsonb,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.coach_ai_preferences (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  style_memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('demo', 'api')),
  action text not null,
  status text not null check (status in ('success', 'failed', 'rate_limited')),
  tokens_input integer not null default 0,
  tokens_output integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.ai_analyses enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.approval_changes enable row level security;
alter table public.ai_actions enable row level security;
alter table public.rollback_events enable row level security;
alter table public.coach_ai_preferences enable row level security;
alter table public.ai_usage_logs enable row level security;

create index if not exists ai_analyses_coach_idx on public.ai_analyses(coach_id, created_at desc);
create index if not exists ai_analyses_client_idx on public.ai_analyses(client_id, created_at desc);
create index if not exists ai_recommendations_coach_idx on public.ai_recommendations(coach_id, status, created_at desc);
create index if not exists ai_recommendations_client_idx on public.ai_recommendations(client_id, created_at desc);
create index if not exists approval_changes_recommendation_idx on public.approval_changes(recommendation_id, created_at desc);
create index if not exists ai_actions_recommendation_idx on public.ai_actions(recommendation_id, created_at desc);
create index if not exists ai_usage_logs_coach_idx on public.ai_usage_logs(coach_id, created_at desc);

drop policy if exists "coach reads own ai analyses" on public.ai_analyses;
create policy "coach reads own ai analyses" on public.ai_analyses
  for select using (coach_id = auth.uid() and public.is_coach_user(auth.uid()));

drop policy if exists "coach inserts own ai analyses" on public.ai_analyses;
create policy "coach inserts own ai analyses" on public.ai_analyses
  for insert with check (
    coach_id = auth.uid()
    and public.is_coach_user(auth.uid())
    and (
      client_id is null
      or exists (
        select 1 from public.coach_client_relations r
        where r.coach_id = auth.uid() and r.client_id = ai_analyses.client_id
      )
    )
  );

drop policy if exists "coach manages own ai recommendations" on public.ai_recommendations;
create policy "coach manages own ai recommendations" on public.ai_recommendations
  for all using (
    coach_id = auth.uid()
    and public.is_coach_user(auth.uid())
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = ai_recommendations.client_id
    )
  )
  with check (
    coach_id = auth.uid()
    and public.is_coach_user(auth.uid())
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = ai_recommendations.client_id
    )
  );

drop policy if exists "coach manages own approval changes" on public.approval_changes;
create policy "coach manages own approval changes" on public.approval_changes
  for all using (coach_id = auth.uid() and public.is_coach_user(auth.uid()))
  with check (coach_id = auth.uid() and public.is_coach_user(auth.uid()));

drop policy if exists "coach reads own ai actions" on public.ai_actions;
create policy "coach reads own ai actions" on public.ai_actions
  for select using (coach_id = auth.uid() and public.is_coach_user(auth.uid()));

drop policy if exists "coach reads own rollback events" on public.rollback_events;
create policy "coach reads own rollback events" on public.rollback_events
  for select using (coach_id = auth.uid() and public.is_coach_user(auth.uid()));

drop policy if exists "coach manages own ai preferences" on public.coach_ai_preferences;
create policy "coach manages own ai preferences" on public.coach_ai_preferences
  for all using (coach_id = auth.uid() and public.is_coach_user(auth.uid()))
  with check (coach_id = auth.uid() and public.is_coach_user(auth.uid()));

drop policy if exists "coach reads own ai usage" on public.ai_usage_logs;
create policy "coach reads own ai usage" on public.ai_usage_logs
  for select using (coach_id = auth.uid() and public.is_coach_user(auth.uid()));

drop function if exists public.apply_ai_nutrition_recommendation(uuid, uuid);
create function public.apply_ai_nutrition_recommendation(p_recommendation_id uuid, p_coach_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.ai_recommendations%rowtype;
  before_row jsonb;
  after_row jsonb;
  action_id uuid;
  next_values jsonb;
begin
  if not public.is_coach_user(p_coach_id) then
    raise exception 'coach role required';
  end if;

  select * into rec
  from public.ai_recommendations
  where id = p_recommendation_id
  for update;

  if not found then
    raise exception 'recommendation not found';
  end if;

  if rec.coach_id <> p_coach_id then
    raise exception 'recommendation forbidden';
  end if;

  if rec.type <> 'nutrition' then
    raise exception 'only nutrition recommendations are supported by this transaction';
  end if;

  if rec.status not in ('approved', 'modified') then
    raise exception 'recommendation must be approved before application';
  end if;

  if rec.applied_at is not null or exists (
    select 1 from public.ai_actions a
    where a.recommendation_id = rec.id and a.status = 'applied'
  ) then
    raise exception 'recommendation already applied';
  end if;

  if not exists (
    select 1 from public.coach_client_relations r
    where r.coach_id = p_coach_id and r.client_id = rec.client_id
  ) then
    raise exception 'client forbidden';
  end if;

  select to_jsonb(n.*) into before_row
  from public.nutrition_targets n
  where n.client_id = rec.client_id
  for update;

  next_values := coalesce(rec.coach_edit, rec.proposed_change);

  insert into public.nutrition_targets (
    client_id,
    calories,
    protein,
    carbs,
    fat,
    water_liters,
    updated_at
  )
  values (
    rec.client_id,
    (next_values->>'calories')::integer,
    (next_values->>'protein')::integer,
    (next_values->>'carbs')::integer,
    (next_values->>'fat')::integer,
    coalesce((next_values->>'water_liters')::numeric, 2),
    now()
  )
  on conflict (client_id) do update set
    calories = excluded.calories,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    water_liters = excluded.water_liters,
    updated_at = now();

  select to_jsonb(n.*) into after_row
  from public.nutrition_targets n
  where n.client_id = rec.client_id;

  insert into public.ai_actions (
    recommendation_id,
    coach_id,
    client_id,
    action_type,
    status,
    before_data,
    after_data
  )
  values (
    rec.id,
    rec.coach_id,
    rec.client_id,
    'nutrition.update',
    'applied',
    before_row,
    after_row
  )
  returning id into action_id;

  update public.ai_recommendations
  set status = 'applied',
      applied_at = now(),
      updated_at = now()
  where id = rec.id;

  insert into public.audit_logs (
    actor_id,
    client_id,
    action,
    entity_id,
    summary,
    before_data,
    after_data
  )
  values (
    rec.coach_id,
    rec.client_id,
    'ai.nutrition.applied',
    rec.id,
    rec.justification,
    before_row,
    after_row
  );

  return action_id;
end;
$$;

drop function if exists public.restore_ai_nutrition_action(uuid, uuid);
create function public.restore_ai_nutrition_action(p_action_id uuid, p_coach_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  action_row public.ai_actions%rowtype;
  restored jsonb;
  rollback_id uuid;
begin
  select * into action_row
  from public.ai_actions
  where id = p_action_id
  for update;

  if not found then
    raise exception 'action not found';
  end if;

  if action_row.coach_id <> p_coach_id or not public.is_coach_user(p_coach_id) then
    raise exception 'action forbidden';
  end if;

  if action_row.status <> 'applied' or action_row.before_data is null then
    raise exception 'action cannot be restored';
  end if;

  insert into public.nutrition_targets (
    client_id,
    calories,
    protein,
    carbs,
    fat,
    water_liters,
    updated_at
  )
  values (
    action_row.client_id,
    (action_row.before_data->>'calories')::integer,
    (action_row.before_data->>'protein')::integer,
    (action_row.before_data->>'carbs')::integer,
    (action_row.before_data->>'fat')::integer,
    coalesce((action_row.before_data->>'water_liters')::numeric, 2),
    now()
  )
  on conflict (client_id) do update set
    calories = excluded.calories,
    protein = excluded.protein,
    carbs = excluded.carbs,
    fat = excluded.fat,
    water_liters = excluded.water_liters,
    updated_at = now();

  select to_jsonb(n.*) into restored
  from public.nutrition_targets n
  where n.client_id = action_row.client_id;

  update public.ai_actions
  set status = 'reverted'
  where id = action_row.id;

  update public.ai_recommendations
  set status = 'reverted',
      updated_at = now()
  where id = action_row.recommendation_id;

  insert into public.rollback_events (
    action_id,
    coach_id,
    client_id,
    status,
    before_data,
    restored_data,
    note
  )
  values (
    action_row.id,
    action_row.coach_id,
    action_row.client_id,
    'applied',
    action_row.after_data,
    restored,
    'Restauration nutrition IA'
  )
  returning id into rollback_id;

  insert into public.audit_logs (
    actor_id,
    client_id,
    action,
    entity_id,
    summary,
    before_data,
    after_data
  )
  values (
    action_row.coach_id,
    action_row.client_id,
    'ai.nutrition.reverted',
    action_row.recommendation_id,
    'Restauration nutrition IA',
    action_row.after_data,
    restored
  );

  return rollback_id;
end;
$$;
