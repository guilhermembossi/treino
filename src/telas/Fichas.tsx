import { useEffect, useState } from 'react';
import { useDados, useLista } from '../dados/contexto';
import { proximaOrdem, reordenar } from '../dados/ordem';
import ListaOrdenavel from '../componentes/ListaOrdenavel';
import { IconeMais, IconeSeta } from '../icones';
import EditorFicha from './EditorFicha';

const ROTA = '#/fichas';

// Fichas: lista na ordem da sequência (#/fichas) ou edição de uma (#/fichas/<id>).
export default function Fichas() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const aoMudar = () => setHash(location.hash);
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  const id = hash.startsWith(`${ROTA}/`) ? hash.slice(ROTA.length + 1) : null;
  return id ? <EditorFicha key={id} id={id} /> : <ListaFichas />;
}

export const contarExercicios = (n: number) =>
  n === 0 ? 'Sem exercícios' : n === 1 ? '1 exercício' : `${n} exercícios`;

function ListaFichas() {
  const dados = useDados();
  const fichas = useLista('fichas');
  const exercicios = useLista('ficha_exercicios');
  if (!fichas || !exercicios) return null;

  const ordenadas = [...fichas].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em));
  const nExercicios = (fichaId: string) => exercicios.filter((e) => e.ficha_id === fichaId).length;

  async function nova() {
    const f = await dados.salvar('fichas', { nome: 'Nova ficha', ordem: proximaOrdem(ordenadas), ativa: true });
    sessionStorage.setItem('ficha-nova', f.id);
    location.hash = `${ROTA}/${f.id}`;
  }

  return (
    <>
      <h1>Fichas</h1>
      {ordenadas.length > 0 && <p className="fraco dica-tela">A ordem abaixo é a sequência dos treinos. Arraste pela alça para mudar.</p>}

      {ordenadas.length === 0
        ? <p className="fraco vazio">Nenhuma ficha ainda.</p>
        : (
          <ListaOrdenavel
            itens={ordenadas}
            nome={(f) => f.nome}
            aoMover={(de, para) => void dados.salvarVarios('fichas', reordenar(ordenadas, de, para, 'ordem'))}
            render={(f, alca) => (
              <div className="cartao item-linha">
                {alca}
                <a className="item-link" href={`${ROTA}/${f.id}`}>
                  <span className="item-nome">{f.nome}</span>
                  <span className="item-detalhe">{contarExercicios(nExercicios(f.id))}</span>
                  <IconeSeta />
                </a>
              </div>
            )}
          />
        )}

      <button type="button" className="botao-secundario" onClick={() => void nova()}>
        <IconeMais /> Nova ficha
      </button>
    </>
  );
}
