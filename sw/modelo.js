// Service worker do app (tarefa 3.2). Modelo: o plugin serviceWorker do vite.config.ts preenche
// a versão, o prefixo e a lista de arquivos (marcas entre dois sublinhados) e grava dist/sw.js a cada build.
// Guarda as telas no celular para o app abrir sem internet. Só cuida dos arquivos do próprio app:
// os pedidos ao Supabase (outro endereço) passam direto.
const VERSAO = '__VERSAO__';
const PREFIXO = '__PREFIXO__';
const ARQUIVOS = __ARQUIVOS__;
const CACHE = `${PREFIXO}-telas-${VERSAO}`;

// A tela principal fica guardada pelo endereço da pasta ("./"), não por "index.html": o Cloudflare Pages
// redireciona index.html para a pasta (308), e o navegador recusa abrir o app com uma resposta redirecionada
// (a tela falhava com ERR_FAILED da segunda abertura em diante; tarefa 8.2).
const PRINCIPAL = './';
const enderecoNoCache = (a) => (a === 'index.html' ? PRINCIPAL : a);

// Copia a resposta sem a marca de "redirecionada", por garantia (algum servidor pode redirecionar outro arquivo).
const semRedirecionamento = async (r) =>
  r.redirected ? new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers }) : r;

// Instala: baixa todas as telas da versão nova e assume na hora.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ARQUIVOS.map(async (a) => {
      const endereco = enderecoNoCache(a);
      const r = await fetch(endereco);
      if (!r.ok) throw new Error(`${endereco}: HTTP ${r.status}`);
      await cache.put(endereco, await semRedirecionamento(r));
    }));
    await self.skipWaiting();
  })());
});

// Ativa: apaga as versões antigas.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith(`${PREFIXO}-telas-`) && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Abre primeiro do celular (rápido e sem internet). Uma versão nova é baixada em segundo plano
// e aparece na próxima vez que o app for aberto.
self.addEventListener('fetch', (e) => {
  const pedido = e.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ignoreVary: o servidor responde com "Vary" (Origin, Accept-Encoding) e o script do app é pedido
    // com cabeçalhos diferentes dos da instalação; sem isso a busca no cache falha.
    const guardado = pedido.mode === 'navigate'
      ? await cache.match(PRINCIPAL, { ignoreVary: true })
      : await cache.match(pedido, { ignoreSearch: true, ignoreVary: true });
    return guardado ?? fetch(pedido);
  })());
});
