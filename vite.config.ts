import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { marca, type Paleta } from './src/config/marca.ts';

// Endereço no GitHub Pages: https://guilhermembossi.github.io/treino/
const BASE = '/treino/';

const variaveis = (p: Paleta) =>
  Object.entries(p).map(([k, v]) => `--${k}:${v}`).join(';');

const manifest = () => JSON.stringify({
  name: marca.nome,
  short_name: marca.nomeCurto,
  description: marca.descricao,
  lang: marca.idioma,
  start_url: BASE,
  scope: BASE,
  display: 'standalone',
  orientation: 'portrait',
  background_color: marca.cores.claro.fundo,
  theme_color: marca.cores.claro.superficie,
  icons: [
    { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2);

// Põe a marca no index.html (título, cores dos temas sem piscar) e gera o manifest.
function marcaNoApp(): Plugin {
  return {
    name: 'marca-no-app',
    transformIndexHtml(html) {
      const { claro, escuro } = marca.cores;
      const css = `:root{${variaveis(claro)};color-scheme:light}`
        + `:root[data-tema=escuro]{${variaveis(escuro)};color-scheme:dark}`
        + `@media (prefers-color-scheme: dark){:root:not([data-tema=claro]){${variaveis(escuro)};color-scheme:dark}}`;
      // Aplica o tema escolhido antes de desenhar a tela.
      const script = `try{var t=localStorage.getItem('${marca.id}-tema');if(t)document.documentElement.dataset.tema=t}catch(e){}`;
      return html
        .replaceAll('%NOME%', marca.nome)
        .replaceAll('%DESCRICAO%', marca.descricao)
        .replaceAll('%IDIOMA%', marca.idioma)
        .replaceAll('%COR_CLARO%', claro.superficie)
        .replaceAll('%COR_ESCURO%', escuro.superficie)
        .replace('</head>', `<style>${css}</style><script>${script}</script></head>`);
    },
    configureServer(server) {
      server.middlewares.use(`${BASE}manifest.webmanifest`, (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json');
        res.end(manifest());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest() });
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [react(), marcaNoApp()],
});
