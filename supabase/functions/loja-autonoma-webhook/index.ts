// Recebe as vendas feitas na Loja Autônoma (web aghora) e grava em autonomous_sales.
//
// Publicar SEM verificação de JWT (quem chama é o servidor da loja autônoma, não um usuário):
//   supabase functions deploy loja-autonoma-webhook --no-verify-jwt
// A autenticidade é garantida pela assinatura HMAC-SHA256 do corpo:
//   X-Signature: sha256=<hex>   (segredo = LOJA_AUTONOMA_WEBHOOK_SECRET, mostrado uma vez no portal)
// O mesmo evento pode chegar mais de uma vez (reenvio): o id "sale-123" evita duplicar.
//
// Secret necessário: LOJA_AUTONOMA_WEBHOOK_SECRET   (começa com whsec_)

import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRET = Deno.env.get('LOJA_AUTONOMA_WEBHOOK_SECRET') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return 'sha256=' + hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!SECRET) return json({ error: 'Webhook não configurado (falta LOJA_AUTONOMA_WEBHOOK_SECRET)' }, 500);

  const raw = await req.text();
  const given = req.headers.get('x-signature') ?? '';
  if (!safeEqual(given, await sign(SECRET, raw))) return json({ error: 'Assinatura inválida' }, 401);

  let ev: any;
  try { ev = JSON.parse(raw); } catch { return json({ error: 'JSON inválido' }, 400); }
  if (ev?.event !== 'sale.paid') return json({ ok: true, ignored: ev?.event ?? null }); // evento que não usamos: aceita e segue
  if (!ev.id || typeof ev.amount_cents !== 'number') return json({ error: 'Evento incompleto' }, 422);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.from('autonomous_sales').upsert({
    id: String(ev.id),
    paid_at: ev.paid_at ?? null,
    amount_cents: ev.amount_cents,
    method: ev.method ?? null,
    session_id: ev.session_id ?? null,
    party_size: ev.party_size ?? null,
    customer_cpf: ev.customer?.cpf ? String(ev.customer.cpf).replace(/\D/g, '') : null,
    customer_phone: ev.customer?.phone ?? null,
    customer_name: ev.customer?.name ?? null,
    items: ev.items ?? [],
    coupon: ev.coupon ?? null,
    store: ev.store ?? null,
  }, { onConflict: 'id' });
  if (error) {
    console.error('autonomous_sales', error);
    return json({ error: 'Falha ao gravar a venda' }, 500); // 5xx: a loja autônoma tenta de novo depois
  }
  return json({ ok: true });
});
