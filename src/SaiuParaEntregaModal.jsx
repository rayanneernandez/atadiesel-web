// Confirmação do botão "Saiu para entrega" no card de cada entrega (Entregas > Controle de Entregas).
// Ao confirmar: o pedido passa para "Saiu para entrega" e, se quiser, as retiradas ficam pausadas
// (quem fica no estoque é o mesmo que entrega). Se as retiradas já estão pausadas (outra entrega da mesma saída), só muda o status.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Truck, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import { iniciarPausa, PAUSE_OPTIONS, DEFAULT_MINUTES, minLabel, hhmm } from './PausaRetirada';

export default function SaiuParaEntregaModal({ target, number, session, canPause = false, onUpdateStatus, logAction, showToast, onClose }) {
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [pause, setPause] = useState(canPause);
  const [already, setAlready] = useState(null); // fim da pausa que já está ativa (ISO) ou null
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('delivery_pause').select('active, until').eq('id', 1).maybeSingle();
      if (!alive) return;
      if (!error && data?.active && data?.until && new Date(data.until).getTime() > Date.now()) setAlready(data.until);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!target) return null;

  const confirm = async () => {
    setBusy(true);
    try {
      await onUpdateStatus(target.id, 'Em Trânsito');
    } catch (e) {
      setBusy(false);
      return showToast?.('Não foi possível atualizar o pedido: ' + (e?.message || e), 'error');
    }
    let until = null;
    let pauseMsg = '';
    if (!already && pause && canPause) {
      const r = await iniciarPausa({ session, minutes });
      if (r.error) pauseMsg = ' As retiradas NÃO foram pausadas: ' + (/row-level security|permission/i.test(r.error.message) ? 'sem permissão.' : r.error.message);
      else until = r.until;
    }
    if (until) {
      logAction?.('SETTINGS_CHANGE', 'Saída para entrega', {
        changes: [{ field: 'Retiradas', old: 'normais', new: `pausadas por ${minLabel(minutes)} (voltam às ${hhmm(until)})` }],
      });
    }
    setBusy(false);
    onClose?.();
    showToast?.(
      until
        ? `Pedido #${number} saiu para entrega. Retiradas pausadas até ${hhmm(until)}. Ao voltar, clique em "Retomar retiradas".`
        : `Pedido #${number} saiu para entrega.${already ? ' As retiradas já estavam pausadas.' : ''}${pauseMsg}`,
      pauseMsg ? 'warning' : 'success'
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !busy && onClose?.()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Truck size={20} className="text-primary" /> Saiu para entrega</h3>
          <button onClick={() => !busy && onClose?.()} className="text-slate-400 hover:text-slate-600 p-1 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            O pedido <b>#{number}</b>{target.client ? <> de <b>{target.client}</b></> : null} passa para <b>Saiu para entrega</b>.
          </p>

          {!loaded ? (
            <p className="text-xs text-slate-400">Verificando as retiradas...</p>
          ) : already ? (
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">As retiradas já estão pausadas até <b>{hhmm(already)}</b>. Só o status do pedido será atualizado.</p>
          ) : canPause ? (
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={pause} onChange={(e) => setPause(e.target.checked)} />
                <span>Pausar as retiradas enquanto estiver fora<span className="block text-xs font-normal text-slate-500">O app deixa de oferecer horários de retirada nesse período. Retiradas já agendadas não são canceladas.</span></span>
              </label>
              {pause && (
                <div className="flex flex-wrap gap-2">
                  {PAUSE_OPTIONS.map((m) => (
                    <button key={m} type="button" onClick={() => setMinutes(m)} className={`px-4 py-2 rounded-lg text-sm font-semibold border ${minutes === m ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                      {minLabel(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Você não tem a permissão "Pausar Retirada", então só o status do pedido será atualizado.</p>
          )}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={() => onClose?.()} disabled={busy} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
          <button onClick={confirm} disabled={busy || !loaded} className="flex-1 bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-60">{busy ? 'Salvando...' : 'Confirmar saída'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
