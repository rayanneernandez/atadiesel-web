// "Pausar retiradas": quem fica no estoque também faz as entregas. Ao sair para entregar, clica em "Pausar retiradas".
// Enquanto estiver pausado, os horários de retirada que caem no período da pausa ficam indisponíveis no app
// (o servidor também recusa pedido novo nesses horários). Retiradas JÁ agendadas não são canceladas.
// A pausa expira sozinha no fim do tempo; se o entregador voltar antes, é só clicar em "Retomar retiradas".
// SQL: pausa_retirada.sql (tabela delivery_pause). Permissão: módulo "Pausar Retirada" em Usuários > Permissões.
import React, { useCallback, useEffect, useState } from 'react';
import { PauseCircle, PlayCircle, Truck, X, AlertTriangle } from 'lucide-react';
import { supabase } from './supabaseClient';

const OPTIONS = [60, 90, 120];
const DEFAULT_MINUTES = 90;
const SQL_MSG = "Falta rodar o arquivo 'pausa_retirada.sql' no Supabase (SQL Editor).";
const NO_PERM_MSG = 'Você não tem permissão para pausar as retiradas';
const INACTIVE = '(cancelled,canceled,payment_failed)';

const hhmm = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const leftLabel = (iso, now) => {
  const min = Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};
const minLabel = (m) => (m % 60 === 0 ? `${m / 60}h` : m > 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`);

/** Inicia a pausa de retiradas (usada pelo botão "Pausar retiradas" e pelo "Saí para entregar"). Devolve { error, until }. */
export async function iniciarPausa({ session, minutes = DEFAULT_MINUTES }) {
  const start = new Date();
  const until = new Date(start.getTime() + minutes * 60000);
  const { error } = await supabase.from('delivery_pause').upsert({
    id: 1,
    active: true,
    started_at: start.toISOString(),
    until: until.toISOString(),
    minutes,
    started_by: session?.user?.id ?? null,
    updated_at: start.toISOString(),
  });
  return { error, until };
}
export { OPTIONS as PAUSE_OPTIONS, DEFAULT_MINUTES, minLabel, hhmm };

/** Quantas retiradas já agendadas encostam no período [fromIso, untilIso). Só informativo: elas continuam valendo. */
async function countScheduled(fromIso, untilIso) {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('delivery', 'loja')
    .not('status', 'in', INACTIVE)
    .lt('pickup_at', untilIso)
    .gt('pickup_until', fromIso);
  return error ? null : count ?? 0;
}

export default function PausaRetirada({ session, canPause = false, logAction, showToast }) {
  const [row, setRow] = useState(null);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [scheduled, setScheduled] = useState(null);
  const [modal, setModal] = useState(false);
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('delivery_pause').select('*').eq('id', 1).maybeSingle();
    if (error) {
      setMissing(true);
      setRow(null);
    } else {
      setMissing(false);
      setRow(data ?? null);
    }
    setLoaded(true);
  }, []);

  // atualiza a cada 20 s (dois computadores abertos enxergam a mesma pausa) e a contagem regressiva a cada 15 s
  useEffect(() => {
    load();
    const a = setInterval(load, 20000);
    const b = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [load]);

  const active = !!(row?.active && row?.until && new Date(row.until).getTime() > now);

  // retiradas já agendadas dentro da pausa ativa
  useEffect(() => {
    let alive = true;
    if (!active) {
      setScheduled(null);
      return undefined;
    }
    countScheduled(row.started_at || new Date().toISOString(), row.until).then((n) => alive && setScheduled(n));
    return () => {
      alive = false;
    };
  }, [active, row?.started_at, row?.until]);

  // prévia no modal: quantas retiradas já marcadas caem na pausa que está para começar
  useEffect(() => {
    let alive = true;
    if (!modal) return undefined;
    setPreview(null);
    const from = new Date();
    countScheduled(from.toISOString(), new Date(from.getTime() + minutes * 60000).toISOString()).then((n) => alive && setPreview(n));
    return () => {
      alive = false;
    };
  }, [modal, minutes]);

  const pause = async () => {
    if (!canPause) return showToast?.(NO_PERM_MSG, 'warning');
    setBusy(true);
    const start = new Date();
    const until = new Date(start.getTime() + minutes * 60000);
    const { error } = await supabase.from('delivery_pause').upsert({
      id: 1,
      active: true,
      started_at: start.toISOString(),
      until: until.toISOString(),
      minutes,
      started_by: session?.user?.id ?? null,
      updated_at: start.toISOString(),
    });
    setBusy(false);
    if (error) {
      showToast?.(/row-level security|permission/i.test(error.message) ? NO_PERM_MSG : `Não foi possível pausar: ${error.message}`, 'error');
      return;
    }
    setModal(false);
    showToast?.(`Retiradas pausadas. Voltam às ${hhmm(until)}.`, 'success');
    logAction?.('SETTINGS_CHANGE', 'Pausa de retiradas', {
      changes: [{ field: 'Retiradas', old: 'normais', new: `pausadas por ${minLabel(minutes)} (voltam às ${hhmm(until)})` }],
    });
    load();
  };

  const resume = async () => {
    if (!canPause) return showToast?.(NO_PERM_MSG, 'warning');
    setBusy(true);
    const t = new Date().toISOString();
    const { error } = await supabase.from('delivery_pause').update({ active: false, until: t, updated_at: t }).eq('id', 1);
    setBusy(false);
    if (error) {
      showToast?.(/row-level security|permission/i.test(error.message) ? NO_PERM_MSG : `Não foi possível retomar: ${error.message}`, 'error');
      return;
    }
    showToast?.('Retiradas retomadas. Os horários já voltaram a aparecer no app.', 'success');
    logAction?.('SETTINGS_CHANGE', 'Pausa de retiradas', { changes: [{ field: 'Retiradas', old: 'pausadas', new: 'retomadas' }] });
    load();
  };

  if (!loaded) return null;
  if (missing) {
    return canPause ? (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
        <AlertTriangle size={16} className="shrink-0" /> {SQL_MSG}
      </div>
    ) : null;
  }
  if (!active && !canPause) return null;

  return (
    <>
      {active ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Truck className="text-amber-700" size={22} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="font-bold text-amber-900">Retiradas pausadas: entrega em andamento</p>
            <p className="text-sm text-amber-800">
              Voltam às <b>{hhmm(row.until)}</b> (faltam {leftLabel(row.until, now)}). Nesse período o app não oferece horários de retirada.
              {scheduled != null && scheduled > 0 ? (
                <> Já existem <b>{scheduled}</b> retirada(s) agendada(s) dentro da pausa. Elas continuam valendo e <b>não são canceladas</b>.</>
              ) : scheduled === 0 ? (
                <> Nenhuma retirada agendada cai dentro da pausa.</>
              ) : null}
            </p>
          </div>
          {canPause && (
            <button
              onClick={resume}
              disabled={busy}
              className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <PlayCircle size={18} /> {busy ? 'Retomando...' : 'Retomar retiradas'}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Truck className="text-slate-500" size={22} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="font-bold text-slate-800">Saindo para entregar?</p>
            <p className="text-sm text-slate-500">Pause as retiradas: o app deixa de oferecer horários enquanto você estiver fora e eles voltam sozinhos no fim do tempo.</p>
          </div>
          <button
            onClick={() => {
              setMinutes(DEFAULT_MINUTES);
              setModal(true);
            }}
            className="bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-600 inline-flex items-center gap-2"
          >
            <PauseCircle size={18} /> Pausar retiradas
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Pausar retiradas</h3>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Por quanto tempo você vai ficar fora? Os horários de retirada desse período somem do app e voltam depois. Se chegar antes, é só retomar.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`rounded-xl border-2 py-3 font-bold text-sm transition-colors ${
                    minutes === m ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {minLabel(m)}
                  {m === DEFAULT_MINUTES ? <span className="block text-[11px] font-medium opacity-70">padrão</span> : null}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-700">
              Voltam às <b>{hhmm(new Date(Date.now() + minutes * 60000))}</b>.
            </p>
            {preview != null && preview > 0 && (
              <p className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600">
                Já existem <b>{preview}</b> retirada(s) agendada(s) nesse período. Elas <b>não são canceladas</b>; a pausa só impede novos agendamentos.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModal(false)} disabled={busy} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={pause} disabled={busy} className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-60">
                {busy ? 'Pausando...' : 'Pausar retiradas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
