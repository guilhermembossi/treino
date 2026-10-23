import { supabase } from '../supabase';
import { ErroRemoto, type Base, type Remoto, type Tabela } from './tipos';

const PAGINA = 500;

// Sem `code` no erro = a requisição nem chegou ao servidor (sem internet).
const erro = (e: { message: string; code?: string }) =>
  new ErroRemoto(e.message, !e.code || !navigator.onLine);

// Supabase de verdade. O RLS garante que só os registros do usuário logado são lidos e gravados.
export const remotoSupabase: Remoto = {
  async enviar(tabela: Tabela, linhas: Base[]) {
    const { error } = await supabase.from(tabela).upsert(linhas, { onConflict: 'id' });
    if (error) throw erro(error);
  },

  async buscar(tabela: Tabela, desde: string | null) {
    const todas: Base[] = [];
    for (let de = 0; ; de += PAGINA) {
      let q = supabase.from(tabela).select('*').order('sincronizado_em').order('id').range(de, de + PAGINA - 1);
      if (desde) q = q.gt('sincronizado_em', desde);
      const { data, error } = await q;
      if (error) throw erro(error);
      todas.push(...(data as Base[]));
      if (data.length < PAGINA) return todas;
    }
  },
};
