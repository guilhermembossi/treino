// Gera a página que fica no endereço antigo (GitHub Pages, /treino/) avisando o endereço novo.
// Rodar: node scripts/gerar_aviso.mjs  → pasta aviso/ (publicada pelo .github/workflows/publicar.yml).
// O sw.js desliga o service worker antigo: quem abrir o app velho instalado deixa de ver a cópia guardada.
import { mkdirSync, writeFileSync } from 'node:fs';
import { marca, logoSvg } from '../src/config/marca.ts';

const pasta = new URL('../aviso/', import.meta.url);
mkdirSync(pasta, { recursive: true });
const { claro, escuro } = marca.cores;
const logo = 'data:image/svg+xml,' + encodeURIComponent(logoSvg(marca.icone.fundo, marca.icone.desenho));

const html = `<!doctype html>
<html lang="${marca.idioma}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${marca.nome}: endereço novo</title>
<meta name="robots" content="noindex">
<link rel="icon" href="${logo}">
<style>
:root{--fundo:${claro.fundo};--sup:${claro.superficie};--texto:${claro.texto};--fraco:${claro.textoFraco};--prim:${claro.primaria};--sobre:${claro.sobrePrimaria};color-scheme:light dark}
@media (prefers-color-scheme: dark){:root{--fundo:${escuro.fundo};--sup:${escuro.superficie};--texto:${escuro.texto};--fraco:${escuro.textoFraco};--prim:${escuro.primaria};--sobre:${escuro.sobrePrimaria}}}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--fundo);color:var(--texto);font:16px/1.5 system-ui,-apple-system,sans-serif;padding:16px;box-sizing:border-box}
main{background:var(--sup);border-radius:16px;padding:28px 24px;max-width:380px;text-align:center}
img{width:64px;height:64px}
h1{font-size:22px;margin:12px 0 8px}
p{color:var(--fraco);margin:0 0 16px}
a.botao{display:inline-block;background:var(--prim);color:var(--sobre);text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px}
</style>
</head>
<body>
<main>
<img src="${logo}" alt="">
<h1>O ${marca.nome} mudou de endereço</h1>
<p>Agora ele fica em <strong>${marca.endereco.replace('https://', '').replace(/\/$/, '')}</strong>. Apague o app antigo da Tela de Início e instale pelo endereço novo (Safari → Compartilhar → Adicionar à Tela de Início). Seus dados voltam ao entrar.</p>
<a class="botao" href="${marca.endereco}">Abrir o endereço novo</a>
</main>
<script>navigator.serviceWorker?.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));</script>
</body>
</html>
`;

// Substitui o service worker antigo: apaga as cópias guardadas, se desliga e recarrega as telas abertas.
const sw = `self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',(e)=>e.waitUntil((async()=>{
  for(const n of await caches.keys())await caches.delete(n);
  await self.registration.unregister();
  for(const c of await self.clients.matchAll({type:'window'}))c.navigate(c.url);
})()));
`;

writeFileSync(new URL('index.html', pasta), html);
writeFileSync(new URL('404.html', pasta), html);
writeFileSync(new URL('sw.js', pasta), sw);
console.log('ok aviso/ (index.html, 404.html, sw.js)');
