create or replace function public.is_coach_user(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = $1 and p.role = 'coach'
  );
$$;

create or replace function public.coach_owns_content(content_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.contents c
    where c.id = $1
      and c.coach_id = $2
      and public.is_coach_user($2)
  );
$$;

create or replace function public.client_can_read_content(content_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.contents c
    join public.publication_targets t on t.content_id = c.id
    left join public.client_assessments a on a.client_id = $2
    where c.id = $1
      and c.status in ('published', 'scheduled')
      and coalesce(c.publish_at, c.created_at) <= now()
      and (c.ends_at is null or c.ends_at > now())
      and exists (
        select 1 from public.coach_client_relations r
        where r.coach_id = c.coach_id and r.client_id = $2
      )
      and (
        t.mode = 'all'
        or (t.mode = 'manual' and $2 = any(t.client_ids))
        or (
          t.mode = 'profile'
          and (coalesce(array_length(t.client_ids, 1), 0) = 0 or $2 = any(t.client_ids))
          and (coalesce(array_length(t.formulas, 1), 0) = 0 or a.formula = any(t.formulas))
          and (coalesce(array_length(t.goals, 1), 0) = 0 or a.goal = any(t.goals))
          and (coalesce(array_length(t.sexes, 1), 0) = 0 or a.sex = any(t.sexes))
          and (coalesce(array_length(t.levels, 1), 0) = 0 or a.level = any(t.levels))
          and (coalesce(array_length(t.sports, 1), 0) = 0 or a.sport = any(t.sports))
          and (t.min_age is null or a.age >= t.min_age)
          and (t.max_age is null or a.age <= t.max_age)
        )
      )
  );
$$;
