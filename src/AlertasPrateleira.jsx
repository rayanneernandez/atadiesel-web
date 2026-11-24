// Tela "Produtos fora do lugar": alertas da visão da loja (produto achado na posição errada da prateleira).
// Os alertas vêm do servidor (rota /shelf-alerts), que faz o login no portal da loja.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ImageOff } from 'lucide-react';
import { supabase } from './supabaseClient';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://atadiesel-main.onrender.com';
const fmt = (s) => (s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');

export async function shelfFetch(path, init = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch(`${BACKEND}/shelf-alerts${path}`, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  return res;
}

const STATUS_TABS = [
  { id: 'aberto', label: 'Abertos' },
  { id: 'resolvido', label: 'Arrumados' },
  { id: 'sumiu', label: 'Sumiram' },
  { id: 'todos', label: 'Todos' },
];
const STATUS_BADGE = {
  aberto: 'bg-red-100 text-red-700',
  resolvido: 'bg-emerald-100 text-emerald-700',
  sumiu: 'bg-slate-100 text-slate-600',
};
const STATUS_LABEL = { aberto: 'Aberto', resolvido: 'Arrumado', sumiu: 'Sumiu' };
const KIND_LABEL = { varredura: 'Varredura', mexida: 'Mexida na hora' };

// Foto do alerta: a rota pede login, então baixa como arquivo e mostra.
function AlertPhoto({ id }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let made = null;
    (async () => {
      try {
        const r = await shelfFetch(`/${encodeURIComponent(id)}/foto`);
        if (!r.ok) throw new Error('sem foto');
        made = URL.createObjectURL(await r.blob());
        if (alive) setUrl(made);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [id]);
  if (failed) return <div className="h-40 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs gap-1"><ImageOff size={20} />Sem foto</div>;
  if (!url) return <div className="h-40 bg-slate-100 animate-pulse" />;
  return <img src={url} alt="Posição vista de cima" className="h-40 w-full object-contain bg-slate-50" />;
}

export default function AlertasPrateleiraScreen({ showToast }) {
  const [status, setStatus] = useState('aberto');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await shelfFetch(`?status=${statusRef.current}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `Erro ${r.status}`);
      setRows(Array.isArray(j) ? j : []);
      setError('');
    } catch (e) {
      setError(e.message || 'Não foi possível carregar os alertas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [status, load]);
  useEffect(() => {
    const t = setInterval(() => load(true), 60_000); // atualiza sozinho a cada 1 minuto
    return () => clearInterval(t);
  }, [load]);

  const resolve = async (a) => {
    setBusyId(a.alert_id);
    try {
      const r = await shelfFetch(`/${encodeURIComponent(a.alert_id)}/resolve`, { method: 'POST' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `Erro ${r.status}`);
      showToast?.('Marcado como arrumado.', 'success');
      load(true);
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-parkinsans">Produtos fora do lugar</h1>
          <p className="text-sm text-slate-500 mt-1">A câmera da loja avisa quando acha um produto na posição de outro. Arrume e marque como arrumado.</p>
        </div>
        <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button key={t.id} onClick={() => setStatus(t.id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${status === t.id ? 'bg-white text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5 shrink-0" />{error}</div>}

      {!error && loading && rows.length === 0 && <p className="text-sm text-slate-400">Carregando…</p>}
      {!error && !loading && rows.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-slate-500">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
          {status === 'aberto' ? 'Nenhum produto fora do lugar agora. Tudo certo!' : 'Nenhum alerta nesta lista.'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((a) => (
          <div key={a.alert_id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {a.has_photo ? <AlertPhoto id={a.alert_id} /> : <div className="h-40 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs gap-1"><ImageOff size={20} />Sem foto</div>}
            <div className="p-4 flex-1 flex flex-col gap-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-900 leading-snug">{a.slot_label}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[a.status] || 'bg-slate-100 text-slate-600'}`}>{STATUS_LABEL[a.status] || a.status}</span>
              </div>
              <p className="text-slate-600"><span className="text-slate-400">Deveria estar aqui: </span>{a.expected_product || '—'}</p>
              <p className="text-slate-600"><span className="text-slate-400">Encontrado: </span>{a.found_product || a.found_description || 'não identificado'}</p>
              {a.belongs_to && <p className="text-slate-600"><span className="text-slate-400">É da posição: </span>{a.belongs_to}</p>}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                <span>{KIND_LABEL[a.source] || a.source}</span>
                {a.confidence != null && <span>Certeza {Math.round(Number(a.confidence) * 100)}%</span>}
                <span>Visto {a.seen_count}x</span>
                <span>Câmera {a.camera_id}</span>
              </div>
              <div className="text-xs text-slate-400">Aberto em {fmt(a.created_at)} · visto por último {fmt(a.last_seen_at)}{a.resolved_at ? ` · arrumado em ${fmt(a.resolved_at)}${a.resolved_by ? ` por ${a.resolved_by}` : ''}` : ''}</div>
              {a.status === 'aberto' && (
                <button onClick={() => resolve(a)} disabled={busyId === a.alert_id} className="mt-2 w-full bg-primary text-white font-bold py-2 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60">
                  {busyId === a.alert_id ? 'Marcando…' : 'Marcar como arrumado'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
