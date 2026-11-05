import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("Main.jsx está rodando!");

// Escala da tela: padrão 67% (ver index.css). Abrir o painel com ?escala=100 volta ao tamanho normal; o navegador lembra.
try {
  const qs = new URLSearchParams(window.location.search).get('escala');
  if (qs) {
    const n = Number(qs);
    if (n >= 50 && n <= 150) localStorage.setItem('uiScale', String(n / 100));
  }
  const saved = Number(localStorage.getItem('uiScale'));
  if (saved >= 0.5 && saved <= 1.5) document.documentElement.style.setProperty('--ui-scale', String(saved));
} catch { /* sem localStorage: fica no padrão */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)