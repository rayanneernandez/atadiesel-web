-- Habilita extensão de UUID
create extension if not exists "uuid-ossp";

-- Tabela de Perfis (Estende a tabela auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  role text default 'client' check (role in ('admin', 'client')),
  is_active boolean default false,
  last_seen timestamp with time zone,
  visit_count integer default 0,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Produtos
create table products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric not null,
  promotional_price numeric,
  stock integer default 0,
  category text,
  sku text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabela de Entregas
create table deliveries (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references profiles(id),
  client_name text,
  status text default 'Pendente' check (status in ('Pendente', 'Em Preparação', 'Em Trânsito', 'Entregue', 'Cancelado')),
  total_value numeric not null,
  distance text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Itens da Entrega
create table delivery_items (
  id uuid default uuid_generate_v4() primary key,
  delivery_id uuid references deliveries(id) on delete cascade not null,
  product_name text not null,
  quantity integer not null,
  unit_price numeric not null
);

-- Tabela de Destaques
create table highlights (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  banner_url text,
  valid_until date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de Segurança (RLS)
alter table profiles enable row level security;
alter table products enable row level security;
alter table deliveries enable row level security;
alter table delivery_items enable row level security;
alter table highlights enable row level security;

-- Políticas Simplificadas
create policy "Public products are viewable by everyone" on products for select using (true);
create policy "Public highlights are viewable by everyone" on highlights for select using (true);
create policy "Authenticated users can do everything on products" on products for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything on highlights" on highlights for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything on deliveries" on deliveries for all using (auth.role() = 'authenticated');
create policy "Authenticated users can do everything on delivery_items" on delivery_items for all using (auth.role() = 'authenticated');
create policy "Authenticated users can view profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Função para criar perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, 'client');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para novo usuário
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Configuração de Storage (Buckets)
-- Execute isso na aba 'Storage' do Supabase se o SQL não funcionar para buckets
insert into storage.buckets (id, name, public) values ('products', 'products', true);
insert into storage.buckets (id, name, public) values ('banners', 'banners', true);

-- Políticas de Storage
create policy "Public Access Products" on storage.objects for select using ( bucket_id = 'products' );
create policy "Auth Upload Products" on storage.objects for insert with check ( bucket_id = 'products' and auth.role() = 'authenticated' );
create policy "Public Access Banners" on storage.objects for select using ( bucket_id = 'banners' );
create policy "Auth Upload Banners" on storage.objects for insert with check ( bucket_id = 'banners' and auth.role() = 'authenticated' );

-- Tabela de Logs de Auditoria
create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  user_email text,
  action_type text not null,
  entity_name text not null,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table audit_logs enable row level security;

create policy "Authenticated users can insert logs" on audit_logs for insert to authenticated with check (true);
create policy "Authenticated users can view logs" on audit_logs for select to authenticated using (true);

-- Tabela de Configuração de Fidelidade
create table if not exists loyalty_config (
  id uuid default uuid_generate_v4() primary key,
  program_type text not null default 'cashback',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table loyalty_config enable row level security;

create policy "Authenticated users can insert loyalty config" on loyalty_config for insert to authenticated with check (true);
create policy "Authenticated users can view loyalty config" on loyalty_config for select to authenticated using (true);

-- Atualização de Fidelidade (Adicionar manualmente se já criou as tabelas)
alter table profiles add column if not exists loyalty_balance numeric default 0;

create policy "Admins can update all profiles" on profiles for update using (
  (select role from profiles where id = auth.uid()) = 'admin'
);
