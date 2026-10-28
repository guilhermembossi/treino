import { useEffect, useState } from 'react';
import { useLista } from '../dados/contexto';
import {
  diasDaSemana, ehAtual, mover, periodoDe, resumoPeriodo, semanasSeguidas, tituloPeriodo, treinosDoPeriodo,
  type Periodo, type TipoPeriodo,
} from '../dados/acompanhamento';
import { MESES, dataCurta, gradeDoMes, seriesPorExercicio } from '../dados/historico';
import { cronometro, duracaoCurta, kg } from '../dados/treino';
import type { Treino } from '../dados/tipos';
import { IconeSeta, IconeVoltar } from '../icones';

export const ROTA = '#/acompanhamento';
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NOMES_DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

// Acompanhamento (tarefa 8.5, substitui o Histórico da 6.1): resumo da semana ou do mês e a lista dos treinos
// do período (#/acompanhamento), e o detalhe de um treino com cada série (#/acompanhamento/<id>).
export default function Acompanhamento() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const aoMudar = () => setHash(location.hash);
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  const id = hash.startsWith(`${ROTA}/`) ? hash.slice(ROTA.length + 1) : null;
  return id ? <DetalheTreino key={id} id={id} /> : <Resumo />;
}

// O período escolhido fica guardado enquanto o app está aberto (voltar do detalhe não volta para hoje).
let escolhido: Periodo | null = null;

function Resumo() {
  const treinos = useLista('treinos');
  const hoje = new Date();
  const [periodo, setPeriodo] = useState<Periodo>(() => escolhido ?? periodoDe('semana', hoje));
  if (!treinos) return null;

  const trocar = (p: Periodo) => { escolhido = p; setPeriodo(p); };
  // Trocar semana ↔ mês mantém a data que estava sendo vista (a semana de 12/10 vira outubro).
  const tipo = (t: TipoPeriodo) => { if (t !== periodo.tipo) trocar(periodoDe(t, periodo.inicio)); };
  const nome = periodo.tipo === 'semana' ? 'semana' : 'mês';
  const r = resumoPeriodo(treinos, periodo);
  const doPeriodo = treinosDoPeriodo(treinos, periodo);
  const atual = ehAtual(periodo, hoje);
  const seguidas = semanasSeguidas(treinos, new Date(+periodo.fim - 1), hoje);

  return (
    <>
      <h1>Acompanhamento</h1>
      <div className="segmentado" role="group" aria-label="Período">
        {(['semana', 'mes'] as const).map((t) => (
          <button key={t} type="button" aria-pressed={periodo.tipo === t} onClick={() => tipo(t)}>
            {t === 'semana' ? 'Semana' : 'Mês'}
          </button>
        ))}
      </div>

      <section className="cartao acomp" aria-label={`${tituloPeriodo(periodo, hoje)}: ${r.dias} de ${r.meta} dias treinados`}>
        <div className="calendario-topo">
          <button type="button" className="botao-icone pequeno" onClick={() => trocar(mover(periodo, -1))}
            aria-label={periodo.tipo === 'semana' ? 'Semana anterior' : 'Mês anterior'}><IconeVoltar /></button>
          <p className="calendario-mes">{atual ? (periodo.tipo === 'semana' ? 'Esta semana' : 'Este mês') : tituloPeriodo(periodo, hoje)}</p>
          <button type="button" className="botao-icone pequeno" onClick={() => trocar(mover(periodo, 1))} disabled={atual}
            aria-label={periodo.tipo === 'semana' ? 'Próxima semana' : 'Próximo mês'}><IconeSeta /></button>
        </div>
        {atual && <p className="fraco acomp-datas">{tituloPeriodo(periodo, hoje)}</p>}

        <p className="acomp-meta">
          <strong>{r.dias}</strong> de {r.meta} <span className="fraco">dias treinados</span>
          {r.dias >= r.meta && <span className="acomp-bateu"> · meta batida</span>}
        </p>
        {r.treinos > r.dias && <p className="fraco acomp-obs">{r.treinos} treinos (mais de um no mesmo dia)</p>}

        {periodo.tipo === 'semana'
          ? (
            <ol className="semana-dias">
              {diasDaSemana(treinos, periodo, hoje).map((d, i) => (
                <li key={d.dia} className={`${d.treinou ? 'treinou' : ''} ${d.hoje ? 'hoje' : ''} ${d.futuro ? 'futuro' : ''}`}
                  aria-label={`${NOMES_DIAS[i]}${d.treinou ? ', treinou' : ''}${d.hoje ? ', hoje' : ''}`}>
                  <span aria-hidden="true">{d.letra}</span>
                </li>
              ))}
            </ol>
          )
          : <CalendarioMes treinos={treinos} periodo={periodo} />}
      </section>

      <section className="cartao acomp-numeros" aria-label="Números do período">
        <div><p className="rotulo">Tempo total</p><p className="acomp-valor">{r.treinos ? duracaoCurta(r.tempoTotalSeg) : '—'}</p></div>
        <div><p className="rotulo">Tempo médio</p><p className="acomp-valor">{r.tempoMedioSeg !== null ? duracaoCurta(r.tempoMedioSeg) : '—'}</p></div>
        <div><p className="rotulo">Semanas seguidas na meta</p><p className="acomp-valor">{seguidas}</p></div>
      </section>

      <section className="cartao">
        <p className="rotulo">Treinos feitos {periodo.tipo === 'semana' ? 'na semana' : 'no mês'}</p>
        {r.porTreino.length === 0
          ? <p className="fraco acomp-obs">Nenhum treino finalizado {periodo.tipo === 'semana' ? 'nesta semana' : 'neste mês'}.</p>
          : (
            <ul className="acomp-por-treino">
              {r.porTreino.map((t) => <li key={t.nome}><span className="quebra">{t.nome}</span><strong>{t.vezes}x</strong></li>)}
            </ul>
          )}
      </section>

      {doPeriodo.length > 0 && (
        <ul className="lista lista-historico" aria-label={`Treinos do período (${nome})`}>
          {doPeriodo.map((t) => (
            <li key={t.id}>
              <a className="cartao item-historico" href={`${ROTA}/${t.id}`}>
                <span><strong>{dataCurta(t.inicio)}</strong> · {t.nome_ficha} · {duracaoCurta(t.duracao_seg ?? 0)}</span>
                <IconeSeta />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CalendarioMes({ treinos, periodo }: { treinos: Treino[]; periodo: Periodo }) {
  const ano = periodo.inicio.getFullYear(), mes = periodo.inicio.getMonth();
  return (
    <div className="acomp-calendario" aria-label={`Calendário de ${MESES[mes]} de ${ano}`}>
      <div className="calendario-grade" aria-hidden="true">
        {LETRAS.map((l, i) => <span key={i} className="calendario-letra">{l}</span>)}
      </div>
      <ol className="calendario-grade">
        {gradeDoMes(treinos, ano, mes).map((c, i) => c
          ? (
            <li key={i} className={`${c.treinou ? 'treinou' : ''} ${c.hoje ? 'hoje' : ''}`}
              aria-label={`${c.dia} de ${MESES[mes].toLowerCase()}, ${NOMES_DIAS[i % 7]}${c.treinou ? ', treinou' : ''}`}>
              <span aria-hidden="true">{c.dia}</span>
            </li>
          )
          : <li key={i} className="vazia" aria-hidden="true" />)}
      </ol>
    </div>
  );
}

function DetalheTreino({ id }: { id: string }) {
  const treinos = useLista('treinos');
  const series = useLista('treino_series');
  const exercicios = useLista('ficha_exercicios');
  if (!treinos || !series || !exercicios) return null;

  const treino = treinos.find((t) => t.id === id && t.fim);
  if (!treino) {
    return (
      <>
        <a className="voltar" href={ROTA}><IconeVoltar /> Acompanhamento</a>
        <p className="fraco vazio">Esse treino não existe mais.</p>
      </>
    );
  }

  const grupos = seriesPorExercicio(treino, series, exercicios);
  const total = grupos.reduce((n, g) => n + g.series.length, 0);
  const volume = Math.round(grupos.flatMap((g) => g.series).reduce((v, s) => v + (s.carga ?? 0) * (s.reps ?? 0), 0) * 100) / 100;
  const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <a className="voltar" href={ROTA}><IconeVoltar /> Acompanhamento</a>
      <h1 className="treino-titulo">{treino.nome_ficha}</h1>
      <p className="fraco">
        {dataCurta(treino.inicio)} · {hora(treino.inicio)}–{hora(treino.fim!)} · {duracaoCurta(treino.duracao_seg ?? 0)}
      </p>
      <p className="fraco">{total === 1 ? '1 série' : `${total} séries`} · volume {volume > 0 ? `${volume.toLocaleString('pt-BR')} kg` : '—'}</p>

      {grupos.length === 0
        ? <p className="fraco vazio">Nenhuma série marcada neste treino.</p>
        : (
          <ul className="lista lista-exercicios detalhe-historico">
            {grupos.map((g) => (
              <li key={g.nome} className="cartao">
                <p className="item-nome quebra">{g.nome}</p>
                <table className="tabela-series">
                  <thead>
                    <tr><th scope="col">Série</th><th scope="col">Carga</th><th scope="col">Reps</th><th scope="col">Descanso</th></tr>
                  </thead>
                  <tbody>
                    {g.series.map((s) => (
                      <tr key={s.id}>
                        <td>{s.serie_n}</td>
                        <td>{s.carga !== null ? `${kg(s.carga)} kg` : '—'}</td>
                        <td>{s.reps ?? '—'}</td>
                        <td>{s.descanso_seg !== null ? cronometro(s.descanso_seg) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
