-- Blotter: Datenbank-Schema für Supabase (Stand: wie im Projekt "blotter" eingespielt).
-- Kann gefahrlos erneut ausgeführt werden.

-- 1) Abos: wird ausschließlich vom Server (Stripe-Webhook) geschrieben
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text not null default 'none',
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  consent_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "subs: eigenes Abo lesen" on public.subscriptions;
create policy "subs: eigenes Abo lesen" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- Aktives Abo? Liegt im nicht öffentlichen Schema "private", damit es nicht per API aufrufbar ist.
create schema if not exists private;
grant usage on schema private to authenticated;
create or replace function private.has_active_sub() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.status in ('active', 'trialing', 'past_due')
  );
$$;
revoke all on function private.has_active_sub() from public;
revoke all on function private.has_active_sub() from anon;
grant execute on function private.has_active_sub() to authenticated;

-- 2) Journal-Einträge: Trades, Learnings, Outlooks und Einstellungen, getrennt pro Kunde
create table if not exists public.entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('trades', 'learnings', 'outlooks', 'settings')),
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table public.entries enable row level security;
drop policy if exists "entries: eigene lesen" on public.entries;
drop policy if exists "entries: eigene anlegen" on public.entries;
drop policy if exists "entries: eigene ändern" on public.entries;
drop policy if exists "entries: eigene löschen" on public.entries;
create policy "entries: eigene lesen" on public.entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "entries: eigene anlegen" on public.entries
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.has_active_sub()));
create policy "entries: eigene ändern" on public.entries
  for update to authenticated using (user_id = (select auth.uid()) and (select private.has_active_sub())) with check (user_id = (select auth.uid()));
create policy "entries: eigene löschen" on public.entries
  for delete to authenticated using (user_id = (select auth.uid()) and (select private.has_active_sub()));

-- Live-Abgleich zwischen Geräten
do $$ begin
  alter publication supabase_realtime add table public.entries;
exception when duplicate_object then null; end $$;

-- 3) Screenshots: privater Speicher, jeder Kunde nur im eigenen Ordner
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shots', 'shots', false, 20971520, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "shots: eigene lesen" on storage.objects;
drop policy if exists "shots: eigene hochladen" on storage.objects;
drop policy if exists "shots: eigene löschen" on storage.objects;
create policy "shots: eigene lesen" on storage.objects
  for select to authenticated using (bucket_id = 'shots' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "shots: eigene hochladen" on storage.objects
  for insert to authenticated with check (bucket_id = 'shots' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.has_active_sub()));
create policy "shots: eigene löschen" on storage.objects
  for delete to authenticated using (bucket_id = 'shots' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Zustellprotokoll der Anmelde-E-Mails (nur Server mit Service-Key, Einträge werden nach 30 Tagen gelöscht)
create table if not exists public.mail_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rid text,
  email text not null default '',
  kind text not null default 'login',
  resend_id text unique,
  status text not null default 'sent',
  detail text
);
create index if not exists mail_log_rid_idx on public.mail_log (rid);
create index if not exists mail_log_created_idx on public.mail_log (created_at);
alter table public.mail_log enable row level security;
revoke all on table public.mail_log from anon, authenticated;
