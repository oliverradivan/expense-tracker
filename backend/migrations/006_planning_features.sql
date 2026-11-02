create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  category text not null default '',
  amount numeric(12,2) not null check (amount > 0),
  check ((user_id is not null and household_id is null) or (user_id is null and household_id is not null))
);
create unique index monthly_budget_private_unique on public.monthly_budgets(user_id, month, lower(category)) where user_id is not null;
create unique index monthly_budget_household_unique on public.monthly_budgets(household_id, month, lower(category)) where household_id is not null;

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  check ((user_id is not null and household_id is null) or (user_id is null and household_id is not null))
);

create table public.recurring_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  type text not null check (type in ('expense','income')),
  category text not null,
  label text not null check (char_length(trim(label)) between 1 and 100),
  amount numeric(12,2) not null check (amount > 0),
  frequency text not null check (frequency in ('monthly','yearly')),
  next_due date not null,
  created_at timestamptz not null default now(),
  check ((user_id is not null and household_id is null) or (user_id is null and household_id is not null))
);

create index recurring_reminders_private_due_idx on public.recurring_reminders(user_id, next_due) where user_id is not null;
create index recurring_reminders_household_due_idx on public.recurring_reminders(household_id, next_due) where household_id is not null;

alter table public.monthly_budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.recurring_reminders enable row level security;
revoke all on public.monthly_budgets, public.savings_goals, public.recurring_reminders from anon, authenticated;

create or replace function public.add_expense_goal_contribution(p_goal_id uuid, p_user_id uuid, p_household_id uuid, p_amount numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare updated_amount numeric;
begin
  update savings_goals set saved_amount = least(target_amount, saved_amount + p_amount)
    where id = p_goal_id and (
      (p_household_id is null and user_id = p_user_id and household_id is null)
      or (p_household_id is not null and household_id = p_household_id and user_id is null)
    )
    returning saved_amount into updated_amount;
  if not found then raise exception using errcode = 'P0002', message = 'Goal not found'; end if;
  return updated_amount;
end $$;
revoke all on function public.add_expense_goal_contribution(uuid, uuid, uuid, numeric) from public, anon, authenticated;
grant execute on function public.add_expense_goal_contribution(uuid, uuid, uuid, numeric) to service_role;

create or replace function public.log_expense_reminder(p_reminder_id uuid, p_user_id uuid, p_household_id uuid)
returns table(transaction_id uuid, next_due date)
language plpgsql security definer set search_path = public as $$
declare reminder public.recurring_reminders%rowtype; created_id uuid; due_date date;
begin
  select * into reminder from recurring_reminders where id = p_reminder_id and (
    (p_household_id is null and user_id = p_user_id and household_id is null)
    or (p_household_id is not null and household_id = p_household_id and user_id is null)
  ) for update;
  if not found then raise exception using errcode = 'P0002', message = 'Reminder not found'; end if;
  if reminder.next_due > current_date then raise exception using errcode = 'P0001', message = 'This reminder is not due yet'; end if;

  insert into transactions(user_id, household_id, type, category, label, amount, date, frequency)
    values (reminder.user_id, reminder.household_id, reminder.type, reminder.category, reminder.label, reminder.amount, reminder.next_due, reminder.frequency)
    returning id into created_id;

  due_date := reminder.next_due;
  while due_date <= current_date loop
    due_date := (due_date + case when reminder.frequency = 'monthly' then interval '1 month' else interval '1 year' end)::date;
  end loop;
  update recurring_reminders set next_due = due_date where id = reminder.id;
  return query select created_id, due_date;
end $$;
revoke all on function public.log_expense_reminder(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.log_expense_reminder(uuid, uuid, uuid) to service_role;
