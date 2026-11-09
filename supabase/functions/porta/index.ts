// Ponte entre o painel (botão "Abrir porta") e a Raspberry Pi da catraca.
//
// Quem chama é SÓ a Raspberry Pi, a cada ~1,5 s: POST { state: 'open' | 'closed', failsafe?: string }
// com o cabeçalho x-door-token. A função responde o que a porta deve fazer agora: { desired, seconds_left }.
// O Pi nunca recebe a chave do banco; este token só serve para esta função.
//
// Publicar SEM verificação de JWT (o Pi não tem login):
//   supabase functions deploy porta --no-verify-jwt
// Secret (Supabase > Edge Functions > Secrets):
//   DOOR_PI_TOKEN   texto longo e aleatório (o mesmo vai no .env do Pi). Gere com: openssl rand -hex 32
// O Supabase já fornece SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
//
// Regras de segurança:
//  - abrir sempre tem prazo (open_until, definido pelo painel, no máximo 30 min): vencido, a função manda fechar;
//  - o Pi também se protege sozinho (fecha se perder a internet ou passar do limite), e avisa aqui em "failsafe".

import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN = Deno.env.get('DOOR_PI_TOKEN') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  if (!TOKEN || TOKEN.length < 24) return json({ error: 'Função não configurada: falta o secret DOOR_PI_TOKEN (mínimo 24 caracteres).' }, 500);
  if (!safeEqual(req.headers.get('x-door-token') ?? '', TOKEN)) return json({ error: 'Token inválido' }, 401);

  let body: { state?: string; failsafe?: string } = {};
  try { body = await req.json(); } catch { /* corpo vazio = só um sinal de vida */ }
  const piState = body.state === 'open' ? 'open' : 'closed';

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data: cur, error } = await admin.from('door_state').select('desired, open_until, pi_state').eq('id', 1).single();
  if (error || !cur) return json({ error: 'Não consegui ler o estado da porta' }, 500);

  const now = Date.now();
  const until = cur.open_until ? new Date(cur.open_until).getTime() : 0;
  let desired: 'open' | 'closed' = cur.desired === 'open' && until > now ? 'open' : 'closed';

  const patch: Record<string, unknown> = { pi_state: piState, pi_seen_at: new Date(now).toISOString() };
  const logs: { action: string; note?: string }[] = [];

  // prazo vencido: fecha de vez no banco e registra
  if (cur.desired === 'open' && desired === 'closed') {
    patch.desired = 'closed';
    patch.open_until = null;
    logs.push({ action: 'auto_close', note: 'Fechou sozinha (prazo terminou)' });
  }
  // o Pi fechou por conta própria (sem internet / passou do limite): o painel passa a mostrar fechada
  if (body.failsafe && cur.desired === 'open' && desired === 'open') {
    patch.desired = 'closed';
    patch.open_until = null;
    desired = 'closed';
    logs.push({ action: 'pi_failsafe', note: String(body.failsafe).slice(0, 120) });
  }

  await admin.from('door_state').update(patch).eq('id', 1);
  if (logs.length) await admin.from('door_log').insert(logs);

  return json({ desired, seconds_left: desired === 'open' ? Math.max(0, Math.round((until - now) / 1000)) : 0 });
});
