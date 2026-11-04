-- Sprint 3. Authenticated reads are agency-scoped; all writes use one locked RPC.
create table public.brief_planning (
 brief_id uuid primary key references public.briefs(id) on delete cascade,
 state jsonb not null
);
alter table public.brief_planning enable row level security;
create policy planning_read on public.brief_planning for select to authenticated using (
 exists(select 1 from public.briefs b where b.id=brief_id and b.agency_id=public.current_agency())
);
revoke all on public.brief_planning from anon,authenticated;
grant select on public.brief_planning to authenticated;
create function public.valid_proposal_data(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(d) is distinct from 'object' then return false; end if;
 foreach k in array array['title','objectives','audience','theme','agenda','assumptions'] loop
  if jsonb_typeof(d->k) is distinct from 'string' or length(trim(d->>k)) not between 1 and 5000 then return false; end if;
 end loop;
 return true;
end; $$;
create function public.valid_concepts(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare c jsonb; k text; item jsonb;
begin
 if jsonb_typeof(d) is distinct from 'array' then return false; end if;
 if jsonb_array_length(d) not between 2 and 3 then return false; end if;
 for c in select value from jsonb_array_elements(d) loop
  perform (c->>'id')::uuid;
  if c->>'id' is null then return false; end if;
  foreach k in array array['title','theme'] loop
   if jsonb_typeof(c->k) is distinct from 'string' or length(trim(c->>k)) not between 1 and 5000 then return false; end if;
  end loop;
  foreach k in array array['activities','assumptions'] loop
   if jsonb_typeof(c->k) is distinct from 'array' then return false; end if;
   if jsonb_array_length(c->k) not between 1 and 12 then return false; end if;
   for item in select value from jsonb_array_elements(c->k) loop
    if jsonb_typeof(item) is distinct from 'string' or length(trim(item#>>'{}')) not between 1 and 5000 then return false; end if;
   end loop;
  end loop;
 end loop;
 return (select count(distinct value->>'id')=jsonb_array_length(d) from jsonb_array_elements(d));
exception when others then return false;
end; $$;
create function public.save_planning(p_brief_id uuid,p_action text,p_expected_revision integer,p_brief_version integer,p_payload jsonb,p_confirm boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.briefs; m public.agency_members; s jsonb; proposal jsonb; next_version integer;
begin
 select * into m from public.agency_members where user_id=auth.uid() for share;
 if not found then raise exception 'Agency membership required'; end if;
 select * into b from public.briefs where id=p_brief_id and agency_id=m.agency_id for update;
 if not found then raise exception 'Brief not found in your agency'; end if;
 select state into s from public.brief_planning where brief_id=b.id for update;
 if not found then s=jsonb_build_object('revision',0,'briefVersion',b.version,'concepts','[]'::jsonb,'selectedId',null,'proposal',null,'history','[]'::jsonb); end if;
 if p_expected_revision is null or p_brief_version is null or (s->>'revision')::integer<>p_expected_revision or b.version<>p_brief_version then
  raise exception 'Planning or brief version conflict. Reload before saving.';
 end if;
 if p_action='generateConcepts' then
  if jsonb_array_length(s->'concepts')>0 and p_confirm is not true then raise exception 'Confirmation required'; end if;
  if not public.valid_concepts(p_payload->'concepts') then raise exception 'Invalid planning data'; end if;
  s=s||jsonb_build_object('concepts',p_payload->'concepts','selectedId',null,'briefVersion',b.version);
 else
  if (s->>'briefVersion')::integer<>b.version then raise exception 'Brief changed. Generate new concepts first.'; end if;
  if p_action='select' then
   if not exists(select 1 from jsonb_array_elements(s->'concepts') c where c->>'id'=p_payload->>'conceptId') then raise exception 'Concept not found'; end if;
   s=s||jsonb_build_object('selectedId',p_payload->>'conceptId');
  elsif p_action in ('generateProposal','saveProposal') then
   if s->>'selectedId' is null then raise exception 'Select a concept first'; end if;
   if not public.valid_proposal_data(p_payload->'data') then raise exception 'Invalid planning data'; end if;
   if p_action='generateProposal' and s->>'proposal' is not null and p_confirm is not true then raise exception 'Confirmation required'; end if;
   if p_action='saveProposal' and (s->>'proposal' is null or s->'proposal'->>'conceptId' is distinct from s->>'selectedId' or (s->'proposal'->>'briefVersion')::integer is distinct from b.version) then raise exception 'Generate a current proposal first'; end if;
   next_version=jsonb_array_length(s->'history')+1;
   proposal=jsonb_build_object('data',p_payload->'data','version',next_version,'briefVersion',b.version,'conceptId',s->>'selectedId','status','Draft','author',m.display_name,'createdAt',clock_timestamp());
   s=s||jsonb_build_object('proposal',proposal,'history',(s->'history')||jsonb_build_array(proposal));
  else raise exception 'Invalid planning action'; end if;
 end if;
 s=s||jsonb_build_object('revision',p_expected_revision+1);
 insert into public.brief_planning(brief_id,state) values(b.id,s) on conflict(brief_id) do update set state=excluded.state;
 return s;
end; $$;
revoke all on function public.valid_proposal_data(jsonb),public.valid_concepts(jsonb) from public;
revoke all on function public.save_planning(uuid,text,integer,integer,jsonb,boolean) from public,anon;
grant execute on function public.save_planning(uuid,text,integer,integer,jsonb,boolean) to authenticated;
