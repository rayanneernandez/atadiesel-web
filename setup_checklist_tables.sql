-- Script Completo e Robusto para Configuração de Checklists
-- Executar no Supabase -> SQL Editor

create extension if not exists "uuid-ossp";

-- 1. Configuração da Tabela de Modelos (Templates)
create table if not exists public.checklist_templates (
    id uuid not null primary key default uuid_generate_v4(),
    name text,
    pdf_title text,
    pdf_subtitle text,
    header_text text,
    type text,
    sections jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garante que o ID tenha valor padrão
alter table public.checklist_templates alter column id set default uuid_generate_v4();

-- Garante que o ID seja Primary Key (caso a tabela tenha sido criada sem PK)
do $
begin
    if not exists (
        select 1 from pg_constraint 
        where conrelid = 'public.checklist_templates'::regclass 
        and contype = 'p'
    ) then
        alter table public.checklist_templates add primary key (id);
    end if;
end $;

-- RLS e Políticas para Templates
alter table public.checklist_templates enable row level security;

drop policy if exists "Authenticated users can select checklist_templates" on public.checklist_templates;
create policy "Authenticated users can select checklist_templates" on public.checklist_templates for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert checklist_templates" on public.checklist_templates;
create policy "Authenticated users can insert checklist_templates" on public.checklist_templates for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update checklist_templates" on public.checklist_templates;
create policy "Authenticated users can update checklist_templates" on public.checklist_templates for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete checklist_templates" on public.checklist_templates;
create policy "Authenticated users can delete checklist_templates" on public.checklist_templates for delete using (auth.role() = 'authenticated');


-- 2. Configuração da Tabela de Atribuições (Assignments)
create table if not exists public.checklist_assignments (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid not null,
  user_id uuid not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(template_id, user_id)
);

-- Adiciona Foreign Keys com segurança (evita erro se já existirem ou se PK faltar)
do $
begin
    -- FK para template_id
    if not exists (select 1 from pg_constraint where conname = 'checklist_assignments_template_id_fkey') then
        alter table public.checklist_assignments 
        add constraint checklist_assignments_template_id_fkey 
        foreign key (template_id) 
        references public.checklist_templates(id) 
        on delete cascade;
    end if;

    -- FK para user_id (referenciando profiles)
    if not exists (select 1 from pg_constraint where conname = 'checklist_assignments_user_id_fkey') then
        alter table public.checklist_assignments 
        add constraint checklist_assignments_user_id_fkey 
        foreign key (user_id) 
        references public.profiles(id) 
        on delete cascade;
    end if;
end $;

-- RLS e Políticas para Assignments
alter table public.checklist_assignments enable row level security;

drop policy if exists "Authenticated users can select assignments" on public.checklist_assignments;
create policy "Authenticated users can select assignments" on public.checklist_assignments for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert assignments" on public.checklist_assignments;
create policy "Authenticated users can insert assignments" on public.checklist_assignments for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete assignments" on public.checklist_assignments;
create policy "Authenticated users can delete assignments" on public.checklist_assignments for delete using (auth.role() = 'authenticated');-- Script Completo para Configuração de Checklists
-- Este script cria/corrige as tabelas checklist_templates e checklist_assignments

-- 1. Garante extensão UUID
create extension if not exists "uuid-ossp";

-- 2. Tabela de Modelos de Checklist (Templates)
create table if not exists public.checklist_templates (
    id uuid not null primary key default uuid_generate_v4(),
    name text,
    pdf_title text,
    pdf_subtitle text,
    header_text text,
    type text,
    sections jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Garante que o ID tenha valor padrão (caso a tabela já exista sem isso)
alter table public.checklist_templates alter column id set default uuid_generate_v4();

-- RLS para Templates
alter table public.checklist_templates enable row level security;

-- Políticas Templates (Drop and Create para evitar erros de "policy already exists")
drop policy if exists "Authenticated users can select checklist_templates" on public.checklist_templates;
create policy "Authenticated users can select checklist_templates" on public.checklist_templates for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert checklist_templates" on public.checklist_templates;
create policy "Authenticated users can insert checklist_templates" on public.checklist_templates for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update checklist_templates" on public.checklist_templates;
create policy "Authenticated users can update checklist_templates" on public.checklist_templates for update using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete checklist_templates" on public.checklist_templates;
create policy "Authenticated users can delete checklist_templates" on public.checklist_templates for delete using (auth.role() = 'authenticated');


-- 3. Tabela de Atribuições de Checklist (Assignments)
create table if not exists public.checklist_assignments (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid references public.checklist_templates(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(template_id, user_id)
);

-- RLS para Assignments
alter table public.checklist_assignments enable row level security;

-- Políticas Assignments
drop policy if exists "Authenticated users can select assignments" on public.checklist_assignments;
create policy "Authenticated users can select assignments" on public.checklist_assignments for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert assignments" on public.checklist_assignments;
create policy "Authenticated users can insert assignments" on public.checklist_assignments for insert with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can delete assignments" on public.checklist_assignments;
create policy "Authenticated users can delete assignments" on public.checklist_assignments for delete using (auth.role() = 'authenticated');