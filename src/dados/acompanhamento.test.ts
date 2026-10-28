import { describe, expect, it } from 'vitest';
import {
  diasDaSemana, ehAtual, metaDoPeriodo, mover, periodoDe, resumoPeriodo, semanasSeguidas, tituloPeriodo, treinosDoPeriodo,
} from './acompanhamento';
import type { Treino } from './tipos';

const base = { user_id: 'u', criado_em: '2026-10-01T00:00:00Z', atualizado_em: '2026-10-01T00:00:00Z', excluido_em: null };
let n = 0;
const treino = (nome: string, inicio: Date, min = 60, fim = true): Treino => ({
  ...base, id: `t${++n}`, ficha_id: 'f', nome_ficha: nome, inicio: inicio.toISOString(),
  fim: fim ? new Date(+inicio + min * 60e3).toISOString() : null, duracao_seg: fim ? min * 60 : null,
});
const dia = (d: number, mes = 9, h = 9) => new Date(2026, mes, d, h); // outubro de 2026 por padrão
const hoje = dia(28, 9, 12); // quarta, 28/10/2026

describe('períodos', () => {
  it('semana vai de segunda a domingo; mês do dia 1 ao último', () => {
    const s = periodoDe('semana', hoje);
    expect([s.inicio.getDate(), s.fim.getDate()]).toEqual([26, 2]); // 26/10 a 01/11 (fim exclusivo 02/11)
    const m = periodoDe('mes', hoje);
    expect([m.inicio.getDate(), m.fim.getMonth()]).toEqual([1, 10]);
  });

  it('domingo é o fim da semana, não o começo', () => {
    expect(periodoDe('semana', dia(1, 10)).inicio.getDate()).toBe(26); // domingo 01/11 → semana de 26/10
  });

  it('anterior/seguinte e título', () => {
    expect(tituloPeriodo(mover(periodoDe('semana', hoje), -1), hoje)).toBe('19 a 25 de out');
    expect(tituloPeriodo(periodoDe('semana', hoje), hoje)).toBe('26 de out a 1 de nov');
    expect(tituloPeriodo(mover(periodoDe('mes', hoje), -1), hoje)).toBe('Setembro 2026');
    expect(tituloPeriodo(mover(periodoDe('mes', hoje), -10), hoje)).toBe('Dezembro 2025');
    expect(tituloPeriodo(periodoDe('semana', new Date(2025, 11, 30)), hoje)).toBe('29 de dez de 2025 a 4 de jan de 2026');
    expect(tituloPeriodo(periodoDe('semana', new Date(2025, 9, 15)), hoje)).toBe('13 a 19 de out de 2025');
  });

  it('período atual', () => {
    expect(ehAtual(periodoDe('semana', hoje), hoje)).toBe(true);
    expect(ehAtual(mover(periodoDe('semana', hoje), -1), hoje)).toBe(false);
  });

  it('meta: 5 na semana; no mês, proporcional aos dias', () => {
    expect(metaDoPeriodo(periodoDe('semana', hoje))).toBe(5);
    expect(metaDoPeriodo(periodoDe('mes', hoje))).toBe(22);              // outubro, 31 dias
    expect(metaDoPeriodo(periodoDe('mes', dia(1, 10)))).toBe(21);        // novembro, 30
    expect(metaDoPeriodo(periodoDe('mes', new Date(2027, 1, 1)))).toBe(20); // fevereiro, 28
  });
});

describe('resumo do período', () => {
  const ts = [
    treino('Superior A', dia(26), 50),
    treino('Inferior A', dia(27), 60),
    treino('Superior A', dia(27, 9, 19), 40), // 2º treino no mesmo dia
    treino('Superior B', dia(28, 9, 7), 70),
    treino('Inferior B', dia(28, 9, 11), 30, false), // aberto: fora
    treino('Superior A', dia(25), 45),               // domingo da semana anterior
    treino('Inferior B', dia(30, 8), 55),            // setembro
  ];

  it('semana: dias treinados, treinos, vezes por treino e tempos', () => {
    const r = resumoPeriodo(ts, periodoDe('semana', hoje));
    expect(r).toEqual({
      dias: 3, treinos: 4, meta: 5,
      porTreino: [{ nome: 'Superior A', vezes: 2 }, { nome: 'Inferior A', vezes: 1 }, { nome: 'Superior B', vezes: 1 }],
      tempoTotalSeg: (50 + 60 + 40 + 70) * 60, tempoMedioSeg: 55 * 60,
    });
  });

  it('mês: só o que começou no mês', () => {
    const r = resumoPeriodo(ts, periodoDe('mes', hoje));
    expect([r.dias, r.treinos, r.meta]).toEqual([4, 5, 22]);
    expect(treinosDoPeriodo(ts, periodoDe('mes', hoje)).map((t) => t.nome_ficha)[0]).toBe('Superior B'); // mais recente primeiro
  });

  it('período vazio', () => {
    const r = resumoPeriodo(ts, periodoDe('mes', dia(1, 6)));
    expect([r.dias, r.treinos, r.tempoTotalSeg, r.tempoMedioSeg, r.porTreino.length]).toEqual([0, 0, 0, null, 0]);
  });

  it('7 dias da semana com treinou, hoje e futuro', () => {
    const d = diasDaSemana(ts, periodoDe('semana', hoje), hoje);
    expect(d.map((x) => x.treinou)).toEqual([true, true, true, false, false, false, false]);
    expect(d.map((x) => x.hoje)).toEqual([false, false, true, false, false, false, false]);
    expect(d.map((x) => x.futuro)).toEqual([false, false, false, true, true, true, true]);
  });
});

describe('semanas seguidas batendo a meta (5 dias)', () => {
  const semanaCheia = (segunda: number, mes = 9) => [0, 1, 2, 3, 4].map((i) => treino('X', new Date(2026, mes, segunda + i, 9)));
  const cheias = [...semanaCheia(5), ...semanaCheia(12), ...semanaCheia(19)]; // 3 semanas seguidas antes da atual

  it('semana atual ainda sem a meta não quebra a sequência', () => {
    expect(semanasSeguidas([...cheias, treino('X', dia(26))], hoje, hoje)).toBe(3);
  });

  it('semana atual que já bateu entra na conta', () => {
    const atual = [26, 27, 28].map((d) => treino('X', dia(d))).concat([treino('X', dia(28, 9, 7))]);
    expect(semanasSeguidas([...cheias, ...atual], hoje, hoje)).toBe(3); // 3 dias: ainda não bateu
    const bateu = [...atual, ...[29, 30].map((d) => treino('X', dia(d)))];
    expect(semanasSeguidas([...cheias, ...bateu], dia(30, 9, 20), dia(30, 9, 20))).toBe(4);
  });

  it('uma semana sem a meta corta a sequência; contar até um período passado', () => {
    const comFalha = [...semanaCheia(5), ...semanaCheia(19)]; // semana de 12/10 vazia
    expect(semanasSeguidas(comFalha, hoje, hoje)).toBe(1);
    expect(semanasSeguidas(comFalha, dia(18), hoje)).toBe(0);   // até a semana de 12/10 (não bateu, já acabou)
    expect(semanasSeguidas(comFalha, dia(11), hoje)).toBe(1);   // até a semana de 05/10
  });

  it('5 treinos em menos de 5 dias não batem a meta', () => {
    const doisNoDia = [5, 6, 7].flatMap((d) => [treino('X', dia(d)), treino('Y', dia(d, 9, 18))]);
    expect(semanasSeguidas(doisNoDia, dia(11), hoje)).toBe(0);
  });
});
