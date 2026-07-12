drop policy if exists "coach manages own contents" on public.contents;
create policy "coach manages own contents" on public.contents
  for all using (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  )
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

drop policy if exists "clients read targeted published contents" on public.contents;
create policy "clients read targeted published contents" on public.contents
  for select using (
    status in ('published', 'scheduled')
    and coalesce(publish_at, created_at) <= now()
    and (ends_at is null or ends_at > now())
    and exists (
      select 1
      from public.publication_targets t
      left join public.client_assessments a on a.client_id = auth.uid()
      where t.content_id = contents.id
        and exists (
          select 1 from public.coach_client_relations r
          where r.coach_id = contents.coach_id and r.client_id = auth.uid()
        )
        and (
          t.mode = 'all'
          or (t.mode = 'manual' and auth.uid() = any(t.client_ids))
          or t.mode = 'profile'
        )
        and (
          t.mode <> 'profile'
          or (
            (coalesce(array_length(t.client_ids, 1), 0) = 0 or auth.uid() = any(t.client_ids))
            and (coalesce(array_length(t.formulas, 1), 0) = 0 or a.formula = any(t.formulas))
            and (coalesce(array_length(t.goals, 1), 0) = 0 or a.goal = any(t.goals))
            and (coalesce(array_length(t.sexes, 1), 0) = 0 or a.sex = any(t.sexes))
            and (coalesce(array_length(t.levels, 1), 0) = 0 or a.level = any(t.levels))
            and (coalesce(array_length(t.sports, 1), 0) = 0 or a.sport = any(t.sports))
            and (t.min_age is null or a.age >= t.min_age)
            and (t.max_age is null or a.age <= t.max_age)
          )
        )
    )
  );

drop policy if exists "coach manages own publication targets" on public.publication_targets;
create policy "coach manages own publication targets" on public.publication_targets
  for all using (
    exists (
      select 1 from public.contents c
      join public.profiles p on p.id = auth.uid()
      where c.id = publication_targets.content_id
        and c.coach_id = auth.uid()
        and p.role = 'coach'
    )
  )
  with check (
    exists (
      select 1 from public.contents c
      join public.profiles p on p.id = auth.uid()
      where c.id = publication_targets.content_id
        and c.coach_id = auth.uid()
        and p.role = 'coach'
    )
  );

drop policy if exists "clients read visible publication targets" on public.publication_targets;
create policy "clients read visible publication targets" on public.publication_targets
  for select using (
    exists (
      select 1 from public.contents c
      left join public.client_assessments a on a.client_id = auth.uid()
      where c.id = publication_targets.content_id
        and c.status in ('published', 'scheduled')
        and coalesce(c.publish_at, c.created_at) <= now()
        and (c.ends_at is null or c.ends_at > now())
        and exists (
          select 1 from public.coach_client_relations r
          where r.coach_id = c.coach_id and r.client_id = auth.uid()
        )
        and (
          publication_targets.mode = 'all'
          or (publication_targets.mode = 'manual' and auth.uid() = any(publication_targets.client_ids))
          or (
            publication_targets.mode = 'profile'
            and (coalesce(array_length(publication_targets.client_ids, 1), 0) = 0 or auth.uid() = any(publication_targets.client_ids))
            and (coalesce(array_length(publication_targets.formulas, 1), 0) = 0 or a.formula = any(publication_targets.formulas))
            and (coalesce(array_length(publication_targets.goals, 1), 0) = 0 or a.goal = any(publication_targets.goals))
            and (coalesce(array_length(publication_targets.sexes, 1), 0) = 0 or a.sex = any(publication_targets.sexes))
            and (coalesce(array_length(publication_targets.levels, 1), 0) = 0 or a.level = any(publication_targets.levels))
            and (coalesce(array_length(publication_targets.sports, 1), 0) = 0 or a.sport = any(publication_targets.sports))
            and (publication_targets.min_age is null or a.age >= publication_targets.min_age)
            and (publication_targets.max_age is null or a.age <= publication_targets.max_age)
          )
        )
    )
  );

drop policy if exists "client updates own notifications" on public.notifications;
create policy "client updates own notifications" on public.notifications
  for update using (client_id = auth.uid())
  with check (client_id = auth.uid());
