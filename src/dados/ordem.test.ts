import { describe, expect, it } from 'vitest';
import { proximaOrdem, renumerar, reordenar } from './ordem';

const l = (...ordens: number[]) => ordens.map((ordem, i) => ({ id: String.fromCharCode(97 + i), ordem }));

describe('ordem', () => {
  it('arrastar o último para o topo renumera todos', () => {
    expect(reordenar(l(0, 1, 2), 'c', 'a', 'ordem')).toEqual([{ id: 'c', ordem: 0 }, { id: 'a', ordem: 1 }, { id: 'b', ordem: 2 }]);
  });
  it('trocar dois vizinhos só mexe nos dois', () => {
    expect(reordenar(l(0, 1, 2, 3), 'b', 'c', 'ordem')).toEqual([{ id: 'c', ordem: 1 }, { id: 'b', ordem: 2 }]);
  });
  it('soltar no mesmo lugar não muda nada', () => {
    expect(reordenar(l(0, 1), 'a', 'a', 'ordem')).toEqual([]);
  });
  it('séries começam em 1 e tapam o buraco de uma excluída', () => {
    const series = [{ id: 'x', serie_n: 1 }, { id: 'z', serie_n: 3 }];
    expect(renumerar(series, 'serie_n', 1)).toEqual([{ id: 'z', serie_n: 2 }]);
  });
  it('próxima ordem', () => {
    expect(proximaOrdem([])).toBe(0);
    expect(proximaOrdem(l(0, 4))).toBe(5);
  });
});
