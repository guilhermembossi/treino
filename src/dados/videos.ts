import type { Video } from './tipos';

// Biblioteca de vídeos dos exercícios (tarefa 8.7). O vídeo fica guardado pelo NOME do exercício: qualquer
// exercício com o mesmo nome (sem diferença de maiúsculas, acentos ou espaços) mostra o mesmo vídeo.

// "  Supino   Reto " e "supino reto" → "supino reto"; "Elevação" → "elevacao".
export const chaveVideo = (nome: string) =>
  nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

// Link aceito: https do YouTube (o banco confere a mesma regra). Devolve o link limpo, ou null se não servir.
// Aceita colar sem "https://" (o app completa). Nada de http, outro site ou caractere estranho.
export function linkYoutube(texto: string): string | null {
  let t = texto.trim();
  if (!t) return null;
  if (!/^[a-z]+:/i.test(t)) t = `https://${t}`;
  let u: URL;
  try { u = new URL(t); } catch { return null; }
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname) || u.username || u.password || u.port) return null;
  if (u.pathname === '/' && !u.search) return null; // só a página inicial do YouTube não é um vídeo
  const limpo = u.toString();
  return limpo.length <= 300 && !/[\s<>"']/.test(limpo) ? limpo : null;
}

// Busca no YouTube pelo nome do exercício (abre o site/app do YouTube; sem chave de API).
export const buscaYoutube = (nome: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nome.trim()} execução`)}`;

// Vídeo guardado para o nome (o mais recente, se houver mais de um com a mesma chave).
export function videoDoExercicio(videos: Video[], nome: string): Video | undefined {
  const chave = chaveVideo(nome);
  if (!chave) return undefined;
  return videos.filter((v) => v.chave === chave && !v.excluido_em)
    .sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))[0];
}
