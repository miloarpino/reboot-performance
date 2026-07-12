alter table public.profiles
  add column if not exists avatar_url text not null default '/avatars/default.svg',
  add column if not exists objective text;

create index if not exists profiles_email_idx on public.profiles(email);
