-- Tarefa 8.7: segurança da biblioteca de vídeos (tabela videos). Mesmo esquema do teste_dois_usuarios.sql:
-- usuários de teste sem senha, papel "authenticated", erro proposital no fim (resultado na mensagem, tudo desfeito).
-- Rodar no sandbox como está; na produção, trocar "sandbox." por "public.". Esperado: "12 OK, 0 FALHOU".
do $$
declare
  u1 uuid := gen_random_uuid();  u2 uuid := gen_random_uuid();  v1 uuid := gen_random_uuid();
  r text[] := '{}';  n bigint;  ok int := 0;  ruim int := 0;  link text;
begin
  insert into auth.users (instance_id, id, aud, role, email, created_at, updated_at) values
    ('00000000-0000-0000-0000-000000000000', u1, 'authenticated', 'authenticated', 'teste1@exemplo.invalid', now(), now()),
    ('00000000-0000-0000-0000-000000000000', u2, 'authenticated', 'authenticated', 'teste2@exemplo.invalid', now(), now());

  -- Usuário 1 guarda um vídeo
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into sandbox.videos (id, nome, chave, url) values (v1, 'Supino reto', 'supino reto', 'https://www.youtube.com/watch?v=abc123');
  ok := ok + 1; r := r || text 'OK      usuário 1 guarda vídeo do YouTube';

  -- Links que o banco tem que recusar
  foreach link in array array['http://www.youtube.com/watch?v=x', 'https://youtube.com.golpe.com/x', 'https://golpe.com/youtube.com/x',
                                'javascript:alert(1)', 'https://youtu.be/x"><script>'] loop
    begin insert into sandbox.videos (nome, chave, url) values ('x', 'x', link);
      ruim := ruim + 1; r := r || ('FALHOU  aceitou o link ' || link);
    exception when check_violation then ok := ok + 1; r := r || ('OK      recusa ' || link); end;
  end loop;

  -- Usuário 2 não vê, não altera, não apaga e não grava em nome do 1
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from sandbox.videos;
  if n = 0 then ok := ok + 1; r := r || text 'OK      usuário 2 lê: 0 linhas'; else ruim := ruim + 1; r := r || ('FALHOU  usuário 2 lê ' || n); end if;
  update sandbox.videos set url = 'https://youtu.be/troca' where true; get diagnostics n = row_count;
  if n = 0 then ok := ok + 1; r := r || text 'OK      usuário 2 altera: 0 linhas'; else ruim := ruim + 1; r := r || ('FALHOU  usuário 2 alterou ' || n); end if;
  delete from sandbox.videos where true; get diagnostics n = row_count;
  if n = 0 then ok := ok + 1; r := r || text 'OK      usuário 2 apaga: 0 linhas'; else ruim := ruim + 1; r := r || ('FALHOU  usuário 2 apagou ' || n); end if;
  begin insert into sandbox.videos (nome, chave, url, user_id) values ('x', 'x', 'https://youtu.be/x', u1);
    ruim := ruim + 1; r := r || text 'FALHOU  usuário 2 gravou em nome do 1';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      usuário 2 grava em nome do 1: recusado'; end;

  -- Visitante
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin select count(*) into n from sandbox.videos;
    ruim := ruim + 1; r := r || text 'FALHOU  visitante leu videos';
  exception when insufficient_privilege then ok := ok + 1; r := r || text 'OK      visitante lê: recusado'; end;

  -- Usuário 1 continua com o vídeo dele
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from sandbox.videos where url = 'https://www.youtube.com/watch?v=abc123';
  if n = 1 then ok := ok + 1; r := r || text 'OK      usuário 1 continua com o vídeo intacto'; else ruim := ruim + 1; r := r || ('FALHOU  usuário 1 vê ' || n); end if;

  reset role;
  raise exception '%', E'RESULTADO (tudo desfeito, nada fica no banco)\n' || array_to_string(r, E'\n') || E'\n' || ok || ' OK, ' || ruim || ' FALHOU';
end $$;
