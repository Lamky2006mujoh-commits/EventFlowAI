-- Register without granting access; administrators review only their own agency.
create table public.agency_signup_settings (
 agency_id uuid primary key references public.agencies(id) on delete cascade,
 registration_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))
 check (registration_code ~ '^[A-F0-9]{16}$')
);
create table public.agency_signup_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 agency_id uuid not null references public.agencies(id) on delete cascade,
 email text not null,
 display_name text not null check(length(trim(display_name)) between 2 and 160),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 email_confirmed boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewer_name text,
 check ((status='pending' and reviewed_at is null and reviewed_by is null and reviewer_name is null)
 or (status<>'pending' and reviewed_at is not null and reviewer_name is not null))
);
create index signup_requests_agency_status on public.agency_signup_requests(agency_id,status,created_at desc);
insert into public.agency_signup_settings(agency_id) select id from public.agencies;
create function public.initialize_signup_settings() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.agency_signup_settings(agency_id) values(new.id);return new;end;$$;
create trigger initialize_agency_signup after insert on public.agencies for each row execute function public.initialize_signup_settings();

create function public.capture_signup_request() returns trigger language plpgsql security definer set search_path='' as $$
declare code text; target uuid; applicant_name text;
begin
 code=upper(trim(coalesce(new.raw_user_meta_data->>'agency_code','')));
 -- Preserve existing integrations/accounts with no signup routing metadata.
 if code='' then return new; end if;
 select agency_id into target from public.agency_signup_settings where registration_code=code;
 if target is null then raise exception 'Invalid agency registration code';end if;
 applicant_name=trim(coalesce(new.raw_user_meta_data->>'display_name',''));
 if length(applicant_name) not between 2 and 160 or new.email is null then raise exception 'Invalid registration details';end if;
 insert into public.agency_signup_requests(user_id,agency_id,email,display_name,email_confirmed)
 values(new.id,target,new.email,applicant_name,new.email_confirmed_at is not null);
 return new;
end;$$;
create trigger capture_eventflow_signup after insert on auth.users for each row execute function public.capture_signup_request();
create function public.sync_signup_confirmation() returns trigger language plpgsql security definer set search_path='' as $$
begin update public.agency_signup_requests set email=new.email,email_confirmed=(new.email_confirmed_at is not null) where user_id=new.id;return new;end;$$;
create trigger sync_eventflow_signup_confirmation after update of email_confirmed_at,email on auth.users for each row execute function public.sync_signup_confirmation();

alter table public.agency_signup_settings enable row level security;
alter table public.agency_signup_requests enable row level security;
revoke all on public.agency_signup_settings,public.agency_signup_requests from public,anon,authenticated;
-- Access is through narrow checked RPCs, including for administrators.
create function public.signup_review_queue() returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.agency_members; result jsonb;
begin
 select * into m from public.agency_members where user_id=auth.uid();
 if not found or m.role<>'admin' then raise exception 'Administrator permission required';end if;
 select jsonb_build_object(
 'registrationCode',(select registration_code from public.agency_signup_settings where agency_id=m.agency_id),
 'pendingCount',(select count(*) from public.agency_signup_requests where agency_id=m.agency_id and status='pending'),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.display_name,'email',r.email,'status',r.status,
 'emailConfirmed',r.email_confirmed,'createdAt',r.created_at,'reviewedAt',r.reviewed_at,'reviewerName',r.reviewer_name)
 order by (r.status='pending') desc,r.created_at desc) from
 (select * from public.agency_signup_requests where agency_id=m.agency_id order by (status='pending') desc,created_at desc limit 100) r),'[]'::jsonb)) into result;
 return result;
end;$$;
create function public.my_signup_status() returns text language sql stable security definer set search_path='' as $$
 select status from public.agency_signup_requests where user_id=auth.uid()
$$;
create function public.review_signup_request(p_request_id uuid,p_decision text) returns void language plpgsql security definer set search_path='' as $$
declare m public.agency_members; r public.agency_signup_requests; confirmed timestamptz;
begin
 select * into m from public.agency_members where user_id=auth.uid();
 if not found or m.role<>'admin' then raise exception 'Administrator permission required';end if;
 perform 1 from public.agencies where id=m.agency_id for update;
 select * into m from public.agency_members where user_id=auth.uid() for share;
 if not found or m.role<>'admin' then raise exception 'Administrator permission required';end if;
 if p_decision is null or p_decision not in ('approve','reject') then raise exception 'Invalid signup decision';end if;
 select * into r from public.agency_signup_requests where id=p_request_id and agency_id=m.agency_id for update;
 if not found then raise exception 'Signup request not found in your agency';end if;
 if r.status<>'pending' then raise exception 'Signup request already reviewed';end if;
 select email_confirmed_at into confirmed from auth.users where id=r.user_id for update;
 if not found then raise exception 'Signup account no longer exists';end if;
 if p_decision='approve' then
  if confirmed is null then raise exception 'Confirm the account email before approval';end if;
  if exists(select 1 from public.agency_members where user_id=r.user_id) then raise exception 'Account already has agency access';end if;
  insert into public.agency_members(user_id,agency_id,display_name,role) values(r.user_id,m.agency_id,r.display_name,'member');
 end if;
 update public.agency_signup_requests set status=case when p_decision='approve' then 'approved' else 'rejected' end,
 reviewed_at=clock_timestamp(),reviewed_by=m.user_id,reviewer_name=m.display_name,email_confirmed=(confirmed is not null) where id=r.id;
end;$$;
revoke all on function public.initialize_signup_settings(),public.capture_signup_request(),public.sync_signup_confirmation(),
 public.signup_review_queue(),public.my_signup_status(),public.review_signup_request(uuid,text) from public,anon,authenticated;
grant execute on function public.signup_review_queue(),public.my_signup_status(),public.review_signup_request(uuid,text) to authenticated;

create or replace function public.add_agency_member(p_email text, p_name text, p_role text)
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
  if exists(select 1 from public.agency_signup_requests where user_id=account_id) then raise exception 'Use signup request approval for this account';end if;
  insert into public.agency_members(user_id,agency_id,display_name,role)
    values(account_id,m.agency_id,trim(p_name),p_role);
exception when unique_violation then
  raise exception 'Account cannot be added. Confirm registration and agency eligibility';
end;
$$;

-- Public boolean preflight: never expose agency names or IDs, and grant no access.
create function public.validate_agency_registration_code(p_code text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.agency_signup_settings where registration_code=upper(trim(p_code)))
$$;
revoke all on function public.validate_agency_registration_code(text) from public;
grant execute on function public.validate_agency_registration_code(text) to anon,authenticated;
