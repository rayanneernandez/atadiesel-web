-- Script para configurar Buckets de Armazenamento (Storage) no Supabase

-- Garante que a extensão uuid-ossp está habilitada
create extension if not exists "uuid-ossp";

-- 1. Configuração do Bucket de Produtos
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Remove políticas antigas para evitar conflitos ao recriar
drop policy if exists "Public Access Products" on storage.objects;
drop policy if exists "Auth Upload Products" on storage.objects;
drop policy if exists "Auth Update Products" on storage.objects;
drop policy if exists "Auth Delete Products" on storage.objects;

-- Cria novas políticas para Produtos
create policy "Public Access Products"
on storage.objects for select
using ( bucket_id = 'products' );

create policy "Auth Upload Products"
on storage.objects for insert
with check ( bucket_id = 'products' and auth.role() = 'authenticated' );

create policy "Auth Update Products"
on storage.objects for update
using ( bucket_id = 'products' and auth.role() = 'authenticated' );

create policy "Auth Delete Products"
on storage.objects for delete
using ( bucket_id = 'products' and auth.role() = 'authenticated' );

-- 2. Configuração do Bucket de Banners (Destaques)
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "Public Access Banners" on storage.objects;
drop policy if exists "Auth Upload Banners" on storage.objects;

-- Cria novas políticas para Banners
create policy "Public Access Banners"
on storage.objects for select
using ( bucket_id = 'banners' );

create policy "Auth Upload Banners"
on storage.objects for insert
with check ( bucket_id = 'banners' and auth.role() = 'authenticated' );