import { useEffect, useState, type ReactNode } from 'react';
import { marca, logoSvg } from './config/marca';
import { useTema } from './tema';
import { IconeFichas, IconeHistorico, IconeInicio, IconeLua, IconeSol } from './icones';
import Inicio from './telas/Inicio';
import Historico from './telas/Historico';
import Fichas from './telas/Fichas';

type Aba = 'inicio' | 'historico' | 'fichas';

// Navegação pelo # do endereço (#/historico): funciona no GitHub Pages e o botão voltar do celular volta de aba.
const ABAS: { id: Aba; rota: string; nome: string; icone: () => ReactNode; tela: () => ReactNode }[] = [
  { id: 'inicio', rota: '#/', nome: 'Início', icone: IconeInicio, tela: Inicio },
  { id: 'historico', rota: '#/historico', nome: 'Histórico', icone: IconeHistorico, tela: Historico },
  { id: 'fichas', rota: '#/fichas', nome: 'Fichas', icone: IconeFichas, tela: Fichas },
];

const abaDoEndereco = (): Aba =>
  ABAS.find((a) => a.rota === location.hash && a.id !== 'inicio')?.id ?? 'inicio';

const logo = `data:image/svg+xml,${encodeURIComponent(logoSvg(marca.icone.fundo, marca.icone.desenho))}`;

export default function App() {
  const [aba, setAba] = useState<Aba>(abaDoEndereco);
  const { tema, alternar } = useTema();

  useEffect(() => {
    const aoMudar = () => setAba(abaDoEndereco());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const atual = ABAS.find((a) => a.id === aba)!;
  const rotuloTema = tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro';

  return (
    <div className="app">
      <header className="topo">
        <div className="marca">
          <img src={logo} alt="" width={28} height={28} />
          <span>{marca.nome}</span>
        </div>
        <button className="botao-icone" onClick={alternar} aria-label={rotuloTema} title={rotuloTema}>
          {tema === 'escuro' ? <IconeSol /> : <IconeLua />}
        </button>
      </header>

      <main className="conteudo">{atual.tela()}</main>

      <nav className="barra" aria-label="Navegação principal">
        {ABAS.map((a) => (
          <a key={a.id} href={a.rota} className="barra-item" aria-current={a.id === aba ? 'page' : undefined}>
            {a.icone()}
            <span>{a.nome}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
