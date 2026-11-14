-- Demenova schema, migration 4 of 6: backend-only tables (email log, Telegram subscribers).
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent. No data.
-- Contracts: docs/contracts/schemas/entities/{email_log,telegram_subscriber}.schema.json.
-- Service role only: RLS on, every client privilege revoked, no policy (migration 5 grants nothing here).

create table if not exists public.email_log (
  id             text primary key check (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  unit_id        text not null check (private.unit_farm_id(unit_id) is not null),
  -- Derived from unit_id; not a contract field. Deliberately no foreign key: the log outlives a deleted farm,
  -- so deleting and re-creating a farm cannot erase the record of emails already sent.
  farm_id        text generated always as (private.unit_farm_id(unit_id)) stored not null,
  episode_start  timestamptz not null,
  -- Hash of the recipient; the address itself is never stored here.
  to_hash        text not null check (btrim(to_hash) <> ''),
  provider_id    text,
  status         text not null check (status in ('queued', 'sent', 'failed')),
  created_at     timestamptz not null default now()
);
comment on table public.email_log is 'EmailLog (CONTRACTS.md §3). Service role only.';
alter table public.email_log enable row level security;
revoke all on table public.email_log from public, anon, authenticated;

create index if not exists email_log_farm_created_idx on public.email_log (farm_id, created_at);
create index if not exists email_log_unit_episode_idx on public.email_log (unit_id, episode_start);

-- PENDING.md P-002 option (b): a subscription names the farm's random telegram_code (from /start <code>), not
-- the guessable farm id. The composite key ties the code to its farm; a code the farm no longer has is invalid.
create table if not exists public.telegram_subscribers (
  -- Telegram chat id, hashed or encrypted by the backend where possible.
  chat_id        text not null check (btrim(chat_id) <> ''),
  farm_id        text not null,
  -- Contract addition (P-002 b): the code the chat subscribed with.
  telegram_code  text not null,
  started_at     timestamptz not null default now(),
  active         boolean not null default true,
  primary key (chat_id, farm_id),
  -- No ON UPDATE action: rotating a leaked code fails while subscriptions exist, so the backend must first
  -- delete (or re-confirm) them. Rotation never silently keeps an intruder subscribed.
  constraint telegram_subscribers_farm_code_fkey foreign key (farm_id, telegram_code)
    references public.farms (id, telegram_code) on delete cascade
);
comment on table public.telegram_subscribers is 'TelegramSubscriber (CONTRACTS.md §3) + telegram_code. Service role only.';
alter table public.telegram_subscribers enable row level security;
revoke all on table public.telegram_subscribers from public, anon, authenticated;

create index if not exists telegram_subscribers_farm_code_idx on public.telegram_subscribers (farm_id, telegram_code);
create index if not exists telegram_subscribers_farm_active_idx on public.telegram_subscribers (farm_id) where active;
