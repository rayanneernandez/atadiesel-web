-- =====================================================================
-- LOJA AUTÔNOMA (integração com o web da Loja Autônoma / aghora)
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run).
-- Seguro para rodar mais de uma vez. Não altera nenhuma tabela existente.
--
--   autonomous_staff      funcionários que podem entrar na loja autônoma (o dono cadastra aqui)
--   autonomous_sales      vendas feitas na loja autônoma (a Edge Function grava; o painel só lê)
--   autonomous_sync_state situação da última sincronização com o web da loja autônoma
-- =====================================================================

-- 1. Quem pode gerenciar: administrador ou quem tem a permissão "Loja Autônoma"
create or replace function public.can_manage_autonomous()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (lower(role) in ('admin', 'administrador')
           or coalesce((permissions ->> 'Loja Autônoma')::boolean, false))
  );
$$;

-- 2. Funcionários da loja autônoma (cadastrados pelo dono; o web só recebe a lista)
create table if not exists public.autonomous_staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,                                                    -- opcional: id do usuário no painel (sem vínculo)
  name text not null,
  cpf text check (cpf ~ '^[0-9]{11}
  role_title text not null default 'Funcionário',
  active boolean not null default true,
  access_days text not null default '0123456' check (access_days ~ '^[0-6]{0,7}$'),  -- 0=segunda ... 6=domingo
  access_start time,                                                  -- vazio = 00:00
  access_end time,                                                    -- vazio = 23:59 (início > fim vira a noite)
  access_until timestamptz,                                           -- acesso temporário: termina aqui
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint autonomous_staff_cpf_uk unique (cpf),
  constraint autonomous_staff_profile_uk unique (profile_id)
);

alter table public.autonomous_staff enable row level security;

drop policy if exists "loja autonoma: equipe le funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe le funcionarios" on public.autonomous_staff
  for select to authenticated using (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe cadastra funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe cadastra funcionarios" on public.autonomous_staff
  for insert to authenticated with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe altera funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe altera funcionarios" on public.autonomous_staff
  for update to authenticated using (public.can_manage_autonomous()) with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe remove funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe remove funcionarios" on public.autonomous_staff
  for delete to authenticated using (public.can_manage_autonomous());

create or replace function public.autonomous_staff_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists autonomous_staff_touch on public.autonomous_staff;
create trigger autonomous_staff_touch before update on public.autonomous_staff
  for each row execute function public.autonomous_staff_touch();

-- 2b. Produtos que NÃO vão para a loja autônoma. Por padrão TODOS vão; aqui ficam só as exclusões (enabled = false).
create table if not exists public.autonomous_products (
  product_id uuid primary key,   -- id do produto em public.products (sem vínculo: a tabela de produtos não é alterada)
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.autonomous_products enable row level security;

drop policy if exists "loja autonoma: equipe le produtos" on public.autonomous_products;
create policy "loja autonoma: equipe le produtos" on public.autonomous_products
  for select to authenticated using (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe escolhe produtos" on public.autonomous_products;
create policy "loja autonoma: equipe escolhe produtos" on public.autonomous_products
  for insert to authenticated with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe altera produtos" on public.autonomous_products;
create policy "loja autonoma: equipe altera produtos" on public.autonomous_products
  for update to authenticated using (public.can_manage_autonomous()) with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe remove produtos" on public.autonomous_products;
create policy "loja autonoma: equipe remove produtos" on public.autonomous_products
  for delete to authenticated using (public.can_manage_autonomous());

-- 3. Vendas da loja autônoma (a Edge Function "loja-autonoma" grava com a service role)
create table if not exists public.autonomous_sales (
  id text primary key,                      -- id do evento: "sale-123" (evita duplicar se reenviado)
  paid_at timestamptz,
  amount_cents integer not null,            -- em centavos (R$ 12,34 = 1234)
  method text,                              -- pix | apple_pay | google_pay | samsung_pay | card
  session_id bigint,
  party_size integer,
  customer_cpf text,                        -- só números
  customer_phone text,
  customer_name text,
  items jsonb not null default '[]'::jsonb, -- [{ "sku","name","quantity","unit_price_cents","subtotal_cents" }]
  coupon jsonb,                             -- { "number","status","url" }
  store jsonb,                              -- { "id","slug","name" } da loja no web da loja autônoma
  received_at timestamptz not null default now()
);

create index if not exists autonomous_sales_paid_idx on public.autonomous_sales (paid_at desc);
create index if not exists autonomous_sales_cpf_idx on public.autonomous_sales (customer_cpf);

alter table public.autonomous_sales enable row level security;

-- Equipe com permissão em "Vendas" vê tudo; o cliente do app vê só as compras dele (pelo CPF).
-- Ninguém grava pelo painel: só a Edge Function (service role ignora RLS).
drop policy if exists "loja autonoma: vendas, equipe ve tudo e cliente as suas" on public.autonomous_sales;
create policy "loja autonoma: vendas, equipe ve tudo e cliente as suas" on public.autonomous_sales
  for select to authenticated
  using (public.can_view_all_sales()
         or (coalesce(customer_cpf, '') <> '' and customer_cpf = public.my_document()));

-- 4. Situação da sincronização (uma linha só)
create table if not exists public.autonomous_sync_state (
  id integer primary key default 1 check (id = 1),
  last_products_at timestamptz,
  last_staff_at timestamptz,
  last_result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.autonomous_sync_state (id) values (1) on conflict (id) do nothing;

alter table public.autonomous_sync_state enable row level security;
drop policy if exists "loja autonoma: equipe le sincronizacao" on public.autonomous_sync_state;
create policy "loja autonoma: equipe le sincronizacao" on public.autonomous_sync_state
  for select to authenticated using (public.can_manage_autonomous());

-- Para quem já rodou a versão anterior deste arquivo: CPF e telefone passam a poder ficar vazios
-- até o dono completar (a sincronização só envia quem tem os dois).
alter table public.autonomous_staff alter column cpf drop not null;
alter table public.autonomous_staff alter column phone drop not null;

-- Conferir
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'autonomous_%' order by 1;
),                               -- só números; o dono completa depois
  phone text check (phone ~ '^[0-9]{10,11}
  role_title text not null default 'Funcionário',
  active boolean not null default true,
  access_days text not null default '0123456' check (access_days ~ '^[0-6]{0,7}$'),  -- 0=segunda ... 6=domingo
  access_start time,                                                  -- vazio = 00:00
  access_end time,                                                    -- vazio = 23:59 (início > fim vira a noite)
  access_until timestamptz,                                           -- acesso temporário: termina aqui
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint autonomous_staff_cpf_uk unique (cpf)
);

alter table public.autonomous_staff enable row level security;

drop policy if exists "loja autonoma: equipe le funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe le funcionarios" on public.autonomous_staff
  for select to authenticated using (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe cadastra funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe cadastra funcionarios" on public.autonomous_staff
  for insert to authenticated with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe altera funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe altera funcionarios" on public.autonomous_staff
  for update to authenticated using (public.can_manage_autonomous()) with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe remove funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe remove funcionarios" on public.autonomous_staff
  for delete to authenticated using (public.can_manage_autonomous());

create or replace function public.autonomous_staff_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists autonomous_staff_touch on public.autonomous_staff;
create trigger autonomous_staff_touch before update on public.autonomous_staff
  for each row execute function public.autonomous_staff_touch();

-- 2b. Quais produtos entram na loja autônoma (o dono escolhe; o resto do catálogo não é enviado)
create table if not exists public.autonomous_products (
  product_id uuid primary key,   -- id do produto em public.products (sem vínculo: a tabela de produtos não é alterada)
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.autonomous_products enable row level security;

drop policy if exists "loja autonoma: equipe le produtos" on public.autonomous_products;
create policy "loja autonoma: equipe le produtos" on public.autonomous_products
  for select to authenticated using (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe escolhe produtos" on public.autonomous_products;
create policy "loja autonoma: equipe escolhe produtos" on public.autonomous_products
  for insert to authenticated with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe altera produtos" on public.autonomous_products;
create policy "loja autonoma: equipe altera produtos" on public.autonomous_products
  for update to authenticated using (public.can_manage_autonomous()) with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe remove produtos" on public.autonomous_products;
create policy "loja autonoma: equipe remove produtos" on public.autonomous_products
  for delete to authenticated using (public.can_manage_autonomous());

-- 3. Vendas da loja autônoma (a Edge Function "loja-autonoma" grava com a service role)
create table if not exists public.autonomous_sales (
  id text primary key,                      -- id do evento: "sale-123" (evita duplicar se reenviado)
  paid_at timestamptz,
  amount_cents integer not null,            -- em centavos (R$ 12,34 = 1234)
  method text,                              -- pix | apple_pay | google_pay | samsung_pay | card
  session_id bigint,
  party_size integer,
  customer_cpf text,                        -- só números
  customer_phone text,
  customer_name text,
  items jsonb not null default '[]'::jsonb, -- [{ "sku","name","quantity","unit_price_cents","subtotal_cents" }]
  coupon jsonb,                             -- { "number","status","url" }
  store jsonb,                              -- { "id","slug","name" } da loja no web da loja autônoma
  received_at timestamptz not null default now()
);

create index if not exists autonomous_sales_paid_idx on public.autonomous_sales (paid_at desc);
create index if not exists autonomous_sales_cpf_idx on public.autonomous_sales (customer_cpf);

alter table public.autonomous_sales enable row level security;

-- Equipe com permissão em "Vendas" vê tudo; o cliente do app vê só as compras dele (pelo CPF).
-- Ninguém grava pelo painel: só a Edge Function (service role ignora RLS).
drop policy if exists "loja autonoma: vendas, equipe ve tudo e cliente as suas" on public.autonomous_sales;
create policy "loja autonoma: vendas, equipe ve tudo e cliente as suas" on public.autonomous_sales
  for select to authenticated
  using (public.can_view_all_sales()
         or (coalesce(customer_cpf, '') <> '' and customer_cpf = public.my_document()));

-- 4. Situação da sincronização (uma linha só)
create table if not exists public.autonomous_sync_state (
  id integer primary key default 1 check (id = 1),
  last_products_at timestamptz,
  last_staff_at timestamptz,
  last_result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.autonomous_sync_state (id) values (1) on conflict (id) do nothing;

alter table public.autonomous_sync_state enable row level security;
drop policy if exists "loja autonoma: equipe le sincronizacao" on public.autonomous_sync_state;
create policy "loja autonoma: equipe le sincronizacao" on public.autonomous_sync_state
  for select to authenticated using (public.can_manage_autonomous());

-- Conferir
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'autonomous_%' order by 1;
),                       -- DDD + número, só números
  role_title text not null default 'Funcionário',
  active boolean not null default true,
  access_days text not null default '0123456' check (access_days ~ '^[0-6]{0,7}$'),  -- 0=segunda ... 6=domingo
  access_start time,                                                  -- vazio = 00:00
  access_end time,                                                    -- vazio = 23:59 (início > fim vira a noite)
  access_until timestamptz,                                           -- acesso temporário: termina aqui
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint autonomous_staff_cpf_uk unique (cpf)
);

alter table public.autonomous_staff enable row level security;

drop policy if exists "loja autonoma: equipe le funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe le funcionarios" on public.autonomous_staff
  for select to authenticated using (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe cadastra funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe cadastra funcionarios" on public.autonomous_staff
  for insert to authenticated with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe altera funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe altera funcionarios" on public.autonomous_staff
  for update to authenticated using (public.can_manage_autonomous()) with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe remove funcionarios" on public.autonomous_staff;
create policy "loja autonoma: equipe remove funcionarios" on public.autonomous_staff
  for delete to authenticated using (public.can_manage_autonomous());

create or replace function public.autonomous_staff_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists autonomous_staff_touch on public.autonomous_staff;
create trigger autonomous_staff_touch before update on public.autonomous_staff
  for each row execute function public.autonomous_staff_touch();

-- 2b. Quais produtos entram na loja autônoma (o dono escolhe; o resto do catálogo não é enviado)
create table if not exists public.autonomous_products (
  product_id uuid primary key,   -- id do produto em public.products (sem vínculo: a tabela de produtos não é alterada)
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.autonomous_products enable row level security;

drop policy if exists "loja autonoma: equipe le produtos" on public.autonomous_products;
create policy "loja autonoma: equipe le produtos" on public.autonomous_products
  for select to authenticated using (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe escolhe produtos" on public.autonomous_products;
create policy "loja autonoma: equipe escolhe produtos" on public.autonomous_products
  for insert to authenticated with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe altera produtos" on public.autonomous_products;
create policy "loja autonoma: equipe altera produtos" on public.autonomous_products
  for update to authenticated using (public.can_manage_autonomous()) with check (public.can_manage_autonomous());

drop policy if exists "loja autonoma: equipe remove produtos" on public.autonomous_products;
create policy "loja autonoma: equipe remove produtos" on public.autonomous_products
  for delete to authenticated using (public.can_manage_autonomous());

-- 3. Vendas da loja autônoma (a Edge Function "loja-autonoma" grava com a service role)
create table if not exists public.autonomous_sales (
  id text primary key,                      -- id do evento: "sale-123" (evita duplicar se reenviado)
  paid_at timestamptz,
  amount_cents integer not null,            -- em centavos (R$ 12,34 = 1234)
  method text,                              -- pix | apple_pay | google_pay | samsung_pay | card
  session_id bigint,
  party_size integer,
  customer_cpf text,                        -- só números
  customer_phone text,
  customer_name text,
  items jsonb not null default '[]'::jsonb, -- [{ "sku","name","quantity","unit_price_cents","subtotal_cents" }]
  coupon jsonb,                             -- { "number","status","url" }
  store jsonb,                              -- { "id","slug","name" } da loja no web da loja autônoma
  received_at timestamptz not null default now()
);

create index if not exists autonomous_sales_paid_idx on public.autonomous_sales (paid_at desc);
create index if not exists autonomous_sales_cpf_idx on public.autonomous_sales (customer_cpf);

alter table public.autonomous_sales enable row level security;

-- Equipe com permissão em "Vendas" vê tudo; o cliente do app vê só as compras dele (pelo CPF).
-- Ninguém grava pelo painel: só a Edge Function (service role ignora RLS).
drop policy if exists "loja autonoma: vendas, equipe ve tudo e cliente as suas" on public.autonomous_sales;
create policy "loja autonoma: vendas, equipe ve tudo e cliente as suas" on public.autonomous_sales
  for select to authenticated
  using (public.can_view_all_sales()
         or (coalesce(customer_cpf, '') <> '' and customer_cpf = public.my_document()));

-- 4. Situação da sincronização (uma linha só)
create table if not exists public.autonomous_sync_state (
  id integer primary key default 1 check (id = 1),
  last_products_at timestamptz,
  last_staff_at timestamptz,
  last_result jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.autonomous_sync_state (id) values (1) on conflict (id) do nothing;

alter table public.autonomous_sync_state enable row level security;
drop policy if exists "loja autonoma: equipe le sincronizacao" on public.autonomous_sync_state;
create policy "loja autonoma: equipe le sincronizacao" on public.autonomous_sync_state
  for select to authenticated using (public.can_manage_autonomous());

-- Conferir
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'autonomous_%' order by 1;
