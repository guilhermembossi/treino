import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Sessão atual. `recuperacao` = entrou pelo link de "Esqueci a senha" e precisa escolher uma nova.
export function useSessao() {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [recuperacao, setRecuperacao] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === 'PASSWORD_RECOVERY') setRecuperacao(true);
      if (evento === 'SIGNED_OUT') setRecuperacao(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { carregando, sessao, recuperacao, fimDaRecuperacao: () => setRecuperacao(false) };
}

export function nomeDoUsuario(sessao: Session): string {
  const nome = sessao.user.user_metadata?.nome;
  return typeof nome === 'string' && nome.trim() ? nome.trim().split(/\s+/)[0] : '';
}
