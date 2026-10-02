// Sincronização ERP (Viasoft Petroshow / VsHub) -> tabela products
//
// Roda a cada 5 minutos (pg_cron) e pelo botão "Sincronizar ERP" do painel.
// - Cadastro: lê só o que mudou no ERP desde a última execução (filtro UltAlt)
//     * nome alterado no ERP  -> atualiza o título
//     * ficou inativo no ERP  -> arquiva; voltou a ficar ativo -> desarquiva
//     * produto NOVO no ERP   -> cria no painel (código que não existia quando a integração começou)
// - Estoque: saldo mais recente de cada produto do painel
// - Preço: só quando o servidor do ERP tiver o endpoint /vshub/produto-preco
// - Vendas: cada nota/cupom de saída vira uma linha em erp_sales, com itens, pagamento,
//   cliente (CPF/CNPJ) e o recibo em PDF guardado no Storage (bucket "recibos")
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
// Chamadas sem ser admin respeitam este intervalo. Conta a partir do FIM da última execução
// (que leva ~1-2 min), por isso fica bem abaixo dos 5 min do agendamento.
const MIN_INTERVAL_MS = 2 * 60_000;
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

// --------------------------------------------------------- notas ---

const PAG: Record<string, string> = {
  '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de Crédito', '04': 'Cartão de Débito', '05': 'Crédito Loja',
  '10': 'Vale Alimentação', '11': 'Vale Refeição', '12': 'Vale Presente', '13': 'Vale Combustível',
  '15': 'Boleto', '16': 'Depósito', '17': 'PIX', '18': 'Transferência', '19': 'Fidelidade/Cashback', '90': 'Sem pagamento', '99': 'Outros',
};

const tag = (xml: string, t: string) => (xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) ?? [])[1] ?? '';
const num = (v: string) => (v ? Number(v) : 0);
const unescapeXml = (v: string) => v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Lê NF-e / NFC-e (modelo 55/65) e CF-e SAT (modelo 59)
function parseFiscalXml(xml: string) {
  const ide = tag(xml, 'ide');
  const dest = tag(xml, 'dest');
  const sat = /<CFe[\s>]/.test(xml);

  let emitted: string | null = tag(ide, 'dhEmi') || null;
  if (!emitted && tag(ide, 'dEmi')) {
    const d = tag(ide, 'dEmi'), h = tag(ide, 'hEmi').padEnd(6, '0');
    emitted = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${h.slice(0, 2)}:${h.slice(2, 4)}:${h.slice(4, 6)}-03:00`;
  }

  const itens = [...xml.matchAll(/<det [^>]*>([\s\S]*?)<\/det>/g)].map(([, det]) => {
    const prod = tag(det, 'prod');
    const qtd = num(tag(prod, 'qCom'));
    const unit = num(tag(prod, 'vUnCom'));
    const desc = num(tag(prod, 'vDesc'));
    const bruto = num(tag(prod, 'vProd')) || qtd * unit;
    return {
      codigo: tag(prod, 'cProd'),
      descricao: unescapeXml(tag(prod, 'xProd')),
      quantidade: qtd,
      unidade: tag(prod, 'uCom'),
      valor_unit: unit,
      desconto: desc,
      total: Math.round((bruto - desc) * 100) / 100,
    };
  });

  const pagamentos = sat
    ? [...xml.matchAll(/<MP>([\s\S]*?)<\/MP>/g)].map(([, mp]) => ({ forma: PAG[tag(mp, 'cMP')] ?? tag(mp, 'cMP'), valor: num(tag(mp, 'vMP')) }))
    : [...xml.matchAll(/<detPag>([\s\S]*?)<\/detPag>/g)].map(([, dp]) => ({ forma: PAG[tag(dp, 'tPag')] ?? tag(dp, 'tPag'), valor: num(tag(dp, 'vPag')) }));

  const total = tag(xml, 'ICMSTot');
  return {
    numero: tag(ide, 'nNF') || tag(ide, 'nCFe'),
    serie: tag(ide, 'serie') || tag(ide, 'nserieSAT'),
    emitted_at: emitted,
    cliente_nome: unescapeXml(tag(dest, 'xNome')),
    cliente_doc: (tag(dest, 'CPF') || tag(dest, 'CNPJ')).replace(/\D/g, ''),
    cliente_email: tag(dest, 'email'),
    valor_total: num(tag(total, 'vNF')) || num(tag(xml, 'vCFe')),
    desconto: num(tag(total, 'vDesc')) || num(tag(xml, 'vDescSubtot')),
    itens,
    pagamentos,
  };
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
    baseline: state?.baseline_done ? 'concluída' : 'em andamento', vendas_novas: 0, vendas_atualizadas: 0, vendas_ignoradas: 0,
    erros: [] as string[],
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

    // ----------------------------------------- 4. vendas + recibos
    // Notas do ERP em ordem de Id. docs_skip = quantas já foram lidas.
    if (timeLeft() > 30_000) {
      try {
        let dskip: number | null = state?.docs_skip ?? null;

        // 1ª vez: procura a primeira nota a partir de docs_start (busca binária)
        if (dskip == null) {
          const start = String(state?.docs_start ?? '2026-09-01');
          const emissaoAt = async (i: number) => {
            const d = await erpGet('vshub/v1/docfiscal', { Top: 1, Skip: i, Estabs: ESTAB });
            return d?.value?.[0]?.Emissao as string | undefined;
          };
          let hi = 1;
          while (await emissaoAt(hi)) hi *= 2;
          let lo = 0;
          while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            const em = await emissaoAt(mid);
            if (!em || em >= start) hi = mid; else lo = mid + 1;
          }
          dskip = lo;
        }

        const PAGE = 25;
        while (timeLeft() > 25_000) {
          const list = (await erpGet('vshub/v1/docfiscal', { Top: PAGE, Skip: dskip, Estabs: ESTAB }))?.value ?? [];
          if (!list.length) break;

          for (const doc of list) {
            if (timeLeft() < 20_000) break;
            dskip!++;
            // Só vendas (saída) de NF-e, NFC-e e CF-e SAT
            if (doc.Operacao !== 'S' || !['55', '65', '59'].includes(String(doc.Modelo))) continue;

            const { data: exists } = await db.from('erp_sales').select('id').eq('id', doc.Id).maybeSingle();
            if (exists) continue;

            let parsed: ReturnType<typeof parseFiscalXml> | null = null;
            let file: any = null;
            try {
              file = await erpGet(`vshub/v1/docfiscal/${encodeURIComponent(doc.Id)}/download-por-id`);
              if (file?.DocXML_Base64) parsed = parseFiscalXml(new TextDecoder().decode(b64ToBytes(file.DocXML_Base64)));
            } catch (e) {
              result.erros.push(`Nota ${doc.Id}: ${(e as Error).message}`);
              continue;
            }
            if (!parsed) continue;

            // Só itens da loja (produtos cadastrados em Gerenciar Produtos). Diesel a granel fica de fora.
            const lojaItens = parsed.itens.filter((it) => bySku.has(String(it.codigo).trim()));
            if (!lojaItens.length) { result.vendas_ignoradas++; continue; }
            const lojaTotal = Math.round(lojaItens.reduce((sum, it) => sum + Number(it.total || 0), 0) * 100) / 100;
            const notaSoDaLoja = lojaItens.length === parsed.itens.length;

            let pdfPath: string | null = null;
            if (file?.DocPDF_Base64) {
              pdfPath = `${doc.Estab}/${doc.Modelo}/${String(doc.Id).replace('|', '-')}.pdf`;
              const { error: upErr } = await db.storage.from('recibos')
                .upload(pdfPath, b64ToBytes(file.DocPDF_Base64), { contentType: 'application/pdf', upsert: true });
              if (upErr) { result.erros.push(`Recibo ${doc.Id}: ${upErr.message}`); pdfPath = null; }
            }

            const row = {
              id: doc.Id,
              estab: doc.Estab,
              modelo: String(doc.Modelo),
              numero: parsed?.numero || String(doc.Id).split('|')[1],
              serie: parsed?.serie || doc.Serie,
              chave_acesso: doc.ChaveAcesso,
              emitted_at: parsed?.emitted_at || `${doc.Emissao}T12:00:00-03:00`,
              emissao: doc.Emissao,
              operacao: doc.OperacaoDescricao,
              status_fiscal: doc.StatusFiscal,
              cliente_nome: parsed?.cliente_nome || (doc.PessoaNome && doc.PessoaNome !== 'CONSUMIDOR FINAL' ? doc.PessoaNome : 'Consumidor final'),
              cliente_doc: parsed?.cliente_doc || '',
              cliente_email: parsed?.cliente_email || '',
              // Total = só os itens da loja; o valor cheio da nota fica em valor_nota
              valor_total: notaSoDaLoja ? (parsed.valor_total || lojaTotal) : lojaTotal,
              valor_nota: parsed.valor_total || Number(doc.Valor || 0),
              desconto: notaSoDaLoja ? (parsed.desconto ?? 0) : lojaItens.reduce((sum, it) => sum + Number(it.desconto || 0), 0),
              pagamentos: parsed.pagamentos ?? [],
              itens: lojaItens,
              pdf_path: pdfPath,
              synced_at: new Date().toISOString(),
            };
            const { error } = await db.from('erp_sales').upsert(row);
            if (error) result.erros.push(`Venda ${doc.Id}: ${error.message}`);
            else result.vendas_novas++;
          }
          if (list.length < PAGE) break;
        }
        patch.docs_skip = dskip;

        // Atualiza a situação (ex.: cancelamento) das notas mais recentes já guardadas
        if (timeLeft() > 10_000 && dskip! > 0) {
          const recent = (await erpGet('vshub/v1/docfiscal', { Top: 300, Skip: Math.max(0, dskip! - 300), Estabs: ESTAB }))?.value ?? [];
          const ids = recent.filter((d: any) => d.Operacao === 'S').map((d: any) => d.Id);
          if (ids.length) {
            const { data: saved } = await db.from('erp_sales').select('id, status_fiscal').in('id', ids);
            const savedMap = new Map((saved ?? []).map((r: any) => [r.id, r.status_fiscal]));
            for (const d of recent) {
              if (savedMap.has(d.Id) && savedMap.get(d.Id) !== d.StatusFiscal) {
                await db.from('erp_sales').update({ status_fiscal: d.StatusFiscal, synced_at: new Date().toISOString() }).eq('id', d.Id);
                result.vendas_atualizadas++;
              }
            }
          }
        }
      } catch (e) {
        result.erros.push('Vendas: ' + (e as Error).message);
      }
    }

    // ------------------------ 5. lista de códigos existentes (1ª vez)
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
