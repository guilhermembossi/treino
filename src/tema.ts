import { useEffect, useState } from 'react';
import { marca } from './config/marca';

export type Tema = 'claro' | 'escuro';

const CHAVE = `${marca.id}-tema`;
const sistemaEscuro = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

function lerEscolha(): Tema | null {
  try {
    const t = localStorage.getItem(CHAVE);
    return t === 'claro' || t === 'escuro' ? t : null;
  } catch {
    return null;
  }
}

// Sem escolha guardada, segue o tema do aparelho. Ao trocar, a escolha fica guardada no aparelho.
export function useTema() {
  const [escolha, setEscolha] = useState<Tema | null>(lerEscolha);
  const [escuroSistema, setEscuroSistema] = useState(sistemaEscuro);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const aoMudar = () => setEscuroSistema(mq.matches);
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  const tema: Tema = escolha ?? (escuroSistema ? 'escuro' : 'claro');

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    // Barra de status do celular na cor do tema escolhido (não só na do aparelho).
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) =>
      m.setAttribute('content', marca.cores[tema].superficie));
  }, [tema]);

  const alternar = () => {
    const novo: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    try { localStorage.setItem(CHAVE, novo); } catch { /* sem armazenamento: vale só nesta visita */ }
    setEscolha(novo);
  };

  return { tema, alternar };
}
