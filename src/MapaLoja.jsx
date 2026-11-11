// Módulo "Mapa da Loja" do painel: planta interativa para achar onde cada produto está na loja.
// As localizações ficam na tabela product_locations (SQL: mapa_loja.sql). Nome, preço e estoque vêm do cadastro vivo
// (products, ligado pelo código = products.sku). Quem tem 'Editar' no módulo importa CSV e edita; 'Excluir' remove.
// Se a tabela ainda não existir, mostra os dados do mapa original (somente leitura) e avisa para rodar o SQL.
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, Pencil, Trash2, Upload, ZoomIn, ZoomOut, RotateCcw, MapPin, AlertTriangle, Box, Map as MapIcon } from 'lucide-react';
import { supabase } from './supabaseClient';
import mapaImg from './assets/mapa-loja.webp';
import SEED from './mapaLojaSeed';

// A maquete 3D (Three.js) só é baixada quando alguém abre a aba "Loja 3D".
const Loja3D = lazy(() => import('./Loja3D'));

// Áreas clicáveis da planta (coordenadas na imagem 1536 x 1024)
const REGIONS = [
  { keys: ['GONDULA 1'], x: 819, y: 544, w: 229, h: 106 },
  { keys: ['GONDULA 2'], x: 932, y: 412, w: 113, h: 134 },
  { keys: ['GONDULA 3'], x: 930, y: 268, w: 115, h: 145 },
  { keys: ['GONDULA 4'], x: 817, y: 268, w: 114, h: 145 },
  { keys: ['GONDULA 5'], x: 817, y: 412, w: 115, h: 134 },
  { keys: ['GONDULA 6'], x: 483, y: 545, w: 217, h: 105 },
  { keys: ['GONDULA 7'], x: 593, y: 412, w: 110, h: 135 },
  { keys: ['GONDULA 8'], x: 593, y: 269, w: 108, h: 143 },
  { keys: ['GONDULA 9'], x: 487, y: 268, w: 107, h: 144 },
  { keys: ['GONDULA 10'], x: 486, y: 412, w: 108, h: 135 },
  { keys: ['PRATELEIRA 1', 'NICHO 1'], x: 250, y: 596, w: 90, h: 219 },
  { keys: ['PRATELEIRA 2', 'NICHO 2'], x: 250, y: 392, w: 90, h: 204 },
  { keys: ['PRATELEIRA 3', 'NICHO 3'], x: 250, y: 187, w: 90, h: 205 },
  { keys: ['PRATELEIRA 4', 'NICHO 4'], x: 250, y: 72, w: 126, h: 104 },
  { keys: ['PRATELEIRA 5', 'NICHO 5'], x: 375, y: 70, w: 207, h: 105 },
  { keys: ['PRATELEIRA 6', 'NICHO 6'], x: 581, y: 70, w: 208, h: 105 },
  { keys: ['PRATELEIRA 7', 'NICHO 7'], x: 788, y: 70, w: 212, h: 105 },
  { keys: ['PRATELEIRA 8', 'NICHO 8'], x: 998, y: 70, w: 224, h: 105 },
];
const ALL_MOVEIS = REGIONS.flatMap((r) => r.keys);
const KINDS = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'GONDULA', label: 'Gôndolas' },
  { key: 'PRATELEIRA', label: 'Prateleiras' },
  { key: 'NICHO', label: 'Nichos' },
];

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const canonicalMove = (m) => norm(m).toUpperCase().replace(/^GONDOLA /, 'GONDULA ');
const simpleLevel = (l) => (String(l ?? '').match(/N[ÍI]VEL\s*(\d+)/i) || [])[1] || '—';
const regionFor = (move) => REGIONS.find((r) => r.keys.includes(canonicalMove(move)));
const brl = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const keyOf = (r) => [r.codigo ?? '', canonicalMove(r.movel), r.nivel ?? '', r.posicao ?? ''].join('|');

// Rótulo curto no pin da planta: G1, P3/N3...
function shortLabel(reg) {
  const first = reg.keys[0];
  const n = first.replace(/\D/g, '');
  return first.startsWith('GONDULA') ? `G${n}` : `P${n}/N${n}`;
}

// ---- CSV (mesmas colunas do mapa original: Código, Item, MÓVEL, NÍVEL, POSIÇÃO, QNT.PRATELEIRA) ----
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const separator = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let cell = '';
  let line = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (ch === separator && !quoted) { line.push(cell); cell = ''; }
    else if ((ch === '\r' || ch === '\n') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      line.push(cell);
      if (line.some((v) => v.trim())) rows.push(line);
      line = []; cell = '';
    } else cell += ch;
  }
  line.push(cell);
  if (line.some((v) => v.trim())) rows.push(line);
  return rows;
}

function recordsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('O arquivo CSV não contém produtos.');
  const h = rows[0].map(norm);
  const idx = (options, fallback) => {
    for (const s of options) { const i = h.indexOf(norm(s)); if (i >= 0) return i; }
    return fallback;
  };
  if (!h.includes('movel') || !h.includes('posicao') || !h.includes('nivel')) {
    throw new Error('CSV inválido. Exporte a aba Produtos, que deve ter as colunas MÓVEL, NÍVEL e POSIÇÃO.');
  }
  const k = {
    codigo: idx(['Código', 'Codigo'], 0),
    nome: idx(['Item', 'Produto', 'Descrição', 'Descricao'], 1),
    movel: idx(['MÓVEL', 'MOVEL'], 14),
    nivel: idx(['NÍVEL', 'NIVEL'], 15),
    posicao: idx(['POSIÇÃO', 'POSICAO'], 16),
    qtd: idx(['QNT.PRATELEIRA'], 17),
  };
  const out = rows.slice(1)
    .map((r) => ({
      codigo: (r[k.codigo] || '').trim(),
      nome: (r[k.nome] || '').replace(/^\s*\d+\s*[-–]\s*/, '').trim(),
      movel: canonicalMove(r[k.movel] || ''),
      nivel: (r[k.nivel] || '').trim(),
      posicao: (r[k.posicao] || '').trim(),
      qtd: (r[k.qtd] || '').trim(),
    }))
    .filter((r) => r.nome && r.movel && regionFor(r.movel));
  if (!out.length) throw new Error('Nenhuma linha com móvel válido foi encontrada.');
  // linhas repetidas no mesmo lugar contam uma vez (o banco tem chave única)
  const seen = new Map();
  out.forEach((r) => seen.set(keyOf(r), r));
  return [...seen.values()];
}

const EMPTY_FORM = { id: null, codigo: '', nome: '', movel: 'GONDULA 1', nivel: '', posicao: '', qtd: '' };

export default function MapaLojaScreen({ canEdit = false, canDelete = false, showToast, logAction }) {
  const [records, setRecords] = useState([]);
  const [live, setLive] = useState({}); // sku -> produto vivo do cadastro
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('TODOS');
  const [area, setArea] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState('2d'); // '2d' planta | '3d' maquete com as fotos dos móveis
  const [visible, setVisible] = useState(65);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const viewportRef = useRef(null);
  const frameRef = useRef(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    let list = [];
    const { data, error } = await supabase.from('product_locations').select('*').order('movel').order('nivel').order('posicao').limit(5000);
    if (error) {
      if (error.code === '42P01' || /product_locations|does not exist|schema cache/i.test(error.message || '')) {
        setMissingTable(true);
        list = SEED.map((r, i) => ({ ...r, id: `seed-${i}` }));
      } else {
        showToast?.(`Erro ao carregar o mapa: ${error.message}`, 'error');
      }
    } else {
      setMissingTable(false);
      list = data || [];
    }
    setRecords(list);

    // produto vivo (nome, preço, estoque) pelo código = sku
    const codes = [...new Set(list.map((r) => String(r.codigo || '').trim()).filter(Boolean))];
    const map = {};
    for (let i = 0; i < codes.length; i += 150) {
      const { data: prods } = await supabase.from('products').select('id, title, sku, price_cents, stock, is_active').in('sku', codes.slice(i, i + 150));
      (prods || []).forEach((p) => { map[String(p.sku).trim()] = p; });
    }
    setLive(map);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return records.filter((r) => {
      const move = canonicalMove(r.movel);
      if (kind !== 'TODOS' && !move.startsWith(`${kind} `)) return false;
      if (area && !area.includes(move)) return false;
      if (!q) return true;
      const p = live[String(r.codigo || '').trim()];
      const hay = norm([r.nome, p?.title, r.codigo, r.movel, r.nivel, r.posicao].join(' '));
      return hay.includes(q) || q.split(' ').every((w) => hay.includes(w));
    });
  }, [records, live, query, kind, area]);

  useEffect(() => { setVisible(65); }, [query, kind, area]);

  const selected = records.find((r) => r.id === selectedId) || null;
  const selectedRegion = selected ? regionFor(selected.movel) : null;
  const pinRegion = selectedRegion || (area ? REGIONS.find((r) => r.keys.join() === area.join()) : null);
  // O que a maquete 3D destaca: o produto escolhido (móvel + nível + posição) ou a área clicada.
  const highlight3d = useMemo(() => {
    if (selected) {
      const lvl = simpleLevel(selected.nivel);
      return { sector: canonicalMove(selected.movel), level: /^\d+$/.test(lvl) ? lvl : null, pos: selected.posicao || null };
    }
    return area ? { sector: area[0], level: null, pos: null } : null;
  }, [selected, area]);

  const scrollToRegion = useCallback((reg) => {
    requestAnimationFrame(() => {
      const frame = frameRef.current;
      const view = viewportRef.current;
      if (!frame || !view) return;
      const fx = ((reg.x + reg.w / 2) / 1536) * frame.clientWidth;
      const fy = ((reg.y + reg.h / 2) / 1024) * frame.clientHeight;
      view.scrollTo({ left: Math.max(0, fx - view.clientWidth / 2), top: Math.max(0, fy - view.clientHeight / 2), behavior: 'smooth' });
    });
  }, []);

  const chooseArea = (reg) => {
    setArea(reg.keys.slice());
    setSelectedId(null);
    setQuery('');
    setKind('TODOS');
    if (window.innerWidth < 1024) document.getElementById('mapa-lista')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const selectRecord = (r) => {
    setSelectedId(r.id);
    const reg = regionFor(r.movel);
    if (reg) {
      if (zoom < 1.05) setZoom(1.15);
      scrollToRegion(reg);
    }
    if (window.innerWidth < 1024) viewportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const changeZoom = (z) => {
    const next = Math.max(1, Math.min(2.8, z));
    setZoom(next);
    if (selectedRegion) setTimeout(() => scrollToRegion(selectedRegion), 50);
  };

  const reset = () => {
    setQuery(''); setKind('TODOS'); setArea(null); setSelectedId(null); setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  // ---- edição ----
  const openNew = () => setForm({ ...EMPTY_FORM });
  const openEdit = (r) => setForm({ id: r.id, codigo: r.codigo || '', nome: r.nome || '', movel: canonicalMove(r.movel), nivel: r.nivel || '', posicao: r.posicao || '', qtd: r.qtd || '' });

  const save = async () => {
    if (!canEdit) return showToast?.('Você não tem permissão para esta ação', 'warning');
    if (missingTable) return showToast?.('Rode o arquivo mapa_loja.sql no Supabase antes de editar.', 'warning');
    const movel = canonicalMove(form.movel);
    if (!regionFor(movel)) return showToast?.('Escolha um móvel da planta.', 'warning');
    if (!form.nome.trim() && !form.codigo.trim()) return showToast?.('Informe o código ou o nome do produto.', 'warning');
    const payload = {
      codigo: form.codigo.trim(),
      nome: form.nome.trim() || null,
      movel,
      nivel: form.nivel.trim(),
      posicao: form.posicao.trim(),
      qtd: form.qtd.trim(),
      updated_at: new Date().toISOString(),
    };
    setSaving(true);
    const res = form.id ? await supabase.from('product_locations').update(payload).eq('id', form.id) : await supabase.from('product_locations').insert(payload);
    setSaving(false);
    if (res.error) {
      return showToast?.(/duplicate|unique/i.test(res.error.message) ? 'Já existe esse produto nessa posição.' : `Erro ao salvar: ${res.error.message}`, 'error');
    }
    showToast?.(form.id ? 'Localização atualizada.' : 'Localização criada.', 'success');
    logAction?.('SETTINGS_CHANGE', payload.nome || payload.codigo, { action: form.id ? 'update_location' : 'create_location', movel, nivel: payload.nivel, posicao: payload.posicao });
    setForm(null);
    load();
  };

  const remove = async (r) => {
    if (!canDelete) return showToast?.('Você não tem permissão para esta ação', 'warning');
    if (!window.confirm(`Remover "${r.nome || r.codigo}" de ${r.movel}? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('product_locations').delete().eq('id', r.id);
    if (error) return showToast?.(`Erro ao remover: ${error.message}`, 'error');
    showToast?.('Localização removida.', 'success');
    logAction?.('SETTINGS_CHANGE', r.nome || r.codigo, { action: 'delete_location', movel: r.movel });
    if (selectedId === r.id) setSelectedId(null);
    load();
  };

  const importCsv = async (file) => {
    if (!canEdit) return showToast?.('Você não tem permissão para esta ação', 'warning');
    if (missingTable) return showToast?.('Rode o arquivo mapa_loja.sql no Supabase antes de importar.', 'warning');
    setImporting(true);
    try {
      const rows = recordsFromCsv(await file.text());
      const existing = new Set(records.map(keyOf));
      const created = rows.filter((r) => !existing.has(keyOf(r))).length;
      const updated = rows.length - created;
      const now = new Date().toISOString();
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200).map((r) => ({ ...r, updated_at: now }));
        const { error } = await supabase.from('product_locations').upsert(chunk, { onConflict: 'codigo,movel,nivel,posicao' });
        if (error) throw error;
      }
      showToast?.(`CSV importado: ${created} novo(s) e ${updated} atualizado(s).`, 'success');
      logAction?.('SETTINGS_CHANGE', 'Mapa da Loja', { action: 'import_map_csv', criados: created, atualizados: updated });
      load();
    } catch (e) {
      showToast?.(`Não foi possível importar: ${e.message}`, 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><MapPin size={24} className="text-primary" /> Mapa da Loja</h2>
          <p className="text-slate-500 text-sm">Encontre onde cada produto está na planta da loja (gôndolas, prateleiras e nichos).</p>
        </div>
      </div>

      {missingTable && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>A tabela do mapa ainda não existe no banco. Rode o arquivo <b>mapa_loja.sql</b> no Supabase (SQL Editor). Enquanto isso, você vê os dados do mapa original, somente para consulta.</span>
        </div>
      )}
      {!canEdit && !missingTable && <p className="text-xs text-amber-700 bg-amber-50 inline-block px-3 py-1.5 rounded-lg font-semibold">Você pode apenas consultar o mapa.</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4">
        {/* Lista */}
        <aside id="mapa-lista" className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:max-h-[78vh]">
          <div className="p-4 space-y-3 border-b border-slate-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setArea(null); setSelectedId(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && filtered[0]) selectRecord(filtered[0]); }}
                placeholder="Nome, código ou móvel..."
                className="w-full pl-9 pr-9 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/30"
              />
              {query && (
                <button onClick={() => { setQuery(''); setSelectedId(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.key}
                  onClick={() => { setKind(k.key); setArea(null); setSelectedId(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${kind === k.key ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >{k.label}</button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <strong className="text-slate-700">{area ? 'Produtos desta área' : query ? 'Resultados encontrados' : 'Produtos cadastrados'}</strong>
              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">{filtered.length}</span>
            </div>
            {area && (
              <div className="flex items-center justify-between text-xs bg-blue-50 text-blue-800 rounded-lg px-3 py-2">
                <span>Área: {area.join(' / ')}</span>
                <button onClick={() => { setArea(null); setSelectedId(null); }} className="font-bold hover:underline">Limpar</button>
              </div>
            )}
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1.5 max-h-[50vh] lg:max-h-none">
            {loading ? (
              <p className="text-center text-slate-400 text-sm py-8">Carregando...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8 px-4">
                <strong className="block text-slate-600">{area ? 'Nenhum produto cadastrado nesta área.' : 'Nenhum produto encontrado.'}</strong>
                {area ? 'Esta região está na planta, mas ainda não tem itens vinculados.' : 'Tente outro termo, código ou categoria.'}
              </div>
            ) : (
              filtered.slice(0, visible).map((r) => {
                const p = live[String(r.codigo || '').trim()];
                const out = p && p.stock != null && Number(p.stock) <= 0;
                const on = selectedId === r.id;
                return (
                  <div key={r.id} className={`rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-primary bg-blue-50/60' : 'border-slate-100 hover:bg-slate-50'}`} onClick={() => selectRecord(r)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 leading-snug">{p?.title || r.nome}</div>
                        {r.codigo ? <div className="text-[11px] font-semibold text-slate-400">CÓD. {r.codigo}</div> : null}
                      </div>
                      {(canEdit || canDelete) && !missingTable && (
                        <div className="flex shrink-0" onClick={(e) => e.stopPropagation()}>
                          {canEdit && <button onClick={() => openEdit(r)} title="Editar" className="p-1.5 text-slate-400 hover:text-primary rounded-lg"><Pencil size={14} /></button>}
                          {canDelete && <button onClick={() => remove(r)} title="Remover" className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={14} /></button>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{canonicalMove(r.movel)}</span>
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Nível {simpleLevel(r.nivel)}</span>
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Pos. {r.posicao || '—'}</span>
                      {p && <span className="text-[11px] font-bold text-slate-700 ml-auto">{brl(p.price_cents)}</span>}
                      {out && <span className="text-[11px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Sem estoque</span>}
                      {p && !out && p.stock != null && <span className="text-[11px] font-semibold text-emerald-700">Estoque: {p.stock}</span>}
                    </div>
                  </div>
                );
              })
            )}
            {filtered.length > visible && (
              <button onClick={() => setVisible((v) => v + 65)} className="w-full text-center text-xs font-bold text-primary py-2 hover:underline">
                Mostrando {visible} de {filtered.length}. Mostrar mais
              </button>
            )}
          </div>

          {/* Detalhe */}
          <div className="border-t border-slate-100 p-4 text-sm">
            <small className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Localização selecionada</small>
            {selected ? (
              <div className="mt-2">
                <div className="font-bold text-slate-800">{live[String(selected.codigo || '').trim()]?.title || selected.nome}</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[['Móvel', canonicalMove(selected.movel)], ['Nível', simpleLevel(selected.nivel)], ['Posição', selected.posicao || '—']].map(([l, v]) => (
                    <div key={l} className="border border-slate-200 rounded-lg px-2 py-2 min-w-0">
                      <div className="text-[10px] text-slate-400">{l}</div>
                      <div className="text-xs font-bold text-slate-800 break-words">{v}</div>
                    </div>
                  ))}
                </div>
                {selected.codigo ? <div className="text-xs text-slate-400 mt-2">Código: {selected.codigo}{selected.qtd ? ` · Qtd. na prateleira: ${selected.qtd}` : ''}</div> : null}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">{area ? 'Selecione um produto da lista ou clique em outro móvel.' : 'Escolha um produto para destacar a localização na planta.'}</p>
            )}
          </div>
        </aside>

        {/* Planta */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 min-w-0 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">{view === '3d' ? 'Maquete 3D' : 'Visão superior'}</div>
              <div className="text-sm font-bold text-slate-800">{view === '3d' ? 'Loja em 3D com fotos dos móveis' : 'Planta da loja'}</div>
              <div className="text-xs text-slate-400">
                {selected ? `${canonicalMove(selected.movel)} · nível ${simpleLevel(selected.nivel)} · posição ${selected.posicao || '—'}` : area ? `Exibindo produtos de ${area.join(' / ')}.` : view === '3d' ? 'Clique numa gôndola ou prateleira para ver seus produtos.' : 'Clique nas áreas da planta para ver seus produtos.'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex border border-slate-200 rounded-lg overflow-hidden" role="tablist" aria-label="Tipo de visualização">
                <button role="tab" aria-selected={view === '2d'} onClick={() => setView('2d')} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 ${view === '2d' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}><MapIcon size={14} /> Planta 2D</button>
                <button role="tab" aria-selected={view === '3d'} onClick={() => setView('3d')} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 border-l border-slate-200 ${view === '3d' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Box size={14} /> Loja 3D</button>
              </div>
              <button onClick={reset} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"><RotateCcw size={14} /> Restaurar</button>
              {view === '2d' && (
                <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => changeZoom(zoom - 0.25)} aria-label="Diminuir zoom" className="px-3 py-2 text-slate-600 hover:bg-slate-50"><ZoomOut size={16} /></button>
                  <button onClick={() => changeZoom(zoom + 0.25)} aria-label="Aumentar zoom" className="px-3 py-2 text-slate-600 hover:bg-slate-50 border-l border-slate-200"><ZoomIn size={16} /></button>
                </div>
              )}
            </div>
          </div>

          {view === '3d' ? (
            <Suspense fallback={<div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 h-[62vh] min-h-[340px] text-sm text-slate-400">Carregando a loja em 3D…</div>}>
              <Loja3D regions={REGIONS} highlight={highlight3d} onPick={chooseArea} />
            </Suspense>
          ) : (
          <div ref={viewportRef} className="overflow-auto rounded-xl border border-slate-200 bg-white flex-1 min-h-[260px] max-h-[70vh]">
            <div ref={frameRef} className="relative select-none leading-[0]" style={{ width: `${zoom * 100}%`, minWidth: 560 }}>
              <img src={mapaImg} alt="Planta da loja" className="block w-full h-auto" draggable={false} />
              <svg viewBox="0 0 1536 1024" className="absolute inset-0 w-full h-full overflow-visible" aria-label="Áreas clicáveis da loja">
                {REGIONS.map((reg) => (
                  <g key={reg.keys.join()} className="cursor-pointer" role="button" tabIndex={0} aria-label={`Ver produtos de ${reg.keys.join(' e ')}`}
                    onClick={() => chooseArea(reg)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseArea(reg); } }}>
                    <rect x={reg.x} y={reg.y} width={reg.w} height={reg.h} rx={3} fill="transparent" className="hover:fill-sky-500/15 focus:fill-sky-500/15" />
                  </g>
                ))}
                {pinRegion && (() => {
                  const cx = pinRegion.x + pinRegion.w / 2;
                  const cy = pinRegion.y + pinRegion.h / 2;
                  const label = shortLabel(pinRegion);
                  const bw = Math.max(86, label.length * 20 + 34);
                  const ly = cy - 49;
                  return (
                    <g aria-hidden="true" pointerEvents="none">
                      <rect x={pinRegion.x - 4} y={pinRegion.y - 4} width={pinRegion.w + 8} height={pinRegion.h + 8} rx={7} fill="#e65c3920" stroke="#d63b2e" strokeWidth={6} strokeDasharray="14 8" vectorEffect="non-scaling-stroke" />
                      <circle cx={cx} cy={cy} r={33} fill="#de4637" opacity={0.14} />
                      <circle cx={cx} cy={cy} r={15} fill="#d13f35" stroke="#fff" strokeWidth={6} />
                      <rect x={cx - bw / 2} y={ly - 24} width={bw} height={35} rx={8} fill="#b82e24" />
                      <text x={cx} y={ly} textAnchor="middle" fill="#fff" fontWeight={800} fontFamily="Arial, sans-serif" fontSize={19} letterSpacing={1}>{label}</text>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full bg-red-600" /> Destaque da localização selecionada</span>
            <span>{records.length} registros localizados</span>
          </div>
        </section>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{form.id ? 'Editar localização' : 'Nova localização'}</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código</label>
                  <input className={inputCls} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: 4901" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do produto</label>
                  <input className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Como está no cadastro" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Móvel</label>
                <select className={inputCls} value={form.movel} onChange={(e) => setForm({ ...form, movel: e.target.value })}>
                  {ALL_MOVEIS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nível</label>
                  <input className={inputCls} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} placeholder="NÍVEL 1 - PRATELEIRA 1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Posição</label>
                  <input className={inputCls} value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })} placeholder="Ex: 2/3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantidade na prateleira (opcional)</label>
                <input className={inputCls} value={form.qtd} onChange={(e) => setForm({ ...form, qtd: e.target.value })} />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setForm(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
