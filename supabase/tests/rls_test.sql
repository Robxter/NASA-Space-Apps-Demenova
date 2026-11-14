-- Demenova RLS and constraint tests (T-015). Plain SQL, no extension needed.
-- Run after the six migrations, in the Supabase SQL editor (paste the whole file, Run) or with
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Pass: the script ends without error (SQL editor: "Success. No rows returned"; psql: exit code 0 and
-- NOTICE lines "PASS ..."). Fail: an error "FAIL <check>: ...". If it fails in the SQL editor, run `rollback;` once.
-- Everything runs in one transaction that is rolled back: the fixtures never persist.
-- Fixtures are test-only rows tagged origin 'synthetic' at coordinates [0, 0]; numbers are null wherever allowed.
-- Not for `supabase test db` (that runner expects pgTAP output).

begin;

-- ---------------------------------------------------------------------------------------------------------
-- Fixtures (run as the table owner, which bypasses RLS)
-- ---------------------------------------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', true, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', true, now(), now());

insert into public.farms (id, name, owner_id, location, data_level, crop, variety, variety_origin,
                          language, units, mode, storage_mode, is_demo, origin) values
  ('farm_rlstest-demo', 'RLS test demo', null, '{"type":"Point","coordinates":[0,0]}', 2, 'banana', null, 'pending',
   'es', 'metric', 'farmer', 'full', true, '"synthetic"'),
  ('farm_rlstest-a', 'RLS test A', '00000000-0000-4000-8000-0000000000a1', '{"type":"Point","coordinates":[0,0]}', 2,
   'banana', null, 'pending', 'es', 'metric', 'farmer', 'full', false, '"synthetic"'),
  ('farm_rlstest-b', 'RLS test B', '00000000-0000-4000-8000-0000000000b1', '{"type":"Point","coordinates":[0,0]}', 2,
   'banana', null, 'pending', 'es', 'metric', 'farmer', 'full', false, '"synthetic"');

insert into public.lots (id, farm_id, name, geometry,
  area_ha_origin, plant_age_months_origin, variety_origin, drainage_class_origin, drainage_works_origin,
  cover_crop_origin, last_soil_analysis_origin, nematode_incidence_origin, bioinputs_origin,
  defined_by, to_be_redefined_by, origin)
select v.id, v.farm_id, v.name,
  '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}'::jsonb,
  'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
  'rls-test', 'rls-test', '"synthetic"'::jsonb
from (values ('lot_rlstest-demo_1', 'farm_rlstest-demo', 'Demo 1'),
             ('lot_rlstest-a_1', 'farm_rlstest-a', 'A 1'),
             ('lot_rlstest-b_1', 'farm_rlstest-b', 'B 1')) as v(id, farm_id, name);

insert into public.alert_states (unit_id, level, w, factors, since, updated_at, newest_rain_data_at,
                                 confirmations, confidence, side, origin)
select u, 'normal', null, '[]', now(), now(), null, 0, 0, '{"sigatoka":null,"cold":null}', '"synthetic"'
from unnest(array['lot_rlstest-demo_1', 'lot_rlstest-b_1']) as u;

insert into public.daily_features (unit_id, date, percentiles, origin)
select u, date '2026-01-01', '{"upstream":null,"saturation":null,"local":null,"balance":null}', '"synthetic"'
from unnest(array['lot_rlstest-demo_1', 'lot_rlstest-b_1']) as u;

insert into public.alert_events (id, unit_id, from_level, to_level, w, factors, at, origin) values
  ('00000000000000000000000001', 'lot_rlstest-demo_1', 'normal', 'watch', null, '[]', now(), '"synthetic"'),
  ('00000000000000000000000002', 'lot_rlstest-b_1', 'normal', 'watch', null, '[]', now(), '"synthetic"');

insert into public.email_log (id, unit_id, episode_start, to_hash, provider_id, status) values
  ('00000000000000000000000003', 'lot_rlstest-demo_1', now(), 'rls-test-hash', null, 'sent');
insert into public.telegram_subscribers (chat_id, farm_id) values ('rls-test-chat', 'farm_rlstest-demo');
insert into public.user_prefs (user_id, device_id, language, units, mode, storage_mode, theme) values
  ('00000000-0000-4000-8000-0000000000b1', 'rls-test-device-b', 'es', 'metric', 'farmer', 'full', 'system');

-- ---------------------------------------------------------------------------------------------------------
-- Constraints mirror the contracts (run as owner)
-- ---------------------------------------------------------------------------------------------------------
do $$ begin
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_rlstest-bad', 'x', null, '{"type":"Point"}', 0, 'banana', 'pending', 'es', 'metric', 'farmer',
            'full', true, '"synthetic"');
    raise exception 'FAIL c1: a Point without coordinates was accepted';
  exception when check_violation then raise notice 'PASS c1 Point without coordinates rejected';
  end;
  begin
    update public.lots set area_ha = 5 where id = 'lot_rlstest-a_1';  -- value with origin still 'pending'
    raise exception 'FAIL c2: a value with origin pending was accepted';
  exception when check_violation then raise notice 'PASS c2 value with pending origin rejected';
  end;
  begin
    update public.lots set area_ha = 'NaN', area_ha_origin = 'synthetic' where id = 'lot_rlstest-a_1';
    raise exception 'FAIL c3: NaN was accepted';
  exception when check_violation then raise notice 'PASS c3 NaN rejected';
  end;
  begin
    update public.alert_states set origin = '"invented"' where unit_id = 'lot_rlstest-b_1';
    raise exception 'FAIL c4: an unknown origin was accepted';
  exception when check_violation then raise notice 'PASS c4 unknown origin rejected';
  end;
  begin
    insert into public.strategies (strategy_id, lot_scope, label, what, why, benefits, gaps, risks, scores, origin)
    values ('rls_test', array['*'], 'A', '{"es":"x","en":null}', '{"es":"x","en":null}', '{"es":"x","en":null}',
            '{"es":"x","en":null}', '{"es":"x","en":null}', '{"soil":{"origin":"pending","value":null}}', 'synthetic');
    raise exception 'FAIL c5: strategy scores missing keys were accepted';
  exception when check_violation then raise notice 'PASS c5 incomplete scores rejected';
  end;
  begin
    insert into public.daily_features (unit_id, date, percentiles, origin)
    values ('lot_rlstest-a_9', date '2026-01-01', '{"upstream":null,"saturation":null,"local":null,"balance":null}',
            '"synthetic"');
    raise exception 'FAIL c6: a feature for a missing lot was accepted';
  exception when foreign_key_violation then raise notice 'PASS c6 feature for unknown lot rejected';
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
  raise notice 'PASS a1-a5 anon reads demo only';

  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_rlstest-anon', 'x', null, '{"type":"Point","coordinates":[0,0]}', 0, 'banana', 'pending', 'es',
            'metric', 'farmer', 'full', true, '"synthetic"');
    raise exception 'FAIL a6: anon inserted a farm';
  exception when insufficient_privilege then raise notice 'PASS a6 anon cannot insert farms';
  end;
  begin
    update public.farms set name = 'hacked' where id = 'farm_rlstest-demo';
    raise exception 'FAIL a7: anon updated the demo farm';
  exception when insufficient_privilege then raise notice 'PASS a7 anon cannot update farms';
  end;
  begin
    delete from public.alert_states where unit_id = 'lot_rlstest-demo_1';
    raise exception 'FAIL a8: anon deleted an alert state';
  exception when insufficient_privilege then raise notice 'PASS a8 anon cannot delete alert states';
  end;
  begin
    insert into public.daily_features (unit_id, date, percentiles, origin)
    values ('lot_rlstest-demo_1', date '2026-01-02',
            '{"upstream":null,"saturation":null,"local":null,"balance":null}', '"synthetic"');
    raise exception 'FAIL a9: anon inserted a daily feature';
  exception when insufficient_privilege then raise notice 'PASS a9 anon cannot insert features';
  end;
  begin
    perform 1 from public.email_log;
    raise exception 'FAIL a10: anon read email_log';
  exception when insufficient_privilege then raise notice 'PASS a10 anon cannot read email_log';
  end;
  begin
    perform 1 from public.telegram_subscribers;
    raise exception 'FAIL a11: anon read telegram_subscribers';
  exception when insufficient_privilege then raise notice 'PASS a11 anon cannot read telegram_subscribers';
  end;
  begin
    perform 1 from public.user_prefs;
    raise exception 'FAIL a12: anon read user_prefs';
  exception when insufficient_privilege then raise notice 'PASS a12 anon cannot read user_prefs';
  end;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- user A (anonymous sign-in, role authenticated): demo + own rows; never user B's rows
-- ---------------------------------------------------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","is_anonymous":true}';

do $$ declare n bigint; begin
  select count(*) into n from public.farms where id like 'farm\_rlstest-%';
  if n <> 2 then raise exception 'FAIL u1: A sees % test farms, expected 2 (demo + A)', n; end if;
  select count(*) into n from public.farms where id = 'farm_rlstest-b';
  if n <> 0 then raise exception 'FAIL u2: A can read B''s farm'; end if;
  select count(*) into n from public.lots where id = 'lot_rlstest-b_1';
  if n <> 0 then raise exception 'FAIL u3: A can read B''s lot'; end if;
  select count(*) into n from public.v_farm_status where farm_id = 'farm_rlstest-b';
  if n <> 0 then raise exception 'FAIL u4: A can read B''s status'; end if;
  select count(*) into n from public.v_lot_history_90d where farm_id = 'farm_rlstest-b';
  if n <> 0 then raise exception 'FAIL u5: A can read B''s history'; end if;
  select count(*) into n from public.v_alert_log where farm_id = 'farm_rlstest-b';
  if n <> 0 then raise exception 'FAIL u6: A can read B''s alert log'; end if;
  select count(*) into n from public.user_prefs;
  if n <> 0 then raise exception 'FAIL u7: A can read B''s preferences'; end if;
  raise notice 'PASS u1-u7 A cannot read B';

  -- A writes its own rows
  insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                            storage_mode, is_demo, origin)
  values ('farm_rlstest-a2', 'A second', '00000000-0000-4000-8000-0000000000a1', '{"type":"Point","coordinates":[0,0]}',
          0, 'banana', 'pending', 'es', 'metric', 'farmer', 'saver', false, '"provided"');
  update public.farms set name = 'RLS test A renamed' where id = 'farm_rlstest-a';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL u8: A could not update its own farm'; end if;
  insert into public.user_prefs (user_id, device_id, language, units, mode, storage_mode, theme)
  values ('00000000-0000-4000-8000-0000000000a1', 'rls-test-device-a', 'en', 'imperial', 'agronomist', 'saver', 'dark');
  raise notice 'PASS u8 A writes its own farm and preferences';

  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_rlstest-forged', 'x', '00000000-0000-4000-8000-0000000000b1', '{"type":"Point","coordinates":[0,0]}',
            0, 'banana', 'pending', 'es', 'metric', 'farmer', 'full', false, '"provided"');
    raise exception 'FAIL u9: A created a farm owned by B';
  exception when insufficient_privilege then raise notice 'PASS u9 A cannot create a farm for B';
  end;
  begin
    insert into public.farms (id, name, owner_id, location, data_level, crop, variety_origin, language, units, mode,
                              storage_mode, is_demo, origin)
    values ('farm_rlstest-fakedemo', 'x', null, '{"type":"Point","coordinates":[0,0]}',
            0, 'banana', 'pending', 'es', 'metric', 'farmer', 'full', true, '"provided"');
    raise exception 'FAIL u10: A created a demo farm';
  exception when insufficient_privilege or check_violation then raise notice 'PASS u10 A cannot create a demo farm';
  end;
  begin
    update public.farms set owner_id = '00000000-0000-4000-8000-0000000000b1' where id = 'farm_rlstest-a';
    raise exception 'FAIL u11: A gave its farm to B';
  exception when insufficient_privilege then raise notice 'PASS u11 A cannot reassign ownership';
  end;

  update public.farms set name = 'hacked' where id in ('farm_rlstest-demo', 'farm_rlstest-b');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u12: A updated % demo/B farms', n; end if;
  delete from public.lots where id in ('lot_rlstest-demo_1', 'lot_rlstest-b_1');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL u13: A deleted % demo/B lots', n; end if;
  raise notice 'PASS u12-u13 A cannot change demo or B rows';

  begin
    insert into public.lots (id, farm_id, name, geometry, area_ha_origin, plant_age_months_origin, variety_origin,
      drainage_class_origin, drainage_works_origin, cover_crop_origin, last_soil_analysis_origin,
      nematode_incidence_origin, bioinputs_origin, defined_by, to_be_redefined_by, origin)
    values ('lot_rlstest-b_2', 'farm_rlstest-b', 'x',
      '{"type":"Polygon","coordinates":[[[0,0],[0.001,0],[0.001,0.001],[0,0.001],[0,0]]]}',
      'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending',
      'rls-test', null, '"provided"');
    raise exception 'FAIL u14: A added a lot to B''s farm';
  exception when insufficient_privilege then raise notice 'PASS u14 A cannot add lots to B''s farm';
  end;
  begin
    insert into public.alert_states (unit_id, level, factors, since, updated_at, confirmations, confidence, side, origin)
    values ('farm_rlstest-a', 'severe', '[]', now(), now(), 2, 0, '{"sigatoka":null,"cold":null}', '"provided"');
    raise exception 'FAIL u15: A wrote an alert state (engine output)';
  exception when insufficient_privilege then raise notice 'PASS u15 A cannot write engine outputs';
  end;
  begin
    perform 1 from public.email_log;
    raise exception 'FAIL u16: A read email_log';
  exception when insufficient_privilege then raise notice 'PASS u16 A cannot read email_log';
  end;
  begin
    insert into public.user_prefs (user_id, device_id, language, units, mode, storage_mode, theme)
    values ('00000000-0000-4000-8000-0000000000b1', 'forged', 'en', 'metric', 'farmer', 'full', 'system');
    raise exception 'FAIL u17: A wrote B''s preferences';
  exception when insufficient_privilege or unique_violation then raise notice 'PASS u17 A cannot write B''s preferences';
  end;
end $$;

-- ---------------------------------------------------------------------------------------------------------
-- Back to the owner: nothing of demo or B changed
-- ---------------------------------------------------------------------------------------------------------
reset role;
reset request.jwt.claims;

do $$ declare n bigint; begin
  select count(*) into n from public.farms where id in ('farm_rlstest-demo', 'farm_rlstest-b') and name like 'RLS test %';
  if n <> 2 then raise exception 'FAIL z1: demo or B farm was changed'; end if;
  select count(*) into n from public.lots where id in ('lot_rlstest-demo_1', 'lot_rlstest-b_1');
  if n <> 2 then raise exception 'FAIL z2: demo or B lot was deleted'; end if;
  select count(*) into n from public.alert_states where unit_id like 'lot\_rlstest-%';
  if n <> 2 then raise exception 'FAIL z3: alert states changed'; end if;
  select count(*) into n from public.farms where id like 'farm\_rlstest-%';
  if n <> 4 then raise exception 'FAIL z4: expected 4 test farms (demo, A, A second, B), found %', n; end if;
  raise notice 'PASS z1-z4 demo and B rows intact; ALL RLS TESTS PASSED';
end $$;

rollback;
