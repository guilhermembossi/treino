import { useDados, useLista } from '../dados/contexto';
import { duracaoCurta, resumoTreino, treinoAberto, ultimaVez } from '../dados/treino';
import { IconeVoltar } from '../icones';

export const ROTA_RESUMO = '#/resumo/';

// Resumo ao finalizar (#/resumo/<id>): duração, séries feitas de quantas planejadas, volume (kg × reps)
// e o que mudou desde a última vez dessa ficha. O treino já foi salvo no Finalizar; "Salvar e sair" volta ao Início.
export default function ResumoTreino({ id }: { id: string }) {
  const dados = useDados();
  const treinos = useLista('treinos');
  const series = useLista('treino_series');
  const exercicios = useLista('ficha_exercicios');
  const planejadas = useLista('ficha_series');
  if (!treinos || !series || !exercicios || !planejadas) return null;

  const treino = treinos.find((t) => t.id === id);
  if (!treino) {
    return (
      <>
        <a className="voltar" href="#/"><IconeVoltar /> Início</a>
        <p className="fraco vazio">Esse treino não existe mais.</p>
      </>
    );
  }

  const doTreino = series.filter((s) => s.treino_id === id);
  const idsExercicios = new Set(exercicios.filter((e) => e.ficha_id === treino.ficha_id).map((e) => e.id));
  const nPlanejadas = planejadas.filter((p) => idsExercicios.has(p.ficha_exercicio_id)).length || doTreino.filter((s) => s.feita_em).length;
  // "Última vez" = antes deste treino (vale também para abrir um resumo antigo).
  const anteriores = treinos.filter((t) => t.inicio < treino.inicio);
  const r = resumoTreino(treino, nPlanejadas, doTreino, ultimaVez(treino.ficha_id, anteriores, series, id));
  const podeVoltar = !!treino.fim && !treinoAberto(treinos);

  async function voltarAoTreino() {
    await dados.salvar('treinos', { id, fim: null, duracao_seg: null });
    location.hash = '#/treino';
  }

  return (
    <>
      <p className="rotulo">Treino finalizado</p>
      <h1 className="treino-titulo">{treino.nome_ficha}</h1>
      <p className="fraco">{new Date(treino.inicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>

      <div className="numeros">
        <div className="cartao numero"><span className="numero-valor">{duracaoCurta(r.duracaoSeg)}</span><span className="numero-nome">Duração</span></div>
        <div className="cartao numero"><span className="numero-valor">{r.feitas} de {r.planejadas}</span><span className="numero-nome">Séries</span></div>
        <div className="cartao numero"><span className="numero-valor">{r.volumeKg.toLocaleString('pt-BR')} kg</span><span className="numero-nome">Volume</span></div>
      </div>

      <section className="cartao mudancas">
        <p className="rotulo">Desde a última vez</p>
        {r.primeiraVez
          ? <p className="fraco">Primeira vez com este treino. Na próxima, aparece aqui o que mudou.</p>
          : r.mudancas.length === 0
            ? <p className="fraco">Mesmas cargas e repetições da última vez.</p>
            : (
              <ul>
                {r.mudancas.map((m) => (
                  <li key={m.exercicio} className={m.direcao}>
                    <span className="seta" aria-hidden="true">{m.direcao === 'subiu' ? '▲' : '▼'}</span>
                    <span><strong>{m.exercicio}:</strong> {m.texto}</span>
                  </li>
                ))}
              </ul>
            )}
      </section>

      <a className="botao-primario botao-link" href="#/">Salvar e sair</a>
      {podeVoltar && <button type="button" className="link centro" onClick={() => void voltarAoTreino()}>Voltar ao treino</button>}
    </>
  );
}
