import { finalizados, MESES } from './historico';
import { diaLocal, META_SEMANAL } from './treino';
import type { Treino } from './tipos';

// Regras da aba Acompanhamento (tarefa 8.5): resumo da semana ou do mês, no horário do aparelho.
// Só treinos finalizados. "Feitos" conta DIAS treinados (como o "3 de 5" do Início), para os dois baterem.

export type TipoPeriodo = 'semana' | 'mes';
export type Periodo = { tipo: TipoPeriodo; inicio: Date; fim: Date }; // fim exclusivo (00:00 do dia seguinte)

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const segundaDe = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));

// Período que contém `data`. Semana de segunda a domingo.
export function periodoDe(tipo: TipoPeriodo, data: Date): Periodo {
  if (tipo === 'semana') {
    const inicio = segundaDe(data);
    return { tipo, inicio, fim: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 7) };
  }
  return { tipo, inicio: new Date(data.getFullYear(), data.getMonth(), 1), fim: new Date(data.getFullYear(), data.getMonth() + 1, 1) };
}

// Período anterior (delta -1) ou seguinte (+1).
export function mover(p: Periodo, delta: number): Periodo {
  return p.tipo === 'semana'
    ? periodoDe('semana', new Date(p.inicio.getFullYear(), p.inicio.getMonth(), p.inicio.getDate() + 7 * delta))
    : periodoDe('mes', new Date(p.inicio.getFullYear(), p.inicio.getMonth() + delta, 1));
}

export const ehAtual = (p: Periodo, hoje = new Date()) => hoje >= p.inicio && hoje < p.fim;

// "20 a 26 de out" / "27 de out a 2 de nov" / "Outubro 2026"
export function tituloPeriodo(p: Periodo, hoje = new Date()): string {
  if (p.tipo === 'mes') return `${MESES[p.inicio.getMonth()]} ${p.inicio.getFullYear()}`;
  const ult = new Date(p.fim.getFullYear(), p.fim.getMonth(), p.fim.getDate() - 1);
  // Ano só quando não é o ano atual; semana que atravessa o ano mostra os dois.
  const virada = p.inicio.getFullYear() !== ult.getFullYear();
  const anoFim = virada || ult.getFullYear() !== hoje.getFullYear() ? ` de ${ult.getFullYear()}` : '';
  const anoIni = virada ? ` de ${p.inicio.getFullYear()}` : '';
  return p.inicio.getMonth() === ult.getMonth()
    ? `${p.inicio.getDate()} a ${ult.getDate()} de ${MESES_CURTOS[ult.getMonth()]}${anoFim}`
    : `${p.inicio.getDate()} de ${MESES_CURTOS[p.inicio.getMonth()]}${anoIni} a ${ult.getDate()} de ${MESES_CURTOS[ult.getMonth()]}${anoFim}`;
}

// Meta do período: 5 por semana; no mês, proporcional ao número de dias (31 → 22, 30 → 21, 28 → 20).
export function metaDoPeriodo(p: Periodo): number {
  if (p.tipo === 'semana') return META_SEMANAL;
  const dias = Math.round((+p.fim - +p.inicio) / 86400e3);
  return Math.round((META_SEMANAL * dias) / 7);
}

// Treinos finalizados que começaram no período, do mais recente ao mais antigo.
export const treinosDoPeriodo = (treinos: Treino[], p: Periodo) =>
  finalizados(treinos).filter((t) => { const d = new Date(t.inicio); return d >= p.inicio && d < p.fim; });

const diasTreinados = (treinos: Treino[]) => new Set(treinos.map((t) => diaLocal(new Date(t.inicio))));

export type ResumoPeriodo = {
  dias: number;            // dias com treino (o "feitos" da meta)
  treinos: number;         // treinos finalizados (pode passar dos dias, se treinar 2x no dia)
  meta: number;
  porTreino: { nome: string; vezes: number }[]; // mais feito primeiro; empate pelo nome
  tempoTotalSeg: number;
  tempoMedioSeg: number | null;
};

export function resumoPeriodo(treinos: Treino[], p: Periodo): ResumoPeriodo {
  const doPeriodo = treinosDoPeriodo(treinos, p);
  const vezes = new Map<string, number>();
  for (const t of doPeriodo) vezes.set(t.nome_ficha, (vezes.get(t.nome_ficha) ?? 0) + 1);
  const total = doPeriodo.reduce((s, t) => s + (t.duracao_seg ?? 0), 0);
  return {
    dias: diasTreinados(doPeriodo).size,
    treinos: doPeriodo.length,
    meta: metaDoPeriodo(p),
    porTreino: [...vezes].map(([nome, n]) => ({ nome, vezes: n }))
      .sort((a, b) => b.vezes - a.vezes || a.nome.localeCompare(b.nome, 'pt-BR')),
    tempoTotalSeg: total,
    tempoMedioSeg: doPeriodo.length ? Math.round(total / doPeriodo.length) : null,
  };
}

// Os 7 dias da semana do período (semana): dia, letra, se treinou, se é hoje, se é futuro.
export function diasDaSemana(treinos: Treino[], p: Periodo, hoje = new Date()) {
  const treinados = diasTreinados(treinosDoPeriodo(treinos, p));
  return ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((letra, i) => {
    const d = new Date(p.inicio.getFullYear(), p.inicio.getMonth(), p.inicio.getDate() + i);
    const dia = diaLocal(d);
    return { dia, letra, treinou: treinados.has(dia), hoje: dia === diaLocal(hoje), futuro: d > hoje && dia !== diaLocal(hoje) };
  });
}

// Semanas seguidas batendo a meta (dias treinados >= 5), contando para trás a partir da semana de `ate`.
// A semana em andamento (a de hoje) só entra se já bateu; se ainda não bateu, não quebra a sequência.
export function semanasSeguidas(treinos: Treino[], ate: Date, hoje = new Date()): number {
  const feitos = finalizados(treinos);
  const bateu = (s: Periodo) => diasTreinados(treinosDoPeriodo(feitos, s)).size >= META_SEMANAL;
  let semana = periodoDe('semana', ate > hoje ? hoje : ate);
  if (ehAtual(semana, hoje) && !bateu(semana)) semana = mover(semana, -1);
  let n = 0;
  while (bateu(semana)) { n++; semana = mover(semana, -1); }
  return n;
}
