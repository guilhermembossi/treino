import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { nomeDoUsuario } from '../sessao';
import { supabase } from '../supabase';
import { SANDBOX, VERSAO } from '../config/supabase';
import { useDados, useLista } from '../dados/contexto';
import { META_SEMANAL, duracaoCurta, proximaFicha, semana, tempoMedio, treinoAberto } from '../dados/treino';
import type { Ficha } from '../dados/tipos';
import { contarExercicios } from './Fichas';

export const ROTA_TREINO = '#/treino';

// Início: "Olá", cartão do próximo treino (ou "Continuar treino") e a semana.
export default function Inicio({ sessao }: { sessao: Session }) {
  const dados = useDados();
  const fichas = useLista('fichas');
  const exercicios = useLista('ficha_exercicios');
  const treinos = useLista('treinos');
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [trocando, setTrocando] = useState(false);
  const [comecando, setComecando] = useState(false);
  const nome = nomeDoUsuario(sessao);

  if (!fichas || !exercicios || !treinos) return null;

  const aberto = treinoAberto(treinos);
  const ficha = fichas.find((f) => f.id === escolhida && f.ativa) ?? proximaFicha(fichas, treinos);
  const exerciciosDa = (f: Ficha) => exercicios.filter((e) => e.ficha_id === f.id).sort((a, b) => a.ordem - b.ordem);
  const dias = semana(treinos);
  const feitos = dias.filter((d) => d.treinou).length;

  async function comecar(f: Ficha) {
    setComecando(true);
    try {
      await dados.salvar('treinos', { ficha_id: f.id, nome_ficha: f.nome, inicio: new Date().toISOString(), fim: null, duracao_seg: null });
      location.hash = ROTA_TREINO;
    } finally {
      setComecando(false);
    }
  }

  return (
    <>
      <h1>{nome ? `Olá, ${nome}` : 'Olá!'}</h1>

      {aberto ? (
        <section className="cartao cartao-treino">
          <p className="rotulo">Treino em andamento</p>
          <p className="treino-nome">{aberto.nome_ficha}</p>
          <p className="fraco">Começou às {new Date(aberto.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          <a className="botao-primario" href={ROTA_TREINO}>Continuar treino</a>
        </section>
      ) : ficha ? (
        <section className="cartao cartao-treino">
          <p className="rotulo">Próximo treino</p>
          <p className="treino-nome">{ficha.nome}</p>
          <p className="fraco">
            {contarExercicios(exerciciosDa(ficha).length)}
            {tempoMedio(ficha.id, treinos) !== null && <> · cerca de {duracaoCurta(tempoMedio(ficha.id, treinos)!)}</>}
          </p>
          {exerciciosDa(ficha).length > 0 && (
            <ul className="treino-exercicios">
              {exerciciosDa(ficha).map((e) => <li key={e.id}>{e.nome}</li>)}
            </ul>
          )}
          <button type="button" className="botao-primario" disabled={comecando} onClick={() => void comecar(ficha)}>
            Começar treino
          </button>
          <button type="button" className="link" aria-expanded={trocando} onClick={() => setTrocando(!trocando)}>
            Trocar treino
          </button>
          {trocando && (
            <ul className="trocar-treino" aria-label="Escolher outro treino">
              {fichas.filter((f) => f.ativa).sort((a, b) => a.ordem - b.ordem).map((f) => (
                <li key={f.id}>
                  <button type="button" aria-pressed={f.id === ficha.id}
                    onClick={() => { setEscolhida(f.id); setTrocando(false); }}>
                    {f.nome}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="cartao cartao-treino">
          <p className="rotulo">Próximo treino</p>
          <p>Você ainda não tem treinos.</p>
          <a className="botao-primario" href="#/fichas">Criar treinos</a>
        </section>
      )}

      <section className="cartao semana" aria-label={`Semana: ${feitos} de ${META_SEMANAL} treinos`}>
        <div className="semana-topo">
          <p className="rotulo">Esta semana</p>
          <p className="semana-total"><strong>{feitos}</strong> de {META_SEMANAL}</p>
        </div>
        <ol className="semana-dias">
          {dias.map((d) => (
            <li key={d.dia} className={`${d.treinou ? 'treinou' : ''} ${d.hoje ? 'hoje' : ''}`}
              aria-label={`${new Date(d.dia + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long' })}${d.treinou ? ', treinou' : ''}${d.hoje ? ', hoje' : ''}`}>
              <span aria-hidden="true">{d.letra}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="rodape-conta">
        {sessao.user.email} ·{' '}
        <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
        <br />
        <span className="versao">versão {VERSAO}{SANDBOX ? ' · sandbox' : ''}</span>
      </p>
    </>
  );
}
