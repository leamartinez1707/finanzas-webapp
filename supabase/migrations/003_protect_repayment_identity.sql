-- Preserve repayment ownership and household identity after creation.
create or replace function public.prevent_repayment_identity_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.household_id is distinct from old.household_id
    or new.created_by is distinct from old.created_by then
    raise exception 'Repayment household_id and created_by cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_repayment_identity_change on public.repayments;
create trigger prevent_repayment_identity_change
before update on public.repayments
for each row
execute function public.prevent_repayment_identity_change();
