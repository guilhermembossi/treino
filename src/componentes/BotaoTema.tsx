import { useTema } from '../tema';
import { IconeLua, IconeSol } from '../icones';

// Sol/lua do topo: troca o tema e guarda a escolha no aparelho.
export default function BotaoTema() {
  const { tema, alternar } = useTema();
  const rotulo = tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro';
  return (
    <button className="botao-icone" onClick={alternar} aria-label={rotulo} title={rotulo}>
      {tema === 'escuro' ? <IconeSol /> : <IconeLua />}
    </button>
  );
}
