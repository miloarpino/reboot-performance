create or replace function public.phase8_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.phase8_prepare_weekly_checkin()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if tg_op = 'INSERT' then
    if new.status = 'draft' then
      new.submitted_at = null;
      new.viewed_at = null;
    elsif new.status = 'submitted' then
      new.submitted_at = now();
      new.viewed_at = null;
    elsif new.status = 'locked' then
      raise exception 'weekly_checkins cannot be inserted as locked';
    end if;
    return new;
  end if;

  if (select auth.uid()) = old.client_id then
    if old.status <> 'draft' then
      raise exception 'submitted or locked weekly checkins cannot be modified by the client';
    end if;
    if new.status = 'locked' then
      raise exception 'clients cannot lock weekly checkins';
    end if;
    if new.viewed_at is not null then
      raise exception 'clients cannot set viewed_at';
    end if;
  else
    if to_jsonb(new) - array['status', 'viewed_at', 'submitted_at', 'updated_at']::text[]
      <> to_jsonb(old) - array['status', 'viewed_at', 'submitted_at', 'updated_at']::text[] then
      raise exception 'coach weekly checkin updates are limited to status/viewed_at';
    end if;
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    new.submitted_at = now();
  elsif new.status = 'draft' then
    new.submitted_at = null;
  else
    new.submitted_at = old.submitted_at;
  end if;

  if old.viewed_at is null and new.viewed_at is not null then
    new.viewed_at = now();
  elsif old.viewed_at is not null then
    new.viewed_at = old.viewed_at;
  end if;

  return new;
end;
$$;

create table if not exists public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  meal_date date not null default current_date,
  meal_name varchar(80) not null default 'Repas',
  description varchar(1200) not null default '',
  quantity varchar(120) not null default '',
  calories numeric(6,1) not null default 0 check (calories >= 0 and calories <= 5000),
  protein numeric(5,1) not null default 0 check (protein >= 0 and protein <= 400),
  carbs numeric(5,1) not null default 0 check (carbs >= 0 and carbs <= 700),
  fat numeric(5,1) not null default 0 check (fat >= 0 and fat <= 300),
  source text not null default 'manual' check (source in ('manual', 'ai_estimate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(meal_name)) between 1 and 80)
);

create table if not exists public.hydration_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null default current_date,
  liters numeric(4,2) not null check (liters > 0 and liters <= 3),
  note varchar(280) not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'locked')),
  energy integer not null default 5 check (energy between 1 and 10),
  motivation varchar(800) not null default '',
  stress integer not null default 5 check (stress between 1 and 10),
  sleep_hours numeric(4,2) not null default 7 check (sleep_hours >= 0 and sleep_hours <= 16),
  sleep_quality varchar(800) not null default '',
  nap varchar(400) not null default '',
  average_hydration numeric(4,2) not null default 0 check (average_hydration >= 0 and average_hydration <= 8),
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 350)),
  pain varchar(1000) not null default '',
  pain_location varchar(400) not null default '',
  training_rpe integer not null default 5 check (training_rpe between 1 and 10),
  training_feeling varchar(1200) not null default '',
  nutrition_adherence integer not null default 7 check (nutrition_adherence between 1 and 10),
  weekly_win varchar(1200) not null default '',
  measurements jsonb not null default '{}'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  viewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, week_start),
  check (
    jsonb_typeof(measurements) = 'object'
    and jsonb_typeof(photos) = 'array'
  )
);

create table if not exists public.weekly_private_journals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  body varchar(5000) not null default '',
  visible_to_coach boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, week_start)
);

create table if not exists public.tribe_posts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('coach', 'client')),
  kind text not null default 'client_post' check (kind in ('client_post', 'coach_announcement')),
  body varchar(2000) not null check (char_length(trim(body)) > 0),
  media_url text,
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (author_role = 'client' and kind = 'client_post' and client_id = author_id)
    or
    (author_role = 'coach' and kind = 'coach_announcement' and client_id is null and coach_id = author_id)
  )
);

alter table public.meal_entries enable row level security;
alter table public.hydration_entries enable row level security;
alter table public.weekly_checkins enable row level security;
alter table public.weekly_private_journals enable row level security;
alter table public.tribe_posts enable row level security;

drop trigger if exists set_meal_entries_updated_at on public.meal_entries;
create trigger set_meal_entries_updated_at
  before update on public.meal_entries
  for each row execute function public.phase8_set_updated_at();

drop trigger if exists set_weekly_checkins_timestamps on public.weekly_checkins;
create trigger set_weekly_checkins_timestamps
  before insert or update on public.weekly_checkins
  for each row execute function public.phase8_prepare_weekly_checkin();

drop trigger if exists set_weekly_private_journals_updated_at on public.weekly_private_journals;
create trigger set_weekly_private_journals_updated_at
  before update on public.weekly_private_journals
  for each row execute function public.phase8_set_updated_at();

drop trigger if exists set_tribe_posts_updated_at on public.tribe_posts;
create trigger set_tribe_posts_updated_at
  before update on public.tribe_posts
  for each row execute function public.phase8_set_updated_at();

drop policy if exists "client manages own meals" on public.meal_entries;
drop policy if exists "coach reads related meals" on public.meal_entries;
drop policy if exists "client selects own meals" on public.meal_entries;
create policy "client selects own meals" on public.meal_entries
  for select to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "client inserts own meals" on public.meal_entries;
create policy "client inserts own meals" on public.meal_entries
  for insert to authenticated
  with check ((select auth.uid()) = client_id);

drop policy if exists "client updates own meals" on public.meal_entries;
create policy "client updates own meals" on public.meal_entries
  for update to authenticated
  using ((select auth.uid()) = client_id)
  with check ((select auth.uid()) = client_id);

drop policy if exists "client deletes own meals" on public.meal_entries;
create policy "client deletes own meals" on public.meal_entries
  for delete to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "coach selects related meals" on public.meal_entries;
create policy "coach selects related meals" on public.meal_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = meal_entries.client_id
    )
  );

drop policy if exists "client manages own hydration" on public.hydration_entries;
drop policy if exists "coach reads related hydration" on public.hydration_entries;
drop policy if exists "client selects own hydration" on public.hydration_entries;
create policy "client selects own hydration" on public.hydration_entries
  for select to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "client inserts own hydration" on public.hydration_entries;
create policy "client inserts own hydration" on public.hydration_entries
  for insert to authenticated
  with check ((select auth.uid()) = client_id);

drop policy if exists "client updates own hydration" on public.hydration_entries;
create policy "client updates own hydration" on public.hydration_entries
  for update to authenticated
  using ((select auth.uid()) = client_id)
  with check ((select auth.uid()) = client_id);

drop policy if exists "client deletes own hydration" on public.hydration_entries;
create policy "client deletes own hydration" on public.hydration_entries
  for delete to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "coach selects related hydration" on public.hydration_entries;
create policy "coach selects related hydration" on public.hydration_entries
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = hydration_entries.client_id
    )
  );

drop policy if exists "client reads own weekly checkins" on public.weekly_checkins;
drop policy if exists "client inserts own weekly checkins" on public.weekly_checkins;
drop policy if exists "client updates unlocked weekly checkins" on public.weekly_checkins;
drop policy if exists "coach reads related weekly checkins" on public.weekly_checkins;
drop policy if exists "client selects own weekly checkins" on public.weekly_checkins;
drop policy if exists "client inserts draft weekly checkins" on public.weekly_checkins;
drop policy if exists "client updates own draft weekly checkins" on public.weekly_checkins;
drop policy if exists "coach selects related weekly checkins" on public.weekly_checkins;
drop policy if exists "coach marks related weekly checkins" on public.weekly_checkins;

create policy "client selects own weekly checkins" on public.weekly_checkins
  for select to authenticated
  using ((select auth.uid()) = client_id);

create policy "client inserts draft weekly checkins" on public.weekly_checkins
  for insert to authenticated
  with check (
    (select auth.uid()) = client_id
    and status = 'draft'
    and viewed_at is null
    and submitted_at is null
  );

create policy "client updates own draft weekly checkins" on public.weekly_checkins
  for update to authenticated
  using (
    (select auth.uid()) = client_id
    and status = 'draft'
  )
  with check (
    (select auth.uid()) = client_id
    and status in ('draft', 'submitted')
    and viewed_at is null
  );

create policy "coach selects related weekly checkins" on public.weekly_checkins
  for select to authenticated
  using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = weekly_checkins.client_id
    )
  );

create policy "coach marks related weekly checkins" on public.weekly_checkins
  for update to authenticated
  using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = weekly_checkins.client_id
    )
  )
  with check (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = weekly_checkins.client_id
    )
    and status in ('submitted', 'locked')
  );

drop policy if exists "client selects own private journal" on public.weekly_private_journals;
create policy "client selects own private journal" on public.weekly_private_journals
  for select to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "client inserts own private journal" on public.weekly_private_journals;
create policy "client inserts own private journal" on public.weekly_private_journals
  for insert to authenticated
  with check ((select auth.uid()) = client_id);

drop policy if exists "client updates own private journal" on public.weekly_private_journals;
create policy "client updates own private journal" on public.weekly_private_journals
  for update to authenticated
  using ((select auth.uid()) = client_id)
  with check ((select auth.uid()) = client_id);

drop policy if exists "client deletes own private journal" on public.weekly_private_journals;
create policy "client deletes own private journal" on public.weekly_private_journals
  for delete to authenticated
  using ((select auth.uid()) = client_id);

drop policy if exists "coach selects explicitly shared journals" on public.weekly_private_journals;
create policy "coach selects explicitly shared journals" on public.weekly_private_journals
  for select to authenticated
  using (
    visible_to_coach = true
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = weekly_private_journals.client_id
    )
  );

drop policy if exists "client reads coach tribe posts" on public.tribe_posts;
drop policy if exists "client creates own tribe posts" on public.tribe_posts;
drop policy if exists "client updates own tribe posts" on public.tribe_posts;
drop policy if exists "coach reads related tribe posts" on public.tribe_posts;
drop policy if exists "client selects active tribe posts for own coach" on public.tribe_posts;
drop policy if exists "client inserts own tribe posts" on public.tribe_posts;
drop policy if exists "client updates own active tribe posts" on public.tribe_posts;
drop policy if exists "client deletes own active tribe posts" on public.tribe_posts;
drop policy if exists "coach selects current tribe posts" on public.tribe_posts;
drop policy if exists "coach inserts tribe announcements" on public.tribe_posts;
drop policy if exists "coach archives related tribe posts" on public.tribe_posts;

create policy "client selects active tribe posts for own coach" on public.tribe_posts
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.coach_client_relations r
      where r.client_id = (select auth.uid())
        and r.coach_id = tribe_posts.coach_id
    )
  );

create policy "client inserts own tribe posts" on public.tribe_posts
  for insert to authenticated
  with check (
    author_role = 'client'
    and kind = 'client_post'
    and author_id = (select auth.uid())
    and client_id = (select auth.uid())
    and exists (
      select 1 from public.coach_client_relations r
      where r.client_id = (select auth.uid())
        and r.coach_id = tribe_posts.coach_id
    )
  );

create policy "client updates own active tribe posts" on public.tribe_posts
  for update to authenticated
  using (
    author_role = 'client'
    and kind = 'client_post'
    and author_id = (select auth.uid())
    and client_id = (select auth.uid())
    and status = 'active'
  )
  with check (
    author_role = 'client'
    and kind = 'client_post'
    and author_id = (select auth.uid())
    and client_id = (select auth.uid())
    and status in ('active', 'archived')
    and exists (
      select 1 from public.coach_client_relations r
      where r.client_id = (select auth.uid())
        and r.coach_id = tribe_posts.coach_id
    )
  );

create policy "client deletes own active tribe posts" on public.tribe_posts
  for delete to authenticated
  using (
    author_role = 'client'
    and kind = 'client_post'
    and author_id = (select auth.uid())
    and client_id = (select auth.uid())
    and status = 'active'
  );

create policy "coach selects current tribe posts" on public.tribe_posts
  for select to authenticated
  using (
    (
      author_role = 'coach'
      and author_id = (select auth.uid())
      and coach_id = (select auth.uid())
    )
    or exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id = tribe_posts.client_id
    )
  );

create policy "coach inserts tribe announcements" on public.tribe_posts
  for insert to authenticated
  with check (
    author_role = 'coach'
    and kind = 'coach_announcement'
    and author_id = (select auth.uid())
    and coach_id = (select auth.uid())
    and client_id is null
  );

create policy "coach archives related tribe posts" on public.tribe_posts
  for update to authenticated
  using (
    status = 'active'
    and (
      (
        author_role = 'coach'
        and author_id = (select auth.uid())
        and coach_id = (select auth.uid())
      )
      or exists (
        select 1 from public.coach_client_relations r
        where r.coach_id = (select auth.uid())
          and r.client_id = tribe_posts.client_id
      )
    )
  )
  with check (
    status = 'archived'
    and archived_by = (select auth.uid())
    and archived_at is not null
    and (
      (
        author_role = 'coach'
        and author_id = (select auth.uid())
        and coach_id = (select auth.uid())
        and client_id is null
      )
      or exists (
        select 1 from public.coach_client_relations r
        where r.coach_id = (select auth.uid())
          and r.client_id = tribe_posts.client_id
      )
    )
  );

create index if not exists meal_entries_client_date_idx on public.meal_entries(client_id, meal_date desc);
create index if not exists hydration_entries_client_date_idx on public.hydration_entries(client_id, entry_date desc);
create index if not exists weekly_checkins_client_week_idx on public.weekly_checkins(client_id, week_start desc);
create index if not exists weekly_private_journals_client_week_idx on public.weekly_private_journals(client_id, week_start desc);
create index if not exists tribe_posts_coach_created_idx on public.tribe_posts(coach_id, created_at desc);
create index if not exists tribe_posts_client_created_idx on public.tribe_posts(client_id, created_at desc);

grant select, insert, update, delete on public.meal_entries to authenticated;
grant select, insert, update, delete on public.hydration_entries to authenticated;
grant select, insert, update on public.weekly_checkins to authenticated;
grant select, insert, update, delete on public.weekly_private_journals to authenticated;
grant select, insert, update, delete on public.tribe_posts to authenticated;
revoke all on public.meal_entries from anon;
revoke all on public.hydration_entries from anon;
revoke all on public.weekly_checkins from anon;
revoke all on public.weekly_private_journals from anon;
revoke all on public.tribe_posts from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reboot-weekly-photos',
  'reboot-weekly-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "clients manage own weekly photos" on storage.objects;
drop policy if exists "coaches read related weekly photos" on storage.objects;
drop policy if exists "clients select own weekly photos" on storage.objects;
drop policy if exists "clients insert own weekly photos" on storage.objects;
drop policy if exists "clients update own draft weekly photos" on storage.objects;
drop policy if exists "clients delete own draft weekly photos" on storage.objects;
drop policy if exists "coaches select related weekly photos" on storage.objects;

create policy "clients select own weekly photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reboot-weekly-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "clients insert own weekly photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reboot-weekly-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "clients update own draft weekly photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'reboot-weekly-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and not exists (
      select 1 from public.weekly_checkins w
      where w.client_id::text = (storage.foldername(storage.objects.name))[1]
        and w.week_start::text = (storage.foldername(storage.objects.name))[2]
        and w.status in ('submitted', 'locked')
    )
  )
  with check (
    bucket_id = 'reboot-weekly-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and not exists (
      select 1 from public.weekly_checkins w
      where w.client_id::text = (storage.foldername(storage.objects.name))[1]
        and w.week_start::text = (storage.foldername(storage.objects.name))[2]
        and w.status in ('submitted', 'locked')
    )
  );

create policy "clients delete own draft weekly photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'reboot-weekly-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and not exists (
      select 1 from public.weekly_checkins w
      where w.client_id::text = (storage.foldername(storage.objects.name))[1]
        and w.week_start::text = (storage.foldername(storage.objects.name))[2]
        and w.status in ('submitted', 'locked')
    )
  );

create policy "coaches select related weekly photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'reboot-weekly-photos'
    and exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = (select auth.uid())
        and r.client_id::text = (storage.foldername(name))[1]
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'tribe_posts'
    ) then
      alter publication supabase_realtime add table public.tribe_posts;
    end if;
  end if;
end $$;
