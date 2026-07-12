create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    email
  )
  values (
    new.id,
    'client',
    coalesce(nullif(new.raw_user_meta_data->>'first_name', ''), 'Utilisateur'),
    coalesce(nullif(new.raw_user_meta_data->>'last_name', ''), 'Reboot'),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
  then
    raise exception 'Le role ne peut etre modifie que par une action serveur privilegiee.';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;

create trigger prevent_profile_role_change
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles update own basic fields'
  ) then
    create policy "profiles update own basic fields" on public.profiles
      for update using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'coach_client_relations'
      and policyname = 'coach reads own relations'
  ) then
    create policy "coach reads own relations" on public.coach_client_relations
      for select using (coach_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'coach_client_relations'
      and policyname = 'client reads own relation'
  ) then
    create policy "client reads own relation" on public.coach_client_relations
      for select using (client_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'coach_client_relations'
      and policyname = 'coach inserts own relations'
  ) then
    create policy "coach inserts own relations" on public.coach_client_relations
      for insert with check (
        coach_id = auth.uid()
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'coach'
        )
        and exists (
          select 1 from public.profiles p
          where p.id = coach_client_relations.client_id and p.role = 'client'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'coach_client_relations'
      and policyname = 'coach deletes own relations'
  ) then
    create policy "coach deletes own relations" on public.coach_client_relations
      for delete using (coach_id = auth.uid());
  end if;
end $$;
