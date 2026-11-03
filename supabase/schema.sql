create table if not exists public.readings (
  id bigint generated always as identity primary key,
  value integer not null check (value >= 0),
  created_at timestamptz not null default now()
);

alter table public.readings enable row level security;

grant select, insert on public.readings to anon, authenticated;
revoke update, delete on public.readings from anon, authenticated;

drop policy if exists "Anyone can read sensor readings"
  on public.readings;
drop policy if exists "Anyone can insert sensor readings"
  on public.readings;

create policy "Anyone can read sensor readings"
  on public.readings
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can insert sensor readings"
  on public.readings
  for insert
  to anon, authenticated
  with check (value >= 0);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'readings'
  ) then
    alter publication supabase_realtime add table public.readings;
  end if;
end
$$;
