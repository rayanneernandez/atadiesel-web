-- Script de Correção da Coluna updated_at

-- 1. Garante que as colunas de data existam e tenham valor padrão
alter table public.products 
add column if not exists created_at timestamp with time zone default timezone('utc'::text, now()) not null,
add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

-- 2. Define o valor padrão para updated_at (caso não tenha)
alter table public.products 
alter column updated_at set default timezone('utc'::text, now());

-- 3. Cria função para atualizar o updated_at automaticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4. Cria trigger para chamar a função antes de qualquer update
drop trigger if exists on_products_updated on public.products;
create trigger on_products_updated
  before update on public.products
  for each row execute procedure public.handle_updated_at();