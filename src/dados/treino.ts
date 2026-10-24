import type { Ficha, Treino } from './tipos';

// Regras do treino do dia (tarefa 5.1). Funções puras: recebem as listas e devolvem a resposta.

// Meta de treinos por semana mostrada no Início ("3 de 5"). A nota do treino fala em 4-5x por semana.
export const META_SEMANAL = 5;
// Quantas vezes anteriores entram no tempo médio de uma ficha.
const VEZES_TEMPO_MEDIO = 3;

const ativasEmOrdem = (fichas: Ficha[]) =>
  fichas.filter((f) => f.ativa).sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em));

const recentesPrimeiro = (a: Treino, b: Treino) => b.inicio.localeCompare(a.inicio);

// Treino começado e não finalizado (só um por vez; se houver mais, o mais recente).
export function treinoAberto(treinos: Treino[]): Treino | undefined {
  return treinos.filter((t) => !t.fim).sort(recentesPrimeiro)[0];
}

// Próxima ficha da sequência: a seguinte à do último treino finalizado (volta ao começo no fim).
// Sem treino, ou se a ficha do último não existe mais: a primeira.
export function proximaFicha(fichas: Ficha[], treinos: Treino[]): Ficha | undefined {
  const seq = ativasEmOrdem(fichas);
  if (!seq.length) return undefined;
  const ultimo = treinos.filter((t) => t.fim).sort(recentesPrimeiro)[0];
  const i = ultimo ? seq.findIndex((f) => f.id === ultimo.ficha_id) : -1;
  return i < 0 ? seq[0] : seq[(i + 1) % seq.length];
}

// Duração média, em segundos, das últimas vezes dessa ficha (null se nunca foi feita).
export function tempoMedio(fichaId: string, treinos: Treino[]): number | null {
  const ultimas = treinos
    .filter((t) => t.ficha_id === fichaId && t.fim && t.duracao_seg)
    .sort(recentesPrimeiro)
    .slice(0, VEZES_TEMPO_MEDIO);
  if (!ultimas.length) return null;
  return Math.round(ultimas.reduce((s, t) => s + t.duracao_seg!, 0) / ultimas.length);
}

// Dia no horário do aparelho, no formato 2026-10-24.
export const diaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Semana de segunda a domingo que contém `hoje`, com os dias em que houve treino finalizado.
export function semana(treinos: Treino[], hoje = new Date()): { dia: string; letra: string; treinou: boolean; hoje: boolean }[] {
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7));
  const treinados = new Set(treinos.filter((t) => t.fim).map((t) => diaLocal(new Date(t.inicio))));
  const letras = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  return letras.map((letra, i) => {
    const d = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i);
    const dia = diaLocal(d);
    return { dia, letra, treinou: treinados.has(dia), hoje: dia === diaLocal(hoje) };
  });
}

// 3725 → "1:02:05"; 125 → "2:05".
export function cronometro(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(r).padStart(2, '0')}`;
}

// 3480 → "58 min"; 4500 → "1 h 15 min".
export function duracaoCurta(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
