-- Description-only orders are delivered as text. Other packages still require a photo ZIP.
CREATE OR REPLACE FUNCTION public.enforce_order_photographer_workflow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_uid uuid := auth.uid();
  v_auth_role text := coalesce(auth.role(), '');
begin
  if new.photographer_id is not null and not public.is_active_photographer(new.photographer_id) then
    raise exception 'Assigned photographer is not active';
  end if;

  if tg_op = 'UPDATE' and new.photographer_id is distinct from old.photographer_id then
    if v_role <> 'admin' and v_auth_role <> 'service_role' then
      raise exception 'Only an admin can assign or reassign photographers';
    end if;
    if new.photographer_id is not null then
      new.assigned_at := now();
      new.assigned_by := v_uid;
      if new.status = 'paid' then new.status := 'processing'; end if;
    else
      new.assigned_at := null;
      new.assigned_by := null;
      if new.status = 'processing' then new.status := 'paid'; end if;
    end if;
  end if;

  if tg_op = 'UPDATE' and v_role = 'photographer' and v_auth_role <> 'service_role' then
    if old.photographer_id is distinct from v_uid or new.photographer_id is distinct from old.photographer_id then
      raise exception 'Photographers may only update their assigned jobs';
    end if;
    if new.user_id is distinct from old.user_id
      or new.address is distinct from old.address
      or new.customer_name is distinct from old.customer_name
      or new.service is distinct from old.service
      or new.notes is distinct from old.notes
      or new.paid_at is distinct from old.paid_at
      or new.assigned_at is distinct from old.assigned_at
      or new.assigned_by is distinct from old.assigned_by
    then
      raise exception 'Photographer cannot modify client or assignment details';
    end if;
    if new.status not in ('processing', 'ready') then
      raise exception 'Photographer may only set a job to processing or ready';
    end if;
    if new.status = 'ready' then
      if new.service in ('description','declutter-description','stage-description')
        and (new.description is null or length(trim(new.description)) = 0) then
        raise exception 'A written property description is required before marking the job ready';
      end if;
      if new.service <> 'description'
        and (new.delivery_zip_path is null or length(trim(new.delivery_zip_path)) = 0) then
        raise exception 'A delivery ZIP is required before marking the job ready';
      end if;
      if new.completed_at is null then new.completed_at := now(); end if;
    end if;
  end if;

  return new;
end;
$function$
;
