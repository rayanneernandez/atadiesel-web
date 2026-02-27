-- Script para criar a tabela de atribuições de checklist

create extension if not exists "uuid-ossp";

-- Cria a tabela de atribuições
create table if not exists public.checklist_assignments (
  id uuid default uuid_generate_v4() primary key,
  template_id uuid references public.checklist_templates(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Evita duplicatas
  unique(template_id, user_id)
);

-- Habilita RLS
alter table public.checklist_assignments enable row level security;

-- Políticas de acesso
-- Leitura: Usuários autenticados podem ver as atribuições
create policy "Authenticated users can select assignments" 
on public.checklist_assignments for select 
using (auth.role() = 'authenticated');

-- Inserção: Usuários autenticados (idealmente admins/gerentes) podem atribuir
create policy "Authenticated users can insert assignments" 
on public.checklist_assignments for insert 
with check (auth.role() = 'authenticated');

-- Exclusão: Usuários autenticados podem remover atribuições
create policy "Authenticated users can delete assignments" 
on public.checklist_assignments for delete 
using (auth.role() = 'authenticated');