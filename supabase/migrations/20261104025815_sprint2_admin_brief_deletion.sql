-- Members edit briefs and preserve audit history. Destructive deletion is admin-only.
create or replace function public.delete_brief(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.agency_members;
begin
  select * into m from public.agency_members where user_id=auth.uid();
  if not found or m.role <> 'admin' then raise exception 'Administrator permission required'; end if;
  delete from public.briefs where id=p_id and agency_id=m.agency_id;
  if not found then raise exception 'Brief not found in your agency'; end if;
end;
$$;
revoke all on function public.delete_brief(uuid) from public, anon, authenticated;
grant execute on function public.delete_brief(uuid) to authenticated;
