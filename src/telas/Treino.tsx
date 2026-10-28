import { useEffect, useMemo, useRef, useState } from 'react';
import { useDados, useLista } from '../dados/contexto';
import {
  chaveSerie, cronometro, faixaReps, kg, treinoAberto, ultimaMarcada, ultimaVez, valoresIniciais, type Valores,
} from '../dados/treino';
import type { FichaExercicio, FichaSerie, TreinoSerie } from '../dados/tipos';
import { CampoNumero } from '../componentes/Campos';
import { BarraDescanso, useDescanso } from '../componentes/Descanso';
import { BotaoVideo } from '../componentes/Video';
import { IconeCheck, IconeVoltar } from '../icones';
import { ROTA_RESUMO } from './ResumoTreino';

const PASSO_KG = 2.5;
const DESCANSO_PADRAO = 90; // exercício sem descanso definido

// Treino em andamento (#/treino): um cartão por exercício e uma linha por série.
// Carga e reps já vêm com o que foi feito da última vez nessa ficha (ou o alvo); cada mudança e cada
// marcação salvam na hora (fechar o app não perde nada). Descansar abre o timer (5.3); Finalizar abre o resumo (5.4).
export default function Treino() {
  const dados = useDados();
  const treinos = useLista('treinos');
  const exercicios = useLista('ficha_exercicios');
  const planejadas = useLista('ficha_series');
  const feitas = useLista('treino_series');
  const [agora, setAgora] = useState(() => Date.now());
  // id de cada série do treino, fixo desde a primeira mudança (duas gravações seguidas caem no mesmo registro).
  const ids = useRef(new Map<string, string>());

  // O cronômetro conta a partir do horário de início salvo: continua certo mesmo se o app ficar fechado.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const treino = treinos ? treinoAberto(treinos) : undefined;
  const ultima = useMemo(
    () => (treino && treinos && feitas ? ultimaVez(treino.ficha_id, treinos, feitas, treino.id) : new Map<string, Valores>()),
    [treino, treinos, feitas],
  );
  const { descanso, comecar, ajustar, terminar } = useDescanso(treino?.id, agora);

  if (!treinos || !exercicios || !planejadas || !feitas) return null;

  if (!treino) {
    return (
      <>
        <a className="voltar" href="#/"><IconeVoltar /> Início</a>
        <p className="fraco vazio">Nenhum treino em andamento.</p>
      </>
    );
  }

  const doTreino = exercicios.filter((e) => e.ficha_id === treino.ficha_id).sort((a, b) => a.ordem - b.ordem);
  const registros = new Map(feitas.filter((s) => s.treino_id === treino.id).map((s) => [chaveSerie(s.exercicio_nome, s.serie_n), s]));
  for (const [chave, s] of registros) if (!ids.current.has(chave)) ids.current.set(chave, s.id);
  const idDe = (chave: string) => {
    if (!ids.current.has(chave)) ids.current.set(chave, crypto.randomUUID());
    return ids.current.get(chave)!;
  };

  const seriesDe = (e: FichaExercicio) => planejadas.filter((s) => s.ficha_exercicio_id === e.id).sort((a, b) => a.serie_n - b.serie_n);
  const total = doTreino.reduce((n, e) => n + seriesDe(e).length, 0);
  const marcadas = doTreino.reduce((n, e) => n + seriesDe(e).filter((s) => registros.get(chaveSerie(e.nome, s.serie_n))?.feita_em).length, 0);

  async function descartar() {
    if (!confirm(`Descartar o treino "${treino!.nome_ficha}"? Ele não vai para o histórico.`)) return;
    terminar();
    await dados.excluir('treinos', treino!.id);
    location.hash = '#/';
  }

  // Grava fim e duração e abre o resumo. Pergunta antes, avisando se faltam séries.
  async function finalizar() {
    const faltam = total - marcadas;
    if (!confirm(faltam > 0 ? `Finalizar o treino? Faltam ${faltam} de ${total} séries.` : 'Finalizar o treino?')) return;
    terminar();
    const fim = new Date();
    await dados.salvar('treinos', {
      id: treino!.id, fim: fim.toISOString(), duracao_seg: Math.max(0, Math.round((fim.getTime() - Date.parse(treino!.inicio)) / 1000)),
    });
    location.hash = `${ROTA_RESUMO}${treino!.id}`;
  }

  const descansar = (e: FichaExercicio) =>
    comecar(e.nome, ultimaMarcada(feitas, treino.id, e.nome)?.id ?? null, e.descanso_seg ?? DESCANSO_PADRAO);

  return (
    <>
      <div className="treino-topo">
        <div>
          <p className="rotulo">Treino em andamento</p>
          <h1 className="treino-titulo">{treino.nome_ficha}</h1>
          <p className="fraco progresso">{marcadas} de {total} séries</p>
        </div>
        <div className="treino-relogio">
          <p className="cronometro" role="timer" aria-label="Tempo de treino">{cronometro((agora - Date.parse(treino.inicio)) / 1000)}</p>
          <button type="button" className="botao-finalizar" onClick={() => void finalizar()}>Finalizar</button>
        </div>
      </div>

      <ul className="lista lista-exercicios">
        {doTreino.map((e) => (
          <li key={e.id} className="cartao exercicio-treino">
            <div className="exercicio-cabeca">
              <div className="exercicio-cabeca-nome">
                <p className="item-nome quebra">{e.nome} <BotaoVideo nome={e.nome} /></p>
                <p className="fraco detalhe-exercicio">Descanso {e.descanso_seg ?? DESCANSO_PADRAO} s</p>
              </div>
              <button type="button" className="botao-descansar" onClick={() => descansar(e)}
                aria-label={`Descansar ${e.descanso_seg ?? DESCANSO_PADRAO} segundos depois de ${e.nome}`}>
                Descansar
              </button>
            </div>
            {e.observacao && <p className="fraco obs">{e.observacao}</p>}

            <div className="serie-treino serie-treino-cabecalho" aria-hidden="true">
              <span>Série</span><span className="col-carga">Carga kg</span><span>Reps</span><span>Alvo</span><span />
            </div>
            <ol className="series-treino">
              {seriesDe(e).map((p) => {
                const chave = chaveSerie(e.nome, p.serie_n);
                return (
                  <LinhaSerie key={p.id} id={idDe(chave)} treinoId={treino.id} exercicio={e.nome} planejada={p}
                    registro={registros.get(chave)} iniciais={valoresIniciais(e.nome, p, ultima)}
                    aoMarcar={() => terminar()} />
                );
              })}
            </ol>
          </li>
        ))}
      </ul>
      {doTreino.length === 0 && <p className="fraco vazio">Este treino não tem exercícios.</p>}

      <button type="button" className="botao-perigo" onClick={() => void descartar()}>Descartar treino</button>

      {descanso && <>
        <div className="espaco-descanso" aria-hidden="true" />
        <BarraDescanso descanso={descanso} agora={agora} ajustar={ajustar} terminar={terminar} />
      </>}
    </>
  );
}

// `aoMarcar`: marcar uma série encerra o descanso em andamento (o descanso real vai até aqui).
function LinhaSerie({ id, treinoId, exercicio, planejada, registro, iniciais, aoMarcar }: {
  id: string; treinoId: string; exercicio: string; planejada: FichaSerie; registro: TreinoSerie | undefined; iniciais: Valores;
  aoMarcar: () => void;
}) {
  const dados = useDados();
  const n = planejada.serie_n;
  const carga = registro ? registro.carga : iniciais.carga;
  const reps = registro ? registro.reps : iniciais.reps;
  const feita = !!registro?.feita_em;
  const alvoReps = faixaReps(planejada);
  const alvo = [alvoReps, planejada.carga_alvo !== null ? `${kg(planejada.carga_alvo)} kg` : ''].filter(Boolean);

  // Cada gravação muda só o que trouxe; o resto do registro (na 1ª vez, os valores da tela) fica como está.
  const salvar = (campos: Partial<TreinoSerie>) => dados.salvar('treino_series', { id, ...campos }, {
    treino_id: treinoId, exercicio_nome: exercicio, serie_n: n, carga: iniciais.carga, reps: iniciais.reps, descanso_seg: null, feita_em: null,
  });

  // ±2,5 parte do valor salvo mais recente (inclusive o que acabou de ser digitado).
  async function ajustar(delta: number) {
    const atual = await dados.obter('treino_series', id);
    const base = (atual ? atual.carga : iniciais.carga) ?? 0;
    await salvar({ carga: Math.min(1000, Math.max(0, Math.round((base + delta) * 100) / 100)) });
  }

  const rotulo = `Série ${n} de ${exercicio}`;
  return (
    <li className={`serie-treino${feita ? ' feita' : ''}`}>
      <span className="serie-n">{n}</span>
      <span className="col-carga">
        <button type="button" className="botao-passo" aria-label={`${rotulo}: menos ${kg(PASSO_KG)} kg`} onClick={() => void ajustar(-PASSO_KG)}>−</button>
        <CampoNumero valor={carga} max={1000} decimal placeholder="kg" aria-label={`${rotulo}: carga em kg`}
          aoSalvar={(v) => void salvar({ carga: v })} />
        <button type="button" className="botao-passo" aria-label={`${rotulo}: mais ${kg(PASSO_KG)} kg`} onClick={() => void ajustar(PASSO_KG)}>+</button>
      </span>
      <CampoNumero valor={reps} max={1000} placeholder="reps" aria-label={`${rotulo}: repetições`}
        aoSalvar={(v) => void salvar({ reps: v })} />
      <span className="alvo" aria-label={alvo.length ? `Alvo: ${alvo.join(', ')}` : 'Sem alvo'}>
        {alvo.map((a) => <span key={a}>{a}</span>)}
      </span>
      <button type="button" className="botao-marcar" aria-pressed={feita}
        aria-label={feita ? `${rotulo} feita. Tocar para desmarcar` : `Marcar ${rotulo.toLowerCase()} como feita`}
        onClick={() => { if (!feita) aoMarcar(); void salvar({ feita_em: feita ? null : new Date().toISOString() }); }}>
        <IconeCheck />
      </button>
    </li>
  );
}
