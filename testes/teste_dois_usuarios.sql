-- Tarefa 1.2, teste 2: o 2º usuário não vê nem altera nada do 1º (e o visitante, nada).
-- Cria dois usuários de teste (sem senha) e age como cada um, do mesmo jeito que a API faz
-- (papel "authenticated" + o id do usuário no token). No fim levanta um erro de propósito:
-- o resultado sai na mensagem e TUDO é desfeito (nenhum usuário ou dado de teste fica no banco).
-- Rodar no SQL do Supabase (MCP execute_sql ou SQL Editor).
-- Sandbox (tarefa 8.2): rodar de novo trocando "public." por "sandbox." (mesmo resultado esperado).
do $
declare
  u1  uuid := gen_random_uuid();  u2  uuid := gen_random_uuid();
  f1  uuid := gen_random_uuid();  e1  uuid := gen_random_uuid();  s1 uuid := gen_random_uuid();
  t1  uuid := gen_random_uuid();  ts1 uuid := gen_random_uuid();
  f2  uuid := gen_random_uuid();  e2  uuid := gen_random_uuid();  t2 uuid := gen_random_uuid();
  r   text[] := '{}';
  n   bigint;
  ok  int := 0;
  ruim int := 0;
  tab text;
begin
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', u1, 'authenticated', 'authenticated', 'teste1@exemplo.invalid', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u2, 'authenticated', 'authenticated', 'teste2@exemplo.invalid', now(), now());

  -- Usuário 1 cria uma ficha completa e um treino ---------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.fichas (id, nome) values (f1, 'Superior A');
  insert into public.ficha_exercicios (id, ficha_id, nome, descanso_seg) values (e1, f1, 'Supino', 90);
  insert into public.ficha_series (id, ficha_exercicio_id, serie_n, reps_min, reps_max, carga_alvo) values (s1, e1, 1, 8, 12, 20);
  insert into public.treinos (id, ficha_id, nome_ficha, inicio) values (t1, f1, 'Superior A', now());
  insert into public.treino_series (id, treino_id, exercicio_nome, serie_n, carga, reps) values (ts1, t1, 'Supino', 1, 20, 10);
  select (select count(*) from public.fichas) + (select count(*) from public.ficha_exercicios)
       + (select count(*) from public.ficha_series) + (select count(*) from public.treinos)
       + (select count(*) from public.treino_series) into n;
  if n = 5 then ok := ok + 1; r := r || text 'OK      usuário 1 vê os próprios 5 registros';
  else ruim := ruim + 1; r := r || ('FALHOU  usuário 1 vê ' || n || ' registros (esperado 5)'); end if;

  -- Usuário 2 tenta ler, alterar e apagar os dados do 1 ----------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  foreach tab in array array['fichas', 'ficha_exercicios', 'ficha_series', 'treinos', 'treino_series'] loop
    execute format('select count(*) from public.%I', tab) into n;
    if n = 0 then ok := ok + 1; r := r || ('OK      usuário 2 lê ' || tab || ': 0 linhas');
    else ruim := ruim + 1; r := r || ('FALHOU  usuário 2 lê ' || tab || ': ' || n || ' linhas'); end if;

    execute format('update public.%I set atualizado_em = now() where true', tab);
    get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; r := r || ('OK      usuário 2 altera ' || tab || ': 0 linhas');
    else ruim := ruim + 1; r := r || ('FALHOU  usuário 2 altera ' || tab || ': ' || n || ' linhas'); end if;

    execute format('delete from public.%I where true', tab);
    get diagnostics n = row_count;
    if n = 0 then ok := ok + 1; r := r || ('OK      usuário 2 apaga ' || tab || ': 0 linhas');
    else ruim := ruim + 1; r := r || ('FALHOU  usuário 2 apaga ' || tab || ': ' || n || ' linhas'); end if;
  end loop;

  -- Usuário 2 tenta gravar em nome do 1 ou pendurar dados nas coisas do 1 -----------
  begin insert into public.fichas (nome, user_id) values ('x', u1);
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 criou ficha em nome do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 cria ficha em nome do 1: recusado'; end;

  begin insert into public.ficha_exercicios (ficha_id, nome) values (f1, 'x');
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 pôs exercício na ficha do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 põe exercício na ficha do 1: recusado'; end;

  begin insert into public.ficha_series (ficha_exercicio_id, serie_n) values (e1, 2);
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 pôs série no exercício do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 põe série no exercício do 1: recusado'; end;

  begin insert into public.treinos (ficha_id, nome_ficha, inicio) values (f1, 'x', now());
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 criou treino com a ficha do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 cria treino com a ficha do 1: recusado'; end;

  begin insert into public.treino_series (treino_id, exercicio_nome, serie_n) values (t1, 'x', 2);
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 pôs série no treino do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 põe série no treino do 1: recusado'; end;

  -- Usuário 2 cria as próprias coisas (deve conseguir) e tenta mudar o dono ou o pai
  insert into public.fichas (id, nome) values (f2, 'Minha ficha');
  insert into public.ficha_exercicios (id, ficha_id, nome) values (e2, f2, 'Agachamento');
  insert into public.treinos (id, ficha_id, nome_ficha, inicio) values (t2, f2, 'Minha ficha', now());
  ok := ok + 1; r := r || text 'OK      usuário 2 cria as próprias ficha, exercício e treino';

  begin update public.fichas set user_id = u1 where id = f2;
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 passou a ficha dele para o 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 passa a própria ficha para o 1: recusado'; end;

  begin update public.ficha_exercicios set ficha_id = f1 where id = e2;
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 moveu exercício para a ficha do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 move exercício para a ficha do 1: recusado'; end;

  begin update public.treinos set ficha_id = f1 where id = t2;
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 ligou o treino dele à ficha do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 liga o próprio treino à ficha do 1: recusado'; end;

  -- Visitante (sem login) ------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  foreach tab in array array['fichas', 'ficha_exercicios', 'ficha_series', 'treinos', 'treino_series'] loop
    begin execute format('select count(*) from public.%I', tab) into n;
      ruim := ruim + 1; r := r || ('FALHOU  visitante leu ' || tab);
    exception when insufficient_privilege then ok := ok + 1; r := r || ('OK      visitante lê ' || tab || ': recusado'); end;
  end loop;

  -- Usuário 1 confere que nada dele mudou --------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select (select count(*) from public.fichas where nome = 'Superior A') + (select count(*) from public.ficha_exercicios)
       + (select count(*) from public.ficha_series) + (select count(*) from public.treinos)
       + (select count(*) from public.treino_series) into n;
  if n = 5 then ok := ok + 1; r := r || text 'OK      usuário 1 continua com os 5 registros intactos';
  else ruim := ruim + 1; r := r || ('FALHOU  usuário 1 agora vê ' || n || ' registros'); end if;

  reset role;
  raise exception '%', E'RESULTADO (tudo desfeito, nada fica no banco)\n'
    || array_to_string(r, E'\n') || E'\n' || ok || ' OK, ' || ruim || ' FALHOU';
end $$;
