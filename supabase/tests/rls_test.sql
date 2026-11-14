-- Demenova RLS and constraint tests (T-015). Plain SQL, no extension needed.
-- Run after the six migrations, in the Supabase SQL editor (paste the whole file, Run) or with
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Pass: the script ends without error (SQL editor: "Success. No rows returned"; psql: exit code 0 and
-- NOTICE lines "PASS ..."). Fail: an error "FAIL <check>: ...". If it fails in the SQL editor, run `rollback;` once.
-- Everything runs in one transaction that is rolled back: the fixtures never persist and are never shown.
-- Fixtures are test-only rows at coordinates [0, 0]; numbers are null or 0 wherever the schema allows.
-- Not for `supabase test db` (that runner expects pgTAP output).

begin;

-- ---------------------------------------------------------------------------------------------------------
-- Fixtures (run as the table owner, which bypasses RLS). A = ...a1, B = ...b1 (anonymous sign-in users).
-- ---------------------------------------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', true, now(), now());

insert into public.farms (id, name, owner_id, location, data_level, crop, variety, variety_origin,
                          language, units, mode, storage_mode, is_demo, origin)
select v.id, v.name, v.owner_id::uuid, '{"type":"Point","coordinates":[0,0]}'::jsonb, 2, 'banana', null, 'pending',
       'es', 'metric', 'farmer', 'full', v.is_demo, '"synthetic"'::jsonb
from (values ('farm_rlstest-demo', 'RLS test demo', null, true),
             ('farm_rlstest-a-aaaaaa', 'RLS test A', '00000000-0000-4000-8000-0000000000a1', false),
             ('farm_rlstest-b-bbbbbb', 'RLS test B', '00000000-0000-4000-8000-0000000000b1', false))
     as v(id, name, owner_id, is_demo);

insert into public.lots (id, farm_id, name, geometry,
  area_ha_origin, plant_age_months_origin, variety_origin, drainage_class_origin, drainage_works_origin,
  cover_crop_origin, last_soil_analysis_origin, nematode_incidence_origin, bioinputs_origin,
  defined_by, to_be_redefined_by, origin)
select v.id, v.farm_id, v.name,
  '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}'::jsonb,
  'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
  'rls-test', 'rls-test', '"synthetic"'::jsonb
from (values ('lot_rlstest-demo_1', 'farm_rlstest-demo', 'Demo 1'),
             ('lot_rlstest-a-aaaaaa_1', 'farm_rlstest-a-aaaaaa', 'A 1'),
             ('lot_rlstest-b-bbbbbb_1', 'farm_rlstest-b-bbbbbb', 'B 1')) as v(id, farm_id, name);

insert into public.zones (id, farm_id, tercile, twi_range, origin, geometry)
select v.id, v.farm_id, 'low', '{0,0}', 'calibrated',
  '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}'::jsonb
from (values ('zone_rlstest-demo_low', 'farm_rlstest-demo'),
             ('zone_rlstest-b-bbbbbb_low', 'farm_rlstest-b-bbbbbb')) as v(id, farm_id);

insert into public.alert_states (unit_id, level, w, factors, since, updated_at, newest_rain_data_at,
                                 confirmations, confidence, side, origin)
select u, 'normal', null, '[]', now(), now(), null, 0, 0, '{"sigatoka":null,"cold":null}', '"synthetic"'
from unnest(array['lot_rlstest-demo_1', 'lot_rlstest-b-bbbbbb_1']) as u;

insert into public.daily_features (unit_id, date, percentiles, origin)
select u, date '2026-01-01', '{"upstream":null,"saturation":null,"local":null,"balance":null}', '"synthetic"'
from unnest(array['lot_rlstest-demo_1', 'lot_rlstest-b-bbbbbb_1']) as u;

insert into public.alert_events (id, unit_id, from_level, to_level, w, factors, at, origin) values
  ('00000000000000000000000001', 'lot_rlstest-demo_1', 'normal', 'watch', null, '[]', now(), '"synthetic"'),
  ('00000000000000000000000002', 'lot_rlstest-b-bbbbbb_1', 'normal', 'watch', null, '[]', now(), '"synthetic"');

insert into public.field_notes (id, lot_id, kind, date, value_json, origin) values
  ('rlstest-note-demo', 'lot_rlstest-demo_1', 'other', date '2026-01-01', '{}', 'synthetic'),
  ('rlstest-note-b', 'lot_rlstest-b-bbbbbb_1', 'other', date '2026-01-01', '{}', 'synthetic');

insert into public.flood_memories (id, farm_id, date_or_month, reported_by) values
  ('rlstest-mem-demo', 'farm_rlstest-demo', '2026-01', 'rls-test'),
  ('rlstest-mem-b', 'farm_rlstest-b-bbbbbb', '2026-01', 'rls-test');

insert into public.strategies (strategy_id, lot_scope, label, what, why, benefits, gaps, risks, scores, origin)
select v.sid, v.scope, 'A', t, t, t, t, t, s, 'synthetic'
from (values ('rls_test_regional', array['*']),
             ('rls_test_demo', array['lot_rlstest-demo_1']),
             ('rls_test_b', array['lot_rlstest-b-bbbbbb_1'])) as v(sid, scope),
     (select '{"es":"prueba","en":null}'::jsonb as t,
             '{"soil":{"origin":"pending","value":null},"water":{"origin":"pending","value":null},
               "cost":{"origin":"pending","value":null},"labour":{"origin":"pending","value":null}}'::jsonb as s) c;

insert into public.email_log (id, unit_id, episode_start, to_hash, provider_id, status) values
  ('00000000000000000000000003', 'lot_rlstest-b-bbbbbb_1', now(), 'rls-test-hash', null, 'sent');
insert into public.telegram_subscribers (chat_id, farm_id, telegram_code)
select 'rls-test-chat', id, telegram_code from public.farms where id = 'farm_rlstest-demo';
insert into public.user_prefs (user_id, device_id, language, units, mode, storage_mode, theme) values
  ('00000000-0000-4000-8000-0000000000b1', 'rls-test-device-b', 'es', 'metric', 'farmer', 'full', 'system');

-- ---------------------------------------------------------------------------------------------------------
-- Constraints mirror the contracts and the review fixes (run as owner)
-- ---------------------------------------------------------------------------------------------------------
do $$ declare n bigint; begin
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_rlstest-bad', 'x', null, '{"type":"Point"}', 0, 'banana', 'pending', 'es', 'metric', 'farmer',
            'full', true, '"synthetic"');
    raise exception 'FAIL c1: a Point without coordinates was accepted';
  exception when check_violation then raise notice 'PASS c1 Point without coordinates rejected';
  end;
  begin
    update public.lots set area_ha = 5 where id = 'lot_rlstest-a-aaaaaa_1';  -- origin still 'pending'
    raise exception 'FAIL c2: a value with origin pending was accepted';
  exception when check_violation then raise notice 'PASS c2 value with pending origin rejected';
  end;
  begin
    update public.lots set area_ha = 'NaN', area_ha_origin = 'synthetic' where id = 'lot_rlstest-a-aaaaaa_1';
    raise exception 'FAIL c3: NaN was accepted';
  exception when check_violation then raise notice 'PASS c3 NaN rejected';
  end;
  begin
    update public.alert_states set origin = '"invented"' where unit_id = 'lot_rlstest-b-bbbbbb_1';
    raise exception 'FAIL c4: an unknown origin was accepted';
  exception when check_violation then raise notice 'PASS c4 unknown origin rejected';
  end;
  begin
    insert into public.strategies (strategy_id, lot_scope, label, what, why, benefits, gaps, risks, scores, origin)
    values ('rls_test_bad', array['*'], 'A', '{"es":"x","en":null}', '{"es":"x","en":null}', '{"es":"x","en":null}',
            '{"es":"x","en":null}', '{"es":"x","en":null}', '{"soil":{"origin":"pending","value":null}}', 'synthetic');
    raise exception 'FAIL c5: strategy scores missing keys were accepted';
  exception when check_violation then raise notice 'PASS c5 incomplete scores rejected';
  end;
  begin
    insert into public.daily_features (unit_id, date, percentiles, origin)
    values ('lot_rlstest-a-aaaaaa_9', date '2026-01-01',
            '{"upstream":null,"saturation":null,"local":null,"balance":null}', '"synthetic"');
    raise exception 'FAIL c6: a feature for a missing lot was accepted';
  exception when foreign_key_violation then raise notice 'PASS c6 feature for unknown lot rejected';
  end;
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_nosfx', 'x', '00000000-0000-4000-8000-0000000000a1', '{"type":"Point","coordinates":[0,0]}',
            0, 'banana', 'pending', 'es', 'metric', 'farmer', 'full', false, '"provided"');
    raise exception 'FAIL c7: a user farm id without random suffix was accepted';
  exception when check_violation then raise notice 'PASS c7 user farm id needs a random suffix';
  end;
  begin
    insert into public.flood_memories (id, farm_id, date_or_month, reported_by, matched_event_id)
    values ('rlstest-mem-cross', 'farm_rlstest-a-aaaaaa', '2026-01', 'rls-test', '00000000000000000000000002');
    raise exception 'FAIL c8: a memory matched an event of another farm';
  exception when foreign_key_violation then raise notice 'PASS c8 memory matches only its own farm''s events';
  end;
  begin
    insert into public.telegram_subscribers (chat_id, farm_id, telegram_code)
    values ('rls-test-chat-2', 'farm_rlstest-demo', 'wrongcode0000000wrongcode0000000');
    raise exception 'FAIL c9: a subscription with a wrong code was accepted';
  exception when foreign_key_violation then raise notice 'PASS c9 subscription needs the farm''s code';
  end;
  select count(distinct telegram_code) into n from public.farms
  where id like 'farm\_rlstest-%' and telegram_code ~ '^[0-9a-f]{32}$';
  if n <> 3 then raise exception 'FAIL c10: telegram codes are not 3 distinct random values (%)', n; end if;
  raise notice 'PASS c10 telegram codes generated and distinct';
  begin
    update public.lots set bioinputs = '{"mycorrhizae_last":"2026-02-30","mm_last":null}', bioinputs_origin = 'provided'
    where id = 'lot_rlstest-a-aaaaaa_1';
    raise exception 'FAIL c11: an impossible date was accepted';
  exception when check_violation then raise notice 'PASS c11 impossible date rejected';
  end;
  begin
    update public.strategies set what = '{"es":5,"en":null}' where strategy_id = 'rls_test_regional';
    raise exception 'FAIL c12: a non-string localized text was accepted';
  exception when check_violation then raise notice 'PASS c12 localized text must be text';
  end;
  begin
    delete from public.farms where id = 'farm_rlstest-b-bbbbbb';
    select count(*) into n from public.email_log where id = '00000000000000000000000003';
    if n <> 1 then raise exception 'FAIL c13: deleting a farm erased its email log'; end if;
    raise exception using errcode = 'DMRB1', message = 'undo delete';
  exception when sqlstate 'DMRB1' then raise notice 'PASS c13 email log outlives its farm';
  end;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- anon (no sign-in): reads the demo farm only, writes nothing, sees no service table
-- ---------------------------------------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$ declare n bigint; begin
  select count(*) into n from public.farms where id like 'farm\_rlstest-%';
  if n <> 1 then raise exception 'FAIL a1: anon sees % test farms, expected 1 (demo)', n; end if;
  select count(*) into n from public.lots where farm_id like 'farm\_rlstest-%';
  if n <> 1 then raise exception 'FAIL a2: anon sees % test lots, expected 1', n; end if;
  select count(*) into n from public.v_farm_status where farm_id like 'farm\_rlstest-%';
  if n <> 1 then raise exception 'FAIL a3: anon sees % status rows, expected 1', n; end if;
  select count(*) into n from public.v_lot_history_7d where farm_id like 'farm\_rlstest-%';
  if n <> 1 then raise exception 'FAIL a4: anon sees % 7-day rows, expected 1', n; end if;
  select count(*) into n from public.v_alert_log where farm_id like 'farm\_rlstest-%';
  if n <> 1 then raise exception 'FAIL a5: anon sees % alert log rows, expected 1', n; end if;
  select count(*) into n from public.zones where farm_id like 'farm\_rlstest-%';
  if n <> 1 then raise exception 'FAIL a6: anon sees % zones, expected 1', n; end if;
  select count(*) into n from public.strategies where strategy_id like 'rls\_test\_%';
  if n <> 2 then raise exception 'FAIL a7: anon sees % strategies, expected 2 (regional + demo)', n; end if;
  select count(*) into n from public.field_notes where id like 'rlstest-%';
  if n <> 1 then raise exception 'FAIL a8: anon sees % field notes, expected 1', n; end if;
  select count(*) into n from public.flood_memories where id like 'rlstest-%';
  if n <> 1 then raise exception 'FAIL a9: anon sees % flood memories, expected 1', n; end if;
  select count(*) into n from public.farms where id = 'farm_rlstest-demo' and telegram_code is not null;
  if n <> 1 then raise exception 'FAIL a10: anon cannot read the demo telegram code'; end if;
  raise notice 'PASS a1-a10 anon reads demo only (incl. demo telegram code)';

  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, origin)
    values ('farm_rlstest-anon-zzzzzz', 'x', null, '{"type":"Point","coordinates":[0,0]}', 0, 'banana', 'pending',
            'es', 'metric', 'farmer', 'full', '"synthetic"');
    raise exception 'FAIL a11: anon inserted a farm';
  exception when insufficient_privilege then raise notice 'PASS a11 anon cannot insert farms';
  end;
  begin
    update public.farms set name = 'hacked' where id = 'farm_rlstest-demo';
    raise exception 'FAIL a12: anon updated the demo farm';
  exception when insufficient_privilege then raise notice 'PASS a12 anon cannot update farms';
  end;
  begin
    delete from public.alert_states where unit_id = 'lot_rlstest-demo_1';
    raise exception 'FAIL a13: anon deleted an alert state';
  exception when insufficient_privilege then raise notice 'PASS a13 anon cannot delete alert states';
  end;
  begin
    insert into public.daily_features (unit_id, date, percentiles, origin)
    values ('lot_rlstest-demo_1', date '2026-01-02',
            '{"upstream":null,"saturation":null,"local":null,"balance":null}', '"synthetic"');
    raise exception 'FAIL a14: anon inserted a daily feature';
  exception when insufficient_privilege then raise notice 'PASS a14 anon cannot insert features';
  end;
  begin
    perform 1 from public.email_log;
    raise exception 'FAIL a15: anon read email_log';
  exception when insufficient_privilege then raise notice 'PASS a15 anon cannot read email_log';
  end;
  begin
    perform 1 from public.telegram_subscribers;
    raise exception 'FAIL a16: anon read telegram_subscribers';
  exception when insufficient_privilege then raise notice 'PASS a16 anon cannot read telegram_subscribers';
  end;
  begin
    perform 1 from public.user_prefs;
    raise exception 'FAIL a17: anon read user_prefs';
  exception when insufficient_privilege then raise notice 'PASS a17 anon cannot read user_prefs';
  end;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- user A (anonymous sign-in, role authenticated): demo + own rows; never user B's rows
-- ---------------------------------------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","is_anonymous":true}';

do $$ declare n bigint; begin
  -- reads
  select count(*) into n from public.farms where id like 'farm\_rlstest-%';
  if n <> 2 then raise exception 'FAIL u1: A sees % test farms, expected 2 (demo + A)', n; end if;
  select count(*) into n from public.farms where id = 'farm_rlstest-b-bbbbbb';
  if n <> 0 then raise exception 'FAIL u2: A can read B''s farm (and its telegram code)'; end if;
  select count(*) into n from public.lots where id = 'lot_rlstest-b-bbbbbb_1';
  if n <> 0 then raise exception 'FAIL u3: A can read B''s lot'; end if;
  select count(*) into n from public.v_farm_status where farm_id = 'farm_rlstest-b-bbbbbb';
  if n <> 0 then raise exception 'FAIL u4: A can read B''s status'; end if;
  select count(*) into n from public.v_lot_history_90d where farm_id = 'farm_rlstest-b-bbbbbb';
  if n <> 0 then raise exception 'FAIL u5: A can read B''s history'; end if;
  select count(*) into n from public.v_alert_log where farm_id = 'farm_rlstest-b-bbbbbb';
  if n <> 0 then raise exception 'FAIL u6: A can read B''s alert log'; end if;
  select count(*) into n from public.user_prefs;
  if n <> 0 then raise exception 'FAIL u7: A can read B''s preferences'; end if;
  select count(*) into n from public.zones where farm_id = 'farm_rlstest-b-bbbbbb';
  if n <> 0 then raise exception 'FAIL u8: A can read B''s zones'; end if;
  select count(*) into n from public.strategies where strategy_id = 'rls_test_b';
  if n <> 0 then raise exception 'FAIL u9: A can read B''s strategies'; end if;
  select count(*) into n from public.field_notes where id = 'rlstest-note-b';
  if n <> 0 then raise exception 'FAIL u10: A can read B''s field notes'; end if;
  select count(*) into n from public.flood_memories where id = 'rlstest-mem-b';
  if n <> 0 then raise exception 'FAIL u11: A can read B''s flood memories'; end if;
  select count(*) into n from public.farms where id = 'farm_rlstest-a-aaaaaa' and telegram_code is not null;
  if n <> 1 then raise exception 'FAIL u12: A cannot read its own telegram code'; end if;
  raise notice 'PASS u1-u12 A reads demo and own rows, never B''s';

  -- positive writes on own rows
  insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                            storage_mode, origin)
  values ('farm_rlstest-a2-aaaaaa', 'A second', '00000000-0000-4000-8000-0000000000a1',
          '{"type":"Point","coordinates":[0,0]}', 0, 'banana', 'pending', 'es', 'metric', 'farmer', 'saver', '"provided"');
  update public.farms set name = 'RLS test A renamed' where id = 'farm_rlstest-a-aaaaaa';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL u13: A could not update its own farm'; end if;
  insert into public.lots (id, farm_id, name, geometry, area_ha_origin, plant_age_months_origin, variety_origin,
    drainage_class_origin, drainage_works_origin, cover_crop_origin, last_soil_analysis_origin,
    nematode_incidence_origin, bioinputs_origin, defined_by, to_be_redefined_by, origin)
  values ('lot_rlstest-a-aaaaaa_2', 'farm_rlstest-a-aaaaaa', 'A 2',
    '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}',
    'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
    'rls-test', null, '"provided"');
  insert into public.field_notes (id, lot_id, kind, date, value_json, origin)
  values ('rlstest-note-a', 'lot_rlstest-a-aaaaaa_2', 'other', date '2026-01-01', '{}', 'provided');
  insert into public.flood_memories (id, farm_id, date_or_month, reported_by)
  values ('rlstest-mem-a', 'farm_rlstest-a-aaaaaa', '2026-01', 'rls-test');
  insert into public.user_prefs (user_id, device_id, language, units, mode, storage_mode, theme)
  values ('00000000-0000-4000-8000-0000000000a1', 'rls-test-device-a', 'en', 'imperial', 'agronomist', 'saver', 'dark');
  raise notice 'PASS u13-u18 A writes its own farm, lot, note, memory and preferences';

  -- denied writes (privilege or policy)
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, origin)
    values ('farm_rlstest-forged-zzzzzz', 'x', '00000000-0000-4000-8000-0000000000b1',
            '{"type":"Point","coordinates":[0,0]}', 0, 'banana', 'pending', 'es', 'metric', 'farmer', 'full', '"provided"');
    raise exception 'FAIL u19: A created a farm owned by B';
  exception when insufficient_privilege then raise notice 'PASS u19 A cannot create a farm for B';
  end;
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_rlstest-fakedemo', 'x', null, '{"type":"Point","coordinates":[0,0]}',
            0, 'banana', 'pending', 'es', 'metric', 'farmer', 'full', true, '"provided"');
    raise exception 'FAIL u20: A created a demo farm';
  exception when insufficient_privilege then raise notice 'PASS u20 A cannot create a demo farm';
  end;
  begin
    update public.farms set owner_id = '00000000-0000-4000-8000-0000000000b1' where id = 'farm_rlstest-a-aaaaaa';
    raise exception 'FAIL u21: A gave its farm to B';
  exception when insufficient_privilege then raise notice 'PASS u21 A cannot reassign ownership';
  end;
  begin
    update public.farms set is_demo = true, owner_id = null where id = 'farm_rlstest-a-aaaaaa';
    raise exception 'FAIL u22: A turned its farm into a demo farm';
  exception when insufficient_privilege then raise notice 'PASS u22 A cannot make a farm public demo';
  end;
  begin
    update public.farms set telegram_code = 'chosen0000000000chosen0000000000' where id = 'farm_rlstest-a-aaaaaa';
    raise exception 'FAIL u23: A wrote a telegram code';
  exception when insufficient_privilege then raise notice 'PASS u23 A cannot write telegram_code';
  end;
  begin
    update public.farms set alert_email = 'someone@example.com' where id = 'farm_rlstest-a-aaaaaa';
    raise exception 'FAIL u24: A wrote alert_email';
  exception when insufficient_privilege then raise notice 'PASS u24 A cannot write alert_email';
  end;
  begin
    update public.lots set twi_mean = 1 where id = 'lot_rlstest-a-aaaaaa_2';
    raise exception 'FAIL u25: A wrote an engine TWI value';
  exception when insufficient_privilege then raise notice 'PASS u25 A cannot write lots.twi_*';
  end;
  begin
    update public.flood_memories set matched_event_id = '00000000000000000000000001' where id = 'rlstest-mem-a';
    raise exception 'FAIL u26: A wrote matched_event_id';
  exception when insufficient_privilege then raise notice 'PASS u26 A cannot write matched_event_id';
  end;
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, origin)
    values ('farm_rlstest-squat', 'x', '00000000-0000-4000-8000-0000000000a1', '{"type":"Point","coordinates":[0,0]}',
            0, 'banana', 'pending', 'es', 'metric', 'farmer', 'full', '"provided"');
    raise exception 'FAIL u27: A created a farm id without random suffix';
  exception when check_violation then raise notice 'PASS u27 A cannot squat suffix-less ids';
  end;

  update public.farms set name = 'hacked' where id in ('farm_rlstest-demo', 'farm_rlstest-b-bbbbbb');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u28: A updated % demo/B farms', n; end if;
  delete from public.lots where id in ('lot_rlstest-demo_1', 'lot_rlstest-b-bbbbbb_1');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u29: A deleted % demo/B lots', n; end if;
  update public.field_notes set kind = 'management' where id in ('rlstest-note-demo', 'rlstest-note-b');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u30: A updated % demo/B field notes', n; end if;
  delete from public.flood_memories where id in ('rlstest-mem-demo', 'rlstest-mem-b');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u31: A deleted % demo/B flood memories', n; end if;
  update public.user_prefs set theme = 'light' where user_id = '00000000-0000-4000-8000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u32: A updated B''s preferences'; end if;
  raise notice 'PASS u28-u32 A cannot change demo or B rows';

  begin
    insert into public.lots (id, farm_id, name, geometry, area_ha_origin, plant_age_months_origin, variety_origin,
      drainage_class_origin, drainage_works_origin, cover_crop_origin, last_soil_analysis_origin,
      nematode_incidence_origin, bioinputs_origin, defined_by, to_be_redefined_by, origin)
    values ('lot_rlstest-b-bbbbbb_2', 'farm_rlstest-b-bbbbbb', 'x',
      '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}',
      'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
      'rls-test', null, '"provided"');
    raise exception 'FAIL u33: A added a lot to B''s farm';
  exception when insufficient_privilege then raise notice 'PASS u33 A cannot add lots to B''s farm';
  end;
  begin
    insert into public.field_notes (id, lot_id, kind, date, value_json, origin)
    values ('rlstest-note-x', 'lot_rlstest-b-bbbbbb_1', 'other', date '2026-01-01', '{}', 'provided');
    raise exception 'FAIL u34: A added a note to B''s lot';
  exception when insufficient_privilege then raise notice 'PASS u34 A cannot add notes to B''s lots';
  end;
  begin
    insert into public.flood_memories (id, farm_id, date_or_month, reported_by)
    values ('rlstest-mem-x', 'farm_rlstest-b-bbbbbb', '2026-01', 'rls-test');
    raise exception 'FAIL u35: A added a flood memory to B''s farm';
  exception when insufficient_privilege then raise notice 'PASS u35 A cannot add memories to B''s farm';
  end;
  begin
    insert into public.alert_states (unit_id, level, factors, since, updated_at, confirmations, confidence, side, origin)
    values ('farm_rlstest-a-aaaaaa', 'severe', '[]', now(), now(), 2, 0, '{"sigatoka":null,"cold":null}', '"provided"');
    raise exception 'FAIL u36: A wrote an alert state (engine output)';
  exception when insufficient_privilege then raise notice 'PASS u36 A cannot write engine outputs';
  end;
  begin
    insert into public.zones (id, farm_id, tercile, twi_range, origin, geometry)
    values ('zone_rlstest-a-aaaaaa_low', 'farm_rlstest-a-aaaaaa', 'low', '{0,0}', 'calibrated',
            '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}');
    raise exception 'FAIL u37: A wrote a zone (engine output)';
  exception when insufficient_privilege then raise notice 'PASS u37 A cannot write zones';
  end;
  begin
    perform 1 from public.email_log;
    raise exception 'FAIL u38: A read email_log';
  exception when insufficient_privilege then raise notice 'PASS u38 A cannot read email_log';
  end;
  begin
    perform 1 from public.telegram_subscribers;
    raise exception 'FAIL u39: A read telegram_subscribers';
  exception when insufficient_privilege then raise notice 'PASS u39 A cannot read telegram_subscribers';
  end;
  begin
    insert into public.telegram_subscribers (chat_id, farm_id, telegram_code)
    select 'rls-test-chat-a', id, telegram_code from public.farms where id = 'farm_rlstest-a-aaaaaa';
    raise exception 'FAIL u40: A wrote telegram_subscribers';
  exception when insufficient_privilege then raise notice 'PASS u40 A cannot write telegram_subscribers';
  end;
  begin
    insert into public.user_prefs (user_id, device_id, language, units, mode, storage_mode, theme)
    values ('00000000-0000-4000-8000-0000000000b1', 'forged', 'en', 'metric', 'farmer', 'full', 'system');
    raise exception 'FAIL u41: A wrote B''s preferences';
  exception when insufficient_privilege then raise notice 'PASS u41 A cannot insert B''s preferences';
  end;
  begin
    update public.user_prefs set user_id = '00000000-0000-4000-8000-0000000000b1'
    where user_id = '00000000-0000-4000-8000-0000000000a1';
    raise exception 'FAIL u42: A moved its preferences row to B';
  exception when insufficient_privilege then raise notice 'PASS u42 A cannot hijack a preferences row';
  end;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- Back to the owner: nothing of demo or B changed
-- ---------------------------------------------------------------------------------------------------------
reset role;
reset request.jwt.claims;

do $$ declare n bigint; begin
  select count(*) into n from public.farms
  where id in ('farm_rlstest-demo', 'farm_rlstest-b-bbbbbb') and name like 'RLS test %';
  if n <> 2 then raise exception 'FAIL z1: demo or B farm was changed'; end if;
  select count(*) into n from public.lots where id in ('lot_rlstest-demo_1', 'lot_rlstest-b-bbbbbb_1');
  if n <> 2 then raise exception 'FAIL z2: demo or B lot was deleted'; end if;
  select count(*) into n from public.alert_states where unit_id like 'lot\_rlstest-%';
  if n <> 2 then raise exception 'FAIL z3: alert states changed'; end if;
  select count(*) into n from public.farms where id like 'farm\_rlstest-%';
  if n <> 4 then raise exception 'FAIL z4: expected 4 test farms (demo, A, A second, B), found %', n; end if;
  select count(*) into n from public.field_notes where id in ('rlstest-note-demo', 'rlstest-note-b') and kind = 'other';
  if n <> 2 then raise exception 'FAIL z5: demo or B field notes changed'; end if;
  select count(*) into n from public.flood_memories where id in ('rlstest-mem-demo', 'rlstest-mem-b');
  if n <> 2 then raise exception 'FAIL z6: demo or B flood memories deleted'; end if;
  select count(*) into n from public.user_prefs
  where user_id = '00000000-0000-4000-8000-0000000000b1' and theme = 'system' and device_id = 'rls-test-device-b';
  if n <> 1 then raise exception 'FAIL z7: B''s preferences changed'; end if;
  raise notice 'PASS z1-z7 demo and B rows intact; ALL RLS TESTS PASSED';
end $$;

rollback;
