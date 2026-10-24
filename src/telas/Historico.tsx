import { useEffect, useState } from 'react';
import { useLista } from '../dados/contexto';
import { MESES, dataCurta, gradeDoMes, seriesPorExercicio, treinosDoMes } from '../dados/historico';
import { cronometro, duracaoCurta, kg } from '../dados/treino';
import { IconeSeta, IconeVoltar } from '../icones';

const ROTA = '#/historico';
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NOMES_DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

// Histórico (tarefa 6.1): calendário do mês com os dias treinados e a lista (#/historico),
// e o detalhe de um treino com cada série (#/historico/<id>).
export default function Historico() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const aoMudar = () => setHash(location.hash);
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  const id = hash.startsWith(`${ROTA}/`) ? hash.slice(ROTA.length + 1) : null;
  return id ? <DetalheTreino key={id} id={id} /> : <Lista />;
}

// O mês escolhido fica guardado enquanto o app está aberto (voltar do detalhe não volta para o mês atual).
let mesEscolhido: { ano: number; mes: number } | null = null;

function Lista() {
  const treinos = useLista('treinos');
  const hoje = new Date();
  const [{ ano, mes }, setMes] = useState(() => mesEscolhido ?? { ano: hoje.getFullYear(), mes: hoje.getMonth() });
  if (!treinos) return null;

  const mudar = (delta: number) => {
    const d = new Date(ano, mes + delta, 1);
    mesEscolhido = { ano: d.getFullYear(), mes: d.getMonth() };
    setMes(mesEscolhido);
  };
  const doMes = treinosDoMes(treinos, ano, mes);
  const casas = gradeDoMes(treinos, ano, mes);
  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth();

  return (
    <>
      <h1>Histórico</h1>
      <section className="cartao calendario" aria-label={`Calendário de ${MESES[mes]} de ${ano}`}>
        <div className="calendario-topo">
          <button type="button" className="botao-icone pequeno" onClick={() => mudar(-1)} aria-label="Mês anterior"><IconeVoltar /></button>
          <p className="calendario-mes">{MESES[mes]} {ano}</p>
          <button type="button" className="botao-icone pequeno" onClick={() => mudar(1)} aria-label="Próximo mês" disabled={ehMesAtual}><IconeSeta /></button>
        </div>
        <div className="calendario-grade" aria-hidden="true">
          {LETRAS.map((l, i) => <span key={i} className="calendario-letra">{l}</span>)}
        </div>
        <ol className="calendario-grade">
          {casas.map((c, i) => c
            ? (
              <li key={i} className={`${c.treinou ? 'treinou' : ''} ${c.hoje ? 'hoje' : ''}`}
                aria-label={`${c.dia} de ${MESES[mes].toLowerCase()}, ${NOMES_DIAS[i % 7]}${c.treinou ? ', treinou' : ''}`}>
                <span aria-hidden="true">{c.dia}</span>
              </li>
            )
            : <li key={i} className="vazia" aria-hidden="true" />)}
        </ol>
        <p className="fraco calendario-total">{doMes.length === 1 ? '1 treino' : `${doMes.length} treinos`} no mês</p>
      </section>

      {doMes.length === 0
        ? <p className="fraco vazio">Nenhum treino finalizado neste mês.</p>
        : (
          <ul className="lista lista-historico">
            {doMes.map((t) => (
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

function DetalheTreino({ id }: { id: string }) {
  const treinos = useLista('treinos');
  const series = useLista('treino_series');
  const exercicios = useLista('ficha_exercicios');
  if (!treinos || !series || !exercicios) return null;

  const treino = treinos.find((t) => t.id === id && t.fim);
  if (!treino) {
    return (
      <>
        <a className="voltar" href={ROTA}><IconeVoltar /> Histórico</a>
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
      <a className="voltar" href={ROTA}><IconeVoltar /> Histórico</a>
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
