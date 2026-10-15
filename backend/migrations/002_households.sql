-- Add shared spaces while preserving every existing private transaction.
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  unique (household_id,user_id)
);
create table if not exists public.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  inviter_id uuid not null references public.users(id) on delete cascade,
  invitee_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (inviter_id <> invitee_id)
);
create unique index if not exists household_pending_invitation_unique
  on public.household_invitations(household_id, invitee_id) where status = 'pending';

alter table public.transactions alter column user_id drop not null;
alter table public.transactions add column if not exists household_id uuid references public.households(id) on delete restrict;
alter table public.transactions drop constraint if exists transactions_owner_exactly_one;
alter table public.transactions add constraint transactions_owner_exactly_one
  check ((user_id is not null and household_id is null) or (user_id is null and household_id is not null));
create index if not exists transactions_household_date_idx on public.transactions(household_id,date desc);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invitations enable row level security;
revoke all on public.households, public.household_members, public.household_invitations from anon, authenticated;
-- The backend uses the service key only after checking the signed session and membership.

-- Explicit account deletion policy: remove private transactions; retain shared transactions and
-- households, promote the oldest remaining member when the departing user owned one.
create or replace function public.delete_expense_user(target_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare h record; replacement uuid;
begin
  for h in select id from households where created_by = target_user_id loop
    select user_id into replacement from household_members
      where household_id = h.id and user_id <> target_user_id order by joined_at limit 1;
    update households set created_by = replacement where id = h.id;
    if replacement is not null then
      update household_members set role = 'owner' where household_id = h.id and user_id = replacement;
    end if;
  end loop;
  delete from users where id = target_user_id;
end $$;
revoke all on function public.delete_expense_user(uuid) from public, anon, authenticated;
grant execute on function public.delete_expense_user(uuid) to service_role;

-- Exact, case-insensitive lookup avoids treating username underscores as SQL wildcards.
create or replace function public.find_expense_user(p_username text)
returns table(id uuid, username text, password_hash text, token_version integer)
language sql stable security definer set search_path = public as $$
  select u.id, u.username, u.password_hash, u.token_version from users u
  where lower(u.username) = lower(p_username) limit 1
$$;
revoke all on function public.find_expense_user(text) from public, anon, authenticated;
grant execute on function public.find_expense_user(text) to service_role;

create or replace function public.find_expense_username(p_username text)
returns table(id uuid, username text)
language sql stable security definer set search_path = public as $$
  select u.id, u.username from users u
  where lower(u.username) = lower(p_username) limit 1
$$;
revoke all on function public.find_expense_username(text) from public, anon, authenticated;
grant execute on function public.find_expense_username(text) to service_role;
