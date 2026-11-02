do $$
begin
  if exists (
    select user_id
    from public.household_members
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one household per user: resolve duplicate household memberships before applying migration 005.';
  end if;
end $$;

create unique index if not exists household_member_one_space_per_user
  on public.household_members(user_id);

create or replace function public.create_expense_household(p_user_id uuid, p_name text)
returns table(id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare created_household_id uuid;
begin
  if exists (
    select 1 from household_members where user_id = p_user_id
  ) then
    raise exception using errcode = '23505', message = 'User already belongs to a household';
  end if;

  insert into households(name, created_by)
    values (p_name, p_user_id)
    returning households.id into created_household_id;
  insert into household_members(household_id, user_id, role)
    values (created_household_id, p_user_id, 'owner');

  return query
    select h.id, h.name from households h where h.id = created_household_id;
end $$;
revoke all on function public.create_expense_household(uuid, text) from public, anon, authenticated;
grant execute on function public.create_expense_household(uuid, text) to service_role;

create or replace function public.rename_expense_category(
  p_category_id uuid,
  p_user_id uuid,
  p_household_id uuid,
  p_new_name text
)
returns table(id uuid, name text, type text, user_id uuid, household_id uuid)
language plpgsql security definer set search_path = public as $$
declare old_name text; category_type text;
begin
  select c.name, c.type into old_name, category_type
    from transaction_categories c
    where c.id = p_category_id
      and (
        (p_household_id is null and c.user_id = p_user_id and c.household_id is null)
        or (p_household_id is not null and c.household_id = p_household_id and c.user_id is null)
      )
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Category not found';
  end if;

  update transactions t set category = p_new_name
    where t.category = old_name and t.type = category_type
      and (
        (p_household_id is null and t.user_id = p_user_id and t.household_id is null)
        or (p_household_id is not null and t.household_id = p_household_id and t.user_id is null)
      );
  update transaction_categories c set name = p_new_name where c.id = p_category_id;

  return query
    select c.id, c.name, c.type, c.user_id, c.household_id
    from transaction_categories c where c.id = p_category_id;
end $$;
revoke all on function public.rename_expense_category(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.rename_expense_category(uuid, uuid, uuid, text) to service_role;
