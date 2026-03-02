-- Script de Correção da Tabela de Produtos

-- 1. Verifica e corrige a coluna 'id' para garantir que ela tenha um valor padrão (UUID v4)
alter table public.products 
alter column id set default uuid_generate_v4();

-- 2. Garante que as colunas necessárias existam (baseado no erro do console e código)
alter table public.products add column if not exists title text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price_cents integer;
alter table public.products add column if not exists old_price_cents integer;
alter table public.products add column if not exists stock integer default 0;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists sku text;
alter table public.products add column if not exists image_url text;

-- 3. Atualiza políticas de segurança (RLS) para permitir inserção
-- Remove políticas antigas para evitar conflitos
drop policy if exists "Authenticated users can do everything on products" on products;
drop policy if exists "Public products are viewable by everyone" on products;

-- Recria políticas mais permissivas para admins/autenticados
create policy "Public products are viewable by everyone" 
on products for select using (true);

create policy "Authenticated users can insert products" 
on products for insert 
with check (auth.role() = 'authenticated');

create policy "Authenticated users can update products" 
on products for update 
using (auth.role() = 'authenticated');

create policy "Authenticated users can delete products" 
on products for delete 
using (auth.role() = 'authenticated');

-- 4. Opcional: Migrar dados antigos se as colunas mudaram de nome (name -> title, price -> price_cents)
-- Se você já tinha dados, descomente abaixo:
-- update products set title = name where title is null;
-- update products set price_cents = (price * 100)::integer where price_cents is null;