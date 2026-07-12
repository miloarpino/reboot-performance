create or replace function public.service_upsert_profile(
  p_id uuid,
  p_role text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_avatar_url text default '/avatars/default.svg',
  p_objective text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('coach', 'client', 'admin') then
    raise exception 'invalid role';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);

  insert into public.profiles (
    id,
    role,
    first_name,
    last_name,
    email,
    avatar_url,
    objective,
    updated_at
  )
  values (
    p_id,
    p_role,
    p_first_name,
    p_last_name,
    p_email,
    coalesce(nullif(p_avatar_url, ''), '/avatars/default.svg'),
    p_objective,
    now()
  )
  on conflict (id) do update set
    role = excluded.role,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    objective = excluded.objective,
    updated_at = now();
end;
$$;

revoke all on function public.service_upsert_profile(uuid, text, text, text, text, text, text) from public;
revoke all on function public.service_upsert_profile(uuid, text, text, text, text, text, text) from anon;
revoke all on function public.service_upsert_profile(uuid, text, text, text, text, text, text) from authenticated;
grant execute on function public.service_upsert_profile(uuid, text, text, text, text, text, text) to service_role;
