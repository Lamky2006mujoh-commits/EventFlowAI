-- Apply after 20261104024425_sprint2_agency_briefs.sql. No existing briefs or versions are rewritten.
-- Only admins can attach an already-registered, confirmed account to their agency.
create function public.add_agency_member(p_email text, p_name text, p_role text)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.agency_members; account_id uuid;
begin
  select * into m from public.agency_members where user_id=auth.uid();
  if not found or m.role <> 'admin' then raise exception 'Administrator permission required'; end if;
  perform 1 from public.agencies where id=m.agency_id for update;
  select * into m from public.agency_members where user_id=auth.uid();
  if not found or m.role <> 'admin' then raise exception 'Administrator permission required'; end if;
  if p_name is null or length(trim(p_name)) not between 2 and 160
    or p_role is null or p_role not in ('admin','member') then raise exception 'Invalid member details'; end if;
  select id into account_id from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
  if account_id is null or exists(select 1 from public.agency_members where user_id=account_id) then
    raise exception 'Account cannot be added. Confirm registration and agency eligibility';
  end if;
  insert into public.agency_members(user_id,agency_id,display_name,role)
    values(account_id,m.agency_id,trim(p_name),p_role);
exception when unique_violation then
  raise exception 'Account cannot be added. Confirm registration and agency eligibility';
end;
$$;
create function public.remove_agency_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.agency_members; target public.agency_members;
begin
  select * into m from public.agency_members where user_id=auth.uid();
  if not found then raise exception 'Administrator permission required'; end if;
  perform 1 from public.agencies where id=m.agency_id for update;
  select * into m from public.agency_members where user_id=auth.uid();
  if not found or m.role <> 'admin' then raise exception 'Administrator permission required'; end if;
  select * into target from public.agency_members where user_id=p_member_id and agency_id=m.agency_id;
  if not found then raise exception 'Member not found in your agency'; end if;
  if target.role='admin' and (select count(*) from public.agency_members where agency_id=m.agency_id and role='admin') <= 1 then
    raise exception 'Keep at least one agency administrator';
  end if;
  delete from public.agency_members where user_id=p_member_id and agency_id=m.agency_id;
end;
$$;
revoke all on function public.add_agency_member(text,text,text), public.remove_agency_member(uuid) from public;
grant execute on function public.add_agency_member(text,text,text), public.remove_agency_member(uuid) to authenticated;
