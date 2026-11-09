// Faixa de aviso no topo do painel quando a integração com o ERP (Viasoft) não está funcionando.
// Lê o estado que a sincronização grava (erp_sync_state) e a última venda importada (erp_sales).
// Aparece sozinha e some sozinha quando volta ao normal. Não depende da função do ERP estar no ar.
//
// Avisa quando:
//  - a última rodada teve erro em 2 ou mais etapas (cadastro, estoque, preço, vendas): um erro isolado é ignorado;
//  - ou a sincronização não roda há mais de 20 minutos (o agendamento parou).
import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from './supabaseClient';

const fmt = (s) => (s ? new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'nunca');
const STALE_MS = 20 * 60_000;

export default function ErpAlerta() {
  const [state, setState] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from('erp_sync_state').select('last_run_at, last_result').eq('id', 1).maybeSingle();
      // quem não tem acesso às vendas só não vê esta linha
      const { data: sale } = await supabase.from('erp_sales').select('synced_at').order('synced_at', { ascending: false }).limit(1).maybeSingle();
      if (!alive) return;
      setState(data || null);
      setLastSale(sale?.synced_at || null);
    };
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!state) return null;
  const erros = Array.isArray(state.last_result?.erros) ? state.last_result.erros : [];
  const parado = state.last_run_at ? Date.now() - new Date(state.last_run_at).getTime() > STALE_MS : false;
  if (erros.length < 2 && !parado) return null;

  return (
    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 p-4 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="shrink-0 mt-0.5 text-red-600" />
        <div className="flex-1 min-w-0">
          <p className="font-bold">
            {erros.length >= 2 ? 'A integração com o ERP (Viasoft) está com erro.' : 'A sincronização com o ERP (Viasoft) parou.'}
          </p>
          <p className="mt-0.5">
            Preços, estoque e vendas do ERP podem estar <b>desatualizados</b>. Última tentativa: {fmt(state.last_run_at)}.
            {lastSale ? ` Última venda do ERP importada: ${fmt(lastSale)}.` : ''} Avise a Viasoft e o responsável pelo sistema.
          </p>
          {erros.length > 0 && (
            <>
              <button type="button" onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline">
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {open ? 'Ocultar detalhes' : 'Ver detalhes do erro'}
              </button>
              {open && (
                <ul className="mt-2 space-y-1 text-xs font-mono break-words">
                  {erros.map((e, i) => <li key={i}>{String(e).slice(0, 240)}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
