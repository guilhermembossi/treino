import { useEffect, useState } from 'react';
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config/supabase';
import { supabase } from './supabase';

// Onde o supabase-js guarda a sessão no aparelho.
const CHAVE_SESSAO = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

// Sessão guardada no aparelho, mesmo com o acesso vencido. Usada só quando não deu para renovar
// por falta de internet: o app abre com os dados do celular e renova quando a internet voltar.
export function sessaoGuardada(armazenamento: Pick<Storage, 'getItem'> = localStorage): Session | null {
  try {
    const s = JSON.parse(armazenamento.getItem(CHAVE_SESSAO) ?? 'null');
    return s?.user?.id && s?.refresh_token ? (s as Session) : null;
  } catch {
    return null;
  }
}

// Sessão atual. `recuperacao` = entrou pelo link de "Esqueci a senha" e precisa escolher uma nova.
export function useSessao() {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [recuperacao, setRecuperacao] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      const semRede = error && (isAuthRetryableFetchError(error) || !navigator.onLine);
      setSessao(data.session ?? (semRede ? sessaoGuardada() : null));
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'SIGNED_OUT') {
        setSessao(null);
        setRecuperacao(false);
      } else if (s) {
        setSessao(s); // não troca por "sem sessão" num evento que só não conseguiu renovar
      }
      if (evento === 'PASSWORD_RECOVERY') setRecuperacao(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { carregando, sessao, recuperacao, fimDaRecuperacao: () => setRecuperacao(false) };
}

export function nomeDoUsuario(sessao: Session): string {
  const nome = sessao.user.user_metadata?.nome;
  return typeof nome === 'string' && nome.trim() ? nome.trim().split(/\s+/)[0] : '';
}
