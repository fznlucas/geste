-- Behaviour tests for RLS and business functions. Run against a fresh database after the migrations + seed.sql:
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Each block raises an exception on failure.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'lucas@geste.studio'),
  ('10000000-0000-0000-0000-000000000002', 'camille@mail.com'),
  ('10000000-0000-0000-0000-000000000003', 'hugo@mail.com'),
  ('10000000-0000-0000-0000-000000000004', 'freelance@mail.com');
insert into staff_roles values ('10000000-0000-0000-0000-000000000001', 'owner', null, now()), ('10000000-0000-0000-0000-000000000004', 'support', null, now());
insert into works (number, slug, status) values ('N°09', 'n09', 'draft');

-- 1. Profiles are created by the auth trigger
do $$ begin if (select count(*) from profiles) <> 4 then raise exception 'profile trigger failed'; end if; end $$;

-- 2. Anonymous visitors see live works only
set role anon;
do $$ begin if (select count(*) from works) <> 1 then raise exception 'anon sees drafts'; end if; end $$;
reset role;

-- 3. Print numbering: edition of 3, four buyers → 1, 2, 3, then null
insert into print_editions (id, work_id, size, edition_size, price_cents) values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'A2', 3, 7500);
insert into orders (id, user_id, email, status, subtotal_cents, total_cents) values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'camille@mail.com', 'paid', 30000, 30000);
insert into order_items (id, order_id, kind, edition_id, title, unit_price_cents) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'print', '20000000-0000-0000-0000-000000000001', 'Print N°03 A2', 7500),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'print', '20000000-0000-0000-0000-000000000001', 'Print N°03 A2', 7500),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'print', '20000000-0000-0000-0000-000000000001', 'Print N°03 A2', 7500),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'print', '20000000-0000-0000-0000-000000000001', 'Print N°03 A2', 7500);
do $$ declare a int; b int; c int; d int; begin
  a := assign_print_copy('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');
  b := assign_print_copy('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002');
  c := assign_print_copy('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003');
  d := assign_print_copy('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004');
  if a <> 1 or b <> 2 or c <> 3 or d is not null then raise exception 'numbering wrong: % % % %', a, b, c, d; end if;
  if (select certificate_no from print_copies where order_item_id = '40000000-0000-0000-0000-000000000002') <> 'C-03-002' then raise exception 'certificate number wrong'; end if;
end $$;

-- 4. Customers see only their own orders
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
do $$ begin if (select count(*) from orders) <> 1 then raise exception 'owner of order cannot see it'; end if; end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
do $$ begin if (select count(*) from orders) <> 0 then raise exception 'customer sees other orders'; end if; end $$;

-- 5. Support can refund up to $50, not more
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
insert into refunds (order_id, amount_cents, reason) values ('30000000-0000-0000-0000-000000000001', 5000, 'Damaged print');
do $$ begin
  begin
    insert into refunds (order_id, amount_cents, reason) values ('30000000-0000-0000-0000-000000000001', 7500, 'Too much');
    raise exception 'support refunded above limit';
  exception when insufficient_privilege then null; end;
end $$;

-- 6. Guide content: buyers read published versions only when entitled
reset role;
insert into entitlements (user_id, guide_id) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a3');
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
do $$ begin if (select count(*) from guide_versions) <> 1 then raise exception 'buyer cannot read guide'; end if; end $$;
do $$ begin if (select count(*) from guide_steps) <> 0 then raise exception 'buyer reads draft steps'; end if; end $$;
do $$ begin if (select count(*) from guides) <> 1 then raise exception 'buyer cannot see owned guide row'; end if; end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
do $$ begin if (select count(*) from guide_versions) <> 0 then raise exception 'non-buyer reads guide'; end if; end $$;
do $$ begin if (select count(*) from guides) <> 0 then raise exception 'non-buyer sees guide row'; end if; end $$;

-- 7. Print credits: 3 then error
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
do $$ declare e uuid := (select id from entitlements limit 1); ok boolean := false; begin
  perform use_print_credit(e); perform use_print_credit(e); perform use_print_credit(e);
  begin perform use_print_credit(e); exception when others then ok := true; end;
  if not ok then raise exception 'print credits not enforced'; end if;
end $$;

-- 8. Guide timing and printed copy (0002): published with the version; the draft stays staff-only
do $$ begin
  if (select count(*) from guide_print) <> 0 then raise exception 'buyer reads the printed copy draft'; end if;
  if (select content #>> '{layers,1,minutes}' from guide_versions) <> '45' then raise exception 'layer minutes not published'; end if;
  if (select content #>> '{layers,1,steps,3,brush}' from guide_versions) <> 'Round n°6' then raise exception 'step brush not published'; end if;
  if (select content #>> '{print,plan}' from guide_versions) is null then raise exception 'printed copy not published'; end if;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
do $$ declare n int; begin
  if (select count(*) from guide_print) <> 1 then raise exception 'staff cannot read the printed copy'; end if;
  update guide_print set content = content || '{"plan": "edited"}';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'support edited the printed copy'; end if;
  update guide_steps set brush = 'Fan brush';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'support edited step brushes'; end if;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$ declare n int; begin
  update guide_layers set minutes = 50 where position = 2;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'owner cannot edit layer minutes'; end if;
  update guide_print set content = content || '{"plan": "edited"}';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'owner cannot edit the printed copy'; end if;
  if (select content #>> '{layers,1,minutes}' from guide_versions) <> '45' then raise exception 'draft edit reached the published version'; end if;
  begin
    update guide_layers set minutes = -1 where position = 1;
    raise exception 'negative minutes accepted';
  exception when check_violation then null; end;
end $$;
reset role;
set request.jwt.claim.sub = '';
set role anon;
do $$ begin if (select count(*) from guide_print) <> 0 then raise exception 'anon reads the printed copy'; end if; end $$;
reset role;

select 'all RLS and business tests passed' as result;
