// Tabelas do banco (iguais às do Supabase). A ORDEM importa: pais antes dos filhos, para o envio.
export const TABELAS = ['fichas', 'ficha_exercicios', 'ficha_series', 'treinos', 'treino_series', 'videos'] as const;
export type Tabela = (typeof TABELAS)[number];

// Excluir um pai marca os filhos como excluídos também (o banco só apagaria em cascata numa exclusão real).
export const FILHOS: Partial<Record<Tabela, [Tabela, string][]>> = {
  fichas: [['ficha_exercicios', 'ficha_id']],
  ficha_exercicios: [['ficha_series', 'ficha_exercicio_id']],
  treinos: [['treino_series', 'treino_id']],
};

export type Base = {
  id: string;
  user_id: string;
  criado_em: string;
  atualizado_em: string;           // relógio do celular: decide qual versão vale
  excluido_em: string | null;      // exclusão marcada
  sincronizado_em?: string | null; // relógio do servidor: só vem do Supabase
};

export type Ficha = Base & { nome: string; ordem: number; ativa: boolean };
export type FichaExercicio = Base & {
  ficha_id: string; nome: string; ordem: number; descanso_seg: number | null; observacao: string | null;
};
export type FichaSerie = Base & {
  ficha_exercicio_id: string; serie_n: number; reps_min: number | null; reps_max: number | null; carga_alvo: number | null;
};
export type Treino = Base & {
  ficha_id: string | null; nome_ficha: string; inicio: string; fim: string | null; duracao_seg: number | null;
};
export type TreinoSerie = Base & {
  treino_id: string; exercicio_nome: string; serie_n: number; carga: number | null; reps: number | null;
  descanso_seg: number | null; feita_em: string | null;
};

// Biblioteca de vídeos (tarefa 8.7): link do YouTube guardado pelo nome do exercício (`chave` = chaveVideo(nome)).
export type Video = Base & { nome: string; chave: string; url: string };

export type Registros = {
  fichas: Ficha;
  ficha_exercicios: FichaExercicio;
  ficha_series: FichaSerie;
  treinos: Treino;
  treino_series: TreinoSerie;
  videos: Video;
};

// Conversa com o servidor (Supabase de verdade em remoto.ts; falso nos testes).
export interface Remoto {
  enviar(tabela: Tabela, linhas: Base[]): Promise<void>;
  buscar(tabela: Tabela, desde: string | null): Promise<Base[]>;
}

// Erro do servidor. `rede` = sem conexão (tenta de novo depois); senão o servidor recusou.
export class ErroRemoto extends Error {
  readonly rede: boolean;
  constructor(mensagem: string, rede: boolean) {
    super(mensagem);
    this.rede = rede;
  }
}

export type Situacao = 'ok' | 'pendente' | 'sincronizando' | 'offline' | 'erro';
export type EstadoSync = { situacao: Situacao; pendentes: number; ultima: string | null };
