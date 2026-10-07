// Módulo "Integrações" do painel (só para quem está em integration_admins): tokens do Mex10 (SMS),
// escolha do provedor de consulta de CPF/CNPJ (Dabra ou Infosimples) e o registro das consultas feitas pelo app.
// O backend do app (stripe-server) lê a tabela "integrations" com a service_role, então o que é salvo aqui vale no app.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const card = 'bg-white rounded-2xl shadow-sm border border-slate-200';
const btnPrimary = 'bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnGhost = 'px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50';
const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
const fmtDate = (s) => (s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtDoc = (d) => {
  const v = onlyDigits(d);
  if (v.length === 11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (v.length === 14) return v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
};

const PROVIDERS = {
  mex10: {
    title: 'Mex10', badge: 'SMS', kind: 'sms',
    desc: 'Envia o código por SMS no cadastro e no login do app.',
    fields: [{ key: 'base_url', label: 'URL da API' }],
  },
  dabra: {
    title: 'Dabra', badge: 'Consulta CPF/CNPJ', kind: 'cpf_lookup',
    desc: 'Consulta CPF/CNPJ do cliente quando ele se cadastra no app.',
    fields: [{ key: 'base_url', label: 'URL da API' }],
  },
  infosimples: {
    title: 'Infosimples', badge: 'Consulta CPF/CNPJ', kind: 'cpf_lookup',
    desc: 'Consulta CPF/CNPJ do cliente quando ele se cadastra no app.',
    fields: [{ key: 'base_url', label: 'URL da API' }],
  },
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function ProviderCard({ row, onSave, onActivate, saving }) {
  const meta = PROVIDERS[row.provider] || { title: row.provider, badge: row.kind, fields: [], desc: '' };
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(row.settings || {});
  const dirty = token !== '' || JSON.stringify(settings) !== JSON.stringify(row.settings || {});

  useEffect(() => { setSettings(row.settings || {}); setToken(''); }, [row]);

  const masked = row.token ? `${row.token.slice(0, 4)}••••••••${row.token.slice(-4)}` : 'não configurado';

  return (
    <div className={`${card} p-6 space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">{meta.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{meta.badge}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{meta.desc}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Toggle checked={row.enabled} disabled={saving} onChange={(v) => onActivate(row, v)} />
          <span className={`text-xs font-medium ${row.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{row.enabled ? 'Ativo no app' : 'Desativado'}</span>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-700">Token</label>
        <p className="text-xs text-slate-400 mb-1.5">Atual: <span className="font-mono">{show && row.token ? row.token : masked}</span>
          {row.token && <button type="button" className="ml-2 text-primary hover:underline" onClick={() => setShow(!show)}>{show ? 'ocultar' : 'mostrar'}</button>}
        </p>
        <input className={`${inputCls} font-mono`} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Cole o novo token (deixe vazio para manter o atual)" />
      </div>

      {meta.fields.map((f) => (
        <div key={f.key}>
          <label className="text-sm font-bold text-slate-700">{f.label}</label>
          <input className={`${inputCls} mt-1.5`} value={settings[f.key] || ''} onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })} />
        </div>
      ))}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-400">{row.updated_by ? `Última alteração: ${fmtDate(row.updated_at)} por ${row.updated_by}` : 'Nunca alterado'}</span>
        <button className={btnPrimary} disabled={!dirty || saving} onClick={() => onSave(row, { token: token || undefined, settings })}>Salvar</button>
      </div>
    </div>
  );
}

// Mostra qualquer retorno do provedor em campos legíveis (objetos e listas aninhados viram blocos).
const prettyLabel = (k) => String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
function DataView({ data, level = 0 }) {
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
            {typeof item === 'object' && item !== null ? <DataView data={item} level={level + 1} /> : <span className="text-sm">{String(item)}</span>}
          </div>
        ))}
      </div>
    );
  }
  if (data && typeof data === 'object') {
    return (
      <dl className={level === 0 ? 'grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm' : 'grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm'}>
        {Object.entries(data).filter(([, v]) => !isEmpty(v)).map(([k, v]) => {
          const nested = typeof v === 'object';
          return (
            <div key={k} className={nested ? 'sm:col-span-2' : ''}>
              <dt className="text-slate-400 text-xs">{prettyLabel(k)}</dt>
              <dd className="font-medium text-slate-800 break-words">
                {nested ? <div className="mt-1"><DataView data={v} level={level + 1} /></div>
                  : typeof v === 'boolean' ? (v ? 'Sim' : 'Não')
                  : /^https?:\/\//.test(String(v)) ? <a className="text-primary hover:underline" href={v} target="_blank" rel="noreferrer">abrir</a>
                  : String(v)}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }
  return <span className="text-sm">{String(data)}</span>;
}

function DetailModal({ item, profile, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-4`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Detalhes da consulta</h3>
            <p className="text-sm text-slate-500">{fmtDate(item.created_at)} · {PROVIDERS[item.provider]?.title || item.provider}</p>
          </div>
          <button className={btnGhost} onClick={onClose}>Fechar</button>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-400">Cliente</dt><dd className="font-medium text-slate-800">{profile?.name || 'Sem nome'}</dd></div>
          <div><dt className="text-slate-400">E-mail</dt><dd className="font-medium text-slate-800">{profile?.email || '—'}</dd></div>
          <div><dt className="text-slate-400">{item.doc_type?.toUpperCase()}</dt><dd className="font-medium text-slate-800">{fmtDoc(item.document)}</dd></div>
          <div><dt className="text-slate-400">Status</dt><dd className={`font-medium ${item.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{item.status === 'success' ? 'Sucesso' : 'Erro'}</dd></div>
        </dl>
        {item.error && <div className="text-sm bg-red-50 border border-red-100 text-red-700 rounded-xl p-3">{item.error}</div>}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">Dados retornados pelo provedor</p>
          {item.result ? <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><DataView data={item.result} /></div> : <p className="text-sm text-slate-400">Sem dados.</p>}
          {item.result && (
            <details className="mt-3"><summary className="text-xs text-slate-400 cursor-pointer">Ver JSON bruto</summary>
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-x-auto mt-2">{JSON.stringify(item.result, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function LookupsTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('document_lookups').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) { showToast?.(`Erro ao carregar consultas: ${error.message}`, 'error'); setLoading(false); return; }
    setRows(data || []);
    const ids = [...new Set((data || []).map((r) => r.user_id).filter(Boolean))];
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, name, email').in('id', ids);
      setProfiles(Object.fromEntries((ps || []).map((p) => [p.id, p])));
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const p = profiles[r.user_id];
      return [p?.name, p?.email, r.document, r.provider].some((v) => String(v || '').toLowerCase().includes(t.replace(/[.\-/]/g, '')) || String(v || '').toLowerCase().includes(t));
    });
  }, [rows, profiles, q]);

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="p-4 flex items-center gap-3 border-b border-slate-100">
        <input className={`${inputCls} max-w-sm`} placeholder="Buscar por cliente, CPF/CNPJ ou provedor" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={btnGhost} onClick={load} disabled={loading}>Atualizar</button>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} consulta(s)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Provedor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const p = profiles[r.user_id];
              return (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-3"><button className="text-primary hover:underline text-left" onClick={() => setSelected(r)}>{p?.name || p?.email || 'Cliente não identificado'}</button></td>
                  <td className="px-4 py-3 font-mono text-xs">{fmtDoc(r.document)}</td>
                  <td className="px-4 py-3">{PROVIDERS[r.provider]?.title || r.provider}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{r.status === 'success' ? 'Sucesso' : 'Erro'}</span></td>
                  <td className="px-4 py-3 text-right"><button className={btnGhost} onClick={() => setSelected(r)}>Ver detalhes</button></td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Nenhuma consulta registrada ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      <DetailModal item={selected} profile={selected ? profiles[selected.user_id] : null} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function IntegracoesScreen({ showToast, session }) {
  const [tab, setTab] = useState('integrations');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(null);
  const who = session?.user?.email || 'painel';

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ok } = await supabase.rpc('is_integration_admin');
    setAllowed(!!ok);
    if (ok) {
      const { data, error } = await supabase.from('integrations').select('*').order('kind').order('provider');
      if (error) showToast?.(`Erro ao carregar integrações: ${error.message}`, 'error');
      setRows(data || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const update = async (provider, patch) => {
    const { error } = await supabase.from('integrations').update({ ...patch, updated_at: new Date().toISOString(), updated_by: who }).eq('provider', provider);
    if (error) throw error;
  };

  const handleSave = async (row, { token, settings }) => {
    setSaving(true);
    try {
      await update(row.provider, { settings, ...(token ? { token } : {}) });
      showToast?.('Integração salva.', 'success');
      await load();
    } catch (e) { showToast?.(`Erro ao salvar: ${e.message}`, 'error'); }
    setSaving(false);
  };

  // Consulta CPF/CNPJ: só um provedor fica ativo (desliga o outro antes de ligar).
  const handleActivate = async (row, enabled) => {
    if (enabled && !row.token) { showToast?.('Cadastre o token antes de ativar.', 'warning'); return; }
    setSaving(true);
    try {
      if (enabled && row.kind === 'cpf_lookup') {
        for (const other of rows.filter((r) => r.kind === 'cpf_lookup' && r.provider !== row.provider && r.enabled)) await update(other.provider, { enabled: false });
      }
      await update(row.provider, { enabled });
      showToast?.(enabled ? `${PROVIDERS[row.provider]?.title} ativado.` : `${PROVIDERS[row.provider]?.title} desativado.`, 'success');
      await load();
    } catch (e) { showToast?.(`Erro: ${e.message}`, 'error'); }
    setSaving(false);
  };

  if (allowed === false) {
    return <div className="text-center text-slate-500 py-20">Você não tem acesso ao módulo Integrações.</div>;
  }

  const sms = rows.filter((r) => r.kind === 'sms');
  const lookups = rows.filter((r) => r.kind === 'cpf_lookup');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Integrações</h1>
        <p className="text-sm text-slate-500">Tokens e provedores usados pelo app. O que for salvo aqui passa a valer no app.</p>
      </div>
      <div className="flex gap-6 border-b border-slate-200">
        {[['integrations', 'Integrações'], ['lookups', 'Consultas de CPF/CNPJ']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-3 text-sm font-medium relative ${tab === k ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}{tab === k && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>

      {tab === 'integrations' && (loading ? <p className="text-slate-400">Carregando…</p> : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">SMS</h2>
            <div className="grid gap-4 lg:grid-cols-2">{sms.map((r) => <ProviderCard key={r.provider} row={r} saving={saving} onSave={handleSave} onActivate={handleActivate} />)}</div>
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Consulta de CPF/CNPJ <span className="normal-case font-normal">— só um provedor fica ativo por vez</span></h2>
            <div className="grid gap-4 lg:grid-cols-2">{lookups.map((r) => <ProviderCard key={r.provider} row={r} saving={saving} onSave={handleSave} onActivate={handleActivate} />)}</div>
          </section>
        </>
      ))}
      {tab === 'lookups' && <LookupsTab showToast={showToast} />}
    </div>
  );
}
