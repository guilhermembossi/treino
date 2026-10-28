-- Tarefa 8.2: área do SANDBOX (schema "sandbox") no mesmo projeto app-treino, com as mesmas tabelas,
-- RLS, políticas e gatilho da produção (schema "public"). Motivo: o Supabase grátis dá 2 projetos por pessoa
-- e os 2 já estão em uso. Login (auth.users) é o mesmo; os dados de treino ficam separados.
-- O corpo abaixo é a cópia das migrações 20261023223432_criar_tabelas e 20261023235035_sincronizacao com
-- "public." trocado por "sandbox.". Daqui para a frente, toda migração nova sai primeiro aqui (sandbox).

create schema sandbox;
-- Num schema novo o Supabase não dá permissões padrão: só o logado (e o serviço) usam; o visitante, nada.
revoke all on schema sandbox from public;
grant usage on schema sandbox to authenticated, service_role;
alter default privileges in schema sandbox revoke execute on functions from public;

-- Tarefa 1.1: tabelas do App Treino com RLS (cada linha só é do dono).
-- id UUID vem do celular (offline); o default só cobre inserções feitas fora do app.
-- atualizado_em é gravado pelo celular (vale a alteração mais recente na sincronização),
-- por isso não há gatilho sobrescrevendo com now().

-- Fichas -----------------------------------------------------------------
create table sandbox.fichas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 100),
  ordem         integer not null default 0,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index fichas_user_id_idx on sandbox.fichas (user_id);

create table sandbox.ficha_exercicios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_id      uuid not null references sandbox.fichas (id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 100),
  ordem         integer not null default 0,
  descanso_seg  integer check (descanso_seg between 0 and 3600),
  observacao    text check (length(observacao) <= 500),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ficha_exercicios_user_id_idx on sandbox.ficha_exercicios (user_id);
create index ficha_exercicios_ficha_id_idx on sandbox.ficha_exercicios (ficha_id);

create table sandbox.ficha_series (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_exercicio_id uuid not null references sandbox.ficha_exercicios (id) on delete cascade,
  serie_n            integer not null check (serie_n between 1 and 50),
  reps_min           integer check (reps_min between 0 and 1000),
  reps_max           integer check (reps_max between 0 and 1000),
  carga_alvo         numeric(6,2) check (carga_alvo between 0 and 1000),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  check (reps_min is null or reps_max is null or reps_min <= reps_max)
);
create index ficha_series_user_id_idx on sandbox.ficha_series (user_id);
create index ficha_series_ficha_exercicio_id_idx on sandbox.ficha_series (ficha_exercicio_id);

-- Treinos (histórico; guarda o nome da ficha e do exercício para não depender delas)
create table sandbox.treinos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_id      uuid references sandbox.fichas (id) on delete set null,
  nome_ficha    text not null check (length(nome_ficha) <= 100),
  inicio        timestamptz not null,
  fim           timestamptz check (fim is null or fim >= inicio),
  duracao_seg   integer check (duracao_seg >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index treinos_user_id_inicio_idx on sandbox.treinos (user_id, inicio desc);
create index treinos_ficha_id_idx on sandbox.treinos (ficha_id);

create table sandbox.treino_series (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  treino_id      uuid not null references sandbox.treinos (id) on delete cascade,
  exercicio_nome text not null check (length(exercicio_nome) <= 100),
  serie_n        integer not null check (serie_n between 1 and 50),
  carga          numeric(6,2) check (carga between 0 and 1000),
  reps           integer check (reps between 0 and 1000),
  descanso_seg   integer check (descanso_seg between 0 and 3600),
  feita_em       timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index treino_series_user_id_idx on sandbox.treino_series (user_id);
create index treino_series_treino_id_idx on sandbox.treino_series (treino_id);

-- Acesso -----------------------------------------------------------------
-- Visitante (anon) não tem nenhum acesso; logado só pelas políticas abaixo.
revoke all on sandbox.fichas, sandbox.ficha_exercicios, sandbox.ficha_series,
              sandbox.treinos, sandbox.treino_series from anon;
revoke truncate, references, trigger on sandbox.fichas, sandbox.ficha_exercicios, sandbox.ficha_series,
              sandbox.treinos, sandbox.treino_series from authenticated;

alter table sandbox.fichas           enable row level security;
alter table sandbox.ficha_exercicios enable row level security;
alter table sandbox.ficha_series     enable row level security;
alter table sandbox.treinos          enable row level security;
alter table sandbox.treino_series    enable row level security;

-- fichas: só o dono
create policy fichas_ler on sandbox.fichas for select to authenticated
  using (user_id = (select auth.uid()));
create policy fichas_criar on sandbox.fichas for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy fichas_alterar on sandbox.fichas for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy fichas_apagar on sandbox.fichas for delete to authenticated
  using (user_id = (select auth.uid()));

-- ficha_exercicios: só o dono, e a ficha também tem que ser dele
create policy ficha_exercicios_ler on sandbox.ficha_exercicios for select to authenticated
  using (user_id = (select auth.uid()));
create policy ficha_exercicios_criar on sandbox.ficha_exercicios for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from sandbox.fichas f where f.id = ficha_id and f.user_id = (select auth.uid())));
create policy ficha_exercicios_alterar on sandbox.ficha_exercicios for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from sandbox.fichas f where f.id = ficha_id and f.user_id = (select auth.uid())));
create policy ficha_exercicios_apagar on sandbox.ficha_exercicios for delete to authenticated
  using (user_id = (select auth.uid()));

-- ficha_series: só o dono, e o exercício também tem que ser dele
create policy ficha_series_ler on sandbox.ficha_series for select to authenticated
  using (user_id = (select auth.uid()));
create policy ficha_series_criar on sandbox.ficha_series for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from sandbox.ficha_exercicios e where e.id = ficha_exercicio_id and e.user_id = (select auth.uid())));
create policy ficha_series_alterar on sandbox.ficha_series for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from sandbox.ficha_exercicios e where e.id = ficha_exercicio_id and e.user_id = (select auth.uid())));
create policy ficha_series_apagar on sandbox.ficha_series for delete to authenticated
  using (user_id = (select auth.uid()));

-- treinos: só o dono; a ficha (opcional) também tem que ser dele
create policy treinos_ler on sandbox.treinos for select to authenticated
  using (user_id = (select auth.uid()));
create policy treinos_criar on sandbox.treinos for insert to authenticated
  with check (user_id = (select auth.uid()) and (ficha_id is null or exists (
    select 1 from sandbox.fichas f where f.id = ficha_id and f.user_id = (select auth.uid()))));
create policy treinos_alterar on sandbox.treinos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (ficha_id is null or exists (
    select 1 from sandbox.fichas f where f.id = ficha_id and f.user_id = (select auth.uid()))));
create policy treinos_apagar on sandbox.treinos for delete to authenticated
  using (user_id = (select auth.uid()));

-- treino_series: só o dono, e o treino também tem que ser dele
create policy treino_series_ler on sandbox.treino_series for select to authenticated
  using (user_id = (select auth.uid()));
create policy treino_series_criar on sandbox.treino_series for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from sandbox.treinos t where t.id = treino_id and t.user_id = (select auth.uid())));
create policy treino_series_alterar on sandbox.treino_series for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from sandbox.treinos t where t.id = treino_id and t.user_id = (select auth.uid())));
create policy treino_series_apagar on sandbox.treino_series for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tarefa 3.1: colunas e regra para a sincronização com o celular.
-- excluido_em: exclusão marcada (o app nunca apaga de verdade), para a exclusão feita offline chegar aos outros aparelhos.
-- sincronizado_em: hora do SERVIDOR da última gravação; o celular baixa só o que mudou desde a última vez
--   (não dá para usar atualizado_em, que vem do relógio do celular).
-- Regra: vale a alteração mais recente (atualizado_em). Uma versão mais antiga que chegue depois é ignorada.

create function sandbox.ao_gravar_sincronizacao() returns trigger
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
revoke all on function sandbox.ao_gravar_sincronizacao() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['fichas', 'ficha_exercicios', 'ficha_series', 'treinos', 'treino_series'] loop
    execute format('alter table sandbox.%I add column excluido_em timestamptz', t);
    execute format('alter table sandbox.%I add column sincronizado_em timestamptz not null default now()', t);
    execute format('create index %I on sandbox.%I (user_id, sincronizado_em)', t || '_user_id_sincronizado_em_idx', t);
    execute format('create trigger sincronizacao before insert or update on sandbox.%I
                    for each row execute function sandbox.ao_gravar_sincronizacao()', t);
  end loop;
end;
$$;


grant select, insert, update, delete on all tables in schema sandbox to authenticated;
grant all on all tables in schema sandbox to service_role;
