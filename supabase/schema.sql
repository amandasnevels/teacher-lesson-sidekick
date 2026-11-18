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

-- Teachers can delete their own account (Apple requires in-app account deletion).
-- Removes the saved setup and the sign-in account; nothing else is stored.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from public.teacher_settings where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
