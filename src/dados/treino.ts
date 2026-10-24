import type { Ficha, FichaSerie, Treino, TreinoSerie } from './tipos';

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

// Série do treino é ligada ao exercício pelo nome + número (o histórico não depende da ficha).
export const chaveSerie = (exercicioNome: string, serieN: number) => `${exercicioNome}|${serieN}`;

export type Valores = { carga: number | null; reps: number | null };

// O que foi feito na última vez dessa ficha (só séries marcadas), por exercício e série.
// "Última vez" = o treino finalizado mais recente da ficha que tem alguma série feita, sem contar o atual.
export function ultimaVez(fichaId: string | null, treinos: Treino[], series: TreinoSerie[], atualId?: string): Map<string, Valores> {
  const feitas = series.filter((s) => s.feita_em);
  const anterior = treinos
    .filter((t) => t.ficha_id === fichaId && t.fim && t.id !== atualId)
    .sort(recentesPrimeiro)
    .find((t) => feitas.some((s) => s.treino_id === t.id));
  const mapa = new Map<string, Valores>();
  if (!anterior) return mapa;
  for (const s of feitas.filter((x) => x.treino_id === anterior.id)) {
    mapa.set(chaveSerie(s.exercicio_nome, s.serie_n), { carga: s.carga, reps: s.reps });
  }
  return mapa;
}

// Valores que já aparecem na linha da série: os da última vez; sem última vez, o alvo da ficha
// (reps = o mínimo da faixa, para começar por algo alcançável).
export function valoresIniciais(exercicioNome: string, planejada: FichaSerie, ultima: Map<string, Valores>): Valores {
  const antes = ultima.get(chaveSerie(exercicioNome, planejada.serie_n));
  if (antes) return antes;
  return { carga: planejada.carga_alvo, reps: planejada.reps_min ?? planejada.reps_max };
}

// "8-12", "15", "" (sem alvo de reps).
export function faixaReps(s: Pick<FichaSerie, 'reps_min' | 'reps_max'>): string {
  const { reps_min: a, reps_max: b } = s;
  if (a === null && b === null) return '';
  if (a === null || b === null || a === b) return String(a ?? b);
  return `${a}-${b}`;
}

// Carga com vírgula e sem zeros à toa: 17.5 → "17,5"; 20 → "20".
export const kg = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

// Descanso em andamento (tarefa 5.3). Guardado no aparelho para sobreviver a fechar o app.
// `serieId` = a última série marcada do exercício: é nela que o descanso real fica salvo.
export type Descanso = {
  treinoId: string; exercicio: string; serieId: string | null; inicio: number; alvoSeg: number;
  avisou?: boolean; // já tocou o aviso de fim (não repete ao reabrir o app)
};

// Segundos que faltam (negativo = passou do tempo).
export const restanteDescanso = (d: Descanso, agora: number) => d.alvoSeg - (agora - d.inicio) / 1000;

// −15 s / +15 s mudam o alvo; nunca abaixo do que já passou (zera na hora).
export function ajustarDescanso(d: Descanso, deltaSeg: number, agora: number): Descanso {
  const passou = Math.ceil((agora - d.inicio) / 1000);
  return { ...d, alvoSeg: Math.min(3600, Math.max(passou, d.alvoSeg + deltaSeg)) };
}

// Descanso real, em segundos, do toque em Descansar até agora (limite do banco: 3600).
export const descansoReal = (d: Descanso, agora: number) => Math.min(3600, Math.max(0, Math.round((agora - d.inicio) / 1000)));

// Última série marcada de um exercício no treino (a que vem antes do descanso).
export function ultimaMarcada(series: TreinoSerie[], treinoId: string, exercicio: string): TreinoSerie | undefined {
  return series
    .filter((s) => s.treino_id === treinoId && s.exercicio_nome === exercicio && s.feita_em)
    .sort((a, b) => b.feita_em!.localeCompare(a.feita_em!))[0];
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
