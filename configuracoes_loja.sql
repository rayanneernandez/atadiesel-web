-- =====================================================================
-- CONFIGURAÇÕES DA LOJA (tela "Nossa Loja" do app)
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run)
-- Editadas pelo painel em "Configurações"; o app só lê.
-- =====================================================================

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  address_line1 text,
  address_line2 text,
  zip text,
  latitude double precision,
  longitude double precision,
  whatsapp text,              -- só números, com DDI e DDD. Ex.: 5518999999999
  email text,
  hours jsonb not null default '[]'::jsonb,  -- [{ "label": "Segunda a Sexta", "closed": false, "open": "08:00", "close": "18:00" }]
  autonomous_enabled boolean not null default true,
  autonomous_title text,
  autonomous_text text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Valores que o app mostra hoje
insert into public.store_settings (
  id, address_line1, address_line2, zip, latitude, longitude, whatsapp, email, hours,
  autonomous_enabled, autonomous_title, autonomous_text
) values (
  1, 'Alziro Zarur, 820', 'Araçatuba - SP', '', -21.1903, -50.4362, '5511999999999', 'contato@loja.com.br',
  '[
    {"label": "Segunda a Sexta", "closed": false, "open": "08:00", "close": "18:00"},
    {"label": "Sábado",          "closed": false, "open": "08:00", "close": "12:00"},
    {"label": "Domingo",         "closed": true,  "open": "",      "close": ""},
    {"label": "Feriados",        "closed": true,  "open": "",      "close": ""}
  ]'::jsonb,
  true, 'Loja Autônoma 24h',
  'Nossa loja autônoma funciona 24 horas por dia! Use o QR Code na seção "Autônoma" para entrar.'
) on conflict (id) do nothing;

-- Segurança: qualquer um lê (o app mostra para todos); altera quem é admin ou tem a permissão "Configurações"
alter table public.store_settings enable row level security;

drop policy if exists "todos leem configuracoes da loja" on public.store_settings;
create policy "todos leem configuracoes da loja" on public.store_settings
  for select to anon, authenticated using (true);

drop policy if exists "admin altera configuracoes da loja" on public.store_settings;
create policy "admin altera configuracoes da loja" on public.store_settings
  for update to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (lower(role) in ('admin', 'administrador') or coalesce((permissions ->> 'Configurações')::boolean, false))
  ))
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (lower(role) in ('admin', 'administrador') or coalesce((permissions ->> 'Configurações')::boolean, false))
  ));

-- Tempo real: o app atualiza na hora quando salvar no painel
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_settings'
  ) then
    alter publication supabase_realtime add table public.store_settings;
  end if;
end $$;

select * from public.store_settings;
