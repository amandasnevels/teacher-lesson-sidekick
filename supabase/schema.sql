-- Teacher Sidekick: saved teacher setups (one row per teacher).
-- Contains only a settings pack (workspaces, widget settings, favorites, routines, theme).
-- Student names, rosters and class records are never stored here.
create table if not exists public.teacher_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pack jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.teacher_settings enable row level security;

-- Each teacher can only see and change their own row.
drop policy if exists "own settings: read" on public.teacher_settings;
create policy "own settings: read" on public.teacher_settings for select using (auth.uid() = user_id);
drop policy if exists "own settings: insert" on public.teacher_settings;
create policy "own settings: insert" on public.teacher_settings for insert with check (auth.uid() = user_id);
drop policy if exists "own settings: update" on public.teacher_settings;
create policy "own settings: update" on public.teacher_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own settings: delete" on public.teacher_settings;
create policy "own settings: delete" on public.teacher_settings for delete using (auth.uid() = user_id);
