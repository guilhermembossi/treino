// Testes da camada local e da sincronização (tarefa 3.1). Rodar: npm test
// O "servidor" falso segue as mesmas regras do Supabase: chave estrangeira (pai tem que existir),
// vale a mais recente (gatilho ao_gravar_sincronizacao) e sincronizado_em com a hora do servidor.
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { abrirBanco, Dados } from './dados';
import { ErroRemoto, type Base, type Remoto, type Tabela } from './tipos';

const PAIS: Partial<Record<Tabela, [string, Tabela]>> = {
  ficha_exercicios: ['ficha_id', 'fichas'],
  ficha_series: ['ficha_exercicio_id', 'ficha_exercicios'],
  treinos: ['ficha_id', 'fichas'],
  treino_series: ['treino_id', 'treinos'],
};

class ServidorFalso implements Remoto {
  linhas = new Map<string, Base>(); // `${tabela}:${id}`
  semRede = false;
  recusar: (tabela: Tabela, l: Base) => boolean = () => false;
  aoEnviar: (() => Promise<void>) | null = null;
  private relogio = Date.parse('2026-10-24T12:00:00Z');

  async enviar(tabela: Tabela, linhas: Base[]) {
    if (this.semRede) throw new ErroRemoto('Failed to fetch', true);
    if (this.aoEnviar) { const f = this.aoEnviar; this.aoEnviar = null; await f(); }
    for (const l of linhas) {
      const pai = PAIS[tabela];
      const idPai = pai && (l as unknown as Record<string, string | null>)[pai[0]];
      if (idPai && !this.linhas.has(`${pai[1]}:${idPai}`)) throw new ErroRemoto('violates foreign key', false);
      if (this.recusar(tabela, l)) throw new ErroRemoto('recusado', false);
    }
    for (const l of linhas) {
      const atual = this.linhas.get(`${tabela}:${l.id}`);
      if (atual && Date.parse(l.atualizado_em) < Date.parse(atual.atualizado_em)) continue;
      this.relogio += 1000;
      this.linhas.set(`${tabela}:${l.id}`, { ...l, sincronizado_em: new Date(this.relogio).toISOString() });
    }
  }

  async buscar(tabela: Tabela, desde: string | null) {
    if (this.semRede) throw new ErroRemoto('Failed to fetch', true);
    return [...this.linhas.entries()]
      .filter(([k, l]) => k.startsWith(`${tabela}:`) && (!desde || Date.parse(l.sincronizado_em!) > Date.parse(desde)))
      .map(([, l]) => structuredClone(l));
  }

  da(tabela: Tabela) {
    return [...this.linhas.entries()].filter(([k]) => k.startsWith(`${tabela}:`)).map(([, l]) => l as Base & Record<string, unknown>);
  }
}

let nBanco = 0;
let minuto = 0;
// Relógio do celular controlado: cada chamada avança 1 min, ou usa a hora pedida.
const relogio = () => new Date(Date.parse('2026-10-24T10:00:00Z') + 60000 * minuto++).toISOString();

async function aparelho(servidor: ServidorFalso, opcoes: { online?: () => boolean; relogio?: () => string } = {}) {
  const db = await abrirBanco(`teste-${++nBanco}`);
  return new Dados(db, 'usuario-1', servidor, { online: () => true, relogio, esperaEnvioMs: null, ...opcoes });
}

describe('camada local e sincronização', () => {
  it('sem internet: grava no celular, fica pendente e não envia', async () => {
    const s = new ServidorFalso();
    let online = false;
    const d = await aparelho(s, { online: () => online });
    await d.salvar('fichas', { nome: 'Superior A', ordem: 0, ativa: true });
    expect((await d.listar('fichas')).map((f) => f.nome)).toEqual(['Superior A']);
    await d.sincronizar();
    expect(d.estadoSync).toMatchObject({ situacao: 'offline', pendentes: 1 });
    expect(s.da('fichas')).toHaveLength(0);

    online = true;
    await d.sincronizar();
    expect(d.estadoSync).toMatchObject({ situacao: 'ok', pendentes: 0 });
    expect(s.da('fichas')).toMatchObject([{ nome: 'Superior A', user_id: 'usuario-1', excluido_em: null }]);
    d.fechar();
  });

  it('caiu a rede no meio do envio: continua pendente e envia depois', async () => {
    const s = new ServidorFalso();
    const d = await aparelho(s);
    await d.salvar('fichas', { nome: 'Superior A', ordem: 0, ativa: true });
    s.semRede = true;
    await d.sincronizar();
    expect(d.estadoSync).toMatchObject({ situacao: 'offline', pendentes: 1 });
    s.semRede = false;
    await d.sincronizar();
    expect(d.estadoSync).toMatchObject({ situacao: 'ok', pendentes: 0 });
    d.fechar();
  });

  it('envia pais antes dos filhos (o servidor exige o pai)', async () => {
    const s = new ServidorFalso();
    const d = await aparelho(s);
    // Criados na ordem "errada": série, depois exercício, depois ficha (ids já combinados).
    const f = crypto.randomUUID(), e = crypto.randomUUID();
    await d.salvar('ficha_series', { ficha_exercicio_id: e, serie_n: 1, reps_min: 8, reps_max: 12, carga_alvo: 20 });
    await d.salvar('ficha_exercicios', { id: e, ficha_id: f, nome: 'Supino', ordem: 0, descanso_seg: 90, observacao: null });
    await d.salvar('fichas', { id: f, nome: 'Superior A', ordem: 0, ativa: true });
    await d.sincronizar();
    expect(d.estadoSync).toMatchObject({ situacao: 'ok', pendentes: 0 });
    expect([s.da('fichas').length, s.da('ficha_exercicios').length, s.da('ficha_series').length]).toEqual([1, 1, 1]);
    d.fechar();
  });

  it('edição feita durante o envio não se perde', async () => {
    const s = new ServidorFalso();
    const d = await aparelho(s);
    const f = await d.salvar('fichas', { nome: 'Nome 1', ordem: 0, ativa: true });
    s.aoEnviar = async () => { await d.salvar('fichas', { id: f.id, nome: 'Nome 2' }); };
    await d.sincronizar();
    expect(s.da('fichas')[0].nome).toBe('Nome 1');
    expect(d.estadoSync.pendentes).toBe(1);
    await d.sincronizar();
    expect(s.da('fichas')[0].nome).toBe('Nome 2');
    expect(d.estadoSync.pendentes).toBe(0);
    d.fechar();
  });

  it('outro aparelho: baixa o que mudou no servidor', async () => {
    const s = new ServidorFalso();
    const a = await aparelho(s), b = await aparelho(s);
    const f = await a.salvar('fichas', { nome: 'Superior A', ordem: 0, ativa: true });
    await a.sincronizar();
    await b.sincronizar();
    expect((await b.listar('fichas')).map((x) => x.nome)).toEqual(['Superior A']);
    await b.salvar('fichas', { id: f.id, nome: 'Superior A (nova)' });
    await b.sincronizar();
    await a.sincronizar();
    expect((await a.obter('fichas', f.id))?.nome).toBe('Superior A (nova)');
    a.fechar(); b.fechar();
  });

  it('conflito offline: vale a alteração mais recente, nos dois aparelhos', async () => {
    const s = new ServidorFalso();
    const a = await aparelho(s), b = await aparelho(s);
    const f = await a.salvar('fichas', { nome: 'Original', ordem: 0, ativa: true });
    await a.sincronizar();
    await b.sincronizar();
    // Os dois editam sem internet: B antes (relógio menor), A depois.
    await b.salvar('fichas', { id: f.id, nome: 'Do B (mais antiga)' });
    await a.salvar('fichas', { id: f.id, nome: 'Do A (mais recente)' });
    // A envia primeiro; depois B tenta enviar a versão mais antiga.
    await a.sincronizar();
    await b.sincronizar();
    await a.sincronizar();
    expect(s.da('fichas')[0].nome).toBe('Do A (mais recente)');
    expect((await a.obter('fichas', f.id))?.nome).toBe('Do A (mais recente)');
    expect((await b.obter('fichas', f.id))?.nome).toBe('Do A (mais recente)');
    expect([a.estadoSync.pendentes, b.estadoSync.pendentes]).toEqual([0, 0]);
    a.fechar(); b.fechar();
  });

  it('edição offline mais nova vence a que outro aparelho enviou antes', async () => {
    const s = new ServidorFalso();
    let online = true;
    const a = await aparelho(s), b = await aparelho(s, { online: () => online });
    const f = await a.salvar('fichas', { nome: 'Original', ordem: 0, ativa: true });
    await a.sincronizar();
    await b.sincronizar();
    await a.salvar('fichas', { id: f.id, nome: 'Do A (antes)' });
    await a.sincronizar();
    online = false;
    await b.salvar('fichas', { id: f.id, nome: 'Do B (depois, offline)' });
    online = true;
    await b.sincronizar(); // envia a dele (mais nova) e baixa a do A (mais antiga): fica a dele
    expect((await b.obter('fichas', f.id))?.nome).toBe('Do B (depois, offline)');
    expect(s.da('fichas')[0].nome).toBe('Do B (depois, offline)');
    a.fechar(); b.fechar();
  });

  it('excluir marca os filhos e a exclusão chega ao outro aparelho', async () => {
    const s = new ServidorFalso();
    const a = await aparelho(s), b = await aparelho(s);
    const f = await a.salvar('fichas', { nome: 'Superior A', ordem: 0, ativa: true });
    const e = await a.salvar('ficha_exercicios', { ficha_id: f.id, nome: 'Supino', ordem: 0, descanso_seg: 90, observacao: null });
    await a.salvar('ficha_series', { ficha_exercicio_id: e.id, serie_n: 1, reps_min: 8, reps_max: 12, carga_alvo: 20 });
    await a.sincronizar();
    await b.sincronizar();
    expect(await b.listar('ficha_series')).toHaveLength(1);

    await a.excluir('fichas', f.id);
    expect([(await a.listar('fichas')).length, (await a.listar('ficha_exercicios')).length, (await a.listar('ficha_series')).length]).toEqual([0, 0, 0]);
    await a.sincronizar();
    expect(s.da('ficha_series')[0].excluido_em).not.toBeNull();
    await b.sincronizar();
    expect([(await b.listar('fichas')).length, (await b.listar('ficha_exercicios')).length, (await b.listar('ficha_series')).length]).toEqual([0, 0, 0]);
    a.fechar(); b.fechar();
  });

  it('servidor recusa um registro: os outros vão, o recusado fica pendente e o estado é erro', async () => {
    const s = new ServidorFalso();
    const d = await aparelho(s);
    await d.salvar('fichas', { nome: 'Boa 1', ordem: 0, ativa: true });
    await d.salvar('fichas', { nome: 'Ruim', ordem: 1, ativa: true });
    await d.salvar('fichas', { nome: 'Boa 2', ordem: 2, ativa: true });
    s.recusar = (_t, l) => (l as unknown as { nome: string }).nome === 'Ruim';
    await d.sincronizar();
    expect(s.da('fichas').map((x) => x.nome).sort()).toEqual(['Boa 1', 'Boa 2']);
    expect(d.estadoSync).toMatchObject({ situacao: 'erro', pendentes: 1 });
    d.fechar();
  });

  it('baixa só o que mudou desde a última vez', async () => {
    const s = new ServidorFalso();
    const a = await aparelho(s), b = await aparelho(s);
    await a.salvar('fichas', { nome: 'F1', ordem: 0, ativa: true });
    await a.sincronizar();
    await b.sincronizar();
    const pedidos: (string | null)[] = [];
    const buscar = s.buscar.bind(s);
    s.buscar = async (t, desde) => { if (t === 'fichas') pedidos.push(desde); return buscar(t, desde); };
    await b.sincronizar();
    expect(pedidos[0]).not.toBeNull();
    a.fechar(); b.fechar();
  });
});
