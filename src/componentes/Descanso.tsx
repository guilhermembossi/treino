import { useEffect, useState } from 'react';
import { marca } from '../config/marca';
import { useDados } from '../dados/contexto';
import {
  ajustarDescanso, cronometro, descansoReal, restanteDescanso, type Descanso,
} from '../dados/treino';
import { alertar, prepararSom } from '../som';

// Timer de descanso (tarefa 5.3). Começa no botão Descansar do exercício; termina no Pular/Fechar ou ao
// marcar a próxima série. O descanso real (do toque até o fim) é salvo na última série marcada do exercício.
// Fica guardado no aparelho: fechar e abrir o app não perde o timer.

const CHAVE = `${marca.id}-descanso`;
const PASSO_SEG = 15;

function ler(): Descanso | null {
  try { return JSON.parse(localStorage.getItem(CHAVE) ?? 'null'); } catch { return null; }
}
function guardar(d: Descanso | null) {
  try { if (d) localStorage.setItem(CHAVE, JSON.stringify(d)); else localStorage.removeItem(CHAVE); } catch { /* fica só na memória */ }
}

export function useDescanso(treinoId: string | undefined, agora: number) {
  const dados = useDados();
  const [d, setD] = useState<Descanso | null>(ler);
  const atual = d && treinoId && d.treinoId === treinoId ? d : null;
  const mudar = (novo: Descanso | null) => { guardar(novo); setD(novo); };

  // Timer de um treino que já não está aberto: descarta.
  useEffect(() => { if (d && treinoId && d.treinoId !== treinoId) mudar(null); }, [d, treinoId]);

  // Zerou: aviso uma vez só.
  useEffect(() => {
    if (atual && !atual.avisou && restanteDescanso(atual, agora) <= 0) {
      alertar();
      mudar({ ...atual, avisou: true });
    }
  }, [agora]);

  const terminar = () => {
    if (!atual) return;
    if (atual.serieId) void dados.salvar('treino_series', { id: atual.serieId, descanso_seg: descansoReal(atual, Date.now()) });
    mudar(null);
  };

  const comecar = (exercicio: string, serieId: string | null, alvoSeg: number) => {
    prepararSom(); // no iPhone o som só funciona se for liberado num toque
    if (atual) terminar();
    mudar({ treinoId: treinoId!, exercicio, serieId, inicio: Date.now(), alvoSeg });
  };

  const ajustar = (delta: number) => { if (atual) mudar(ajustarDescanso(atual, delta, Date.now())); };

  return { descanso: atual, comecar, ajustar, terminar };
}

// Faixa fixa embaixo da tela, sem esconder o treino.
export function BarraDescanso({ descanso, agora, ajustar, terminar }: {
  descanso: Descanso; agora: number; ajustar: (delta: number) => void; terminar: () => void;
}) {
  const restante = restanteDescanso(descanso, agora);
  const passou = restante <= 0;
  return (
    <section className={`barra-descanso${passou ? ' passou' : ''}`} aria-label="Descanso">
      <div className="descanso-info">
        <p className="descanso-rotulo">{passou ? 'Descanso terminou' : 'Descansando'} · {descanso.exercicio}</p>
        <p className="descanso-tempo" role="timer" aria-label={passou ? 'Tempo passado do descanso' : 'Tempo de descanso restante'}>
          {passou ? `+${cronometro(-restante)}` : cronometro(Math.ceil(restante))}
        </p>
      </div>
      <div className="descanso-botoes">
        {!passou && <>
          <button type="button" onClick={() => ajustar(-PASSO_SEG)} aria-label="Menos 15 segundos">−15 s</button>
          <button type="button" onClick={() => ajustar(PASSO_SEG)} aria-label="Mais 15 segundos">+15 s</button>
        </>}
        <button type="button" className="principal" onClick={terminar}>{passou ? 'Fechar' : 'Pular'}</button>
      </div>
      <span className="so-leitor" aria-live="assertive">{passou ? 'Descanso terminou' : ''}</span>
    </section>
  );
}
