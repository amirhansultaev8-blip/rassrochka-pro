create extension if not exists pgcrypto;

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  guarantor_name text,
  guarantor_phone text,
  product_name text not null,
  contract_number text not null,
  total_amount numeric(12,2) not null default 0,
  down_payment numeric(12,2) not null default 0,
  monthly_payment numeric(12,2) not null default 0,
  start_date date not null,
  next_payment_date date not null,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null,
  method text default 'Наличные',
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists contracts_user_contract_number_idx on public.contracts(user_id, contract_number);
create index if not exists payments_contract_id_idx on public.payments(contract_id);
create index if not exists contracts_user_id_idx on public.contracts(user_id);

alter table public.contracts enable row level security;
alter table public.payments enable row level security;

create policy "Users manage own contracts"
on public.contracts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own payments"
on public.payments
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace view public.contracts_dashboard as
select
  c.id,
  c.user_id,
  c.full_name,
  c.phone,
  c.guarantor_name,
  c.guarantor_phone,
  c.product_name,
  c.contract_number,
  c.total_amount,
  c.down_payment,
  c.monthly_payment,
  c.start_date,
  c.next_payment_date,
  c.end_date,
  c.notes,
  c.created_at,
  coalesce((
    select sum(p.amount)
    from public.payments p
    where p.contract_id = c.id
  ), 0) + coalesce(c.down_payment, 0) as paid_total,
  greatest(c.total_amount - (
    coalesce((
      select sum(p.amount)
      from public.payments p
      where p.contract_id = c.id
    ), 0) + coalesce(c.down_payment, 0)
  ), 0) as balance,
  case
    when greatest(c.total_amount - (
      coalesce((select sum(p.amount) from public.payments p where p.contract_id = c.id), 0) + coalesce(c.down_payment, 0)
    ), 0) = 0 then 'closed'
    when c.next_payment_date < current_date then 'overdue'
    when c.next_payment_date <= current_date + interval '5 day' then 'soon'
    else 'active'
  end as status
from public.contracts c;

grant select on public.contracts_dashboard to authenticated;

create policy "Users view own dashboard rows"
on public.contracts
for select
using (auth.uid() = user_id);
