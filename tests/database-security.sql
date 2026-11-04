-- Run against the development project. All fixtures are rolled back.
begin;
do $$
declare
  agency_a uuid := gen_random_uuid(); agency_b uuid := gen_random_uuid();
  admin_a uuid := gen_random_uuid(); member_a uuid := gen_random_uuid(); admin_b uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid(); pending uuid := gen_random_uuid();
  brief_a uuid; brief_b uuid; blocked boolean;
  sample jsonb := '{"title":"Security test event","client":"Fixture client","eventType":"Workshop","date":"2026-11-28","venue":"Test Hall","attendees":80,"budget":100000000,"objectives":"Verify Sprint 2 agency isolation.","audience":"Course team","constraints":"None confirmed"}'::jsonb;
begin
  insert into auth.users(id,email,email_confirmed_at) values
    (admin_a,admin_a::text||'@example.invalid',now()),
    (member_a,member_a::text||'@example.invalid',now()),
    (admin_b,admin_b::text||'@example.invalid',now()),
    (outsider,outsider::text||'@example.invalid',now()),
    (pending,pending::text||'@example.invalid',null);
  insert into public.agencies(id,name) values(agency_a,'Security fixture A'),(agency_b,'Security fixture B');
  insert into public.agency_members(user_id,agency_id,display_name,role) values
    (admin_a,agency_a,'Admin A','admin'),(member_a,agency_a,'Member A','member'),(admin_b,agency_b,'Admin B','admin');

  perform set_config('request.jwt.claim.sub',admin_b::text,true);
  execute 'set local role authenticated';
  brief_b := public.save_brief(sample);
  perform set_config('request.jwt.claim.sub',admin_a::text,true);
  brief_a := public.save_brief(sample);
  if (select count(*) from public.briefs) <> 1 then raise exception 'FAIL: cross-agency brief read'; end if;
  if exists(select 1 from public.agency_members where agency_id=agency_b) then raise exception 'FAIL: cross-agency membership read'; end if;
  if exists(select 1 from public.brief_versions where brief_id=brief_b) then raise exception 'FAIL: cross-agency history read'; end if;

  blocked := false;
  begin perform public.save_brief(sample,brief_b,1); exception when others then
    if sqlerrm='Brief not found in your agency' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: cross-agency save'; end if;
  blocked := false;
  begin perform public.delete_brief(brief_b); exception when others then
    if sqlerrm='Brief not found in your agency' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: cross-agency delete'; end if;
  blocked := false;
  begin update public.briefs set data=sample where id=brief_a; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'FAIL: direct table update'; end if;

  perform set_config('request.jwt.claim.sub',member_a::text,true);
  perform public.save_brief(jsonb_set(sample,'{budget}','150000000'),brief_a,1);
  if (select count(*) from public.brief_versions where brief_id=brief_a) <> 2 then raise exception 'FAIL: version append'; end if;
  if (select data->>'budget' from public.brief_versions where brief_id=brief_a and version=1) <> '100000000' then raise exception 'FAIL: old version overwritten'; end if;
  if (select author from public.brief_versions where brief_id=brief_a and version=2) <> 'Member A' then raise exception 'FAIL: version attribution'; end if;
  blocked := false;
  begin perform public.save_brief(sample,brief_a,1); exception when others then
    if sqlerrm='Brief version conflict. Reload before saving' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: stale version write'; end if;
  blocked := false;
  begin perform public.save_brief(jsonb_set(sample,'{budget}','-1')); exception when others then
    if sqlerrm='Invalid brief data' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: invalid budget accepted'; end if;
  blocked := false;
  begin perform public.change_member_role(member_a,'admin'); exception when others then
    if sqlerrm='Administrator permission required' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: member role escalation'; end if;
  blocked := false;
  begin perform public.delete_brief(brief_a); exception when others then
    if sqlerrm='Administrator permission required' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: member deleted audit history'; end if;
  blocked := false;
  begin perform public.remove_agency_member(admin_a); exception when others then
    if sqlerrm='Administrator permission required' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: member removal permission'; end if;

  perform set_config('request.jwt.claim.sub',admin_a::text,true);
  blocked := false;
  begin perform public.change_member_role(admin_a,'member'); exception when others then
    if sqlerrm='Keep at least one agency administrator' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: last administrator demotion'; end if;
  blocked := false;
  begin perform public.add_agency_member(admin_b::text||'@example.invalid','Foreign account','member'); exception when others then
    if sqlerrm='Account cannot be added. Confirm registration and agency eligibility' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: cross-agency member transfer'; end if;
  blocked := false;
  begin perform public.add_agency_member(pending::text||'@example.invalid','Unconfirmed account','member'); exception when others then
    if sqlerrm='Account cannot be added. Confirm registration and agency eligibility' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: unconfirmed membership'; end if;
  perform public.add_agency_member(outsider::text||'@example.invalid','New member','member');
  perform public.change_member_role(outsider,'admin');
  perform public.change_member_role(outsider,'member');
  perform public.remove_agency_member(outsider);
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  if exists(select 1 from public.briefs) then raise exception 'FAIL: removed member read'; end if;
  blocked := false;
  begin perform public.save_brief(sample); exception when others then
    if sqlerrm='Agency membership required' then blocked:=true; else raise; end if;
  end;
  if not blocked then raise exception 'FAIL: removed member write'; end if;

  execute 'set local role anon';
  blocked := false;
  begin perform 1 from public.briefs; exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'FAIL: anonymous data read'; end if;
  blocked := false;
  begin perform public.save_brief(sample); exception when insufficient_privilege then blocked:=true; end;
  if not blocked then raise exception 'FAIL: anonymous write'; end if;
  execute 'reset role';
end;
$$;
select 'PASS: agency isolation, immutable history, permissions, membership revocation, and anonymous denial' as verification;
rollback;
