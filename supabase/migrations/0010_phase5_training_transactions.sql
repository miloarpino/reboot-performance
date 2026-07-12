drop function if exists public.apply_ai_training_recommendation(uuid, uuid);
create function public.apply_ai_training_recommendation(p_recommendation_id uuid, p_coach_id uuid)
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
  target_workout_id uuid;
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

  if rec.type <> 'training' then
    raise exception 'only training recommendations are supported by this transaction';
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

  next_values := coalesce(rec.coach_edit, rec.proposed_change);
  target_workout_id := nullif(next_values->>'workout_id', '')::uuid;

  if target_workout_id is not null then
    select to_jsonb(w.*) into before_row
    from public.workouts w
    where w.id = target_workout_id
      and w.coach_id = p_coach_id
      and w.client_id = rec.client_id
    for update;

    if before_row is null then
      raise exception 'target workout not found';
    end if;

    update public.workouts
    set title = coalesce(next_values->>'title', title),
        focus = coalesce(next_values->>'focus', focus),
        scheduled_for = coalesce((next_values->>'scheduled_for')::date, scheduled_for),
        duration_minutes = coalesce((next_values->>'duration_minutes')::integer, duration_minutes),
        exercises = coalesce(array(select jsonb_array_elements_text(next_values->'exercises')), exercises),
        notes = coalesce(next_values->>'notes', notes),
        feedback = feedback || jsonb_build_object(
          'ai_training_details',
          coalesce(next_values->'training_details', '{}'::jsonb)
        ),
        updated_at = now()
    where id = target_workout_id;
  else
    insert into public.workouts (
      coach_id,
      client_id,
      title,
      focus,
      scheduled_for,
      duration_minutes,
      exercises,
      notes,
      status,
      feedback
    )
    values (
      rec.coach_id,
      rec.client_id,
      coalesce(next_values->>'title', 'Seance IA'),
      coalesce(next_values->>'focus', 'adaptation IA'),
      coalesce((next_values->>'scheduled_for')::date, current_date),
      coalesce((next_values->>'duration_minutes')::integer, 45),
      coalesce(array(select jsonb_array_elements_text(next_values->'exercises')), '{}'),
      coalesce(next_values->>'notes', ''),
      'planned',
      jsonb_build_object('ai_training_details', coalesce(next_values->'training_details', '{}'::jsonb))
    )
    returning id into target_workout_id;

    before_row := null;
  end if;

  select to_jsonb(w.*) into after_row
  from public.workouts w
  where w.id = target_workout_id;

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
    'training.update',
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
    'ai.training.applied',
    rec.id,
    rec.justification,
    before_row,
    after_row
  );

  return action_id;
end;
$$;

drop function if exists public.restore_ai_training_action(uuid, uuid);
create function public.restore_ai_training_action(p_action_id uuid, p_coach_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  action_row public.ai_actions%rowtype;
  restored jsonb;
  rollback_id uuid;
  target_workout_id uuid;
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

  if action_row.status <> 'applied' or action_row.action_type <> 'training.update' then
    raise exception 'action cannot be restored';
  end if;

  target_workout_id := (action_row.after_data->>'id')::uuid;

  if action_row.before_data is null then
    delete from public.workouts
    where id = target_workout_id
      and coach_id = action_row.coach_id
      and client_id = action_row.client_id;
    restored := null;
  else
    update public.workouts
    set title = action_row.before_data->>'title',
        focus = action_row.before_data->>'focus',
        scheduled_for = (action_row.before_data->>'scheduled_for')::date,
        duration_minutes = (action_row.before_data->>'duration_minutes')::integer,
        exercises = coalesce(array(select jsonb_array_elements_text(action_row.before_data->'exercises')), '{}'),
        notes = action_row.before_data->>'notes',
        status = action_row.before_data->>'status',
        feedback = coalesce(action_row.before_data->'feedback', '{}'::jsonb),
        updated_at = now()
    where id = target_workout_id
      and coach_id = action_row.coach_id
      and client_id = action_row.client_id;

    select to_jsonb(w.*) into restored
    from public.workouts w
    where w.id = target_workout_id;
  end if;

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
    'Restauration entrainement IA'
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
    'ai.training.reverted',
    action_row.recommendation_id,
    'Restauration entrainement IA',
    action_row.after_data,
    restored
  );

  return rollback_id;
end;
$$;
