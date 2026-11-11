// Abre a porta da loja pelo painel usando o MESMO caminho que o app já usa hoje:
// POST {RPI_BRIDGE_URL}/door/open (o servidor da Raspberry dá o pulso e a porta abre e fecha sozinha).
//
// Quem chama é o painel, logado. A função confere a permissão "Abrir Porta" (administrador ou permissão ligada)
// e registra quem abriu na tabela door_log. O endereço do Pi nunca vai para o navegador.
//
// Publicar COM verificação de JWT ligada (padrão):  supabase functions deploy abrir-porta
// Secret (Supabase > Edge Functions > Secrets):
//   RPI_BRIDGE_URL   o mesmo valor que já está no Render (ex.: https://xxxx.trycloudflare.com), sem barra no final.
//                    Se esse endereço mudar no Render, mude aqui também.

import { createClient } from 'npm:@supabase/supabase-js@2';

const BRIDGE = (Deno.env.get('RPI_BRIDGE_URL') ?? '').replace(/\/$/, '');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Chave pública do projeto: a clássica (anon) ou, em projetos novos, a publicável.
function publicKey(): string {
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (anon) return anon;
  try {
    const all = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    return (all.default ?? Object.values(all)[0] ?? '') as string;
  } catch { return ''; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  if (!BRIDGE) return json({ error: 'Falta o secret RPI_BRIDGE_URL (o mesmo endereço do Pi que está no Render).' }, 500);

  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL')!;
  const asUser = createClient(url, publicKey(), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });

  const { data: userData } = await asUser.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return json({ error: 'Faça login de novo no painel.' }, 401);
  const { data: allowed, error: permErr } = await asUser.rpc('can_open_door');
  if (permErr) return json({ error: 'Não consegui confirmar a permissão: ' + permErr.message }, 500);
  if (!allowed) return json({ error: 'Você não tem permissão para abrir a porta.' }, 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // evita clique duplo: se acabou de abrir, não manda de novo
  const { data: last } = await admin.from('door_log').select('at').eq('action', 'open').order('at', { ascending: false }).limit(1).maybeSingle();
  if (last?.at && Date.now() - new Date(last.at).getTime() < 4000) return json({ ok: true, throttled: true });

  const { data: prof } = await admin.from('profiles').select('name').eq('id', uid).maybeSingle();
  const name = prof?.name ?? null;

  try {
    const res = await fetch(`${BRIDGE}/door/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'painel', user: name }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return json({ error: `A porta respondeu erro ${res.status}.` }, 502);
  } catch {
    return json({ error: 'Não consegui falar com a porta. Confira se a Raspberry está ligada e se o endereço RPI_BRIDGE_URL ainda é o mesmo do Render.' }, 502);
  }

  await admin.from('door_log').insert({ action: 'open', by_id: uid, by_name: name, note: 'pulso (painel)' });
  return json({ ok: true });
});
