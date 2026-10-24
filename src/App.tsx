import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { marca } from './config/marca';
import { useSessao } from './sessao';
import { ProvedorDados } from './dados/contexto';
import type { Remoto } from './dados/tipos';
import { IconeFichas, IconeHistorico, IconeInicio } from './icones';
import Logo from './componentes/Logo';
import BotaoTema from './componentes/BotaoTema';
import IndicadorSync from './componentes/IndicadorSync';
import Acesso from './telas/Acesso';
import Inicio, { ROTA_TREINO } from './telas/Inicio';
import Treino from './telas/Treino';
import ResumoTreino, { ROTA_RESUMO } from './telas/ResumoTreino';
import Historico from './telas/Historico';
import Fichas from './telas/Fichas';

type Aba = 'inicio' | 'historico' | 'fichas';

// Navegação pelo # do endereço (#/historico, #/fichas/<id>): funciona no GitHub Pages
// e o botão voltar do celular volta de tela.
const ABAS: { id: Aba; rota: string; nome: string; icone: () => ReactNode; tela: (s: Session) => ReactNode }[] = [
  { id: 'inicio', rota: '#/', nome: 'Início', icone: IconeInicio, tela: (s) => <Inicio sessao={s} /> },
  { id: 'historico', rota: '#/historico', nome: 'Histórico', icone: IconeHistorico, tela: () => <Historico /> },
  { id: 'fichas', rota: '#/fichas', nome: 'Fichas', icone: IconeFichas, tela: () => <Fichas /> },
];

const abaDoEndereco = (): Aba =>
  ABAS.find((a) => a.id !== 'inicio' && (location.hash === a.rota || location.hash.startsWith(a.rota + '/')))?.id ?? 'inicio';

export default function App() {
  const { carregando, sessao, recuperacao, fimDaRecuperacao } = useSessao();
  if (carregando) return <div className="carregando" aria-busy="true"><Logo tamanho={64} /></div>;
  if (!sessao || recuperacao) return <Acesso novaSenha={recuperacao} aoTrocarSenha={fimDaRecuperacao} />;
  return <Casca sessao={sessao} />;
}

// O app de quem já entrou: topo, tela da aba e barra de baixo.
export function Casca({ sessao, remoto }: { sessao: Session; remoto?: Remoto }) {
  const [aba, setAba] = useState<Aba>(abaDoEndereco);
  const [hash, setHash] = useState(location.hash);

  useEffect(() => {
    const aoMudar = () => { setAba(abaDoEndereco()); setHash(location.hash); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <ProvedorDados userId={sessao.user.id} remoto={remoto}>
      <div className="app">
        <header className="topo">
          <div className="marca">
            <Logo tamanho={28} />
            <span>{marca.nome}</span>
          </div>
          <div className="topo-acoes">
            <IndicadorSync />
            <BotaoTema />
          </div>
        </header>

        <main className="conteudo">
          {hash.startsWith(ROTA_TREINO) ? <Treino />
            : hash.startsWith(ROTA_RESUMO) ? <ResumoTreino key={hash} id={hash.slice(ROTA_RESUMO.length)} />
              : atual.tela(sessao)}
        </main>

        <nav className="barra" aria-label="Navegação principal">
          {ABAS.map((a) => (
            <a key={a.id} href={a.rota} className="barra-item" aria-current={a.id === aba ? 'page' : undefined}>
              {a.icone()}
              <span>{a.nome}</span>
            </a>
          ))}
        </nav>
      </div>
    </ProvedorDados>
  );
}
