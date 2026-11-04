-- Additive extension: existing proposal snapshots are retained unchanged.
create function public.valid_budget(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; total numeric:=0; k text;
begin
 if jsonb_typeof(d) is distinct from 'object' or d->>'currency' is distinct from 'VND' or jsonb_typeof(d->'items') is distinct from 'array' then return false; end if;
 if jsonb_array_length(d->'items') not between 1 and 40 then return false; end if;
 if jsonb_typeof(d->'contingencyPercent') is distinct from 'number' or (d->>'contingencyPercent')::numeric not between 0 and 50 or jsonb_typeof(d->'taxPercent') is distinct from 'number' or (d->>'taxPercent')::numeric not between 0 and 100 or jsonb_typeof(d->'assumptions') is distinct from 'string' or length(d->>'assumptions')>2000 then return false; end if;
 for item in select value from jsonb_array_elements(d->'items') loop
  if item->>'category' is null or item->>'category' not in ('venue','catering','production','decoration','staffing','marketing','transport','permits','other') then return false; end if;
  foreach k in array array['description','unit','notes'] loop if jsonb_typeof(item->k) is distinct from 'string' then return false; end if; end loop;
  if length(trim(item->>'description')) not between 1 and 300 or length(trim(item->>'unit')) not between 1 and 40 or length(item->>'notes')>1000 then return false; end if;
  if jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity')::numeric not between 1 and 100000 or (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric) then return false; end if;
  if jsonb_typeof(item->'unitCost') is distinct from 'number' or (item->>'unitCost')::numeric not between 0 and 1000000000000 or (item->>'unitCost')::numeric<>trunc((item->>'unitCost')::numeric) then return false; end if;
  total=total+(item->>'quantity')::numeric*(item->>'unitCost')::numeric;
 end loop;
 return total<=1000000000000;
exception when others then return false; end; $$;
create function public.valid_venue_search(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare v jsonb; p jsonb; item jsonb; k text;
begin
 if jsonb_typeof(d) is distinct from 'object' or jsonb_typeof(d->'options') is distinct from 'array' or jsonb_array_length(d->'options')>8 then return false; end if;
 if d->>'scope' is null or d->>'scope' not in ('nationwide','city_and_nearby') or d->>'method' is null or d->>'method' not in ('web','demo') or jsonb_typeof(d->'briefVersion') is distinct from 'number' or (d->>'briefVersion')::integer<1 then return false; end if;
 if jsonb_typeof(d->'area') is distinct from 'string' or length(trim(d->>'area')) not between 1 and 1000 or jsonb_typeof(d->'summary') is distinct from 'string' or length(d->>'summary')>2000 or jsonb_typeof(d->'searchSuggestions') is distinct from 'string' or length(d->>'searchSuggestions')>50000 then return false; end if;
 if jsonb_typeof(d->'checkedAt') is distinct from 'string' then return false; end if;
 perform (d->>'checkedAt')::timestamptz;
 if jsonb_typeof(d->'sources') is distinct from 'array' or jsonb_array_length(d->'sources')>30 then return false; end if;
 for item in select value from jsonb_array_elements(d->'sources') loop if jsonb_typeof(item->'url') is distinct from 'string' or item->>'url' !~ '^https://' or jsonb_typeof(item->'title') is distinct from 'string' or length(item->>'title')>500 then return false; end if; end loop;
 if d->>'method'='web' and jsonb_array_length(d->'sources')=0 then return false; end if;
 for v in select value from jsonb_array_elements(d->'options') loop
  perform (v->>'id')::uuid; if v->>'id' is null or v->>'availability' is distinct from 'not_checked' then return false; end if;
  foreach k in array array['name','address','area','suitability'] loop if jsonb_typeof(v->k) is distinct from 'string' or length(trim(v->>k)) not between 1 and 1000 then return false; end if; end loop;
  if jsonb_typeof(v->'capacity') is distinct from 'null' and (jsonb_typeof(v->'capacity') is distinct from 'number' or (v->>'capacity')::numeric not between 1 and 100000 or (v->>'capacity')::numeric<>trunc((v->>'capacity')::numeric)) then return false; end if;
  p=v->'price'; if p->>'kind' is null or p->>'kind' not in ('reference','estimate','quote_required') or p->>'unit' is null or p->>'unit' not in ('event','day','half_day','hour','person','package') then return false; end if;
  if p->>'kind'='quote_required' then if jsonb_typeof(p->'min') is distinct from 'null' or jsonb_typeof(p->'max') is distinct from 'null' then return false; end if;
  elsif jsonb_typeof(p->'min') is distinct from 'number' or jsonb_typeof(p->'max') is distinct from 'number' or (p->>'min')::numeric<0 or (p->>'max')::numeric<(p->>'min')::numeric or (p->>'max')::numeric>1000000000000 then return false; end if;
  if p->>'kind'='reference' and coalesce(length(trim(p->>'evidence')),0)=0 then return false; end if;
  if p->>'kind'<>'quote_required' and ((p->>'min')::numeric<>trunc((p->>'min')::numeric) or (p->>'max')::numeric<>trunc((p->>'max')::numeric)) then return false; end if;
  foreach k in array array['evidence','notes'] loop if jsonb_typeof(p->k) is distinct from 'string' or length(p->>k)>1000 then return false; end if; end loop;
  foreach k in array array['included','conditions'] loop if jsonb_typeof(v->k) is distinct from 'array' or jsonb_array_length(v->k)>15 then return false; end if; for item in select value from jsonb_array_elements(v->k) loop if jsonb_typeof(item) is distinct from 'string' or length(item#>>'{}') not between 1 and 1000 then return false; end if; end loop; end loop;
  if jsonb_array_length(v->'included')>12 then return false; end if;
  if jsonb_array_length(v->'conditions')<1 or jsonb_typeof(v->'sources') is distinct from 'array' or jsonb_array_length(v->'sources') not between 1 and 8 then return false; end if;
  for item in select value from jsonb_array_elements(v->'sources') loop if jsonb_typeof(item->'url') is distinct from 'string' or item->>'url' !~ '^https://' or length(item->>'url')>5000 or jsonb_typeof(item->'title') is distinct from 'string' or length(item->>'title')>500 then return false; end if; end loop;
 end loop;
 return (select count(distinct value->>'id')=jsonb_array_length(d->'options') from jsonb_array_elements(d->'options'));
exception when others then return false; end; $$;
create or replace function public.valid_proposal_data(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(d) is distinct from 'object' then return false; end if;
 foreach k in array array['title','objectives','audience','theme','agenda','assumptions'] loop if jsonb_typeof(d->k) is distinct from 'string' or length(trim(d->>k)) not between 1 and 5000 then return false; end if; end loop;
 if d ? 'budget' and not public.valid_budget(d->'budget') then return false; end if;
 return true;
end; $$;
revoke all on function public.valid_budget(jsonb),public.valid_venue_search(jsonb) from public,anon,authenticated;

create or replace function public.save_planning(p_brief_id uuid,p_action text,p_expected_revision integer,p_brief_version integer,p_payload jsonb,p_confirm boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.briefs; m public.agency_members; s jsonb; proposal jsonb; next_version integer; chosen jsonb; picked jsonb; proposal_data jsonb; field_name text;
begin
 select * into m from public.agency_members where user_id=auth.uid() for share;
 if not found then raise exception 'Agency membership required'; end if;
 select * into b from public.briefs where id=p_brief_id and agency_id=m.agency_id for update;
 if not found then raise exception 'Brief not found in your agency'; end if;
 select state into s from public.brief_planning where brief_id=b.id for update;
 if not found then s=jsonb_build_object('revision',0,'briefVersion',b.version,'concepts','[]'::jsonb,'selectedId',null,'proposal',null,'history','[]'::jsonb); end if;
 s=jsonb_build_object('venueSearch',null,'selectedVenue',null)||s;
 if p_expected_revision is null or p_brief_version is null or (s->>'revision')::integer<>p_expected_revision or b.version<>p_brief_version then
  raise exception 'Planning or brief version conflict. Reload before saving.';
 end if;
 if p_action='searchVenues' then
  if not public.valid_venue_search(p_payload->'venueSearch') or (p_payload->'venueSearch'->>'briefVersion')::integer<>b.version then raise exception 'Invalid planning data'; end if;
  s=s||jsonb_build_object('venueSearch',p_payload->'venueSearch');
 elsif p_action='selectVenue' then
  if (s->'venueSearch'->>'briefVersion')::integer is distinct from b.version then raise exception 'Brief changed. Search venues first.'; end if;
  select value into picked from jsonb_array_elements(s->'venueSearch'->'options') where value->>'id'=p_payload->'selectedVenue'->'venue'->>'id';
  if not found then raise exception 'Venue not found'; end if;
  if jsonb_typeof(p_payload->'selectedVenue'->'quantity') is distinct from 'number' or (p_payload->'selectedVenue'->>'quantity')::numeric not between 1 and 100000 or (p_payload->'selectedVenue'->>'quantity')::numeric<>trunc((p_payload->'selectedVenue'->>'quantity')::numeric) then raise exception 'Invalid planning data'; end if;
  chosen=jsonb_build_object('venue',picked,'quantity',p_payload->'selectedVenue'->'quantity','briefVersion',b.version,'selectedAt',clock_timestamp());
  s=s||jsonb_build_object('selectedVenue',chosen);
  if s->>'proposal' is not null and (s->'proposal'->>'briefVersion')::integer=b.version and s->'proposal'->>'conceptId'=s->>'selectedId' then
   if not public.valid_proposal_data(p_payload->'data') or not public.valid_budget(p_payload->'data'->'budget') then raise exception 'Invalid planning data'; end if;
   foreach field_name in array array['title','objectives','audience','theme','agenda','assumptions'] loop
    if p_payload->'data'->field_name is distinct from s->'proposal'->'data'->field_name then raise exception 'Venue selection must preserve saved proposal content'; end if;
   end loop;
   if s->'proposal'->'data' ? 'budget' then
    if ((p_payload->'data'->'budget')-'items') is distinct from ((s->'proposal'->'data'->'budget')-'items') or
     (select jsonb_agg(value) from jsonb_array_elements(p_payload->'data'->'budget'->'items') where value->>'category'<>'venue') is distinct from
     (select jsonb_agg(value) from jsonb_array_elements(s->'proposal'->'data'->'budget'->'items') where value->>'category'<>'venue') then raise exception 'Venue selection must preserve other budget items'; end if;
   end if;
   proposal_data=(p_payload->'data')||jsonb_build_object('venue',chosen);
   next_version=jsonb_array_length(s->'history')+1;
   proposal=jsonb_build_object('data',proposal_data,'version',next_version,'briefVersion',b.version,'conceptId',s->>'selectedId','status','Draft','author',m.display_name,'createdAt',clock_timestamp());
   s=s||jsonb_build_object('proposal',proposal,'history',(s->'history')||jsonb_build_array(proposal));
  end if;
 elsif p_action='generateConcepts' then
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
   if not public.valid_proposal_data(p_payload->'data') or not public.valid_budget(p_payload->'data'->'budget') then raise exception 'Invalid planning data'; end if;
   if p_action='generateProposal' and s->>'proposal' is not null and p_confirm is not true then raise exception 'Confirmation required'; end if;
   if p_action='saveProposal' and (s->>'proposal' is null or s->'proposal'->>'conceptId' is distinct from s->>'selectedId' or (s->'proposal'->>'briefVersion')::integer is distinct from b.version) then raise exception 'Generate a current proposal first'; end if;
   proposal_data=(p_payload->'data')-'venue';
   if (s->'selectedVenue'->>'briefVersion')::integer=b.version then proposal_data=proposal_data||jsonb_build_object('venue',s->'selectedVenue'); end if;
   next_version=jsonb_array_length(s->'history')+1;
   proposal=jsonb_build_object('data',proposal_data,'version',next_version,'briefVersion',b.version,'conceptId',s->>'selectedId','status','Draft','author',m.display_name,'createdAt',clock_timestamp());
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
