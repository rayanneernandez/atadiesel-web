// Módulo "Kits de Entrega" (Entregas > Kits de Entrega): kits de produtos vendidos só para ENTREGA no app.
// O preço do kit NÃO é digitado: é a soma dos preços atuais dos produtos × quantidade (puxado de cada produto).
// O cliente vê o kit com foto; para a Viasoft o pedido é enviado item por item, cada um pelo preço do seu produto.
// SQL: entrega_regras_kits.sql (tabelas kits e kit_items). Fotos: bucket público 'banners', pasta kits/.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, Plus, Pencil, Trash2, X, Search, ImagePlus, AlertTriangle } from 'lucide-react';
import { supabase } from './supabaseClient';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toNum = (v) => {
  if (v === '' || v == null) return NaN;
  return Number(String(v).replace(',', '.'));
};
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:opacity-50';
const SQL_MSG = "Faltam as tabelas de kits no banco. Rode o arquivo 'entrega_regras_kits.sql' no Supabase (SQL Editor) e recarregue.";
const isMissing = (err) => /does not exist|could not find|relation|schema cache/i.test(String(err?.message || ''));

const productPrice = (p) => {
  if (p?.price_cents != null) return Number(p.price_cents) / 100;
  if (p?.price != null) return Number(p.price);
  return 0;
};

// preço do produto em centavos inteiros (0 = sem preço)
const centsOf = (p) => Math.max(0, Math.round(productPrice(p) * 100));
// soma do kit em centavos: preço atual de cada produto × quantidade (qtd pode ser decimal, igual ao que já existia)
const sumCents = (items, prodById, qtyOf = (it) => Number(it.quantity || 0)) =>
  items.reduce((acc, it) => acc + Math.round(centsOf(prodById.get(String(it.product_id))) * (qtyOf(it) || 0)), 0);
// o kit só pode ser vendido se todo produto existe, está ativo e tem preço
const hasProblem = (items, prodById) => items.some((it) => !prodById.get(String(it.product_id)) || centsOf(prodById.get(String(it.product_id))) <= 0);

const EMPTY = { id: null, name: '', description: '', image_url: '', active: true, items: [] };

export default function KitsEntregaScreen({ showToast, logAction, canEdit = true, canDelete = true }) {
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [kits, setKits] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pick, setPick] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const fileRef = useRef(null);

  // fecha a lista de produtos ao clicar fora dela
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onDown = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const prodById = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(String(p.id), p));
    return m;
  }, [products]);

  const load = useCallback(async () => {
    setLoading(true);
    setMissing(false);
    const { data: prods } = await supabase.from('products').select('*').order('title', { ascending: true });
    setProducts((prods || []).filter((p) => p.is_active !== false && !p.archived));

    const { data: ks, error } = await supabase.from('kits').select('*').order('created_at', { ascending: false });
    if (error) {
      if (isMissing(error)) setMissing(true);
      else showToast?.('Erro ao carregar kits: ' + error.message, 'error');
      setKits([]);
      setLoading(false);
      return;
    }
    const { data: its, error: e2 } = await supabase.from('kit_items').select('*');
    if (e2 && isMissing(e2)) setMissing(true);
    const byKit = new Map();
    (its || []).forEach((it) => {
      const k = String(it.kit_id);
      if (!byKit.has(k)) byKit.set(k, []);
      byKit.get(k).push(it);
    });
    setKits((ks || []).map((k) => ({ ...k, items: byKit.get(String(k.id)) || [] })));
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const itemsText = (items) =>
    items.map((it) => `${Number(it.quantity)}× ${prodById.get(String(it.product_id))?.title || 'Produto removido'}`).join(', ');
  const kitTotal = (items) => sumCents(items, prodById) / 100;

  const openNew = () => setForm({ ...EMPTY, items: [] });
  const openEdit = (k) =>
    setForm({
      id: k.id,
      name: k.name || '',
      description: k.description || '',
      image_url: k.image_url || '',
      active: !!k.active,
      items: k.items.map((it) => ({ product_id: String(it.product_id), quantity: String(it.quantity).replace('.', ',') })),
      _oldItemIds: k.items.map((it) => it.id),
    });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // marca/desmarca o produto no kit (a lista fica aberta para escolher vários de uma vez)
  const toggleProduct = (p) => {
    const id = String(p.id);
    if (form.items.some((it) => String(it.product_id) === id)) return set({ items: form.items.filter((it) => String(it.product_id) !== id) });
    set({ items: [...form.items, { product_id: id, quantity: '1' }] });
  };
  const setQty = (idx, quantity) => set({ items: form.items.map((it, i) => (i === idx ? { ...it, quantity } : it)) });
  const removeItem = (idx) => set({ items: form.items.filter((_, i) => i !== idx) });

  const uploadImage = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) return showToast?.('Escolha um arquivo de imagem.', 'warning');
    if (file.size > 5 * 1024 * 1024) return showToast?.('A imagem passa de 5 MB. Use uma menor.', 'warning');
    setUploading(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `kits/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('banners').upload(path, file);
    if (error) {
      setUploading(false);
      return showToast?.('Erro ao enviar a foto: ' + error.message, 'error');
    }
    const { data } = supabase.storage.from('banners').getPublicUrl(path);
    set({ image_url: data?.publicUrl || '' });
    setUploading(false);
  };

  const formCents = form ? sumCents(form.items, prodById, (it) => toNum(it.quantity)) : 0;
  const formSum = formCents / 100;
  const formProblem = form ? hasProblem(form.items, prodById) : false;

  const candidates = useMemo(() => {
    const q = norm(pick).trim();
    const list = q ? products.filter((p) => [p.title, p.sku].some((f) => norm(f).includes(q))) : products;
    return list.slice(0, 80);
  }, [pick, products]);
  const selectedIds = useMemo(() => new Set((form?.items ?? []).map((it) => String(it.product_id))), [form]);

  const save = async () => {
    if (!canEdit) return showToast?.('Você não tem permissão para esta ação.', 'warning');
    const name = form.name.trim();
    if (!name) return showToast?.('Informe o nome do kit.', 'warning');
    if (form.items.length === 0) return showToast?.('Adicione ao menos um produto ao kit.', 'warning');
    const items = form.items.map((it) => ({ product_id: it.product_id, quantity: toNum(it.quantity) }));
    if (items.some((it) => !(it.quantity > 0))) return showToast?.('Todas as quantidades precisam ser maiores que zero.', 'warning');
    if (formProblem) return showToast?.('Há produto removido, inativo ou sem preço no kit. Remova-o ou corrija o preço no cadastro de produtos.', 'warning');
    // o preço do kit é só a soma dos produtos (o app e o servidor sempre recalculam com o preço atual de cada produto)
    const price = formCents / 100;

    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const base = {
        name,
        description: form.description.trim() || null,
        price,
        image_url: form.image_url || null,
        active: form.active,
        updated_at: new Date().toISOString(),
      };
      let kitId = form.id;
      if (kitId) {
        const { error } = await supabase.from('kits').update(base).eq('id', kitId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('kits').insert({ ...base, created_by: u?.user?.id ?? null }).select('id').single();
        if (error) throw error;
        kitId = data.id;
      }

      // Troca os itens sem nunca deixar o kit vazio: insere os novos primeiro e só então apaga os antigos.
      const { error: insErr } = await supabase.from('kit_items').insert(items.map((it) => ({ kit_id: kitId, product_id: it.product_id, quantity: it.quantity })));
      if (insErr) {
        if (!form.id) await supabase.from('kits').delete().eq('id', kitId); // kit novo sem itens: desfaz
        throw new Error('Não foi possível salvar os itens do kit (' + insErr.message + '). Nada foi alterado nos itens antigos.');
      }
      if (form._oldItemIds?.length) {
        const { error: delErr } = await supabase.from('kit_items').delete().in('id', form._oldItemIds);
        if (delErr) showToast?.('Kit salvo, mas os itens antigos não foram removidos: ' + delErr.message, 'warning');
      }

      logAction?.('SETTINGS_CHANGE', `Kit: ${name}`, {
        action: form.id ? 'update_kit' : 'create_kit',
        changes: [
          { field: 'Total do kit (soma dos produtos)', old: form.id ? brl(kitTotal(kits.find((k) => k.id === form.id)?.items || [])) : '—', new: brl(price) },
          { field: 'Itens', old: form.id ? itemsText(kits.find((k) => k.id === form.id)?.items || []) || '—' : '—', new: items.map((it) => `${it.quantity}× ${prodById.get(String(it.product_id))?.title || ''}`).join(', ') },
        ],
      });
      showToast?.(form.id ? 'Kit atualizado.' : 'Kit criado.', 'success');
      setForm(null);
      load();
    } catch (e) {
      showToast?.(isMissing(e) ? SQL_MSG : e.message || 'Erro ao salvar o kit.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (k) => {
    if (!canEdit) return showToast?.('Você não tem permissão para esta ação.', 'warning');
    const { error } = await supabase.from('kits').update({ active: !k.active, updated_at: new Date().toISOString() }).eq('id', k.id);
    if (error) return showToast?.('Erro: ' + error.message, 'error');
    logAction?.('SETTINGS_CHANGE', `Kit: ${k.name}`, { action: 'toggle_kit', changes: [{ field: 'Situação', old: k.active ? 'Ativo' : 'Inativo', new: k.active ? 'Inativo' : 'Ativo' }] });
    load();
  };

  const remove = async (k) => {
    if (!canDelete) return showToast?.('Você não tem permissão para esta ação.', 'warning');
    if (!window.confirm(`Excluir o kit "${k.name}"? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('kits').delete().eq('id', k.id);
    if (error) return showToast?.('Erro ao excluir: ' + error.message, 'error');
    logAction?.('SETTINGS_CHANGE', `Kit: ${k.name}`, { action: 'delete_kit' });
    showToast?.('Kit excluído.', 'success');
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Gift size={24} className="text-primary" /> Kits de Entrega</h2>
          <p className="text-slate-500 text-sm">Kits só aparecem no app para ENTREGA. O valor do kit é a soma dos produtos; para a Viasoft o pedido é enviado item por item.</p>
        </div>
        {canEdit && !missing && (
          <button onClick={openNew} className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 inline-flex items-center gap-2">
            <Plus size={18} /> Novo kit
          </button>
        )}
      </div>

      {missing && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>{SQL_MSG}</span>
        </div>
      )}
      {!canEdit && <p className="text-xs text-amber-700 bg-amber-50 inline-block px-3 py-1.5 rounded-lg font-semibold">Você pode apenas visualizar os kits.</p>}

      {loading ? (
        <div className="p-12 text-center text-slate-400">Carregando kits...</div>
      ) : kits.length === 0 && !missing ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">Nenhum kit criado ainda.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kits.map((k) => (
            <div key={k.id} className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${k.active ? '' : 'opacity-70'}`}>
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {k.image_url ? <img src={k.image_url} alt={k.name} className="w-full h-full object-cover" /> : <Gift size={48} className="text-slate-300" />}
              </div>
              <div className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-800">{k.name}</h3>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 ${k.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{k.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                {hasProblem(k.items, prodById) || k.items.length === 0 ? (
                  <>
                    <div className="text-lg font-extrabold text-slate-400">{brl(kitTotal(k.items))}</div>
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 font-semibold">Tem produto removido, inativo ou sem preço: o kit não aparece no app até corrigir.</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-extrabold text-primary">{brl(kitTotal(k.items))}</div>
                    <p className="text-[11px] text-slate-400">Soma dos preços atuais dos produtos</p>
                  </>
                )}
                <p className="text-xs text-slate-500">{itemsText(k.items) || 'Sem itens'}</p>
                <div className="mt-auto pt-2 flex flex-wrap gap-2">
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(k)} className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><Pencil size={14} /> Editar</button>
                      <button onClick={() => toggleActive(k)} className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg">{k.active ? 'Desativar' : 'Ativar'}</button>
                    </>
                  )}
                  {canDelete && (
                    <button onClick={() => remove(k)} className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1"><Trash2 size={14} /> Excluir</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !saving && setForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-800">{form.id ? 'Editar kit' : 'Novo kit'}</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex gap-4 items-start">
                <button type="button" onClick={() => fileRef.current?.click()} className="w-32 h-32 shrink-0 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-primary flex items-center justify-center overflow-hidden">
                  {form.image_url ? <img src={form.image_url} alt="" className="w-full h-full object-cover" /> : (
                    <span className="text-xs text-slate-400 text-center px-2 inline-flex flex-col items-center gap-1"><ImagePlus size={22} />{uploading ? 'Enviando...' : 'Foto do kit'}</span>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do kit</label>
                    <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex: Kit Troca de Óleo Diesel" maxLength={80} />
                  </div>
                  <p className="text-[11px] text-slate-400">Foto de preferência quadrada (1:1), até 5 MB.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição <span className="text-slate-400 font-normal">· opcional</span></label>
                <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="O que vem no kit, para quem serve..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Produtos do kit</label>
                <div className="relative" ref={pickerRef}>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={inputCls + ' pl-9'} value={pick} onFocus={() => setPickerOpen(true)} onChange={(e) => { setPick(e.target.value); setPickerOpen(true); }} placeholder="Buscar produto por nome ou código, ou clique para ver a lista" />
                  {pickerOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs">
                        <span className="text-slate-500">{selectedIds.size === 0 ? 'Marque os produtos que fazem parte do kit' : `${selectedIds.size} produto(s) no kit`}</span>
                        <button type="button" onClick={() => setPickerOpen(false)} className="font-bold text-primary hover:underline">Concluir</button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {candidates.length === 0 && <p className="px-3 py-4 text-sm text-slate-400">Nenhum produto encontrado.</p>}
                        {candidates.map((p) => {
                          const on = selectedIds.has(String(p.id));
                          const noPrice = centsOf(p) <= 0;
                          return (
                            <button key={p.id} type="button" onClick={() => toggleProduct(p)} disabled={noPrice && !on} className={`w-full text-left px-3 py-2 flex items-center gap-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                              <input type="checkbox" readOnly checked={on} className="pointer-events-none shrink-0" tabIndex={-1} />
                              <span className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Gift size={16} className="text-slate-300" />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block font-medium text-slate-800 truncate">{p.title}</span>
                                <span className="block text-[11px] text-slate-400">{p.sku ? `Cód. ${p.sku}` : 'Sem código'}</span>
                              </span>
                              <span className={`shrink-0 font-semibold ${noPrice ? 'text-red-500' : 'text-slate-700'}`}>{noPrice ? 'Sem preço' : brl(productPrice(p))}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {form.items.length === 0 && <p className="text-sm text-slate-400">Nenhum produto no kit ainda.</p>}
                  {form.items.map((it, idx) => {
                    const p = prodById.get(String(it.product_id));
                    const ok = !!p && centsOf(p) > 0;
                    return (
                      <div key={it.product_id} className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <span className="w-12 h-12 rounded-lg bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p?.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Gift size={18} className="text-slate-300" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-800 leading-snug break-words">{p?.title || 'Produto removido'}</div>
                              <div className="text-[11px] text-slate-400">{p?.sku ? `Cód. ${p.sku}` : ''}</div>
                            </div>
                            <button type="button" onClick={() => removeItem(idx)} className="p-1.5 -mr-1 -mt-1 text-red-400 hover:text-red-600 shrink-0" title="Remover do kit"><Trash2 size={16} /></button>
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className={`text-xs ${ok ? 'text-slate-500' : 'text-red-500 font-semibold'}`}>{!p ? 'Produto removido ou inativo' : ok ? `${brl(productPrice(p))} cada` : 'Produto sem preço'}</span>
                              <span className="text-xs text-slate-300">×</span>
                              <div className="w-14 shrink-0">
                                <input className={inputCls + ' text-center !py-1 text-sm'} inputMode="decimal" value={it.quantity} onChange={(e) => setQty(idx, e.target.value)} aria-label="Quantidade" />
                              </div>
                            </div>
                            <div className="text-sm font-bold text-slate-800 shrink-0">{brl((centsOf(p) * (toNum(it.quantity) || 0)) / 100)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div>
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total do kit</div>
                  <div className="text-[11px] text-slate-500">Soma automática dos preços dos produtos × quantidade. Não é editável: muda quando o preço do produto mudar.</div>
                </div>
                <div className="text-2xl font-extrabold text-primary shrink-0">{brl(formSum)}</div>
              </div>
              {formProblem && form.items.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 font-semibold">Há produto removido, inativo ou sem preço no kit. Remova-o ou corrija o preço no cadastro de produtos para poder salvar.</p>
              )}

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Kit ativo (aparece no app)
              </label>
              <p className="text-xs text-slate-400">Kits só aparecem no app para ENTREGA e valem para o pedido mínimo de entrega. O cliente compra os produtos juntos, cada um pelo seu preço; para a Viasoft o pedido é enviado item por item, com o preço de cada produto.</p>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 sticky bottom-0">
              <button onClick={() => setForm(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={save} disabled={saving || uploading || formProblem} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar kit'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
