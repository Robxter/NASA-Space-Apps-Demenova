-- Demenova schema, migration 4 of 6: backend-only tables (email log, Telegram subscribers).
-- Owner: database-engineer (T-015). Class A (PENDING.md P-009). Idempotent. No data.
-- Contracts: docs/contracts/schemas/entities/{email_log,telegram_subscriber}.schema.json.
-- Service role only: no client role can read or write these tables (migration 5 revokes and adds no policy).

create table if not exists public.email_log (
  id             text primary key check (id ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  unit_id        text not null check (private.unit_farm_id(unit_id) is not null),
  -- Derived from unit_id; not a contract field.
  farm_id        text generated always as (private.unit_farm_id(unit_id)) stored not null
                 references public.farms (id) on delete cascade,
  episode_start  timestamptz not null,
  -- Hash of the recipient; the address itself is never stored here.
  to_hash        text not null check (btrim(to_hash) <> ''),
  provider_id    text,
  status         text not null check (status in ('queued', 'sent', 'failed')),
  created_at     timestamptz not null default now()
);
comment on table public.email_log is 'EmailLog (CONTRACTS.md §3). Service role only.';

create index if not exists email_log_farm_created_idx on public.email_log (farm_id, created_at);
create index if not exists email_log_unit_episode_idx on public.email_log (unit_id, episode_start);

-- PENDING.md P-002 option (a): the Telegram farm code is the farm id for v0 (no separate code column).
create table if not exists public.telegram_subscribers (
  -- Telegram chat id, hashed or encrypted by the backend where possible.
  chat_id     text not null check (btrim(chat_id) <> ''),
  farm_id     text not null references public.farms (id) on delete cascade,
  started_at  timestamptz not null default now(),
  active      boolean not null default true,
  primary key (chat_id, farm_id)
);
comment on table public.telegram_subscribers is 'TelegramSubscriber (CONTRACTS.md §3). Service role only.';

create index if not exists telegram_subscribers_farm_active_idx on public.telegram_subscribers (farm_id) where active;
