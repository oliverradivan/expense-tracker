-- USERS
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null,
  password_hash text not null,
  token_version integer not null default 0,  -- bump to sign out all sessions
  created_at    timestamptz not null default now(),
  constraint users_username_format
    check (username ~ '^[A-Za-z0-9_]{3,30}$')
);

-- usernames are unique regardless of capitals ("Oliver" = "oliver")
create unique index users_username_lower_idx
  on public.users (lower(username));

-- TRANSACTIONS (income and expenses)
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null check (type in ('expense', 'income')),
  category    text not null,
  label       text not null check (char_length(label) between 1 and 100),
  amount      numeric(12,2) not null check (amount > 0),
  date        date not null,
  created_at  timestamptz not null default now()
);

create index transactions_user_date_idx
  on public.transactions (user_id, date desc);

-- PRIVACY LOCKDOWN
-- Row Level Security ON with NO policies = nobody using the public/anon
-- key can read or write anything. Only your backend's secret key can.
alter table public.users        enable row level security;
alter table public.transactions enable row level security;

revoke all on public.users        from anon, authenticated;
revoke all on public.transactions from anon, authenticated;