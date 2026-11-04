-- Sprint 2: one agency per user, brief history, and server-enforced permissions.
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160)
);
create table public.agency_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 2 and 160),
  role text not null default 'member' check (role in ('admin', 'member'))
);
create index agency_members_agency on public.agency_members(agency_id);

-- Mirror essential data invariants at the database boundary, including direct RPC calls.
create function public.valid_brief_data(d jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text;
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  foreach k in array array['title','client','eventType','date','venue','objectives','audience','constraints'] loop
    if jsonb_typeof(d->k) is distinct from 'string' then return false; end if;
  end loop;
  if length(trim(d->>'title')) not between 3 and 160
    or length(trim(d->>'client')) not between 2 and 160
    or length(trim(d->>'venue')) not between 2 and 300
    or length(trim(d->>'objectives')) not between 10 and 5000
    or length(d->>'audience') > 2000 or length(d->>'constraints') > 5000
    or d->>'eventType' not in ('Conference','Product launch','Team building','Gala dinner','Workshop','Other')
    or d->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
  perform (d->>'date')::date;
  if jsonb_typeof(d->'budget') is distinct from 'number'
    or jsonb_typeof(d->'attendees') is distinct from 'number' then return false; end if;
  return (d->>'budget')::numeric > 0 and (d->>'budget')::numeric <= 1000000000000
    and (d->>'attendees')::numeric between 1 and 100000
    and (d->>'attendees')::numeric = trunc((d->>'attendees')::numeric);
exception when others then return false;
end;
$$;
create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  data jsonb not null check (public.valid_brief_data(data)),
  version integer not null default 1 check (version > 0),
  author text not null,
  updated_at timestamptz not null default now(),
  needs_review boolean not null default false
);
create index briefs_agency on public.briefs(agency_id);
create table public.brief_versions (
  brief_id uuid not null references public.briefs(id) on delete cascade,
  version integer not null check (version > 0),
  data jsonb not null check (public.valid_brief_data(data)),
  author text not null,
  created_at timestamptz not null default now(),
  primary key (brief_id, version)
);

-- Helpers avoid recursive RLS on memberships. No caller-supplied user identity.
create function public.current_agency() returns uuid language sql stable security definer set search_path = ''
as $$ select agency_id from public.agency_members where user_id = auth.uid() $$;
revoke all on function public.current_agency() from public;
grant execute on function public.current_agency() to authenticated;
alter table public.agencies enable row level security;
alter table public.agency_members enable row level security;
alter table public.briefs enable row level security;
alter table public.brief_versions enable row level security;
create policy agency_read on public.agencies for select to authenticated using (id = public.current_agency());
create policy members_read on public.agency_members for select to authenticated using (agency_id = public.current_agency());
create policy brief_read on public.briefs for select to authenticated using (agency_id = public.current_agency());
create policy versions_read on public.brief_versions for select to authenticated using (
  exists (select 1 from public.briefs b where b.id = brief_id and b.agency_id = public.current_agency())
);
revoke all on public.agencies, public.agency_members, public.briefs, public.brief_versions from anon, authenticated;
grant select on public.agencies, public.agency_members, public.briefs, public.brief_versions to authenticated;

-- All writes use narrow RPCs. Saving the brief and history is one transaction.
create function public.save_brief(p_data jsonb, p_id uuid default null, p_expected_version integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.agency_members; b public.briefs;
begin
  select * into m from public.agency_members where user_id = auth.uid();
  if not found then raise exception 'Agency membership required'; end if;
  if not public.valid_brief_data(p_data) then raise exception 'Invalid brief data'; end if;
  if p_id is null then
    insert into public.briefs(agency_id,data,author) values(m.agency_id,p_data,m.display_name) returning * into b;
  else
    select * into b from public.briefs where id = p_id and agency_id = m.agency_id for update;
    if not found then raise exception 'Brief not found in your agency'; end if;
    if p_expected_version is null or b.version <> p_expected_version then raise exception 'Brief version conflict. Reload before saving'; end if;
    update public.briefs set data=p_data, version=b.version+1, author=m.display_name,
      updated_at=clock_timestamp(), needs_review=true where id=b.id returning * into b;
  end if;
  insert into public.brief_versions(brief_id,version,data,author,created_at) values(b.id,b.version,b.data,b.author,b.updated_at);
  return b.id;
end;
$$;
create function public.delete_brief(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.briefs where id=p_id and agency_id=public.current_agency();
  if not found then raise exception 'Brief not found in your agency'; end if;
end;
$$;
create function public.change_member_role(p_member_id uuid,p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.agency_members; target public.agency_members;
begin
  select * into m from public.agency_members where user_id=auth.uid();
  if not found then raise exception 'Administrator permission required'; end if;
  -- Serialize role changes within an agency so two admins cannot both remove the last admin.
  perform 1 from public.agencies where id=m.agency_id for update;
  select * into m from public.agency_members where user_id=auth.uid();
  if not found or m.role <> 'admin' then raise exception 'Administrator permission required'; end if;
  if p_role is null or p_role not in ('admin','member') then raise exception 'Invalid role'; end if;
  select * into target from public.agency_members where user_id=p_member_id and agency_id=m.agency_id;
  if not found then raise exception 'Member not found in your agency'; end if;
  if target.role='admin' and p_role='member' and
    (select count(*) from public.agency_members where agency_id=m.agency_id and role='admin') <= 1 then
    raise exception 'Keep at least one agency administrator';
  end if;
  update public.agency_members set role=p_role where user_id=target.user_id;
end;
$$;
revoke all on function public.save_brief(jsonb,uuid,integer), public.delete_brief(uuid), public.change_member_role(uuid,text) from public;
grant execute on function public.save_brief(jsonb,uuid,integer), public.delete_brief(uuid), public.change_member_role(uuid,text) to authenticated;
