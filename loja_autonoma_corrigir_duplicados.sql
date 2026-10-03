-- =====================================================================
-- CORREÇÃO: funcionário duplicado em autonomous_staff
-- Remove as linhas repetidas do mesmo usuário do painel (fica a mais antiga) e impede que se repitam.
-- Rodar no Supabase > SQL Editor. Seguro para rodar de novo.
-- =====================================================================
delete from public.autonomous_staff a
using public.autonomous_staff b
where a.profile_id is not null
  and a.profile_id = b.profile_id
  and (a.created_at, a.id) > (b.created_at, b.id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'autonomous_staff_profile_uk') then
    alter table public.autonomous_staff add constraint autonomous_staff_profile_uk unique (profile_id);
  end if;
end $$;

select id, name, profile_id, cpf, phone from public.autonomous_staff order by name;
