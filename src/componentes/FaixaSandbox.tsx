import { SANDBOX } from '../config/supabase';

// Faixa no topo quando o app é o do sandbox (tarefa 8.2): dados de teste, separados da produção.
export default function FaixaSandbox() {
  if (!SANDBOX) return null;
  return <div className="faixa-sandbox" role="note">SANDBOX · dados de teste</div>;
}
