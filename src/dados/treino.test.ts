import { describe, expect, it } from 'vitest';
import { cronometro, duracaoCurta, proximaFicha, semana, tempoMedio, treinoAberto } from './treino';
import type { Ficha, Treino } from './tipos';

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

describe('formatos', () => {
  it('cronômetro', () => {
    expect([cronometro(5), cronometro(125), cronometro(3725)]).toEqual(['0:05', '2:05', '1:02:05']);
  });
  it('duração curta', () => {
    expect([duracaoCurta(3480), duracaoCurta(4500), duracaoCurta(7200)]).toEqual(['58 min', '1 h 15 min', '2 h']);
  });
});
