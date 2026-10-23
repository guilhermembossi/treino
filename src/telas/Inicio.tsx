import type { Session } from '@supabase/supabase-js';
import { nomeDoUsuario } from '../sessao';
import { supabase } from '../supabase';

// Tela inicial. O cartão "Próximo treino" de verdade chega na tarefa 5.1.
export default function Inicio({ sessao }: { sessao: Session }) {
  const nome = nomeDoUsuario(sessao);
  return (
    <>
      <h1>{nome ? `Olá, ${nome}` : 'Olá!'}</h1>
      <section className="cartao">
        <p className="rotulo">Próximo treino</p>
        <p>As fichas e o treino do dia chegam nas próximas etapas.</p>
        <button className="botao-primario" disabled>Começar treino</button>
      </section>
      <p className="rodape-conta">
        {sessao.user.email} ·{' '}
        <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Sair</button>
      </p>
    </>
  );
}
