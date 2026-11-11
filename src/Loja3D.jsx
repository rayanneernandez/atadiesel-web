// Aba "Loja 3D" do Mapa da Loja: maquete 3D da loja com a foto real de cada gôndola e prateleira.
// Carregada sob demanda (o Three.js só baixa quando a aba é aberta). A cena fica em loja3dScene.js.
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildScene } from './loja3dScene';
import { FOTOS_3D } from './mapa3dFotos';

const VIEWS = [
  ['geral', 'Vista geral'],
  ['entrada', 'Entrada'],
  ['superior', 'De cima'],
  ['interno', 'Caminhar'],
];
const LAYERS = [
  ['photos', 'Fotos'],
  ['labels', 'Rótulos'],
  ['walls', 'Paredes'],
];

export default function Loja3D({ regions, highlight, onPick }) {
  const hostRef = useRef(null);
  const modelRef = useRef(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const [view, setView] = useState('geral');
  const [layers, setLayers] = useState({ photos: true, labels: true, walls: true });
  const [error, setError] = useState('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let model = null;
    try {
      model = buildScene(THREE, host, { regions, fotos: FOTOS_3D, onPick: (r) => pickRef.current?.(r), onView: setView });
      modelRef.current = model;
    } catch (e) {
      console.error('Loja 3D:', e);
      setError('Não foi possível iniciar a visualização 3D neste navegador.');
    }
    return () => {
      model?.dispose();
      modelRef.current = null;
    };
  }, [regions]);

  useEffect(() => {
    modelRef.current?.setHighlight(highlight?.sector || null, highlight?.level || null, highlight?.pos || null);
  }, [highlight?.sector, highlight?.level, highlight?.pos, regions]);

  useEffect(() => {
    const m = modelRef.current;
    if (!m) return;
    Object.entries(layers).forEach(([k, on]) => m.setLayerVisible(k, on));
  }, [layers, regions]);

  const choose = (v) => {
    setView(v);
    modelRef.current?.preset(v);
  };

  const btn = (on) => `px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${on ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map(([k, label]) => <button key={k} onClick={() => choose(k)} className={btn(view === k)}>{label}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 mr-1">Mostrar</span>
          {LAYERS.map(([k, label]) => (
            <button key={k} onClick={() => setLayers((s) => ({ ...s, [k]: !s[k] }))} className={btn(layers[k])} aria-pressed={layers[k]}>{label}</button>
          ))}
        </div>
      </div>

      <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-200 h-[62vh] min-h-[340px]">
        <div ref={hostRef} className="absolute inset-0" />
        {error && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-600 bg-white/90">{error}</div>}
      </div>

      <p className="text-xs text-slate-400">
        {view === 'interno'
          ? 'Caminhar: use W A S D ou as setas para andar (Shift corre) e arraste para olhar em volta.'
          : 'Arraste para girar, role para aproximar e clique numa gôndola ou prateleira para ver os produtos dela. As fotos são dos móveis reais.'}
      </p>
    </div>
  );
}
