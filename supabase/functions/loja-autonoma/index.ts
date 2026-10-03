// Ponte entre o painel da Atadiesel e o web da Loja Autônoma (aghora).
//
// O navegador NUNCA recebe a chave da loja autônoma: ela fica aqui, nos secrets da função.
// Quem chama precisa estar logado no painel e ter a permissão "Loja Autônoma" (ou ser administrador).
// Exceção: a sincronização automática (pg_cron) chama com o cabeçalho x-cron-secret e só pode rodar `sync_all`.
//
// Ações (POST { action: ... }):
//   qr             -> link do QR da loja + imagem (SVG e PNG em base64)
//   rotate_qr      -> redefine o QR (o antigo para de funcionar; é preciso reimprimir)
//   sync_products  -> envia TODOS os produtos do painel (SKU, título, preço, ativo)
//   sync_staff     -> envia os funcionários da loja autônoma (com CPF e telefone), com a janela de acesso
//   sync_all       -> os dois acima (usada pelo agendamento e pelo botão "Sincronizar tudo")
//
// Secrets (Supabase > Edge Functions > Secrets):
//   LOJA_AUTONOMA_API_URL      ex.: https://loja-autonoma-wheat.vercel.app   (sem barra no final)
//   LOJA_AUTONOMA_KEY          chave de integração gerada no portal da loja autônoma (começa com ik_)
//   LOJA_AUTONOMA_CRON_SECRET  texto aleatório que o agendamento envia no cabeçalho x-cron-secret
// O Supabase já fornece SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'npm:@supabase/supabase-js@2';

const API_URL = (Deno.env.get('LOJA_AUTONOMA_API_URL') ?? '').replace(/\/$/, '');
const API_KEY = Deno.env.get('LOJA_AUTONOMA_KEY') ?? '';
const CRON_SECRET = Deno.env.get('LOJA_AUTONOMA_CRON_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Chave pública do projeto: a clássica (anon) ou, em projetos novos, a publicável.
function publicKey(): string {
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (anon) return anon;
  try {
    const all = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    return (all.default ?? Object.values(all)[0] ?? '') as string;
  } catch { return ''; }
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function lojaApi(path: string, init: RequestInit = {}) {
  if (!API_URL || !API_KEY) throw new HttpError(500, 'Integração não configurada: faltam os secrets LOJA_AUTONOMA_API_URL e LOJA_AUTONOMA_KEY.');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/integration/v1${path}`, {
      ...init,
      headers: { 'X-Integration-Key': API_KEY, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
    });
  } catch {
    throw new HttpError(502, 'Não consegui falar com a loja autônoma. Tente de novo em instantes.');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.detail ?? ''; } catch { /* sem corpo */ }
    if (res.status === 401) throw new HttpError(502, 'A chave da loja autônoma foi recusada. Gere uma nova no portal e atualize o secret LOJA_AUTONOMA_KEY.');
    throw new HttpError(502, typeof detail === 'string' && detail ? detail : `Erro ${res.status} na loja autônoma`);
  }
  return res;
}

const toBase64 = (buf: ArrayBuffer) => {
  let s = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// deno-lint-ignore no-explicit-any
type Admin = any;

async function saveState(admin: Admin, patch: Record<string, unknown>, result: unknown) {
  const { data: cur } = await admin.from('autonomous_sync_state').select('last_result').eq('id', 1).single();
  await admin.from('autonomous_sync_state').update({
    ...patch, updated_at: new Date().toISOString(),
    last_result: { ...(cur?.last_result ?? {}), ...(result as object) },
  }).eq('id', 1);
}

// Todo produto do painel vai para a loja autônoma. Sem preço, inativo ou arquivado: enviado como indisponível.
// (A tabela autonomous_products, se tiver linhas com enabled=false, ainda exclui esses itens.)
async function syncProducts(admin: Admin) {
  const { data: picks } = await admin.from('autonomous_products').select('product_id, enabled');
  const excluded = new Set((picks ?? []).filter((r: { enabled: boolean }) => r.enabled === false).map((r: { product_id: string }) => r.product_id));
  const items: { sku: string; name: string; price_cents: number; active: boolean }[] = [];
  const seenSku = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data: prods, error } = await admin
      .from('products').select('id, sku, title, price_cents, is_active, archived, erp_archived')
      .order('id').range(from, from + 999);
    if (error) throw new HttpError(500, 'Falha ao ler os produtos: ' + error.message);
    for (const p of prods ?? []) {
      const sku = String(p.sku ?? '').trim();
      if (!sku || seenSku.has(sku)) continue;
      seenSku.add(sku);
      const sellable = p.is_active !== false && !p.archived && !p.erp_archived && Number(p.price_cents) > 0;
      items.push({
        sku, name: String(p.title ?? sku).slice(0, 160), price_cents: Math.max(0, Math.round(Number(p.price_cents) || 0)),
        active: !excluded.has(p.id) && sellable,
      });
    }
    if ((prods ?? []).length < 1000) break;
  }
  const total = { received: 0, created: 0, updated: 0 };
  for (const part of chunk(items, 500)) {
    const r = await (await lojaApi('/products', { method: 'PUT', body: JSON.stringify({ items: part }) })).json();
    total.received += r.received; total.created += r.created; total.updated += r.updated;
  }
  await saveState(admin, { last_products_at: new Date().toISOString() }, { products: total });
  return { ...total, sent: items.length, active: items.filter((i) => i.active).length };
}

// Só vai quem tem CPF e telefone completos (a loja identifica o funcionário pelos dois).
async function syncStaff(admin: Admin) {
  const { data, error } = await admin.from('autonomous_staff').select('*');
  if (error) throw new HttpError(500, 'Falha ao ler os funcionários: ' + error.message);
  const complete = (data ?? []).filter((s: { cpf?: string; phone?: string }) => /^[0-9]{11}$/.test(s.cpf ?? '') && /^[0-9]{10,11}$/.test(s.phone ?? ''));
  const incomplete = (data ?? []).length - complete.length;
  const items = complete.map((s: Record<string, string | boolean | null>) => ({
    cpf: s.cpf, name: s.name, phone: s.phone, role_title: s.role_title || 'Funcionário', active: s.active,
    access_days: s.access_days ?? '0123456', access_start: s.access_start || null, access_end: s.access_end || null,
    access_until: s.access_until || null,
  }));
  const r = await (await lojaApi('/employees', { method: 'PUT', body: JSON.stringify({ items }) })).json();
  await saveState(admin, { last_staff_at: new Date().toISOString() }, { staff: { received: r.received, created: r.created, updated: r.updated, rejected: r.rejected, incomplete } });
  return { ...r, incomplete };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { action } = await req.json().catch(() => ({ action: '' }));

    // Agendamento automático: sem usuário, só com o segredo, e só a sincronização.
    const cron = req.headers.get('x-cron-secret');
    if (cron) {
      if (!CRON_SECRET || !safeEqual(cron, CRON_SECRET)) throw new HttpError(401, 'Segredo do agendamento inválido');
      if (action !== 'sync_all') throw new HttpError(403, 'O agendamento só pode sincronizar');
      return json({ products: await syncProducts(admin), staff: await syncStaff(admin) });
    }

    // Quem chama está logado e pode gerenciar a loja autônoma?
    // A conferência é feita pelo próprio banco, com o login de quem chama: can_manage_autonomous() usa auth.uid()
    // do token (assinatura e validade). Não consultamos o servidor de sessões, que rejeita tokens de sessões
    // antigas mesmo com o painel funcionando.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!/^Bearer .{20,}/i.test(authHeader)) throw new HttpError(401, 'Sessão não enviada. Entre de novo no painel.');
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, publicKey(), {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: allowed, error: permErr } = await asUser.rpc('can_manage_autonomous');
    if (permErr) throw new HttpError(401, `Não consegui confirmar o seu acesso: ${permErr.message}. Saia e entre de novo no painel.`);
    if (allowed !== true) throw new HttpError(403, 'Você não tem permissão para a Loja Autônoma (ou precisa sair e entrar de novo no painel).');

    if (action === 'qr') {
      const info = await (await lojaApi('/store')).json();
      const svg = await (await lojaApi('/qr.svg')).text();
      const png = toBase64(await (await lojaApi('/qr.png')).arrayBuffer());
      return json({ name: info.name, address: info.address, qr_url: info.qr_url, svg, png_base64: png });
    }
    if (action === 'rotate_qr') {
      const r = await (await lojaApi('/rotate-qr', { method: 'POST' })).json();
      return json({ qr_url: r.qr_url });
    }
    if (action === 'sync_products') return json(await syncProducts(admin));
    if (action === 'sync_staff') return json(await syncStaff(admin));
    if (action === 'sync_all') return json({ products: await syncProducts(admin), staff: await syncStaff(admin) });

    throw new HttpError(400, 'Ação desconhecida');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Erro inesperado: ' + (e as Error).message }, 500);
  }
});
