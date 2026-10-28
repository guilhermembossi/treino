// Endereço do Supabase e chave PUBLICÁVEL (feita para ficar exposta; os dados são protegidos pelo RLS).
// Nunca colocar aqui a chave secreta / service_role.
export const SUPABASE_URL = 'https://ptxlgdbbycqwidpyywam.supabase.co';
export const SUPABASE_CHAVE_PUBLICAVEL = 'sb_publishable__MZLUObi1t8ojIfzsc8fwA_SKhNwif-';

// Ambiente (tarefa 8.2), decidido no build pelo vite.config.ts: produção (branch main) usa o schema "public";
// sandbox (outras branches e o PC) usa o schema "sandbox" do mesmo projeto. Login é o mesmo nos dois.
export const SANDBOX = import.meta.env.VITE_AMBIENTE !== 'producao';
export const ESQUEMA = SANDBOX ? 'sandbox' : 'public';
export const VERSAO: string = import.meta.env.VITE_VERSAO ?? 'local';
