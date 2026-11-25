// Aba "Configuração" da Loja Autônoma: identidade visual que o cliente final vê ao ler o QR da loja
// (cor, logo, como o logo aparece, fundo claro/escuro, nome e mensagem de boas-vindas).
// Fala com a Edge Function "loja-autonoma-marca" (que guarda a chave da loja autônoma).
import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const DEFAULT_COLOR = '#210A94';
const MAX_CHARS = 440_000;

async function callMarca(action, extra = {}) {
  const { data, error } = await supabase.functions.invoke('loja-autonoma-marca', { body: { action, ...extra } });
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
const label = 'block text-sm font-medium text-slate-700 mb-1';
const hint = 'text-xs text-slate-500 mt-1';

const readAsDataUrl = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(new Error('Não consegui ler o arquivo.'));
  r.readAsDataURL(file);
});

// PNG/JPG/WEBP são reduzidos a 480 px (mantém o fundo transparente); SVG fica como está.
async function fileToLogo(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Arquivo grande demais. Use uma imagem de até 5 MB.');
  if (file.type === 'image/svg+xml') {
    const url = await readAsDataUrl(file);
    if (url.length > MAX_CHARS) throw new Error('SVG grande demais. Simplifique ou use PNG.');
    return url;
  }
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use PNG, JPG, WEBP ou SVG.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const [type, q] of [['image/png'], ['image/webp', 0.9], ['image/webp', 0.7]]) {
    const url = canvas.toDataURL(type, q);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error('A imagem continua grande demais. Use uma menor.');
}

// Logo majoritariamente claro (ex.: branco)? Então fica melhor direto sobre a cor, não num cartão branco.
async function isLightLogo(dataUrl) {
  try {
    if (dataUrl.startsWith('data:image/svg')) return false;
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const c = document.createElement('canvas');
    c.width = 64; c.height = Math.max(1, Math.round((64 * img.height) / img.width));
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, c.width, c.height);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0; let n = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 40) { sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; n++; }
    return n > 0 && sum / n > 0.8;
  } catch { return false; }
}

function onColor(hex) {
  const n = parseInt((hex || DEFAULT_COLOR).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#1B1B1B' : '#FFFFFF';
}

function Preview({ color, logo, logoStyle, name, welcome, dark }) {
  return (
    <div className="mx-auto w-full max-w-[260px] overflow-hidden rounded-[28px] border-4 border-slate-800 shadow-lg" style={{ background: dark ? '#1B1B1B' : '#F5F5F4' }}>
      <div className="px-4 pb-4 pt-5 text-center" style={{ background: color, color: onColor(color), borderRadius: '0 0 22px 22px' }}>
        {logo && (logoStyle === 'direct'
          ? <img src={logo} alt="" className="mx-auto h-8 w-auto max-w-[150px] object-contain" />
          : <span className="inline-flex rounded-xl bg-white px-2 py-1"><img src={logo} alt="" className="h-8 w-auto max-w-[150px] object-contain" /></span>)}
        {(name || !logo) && <div className="mt-2 text-base font-extrabold leading-tight">{name || 'Nome da loja'}</div>}
        {welcome && <div className="mt-0.5 text-xs font-medium opacity-95">{welcome}</div>}
      </div>
      <div className="space-y-2 p-4">
        <div className="h-8 rounded-lg" style={{ background: dark ? '#262626' : '#FFFFFF' }} />
        <div className="h-8 rounded-lg" style={{ background: dark ? '#262626' : '#FFFFFF' }} />
        <div className="rounded-full py-2 text-center text-sm font-semibold" style={{ background: color, color: onColor(color) }}>Continuar</div>
      </div>
    </div>
  );
}

export default function BrandTab({ showToast }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [f, setF] = useState({ color: '', logo: '', style: '', theme: '', name: '', welcome: '' });
  const [busy, setBusy] = useState(false);

  const apply = (d) => {
    setData(d);
    const o = d.own || {};
    setF({ color: o.primary_color || '', logo: o.logo_data || '', style: o.logo_style || '', theme: o.theme || '', name: o.display_name || '', welcome: o.welcome_text || '' });
  };
  useEffect(() => { callMarca('brand_get').then(apply).catch((e) => setError(e.message)); }, []);

  if (error) return <div className={`${card} p-5 text-sm text-red-700`}>{error}</div>;
  if (!data) return <div className={`${card} p-5 text-sm text-slate-500`}>Carregando…</div>;

  const inh = data.inherited || {};
  const shown = {
    color: f.color || inh.primary_color || DEFAULT_COLOR,
    logo: f.logo || inh.logo || '',
    logoStyle: f.logo ? (f.style || 'card') : (f.style || inh.logo_style || 'card'),
    name: f.name || inh.display_name || '',
    dark: (f.theme || inh.theme || 'auto') === 'dark',
    welcome: f.welcome || inh.welcome_text || '',
  };

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const logo = await fileToLogo(file);
      setF({ ...f, logo, style: (await isLightLogo(logo)) ? 'direct' : 'card' });
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function save(e) {
    e.preventDefault();
    if (f.color && !/^#[0-9a-fA-F]{6}$/.test(f.color)) { showToast?.('Cor inválida. Use o formato #RRGGBB (ex.: #210A94).', 'error'); return; }
    setBusy(true);
    try {
      apply(await callMarca('brand_save', {
        brand: {
          primary_color: f.color || null, logo_data: f.logo || null, logo_style: f.logo ? (f.style || 'card') : null,
          theme: f.theme || null, display_name: f.name.trim() || null, welcome_text: f.welcome.trim() || null,
        },
      }));
      showToast?.('Identidade visual salva. O cliente já vê a nova versão ao reabrir o QR.', 'success');
    } catch (err) { showToast?.(err.message, 'error'); } finally { setBusy(false); }
  }

  const radio = (name, value, text) => (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700 mr-4">
      <input type="radio" name={name} checked={(name === 'style' ? (f.style || 'card') : f.theme) === value} onChange={() => setF({ ...f, [name === 'style' ? 'style' : 'theme']: value })} />
      {text}
    </label>
  );

  return (
    <form onSubmit={save} className={`${card} p-5`}>
      <h2 className="text-lg font-bold text-slate-800">Identidade visual da loja autônoma</h2>
      <p className="text-sm text-slate-500 mb-5">O que o cliente vê ao ler o QR da loja: cor, logo, fundo e mensagem.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <div>
            <span className={label}>Cor principal</span>
            <div className="flex items-center gap-2">
              <input type="color" value={f.color || DEFAULT_COLOR} onChange={(e) => setF({ ...f, color: e.target.value.toUpperCase() })} className="h-10 w-14 rounded-lg border border-slate-200 bg-white p-1" />
              <input className={`${input} max-w-[140px] font-mono`} maxLength={7} placeholder={DEFAULT_COLOR} value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
              <button type="button" className={btnGhost} onClick={() => setF({ ...f, color: '' })}>Usar padrão</button>
            </div>
            <p className={hint}>Botões e topo da tela do cliente.</p>
          </div>

          <div>
            <span className={label}>Logo</span>
            <div className="flex flex-wrap items-center gap-3">
              {f.logo
                ? <img src={f.logo} alt="logo" className="h-12 max-w-[160px] rounded border border-slate-200 p-1 object-contain" style={{ background: f.style === 'direct' ? shown.color : '#fff' }} />
                : <span className="text-sm text-slate-400">Sem logo próprio</span>}
              <label className={`${btnGhost} cursor-pointer`}>Escolher imagem<input type="file" className="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} /></label>
              {f.logo && <button type="button" className={`${btnGhost} text-red-600`} onClick={() => setF({ ...f, logo: '' })}>Remover</button>}
            </div>
            <p className={hint}>PNG, JPG, WEBP ou SVG. De preferência com fundo transparente.</p>
          </div>

          {f.logo && (
            <div>
              <span className={label}>Como o logo aparece</span>
              {radio('style', 'card', 'Cartão branco')}{radio('style', 'direct', 'Direto na cor')}
              <p className={hint}>Logo branco ou claro: use “Direto na cor”. Logo colorido: use “Cartão branco”.</p>
            </div>
          )}

          <div>
            <span className={label}>Fundo da tela do cliente</span>
            {radio('theme', '', 'Padrão')}{radio('theme', 'auto', 'Automático')}{radio('theme', 'light', 'Claro')}{radio('theme', 'dark', 'Escuro')}
            <p className={hint}>Automático segue o celular de cada pessoa.</p>
          </div>

          <div>
            <label className={label} htmlFor="brand-name">Nome mostrado na tela do cliente</label>
            <input id="brand-name" className={input} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <p className={hint}>Deixe vazio se o logo já tem o nome. Sem logo, aparece o nome da loja.</p>
          </div>

          <div>
            <label className={label} htmlFor="brand-welcome">Mensagem de boas-vindas</label>
            <input id="brand-welcome" className={input} maxLength={160} placeholder="Pegue o que quiser. Pague pelo celular." value={f.welcome} onChange={(e) => setF({ ...f, welcome: e.target.value })} />
            <p className={hint}>Curta, aparece no topo (até 160 caracteres).</p>
          </div>

          <button className={btnPrimary} disabled={busy}>{busy ? 'Salvando…' : 'Salvar identidade visual'}</button>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 text-center">Pré-visualização</p>
          <Preview {...shown} />
        </div>
      </div>
    </form>
  );
}
