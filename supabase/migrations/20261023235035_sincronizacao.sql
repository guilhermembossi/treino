-- Tarefa 3.1: colunas e regra para a sincronização com o celular.
-- excluido_em: exclusão marcada (o app nunca apaga de verdade), para a exclusão feita offline chegar aos outros aparelhos.
-- sincronizado_em: hora do SERVIDOR da última gravação; o celular baixa só o que mudou desde a última vez
--   (não dá para usar atualizado_em, que vem do relógio do celular).
-- Regra: vale a alteração mais recente (atualizado_em). Uma versão mais antiga que chegue depois é ignorada.

create function public.ao_gravar_sincronizacao() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.atualizado_em < old.atualizado_em then
      return null; -- já existe versão mais nova: ignora esta, sem erro
    end if;
  end if;
  new.sincronizado_em := now();
  return new;
end;
$$;
revoke all on function public.ao_gravar_sincronizacao() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['fichas', 'ficha_exercicios', 'ficha_series', 'treinos', 'treino_series'] loop
    execute format('alter table public.%I add column excluido_em timestamptz', t);
    execute format('alter table public.%I add column sincronizado_em timestamptz not null default now()', t);
    execute format('create index %I on public.%I (user_id, sincronizado_em)', t || '_user_id_sincronizado_em_idx', t);
    execute format('create trigger sincronizacao before insert or update on public.%I
                    for each row execute function public.ao_gravar_sincronizacao()', t);
  end loop;
end;
$$;
