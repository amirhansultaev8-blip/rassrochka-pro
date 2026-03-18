create extension if not exists pgcrypto;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  phone text,
  product text,
  guarantor text,
  total_price numeric default 0,
  monthly_payment numeric default 0,
  next_payment_date date,
  contract_number text,
  created_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric not null default 0,
  created_at timestamptz default now()
);

alter table public.clients enable row level security;
alter table public.payments enable row level security;

do $$ begin
  create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "payments_insert_own" on public.payments for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "payments_update_own" on public.payments for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "payments_delete_own" on public.payments for delete using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
