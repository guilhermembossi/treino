-- Tarefa 3.1: regra da sincronização no banco (gatilho ao_gravar_sincronizacao).
-- Mesmo esquema do teste_dois_usuarios.sql: usuário de teste sem senha, papel "authenticated",
-- gravação por "insert ... on conflict do update" (o que a API faz no upsert) e erro proposital no fim
-- (resultado na mensagem, tudo desfeito). Esperado: "6 OK, 0 FALHOU".
-- Sandbox (tarefa 8.2): rodar de novo trocando "public." por "sandbox." (mesmo resultado esperado).
do $
declare
  u  uuid := gen_random_uuid();
  f  uuid := gen_random_uuid();
  r  text[] := '{}';
  ok int := 0;
  ruim int := 0;
  v  record;
  s1 timestamptz;
begin
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', u, 'authenticated', 'authenticated', 'teste1@exemplo.invalid', now(), now());
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- 1. Cliente manda sincronizado_em antigo: o servidor põe a hora dele.
  insert into public.fichas (id, nome, atualizado_em, sincronizado_em)
    values (f, 'Versão das 10h', '2026-10-23 10:00+00', '2000-01-01+00');
  select * into v from public.fichas where id = f;
  if v.sincronizado_em > now() - interval '1 minute' then ok := ok + 1; r := r || text 'OK      hora do servidor em sincronizado_em';
  else ruim := ruim + 1; r := r || ('FALHOU  sincronizado_em = ' || v.sincronizado_em); end if;
  s1 := v.sincronizado_em;

  -- 2. Versão mais antiga (9h) chegando depois: ignorada, sem erro.
  insert into public.fichas (id, nome, atualizado_em) values (f, 'Versão das 9h', '2026-10-23 09:00+00')
    on conflict (id) do update set nome = excluded.nome, atualizado_em = excluded.atualizado_em;
  select * into v from public.fichas where id = f;
  if v.nome = 'Versão das 10h' then ok := ok + 1; r := r || text 'OK      versão mais antiga ignorada';
  else ruim := ruim + 1; r := r || ('FALHOU  ficou ' || v.nome); end if;

  -- 3. Versão mais nova (11h): vale.
  insert into public.fichas (id, nome, atualizado_em) values (f, 'Versão das 11h', '2026-10-23 11:00+00')
    on conflict (id) do update set nome = excluded.nome, atualizado_em = excluded.atualizado_em;
  select * into v from public.fichas where id = f;
  if v.nome = 'Versão das 11h' then ok := ok + 1; r := r || text 'OK      versão mais nova grava';
  else ruim := ruim + 1; r := r || ('FALHOU  ficou ' || v.nome); end if;

  -- 4. Mesma hora (reenvio da mesma versão): aceita, sem erro.
  insert into public.fichas (id, nome, atualizado_em) values (f, 'Versão das 11h', '2026-10-23 11:00+00')
    on conflict (id) do update set nome = excluded.nome, atualizado_em = excluded.atualizado_em;
  ok := ok + 1; r := r || text 'OK      reenvio da mesma versão aceito';

  -- 5. Exclusão marcada sincroniza como qualquer alteração.
  insert into public.fichas (id, nome, atualizado_em, excluido_em) values (f, 'Versão das 11h', '2026-10-23 12:00+00', '2026-10-23 12:00+00')
    on conflict (id) do update set excluido_em = excluded.excluido_em, atualizado_em = excluded.atualizado_em;
  select * into v from public.fichas where id = f;
  if v.excluido_em is not null then ok := ok + 1; r := r || text 'OK      exclusão marcada gravada';
  else ruim := ruim + 1; r := r || text 'FALHOU  exclusão não gravada'; end if;

  -- 6. A função do gatilho não pode ser chamada direto pelo usuário.
  begin
    perform public.ao_gravar_sincronizacao();
    ruim := ruim + 1; r := r || text 'FALHOU  usuário chamou a função do gatilho';
  exception when others then ok := ok + 1; r := r || text 'OK      função do gatilho fechada ao usuário';
  end;

  reset role;
  raise exception '%', E'RESULTADO (tudo desfeito, nada fica no banco)\n'
    || array_to_string(r, E'\n') || E'\n' || ok || ' OK, ' || ruim || ' FALHOU';
end $$;
