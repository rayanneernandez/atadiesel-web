-- =====================================================================
-- VENDAS DO ERP + RECIBOS (PDF) LIGADOS AO CLIENTE
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run)
-- A sincronização (Edge Function rapid-handler) preenche; o painel e o app só leem.
-- =====================================================================

-- 1. Vendas (uma linha por nota/cupom de saída)
create table if not exists public.erp_sales (
  id text primary key,                 -- Id do ERP: "100|172221"
  estab integer,
  modelo text,                         -- 55 = NF-e, 65 = NFC-e (balcão), 59 = CF-e SAT
  numero text,
  serie text,
  chave_acesso text,
  emitted_at timestamptz,              -- data e hora da venda
  emissao date,
  operacao text,                       -- descrição da operação no ERP
  status_fiscal text,                  -- Regular, Cancelado...
  cliente_nome text,
  cliente_doc text,                    -- CPF/CNPJ só números (vazio no balcão sem CPF)
  cliente_email text,
  valor_total numeric(14,2) not null default 0,
  desconto numeric(14,2) not null default 0,
  pagamentos jsonb not null default '[]'::jsonb,   -- [{ "forma": "PIX", "valor": 10 }]
  itens jsonb not null default '[]'::jsonb,        -- [{ "codigo","descricao","quantidade","unidade","valor_unit","desconto","total" }]
  pdf_path text,                       -- arquivo no Storage (bucket "recibos")
  synced_at timestamptz not null default now()
);

create index if not exists erp_sales_emitted_idx on public.erp_sales (emitted_at desc);
create index if not exists erp_sales_doc_idx on public.erp_sales (cliente_doc);

-- 2. Posição da leitura de notas na sincronização
alter table public.erp_sync_state add column if not exists docs_skip bigint;
alter table public.erp_sync_state add column if not exists docs_start date default date '2026-09-01';  -- importa o histórico a partir desta data

-- 3. Quem pode ver
--    Equipe: administrador ou quem tem a permissão "Vendas"
--    Cliente do app: só as vendas com o CPF/CNPJ dele
create or replace function public.can_view_all_sales()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (lower(role) in ('admin', 'administrador') or coalesce((permissions ->> 'Vendas')::boolean, false))
  );
$$;

create or replace function public.my_document()
returns text language sql stable security definer set search_path = public as $$
  select nullif(regexp_replace(coalesce(cpf, ''), '\D', '', 'g'), '') from public.profiles where id = auth.uid();
$$;

alter table public.erp_sales enable row level security;

drop policy if exists "vendas: equipe ve tudo, cliente ve as suas" on public.erp_sales;
create policy "vendas: equipe ve tudo, cliente ve as suas" on public.erp_sales
  for select to authenticated
  using (public.can_view_all_sales() or (cliente_doc <> '' and cliente_doc = public.my_document()));

-- 4. Storage dos PDFs (privado)
insert into storage.buckets (id, name, public)
values ('recibos', 'recibos', false)
on conflict (id) do nothing;

drop policy if exists "recibos: equipe e dono da venda" on storage.objects;
create policy "recibos: equipe e dono da venda" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recibos'
    and (
      public.can_view_all_sales()
      or exists (
        select 1 from public.erp_sales s
        where s.pdf_path = storage.objects.name
          and s.cliente_doc <> ''
          and s.cliente_doc = public.my_document()
      )
    )
  );

select 'ok' as resultado;
