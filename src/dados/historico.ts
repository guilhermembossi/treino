import { diaLocal } from './treino';
import type { FichaExercicio, Treino, TreinoSerie } from './tipos';

// Regras do Histórico (tarefa 6.1). Só treinos finalizados entram.

const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const finalizados = (treinos: Treino[]) =>
  treinos.filter((t) => t.fim).sort((a, b) => b.inicio.localeCompare(a.inicio));

// "Sáb 24/10"
export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return `${DIAS_CURTOS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Treinos finalizados do mês (mes 0-11), do mais recente ao mais antigo, no horário do aparelho.
export function treinosDoMes(treinos: Treino[], ano: number, mes: number): Treino[] {
  return finalizados(treinos).filter((t) => { const d = new Date(t.inicio); return d.getFullYear() === ano && d.getMonth() === mes; });
}

// Grade do calendário, semana começando na segunda: null = casa vazia antes do dia 1.
export function gradeDoMes(treinos: Treino[], ano: number, mes: number, hoje = new Date()) {
  const vazias = (new Date(ano, mes, 1).getDay() + 6) % 7;
  const nDias = new Date(ano, mes + 1, 0).getDate();
  const treinados = new Set(treinosDoMes(treinos, ano, mes).map((t) => diaLocal(new Date(t.inicio))));
  const casas: ({ dia: number; treinou: boolean; hoje: boolean } | null)[] = Array(vazias).fill(null);
  for (let d = 1; d <= nDias; d++) {
    const chave = diaLocal(new Date(ano, mes, d));
    casas.push({ dia: d, treinou: treinados.has(chave), hoje: chave === diaLocal(hoje) });
  }
  return casas;
}

// Séries feitas de um treino, agrupadas por exercício: na ordem da ficha (se o exercício ainda existe nela),
// depois na ordem em que foram feitas. Dentro do exercício, pelo número da série.
export function seriesPorExercicio(treino: Treino, series: TreinoSerie[], exerciciosDaFicha: FichaExercicio[]) {
  const feitas = series.filter((s) => s.treino_id === treino.id && s.feita_em);
  const grupos = new Map<string, TreinoSerie[]>();
  for (const s of [...feitas].sort((a, b) => a.feita_em!.localeCompare(b.feita_em!))) {
    grupos.set(s.exercicio_nome, [...(grupos.get(s.exercicio_nome) ?? []), s]);
  }
  const ordemFicha = new Map(exerciciosDaFicha.filter((e) => e.ficha_id === treino.ficha_id).map((e) => [e.nome, e.ordem]));
  const nomes = [...grupos.keys()];
  return nomes
    .sort((a, b) => (ordemFicha.get(a) ?? Infinity) - (ordemFicha.get(b) ?? Infinity) || nomes.indexOf(a) - nomes.indexOf(b))
    .map((nome) => ({ nome, series: grupos.get(nome)!.sort((a, b) => a.serie_n - b.serie_n) }));
}
