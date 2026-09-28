-- =====================================================================
-- ENTREGA DE TESTE (para ver a tela de Entregas e tirar prints do guia)
-- Rodar no Supabase > SQL Editor (arquivo inteiro, botão Run).
-- Para remover depois, veja o fim do arquivo.
-- =====================================================================

-- As tentativas que falharam "gastaram" números; volta para o 1 (tabela está vazia)
alter table public.orders alter column order_number restart with 1;

with cliente as (
  select id from public.profiles where email = 'cliente@atadiesel.com' limit 1
), novo_pedido as (
  insert into public.orders (
    id, user_id, status, payment_type, delivery, delivery_code,
    subtotal, shipping_amount, discount_amount, total,
    address_text, address_lat, address_lng,
    created_at, updated_at
  )
  select
    gen_random_uuid(), cliente.id, 'pending', 'pix', 'casa', '1234',
    91.80, 11.44, 0, 103.24,
    'Avenida Marechal Fontenelle, 1100 - Vila Militar, Rio de Janeiro - RJ', -22.8812392, -43.3821488,
    now(), now()
  from cliente
  returning id
)
insert into public.order_items (id, order_id, product_id, title, quantity, unit_price, created_at)
select
  gen_random_uuid(),
  novo_pedido.id,
  prod.id::text,
  coalesce(prod.title, 'Óleo Motor 5W30 (teste)'),
  2,
  45.90,
  now()
from novo_pedido
left join lateral (select id, title from public.products limit 1) prod on true;

-- Conferir (deve mostrar order_number = 1)
select o.order_number, o.status, o.total, i.title, i.quantity
from public.orders o
join public.order_items i on i.order_id = o.id
where o.delivery_code = '1234';

-- ---------------------------------------------------------------------
-- REMOVER A ENTREGA DE TESTE (quando terminar os prints)
-- ---------------------------------------------------------------------
-- delete from public.order_items where order_id in (select id from public.orders where delivery_code = '1234');
-- delete from public.orders where delivery_code = '1234';
