-- =====================================================================
-- INTEGRAÇÃO ERP (Viasoft Petroshow / VsHub) -> products
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run)
-- DEPOIS de publicar a Edge Function "sync-erp".
-- =====================================================================

-- 1. Colunas de controle nos produtos
alter table public.products add column if not exists erp_descricao text;          -- último nome visto no ERP
alter table public.products add column if not exists erp_preco_cents integer;     -- último preço visto no ERP
alter table public.products add column if not exists erp_archived boolean not null default false; -- arquivado porque ficou inativo no ERP
alter table public.products add column if not exists erp_synced_at timestamptz;

create index if not exists products_sku_idx on public.products (sku);

-- 2. Estado da sincronização (uma linha só)
create table if not exists public.erp_sync_state (
  id integer primary key default 1 check (id = 1),
  last_ult_alt timestamptz,          -- até quando as alterações de cadastro já foram lidas
  baseline_done boolean not null default false,
  baseline_skip integer not null default 0,
  baseline_started_at timestamptz,
  price_available boolean,
  price_checked_at timestamptz,
  running_since timestamptz,
  last_run_at timestamptz,
  last_result jsonb
);
insert into public.erp_sync_state (id) values (1) on conflict (id) do nothing;

-- 3. Códigos que já existiam no ERP quando a integração começou.
--    Serve para NÃO puxar os ~5 mil produtos antigos: só entra produto novo de verdade.
create table if not exists public.erp_known_codes (
  code text primary key,
  first_seen_at timestamptz not null default now()
);

-- Só a Edge Function (service role) escreve. O painel só lê o estado.
alter table public.erp_sync_state enable row level security;
alter table public.erp_known_codes enable row level security;

drop policy if exists "painel le estado erp" on public.erp_sync_state;
create policy "painel le estado erp" on public.erp_sync_state
  for select to authenticated using (true);

-- 4. Agendamento a cada 5 minutos (pg_cron + pg_net)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('sync-erp') where exists (select 1 from cron.job where jobname = 'sync-erp');

select cron.schedule(
  'sync-erp',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://crbqwpcwrottjveedolz.supabase.co/functions/v1/rapid-handler',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"source":"cron"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- Conferir
select jobname, schedule, active from cron.job where jobname = 'sync-erp';
