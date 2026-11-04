-- Supabase's default function privileges can include anon explicitly.
-- Revoking PUBLIC alone does not revoke that separate grant.
revoke all on function public.current_agency(), public.save_brief(jsonb,uuid,integer),
  public.delete_brief(uuid), public.change_member_role(uuid,text),
  public.add_agency_member(text,text,text), public.remove_agency_member(uuid)
  from public, anon, authenticated;
grant execute on function public.current_agency(), public.save_brief(jsonb,uuid,integer),
  public.delete_brief(uuid), public.change_member_role(uuid,text),
  public.add_agency_member(text,text,text), public.remove_agency_member(uuid)
  to authenticated;
