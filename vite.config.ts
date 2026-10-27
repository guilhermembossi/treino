import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { marca, type Paleta } from './src/config/marca.ts';

// Pasta do app no endereço. Cloudflare Pages (https://treino.pages.dev/) publica na raiz;
// o GitHub Pages antigo (https://guilhermembossi.github.io/treino/) passa BASE=/treino/ no build.
const BASE = process.env.BASE ?? '/';

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

// Gera dist/sw.js a partir de sw/modelo.js com a lista de todos os arquivos publicados.
// A versão muda sempre que algum arquivo muda: o celular baixa a versão nova sozinho.
function serviceWorker(): Plugin {
  let pasta = 'dist';
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(c) { pasta = c.build.outDir; },
    closeBundle() {
      const arquivos = (readdirSync(pasta, { recursive: true, withFileTypes: true }) as import('node:fs').Dirent[])
        .filter((d) => d.isFile() && d.name !== 'sw.js')
        .map((d) => relative(pasta, join(d.parentPath, d.name)).replaceAll('\\', '/'))
        .sort();
      const hash = createHash('sha256');
      for (const a of arquivos) hash.update(a).update(readFileSync(join(pasta, a)));
      const sw = readFileSync('sw/modelo.js', 'utf8')
        .replace('__VERSAO__', hash.digest('hex').slice(0, 12))
        .replace('__PREFIXO__', marca.id)
        .replace('__ARQUIVOS__', JSON.stringify(arquivos));
      writeFileSync(join(pasta, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  base: BASE,
  // Um arquivo só (~150 kB comprimido) que fica guardado no celular: o aviso padrão de 500 kB não ajuda.
  build: { chunkSizeWarningLimit: 800 },
  plugins: [react(), marcaNoApp(), serviceWorker()],
});
