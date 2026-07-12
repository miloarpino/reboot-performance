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

drop policy if exists "coach manages own templates" on public.templates;
create policy "coach manages own templates" on public.templates
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

drop policy if exists "coach sees own notifications" on public.notifications;
create policy "coach sees own notifications" on public.notifications
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

drop policy if exists "coach manages approvals" on public.approval_requests;
create policy "coach manages approvals" on public.approval_requests
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

drop policy if exists "coach manages own recipes" on public.recipes;
create policy "coach manages own recipes" on public.recipes
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
