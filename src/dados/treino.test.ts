import { describe, expect, it } from 'vitest';
import {
  ajustarDescanso, chaveSerie, cronometro, descansoReal, duracaoCurta, faixaReps, kg, proximaFicha, restanteDescanso, resumoTreino,
  semana, tempoMedio, treinoAberto, ultimaMarcada, ultimaVez, valoresIniciais, type Descanso,
} from './treino';
import type { Ficha, FichaSerie, Treino, TreinoSerie } from './tipos';

const base = { user_id: 'u', criado_em: '2026-10-01T00:00:00Z', atualizado_em: '2026-10-01T00:00:00Z', excluido_em: null };
const ficha = (id: string, ordem: number, ativa = true): Ficha => ({ ...base, id, nome: id, ordem, ativa });
const treino = (ficha_id: string | null, inicio: string, duracao: number | null): Treino => ({
  ...base, id: `${ficha_id}-${inicio}`, ficha_id, nome_ficha: String(ficha_id), inicio,
  fim: duracao === null ? null : new Date(Date.parse(inicio) + duracao * 1000).toISOString(), duracao_seg: duracao,
});
const fichas = [ficha('SupA', 0), ficha('InfA', 1), ficha('SupB', 2), ficha('InfB', 3)];

describe('próxima ficha', () => {
  it('sem treinos: a primeira', () => {
    expect(proximaFicha(fichas, [])?.id).toBe('SupA');
  });
  it('a seguinte à do último treino finalizado', () => {
    const ts = [treino('SupA', '2026-10-20T10:00:00Z', 3600), treino('InfA', '2026-10-21T10:00:00Z', 3600)];
    expect(proximaFicha(fichas, ts)?.id).toBe('SupB');
  });
  it('depois da última volta para a primeira', () => {
    expect(proximaFicha(fichas, [treino('InfB', '2026-10-21T10:00:00Z', 3600)])?.id).toBe('SupA');
  });
  it('treino aberto não conta como feito', () => {
    const ts = [treino('SupA', '2026-10-20T10:00:00Z', 3600), treino('InfA', '2026-10-21T10:00:00Z', null)];
    expect(proximaFicha(fichas, ts)?.id).toBe('InfA');
    expect(treinoAberto(ts)?.ficha_id).toBe('InfA');
  });
  it('ficha do último foi excluída: a primeira; ficha inativa é pulada', () => {
    expect(proximaFicha(fichas, [treino('Apagada', '2026-10-21T10:00:00Z', 3600)])?.id).toBe('SupA');
    const comInativa = [ficha('SupA', 0), ficha('InfA', 1, false), ficha('SupB', 2)];
    expect(proximaFicha(comInativa, [treino('SupA', '2026-10-21T10:00:00Z', 3600)])?.id).toBe('SupB');
  });
  it('a ordem vale, não a data de criação', () => {
    const reordenadas = [ficha('SupA', 1), ficha('InfA', 0)];
    expect(proximaFicha(reordenadas, [])?.id).toBe('InfA');
  });
});

describe('tempo médio', () => {
  it('média das 3 últimas vezes da ficha', () => {
    const ts = [
      treino('SupA', '2026-10-01T10:00:00Z', 9999),
      treino('SupA', '2026-10-05T10:00:00Z', 3000),
      treino('SupA', '2026-10-10T10:00:00Z', 3600),
      treino('SupA', '2026-10-15T10:00:00Z', 4200),
      treino('InfA', '2026-10-16T10:00:00Z', 100),
      treino('SupA', '2026-10-20T10:00:00Z', null),
    ];
    expect(tempoMedio('SupA', ts)).toBe(3600);
  });
  it('nunca feita: null', () => {
    expect(tempoMedio('SupB', [])).toBeNull();
  });
});

describe('semana', () => {
  it('segunda a domingo, marca os dias com treino finalizado', () => {
    const hoje = new Date(2026, 9, 24, 15, 0); // sábado, 24/10/2026
    const ts = [
      treino('SupA', new Date(2026, 9, 19, 7, 0).toISOString(), 3600),  // segunda
      treino('InfA', new Date(2026, 9, 21, 22, 30).toISOString(), 3600), // quarta à noite
      treino('SupB', new Date(2026, 9, 24, 9, 0).toISOString(), null),   // sábado, aberto: não conta
      treino('InfB', new Date(2026, 9, 18, 9, 0).toISOString(), 3600),   // domingo anterior: fora
    ];
    const s = semana(ts, hoje);
    expect(s.map((d) => d.dia)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    expect(s.filter((d) => d.treinou).map((d) => d.dia)).toEqual(['2026-10-19', '2026-10-21']);
    expect(s.find((d) => d.hoje)?.dia).toBe('2026-10-24');
  });
  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(semana([], new Date(2026, 9, 25, 12))[0].dia).toBe('2026-10-19');
  });
});

describe('valores pré-preenchidos', () => {
  const serieT = (treino_id: string, nome: string, n: number, carga: number | null, reps: number | null, feita = true): TreinoSerie => ({
    ...base, id: `${treino_id}-${nome}-${n}`, treino_id, exercicio_nome: nome, serie_n: n, carga, reps, descanso_seg: null,
    feita_em: feita ? '2026-10-20T10:10:00Z' : null,
  });
  const planejada = (n: number, min: number | null, max: number | null, carga: number | null): FichaSerie => ({
    ...base, id: `p${n}`, ficha_exercicio_id: 'e', serie_n: n, reps_min: min, reps_max: max, carga_alvo: carga,
  });
  const t1 = treino('SupA', '2026-10-13T10:00:00Z', 3600);
  const t2 = treino('SupA', '2026-10-20T10:00:00Z', 3600);
  const t3 = treino('SupA', '2026-10-22T10:00:00Z', 3600); // finalizado sem nenhuma série marcada
  const aberto = treino('SupA', '2026-10-24T10:00:00Z', null);
  const series = [
    serieT(t1.id, 'Supino', 1, 16, 10),
    serieT(t2.id, 'Supino', 1, 18, 9),
    serieT(t2.id, 'Supino', 2, 18, 8),
    serieT(t2.id, 'Supino', 3, 20, 6, false), // não marcada: não conta
    serieT(aberto.id, 'Supino', 1, 22, 5),
  ];

  it('última vez = o treino finalizado mais recente da ficha com série feita', () => {
    const m = ultimaVez('SupA', [t1, t2, t3, aberto], series, aberto.id);
    expect(m.get(chaveSerie('Supino', 1))).toEqual({ carga: 18, reps: 9 });
    expect(m.get(chaveSerie('Supino', 2))).toEqual({ carga: 18, reps: 8 });
    expect(m.has(chaveSerie('Supino', 3))).toBe(false);
  });
  it('sem última vez: alvo da ficha, reps pelo mínimo da faixa', () => {
    const m = ultimaVez('SupA', [t1, t2], series, aberto.id);
    expect(valoresIniciais('Supino', planejada(1, 8, 12, 20), m)).toEqual({ carga: 18, reps: 9 });
    expect(valoresIniciais('Supino', planejada(3, 8, 12, 20), m)).toEqual({ carga: 20, reps: 8 });
    expect(valoresIniciais('Prancha', planejada(1, null, null, null), m)).toEqual({ carga: null, reps: null });
  });
  it('outra ficha não conta', () => {
    expect(ultimaVez('InfA', [t1, t2], series).size).toBe(0);
  });
  it('faixa de reps e carga', () => {
    expect([faixaReps({ reps_min: 8, reps_max: 12 }), faixaReps({ reps_min: 15, reps_max: 15 }), faixaReps({ reps_min: null, reps_max: null })])
      .toEqual(['8-12', '15', '']);
    expect([kg(17.5), kg(20), kg(2.25)]).toEqual(['17,5', '20', '2,25']);
  });
});

describe('descanso', () => {
  const d: Descanso = { treinoId: 't', exercicio: 'Supino', serieId: 's1', inicio: 1_000_000, alvoSeg: 90 };
  it('conta para trás e passa do zero', () => {
    expect(restanteDescanso(d, 1_000_000 + 30_000)).toBe(60);
    expect(restanteDescanso(d, 1_000_000 + 100_000)).toBe(-10);
  });
  it('+15 / −15 mudam o alvo, sem descer abaixo do que já passou', () => {
    expect(ajustarDescanso(d, 15, 1_000_000).alvoSeg).toBe(105);
    expect(ajustarDescanso(d, -15, 1_000_000).alvoSeg).toBe(75);
    expect(ajustarDescanso(d, -15, 1_000_000 + 80_000).alvoSeg).toBe(80);
    expect(ajustarDescanso({ ...d, alvoSeg: 3590 }, 15, 1_000_000).alvoSeg).toBe(3600);
  });
  it('descanso real = do início até agora, no limite do banco', () => {
    expect(descansoReal(d, 1_000_000 + 134_400)).toBe(134);
    expect(descansoReal(d, 1_000_000 + 5_000_000)).toBe(3600);
  });
  it('última série marcada do exercício', () => {
    const s = (id: string, nome: string, feita: string | null): TreinoSerie => ({
      ...base, id, treino_id: 't', exercicio_nome: nome, serie_n: 1, carga: 10, reps: 10, descanso_seg: null, feita_em: feita,
    });
    const series = [s('a', 'Supino', '2026-10-24T10:00:00Z'), s('b', 'Supino', '2026-10-24T10:05:00Z'), s('c', 'Supino', null), s('d', 'Remada', '2026-10-24T10:09:00Z')];
    expect(ultimaMarcada(series, 't', 'Supino')?.id).toBe('b');
    expect(ultimaMarcada(series, 't', 'Agachamento')).toBeUndefined();
  });
});

describe('resumo ao finalizar', () => {
  const st = (id: string, nome: string, n: number, carga: number | null, reps: number | null, feita = true): TreinoSerie => ({
    ...base, id, treino_id: 'atual', exercicio_nome: nome, serie_n: n, carga, reps, descanso_seg: null,
    feita_em: feita ? '2026-10-24T10:10:00Z' : null,
  });
  const atual = { ...treino('SupB', '2026-10-24T10:00:00Z', 3480), id: 'atual' };
  const ultima = new Map([
    [chaveSerie('Supino inclinado', 1), { carga: 16, reps: 10 }],
    [chaveSerie('Supino inclinado', 2), { carga: 16, reps: 9 }],
    [chaveSerie('Remada', 1), { carga: 20, reps: 10 }],
    [chaveSerie('Flexão', 1), { carga: null, reps: 12 }],
    [chaveSerie('Elevação', 1), { carga: 8, reps: 15 }],
  ]);
  const series = [
    st('a', 'Supino inclinado', 1, 18, 10),
    st('b', 'Supino inclinado', 2, 18, 8),
    st('c', 'Remada', 1, 20, 12),
    st('d', 'Flexão', 1, null, 10),
    st('e', 'Elevação', 1, 6, 15),
    st('f', 'Elevação', 2, 6, 15, false), // não marcada: fora
    st('g', 'Novo exercício', 1, 10, 10), // sem última vez: fora das mudanças
  ];
  it('duração, séries, volume e o que mudou', () => {
    const r = resumoTreino(atual, 20, series, ultima);
    expect(r).toMatchObject({ duracaoSeg: 3480, feitas: 6, planejadas: 20, primeiraVez: false });
    expect(r.volumeKg).toBe(18 * 10 + 18 * 8 + 20 * 12 + 6 * 15 + 10 * 10);
    expect(r.mudancas).toEqual([
      { exercicio: 'Supino inclinado', texto: '18 kg, antes 16 kg', direcao: 'subiu' },
      { exercicio: 'Remada', texto: '12 reps no total, antes 10', direcao: 'subiu' },
      { exercicio: 'Flexão', texto: '10 reps no total, antes 12', direcao: 'desceu' },
      { exercicio: 'Elevação', texto: '6 kg, antes 8 kg', direcao: 'desceu' },
    ]);
  });
  it('primeira vez da ficha', () => {
    expect(resumoTreino(atual, 20, series, new Map())).toMatchObject({ primeiraVez: true, mudancas: [] });
  });
});

describe('formatos', () => {
  it('cronômetro', () => {
    expect([cronometro(5), cronometro(125), cronometro(3725)]).toEqual(['0:05', '2:05', '1:02:05']);
  });
  it('duração curta', () => {
    expect([duracaoCurta(3480), duracaoCurta(4500), duracaoCurta(7200), duracaoCurta(20)]).toEqual(['58 min', '1 h 15 min', '2 h', '< 1 min']);
  });
});
