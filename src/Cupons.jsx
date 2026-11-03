// Módulo "Cupons" do painel: cria e gerencia os cupons de desconto que o cliente digita no checkout do app.
// Quem pode ver / criar e editar / excluir é definido em Usuários > Gerenciar Permissões (módulo "Cupons").
// O desconto é conferido e aplicado pelo servidor ao criar o pedido; aqui só se cadastra a regra.
import React, { useCallback, useEffect, useState } from 'react';
import { Ticket, Plus, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from './supabaseClient';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toNum = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const EMPTY = {
  id: null,
  code: '',
  description: '',
  discount_type: 'percent',
  value: '',
  max_discount: '',
  min_order: '',
  max_uses: '',
  max_uses_per_user: '1',
  starts_at: '',
  expires_at: '',
  active: true,
};

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all';

function statusOf(c) {
  const now = Date.now();
  if (!c.active) return { label: 'Desativado', cls: 'bg-slate-100 text-slate-600' };
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { label: 'Expirado', cls: 'bg-red-100 text-red-700' };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: 'Agendado', cls: 'bg-amber-100 text-amber-700' };
  if (c.max_uses != null && Number(c.used_count || 0) >= Number(c.max_uses)) return { label: 'Esgotado', cls: 'bg-red-100 text-red-700' };
  return { label: 'Ativo', cls: 'bg-green-100 text-green-700' };
}

export default function CuponsScreen({ canEdit, canDelete, currentUser, showToast, logAction }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) showToast?.(`Erro ao carregar cupons: ${error.message}`, 'error');
    setRows(data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setForm({ ...EMPTY });
  const openEdit = (c) =>
    setForm({
      id: c.id,
      code: c.code,
      description: c.description || '',
      discount_type: c.discount_type,
      value: String(c.value ?? ''),
      max_discount: c.max_discount != null ? String(c.max_discount) : '',
      min_order: c.min_order ? String(c.min_order) : '',
      max_uses: c.max_uses != null ? String(c.max_uses) : '',
      max_uses_per_user: String(c.max_uses_per_user ?? 0),
      starts_at: toLocalInput(c.starts_at),
      expires_at: toLocalInput(c.expires_at),
      active: !!c.active,
    });

  const save = async () => {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '');
    const value = toNum(form.value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return showToast?.('O código precisa ter de 3 a 30 letras, números, - ou _.', 'warning');
    if (!(value > 0)) return showToast?.('Informe o valor do desconto.', 'warning');
    if (form.discount_type === 'percent' && value > 100) return showToast?.('O desconto em % não pode passar de 100.', 'warning');
    if (form.starts_at && form.expires_at && new Date(form.expires_at) <= new Date(form.starts_at)) {
      return showToast?.('A validade precisa ser depois do início.', 'warning');
    }
    const maxDiscount = form.max_discount === '' ? null : toNum(form.max_discount);
    const minOrder = form.min_order === '' ? 0 : toNum(form.min_order);
    const maxUses = form.max_uses === '' ? null : Math.floor(toNum(form.max_uses));
    const perUser = form.max_uses_per_user === '' ? 0 : Math.floor(toNum(form.max_uses_per_user));
    if ([maxDiscount, minOrder, maxUses, perUser].some((n) => n !== null && Number.isNaN(n) )) return showToast?.('Confira os números preenchidos.', 'warning');

    const payload = {
      code,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      value,
      max_discount: form.discount_type === 'percent' ? maxDiscount : null,
      min_order: minOrder,
      max_uses: maxUses,
      max_uses_per_user: perUser,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active: form.active,
    };

    setSaving(true);
    const res = form.id
      ? await supabase.from('coupons').update(payload).eq('id', form.id)
      : await supabase.from('coupons').insert({ ...payload, created_by: currentUser?.id ?? null, created_by_name: currentUser?.name ?? null });
    setSaving(false);
    if (res.error) {
      const dup = /duplicate|unique/i.test(res.error.message);
      return showToast?.(dup ? 'Já existe um cupom com esse código.' : `Erro ao salvar: ${res.error.message}`, 'error');
    }
    showToast?.(form.id ? 'Cupom atualizado.' : 'Cupom criado.', 'success');
    logAction?.('SETTINGS_CHANGE', code, { action: form.id ? 'update_coupon' : 'create_coupon', ...payload });
    setForm(null);
    load();
  };

  const toggleActive = async (c) => {
    const { error } = await supabase.from('coupons').update({ active: !c.active }).eq('id', c.id);
    if (error) return showToast?.(`Erro: ${error.message}`, 'error');
    logAction?.('SETTINGS_CHANGE', c.code, { action: 'toggle_coupon', active: !c.active });
    load();
  };

  const remove = async (c) => {
    if (!window.confirm(`Excluir o cupom ${c.code}? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', c.id);
    if (error) return showToast?.(`Erro ao excluir: ${error.message}`, 'error');
    showToast?.('Cupom excluído.', 'success');
    logAction?.('SETTINGS_CHANGE', c.code, { action: 'delete_coupon' });
    load();
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Ticket size={24} className="text-primary" /> Cupons de Desconto</h2>
          <p className="text-slate-500 text-sm">Cupons que o cliente digita no checkout do app. O desconto é conferido pelo servidor a cada pedido.</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="bg-primary text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
            <Plus size={18} /> Novo cupom
          </button>
        )}
      </div>

      {!canEdit && <p className="text-xs text-amber-700 bg-amber-50 inline-block px-3 py-1.5 rounded-lg font-semibold">Você pode apenas visualizar os cupons.</p>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Código</th>
              <th className="text-left px-4 py-3">Desconto</th>
              <th className="text-left px-4 py-3">Regras</th>
              <th className="text-left px-4 py-3">Validade</th>
              <th className="text-left px-4 py-3">Usos</th>
              <th className="text-left px-4 py-3">Situação</th>
              <th className="text-left px-4 py-3">Criado por</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum cupom criado ainda.</td></tr>
            ) : rows.map((c) => {
              const st = statusOf(c);
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{c.code}</div>
                    {c.description && <div className="text-xs text-slate-400">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    {c.discount_type === 'percent' ? `${Number(c.value)}%` : brl(c.value)}
                    {c.discount_type === 'percent' && c.max_discount != null && <div className="text-xs text-slate-400 font-normal">até {brl(c.max_discount)}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {Number(c.min_order) > 0 ? <div>Compra mín. {brl(c.min_order)}</div> : <div>Sem mínimo</div>}
                    <div>{Number(c.max_uses_per_user) > 0 ? `${c.max_uses_per_user} uso(s) por cliente` : 'Sem limite por cliente'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <div>De {fmtDate(c.starts_at)}</div>
                    <div>Até {fmtDate(c.expires_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.used_count || 0}{c.max_uses != null ? ` / ${c.max_uses}` : ''}</td>
                  <td className="px-4 py-3"><span className={`text-[11px] font-bold px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.created_by_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <>
                          <button onClick={() => toggleActive(c)} className="text-xs font-semibold text-slate-600 hover:bg-slate-100 px-2 py-1 rounded-lg">{c.active ? 'Desativar' : 'Ativar'}</button>
                          <button onClick={() => openEdit(c)} title="Editar" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Pencil size={16} /></button>
                        </>
                      )}
                      {canDelete && (
                        <button onClick={() => remove(c)} title="Excluir" className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-bold text-lg text-slate-800">{form.id ? 'Editar cupom' : 'Novo cupom'}</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="Ex: BEMVINDO10" maxLength={30} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (interna)</label>
                <input className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ex: Campanha de abril" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de desconto</label>
                <select className={inputCls} value={form.discount_type} onChange={(e) => set('discount_type', e.target.value)}>
                  <option value="percent">Porcentagem (%)</option>
                  <option value="fixed">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{form.discount_type === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
                <input className={inputCls} inputMode="decimal" value={form.value} onChange={(e) => set('value', e.target.value)} placeholder={form.discount_type === 'percent' ? 'Ex: 10' : 'Ex: 20,00'} />
              </div>

              {form.discount_type === 'percent' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Desconto máximo (R$) <span className="text-slate-400 font-normal">· opcional</span></label>
                  <input className={inputCls} inputMode="decimal" value={form.max_discount} onChange={(e) => set('max_discount', e.target.value)} placeholder="Vazio = sem teto" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Compra mínima (R$) <span className="text-slate-400 font-normal">· opcional</span></label>
                <input className={inputCls} inputMode="decimal" value={form.min_order} onChange={(e) => set('min_order', e.target.value)} placeholder="Sobre o valor dos produtos" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Limite total de usos <span className="text-slate-400 font-normal">· opcional</span></label>
                <input className={inputCls} inputMode="numeric" value={form.max_uses} onChange={(e) => set('max_uses', e.target.value)} placeholder="Vazio = ilimitado" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usos por cliente</label>
                <input className={inputCls} inputMode="numeric" value={form.max_uses_per_user} onChange={(e) => set('max_uses_per_user', e.target.value)} placeholder="0 = ilimitado" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Válido a partir de <span className="text-slate-400 font-normal">· opcional</span></label>
                <input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Válido até <span className="text-slate-400 font-normal">· opcional</span></label>
                <input type="datetime-local" className={inputCls} value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
              </div>

              <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Cupom ativo
              </label>
              <p className="sm:col-span-2 text-xs text-slate-400">O desconto vale sobre o valor dos produtos (não sobre o frete) e nunca passa do total dos produtos. Pontos de fidelidade só valem sobre o que sobrar depois do cupom.</p>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setForm(null)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar cupom'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
