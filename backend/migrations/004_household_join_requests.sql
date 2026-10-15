create table if not exists public.household_join_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  requester_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists household_pending_join_request_unique
  on public.household_join_requests(household_id, requester_id)
  where status = 'pending';
create index if not exists household_join_requests_household_status_idx
  on public.household_join_requests(household_id, status, created_at desc);

alter table public.household_join_requests enable row level security;
revoke all on public.household_join_requests from anon, authenticated;

create or replace function public.find_expense_household(p_name text)
returns table(id uuid, name text)
language sql stable security definer set search_path = public as $$
  select h.id, h.name from households h
  where lower(h.name) = lower(trim(p_name))
  order by h.created_at
$$;
revoke all on function public.find_expense_household(text) from public, anon, authenticated;
grant execute on function public.find_expense_household(text) to service_role;
