import { useEffect, useState } from 'react';
import { useDados, useLista } from '../dados/contexto';
import { cronometro, treinoAberto } from '../dados/treino';
import { IconeVoltar } from '../icones';

// Treino em andamento (#/treino). Tarefa 5.1: ficha, cronômetro e os exercícios do dia.
// Marcar as séries chega na 5.2, o timer de descanso na 5.3 e o Finalizar na 5.4.
export default function Treino() {
  const dados = useDados();
  const treinos = useLista('treinos');
  const exercicios = useLista('ficha_exercicios');
  const series = useLista('ficha_series');
  const [agora, setAgora] = useState(() => Date.now());

  // O cronômetro conta a partir do horário de início salvo: continua certo mesmo se o app ficar fechado.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!treinos || !exercicios || !series) return null;
  const treino = treinoAberto(treinos);

  if (!treino) {
    return (
      <>
        <a className="voltar" href="#/"><IconeVoltar /> Início</a>
        <p className="fraco vazio">Nenhum treino em andamento.</p>
      </>
    );
  }

  const doTreino = exercicios.filter((e) => e.ficha_id === treino.ficha_id).sort((a, b) => a.ordem - b.ordem);

  async function descartar() {
    if (!confirm(`Descartar o treino "${treino!.nome_ficha}"? Ele não vai para o histórico.`)) return;
    await dados.excluir('treinos', treino!.id);
    location.hash = '#/';
  }

  return (
    <>
      <div className="treino-topo">
        <div>
          <p className="rotulo">Treino em andamento</p>
          <h1 className="treino-titulo">{treino.nome_ficha}</h1>
        </div>
        <p className="cronometro" role="timer" aria-label="Tempo de treino">{cronometro((agora - Date.parse(treino.inicio)) / 1000)}</p>
      </div>

      <ul className="lista">
        {doTreino.map((e) => {
          const ss = series.filter((s) => s.ficha_exercicio_id === e.id).sort((a, b) => a.serie_n - b.serie_n);
          const faixa = ss[0] && ss[0].reps_min !== null ? ` · ${ss[0].reps_min}${ss[0].reps_max !== ss[0].reps_min ? `-${ss[0].reps_max}` : ''} reps` : '';
          return (
            <li key={e.id} className="cartao">
              <p className="item-nome">{e.nome}</p>
              <p className="fraco">{ss.length} {ss.length === 1 ? 'série' : 'séries'}{faixa}{e.descanso_seg ? ` · descanso ${e.descanso_seg} s` : ''}</p>
              {e.observacao && <p className="fraco obs">{e.observacao}</p>}
            </li>
          );
        })}
      </ul>
      {doTreino.length === 0 && <p className="fraco vazio">Essa ficha não tem exercícios.</p>}

      <p className="fraco nota">Marcar as séries chega na próxima etapa.</p>
      <button type="button" className="botao-perigo" onClick={() => void descartar()}>Descartar treino</button>
    </>
  );
}
