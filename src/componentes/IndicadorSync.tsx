import { useDados, useEstadoSync } from '../dados/contexto';

const TEXTOS = {
  ok: 'Sincronizado',
  sincronizando: 'Sincronizando…',
  offline: 'Sem internet',
  erro: 'Erro ao sincronizar',
} as const;

// Indicador discreto do topo. Tocar força uma sincronização.
export default function IndicadorSync() {
  const dados = useDados();
  const { situacao, pendentes } = useEstadoSync();
  const texto = situacao === 'pendente'
    ? `${pendentes} pendente${pendentes > 1 ? 's' : ''}`
    : situacao === 'offline' && pendentes
      ? `Sem internet · ${pendentes} pendente${pendentes > 1 ? 's' : ''}`
      : TEXTOS[situacao];
  return (
    <button type="button" className={`sync sync-${situacao}`} onClick={() => void dados.sincronizar()}
      aria-label={`${texto}. Tocar para sincronizar agora`} title="Tocar para sincronizar agora">
      <span className="sync-ponto" aria-hidden="true" />
      <span>{texto}</span>
    </button>
  );
}
