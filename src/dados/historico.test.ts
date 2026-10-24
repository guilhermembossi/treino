import { describe, expect, it } from 'vitest';
import { dataCurta, gradeDoMes, seriesPorExercicio, treinosDoMes } from './historico';
import type { FichaExercicio, Treino, TreinoSerie } from './tipos';

const base = { user_id: 'u', criado_em: '2026-10-01T00:00:00Z', atualizado_em: '2026-10-01T00:00:00Z', excluido_em: null };
const treino = (id: string, inicio: Date, fim = true): Treino => ({
  ...base, id, ficha_id: 'f', nome_ficha: 'Superior A', inicio: inicio.toISOString(),
  fim: fim ? new Date(+inicio + 3600e3).toISOString() : null, duracao_seg: fim ? 3600 : null,
});

describe('histórico', () => {
  const ts = [
    treino('a', new Date(2026, 9, 24, 9)),
    treino('b', new Date(2026, 9, 21, 22, 30)),
    treino('c', new Date(2026, 9, 25, 8), false), // aberto: fora
    treino('d', new Date(2026, 8, 30, 7)),         // setembro
  ];

  it('treinos do mês, finalizados, mais recente primeiro', () => {
    expect(treinosDoMes(ts, 2026, 9).map((t) => t.id)).toEqual(['a', 'b']);
    expect(treinosDoMes(ts, 2026, 8).map((t) => t.id)).toEqual(['d']);
  });

  it('grade de outubro/2026: começa numa quinta (3 casas vazias), 31 dias, dias treinados', () => {
    const g = gradeDoMes(ts, 2026, 9, new Date(2026, 9, 24, 12));
    expect(g.slice(0, 3)).toEqual([null, null, null]);
    expect(g.filter(Boolean)).toHaveLength(31);
    expect(g.filter((c) => c?.treinou).map((c) => c!.dia)).toEqual([21, 24]);
    expect(g.find((c) => c?.hoje)?.dia).toBe(24);
  });

  it('data curta', () => {
    expect(dataCurta(new Date(2026, 9, 24, 9).toISOString())).toBe('Sáb 24/10');
    expect(dataCurta(new Date(2026, 9, 1, 9).toISOString())).toBe('Qui 01/10');
  });

  it('séries por exercício: ordem da ficha, só as feitas, por número', () => {
    const s = (id: string, nome: string, n: number, feita: string | null): TreinoSerie => ({
      ...base, id, treino_id: 'a', exercicio_nome: nome, serie_n: n, carga: 10, reps: 10, descanso_seg: 90, feita_em: feita,
    });
    const series = [
      s('1', 'Remada', 2, '2026-10-24T09:20:00Z'),
      s('2', 'Remada', 1, '2026-10-24T09:15:00Z'),
      s('3', 'Supino', 1, '2026-10-24T09:05:00Z'),
      s('4', 'Supino', 2, null),
      s('5', 'Extra fora da ficha', 1, '2026-10-24T09:01:00Z'),
    ];
    const exs = [
      { ...base, id: 'e1', ficha_id: 'f', nome: 'Supino', ordem: 0, descanso_seg: 90, observacao: null },
      { ...base, id: 'e2', ficha_id: 'f', nome: 'Remada', ordem: 1, descanso_seg: 90, observacao: null },
    ] as FichaExercicio[];
    const g = seriesPorExercicio(ts[0], series, exs);
    expect(g.map((x) => `${x.nome}: ${x.series.map((y) => y.serie_n).join(',')}`)).toEqual(['Supino: 1', 'Remada: 1,2', 'Extra fora da ficha: 1']);
  });
});
