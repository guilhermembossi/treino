// Marca do app (white label): nome, cores e logo ficam SÓ aqui.
// Daqui saem o título da página, o manifest do app instalável, as cores dos temas e os ícones
// (depois de mudar o logo ou a cor do ícone: `npm run icones`).
// Só sintaxe que o Node lê direto (sem enum/namespace): o script dos ícones importa este arquivo.

export type Paleta = {
  fundo: string;       // fundo da tela
  superficie: string;  // cartões, topo e barra de baixo
  texto: string;
  textoFraco: string;  // textos secundários e alvos em cinza
  borda: string;
  primaria: string;    // botões principais e item ativo
  sobrePrimaria: string; // texto em cima da cor primária
  sucesso: string;     // série feita
  erro: string;        // mensagens de erro
};

export const marca = {
  id: 'treino', // prefixo das chaves guardadas no aparelho
  nome: 'Treino',
  nomeCurto: 'Treino',
  descricao: 'Ficha de treino, séries, descanso e histórico.',
  idioma: 'pt-BR',
  endereco: 'https://treino-gb.pages.dev/', // endereço do app publicado (Cloudflare Pages)
  cores: {
    claro: {
      fundo: '#f4f6f6',
      superficie: '#ffffff',
      texto: '#14201f',
      textoFraco: '#5f6f6d',
      borda: '#dde3e2',
      primaria: '#0f766e',
      sobrePrimaria: '#ffffff',
      sucesso: '#16a34a',
      erro: '#c2410c',
    },
    escuro: {
      fundo: '#0d1312',
      superficie: '#172120',
      texto: '#e8eeed',
      textoFraco: '#93a3a1',
      borda: '#26322f',
      primaria: '#2dd4bf',
      sobrePrimaria: '#06201d',
      sucesso: '#4ade80',
      erro: '#fb923c',
    },
  } satisfies Record<'claro' | 'escuro', Paleta>,
  icone: { fundo: '#0f766e', desenho: '#ffffff' },
};

// Logo: halter. `cantos` = false para os ícones que o próprio sistema arredonda (iPhone, maskable).
export function logoSvg(fundo: string, desenho: string, cantos = true): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">`
    + `<rect width="512" height="512" rx="${cantos ? 112 : 0}" fill="${fundo}"/>`
    + `<g fill="${desenho}">`
    + `<rect x="104" y="176" width="44" height="160" rx="14"/>`
    + `<rect x="156" y="204" width="36" height="104" rx="12"/>`
    + `<rect x="192" y="240" width="128" height="32" rx="8"/>`
    + `<rect x="320" y="204" width="36" height="104" rx="12"/>`
    + `<rect x="364" y="176" width="44" height="160" rx="14"/>`
    + `</g></svg>`;
}
