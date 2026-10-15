-- User and household scoped categories; each category belongs to exactly one space.
create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  type text not null check (type in ('expense','income')),
  name text not null check (char_length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  check ((user_id is not null and household_id is null) or (user_id is null and household_id is not null))
);
create unique index if not exists private_category_name_unique
  on public.transaction_categories(user_id, type, lower(name)) where user_id is not null;
create unique index if not exists household_category_name_unique
  on public.transaction_categories(household_id, type, lower(name)) where household_id is not null;
create index if not exists transaction_categories_household_idx
  on public.transaction_categories(household_id, type) where household_id is not null;
alter table public.transaction_categories enable row level security;
revoke all on public.transaction_categories from anon, authenticated;

alter table public.transactions add column if not exists frequency text not null default 'one_time';
alter table public.transactions drop constraint if exists transactions_frequency_check;
alter table public.transactions add constraint transactions_frequency_check
  check (frequency in ('one_time','monthly','yearly'));
