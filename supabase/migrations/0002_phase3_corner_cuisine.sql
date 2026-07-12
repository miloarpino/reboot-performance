create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null,
  objective text not null,
  formulas text[] not null default '{}',
  goals text[] not null default '{}',
  calories integer not null check (calories > 0),
  protein integer not null check (protein >= 0),
  carbs integer not null check (carbs >= 0),
  fat integer not null check (fat >= 0),
  portions integer not null default 1 check (portions > 0),
  prep_minutes integer not null default 0,
  cook_minutes integer not null default 0,
  difficulty text not null default 'facile',
  allergens text[] not null default '{}',
  diet_tags text[] not null default '{}',
  sports text[] not null default '{}',
  preference_tags text[] not null default '{}',
  min_age integer not null default 16,
  max_age integer not null default 90,
  compatible_with_loss_plan boolean not null default false,
  max_calories_for_loss integer,
  min_protein integer not null default 0,
  image_path text,
  image_alt text not null default '',
  coach_tip text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text not null,
  position integer not null default 0
);

create table if not exists public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  body text not null,
  position integer not null default 0
);

create table if not exists public.recipe_assignments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recipe_id, client_id)
);

create table if not exists public.recipe_favorites (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (recipe_id, client_id)
);

create index if not exists recipes_coach_idx on public.recipes(coach_id);
create index if not exists recipes_formulas_idx on public.recipes using gin(formulas);
create index if not exists recipes_goals_idx on public.recipes using gin(goals);
create index if not exists recipes_diet_tags_idx on public.recipes using gin(diet_tags);
create index if not exists recipe_assignments_client_idx on public.recipe_assignments(client_id);
create index if not exists recipe_favorites_client_idx on public.recipe_favorites(client_id);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_assignments enable row level security;
alter table public.recipe_favorites enable row level security;

create policy "coach manages own recipes" on public.recipes
  for all using (coach_id = auth.uid());

create policy "client reads coach recipes through relation" on public.recipes
  for select using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = recipes.coach_id and r.client_id = auth.uid()
    )
  );

create policy "recipe ingredients follow recipe access" on public.recipe_ingredients
  for select using (
    exists (
      select 1 from public.recipes recipes
      where recipes.id = recipe_ingredients.recipe_id
      and (
        recipes.coach_id = auth.uid()
        or exists (
          select 1 from public.coach_client_relations r
          where r.coach_id = recipes.coach_id and r.client_id = auth.uid()
        )
      )
    )
  );

create policy "recipe steps follow recipe access" on public.recipe_steps
  for select using (
    exists (
      select 1 from public.recipes recipes
      where recipes.id = recipe_steps.recipe_id
      and (
        recipes.coach_id = auth.uid()
        or exists (
          select 1 from public.coach_client_relations r
          where r.coach_id = recipes.coach_id and r.client_id = auth.uid()
        )
      )
    )
  );

create policy "coach manages recipe assignments" on public.recipe_assignments
  for all using (
    exists (
      select 1 from public.coach_client_relations r
      where r.coach_id = auth.uid() and r.client_id = recipe_assignments.client_id
    )
  );

create policy "client reads own recipe assignments" on public.recipe_assignments
  for select using (client_id = auth.uid());

create policy "client manages own recipe favorites" on public.recipe_favorites
  for all using (client_id = auth.uid());
