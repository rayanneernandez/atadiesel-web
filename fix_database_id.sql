-- Habilita a extensão pgcrypto se necessário (para gen_random_uuid)
create extension if not exists "pgcrypto";

-- Corrige a tabela audit_logs para gerar IDs automaticamente
alter table audit_logs alter column id set default gen_random_uuid();

-- Garante que a coluna details tenha um valor padrão vazio para evitar erros de null
alter table audit_logs alter column details set default '{}'::jsonb;