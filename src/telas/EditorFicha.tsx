import { useState, type ReactNode } from 'react';
import { useDados, useLista } from '../dados/contexto';
import { proximaOrdem, renumerar, reordenar } from '../dados/ordem';
import type { FichaExercicio, FichaSerie } from '../dados/tipos';
import ListaOrdenavel from '../componentes/ListaOrdenavel';
import { CampoNumero, CampoTexto } from '../componentes/Campos';
import { IconeMais, IconeVoltar, IconeX } from '../icones';

// Exercício novo já vem com 3 séries de 8–12 reps e 90 s de descanso (o usuário ajusta).
const PADRAO = { descanso_seg: 90, series: 3, reps_min: 8, reps_max: 12 };

const porOrdem = (a: { ordem: number; criado_em: string }, b: { ordem: number; criado_em: string }) =>
  a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em);

// Edição de uma ficha: nome, exercícios (nome, descanso, observação) e séries (reps mín/máx, carga alvo).
// Tudo salva sozinho; arrastar pela alça muda a ordem de exercícios e séries.
export default function EditorFicha({ id }: { id: string }) {
  const dados = useDados();
  const fichas = useLista('fichas');
  const exercicios = useLista('ficha_exercicios');
  const series = useLista('ficha_series');
  const [fichaNova] = useState(() => {
    const nova = sessionStorage.getItem('ficha-nova') === id;
    sessionStorage.removeItem('ficha-nova');
    return nova;
  });
  const [exercicioNovo, setExercicioNovo] = useState<string | null>(null);

  if (!fichas || !exercicios || !series) return null;
  const ficha = fichas.find((f) => f.id === id);
  if (!ficha) {
    return (
      <>
        <Voltar />
        <p className="fraco vazio">Essa ficha não existe mais.</p>
      </>
    );
  }

  const daFicha = exercicios.filter((e) => e.ficha_id === id).sort(porOrdem);

  async function adicionarExercicio() {
    const e = await dados.salvar('ficha_exercicios', {
      ficha_id: id, nome: 'Novo exercício', ordem: proximaOrdem(daFicha), descanso_seg: PADRAO.descanso_seg, observacao: null,
    });
    await dados.salvarVarios('ficha_series', Array.from({ length: PADRAO.series }, (_, i) => ({
      ficha_exercicio_id: e.id, serie_n: i + 1, reps_min: PADRAO.reps_min, reps_max: PADRAO.reps_max, carga_alvo: null,
    })));
    setExercicioNovo(e.id);
  }

  async function excluirFicha() {
    if (!confirm(`Excluir a ficha "${ficha!.nome}" com todos os exercícios?`)) return;
    await dados.excluir('fichas', id);
    location.hash = '#/fichas';
  }

  return (
    <>
      <Voltar />
      <CampoTexto className="campo-titulo" valor={ficha.nome} obrigatorio maxLength={100} aria-label="Nome da ficha"
        selecionar={fichaNova} aoSalvar={(nome) => void dados.salvar('fichas', { id, nome: nome! })} />

      {daFicha.length === 0
        ? <p className="fraco vazio">Nenhum exercício ainda.</p>
        : (
          <ListaOrdenavel
            className="lista lista-exercicios"
            itens={daFicha}
            nome={(e) => e.nome}
            aoMover={(de, para) => void dados.salvarVarios('ficha_exercicios', reordenar(daFicha, de, para, 'ordem'))}
            render={(e, alca) => (
              <CartaoExercicio exercicio={e} alca={alca} novo={e.id === exercicioNovo}
                series={series.filter((s) => s.ficha_exercicio_id === e.id).sort((a, b) => a.serie_n - b.serie_n)} />
            )}
          />
        )}

      <button type="button" className="botao-secundario" onClick={() => void adicionarExercicio()}>
        <IconeMais /> Adicionar exercício
      </button>
      <button type="button" className="botao-perigo" onClick={() => void excluirFicha()}>Excluir ficha</button>
    </>
  );
}

function Voltar() {
  return <a className="voltar" href="#/fichas"><IconeVoltar /> Fichas</a>;
}

function CartaoExercicio({ exercicio: e, series, alca, novo }: {
  exercicio: FichaExercicio; series: FichaSerie[]; alca: ReactNode; novo: boolean;
}) {
  const dados = useDados();
  const salvar = (campos: Partial<FichaExercicio>) => void dados.salvar('ficha_exercicios', { id: e.id, ...campos });

  // Mínimo maior que o máximo não passa no banco: o outro acompanha.
  const salvarSerie = (s: FichaSerie, campos: Partial<FichaSerie>) => {
    const novo = { ...s, ...campos };
    if (novo.reps_min !== null && novo.reps_max !== null && novo.reps_min > novo.reps_max) {
      if ('reps_min' in campos) campos.reps_max = novo.reps_min;
      else campos.reps_min = novo.reps_max;
    }
    void dados.salvar('ficha_series', { id: s.id, ...campos });
  };

  async function adicionarSerie() {
    const ultima = series[series.length - 1];
    await dados.salvar('ficha_series', {
      ficha_exercicio_id: e.id,
      serie_n: series.length + 1,
      reps_min: ultima?.reps_min ?? PADRAO.reps_min,
      reps_max: ultima?.reps_max ?? PADRAO.reps_max,
      carga_alvo: ultima?.carga_alvo ?? null,
    });
  }

  async function excluirSerie(s: FichaSerie) {
    await dados.excluir('ficha_series', s.id);
    await dados.salvarVarios('ficha_series', renumerar(series.filter((x) => x.id !== s.id), 'serie_n', 1));
  }

  async function excluirExercicio() {
    if (confirm(`Excluir o exercício "${e.nome}"?`)) await dados.excluir('ficha_exercicios', e.id);
  }

  return (
    <div className="cartao exercicio">
      <div className="exercicio-topo">
        {alca}
        <CampoTexto className="campo-nome" valor={e.nome} obrigatorio maxLength={100} aria-label="Nome do exercício"
          selecionar={novo} aoSalvar={(nome) => salvar({ nome: nome! })} />
        <button type="button" className="botao-icone pequeno" aria-label={`Excluir o exercício ${e.nome}`}
          onClick={() => void excluirExercicio()}><IconeX /></button>
      </div>

      <div className="exercicio-campos">
        <label className="campo-curto">
          <span>Descanso</span>
          <span className="com-unidade">
            <CampoNumero valor={e.descanso_seg} max={3600} aoSalvar={(v) => salvar({ descanso_seg: v })}
              aria-label={`Descanso de ${e.nome}, em segundos`} />
            <span aria-hidden="true">s</span>
          </span>
        </label>
        <CampoTexto className="campo-obs" valor={e.observacao} maxLength={500} placeholder="Observação (opcional)"
          aria-label={`Observação de ${e.nome}`} aoSalvar={(observacao) => salvar({ observacao })} />
      </div>

      {series.length > 0 && (
        <div className="series" role="group" aria-label={`Séries de ${e.nome}`}>
          <div className="serie-linha serie-cabecalho" aria-hidden="true">
            <span /><span>Série</span><span>Reps mín</span><span>Reps máx</span><span>Carga kg</span><span />
          </div>
          <ListaOrdenavel
            className="lista-series"
            itens={series}
            nome={(s) => `série ${s.serie_n}`}
            aoMover={(de, para) => void dados.salvarVarios('ficha_series', reordenar(series, de, para, 'serie_n', 1))}
            render={(s, alcaSerie) => (
              <div className="serie-linha">
                {alcaSerie}
                <span className="serie-n">{s.serie_n}</span>
                <CampoNumero valor={s.reps_min} max={1000} aria-label={`Série ${s.serie_n}: repetições mínimas`}
                  aoSalvar={(v) => salvarSerie(s, { reps_min: v })} />
                <CampoNumero valor={s.reps_max} max={1000} aria-label={`Série ${s.serie_n}: repetições máximas`}
                  aoSalvar={(v) => salvarSerie(s, { reps_max: v })} />
                <CampoNumero valor={s.carga_alvo} max={1000} decimal placeholder="—"
                  aria-label={`Série ${s.serie_n}: carga alvo em kg`} aoSalvar={(v) => salvarSerie(s, { carga_alvo: v })} />
                <button type="button" className="botao-icone pequeno" aria-label={`Excluir a série ${s.serie_n}`}
                  onClick={() => void excluirSerie(s)}><IconeX /></button>
              </div>
            )}
          />
        </div>
      )}

      <button type="button" className="link link-mais" onClick={() => void adicionarSerie()}>
        <IconeMais /> Série
      </button>
    </div>
  );
}
