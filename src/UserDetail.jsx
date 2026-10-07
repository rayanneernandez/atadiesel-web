// Abas do modal de detalhes do usuário (Gestão de Usuários): resumo, cadastro e dados do CPF/CNPJ.
// "Dados do CPF" mostra a pré-consulta feita no cadastro do app (tabela document_lookups); quem é de
// integration_admins também pode consultar de novo no provedor ativo (gasta saldo do provedor).
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { DataView, adhocLookup, fmtDoc } from './Integracoes';
import { isValidCpf, syncAutonomousStaff } from './LojaAutonoma';

const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
const fmtDate = (s) => (s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtPhone = (v) => {
  const d = onlyDigits(v);
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v;
};

const ORIGINS = { app: 'App Atadiesel', painel: 'Painel web da Atadiesel', aghora: 'Painel web da Aghora' };

// De onde veio o cadastro: coluna signup_source; senão, o log de criação (painel); senão, quem tem tipo de cadastro veio do app.
function signupOrigin(profile, creation) {
  if (profile.signup_source) return ORIGINS[profile.signup_source] || profile.signup_source;
  if (creation) return `Painel web da Atadiesel${creation.user_email ? ` (criado por ${creation.user_email})` : ''}`;
  if (profile.person_type) return ORIGINS.app;
  return null;
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 break-words">{children || '—'}</dd>
    </div>
  );
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';
const maskDoc = (v) => {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return fmtDoc(d);
};
const maskPhone = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

// Cadastro do usuário, com edição. Só aparecem para editar as colunas que existem em profiles.
// O e-mail não é editado aqui (ele é o login e mudaria na conta de acesso, não só no perfil).
function RegisterPanel({ user, onUserUpdated, autoEdit = false }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  const isPj = user.person_type === 'pj' || (!!user.cnpj && !user.cpf);
  const has = (k) => Object.prototype.hasOwnProperty.call(user, k);
  const phoneKey = ['phone', 'mobile', 'whatsapp'].find(has) || 'phone';
  // Funcionário e entregador entram na loja autônoma com CPF + telefone: aqui os dois são obrigatórios
  const isStaff = /^(funcion|entregador|driver)/i.test(user.role || '');

  const start = () => {
    setError('');
    setForm({
      name: user.name || '',
      phone: phoneKey ? maskPhone(user[phoneKey] || '') : '',
      doc: maskDoc((isPj ? user.cnpj : user.cpf) || ''),
      company_name: user.company_name || '',
      person_type: user.person_type || (isPj ? 'pj' : 'pf'),
    });
    setEditing(true);
  };

  useEffect(() => { if (autoEdit) start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) { setError('Informe o nome.'); return; }
    const docDigits = onlyDigits(form.doc);
    const pj = form.person_type === 'pj';
    if (docDigits && docDigits.length !== (pj ? 14 : 11)) { setError(pj ? 'O CNPJ deve ter 14 números.' : 'O CPF deve ter 11 números.'); return; }
    const phoneDigits = onlyDigits(form.phone);
    if (isStaff) {
      if (pj || !isValidCpf(docDigits)) { setError('Para funcionário e entregador, informe um CPF válido.'); return; }
      if (![10, 11].includes(phoneDigits.length)) { setError('Para funcionário e entregador, informe o telefone com DDD.'); return; }
    }
    const patch = { name, updated_at: new Date().toISOString() };
    if (phoneKey) patch[phoneKey] = onlyDigits(form.phone) || null;
    if (has('person_type')) patch.person_type = form.person_type;
    if (pj && has('cnpj')) patch.cnpj = docDigits || null;
    if (!pj && has('cpf')) patch.cpf = docDigits || null;
    if (has('company_name')) patch.company_name = pj ? (form.company_name.trim() || null) : null;
    setBusy(true); setError('');
    let { data, error: err } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single();
    if (err && phoneKey && new RegExp(phoneKey, 'i').test(err.message || '')) {
      delete patch[phoneKey];
      ({ data, error: err } = await supabase.from('profiles').update(patch).eq('id', user.id).select().single());
    }
    setBusy(false);
    if (err) { setError(err.code === '23505' ? 'Já existe outro usuário com esse documento.' : `Não foi possível salvar: ${err.message}`); return; }
    // Funcionário/entregador: mantém também o cadastro da loja autônoma (CPF e telefone) igual ao do usuário
    let staffNote = '';
    if (isStaff) {
      const row = { name, cpf: docDigits, phone: phoneDigits };
      const { data: existing } = await supabase.from('autonomous_staff').select('id').eq('profile_id', user.id).maybeSingle();
      const { error: stErr } = existing
        ? await supabase.from('autonomous_staff').update(row).eq('id', existing.id)
        : await supabase.from('autonomous_staff').insert({ ...row, profile_id: user.id, role_title: /^(entregador|driver)/i.test(user.role || '') ? 'Entregador' : 'Funcionário', active: true });
      if (stErr) staffNote = stErr.code === '23505' ? 'Dados salvos, mas esse CPF já está em outro funcionário da loja autônoma.' : `Dados salvos, mas a loja autônoma não foi atualizada: ${stErr.message}`;
      else staffNote = (await syncAutonomousStaff()).synced ? '' : 'Dados salvos. Falta enviar para a loja autônoma: use Loja Autônoma → Sincronizar.';
    }
    onUserUpdated?.(data, Object.keys(patch).filter((k) => k !== 'updated_at'), staffNote);
    setEditing(false);
  };

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-3 text-sm">
        {error && <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-3">{error}</div>}
        <label className="block font-bold text-slate-700">Nome<input className={`${inputCls} mt-1.5`} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <div className="grid sm:grid-cols-2 gap-3">
          {has('person_type') && (
            <label className="block font-bold text-slate-700">Tipo de cadastro
              <select className={`${inputCls} mt-1.5`} value={form.person_type} onChange={(e) => setForm({ ...form, person_type: e.target.value, doc: '' })}>
                <option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option>
              </select>
            </label>
          )}
          <label className="block font-bold text-slate-700">{form.person_type === 'pj' ? 'CNPJ' : 'CPF'}
            <input className={`${inputCls} mt-1.5`} inputMode="numeric" value={form.doc} onChange={(e) => setForm({ ...form, doc: maskDoc(e.target.value) })} placeholder={form.person_type === 'pj' ? '00.000.000/0000-00' : '000.000.000-00'} />
          </label>
          {phoneKey && <label className="block font-bold text-slate-700">Telefone<input className={`${inputCls} mt-1.5`} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(11) 91234-5678" /></label>}
          {form.person_type === 'pj' && has('company_name') && <label className="block font-bold text-slate-700">Razão social<input className={`${inputCls} mt-1.5`} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>}
        </div>
        <p className="text-xs text-slate-400">O e-mail ({user.email}) não é editado aqui.{isStaff ? ' Funcionário e entregador precisam de CPF e telefone para entrar na loja autônoma.' : ''}</p>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => setEditing(false)}>Cancelar</button>
          <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    );
  }

  const doc = user.cpf || user.cnpj;
  return (
    <div className="space-y-4">
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Field label="Nome">{user.name}</Field>
        <Field label="E-mail">{user.email}</Field>
        <Field label="Telefone">{fmtPhone(user.phone || user.mobile || user.whatsapp)}</Field>
        <Field label={isPj ? 'CNPJ' : 'CPF'}>{doc ? fmtDoc(doc) : null}</Field>
        <Field label="Tipo de cadastro">{user.person_type === 'pj' ? 'Pessoa jurídica' : user.person_type === 'pf' ? 'Pessoa física' : null}</Field>
        <Field label="Razão social">{user.company_name}</Field>
        <Field label="Cadastrado em">{user._created_at ? fmtDate(user._created_at) : null}</Field>
        <Field label="Origem do cadastro">{user._origin || 'Não identificada'}</Field>
      </dl>
      <div className="flex justify-end"><button className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50" onClick={start}>Editar dados</button></div>
    </div>
  );
}

function CpfPanel({ user }) {
  const document = onlyDigits(user.cpf || user.cnpj);
  const [loading, setLoading] = useState(true);
  const [lookup, setLookup] = useState(null);      // última consulta bem-sucedida guardada
  const [lastError, setLastError] = useState('');
  const [fresh, setFresh] = useState(null);        // resultado de uma consulta feita agora
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [provider, setProvider] = useState(null);
  const [canQuery, setCanQuery] = useState(false);

  const load = useCallback(async () => {
    if (!document) { setLoading(false); return; }
    setLoading(true);
    const [{ data: ok }, { data: rows }, { data: prov }] = await Promise.all([
      supabase.rpc('is_integration_admin'),
      supabase.from('document_lookups').select('*').eq('document', document).order('created_at', { ascending: false }).limit(10),
      supabase.from('integrations').select('provider').eq('kind', 'cpf_lookup').eq('enabled', true).maybeSingle(),
    ]);
    setCanQuery(!!ok);
    setProvider(prov?.provider || null);
    setLookup((rows || []).find((r) => r.status === 'success') || null);
    setLastError(!(rows || []).some((r) => r.status === 'success') && rows?.[0]?.error ? rows[0].error : '');
    setLoading(false);
  }, [document]);

  useEffect(() => { setFresh(null); setError(''); load(); }, [load]);

  const needsBirth = provider === 'infosimples' && document.length === 11;

  const run = async () => {
    setBusy(true); setError('');
    try {
      setFresh(await adhocLookup(document, needsBirth ? birthdate : null));
      load();
    } catch (e) { setError(e.message || 'Falha ao consultar'); }
    setBusy(false);
  };

  if (!document) return <p className="text-sm text-slate-500">Este usuário não tem CPF/CNPJ cadastrado.</p>;
  if (loading) return <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" /></div>;

  const shown = fresh ? { data: fresh.data, when: new Date().toISOString(), provider: fresh.provider } : lookup ? { data: lookup.result, when: lookup.created_at, provider: lookup.provider } : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">
          {user.cnpj && !user.cpf ? 'CNPJ' : 'CPF'}: <span className="font-medium text-slate-800">{fmtDoc(document)}</span>
          {shown && <span className="block text-xs text-slate-400">Consultado em {fmtDate(shown.when)} · {shown.provider === 'dabra' ? 'Dabra' : shown.provider === 'infosimples' ? 'Infosimples' : shown.provider}</span>}
        </div>
        {canQuery && (
          <div className="flex items-end gap-2">
            {needsBirth && <input type="date" className="border border-slate-200 rounded-xl px-3 py-2 text-sm" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} title="Data de nascimento (exigida pela Infosimples)" />}
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={busy || !provider || (needsBirth && !birthdate)} onClick={run}>
              {busy ? 'Consultando…' : shown ? 'Consultar de novo' : 'Consultar agora'}
            </button>
          </div>
        )}
      </div>
      {canQuery && !provider && <p className="text-xs text-amber-600">Nenhum provedor ativo. Ative a Dabra ou a Infosimples em Integrações.</p>}
      {canQuery && shown && <p className="text-xs text-slate-400">Consultar de novo gasta saldo do provedor.</p>}
      {error && <div className="text-sm bg-red-50 border border-red-100 text-red-700 rounded-xl p-3">{error}</div>}
      {!shown && lastError && <div className="text-sm bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3">A última consulta falhou: {lastError}</div>}
      {shown?.data
        ? <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-[45vh] overflow-y-auto"><DataView data={shown.data} /></div>
        : !lastError && <p className="text-sm text-slate-500">{canQuery ? 'Ainda não há consulta registrada para este documento.' : 'Sem consulta registrada, ou você não tem acesso aos dados de consulta.'}</p>}
    </div>
  );
}

export default function UserDetailTabs({ user: baseUser, summary, onUserUpdated, initialTab = 'resumo', startEditing = false }) {
  const [tab, setTab] = useState(initialTab);
  const [staff, setStaff] = useState(null);
  const [creation, setCreation] = useState(null); // registro de criação no log (quando o usuário foi criado pelo painel)
  useEffect(() => setTab(initialTab), [baseUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Funcionário/entregador: CPF e telefone podem estar só no cadastro da Loja Autônoma (autonomous_staff).
  // Mostra esses dados também aqui, para o cadastro do usuário não aparecer vazio.
  useEffect(() => {
    let alive = true;
    setStaff(null);
    supabase.from('autonomous_staff').select('cpf, phone').eq('profile_id', baseUser.id).maybeSingle()
      .then(({ data }) => { if (alive) setStaff(data || null); });
    return () => { alive = false; };
  }, [baseUser.id]);

  useEffect(() => {
    let alive = true;
    setCreation(null);
    if (!baseUser.email) return undefined;
    supabase.from('audit_logs').select('created_at, user_email').eq('action_type', 'USER_CHANGE').eq('details->>action', 'create_user')
      .ilike('details->>email', baseUser.email).order('created_at', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { if (alive) setCreation(data || null); });
    return () => { alive = false; };
  }, [baseUser.email]);

  const user = {
    ...baseUser,
    _created_at: baseUser.created_at || creation?.created_at || null,
    _origin: signupOrigin(baseUser, creation),
    cpf: baseUser.cpf || staff?.cpf || baseUser.cpf,
    phone: baseUser.phone || baseUser.mobile || baseUser.whatsapp || staff?.phone || baseUser.phone,
  };

  const tabs = [['resumo', 'Resumo'], ['cadastro', 'Cadastro'], ['cpf', 'Dados do CPF/CNPJ']];
  return (
    <div>
      <div className="flex gap-5 border-b border-slate-200 mb-5">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`pb-2.5 text-sm font-medium relative ${tab === k ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}{tab === k && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
        ))}
      </div>
      {tab === 'resumo' && summary}
      {tab === 'cadastro' && <RegisterPanel key={`${user.id}-${staff ? 's' : 'n'}`} user={user} onUserUpdated={onUserUpdated} autoEdit={startEditing} />}
      {tab === 'cpf' && <CpfPanel user={user} />}
    </div>
  );
}
