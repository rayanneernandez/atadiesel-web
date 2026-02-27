-- Tabela de Modelos de Checklist
create table if not exists checklist_templates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  description text,
  type text default 'daily', -- 'daily', 'monthly', 'custom'
  sections jsonb default '[]'::jsonb, -- Estrutura das perguntas
  is_active boolean default true,
  pdf_title text,
  pdf_subtitle text,
  header_text text
);

-- Garantir que colunas existam (caso a tabela já tenha sido criada antes)
do $
begin
  if not exists (select 1 from information_schema.columns where table_name = 'checklist_templates' and column_name = 'pdf_title') then
    alter table checklist_templates add column pdf_title text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'checklist_templates' and column_name = 'pdf_subtitle') then
    alter table checklist_templates add column pdf_subtitle text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'checklist_templates' and column_name = 'header_text') then
    alter table checklist_templates add column header_text text;
  end if;
end $;

-- Tabela de Atribuições (Quais usuários podem ver quais templates)
create table if not exists checklist_assignments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  template_id uuid references checklist_templates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  unique(template_id, user_id)
);

-- Tabela de Respostas (Preenchimentos)
create table if not exists checklist_responses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  template_id uuid references checklist_templates(id) on delete set null,
  filled_by uuid references auth.users(id) on delete set null,
  content jsonb default '{}'::jsonb, -- Respostas: {"Pergunta 1": "Resposta", ...}
  driver_name text,
  vehicle_plate text,
  odometer text,
  signature_url text,
  images jsonb default '[]'::jsonb
);

-- Habilitar RLS (Row Level Security)
alter table checklist_templates enable row level security;
alter table checklist_assignments enable row level security;
alter table checklist_responses enable row level security;

-- Políticas de Acesso (RLS)

-- Templates:
-- Remover políticas antigas para evitar conflitos/duplicações
drop policy if exists "Templates visíveis para todos autenticados" on checklist_templates;
drop policy if exists "Admins podem gerenciar templates" on checklist_templates;

-- Criar novas políticas
create policy "Templates visíveis para todos autenticados"
  on checklist_templates for select
  to authenticated
  using (true);

create policy "Admins podem gerenciar templates"
  on checklist_templates for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador')
    )
  );

-- Atribuições:
drop policy if exists "Ver atribuições" on checklist_assignments;
drop policy if exists "Admins gerenciam atribuições" on checklist_assignments;

create policy "Ver atribuições"
  on checklist_assignments for select
  to authenticated
  using (
    user_id = auth.uid() or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador')
    )
  );

create policy "Admins gerenciam atribuições"
  on checklist_assignments for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador')
    )
  );

-- Respostas:
drop policy if exists "Ver respostas" on checklist_responses;
drop policy if exists "Criar respostas" on checklist_responses;

create policy "Ver respostas"
  on checklist_responses for select
  to authenticated
  using (
    filled_by = auth.uid() or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador' or profiles.app_access = true)
    )
  );

create policy "Criar respostas"
  on checklist_responses for insert
  to authenticated
  with check (
    filled_by = auth.uid()
  );
-- Tabela de Modelos de Checklist
create table if not exists checklist_templates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  description text,
  type text default 'daily', -- 'daily', 'monthly', 'custom'
  sections jsonb default '[]'::jsonb, -- Estrutura das perguntas
  is_active boolean default true,
  pdf_title text,
  pdf_subtitle text,
  header_text text
);

-- Tabela de Atribuições (Quais usuários podem ver quais templates)
create table if not exists checklist_assignments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  template_id uuid references checklist_templates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  unique(template_id, user_id)
);

-- Tabela de Respostas (Preenchimentos)
create table if not exists checklist_responses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  template_id uuid references checklist_templates(id) on delete set null,
  filled_by uuid references auth.users(id) on delete set null,
  content jsonb default '{}'::jsonb, -- Respostas: {"Pergunta 1": "Resposta", ...}
  driver_name text,
  vehicle_plate text,
  odometer text,
  signature_url text,
  images jsonb default '[]'::jsonb
);

-- Habilitar RLS (Row Level Security)
alter table checklist_templates enable row level security;
alter table checklist_assignments enable row level security;
alter table checklist_responses enable row level security;

-- Políticas de Acesso (RLS)

-- Templates:
-- Todos autenticados podem ler templates (para saber quais existem/estão atribuídos)
create policy "Templates visíveis para todos autenticados"
  on checklist_templates for select
  to authenticated
  using (true);

-- Apenas admins podem criar/editar/excluir templates
create policy "Admins podem gerenciar templates"
  on checklist_templates for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador')
    )
  );

-- Atribuições:
-- Todos autenticados podem ver suas próprias atribuições (ou admins veem tudo)
create policy "Ver atribuições"
  on checklist_assignments for select
  to authenticated
  using (
    user_id = auth.uid() or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador')
    )
  );

-- Apenas admins podem gerenciar atribuições
create policy "Admins gerenciam atribuições"
  on checklist_assignments for all
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador')
    )
  );

-- Respostas:
-- Usuários podem ver suas próprias respostas e Admins podem ver todas
create policy "Ver respostas"
  on checklist_responses for select
  to authenticated
  using (
    filled_by = auth.uid() or
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (profiles.role = 'admin' or profiles.role = 'administrador' or profiles.app_access = true)
    )
  );

-- Usuários podem criar respostas (para preencher checklist)
create policy "Criar respostas"
  on checklist_responses for insert
  to authenticated
  with check (
    filled_by = auth.uid()
  );

-- Opcional: Usuários podem editar suas próprias respostas (se permitido)
-- create policy "Editar próprias respostas"
--   on checklist_responses for update
--   to authenticated
--   using (filled_by = auth.uid());