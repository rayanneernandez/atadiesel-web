// Módulo "Regras de Entrega" (Entregas > Regras de Entrega): define o pedido mínimo para entrega e quais produtos
// podem ser entregues (com quantidade mínima opcional). SQL: entrega_regras_kits.sql (cria delivery_settings,
// products.delivery_min_qty, kits e kit_items). Sem 'Editar' em Entregas a tela é somente leitura.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Save, AlertTriangle, Truck } from 'lucide-react';
import { supabase } from './supabaseClient';

const PAGE = 40;
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toNum = (v) => {
  if (v === '' || v == null) return NaN;
  return Number(String(v).replace(',', '.'));
};
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed';
const SQL_MSG = "Faltam colunas/tabelas no banco. Rode o arquivo 'entrega_regras_kits.sql' no Supabase (SQL Editor) e recarregue.";

const isMissing = (err) => /does not exist|could not find|relation|schema cache|column/i.test(String(err?.message || ''));

export default function RegrasEntregaScreen({ showToast, logAction, canEdit = true }) {
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [minOrder, setMinOrder] = useState('500');
  const [minOrderSaved, setMinOrderSaved] = useState('500');
  const [savingMin, setSavingMin] = useState(false);

  const [products, setProducts] = useState([]);
  const [hasMinQtyCol, setHasMinQtyCol] = useState(true);
  const [edits, setEdits] = useState({}); // id -> { allowed, minQty }
  const [savingProducts, setSavingProducts] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | yes | no
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setMissing(false);
    const { data: ds, error: e1 } = await supabase.from('delivery_settings').select('*').eq('id', 1).maybeSingle();
    if (e1) {
      if (isMissing(e1)) setMissing(true);
      else showToast?.('Erro ao carregar o pedido mínimo: ' + e1.message, 'error');
    } else if (ds && ds.min_order_value != null) {
      const v = String(ds.min_order_value).replace('.', ',');
      setMinOrder(v);
      setMinOrderSaved(v);
    }

    const { data: prods, error: e2 } = await supabase.from('products').select('*').order('title', { ascending: true });
    if (e2) {
      showToast?.('Erro ao carregar produtos: ' + e2.message, 'error');
      setProducts([]);
    } else {
      const rows = (prods || []).filter((p) => p.is_active !== false && !p.archived);
      setHasMinQtyCol(rows.length === 0 || Object.prototype.hasOwnProperty.call(rows[0], 'delivery_min_qty'));
      if (rows.length && !Object.prototype.hasOwnProperty.call(rows[0], 'delivery_allowed')) setMissing(true);
      setProducts(rows);
    }
    setEdits({});
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const cur = (p) => {
    const e = edits[p.id];
    return {
      allowed: e ? e.allowed : !!p.delivery_allowed,
      minQty: e ? e.minQty : (p.delivery_min_qty == null ? '' : String(p.delivery_min_qty).replace('.', ',')),
    };
  };

  const setEdit = (p, patch) => {
    if (!canEdit) return;
    setEdits((prev) => {
      const base = prev[p.id] || { allowed: !!p.delivery_allowed, minQty: p.delivery_min_qty == null ? '' : String(p.delivery_min_qty).replace('.', ',') };
      const next = { ...base, ...patch };
      // sem permitir entrega não existe quantidade mínima
      if (!next.allowed) next.minQty = '';
      const orig = { allowed: !!p.delivery_allowed, minQty: p.delivery_min_qty == null ? '' : String(p.delivery_min_qty).replace('.', ',') };
      const same = next.allowed === orig.allowed && String(next.minQty) === String(orig.minQty);
      const copy = { ...prev };
      if (same) delete copy[p.id];
      else copy[p.id] = next;
      return copy;
    });
  };

  const filtered = useMemo(() => {
    const q = norm(search).trim();
    return products.filter((p) => {
      const c = cur(p);
      if (filter === 'yes' && !c.allowed) return false;
      if (filter === 'no' && c.allowed) return false;
      if (!q) return true;
      return [p.title, p.sku, p.category].some((f) => norm(f).includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, search, filter, edits]);

  useEffect(() => { setPage(1); }, [search, filter]);

  const pageRows = filtered.slice(0, page * PAGE);
  const dirtyCount = Object.keys(edits).length;
  const allowedCount = products.filter((p) => cur(p).allowed).length;

  const saveMinOrder = async () => {
    if (!canEdit) return showToast?.('Você não tem permissão para esta ação.', 'warning');
    const v = minOrder === '' ? 0 : toNum(minOrder);
    if (Number.isNaN(v) || v < 0) return showToast?.('Informe um valor válido (0 = sem mínimo).', 'warning');
    setSavingMin(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('delivery_settings').upsert({ id: 1, min_order_value: v, updated_at: new Date().toISOString(), updated_by: u?.user?.id ?? null });
    setSavingMin(false);
    if (error) return showToast?.(isMissing(error) ? SQL_MSG : 'Erro ao salvar: ' + error.message, 'error');
    logAction?.('SETTINGS_CHANGE', 'Entrega: pedido mínimo', { changes: [{ field: 'Pedido mínimo para entrega', old: brl(toNum(minOrderSaved) || 0), new: brl(v) }] });
    setMinOrderSaved(String(v).replace('.', ','));
    setMinOrder(String(v).replace('.', ','));
    showToast?.(v > 0 ? `Pedido mínimo para entrega: ${brl(v)}.` : 'Entrega sem pedido mínimo.', 'success');
  };

  const saveProducts = async () => {
    if (!canEdit) return showToast?.('Você não tem permissão para esta ação.', 'warning');
    const entries = Object.entries(edits);
    if (!entries.length) return;
    // valida quantidades
    for (const [id, e] of entries) {
      if (e.allowed && e.minQty !== '') {
        const q = toNum(e.minQty);
        if (Number.isNaN(q) || q <= 0) {
          const p = products.find((x) => String(x.id) === String(id));
          return showToast?.(`Quantidade mínima inválida em "${p?.title}". Use um número maior que zero ou deixe vazio.`, 'warning');
        }
      }
    }
    setSavingProducts(true);
    let ok = 0;
    let fail = 0;
    let firstError = '';
    const done = [];
    for (const [id, e] of entries) {
      const p = products.find((x) => String(x.id) === String(id));
      const patch = { delivery_allowed: !!e.allowed };
      if (hasMinQtyCol) patch.delivery_min_qty = e.allowed && e.minQty !== '' ? toNum(e.minQty) : null;
      const { error } = await supabase.from('products').update(patch).eq('id', id);
      if (error) {
        fail++;
        if (!firstError) firstError = error.message;
        continue;
      }
      ok++;
      const changes = [];
      if (!!p.delivery_allowed !== !!e.allowed) changes.push({ field: 'Permite entrega', old: p.delivery_allowed ? 'Sim' : 'Não', new: e.allowed ? 'Sim' : 'Não' });
      const oldQ = p.delivery_min_qty == null ? '' : String(p.delivery_min_qty).replace('.', ',');
      if (hasMinQtyCol && oldQ !== (e.allowed ? e.minQty : '')) changes.push({ field: 'Quantidade mínima para entrega', old: oldQ || '—', new: (e.allowed ? e.minQty : '') || '—' });
      if (changes.length) done.push({ title: p.title, changes });
    }
    setSavingProducts(false);
    done.forEach((d) => logAction?.('PRODUCT_CHANGE', d.title, { changes: d.changes }));
    if (fail) showToast?.(`${ok} salvo(s), ${fail} com erro: ${isMissing({ message: firstError }) ? SQL_MSG : firstError}`, 'error');
    else showToast?.(`${ok} produto(s) atualizado(s).`, 'success');
    load();
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Carregando regras de entrega...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Truck size={24} className="text-primary" /> Regras de Entrega</h2>
        <p className="text-slate-500 text-sm">Define o valor mínimo do pedido de entrega e quais produtos podem ser entregues. Retirada na loja não tem regra.</p>
      </div>

      {missing && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{SQL_MSG}</span>
        </div>
      )}
      {!canEdit && <p className="text-xs text-amber-700 bg-amber-50 inline-block px-3 py-1.5 rounded-lg font-semibold">Você pode apenas visualizar as regras.</p>}

      {/* Pedido mínimo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <h3 className="font-bold text-slate-800">Pedido mínimo para entrega</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor mínimo (R$)</label>
            <input className={inputCls} inputMode="decimal" disabled={!canEdit} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="Ex: 500,00" />
          </div>
          {canEdit && (
            <button onClick={saveMinOrder} disabled={savingMin || minOrder === minOrderSaved} className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-50 inline-flex items-center gap-2">
              <Save size={16} /> {savingMin ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">Vale para o pedido de entrega inteiro (soma dos produtos e kits, sem o frete); retirada na loja não tem mínimo. Use 0 para não exigir mínimo. A taxa de entrega e a distância são configuradas em Configurações &gt; Entrega e frete.</p>
      </div>

      {/* Produtos */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Produtos que podem ser entregues</h3>
            <p className="text-xs text-slate-500">{allowedCount} de {products.length} produtos ativos permitem entrega. Os demais só podem ser retirados na loja ou na loja autônoma.</p>
          </div>
          {canEdit && (
            <button onClick={saveProducts} disabled={!dirtyCount || savingProducts} className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-50 inline-flex items-center gap-2">
              <Save size={16} /> {savingProducts ? 'Salvando...' : `Salvar alterações${dirtyCount ? ` (${dirtyCount})` : ''}`}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={inputCls + ' pl-9'} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, código ou categoria" />
          </div>
          <select className={inputCls + ' sm:w-56'} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="yes">Entregáveis</option>
            <option value="no">Não entregáveis</option>
          </select>
        </div>

        {!hasMinQtyCol && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">A coluna de quantidade mínima ainda não existe no banco: rode o SQL para habilitar esse campo.</p>
        )}

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Produto</th>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Permite entrega</th>
                <th className="text-left px-4 py-3">Quantidade mínima</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhum produto encontrado.</td></tr>
              ) : pageRows.map((p) => {
                const c = cur(p);
                const dirty = !!edits[p.id];
                return (
                  <tr key={p.id} className={`border-t border-slate-100 ${dirty ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.title}</div>
                      {p.category && <div className="text-xs text-slate-400">{p.category}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setEdit(p, { allowed: !c.allowed })}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors disabled:opacity-60 ${c.allowed ? 'bg-primary' : 'bg-slate-300'}`}
                        aria-label={`Permite entrega: ${p.title}`}
                      >
                        <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${c.allowed ? 'translate-x-5' : ''}`}></span>
                      </button>
                    </td>
                    <td className="px-4 py-3 w-48">
                      <input
                        className={inputCls}
                        inputMode="decimal"
                        disabled={!canEdit || !c.allowed || !hasMinQtyCol}
                        value={c.minQty}
                        onChange={(e) => setEdit(p, { minQty: e.target.value })}
                        placeholder={c.allowed ? 'Sem mínimo' : '—'}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > pageRows.length && (
          <div className="text-center">
            <button onClick={() => setPage((n) => n + 1)} className="text-sm font-semibold text-primary hover:bg-blue-50 px-4 py-2 rounded-lg">
              Mostrar mais ({filtered.length - pageRows.length} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
