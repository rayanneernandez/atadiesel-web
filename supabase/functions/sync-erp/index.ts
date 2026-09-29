// Sincronização ERP (Viasoft Petroshow / VsHub) -> tabela products
//
// Roda a cada 5 minutos (pg_cron) e pelo botão "Sincronizar ERP" do painel.
// - Cadastro: lê só o que mudou no ERP desde a última execução (filtro UltAlt)
//     * nome alterado no ERP  -> atualiza o título
//     * ficou inativo no ERP  -> arquiva; voltou a ficar ativo -> desarquiva
//     * produto NOVO no ERP   -> cria no painel (código que não existia quando a integração começou)
// - Estoque: saldo mais recente de cada produto do painel
// - Preço: só quando o servidor do ERP tiver o endpoint /vshub/produto-preco
// Toda alteração vai para audit_logs (tela Logs), como "ERP Viasoft".
//
// Secrets necessários (Supabase > Edge Functions > Secrets):
//   ERP_USER, ERP_PASSWORD, ERP_INTEGRADOR_KEY   (obrigatórios)
//   ERP_BASE_URL (padrão http://69.61.27.110:31798), ERP_ESTAB (padrão 100)

import { createClient } from 'npm:@supabase/supabase-js@2';

const ERP_BASE = (Deno.env.get('ERP_BASE_URL') ?? 'http://69.61.27.110:31798').replace(/\/$/, '');
const ERP_USER = Deno.env.get('ERP_USER') ?? '';
const ERP_PASSWORD = Deno.env.get('ERP_PASSWORD') ?? '';
const ERP_KEY = Deno.env.get('ERP_INTEGRADOR_KEY') ?? '';
const ESTAB = Number(Deno.env.get('ERP_ESTAB') ?? '100');

const LOG_EMAIL = 'ERP Viasoft (sincronização automática)';
const TIME_BUDGET_MS = 140_000;      // para antes do limite da Edge Function
const MIN_INTERVAL_MS = 4 * 60_000;  // chamadas sem ser admin respeitam este intervalo
const STOCK_BATCH = 100;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---------------------------------------------------------------- ERP ---

let erpToken = '';

async function erpLogin() {
  const res = await fetch(`${ERP_BASE}/AuthWebService/Autenticar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ AUser: ERP_USER, APassword: ERP_PASSWORD, IntegradorKey: ERP_KEY }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.Token) throw new Error('Login no ERP falhou: ' + (data?.error?.message ?? res.status));
  erpToken = data.Token;
}

async function erpGet(path: string, params: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const url = `${ERP_BASE}/${path}${qs.toString() ? '?' + qs : ''}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${erpToken}`, IntegradorKey: ERP_KEY },
    });
    if ((res.status === 401 || res.status === 403) && attempt === 0) { await erpLogin(); continue; }
    const data = await res.json().catch(() => ({}));
    if (data?.error) {
      const err = new Error(data.error.message ?? 'Erro no ERP') as Error & { code?: string };
      err.code = data.error.code;
      throw err;
    }
    return data;
  }
  throw new Error('ERP recusou o acesso');
}

// Horário do ERP (Brasília), no formato que o filtro UltAlt aceita
const toErpDate = (d: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d).replace(' ', 'T');

const codeOf = (p: any) => String(p.Id ?? '').split('|').slice(1).join('|');

const isInactive = (p: any) => {
  const ativo = Array.isArray(p.Ativo) ? p.Ativo : [];
  return ativo.includes('Nao') || /\(INATIVO\)/i.test(p.Descricao ?? '');
};

const cleanName = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Mesmas regras usadas na importação da planilha
function categoryFor(name: string, grupo?: number | null) {
  const up = name.toUpperCase();
  if (/FILTRO|^ARS\d/.test(up)) return 'Filtros';
  if (/GRAXA|MARFAK|AUTOLITH|\bLITH\b|\bLTTH\b|GRAFITEX|ALFA 2K/.test(up)) return 'Graxas';
  if (/SHAMPOO|LIMPA|SOLUPAN|ESTOPA|DESENGRIPANTE|QUEROSENE|GRANADA|SPRAY|SILVER TEX/.test(up)) return 'Limpeza e Acessórios';
  if (/ADITIV|FLUIDO|COOLANT|RADIADOR|RAD COOL|MELHORADOR|BARDAHL|ISAFLUIDO|DOT ?[34]|ARLA|MILITEC/.test(up)) return 'Aditivos e Fluidos';
  const byGroup: Record<number, string> = { 2: 'Lubrificantes', 3: 'Filtros', 114: 'Filtros', 4: 'Graxas', 16: 'Aditivos e Fluidos' };
  return (grupo != null && byGroup[grupo]) || 'Outros';
}

const brl = (cents: number | null | undefined) =>
  cents == null ? '-' : (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ------------------------------------------------------------ handler ---

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const started = Date.now();
  const timeLeft = () => TIME_BUDGET_MS - (Date.now() - started);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  if (!ERP_USER || !ERP_PASSWORD || !ERP_KEY) {
    return json({ ok: false, error: 'Configure os secrets ERP_USER, ERP_PASSWORD e ERP_INTEGRADOR_KEY.' }, 500);
  }

  // Admin logado no painel pode forçar a sincronização
  let forced = false;
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (jwt) {
    const { data } = await db.auth.getUser(jwt);
    if (data?.user) {
      const { data: prof } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      forced = ['admin', 'administrador'].includes(String(prof?.role ?? '').toLowerCase());
    }
  }

  const { data: state } = await db.from('erp_sync_state').select('*').eq('id', 1).maybeSingle();
  const now = new Date();
  if (state?.running_since && now.getTime() - new Date(state.running_since).getTime() < 5 * 60_000) {
    return json({ ok: true, skipped: 'Já existe uma sincronização em andamento.' });
  }
  if (!forced && state?.last_run_at && now.getTime() - new Date(state.last_run_at).getTime() < MIN_INTERVAL_MS) {
    return json({ ok: true, skipped: 'Sincronizado há pouco tempo.' });
  }
  await db.from('erp_sync_state').upsert({ id: 1, running_since: now.toISOString() });

  const result = {
    cadastro_lidos: 0, nomes_alterados: 0, arquivados: 0, desarquivados: 0, novos: 0,
    estoque_alterado: 0, precos_alterados: 0, preco_disponivel: state?.price_available ?? null,
    baseline: state?.baseline_done ? 'concluída' : 'em andamento', erros: [] as string[],
  };
  const patch: Record<string, unknown> = {};
  const logs: any[] = [];
  const log = (action_type: string, entity_name: string, details: Record<string, unknown>) =>
    logs.push({ id: crypto.randomUUID(), user_id: null, user_email: LOG_EMAIL, action_type, entity_name,
      details: { ...details, source: 'ERP' }, created_at: new Date().toISOString() });

  try {
    await erpLogin();

    // Produtos do painel que têm SKU (código do ERP)
    const { data: ours, error: oursErr } = await db
      .from('products')
      .select('id, sku, title, stock, price_cents, archived, is_active, erp_descricao, erp_preco_cents, erp_archived')
      .not('sku', 'is', null);
    if (oursErr) throw oursErr;
    const bySku = new Map<string, any>((ours ?? []).map((p) => [String(p.sku).trim(), p]));

    const baselineDone = !!state?.baseline_done;

    // ---------------------------------------------- 1. cadastro (delta)
    const cadastroStart = new Date();
    const since = state?.last_ult_alt
      ? new Date(new Date(state.last_ult_alt).getTime() - 10 * 60_000) // margem de 10 min
      : new Date(Date.now() - 24 * 60 * 60_000);
    let skip = 0;
    let cadastroOk = true;
    while (timeLeft() > 60_000) {
      let page: any[];
      try {
        const data = await erpGet('vshub/v1/produto', { Top: 500, Skip: skip, UltAlt: toErpDate(since) });
        page = data?.value ?? [];
      } catch (e) {
        cadastroOk = false;
        result.erros.push('Cadastro: ' + (e as Error).message);
        break;
      }
      result.cadastro_lidos += page.length;

      for (const p of page) {
        const code = codeOf(p);
        if (!code) continue;
        const name = cleanName(p.Descricao || p.DescricaoReduzida);
        const inactive = isInactive(p);
        const mine = bySku.get(code);

        if (mine) {
          const upd: Record<string, unknown> = {};
          const changes: any[] = [];

          if (mine.erp_descricao == null) {
            upd.erp_descricao = name;                       // 1ª vez: só guarda, mantém o nome do painel
          } else if (name && name !== mine.erp_descricao) {
            upd.erp_descricao = name;
            upd.title = name;
            changes.push({ field: 'Nome', old: mine.title, new: name });
            result.nomes_alterados++;
          }

          if (inactive && !mine.archived) {
            Object.assign(upd, { archived: true, is_active: false, erp_archived: true });
            changes.push({ field: 'Situação', old: 'Ativo', new: 'Arquivado (inativo no ERP)' });
            result.arquivados++;
          } else if (!inactive && mine.archived && mine.erp_archived) {
            Object.assign(upd, { archived: false, is_active: true, erp_archived: false });
            changes.push({ field: 'Situação', old: 'Arquivado', new: 'Ativo (reativado no ERP)' });
            result.desarquivados++;
          }

          if (Object.keys(upd).length) {
            upd.erp_synced_at = new Date().toISOString();
            upd.updated_at = new Date().toISOString();
            const { error } = await db.from('products').update(upd).eq('id', mine.id);
            if (error) result.erros.push(`Produto ${code}: ${error.message}`);
            else {
              Object.assign(mine, upd);
              if (changes.length) log('PRODUCT_CHANGE', String(upd.title ?? mine.title), { changes });
            }
          }
          continue;
        }

        // Produto que o painel não tem: só entra se for NOVO no ERP
        if (!baselineDone || inactive) continue;
        const { data: known } = await db.from('erp_known_codes').select('code').eq('code', code).maybeSingle();
        if (known) continue;

        const newProduct = {
          id: crypto.randomUUID(),
          sku: code,
          title: name,
          description: '',
          price_cents: 0,
          stock: 0,
          category: categoryFor(name, p.Grupo?.GrupoNivel_1),
          image_url: '',
          // Sem preço vindo do ERP, entra arquivado para não aparecer a R$ 0,00 no app
          is_active: false,
          archived: true,
          erp_descricao: name,
          erp_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error } = await db.from('products').insert(newProduct);
        await db.from('erp_known_codes').upsert({ code });
        if (error) { result.erros.push(`Novo produto ${code}: ${error.message}`); continue; }
        bySku.set(code, newProduct);
        result.novos++;
        log('PRODUCT_CHANGE', name, { action: 'Criação', details: `Novo produto vindo do ERP (código ${code}). Entrou em Arquivados aguardando preço.` });
      }

      if (page.length < 500) break;
      skip += 500;
    }
    if (cadastroOk) patch.last_ult_alt = cadastroStart.toISOString();

    // ---------------------------------------------------- 2. estoque
    const skus = [...bySku.keys()];
    for (let i = 0; i < skus.length && timeLeft() > 20_000; i += STOCK_BATCH) {
      const batch = skus.slice(i, i + STOCK_BATCH);
      let items: any[] = [];
      try {
        const data = await erpGet('vshub/v1/estoque', { Estabs: ESTAB, Itens: batch.join(','), Top: 1000 });
        items = data?.value ?? [];
      } catch (e) {
        result.erros.push('Estoque: ' + (e as Error).message);
        break;
      }
      for (const it of items) {
        const mine = bySku.get(String(it.Item).trim());
        if (!mine) continue;
        // Saldo mais recente de cada local de estoque, somados
        const latest = new Map<string, any>();
        for (const e of it.Estoques ?? []) {
          if (Number(e.Estab) !== ESTAB) continue;
          const key = `${e.LocalEstoque}|${e.TipoEstoque}`;
          if (!latest.has(key) || String(e.Data) > String(latest.get(key).Data)) latest.set(key, e);
        }
        const saldo = Math.max(0, Math.floor([...latest.values()].reduce((s, e) => s + Number(e.Saldo || 0), 0)));
        const old = Number(mine.stock ?? 0);
        if (saldo === old) continue;

        const { error } = await db.from('products')
          .update({ stock: saldo, erp_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', mine.id);
        if (error) { result.erros.push(`Estoque ${it.Item}: ${error.message}`); continue; }
        mine.stock = saldo;
        result.estoque_alterado++;
        log('STOCK_CHANGE', mine.title, {
          adjustmentType: saldo > old ? 'add' : 'remove',
          value: Math.abs(saldo - old),
          oldStock: old,
          newStock: saldo,
        });
      }
    }

    // ----------------------------------------------------- 3. preço
    const priceCheckDue = !state?.price_checked_at || Date.now() - new Date(state.price_checked_at).getTime() > 60 * 60_000;
    if (timeLeft() > 20_000 && (state?.price_available || priceCheckDue)) {
      try {
        for (let i = 0; i < skus.length && timeLeft() > 15_000; i += STOCK_BATCH) {
          const batch = skus.slice(i, i + STOCK_BATCH);
          const data = await erpGet('vshub/produto-preco', { Estabs: ESTAB, Itens: batch.join(','), Top: 1000 });
          patch.price_available = true;
          result.preco_disponivel = true;
          for (const it of data?.value ?? []) {
            const mine = bySku.get(String(it.Item).trim());
            if (!mine) continue;
            const precos = it.Precos ?? [];
            const p = precos.find((x: any) => x.Tipo === 'PrecoVigente') ?? precos.find((x: any) => x.Tipo === 'PrecoNormal');
            const cents = p?.Preco > 0 ? Math.round(Number(p.Preco) * 100) : null;
            if (cents == null || cents === mine.price_cents) continue;

            const upd: Record<string, unknown> = {
              price_cents: cents, erp_preco_cents: cents,
              erp_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            };
            // Produto novo que estava esperando preço: libera no app
            const liberar = mine.archived && !mine.erp_archived && !mine.price_cents;
            if (liberar) Object.assign(upd, { archived: false, is_active: true });

            const { error } = await db.from('products').update(upd).eq('id', mine.id);
            if (error) { result.erros.push(`Preço ${it.Item}: ${error.message}`); continue; }
            const changes = [{ field: 'Preço', old: brl(mine.price_cents), new: brl(cents) }];
            if (liberar) changes.push({ field: 'Situação', old: 'Arquivado', new: 'Ativo (preço recebido do ERP)' });
            log('PRODUCT_CHANGE', mine.title, { changes });
            Object.assign(mine, upd);
            result.precos_alterados++;
          }
        }
      } catch (e) {
        const err = e as Error & { code?: string };
        if (err.code === 'UrlInfoError') {
          patch.price_available = false;
          result.preco_disponivel = false;
        } else {
          result.erros.push('Preço: ' + err.message);
        }
      }
      patch.price_checked_at = new Date().toISOString();
    }

    // ------------------------ 4. lista de códigos existentes (1ª vez)
    // Guarda todos os códigos que já existem no ERP para não puxar os antigos como "novos".
    if (!baselineDone) {
      let bskip = state?.baseline_skip ?? 0;
      if (!state?.baseline_started_at) patch.baseline_started_at = new Date().toISOString();
      let finished = false;

      const savePage = async (list: any[]) => {
        const rows = list.map(codeOf).filter(Boolean).map((code) => ({ code }));
        if (rows.length) await db.from('erp_known_codes').upsert(rows, { ignoreDuplicates: true });

        // Guarda o nome atual do ERP dos produtos do painel, para detectar quando mudar
        for (const p of list) {
          const mine = bySku.get(codeOf(p));
          if (!mine || mine.erp_descricao != null) continue;
          const name = cleanName(p.Descricao || p.DescricaoReduzida);
          await db.from('products').update({ erp_descricao: name }).eq('id', mine.id);
          mine.erp_descricao = name;
        }
      };

      while (timeLeft() > 25_000) {
        try {
          const data = await erpGet('vshub/v1/produto', { Top: 250, Skip: bskip });
          const page = data?.value ?? [];
          await savePage(page);
          if (page.length < 250) { finished = true; break; }
          bskip += 250;
        } catch {
          // Algum registro do ERP quebra a página: lê de 1 em 1 e pula só o registro com problema
          for (let k = 0; k < 250 && timeLeft() > 25_000; k++) {
            try {
              const one = await erpGet('vshub/v1/produto', { Top: 1, Skip: bskip });
              const page = one?.value ?? [];
              if (!page.length) { finished = true; break; }
              await savePage(page);
            } catch { /* registro com defeito no ERP */ }
            bskip++;
          }
          if (finished) break;
        }
      }

      patch.baseline_skip = bskip;
      if (finished) {
        patch.baseline_done = true;
        // Relê as alterações desde o início da varredura, para não perder cadastros feitos nesse meio tempo
        patch.last_ult_alt = state?.baseline_started_at ?? patch.baseline_started_at;
        result.baseline = 'concluída';
      } else {
        result.baseline = `em andamento (${bskip} códigos lidos)`;
      }
    }
  } catch (e) {
    result.erros.push((e as Error).message);
  }

  // Grava os logs (se a coluna user_id não aceitar vazio, usa um administrador)
  if (logs.length) {
    let { error } = await db.from('audit_logs').insert(logs);
    if (error && /user_id/.test(error.message)) {
      const { data: adm } = await db.from('profiles').select('id').in('role', ['admin', 'administrador']).limit(1).maybeSingle();
      ({ error } = await db.from('audit_logs').insert(logs.map((l) => ({ ...l, user_id: adm?.id }))));
    }
    if (error) result.erros.push('Logs: ' + error.message);
  }

  await db.from('erp_sync_state').upsert({
    id: 1, ...patch, running_since: null, last_run_at: new Date().toISOString(),
    last_result: { ...result, duracao_s: Math.round((Date.now() - started) / 1000) },
  });

  return json({ ok: result.erros.length === 0, ...result });
});
