import type { Dados } from './dados';

// Modelo Upper/Lower (tarefa 4.2), da nota "Treino - Rascunho Upper Lower" do Obsidian (23/10/2026).
// Descanso: 150 s nos compostos e 90 s nos isolados ("2-3 min nos compostos, 1-2 min nos isolados").
// Exercícios alternados viraram dois, com a observação; "se não tiver", "cada perna" e "até a falha"
// foram para a observação. Carga em branco (cargas iniciais ainda a definir). O dia 5 opcional ficou de fora.

type ExercicioModelo = { nome: string; series: number; reps: [number, number] | null; descanso: number; obs?: string };

const COMPOSTO = 150;
const ISOLADO = 90;

export const MODELO_UPPER_LOWER: { nome: string; exercicios: ExercicioModelo[] }[] = [
  {
    nome: 'Superior A',
    exercicios: [
      { nome: 'Supino reto com barra', series: 4, reps: [6, 10], descanso: COMPOSTO },
      { nome: 'Remada curvada com barra', series: 4, reps: [6, 10], descanso: COMPOSTO },
      { nome: 'Desenvolvimento com halteres sentado', series: 3, reps: [8, 12], descanso: COMPOSTO },
      { nome: 'Barra fixa', series: 3, reps: [8, 12], descanso: COMPOSTO, obs: 'Se não tiver barra fixa: pullover com halter no banco.' },
      { nome: 'Elevação lateral com halteres', series: 3, reps: [12, 15], descanso: ISOLADO },
      { nome: 'Tríceps corda', series: 2, reps: [10, 15], descanso: ISOLADO, obs: 'Alternar com a rosca direta na polia.' },
      { nome: 'Rosca direta na polia', series: 2, reps: [10, 15], descanso: ISOLADO, obs: 'Alternar com o tríceps corda.' },
    ],
  },
  {
    nome: 'Inferior A',
    exercicios: [
      { nome: 'Agachamento búlgaro com halteres', series: 4, reps: [8, 12], descanso: COMPOSTO, obs: 'Cada perna.' },
      { nome: 'Stiff com barra', series: 4, reps: [6, 10], descanso: COMPOSTO },
      { nome: 'Passada com halteres', series: 3, reps: [10, 12], descanso: COMPOSTO },
      { nome: 'Panturrilha em pé unilateral com halter', series: 4, reps: [12, 20], descanso: ISOLADO },
      { nome: 'Abdominal no banco declinado com anilha', series: 3, reps: [12, 15], descanso: ISOLADO },
    ],
  },
  {
    nome: 'Superior B',
    exercicios: [
      { nome: 'Supino inclinado com halteres', series: 4, reps: [8, 12], descanso: COMPOSTO },
      { nome: 'Remada unilateral com halter (serrote)', series: 4, reps: [8, 12], descanso: COMPOSTO },
      { nome: 'Flexão de braço', series: 3, reps: null, descanso: COMPOSTO, obs: 'Até faltarem 1-2 reps para a falha.' },
      { nome: 'Remada baixa na máquina', series: 3, reps: [10, 12], descanso: COMPOSTO, obs: 'Se não tiver a máquina: remada apoiada no banco inclinado com halteres.' },
      { nome: 'Elevação lateral inclinada no banco com halter', series: 3, reps: [12, 15], descanso: ISOLADO },
      { nome: 'Tríceps francês', series: 3, reps: [10, 12], descanso: ISOLADO, obs: 'Alternar com a rosca martelo.' },
      { nome: 'Rosca martelo', series: 3, reps: [10, 12], descanso: ISOLADO, obs: 'Alternar com o tríceps francês.' },
    ],
  },
  {
    nome: 'Inferior B',
    exercicios: [
      { nome: 'Hip thrust com barra', series: 4, reps: [8, 12], descanso: COMPOSTO },
      { nome: 'Afundo reverso com halteres', series: 4, reps: [8, 12], descanso: COMPOSTO, obs: 'Cada perna.' },
      { nome: 'Stiff unilateral com halteres', series: 3, reps: [10, 12], descanso: COMPOSTO },
      { nome: 'Panturrilha em pé unilateral', series: 4, reps: [12, 20], descanso: ISOLADO },
      { nome: 'Elevação de pernas no banco', series: 3, reps: [15, 15], descanso: ISOLADO },
      { nome: 'Prancha', series: 3, reps: null, descanso: ISOLADO, obs: '45-60 segundos por série.' },
    ],
  },
];

// Cria as 4 fichas na sequência, depois das que já existirem. Uma gravação por tabela.
export async function carregarModelo(dados: Dados, ordemInicial = 0): Promise<void> {
  const fichas = [], exercicios = [], series = [];
  for (const [i, f] of MODELO_UPPER_LOWER.entries()) {
    const fichaId = crypto.randomUUID();
    fichas.push({ id: fichaId, nome: f.nome, ordem: ordemInicial + i, ativa: true });
    for (const [j, e] of f.exercicios.entries()) {
      const exercicioId = crypto.randomUUID();
      exercicios.push({ id: exercicioId, ficha_id: fichaId, nome: e.nome, ordem: j, descanso_seg: e.descanso, observacao: e.obs ?? null });
      for (let n = 1; n <= e.series; n++) {
        series.push({ ficha_exercicio_id: exercicioId, serie_n: n, reps_min: e.reps?.[0] ?? null, reps_max: e.reps?.[1] ?? null, carga_alvo: null });
      }
    }
  }
  await dados.salvarVarios('fichas', fichas);
  await dados.salvarVarios('ficha_exercicios', exercicios);
  await dados.salvarVarios('ficha_series', series);
}
