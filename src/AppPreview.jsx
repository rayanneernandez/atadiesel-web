// Pré-visualização de como o produto e o destaque aparecem no app (celular ao lado do formulário).
// Reproduz o visual do app: cartão da lista de produtos, tela de detalhe e banner de destaque da tela inicial.
import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, Droplet, Filter, Package, ShoppingCart, Star, Store, Tag, Truck } from 'lucide-react';

const BLUE = '#004AAD';
const RED = '#C62828';

const parsePrice = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const brl = (n) => (n === null ? 'R$ 0,00' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const categoryIcon = (category) => {
  const c = String(category || '').toLowerCase();
  if (/filtro/.test(c)) return Filter;
  if (/graxa/.test(c)) return Tag;
  if (/aditivo|fluido|lubrific|[oó]leo/.test(c)) return Droplet;
  return Package;
};

export const PhoneFrame = ({ children }) => (
  <div className="w-[270px] rounded-[2.2rem] border-[6px] border-slate-800 bg-white shadow-xl overflow-hidden mx-auto">
    <div className="h-5 bg-slate-800 flex justify-center">
      <span className="w-16 h-2.5 bg-slate-950 rounded-b-xl" />
    </div>
    <div className="h-[500px] overflow-y-auto bg-white">{children}</div>
  </div>
);

const ProductImage = ({ image, category, size }) => {
  const Icon = categoryIcon(category);
  if (image) {
    // a foto aparece inteira (sem cortar), como no app
    return (
      <div className="w-full bg-white flex items-center justify-center" style={{ height: size }}>
        <img src={image} alt="" className="max-w-full max-h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="w-full flex items-center justify-center" style={{ height: size, background: '#EAF1FB' }}>
      <Icon size={size > 150 ? 64 : 48} color={BLUE} />
    </div>
  );
};

const normalize = (p) => {
  const full = parsePrice(p.price);
  const promo = parsePrice(p.promotionalPrice);
  const hasPromo = promo !== null && promo > 0 && full !== null && promo < full;
  return {
    title: p.name || 'Nome do produto',
    category: p.category || 'Categoria',
    sku: p.sku || '',
    stock: p.stock === '' || p.stock === null || p.stock === undefined ? null : Number(p.stock),
    description: p.description || '',
    image: p.image || null,
    price: hasPromo ? promo : full,
    oldPrice: hasPromo ? full : null,
  };
};

const ProductCard = ({ p }) => (
  <div className="w-[170px] bg-white rounded-[18px] overflow-hidden shadow-md border border-slate-100">
    <ProductImage image={p.image} category={p.category} size={120} />
    <div className="p-2.5 flex flex-col" style={{ height: 148 }}>
      <p className="text-[12px] leading-[15px] text-slate-500">{p.category}</p>
      <p className="font-bold text-[13px] leading-[18px] mt-0.5 line-clamp-2 break-words shrink-0">{p.title}</p>
      {p.sku ? <p className="text-[11px] leading-[14px] text-slate-500 mt-1">SKU: {p.sku}</p> : null}
      {p.stock !== null && !Number.isNaN(p.stock) ? <p className="text-[11px] leading-[14px] text-slate-500 mt-1">Estoque: {p.stock}</p> : null}
      <div className="mt-auto">
        {p.oldPrice !== null ? <p className="text-[12px] leading-[14px] text-slate-400 line-through">{brl(p.oldPrice)}</p> : null}
        <p className="font-bold text-[16px] leading-5" style={{ color: RED }}>{brl(p.price)}</p>
      </div>
    </div>
  </div>
);

const ProductDetail = ({ p }) => (
  <div>
    <div className="flex items-center justify-between px-4 py-3 text-white rounded-b-3xl" style={{ background: BLUE }}>
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><ArrowLeft size={14} /></span>
        <span className="font-bold text-[13px]">Detalhes do Produto</span>
      </div>
      <ShoppingCart size={16} />
    </div>
    <ProductImage image={p.image} category={p.category} size={170} />
    <div className="px-4 pt-2 pb-4 text-[12px]">
      <p className="text-slate-500 text-[11px]">{p.category}</p>
      <p className="font-bold text-[16px] leading-5 mt-0.5 break-words">{p.title}</p>
      <p className="font-bold text-[16px] mt-1" style={{ color: RED }}>{brl(p.price)}</p>
      <p className="text-slate-600 mt-2">{p.description || 'Sem descrição disponível para este produto.'}</p>
      <p className="font-bold mt-3 mb-1.5">Método de Entrega</p>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border px-2 py-1.5" style={{ borderColor: BLUE, background: '#EEF4FF' }}>
          <Truck size={13} color={BLUE} />
          <p className="font-semibold text-[11px]" style={{ color: BLUE }}>Receber em casa</p>
        </div>
        <div className="rounded-lg border border-slate-200 px-2 py-1.5">
          <Store size={13} className="text-slate-500" />
          <p className="font-semibold text-[11px] text-slate-600">Retirar na loja</p>
        </div>
      </div>
      <div className="flex justify-between items-end mt-3">
        <span className="font-bold">Quantidade</span>
        <span className="text-right text-[10px] text-slate-500">Total<br /><b className="text-[14px]" style={{ color: RED }}>{brl(p.price)}</b></span>
      </div>
      <div className="mt-3 rounded-xl text-white text-center font-bold py-2.5 text-[12px]" style={{ background: RED }}>Adicionar ao Carrinho</div>
    </div>
  </div>
);

export const ProductAppPreview = ({ product }) => {
  const [view, setView] = useState('card');
  const p = normalize(product || {});
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Como fica no app</p>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-3 max-w-[270px] mx-auto text-xs font-semibold">
        {[['card', 'Na lista'], ['detalhe', 'Detalhe']].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className={`flex-1 py-1.5 rounded-md transition-colors ${view === k ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <PhoneFrame>
        {view === 'card' ? (
          <div>
            <div className="px-4 py-3 text-white rounded-b-3xl" style={{ background: BLUE }}>
              <p className="font-bold text-[15px]">Produtos</p>
            </div>
            <div className="flex justify-center pt-4 pb-6 bg-white">
              <ProductCard p={p} />
            </div>
          </div>
        ) : (
          <ProductDetail p={p} />
        )}
      </PhoneFrame>
      <p className="text-[11px] text-slate-400 text-center mt-2 max-w-[270px] mx-auto">
        {p.image ? 'A foto aparece inteira, sem cortes.' : 'Sem foto: o app mostra o ícone da categoria.'}
      </p>
    </div>
  );
};

const HomePhone = ({ banner, total = 1, index = 0 }) => (
  <PhoneFrame>
    <div>
      <div className="flex items-center justify-between px-4 py-4 text-white rounded-b-3xl" style={{ background: BLUE }}>
        <span className="font-bold italic text-[18px]">Atadiesel</span>
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><ShoppingCart size={15} /></span>
      </div>
      <div className="mx-3 mt-3 rounded-2xl text-white px-3 py-2.5 flex items-center gap-2" style={{ background: RED }}>
        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Star size={14} /></span>
        <div className="flex-1">
          <p className="font-bold text-[12px]">Programa de Fidelidade</p>
          <p className="text-[10px] opacity-90">Acumule pontos e ganhe prêmios!</p>
        </div>
        <ChevronRight size={14} />
      </div>
      {banner ? (
        <>
          <p className="font-bold text-[13px] mx-3 mt-4 mb-2">Parceiros em Destaque</p>
          <div className="mx-3 rounded-[20px] overflow-hidden relative flex items-end" style={{ height: 190, background: '#1E3A8A' }}>
            {banner.image ? <img src={banner.image} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
            {banner.image ? <div className="absolute left-0 right-0 bottom-0" style={{ height: 90, background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6))' }} /> : null}
            <div className="relative p-5 text-white w-full">
              <p className="font-bold text-[16px] leading-5 break-words line-clamp-2">{banner.title}</p>
            </div>
          </div>
          <div className="flex justify-center items-center gap-1.5 mt-2">
            {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
              <span key={i} className={`h-2 rounded-full ${i === index ? 'w-5 bg-slate-400' : 'w-2 bg-slate-300'}`} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-slate-400 text-center mx-4 mt-8">
          Sem destaques ativos: a seção "Parceiros em Destaque" não aparece na tela inicial do app.
        </p>
      )}
    </div>
  </PhoneFrame>
);

// Destaque sendo criado/editado (celular ao lado do formulário)
export const HighlightAppPreview = ({ highlight }) => {
  const h = highlight || {};
  const banner = { title: h.title || 'Título da promoção', image: h.image || null, link: h.link || '' };
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Como fica no app</p>
      <HomePhone banner={banner} />
      <p className="text-[11px] text-slate-400 text-center mt-2 max-w-[270px] mx-auto">
        {h.link ? 'Ao tocar, o cliente abre o link cadastrado. ' : 'Sem link: o toque não faz nada. '}A foto preenche o espaço (pode cortar as bordas): use imagem larga, 2:1.
      </p>
    </div>
  );
};

// Tela inicial do app como está hoje, com os destaques ativos passando um por um
export const HomeHighlightsPreview = ({ highlights }) => {
  const list = highlights || [];
  const [i, setI] = useState(0);
  const idx = list.length ? Math.min(i, list.length - 1) : 0;
  const cur = list[idx];
  const banner = cur ? { title: cur.title, image: cur.image, link: cur.link } : null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Como está hoje no app</p>
      <HomePhone banner={banner} total={list.length} index={idx} />
      {list.length > 1 ? (
        <div className="flex items-center justify-center gap-3 mt-3 text-sm">
          <button type="button" onClick={() => setI((idx - 1 + list.length) % list.length)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">‹</button>
          <span className="text-xs text-slate-500">{idx + 1} de {list.length}</span>
          <button type="button" onClick={() => setI((idx + 1) % list.length)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 font-bold text-slate-600">›</button>
        </div>
      ) : null}
      <p className="text-[11px] text-slate-400 text-center mt-2 max-w-[270px] mx-auto">
        {list.length ? 'Mostra os destaques ativos, na ordem em que aparecem no app.' : 'Crie um destaque para ele aparecer aqui.'}
      </p>
    </div>
  );
};
