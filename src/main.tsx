import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './estilos.css';

// Service worker (só no app publicado): guarda as telas para abrir sem internet.
// Procura versão nova ao abrir e ao voltar para o app (o iPhone quase não procura sozinho);
// a versão nova aparece na próxima abertura.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .then((reg) => {
      const procurar = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      procurar();
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') procurar(); });
    })
    .catch(() => { /* sem service worker o app só não abre offline */ });
}

const raiz = createRoot(document.getElementById('raiz')!);

// ?demo só existe em desenvolvimento (ver src/demo.tsx); no build este trecho some.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  import('./demo').then(({ default: Demo }) => raiz.render(<StrictMode><Demo /></StrictMode>));
} else {
  raiz.render(<StrictMode><App /></StrictMode>);
}
