// Modo demonstração, SÓ no ambiente de desenvolvimento (npm run dev, endereço com ?demo):
// abre o app logado com um usuário falso e um servidor em memória, para testar as telas sem conta.
// O main.tsx só importa este arquivo quando import.meta.env.DEV; ele não vai para o app publicado.
import type { Session } from '@supabase/supabase-js';
import { Casca } from './App';
import type { Base, Remoto } from './dados/tipos';

const servidor = new Map<string, Base>();

const remotoMemoria: Remoto = {
  async enviar(tabela, linhas) {
    for (const l of linhas) servidor.set(`${tabela}:${l.id}`, { ...l, sincronizado_em: new Date().toISOString() });
  },
  async buscar(tabela, desde) {
    return [...servidor.entries()]
      .filter(([k, l]) => k.startsWith(`${tabela}:`) && (!desde || l.sincronizado_em! > desde))
      .map(([, l]) => l);
  },
};

const sessao = {
  access_token: 'demo', refresh_token: 'demo', expires_in: 3600, token_type: 'bearer',
  user: { id: 'demo', email: 'demo@exemplo.invalid', user_metadata: { nome: 'Demo' } },
} as unknown as Session;

export default function Demo() {
  return <Casca sessao={sessao} remoto={remotoMemoria} />;
}
