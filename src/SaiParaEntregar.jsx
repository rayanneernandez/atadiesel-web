// Botão "Saí para entregar" (Entregas > Controle de Entregas).
// Quem fica no estoque é o mesmo que entrega: ao sair, escolhe quais pedidos levou. Eles passam de
// "Preparando pedido" para "Saiu para entrega" e, se quiser, as retiradas são pausadas pelo mesmo tempo.
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Truck, X, PauseCircle } from 'lucide-react';
import { supabase } from './supabaseClient';
import { iniciarPausa, PAUSE_OPTIONS, DEFAULT_MINUTES, minLabel, hhmm } from './PausaRetirada';

export default function SaiParaEntregar({ orders = [], session, canPause = false, logAction, showToast, onDone, formatNumber }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [pause, setPause] = useState(true);
  const [busy, setBusy] = useState(false);

  const ids = useMemo(() => orders.map((o) => o.id), [orders]);

  const openModal = () => {
    setSelected(new Set(ids)); // todos marcados; dá para desmarcar o que ficou
    setMinutes(DEFAULT_MINUTES);
    setPause(canPause);
    setOpen(true);
  };
  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const confirm = async () => {
    const chosen = orders.filter((o) => selected.has(o.id));
    if (chosen.length === 0) return showToast?.('Marque ao menos um pedido que saiu para entrega.', 'warning');
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('orders').update({ status: 'out_for_delivery', updated_at: now }).in('id', chosen.map((o) => o.id));
    if (error) {
      setBusy(false);
      return showToast?.('Não foi possível atualizar os pedidos: ' + error.message, 'error');
    }
    let pauseMsg = '';
    let until = null;
    if (pause && canPause) {
      const r = await iniciarPausa({ session, minutes });
      if (r.error) pauseMsg = ' As retiradas NÃO foram pausadas: ' + (/row-level security|permission/i.test(r.error.message) ? 'sem permissão' : r.error.message);
      else until = r.until;
    } else if (pause && !canPause) {
      pauseMsg = ' As retiradas não foram pausadas (você não tem a permissão "Pausar Retirada").';
    }
    logAction?.('SETTINGS_CHANGE', 'Saída para entrega', {
      changes: [
        ...chosen.map((o) => ({ field: `Pedido #${formatNumber ? formatNumber(o) : o.id}`, old: 'Preparando pedido', new: 'Saiu para entrega' })),
        ...(until ? [{ field: 'Retiradas', old: 'normais', new: `pausadas por ${minLabel(minutes)} (voltam às ${hhmm(until)})` }] : []),
      ],
    });
    setBusy(false);
    setOpen(false);
    showToast?.(
      `${chosen.length} pedido(s) saíram para entrega.` +
        (until ? ` Retiradas pausadas até ${hhmm(until)}. Ao voltar, clique em "Retomar retiradas".` : pauseMsg),
      pauseMsg && !until ? 'warning' : 'success'
    );
    onDone?.();
  };

  return (
    <>
      <button
        onClick={openModal}
        disabled={orders.length === 0}
        title={orders.length === 0 ? 'Nenhum pedido de entrega em "Preparando pedido"' : ''}
        className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-sm"
      >
        <Truck size={18} /> Saí para entregar
        {orders.length > 0 && <span className="bg-white/25 rounded-full px-2 text-xs">{orders.length}</span>}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 p-6 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Saí para entregar</h3>
                <p className="text-sm text-slate-500 mt-1">Marque os pedidos que você está levando agora. Eles passam para "Saiu para entrega".</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 overflow-y-auto space-y-2 flex-1 min-h-0">
              {orders.map((o) => (
                <label key={o.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${selected.has(o.id) ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200'}`}>
                  <input type="checkbox" className="mt-1" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-slate-800 text-sm">
                      Pedido #{formatNumber ? formatNumber(o) : o.id} · {o.client}
                    </span>
                    <span className="block text-xs text-slate-500 break-words">{o.fullAddress}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="p-6 pt-4 space-y-3 border-t border-slate-100 mt-3">
              <label className={`flex items-center gap-2 text-sm font-medium ${canPause ? 'text-slate-700 cursor-pointer' : 'text-slate-400'}`}>
                <input type="checkbox" checked={pause && canPause} disabled={!canPause} onChange={(e) => setPause(e.target.checked)} />
                <PauseCircle size={16} /> Pausar as retiradas enquanto estiver fora
              </label>
              {!canPause && <p className="text-xs text-amber-700">Você não tem a permissão "Pausar Retirada": só os status serão alterados.</p>}
              {pause && canPause && (
                <div className="grid grid-cols-3 gap-2">
                  {PAUSE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(m)}
                      className={`rounded-xl border-2 py-2.5 font-bold text-sm transition-colors ${
                        minutes === m ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {minLabel(m)}
                      {m === DEFAULT_MINUTES ? <span className="block text-[11px] font-medium opacity-70">padrão</span> : null}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={confirm} disabled={busy || selected.size === 0} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60">
                  {busy ? 'Salvando...' : `Confirmar saída (${selected.size})`}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
