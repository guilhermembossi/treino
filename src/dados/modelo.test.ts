// Tarefa 4.2: o modelo Upper/Lower cria as 4 fichas na sequência e respeita os limites do banco.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { abrirBanco, Dados } from './dados';
import { carregarModelo, MODELO_UPPER_LOWER } from './modelo';
import type { Remoto } from './tipos';

const semServidor: Remoto = { enviar: async () => {}, buscar: async () => [] };

describe('modelo Upper/Lower', () => {
  it('cria as 4 fichas na ordem, com exercícios e séries', async () => {
    const d = new Dados(await abrirBanco('modelo-1'), 'u', semServidor, { online: () => false, esperaEnvioMs: null });
    await carregarModelo(d);
    const fichas = (await d.listar('fichas')).sort((a, b) => a.ordem - b.ordem);
    expect(fichas.map((f) => `${f.ordem}:${f.nome}`)).toEqual(['0:Superior A', '1:Inferior A', '2:Superior B', '3:Inferior B']);

    const exercicios = await d.listar('ficha_exercicios');
    const porFicha = fichas.map((f) => exercicios.filter((e) => e.ficha_id === f.id).length);
    expect(porFicha).toEqual([7, 5, 7, 6]);

    const series = await d.listar('ficha_series');
    const total = MODELO_UPPER_LOWER.flatMap((f) => f.exercicios).reduce((s, e) => s + e.series, 0);
    expect(series).toHaveLength(total);

    const supino = exercicios.find((e) => e.nome === 'Supino reto com barra')!;
    const seriesSupino = series.filter((s) => s.ficha_exercicio_id === supino.id).sort((a, b) => a.serie_n - b.serie_n);
    expect(seriesSupino.map((s) => `${s.serie_n}:${s.reps_min}-${s.reps_max}`)).toEqual(['1:6-10', '2:6-10', '3:6-10', '4:6-10']);
    expect(supino.descanso_seg).toBe(150);
    expect(exercicios.find((e) => e.nome === 'Prancha')?.observacao).toContain('45-60');
    d.fechar();
  });

  it('respeita os limites do banco (nomes, observações, reps, descanso)', () => {
    for (const f of MODELO_UPPER_LOWER) {
      expect(f.nome.length).toBeLessThanOrEqual(100);
      for (const e of f.exercicios) {
        expect(e.nome.length).toBeLessThanOrEqual(100);
        expect((e.obs ?? '').length).toBeLessThanOrEqual(500);
        expect(e.series).toBeGreaterThanOrEqual(1);
        expect(e.series).toBeLessThanOrEqual(50);
        expect(e.descanso).toBeLessThanOrEqual(3600);
        if (e.reps) expect(e.reps[0]).toBeLessThanOrEqual(e.reps[1]);
      }
    }
  });
});
