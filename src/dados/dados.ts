import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  ErroRemoto, FILHOS, TABELAS,
  type Base, type EstadoSync, type Registros, type Remoto, type Tabela,
} from './tipos';

// Camada de dados: tudo é lido e gravado primeiro no celular (IndexedDB) e enviado ao Supabase
// quando houver internet. Vale a alteração mais recente (atualizado_em), aqui e no servidor.

type Pendente = { chave: string; tabela: Tabela; id: string; atualizado_em: string };
type Meta = { chave: string; valor: string };

interface Esquema extends DBSchema {
  fichas: { key: string; value: Registros['fichas'] };
  ficha_exercicios: { key: string; value: Registros['ficha_exercicios'] };
  ficha_series: { key: string; value: Registros['ficha_series'] };
  treinos: { key: string; value: Registros['treinos'] };
  treino_series: { key: string; value: Registros['treino_series'] };
  videos: { key: string; value: Registros['videos'] };
  pendentes: { key: string; value: Pendente }; // registros alterados ainda não enviados
  meta: { key: string; value: Meta };          // até quando já baixou cada tabela
}

type Banco = IDBPDatabase<Esquema>;

// Margem ao baixar: gravações que terminam quase juntas no servidor podem chegar fora de ordem.
const MARGEM_MS = 2 * 60 * 1000;
const ESPERA_ENVIO_MS = 800;

const ms = (iso: string) => Date.parse(iso);
const chave = (tabela: Tabela, id: string) => `${tabela}:${id}`;

export async function abrirBanco(nome: string): Promise<Banco> {
  // Versão 2 (tarefa 8.7): loja `videos`. Cria só o que falta, para quem já tinha o banco da versão 1.
  return openDB<Esquema>(nome, 2, {
    upgrade(db) {
      for (const t of TABELAS) if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pendentes')) db.createObjectStore('pendentes', { keyPath: 'chave' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'chave' });
    },
  });
}

export class Dados {
  private ouvintes = new Set<() => void>();
  private estado: EstadoSync = { situacao: 'ok', pendentes: 0, ultima: null };
  private rodando: Promise<void> | null = null;
  private deNovo = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private db: Banco;
  private userId: string;
  private remoto: Remoto;
  private online: () => boolean;
  private agora: () => string;
  private esperaEnvio: number | null;

  // `opcoes` existe para os testes: internet, relógio e envio automático controlados.
  constructor(
    db: Banco,
    userId: string,
    remoto: Remoto,
    opcoes: { online?: () => boolean; relogio?: () => string; esperaEnvioMs?: number | null } = {},
  ) {
    this.db = db;
    this.userId = userId;
    this.remoto = remoto;
    this.online = opcoes.online ?? (() => navigator.onLine);
    this.agora = opcoes.relogio ?? (() => new Date().toISOString());
    this.esperaEnvio = opcoes.esperaEnvioMs === undefined ? ESPERA_ENVIO_MS : opcoes.esperaEnvioMs;
  }

  // ---- leitura e escrita (sempre no celular) -------------------------------------------

  async listar<T extends Tabela>(tabela: T): Promise<Registros[T][]> {
    const todos = (await this.db.getAll(tabela)) as Registros[T][];
    return todos.filter((r) => !r.excluido_em);
  }

  async obter<T extends Tabela>(tabela: T, id: string): Promise<Registros[T] | undefined> {
    const r = (await this.db.get(tabela, id)) as Registros[T] | undefined;
    return r && !r.excluido_em ? r : undefined;
  }

  // Cria (sem id) ou altera (com id). Devolve o registro salvo.
  // `iniciais`: campos usados só se o registro ainda não existe (gravações quase juntas no mesmo id
  // não se sobrescrevem com valores velhos: cada uma muda só o que trouxe em `dados`).
  async salvar<T extends Tabela>(tabela: T, dados: Partial<Registros[T]>, iniciais?: Partial<Registros[T]>): Promise<Registros[T]> {
    const [salvo] = await this.gravar(tabela, [dados], this.agora(), iniciais);
    return salvo;
  }

  // Vários de uma vez (ex.: nova ordem depois de arrastar), numa transação só.
  async salvarVarios<T extends Tabela>(tabela: T, lista: Partial<Registros[T]>[]): Promise<void> {
    if (lista.length) await this.gravar(tabela, lista);
  }

  // Marca como excluído, junto com os filhos.
  async excluir(tabela: Tabela, id: string): Promise<void> {
    const quando = this.agora();
    const lote: [Tabela, string][] = [[tabela, id]];
    for (let i = 0; i < lote.length; i++) {
      const [t, pai] = lote[i];
      for (const [filha, campo] of FILHOS[t] ?? []) {
        for (const f of await this.db.getAll(filha)) {
          if ((f as unknown as Record<string, unknown>)[campo] === pai && !f.excluido_em) lote.push([filha, f.id]);
        }
      }
    }
    for (const [t, i] of lote) await this.gravar(t, [{ id: i, excluido_em: quando } as Partial<Registros[Tabela]>], quando);
  }

  private async gravar<T extends Tabela>(
    tabela: T, lista: Partial<Registros[T]>[], quando = this.agora(), iniciais?: Partial<Registros[T]>,
  ) {
    const tx = this.db.transaction([tabela, 'pendentes'], 'readwrite');
    const loja = tx.objectStore(tabela);
    const salvos: Registros[T][] = [];
    for (const dados of lista) {
      const id = dados.id ?? crypto.randomUUID();
      const atual = (await loja.get(id)) as Registros[T] | undefined;
      const reg = {
        ...(atual ? undefined : iniciais),
        ...atual,
        ...dados,
        id,
        user_id: this.userId,
        criado_em: atual?.criado_em ?? quando,
        atualizado_em: quando,
        excluido_em: dados.excluido_em ?? atual?.excluido_em ?? null,
      } as Registros[T];
      await loja.put(reg as never);
      await tx.objectStore('pendentes').put({ chave: chave(tabela, id), tabela, id, atualizado_em: quando });
      salvos.push(reg);
    }
    await tx.done;
    this.avisar();
    this.agendar();
    return salvos;
  }

  // ---- estado e avisos para a tela --------------------------------------------------------

  ouvir(fn: () => void): () => void {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }

  get estadoSync(): EstadoSync {
    return this.estado;
  }

  private avisar() {
    for (const fn of this.ouvintes) fn();
  }

  private async mudarEstado(situacao: EstadoSync['situacao'], ultima = this.estado.ultima) {
    const pendentes = await this.db.count('pendentes');
    const s = situacao === 'ok' && pendentes > 0 ? 'pendente' : situacao;
    this.estado = { situacao: s, pendentes, ultima };
    this.avisar();
  }

  // ---- sincronização ------------------------------------------------------------------------

  agendar(espera = this.esperaEnvio) {
    if (espera === null) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.sincronizar(); }, espera);
  }

  // Envia o que está pendente e baixa o que mudou no servidor. Uma rodada por vez.
  sincronizar(): Promise<void> {
    if (this.rodando) {
      this.deNovo = true;
      return this.rodando;
    }
    this.rodando = (async () => {
      do {
        this.deNovo = false;
        await this.rodada();
      } while (this.deNovo);
    })().finally(() => { this.rodando = null; });
    return this.rodando;
  }

  private async rodada() {
    if (!this.online()) return this.mudarEstado('offline');
    await this.mudarEstado('sincronizando');
    try {
      const falhas = await this.enviar();
      await this.baixar();
      await this.mudarEstado(falhas ? 'erro' : 'ok', this.agora());
    } catch (e) {
      if (e instanceof ErroRemoto && !e.rede) await this.mudarEstado('erro');
      else await this.mudarEstado('offline');
    }
  }

  // Envia por tabela, pais antes dos filhos. Devolve quantos registros o servidor recusou.
  private async enviar(): Promise<number> {
    const pendentes = await this.db.getAll('pendentes');
    let falhas = 0;
    for (const tabela of TABELAS) {
      const daTabela = pendentes.filter((p) => p.tabela === tabela);
      if (!daTabela.length) continue;
      const linhas: Base[] = [];
      for (const p of daTabela) {
        const reg = await this.db.get(tabela, p.id);
        if (!reg) { await this.db.delete('pendentes', p.chave); continue; }
        const { sincronizado_em: _s, ...linha } = reg;
        linhas.push(linha);
      }
      if (!linhas.length) continue;
      try {
        await this.remoto.enviar(tabela, linhas);
        await this.confirmarEnvio(tabela, linhas);
      } catch (e) {
        if (!(e instanceof ErroRemoto) || e.rede) throw e;
        // O servidor recusou o lote: tenta um por um, para um registro ruim não segurar os outros.
        for (const linha of linhas) {
          try {
            await this.remoto.enviar(tabela, [linha]);
            await this.confirmarEnvio(tabela, [linha]);
          } catch (e2) {
            if (!(e2 instanceof ErroRemoto) || e2.rede) throw e2;
            falhas++;
          }
        }
      }
    }
    return falhas;
  }

  // Tira da fila só o que não mudou durante o envio (uma edição no meio continua pendente).
  private async confirmarEnvio(tabela: Tabela, linhas: Base[]) {
    const tx = this.db.transaction('pendentes', 'readwrite');
    for (const l of linhas) {
      const p = await tx.store.get(chave(tabela, l.id));
      if (p && p.atualizado_em === l.atualizado_em) await tx.store.delete(p.chave);
    }
    await tx.done;
  }

  // Baixa o que mudou no servidor desde a última vez e aplica a regra da mais recente.
  private async baixar() {
    let mudou = false;
    for (const tabela of TABELAS) {
      const marca = await this.db.get('meta', `baixado:${tabela}`);
      const desde = marca ? new Date(ms(marca.valor) - MARGEM_MS).toISOString() : null;
      const linhas = await this.remoto.buscar(tabela, desde);
      if (!linhas.length) continue;

      const tx = this.db.transaction([tabela, 'pendentes', 'meta'], 'readwrite');
      const loja = tx.objectStore(tabela);
      let maior = marca?.valor ?? '';
      for (const r of linhas) {
        if (r.sincronizado_em && (!maior || ms(r.sincronizado_em) > ms(maior))) maior = r.sincronizado_em;
        const local = await loja.get(r.id);
        if (local && ms(local.atualizado_em) > ms(r.atualizado_em)) continue; // a do celular é mais nova
        if (!local || ms(r.atualizado_em) > ms(local.atualizado_em) || local.sincronizado_em !== r.sincronizado_em) {
          await loja.put(r as never);
          mudou = true;
        }
        const p = await tx.objectStore('pendentes').get(chave(tabela, r.id));
        if (p && ms(p.atualizado_em) <= ms(r.atualizado_em)) await tx.objectStore('pendentes').delete(p.chave);
      }
      if (maior) await tx.objectStore('meta').put({ chave: `baixado:${tabela}`, valor: maior });
      await tx.done;
    }
    if (mudou) this.avisar();
  }

  fechar() {
    if (this.timer) clearTimeout(this.timer);
    this.ouvintes.clear();
    this.db.close();
  }
}
