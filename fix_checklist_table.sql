-- Script para corrigir a tabela checklist_templates
-- O erro "null value in column id" ocorre porque a coluna id não tem um valor padrão definido.

-- 1. Garante que a extensão de UUID está habilitada
create extension if not exists "uuid-ossp";

-- 2. Cria a tabela se ela não existir (apenas por segurança)
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

-- 3. Se a tabela já existir, altera a coluna id para ter o valor padrão
-- Isso resolve o erro de "null value" ao inserir sem passar o ID
alter table public.checklist_templates alter column id set default uuid_generate_v4();

-- 4. Garante permissões (RLS) para que usuários autenticados possam usar a tabela
alter table public.checklist_templates enable row level security;

create policy "Authenticated users can select checklist_templates" 
on public.checklist_templates for select 
using (auth.role() = 'authenticated');

create policy "Authenticated users can insert checklist_templates" 
on public.checklist_templates for insert 
with check (auth.role() = 'authenticated');

create policy "Authenticated users can update checklist_templates" 
on public.checklist_templates for update 
using (auth.role() = 'authenticated');

create policy "Authenticated users can delete checklist_templates" 
on public.checklist_templates for delete 
using (auth.role() = 'authenticated');