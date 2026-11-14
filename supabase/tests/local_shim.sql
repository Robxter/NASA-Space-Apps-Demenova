-- ============================================================================================================
-- LOCAL TESTING ONLY. NEVER RUN ON SUPABASE (hosted projects already have all of this, managed by Supabase).
-- ============================================================================================================
-- Minimal stand-in for what a Supabase project provides and the Demenova migrations / RLS tests rely on, so
-- they can run on a plain local PostgreSQL (15+) in a throwaway database (supabase/tests/run_local.ps1).
--   * roles anon, authenticated (NOLOGIN, NOINHERIT) and service_role (NOLOGIN, NOINHERIT, BYPASSRLS);
--   * schema auth with auth.users and auth.uid() / auth.role() / auth.jwt(), reading the request.jwt.claim(s)
--     settings the way Supabase's own definitions do;
--   * Supabase's default grants on schema public: usage for the three API roles and default privileges that give
--     them ALL on every new table, sequence and function created by the migration role. This is what makes the
--     migrations' "revoke at table creation" meaningful: without it, a new table would have no client grants.
-- Roles are cluster-wide; run_local.ps1 drops them again if it created them.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

-- ---------------------------------------------------------------------------------------------------------
-- auth schema (subset)
-- ---------------------------------------------------------------------------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  instance_id   uuid,
  id            uuid primary key,
  aud           varchar(255),
  role          varchar(255),
  email         varchar(255),
  is_anonymous  boolean not null default false,
  created_at    timestamptz,
  updated_at    timestamptz
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;
-- auth.users itself is not exposed to the API roles (as on Supabase).

-- ---------------------------------------------------------------------------------------------------------
-- Supabase defaults on schema public
-- ---------------------------------------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
