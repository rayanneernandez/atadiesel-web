// Módulo "Loja Autônoma" do painel: QR da loja, produtos e funcionários que entram na loja
// autônoma e as vendas feitas por lá. Fala com a Edge Function "loja-autonoma" (que guarda a chave)
// e, para cadastros e leituras, direto com as tabelas autonomous_* (protegidas por RLS).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const money = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
const maskCpf = (v) => onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
const maskPhone = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const fmtDate = (s) => (s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');
const METHODS = { pix: 'Pix', apple_pay: 'Apple Pay', google_pay: 'Google Pay', samsung_pay: 'Samsung Pay', card: 'Cartão' };

async function callFn(action) {
  const { data, error } = await supabase.functions.invoke('loja-autonoma', { body: { action } });
  if (error) {
    let msg = error.message;
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch { /* sem corpo */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

const card = 'bg-white rounded-2xl shadow-sm border border-slate-200';
const btnPrimary = 'bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnGhost = 'px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50';
const input = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

// ---------------------------------------------------------------- Funcionário da loja autônoma (compartilhado)
const fieldCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700';
export const EMPTY_STAFF_ACCESS = { cpf: '', phone: '', days: [0, 1, 2, 3, 4, 5, 6], start: '', end: '', until: '' };

/** Campos de acesso à loja autônoma, usados no "Novo Usuário" quando o cargo é Funcionário. */
export function StaffAccessFields({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
      <p className="text-xs text-blue-800">Esta pessoa também terá acesso à <b>Loja Autônoma</b> (para pegar produtos e sair). Ela entra com CPF e telefone.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-slate-700">CPF<input className={`${fieldCls} mt-1.5`} inputMode="numeric" value={value.cpf} onChange={(e) => set({ cpf: maskCpf(e.target.value) })} placeholder="000.000.000-00" /></label>
        <label className="block text-sm font-bold text-slate-700">Telefone (DDD)<input className={`${fieldCls} mt-1.5`} inputMode="numeric" value={value.phone} onChange={(e) => set({ phone: maskPhone(e.target.value) })} placeholder="(18) 99999-9999" /></label>
      </div>
      <div className="text-sm font-bold text-slate-700">Dias de acesso
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button type="button" key={d} onClick={() => set({ days: value.days.includes(i) ? value.days.filter((x) => x !== i) : [...value.days, i] })}
              className={`px-3 py-1.5 rounded-lg text-sm border ${value.days.includes(i) ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 bg-white'}`}>{d}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-bold text-slate-700">Das<input type="time" className={`${fieldCls} mt-1.5`} value={value.start} onChange={(e) => set({ start: e.target.value })} /></label>
        <label className="block text-sm font-bold text-slate-700">Até<input type="time" className={`${fieldCls} mt-1.5`} value={value.end} onChange={(e) => set({ end: e.target.value })} /></label>
      </div>
      <p className="text-xs text-slate-500 -mt-1">Horários vazios = o dia todo. Início maior que o fim (ex.: 22:00 às 06:00) vale pela madrugada.</p>
    </div>
  );
}

export function validateStaffAccess(v) {
  if (onlyDigits(v.cpf).length !== 11) return 'Informe o CPF do funcionário (11 números).';
  if (![10, 11].includes(onlyDigits(v.phone).length)) return 'Informe o telefone do funcionário com DDD.';
  if (!v.days.length) return 'Escolha pelo menos um dia de acesso à loja autônoma.';
  return null;
}

/** Cadastra o acesso na loja autônoma e já sincroniza. Devolve { synced, reason }. Lança erro se não conseguir gravar. */
export async function registerAutonomousStaff({ profileId, name, access, roleTitle = 'Funcionário' }) {
  const payload = {
    profile_id: profileId || null, name: name.trim(), cpf: onlyDigits(access.cpf), phone: onlyDigits(access.phone),
    role_title: roleTitle, active: true, access_days: [...access.days].sort().join(''),
    access_start: access.start || null, access_end: access.end || null,
    access_until: access.until ? new Date(`${access.until}T23:59:59-03:00`).toISOString() : null,
  };
  const { error } = await supabase.from('autonomous_staff').insert(payload);
  if (error) throw new Error(error.code === '23505' ? 'Esse CPF já está cadastrado na loja autônoma.' : error.message);
  try { await callFn('sync_staff'); return { synced: true }; } catch (e) { return { synced: false, reason: e.message }; }
}

// ---------------------------------------------------------------- QR
function QrTab({ showToast }) {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const load = useCallback(async () => {
    setError(''); setQr(null);
    try { setQr(await callFn('qr')); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rotate = async () => {
    setBusy(true);
    try { await callFn('rotate_qr'); setConfirmRotate(false); showToast('QR redefinido. Reimprima o novo QR.', 'success'); await load(); }
    catch (e) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(qr.qr_url); showToast('Link copiado', 'success'); } catch { showToast('Não consegui copiar', 'error'); } };
  const print = () => {
    const w = window.open('', '_blank', 'width=700,height=900');
    if (!w) return showToast('Libere pop-ups para imprimir', 'warning');
    w.document.write(`<html><head><title>QR da loja</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h1>${qr.name}</h1><p style="font-size:22px">Aponte a câmera do celular para o QR code</p>
      <img src="data:image/png;base64,${qr.png_base64}" style="width:420px;height:420px"/>
      <p style="font-size:18px">Pegue o que quiser. Pague pelo celular.</p></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  if (error) return <div className={`${card} p-6 text-sm text-red-700`}>{error}<div className="mt-3"><button className={btnGhost} onClick={load}>Tentar de novo</button></div></div>;
  if (!qr) return <div className={`${card} p-10 text-center text-slate-500`}>Carregando QR…</div>;
  return (
    <div className={`${card} p-6 max-w-xl mx-auto text-center space-y-4`}>
      <h3 className="text-lg font-bold text-slate-800">{qr.name}</h3>
      <img alt="QR Code da loja autônoma" className="mx-auto w-64 h-64 border border-slate-200 rounded-xl p-2 bg-white"
        src={`data:image/svg+xml;utf8,${encodeURIComponent(qr.svg)}`} />
      <div className="text-xs text-slate-500">O QR leva o cliente para:</div>
      <code className="block text-xs bg-slate-50 rounded-lg px-3 py-2 break-all">{qr.qr_url}</code>
      <div className="flex flex-wrap justify-center gap-2">
        <button className={btnGhost} onClick={copy}>Copiar link</button>
        <a className={btnGhost} href={`data:image/png;base64,${qr.png_base64}`} download="qr-loja-autonoma.png">Baixar PNG</a>
        <a className={btnGhost} href={`data:image/svg+xml;utf8,${encodeURIComponent(qr.svg)}`} download="qr-loja-autonoma.svg">Baixar SVG</a>
        <button className={btnPrimary} onClick={print}>Imprimir</button>
      </div>
      <div className="border-t border-slate-100 pt-4">
        {!confirmRotate ? (
          <button className="text-sm text-red-600 hover:underline" onClick={() => setConfirmRotate(true)}>Redefinir QR</button>
        ) : (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 space-y-3">
            <p><b>Atenção:</b> o QR atual para de funcionar na hora. Você precisará imprimir e trocar o QR da porta da loja.</p>
            <div className="flex justify-center gap-2">
              <button className={btnGhost} onClick={() => setConfirmRotate(false)} disabled={busy}>Cancelar</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50" onClick={rotate} disabled={busy}>{busy ? 'Redefinindo…' : 'Redefinir agora'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sincronização
// Todos os produtos do painel vão para a loja autônoma, sozinhos. Aqui só se acompanha e se força uma rodada.
function SyncTab({ showToast }) {
  const [state, setState] = useState(null);
  const [totals, setTotals] = useState({ products: null, staff: null });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data: st }, { count: np }, { count: ns }] = await Promise.all([
      supabase.from('autonomous_sync_state').select('*').eq('id', 1).maybeSingle(),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('autonomous_staff').select('id', { count: 'exact', head: true }),
    ]);
    setState(st || {}); setTotals({ products: np, staff: ns });
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setBusy(true);
    try {
      const r = await callFn('sync_all');
      const extra = r.staff?.incomplete ? ` · ${r.staff.incomplete} funcionário(s) sem CPF/telefone ficaram de fora` : '';
      showToast(`Sincronizado: ${r.products.active} produtos disponíveis (${r.products.created} novos, ${r.products.updated} atualizados)${extra}`, extra ? 'warning' : 'success');
      load();
    } catch (e) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };
  const res = state?.last_result || {};

  return (
    <div className="space-y-4 max-w-3xl">
      <div className={`${card} p-5 space-y-3`}>
        <h3 className="font-bold text-slate-800">Tudo do painel vai para a loja autônoma</h3>
        <p className="text-sm text-slate-600">
          Os <b>produtos</b> (mesmo SKU, título e preço) e os <b>funcionários</b> cadastrados aqui são enviados automaticamente.
          Produtos sem preço ou inativos aparecem como indisponíveis na loja. Quando um preço muda no painel, a loja autônoma recebe a mudança na próxima rodada.
        </p>
        <button className={btnPrimary} onClick={run} disabled={busy}>{busy ? 'Sincronizando…' : 'Sincronizar tudo agora'}</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`${card} p-4`}>
          <div className="text-xs uppercase text-slate-500">Produtos</div>
          <div className="text-2xl font-bold">{totals.products ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">Última rodada: {fmtDate(state?.last_products_at)}</div>
          {res.products && <div className="text-xs text-slate-500">{res.products.created} novos · {res.products.updated} atualizados</div>}
        </div>
        <div className={`${card} p-4`}>
          <div className="text-xs uppercase text-slate-500">Funcionários</div>
          <div className="text-2xl font-bold">{totals.staff ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">Última rodada: {fmtDate(state?.last_staff_at)}</div>
          {res.staff && <div className="text-xs text-slate-500">{res.staff.created} novos · {res.staff.updated} atualizados{res.staff.incomplete ? ` · ${res.staff.incomplete} sem CPF/telefone` : ''}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Funcionários
const EMPTY_STAFF = { id: null, name: '', cpf: '', phone: '', role_title: 'Funcionário', active: true, days: [0, 1, 2, 3, 4, 5, 6], start: '', end: '', until: '' };

// Trava simples: a importação dos usuários não pode rodar duas vezes ao mesmo tempo (o React em dev roda o efeito 2x)
let importing = false;

function StaffTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('autonomous_staff').select('*').order('name');
    if (error) showToast('Erro ao carregar funcionários: ' + error.message, 'error');
    setRows(data || []); setLoading(false);
  }, [showToast]);

  // Os usuários do painel com cargo "Funcionário" ou "Entregador" já são da loja autônoma: entram aqui sozinhos.
  // O painel não guarda CPF nem telefone deles; o dono completa uma vez (a loja precisa dos dois para o acesso).
  const importFromPanel = useCallback(async () => {
    if (importing) return 0; // evita rodar duas vezes ao mesmo tempo
    importing = true;
    try {
      return await importOnce();
    } finally { importing = false; }
  }, []);
  const importOnce = useCallback(async () => {
    const { data: profs, error } = await supabase.from('profiles').select('id, name, email, role, cpf').or('role.ilike.funcion%,role.ilike.entregador%,role.ilike.driver%');
    if (error || !profs?.length) return 0;
    const { data: have } = await supabase.from('autonomous_staff').select('profile_id, cpf');
    const haveProfile = new Set((have || []).map((r) => r.profile_id).filter(Boolean));
    const haveCpf = new Set((have || []).map((r) => r.cpf).filter(Boolean));
    const fresh = profs.filter((p) => !haveProfile.has(p.id)).map((p) => {
      const cpf = onlyDigits(p.cpf);
      const usable = cpf.length === 11 && !haveCpf.has(cpf);
      if (usable) haveCpf.add(cpf);
      const isDriver = /^(entregador|driver)/i.test(p.role || '');
      return { profile_id: p.id, name: p.name || p.email || (isDriver ? 'Entregador' : 'Funcionário'), cpf: usable ? cpf : null, phone: null, role_title: isDriver ? 'Entregador' : 'Funcionário', active: true };
    });
    if (!fresh.length) return 0;
    const { error: insErr } = await supabase.from('autonomous_staff').upsert(fresh, { onConflict: 'profile_id', ignoreDuplicates: true });
    return insErr ? 0 : fresh.length;
  }, []);

  useEffect(() => {
    (async () => {
      const added = await importFromPanel();
      if (added) showToast(`${added} funcionário(s) do painel adicionados. Complete CPF e telefone de cada um.`, 'info');
      load();
    })();
  }, [importFromPanel, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (s) => setForm({
    id: s.id, name: s.name, cpf: maskCpf(s.cpf || ''), phone: maskPhone(s.phone || ''), role_title: s.role_title, active: s.active,
    days: (s.access_days || '').split('').map(Number), start: (s.access_start || '').slice(0, 5), end: (s.access_end || '').slice(0, 5),
    until: s.access_until ? new Date(s.access_until).toISOString().slice(0, 10) : '',
  });

  const save = async (e) => {
    e.preventDefault();
    if (form.cpf && onlyDigits(form.cpf).length !== 11) return showToast('CPF deve ter 11 números', 'warning');
    if (form.phone && ![10, 11].includes(onlyDigits(form.phone).length)) return showToast('Informe o telefone com DDD', 'warning');
    setSaving(true);
    const payload = {
      name: form.name.trim(), cpf: onlyDigits(form.cpf) || null, phone: onlyDigits(form.phone) || null, role_title: form.role_title.trim() || 'Funcionário',
      active: form.active, access_days: [...form.days].sort().join(''), access_start: form.start || null, access_end: form.end || null,
      // "até" vale até o fim do dia escolhido, no horário de Brasília
      access_until: form.until ? new Date(`${form.until}T23:59:59-03:00`).toISOString() : null,
    };
    const { error } = form.id ? await supabase.from('autonomous_staff').update(payload).eq('id', form.id) : await supabase.from('autonomous_staff').insert(payload);
    setSaving(false);
    if (error) return showToast(error.code === '23505' ? 'Esse CPF já está cadastrado' : 'Erro ao salvar: ' + error.message, 'error');
    setForm(null); showToast('Funcionário salvo. Clique em "Sincronizar" para liberar na loja.', 'success'); load();
  };
  const remove = async (s) => {
    if (!window.confirm(`Remover ${s.name}? Para só bloquear o acesso, desmarque "Ativo".`)) return;
    const { error } = await supabase.from('autonomous_staff').delete().eq('id', s.id);
    if (error) return showToast('Erro ao remover: ' + error.message, 'error');
    showToast('Removido. O acesso na loja só cai depois de sincronizar com "Ativo" desmarcado antes.', 'info'); load();
  };
  const sync = async () => {
    setSyncing(true);
    try {       const r = await callFn('sync_staff');
      const extra = [r.incomplete ? `${r.incomplete} sem CPF/telefone ficaram de fora` : '', r.rejected ? `${r.rejected} recusados` : ''].filter(Boolean).join(', ');
      showToast(`Funcionários enviados: ${r.created} novos, ${r.updated} atualizados${extra ? ` (${extra})` : ''}`, extra ? 'warning' : 'success'); }
    catch (e) { showToast(e.message, 'error'); } finally { setSyncing(false); }
  };
  const windowLabel = (s) => `${(s.access_days || '').split('').map((d) => DAYS[d]).join(', ') || 'nenhum dia'} · ${(s.access_start || '00:00').slice(0, 5)}–${(s.access_end || '23:59').slice(0, 5)}${s.access_until ? ` · até ${fmtDate(s.access_until).slice(0, 8)}` : ''}`;

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-wrap items-center gap-3 justify-between`}>
        <div className="text-sm text-slate-600">Quem pode entrar na loja autônoma, e quando. Os usuários com cargo <b>Funcionário</b> ou <b>Entregador</b> do painel entram aqui sozinhos: complete o CPF e o telefone de cada um e clique em <b>Sincronizar</b>.</div>
        <div className="flex gap-2"><button className={btnGhost} onClick={sync} disabled={syncing}>{syncing ? 'Enviando…' : 'Sincronizar'}</button><button className={btnPrimary} onClick={() => setForm({ ...EMPTY_STAFF })}>+ Funcionário</button></div>
      </div>
      <div className={`${card} divide-y divide-slate-100`}>
        {loading ? <div className="p-8 text-center text-slate-400">Carregando…</div> : rows.length === 0 ? <div className="p-8 text-center text-slate-400">Nenhum funcionário cadastrado.</div> : rows.map((s) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-slate-800">{s.name} <span className="text-xs text-slate-500 font-normal">· {s.role_title}</span></div>
              <div className="text-xs text-slate-500">{s.cpf ? maskCpf(s.cpf) : '—'} · {s.phone ? maskPhone(s.phone) : '—'}{(!s.cpf || !s.phone) && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Falta {!s.cpf && !s.phone ? 'CPF e telefone' : !s.cpf ? 'CPF' : 'telefone'}</span>}</div>
              <div className="text-xs text-slate-500">{windowLabel(s)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs rounded-full px-2 py-0.5 ${s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{s.active ? 'Ativo' : 'Inativo'}</span>
              <button className={btnGhost} onClick={() => edit(s)}>Editar</button>
              <button className="text-sm text-red-600 px-2" onClick={() => remove(s)}>Remover</button>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form onSubmit={save} className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-3">
            <h3 className="text-lg font-bold">{form.id ? 'Editar funcionário' : 'Novo funcionário'}</h3>
            <label className="block text-sm">Nome<input className={input} required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">CPF<input className={input} inputMode="numeric" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} /></label>
              <label className="block text-sm">Telefone (DDD)<input className={input} inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} /></label>
            </div>
            <label className="block text-sm">Função<input className={input} value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></label>
            <div className="text-sm">Dias de acesso
              <div className="mt-1 flex flex-wrap gap-2">
                {DAYS.map((d, i) => (
                  <button type="button" key={d} onClick={() => setForm({ ...form, days: form.days.includes(i) ? form.days.filter((x) => x !== i) : [...form.days, i] })}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${form.days.includes(i) ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">Das<input type="time" className={input} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
              <label className="block text-sm">Até<input type="time" className={input} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
            </div>
            <p className="text-xs text-slate-500 -mt-1">Deixe os horários vazios para o dia todo. Se o início for maior que o fim (ex.: 22:00 às 06:00), vale pela madrugada.</p>
            <label className="block text-sm">Acesso temporário até (opcional)<input type="date" className={input} value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Vendas
function SalesTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('autonomous_sales').select('*').order('paid_at', { ascending: false }).limit(100).then(({ data, error }) => {
      if (error) showToast('Erro ao carregar vendas: ' + error.message, 'error');
      setRows(data || []); setLoading(false);
    });
  }, [showToast]);
  const total = useMemo(() => rows.reduce((s, r) => s + (r.amount_cents || 0), 0), [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className={`${card} p-4`}><div className="text-xs uppercase text-slate-500">Vendas (últimas 100)</div><div className="text-2xl font-bold">{rows.length}</div></div>
        <div className={`${card} p-4`}><div className="text-xs uppercase text-slate-500">Total</div><div className="text-2xl font-bold">{money(total)}</div></div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 bg-slate-50"><tr><th className="p-3 text-left">Data</th><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Itens</th><th className="p-3 text-left">Pagamento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-left">Cupom</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Carregando…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400">Nenhuma venda da loja autônoma ainda.</td></tr>
              : rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.paid_at)}</td>
                  <td className="p-3">{r.customer_name || '—'}<div className="text-xs text-slate-500">{r.customer_cpf ? maskCpf(r.customer_cpf) : ''}</div></td>
                  <td className="p-3 text-xs text-slate-600">{(r.items || []).map((i) => `${i.quantity}× ${i.name}`).join(', ')}</td>
                  <td className="p-3">{METHODS[r.method] || r.method || '—'}</td>
                  <td className="p-3 text-right font-medium">{money(r.amount_cents)}</td>
                  <td className="p-3">{r.coupon?.url ? <a className="text-primary hover:underline" href={r.coupon.url} target="_blank" rel="noreferrer">{r.coupon.number || 'Ver'}</a> : '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Tela
const TABS = [['qr', 'QR da loja', QrTab], ['funcionarios', 'Funcionários', StaffTab], ['vendas', 'Vendas', SalesTab], ['sync', 'Sincronização', SyncTab]];

export default function LojaAutonomaScreen({ showToast }) {
  const [tab, setTab] = useState('qr');
  const Current = TABS.find((t) => t[0] === tab)[2];
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Loja Autônoma</h1>
        <p className="text-sm text-slate-500">QR da loja, funcionários, vendas e sincronização da loja sem caixa.</p>
      </div>
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>
      <Current showToast={showToast} />
    </div>
  );
}
