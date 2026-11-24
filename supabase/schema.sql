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
  updated_at timestamptz not null default now(),
  -- journal = 7,99 €, backtest = Journal + Backtesting 14,99 €, pro = Blotter Pro 22,99 € (plus prop accounts),
  -- freund = free friend account (everything)
  plan text not null default 'journal',
  trial_end timestamptz
);
alter table public.subscriptions add column if not exists plan text not null default 'journal';
-- end of the free trial (kept after the trial is over, so a customer gets the trial only once)
alter table public.subscriptions add column if not exists trial_end timestamptz;
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('journal', 'backtest', 'pro', 'freund'));
update public.subscriptions set plan = 'freund' where price_id = 'freund' and plan <> 'freund';
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

-- Backtesting is part of "Journal + Backtesting" and "Pro" (and of friend accounts)
create or replace function private.has_backtest_plan() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.status in ('active', 'trialing', 'past_due') and s.plan in ('backtest', 'pro', 'freund')
  );
$$;
revoke all on function private.has_backtest_plan() from public;
revoke all on function private.has_backtest_plan() from anon;
grant execute on function private.has_backtest_plan() to authenticated;

-- Prop accounts (simulated futures and CFD accounts) are part of "Pro" (and of friend accounts)
create or replace function private.has_pro_plan() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = auth.uid() and s.status in ('active', 'trialing', 'past_due') and s.plan in ('pro', 'freund')
  );
$$;
revoke all on function private.has_pro_plan() from public;
revoke all on function private.has_pro_plan() from anon;
grant execute on function private.has_pro_plan() to authenticated;

-- 2) Journal-Einträge: Trades, Learnings, Outlooks und Einstellungen, getrennt pro Kunde
create table if not exists public.entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  id text not null check (char_length(id) between 1 and 100),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check check (kind in ('trades', 'learnings', 'outlooks', 'settings', 'backtests', 'accounts'));
alter table public.entries enable row level security;
drop policy if exists "entries: eigene lesen" on public.entries;
drop policy if exists "entries: eigene anlegen" on public.entries;
drop policy if exists "entries: eigene ändern" on public.entries;
drop policy if exists "entries: eigene löschen" on public.entries;
create policy "entries: eigene lesen" on public.entries
  for select to authenticated using (user_id = (select auth.uid()));
-- backtesting sessions ('backtests') can only be written with backtesting, prop accounts ('accounts') only with Pro;
-- reading and deleting stay open
create policy "entries: eigene anlegen" on public.entries
  for insert to authenticated with check (user_id = (select auth.uid()) and (select private.has_active_sub())
    and (kind <> 'backtests' or (select private.has_backtest_plan()))
    and (kind <> 'accounts' or (select private.has_pro_plan())));
create policy "entries: eigene ändern" on public.entries
  for update to authenticated using (user_id = (select auth.uid()) and (select private.has_active_sub()))
  with check (user_id = (select auth.uid())
    and (kind <> 'backtests' or (select private.has_backtest_plan()))
    and (kind <> 'accounts' or (select private.has_pro_plan())));
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

-- 4) Backtesting: selbst importierte Kursdaten, privat, jeder Kunde nur im eigenen Ordner
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketdata', 'marketdata', false, 10485760, array['application/octet-stream'])
on conflict (id) do nothing;
drop policy if exists "marketdata: eigene lesen" on storage.objects;
drop policy if exists "marketdata: eigene hochladen" on storage.objects;
drop policy if exists "marketdata: eigene ersetzen" on storage.objects;
drop policy if exists "marketdata: eigene löschen" on storage.objects;
create policy "marketdata: eigene lesen" on storage.objects
  for select to authenticated using (bucket_id = 'marketdata' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "marketdata: eigene hochladen" on storage.objects
  for insert to authenticated with check (bucket_id = 'marketdata' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.has_backtest_plan()));
create policy "marketdata: eigene ersetzen" on storage.objects
  for update to authenticated
  using (bucket_id = 'marketdata' and (storage.foldername(name))[1] = (select auth.uid())::text and (select private.has_backtest_plan()))
  with check (bucket_id = 'marketdata' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "marketdata: eigene löschen" on storage.objects
  for delete to authenticated using (bucket_id = 'marketdata' and (storage.foldername(name))[1] = (select auth.uid())::text);

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

-- Support requests from the help page in the journal. Only the server (service key) reads and writes them.
create table if not exists public.support_tickets (
  id bigint generated always as identity (start with 1001) primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  topic text not null check (topic in ('nutzung', 'fehler', 'abo', 'konto', 'idee', 'sonstiges')),
  subject text not null check (char_length(subject) between 3 and 140),
  message text not null check (char_length(message) between 10 and 5000),
  meta jsonb,
  mailed boolean not null default false,
  status text not null default 'offen' check (status in ('offen', 'erledigt'))
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
alter table public.support_tickets enable row level security;
revoke all on table public.support_tickets from anon, authenticated;
