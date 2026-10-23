import { createClient, type AuthError } from '@supabase/supabase-js';
import { SUPABASE_CHAVE_PUBLICAVEL, SUPABASE_URL } from './config/supabase';

// Link de e-mail vencido ou inválido volta com #error=...: lido ANTES do cliente limpar o endereço.
function lerErroDoLink(): string | null {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.get('error') && !p.get('error_code')) return null;
  history.replaceState(null, '', location.pathname + location.search);
  return p.get('error_code') === 'otp_expired'
    ? 'Esse link venceu ou já foi usado. Peça um novo.'
    : 'Não deu para abrir esse link. Tente de novo.';
}
export const erroDoLink = lerErroDoLink();

// Sessão guardada no aparelho (localStorage) e renovada sozinha.
// Fluxo "implicit" (padrão): o link do e-mail funciona mesmo aberto em outro navegador do celular.
export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICAVEL, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Endereço do app (local ou publicado) para os links dos e-mails; precisa estar nas Redirect URLs.
export const enderecoDoApp = () => location.origin + import.meta.env.BASE_URL;

const MENSAGENS: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Falta confirmar o e-mail. Abra o link que enviamos para você.',
  weak_password: 'Senha fraca. Use pelo menos 8 caracteres.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  user_already_exists: 'Já existe uma conta com esse e-mail.',
  email_exists: 'Já existe uma conta com esse e-mail.',
  email_address_invalid: 'E-mail inválido.',
  email_address_not_authorized: 'Ainda não dá para enviar e-mail para esse endereço.',
  over_email_send_rate_limit: 'Muitos e-mails em pouco tempo. Espere alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  signup_disabled: 'O cadastro está fechado no momento.',
  validation_failed: 'Confira os dados digitados.',
};

export function mensagemDeErro(erro: AuthError | Error): string {
  const codigo = 'code' in erro ? erro.code : undefined;
  if (codigo && MENSAGENS[codigo]) return MENSAGENS[codigo];
  if (!navigator.onLine) return 'Sem internet. Conecte e tente de novo.';
  return 'Algo deu errado. Tente de novo.';
}
