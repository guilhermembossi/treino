-- Tarefa 1.1: tabelas do App Treino com RLS (cada linha só é do dono).
-- id UUID vem do celular (offline); o default só cobre inserções feitas fora do app.
-- atualizado_em é gravado pelo celular (vale a alteração mais recente na sincronização),
-- por isso não há gatilho sobrescrevendo com now().

-- Fichas -----------------------------------------------------------------
create table public.fichas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 100),
  ordem         integer not null default 0,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index fichas_user_id_idx on public.fichas (user_id);

create table public.ficha_exercicios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_id      uuid not null references public.fichas (id) on delete cascade,
  nome          text not null check (length(trim(nome)) between 1 and 100),
  ordem         integer not null default 0,
  descanso_seg  integer check (descanso_seg between 0 and 3600),
  observacao    text check (length(observacao) <= 500),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index ficha_exercicios_user_id_idx on public.ficha_exercicios (user_id);
create index ficha_exercicios_ficha_id_idx on public.ficha_exercicios (ficha_id);

create table public.ficha_series (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_exercicio_id uuid not null references public.ficha_exercicios (id) on delete cascade,
  serie_n            integer not null check (serie_n between 1 and 50),
  reps_min           integer check (reps_min between 0 and 1000),
  reps_max           integer check (reps_max between 0 and 1000),
  carga_alvo         numeric(6,2) check (carga_alvo between 0 and 1000),
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  check (reps_min is null or reps_max is null or reps_min <= reps_max)
);
create index ficha_series_user_id_idx on public.ficha_series (user_id);
create index ficha_series_ficha_exercicio_id_idx on public.ficha_series (ficha_exercicio_id);

-- Treinos (histórico; guarda o nome da ficha e do exercício para não depender delas)
create table public.treinos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ficha_id      uuid references public.fichas (id) on delete set null,
  nome_ficha    text not null check (length(nome_ficha) <= 100),
  inicio        timestamptz not null,
  fim           timestamptz check (fim is null or fim >= inicio),
  duracao_seg   integer check (duracao_seg >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index treinos_user_id_inicio_idx on public.treinos (user_id, inicio desc);
create index treinos_ficha_id_idx on public.treinos (ficha_id);

create table public.treino_series (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  treino_id      uuid not null references public.treinos (id) on delete cascade,
  exercicio_nome text not null check (length(exercicio_nome) <= 100),
  serie_n        integer not null check (serie_n between 1 and 50),
  carga          numeric(6,2) check (carga between 0 and 1000),
  reps           integer check (reps between 0 and 1000),
  descanso_seg   integer check (descanso_seg between 0 and 3600),
  feita_em       timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index treino_series_user_id_idx on public.treino_series (user_id);
create index treino_series_treino_id_idx on public.treino_series (treino_id);

-- Acesso -----------------------------------------------------------------
-- Visitante (anon) não tem nenhum acesso; logado só pelas políticas abaixo.
revoke all on public.fichas, public.ficha_exercicios, public.ficha_series,
              public.treinos, public.treino_series from anon;
revoke truncate, references, trigger on public.fichas, public.ficha_exercicios, public.ficha_series,
              public.treinos, public.treino_series from authenticated;

alter table public.fichas           enable row level security;
alter table public.ficha_exercicios enable row level security;
alter table public.ficha_series     enable row level security;
alter table public.treinos          enable row level security;
alter table public.treino_series    enable row level security;

-- fichas: só o dono
create policy fichas_ler on public.fichas for select to authenticated
  using (user_id = (select auth.uid()));
create policy fichas_criar on public.fichas for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy fichas_alterar on public.fichas for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy fichas_apagar on public.fichas for delete to authenticated
  using (user_id = (select auth.uid()));

-- ficha_exercicios: só o dono, e a ficha também tem que ser dele
create policy ficha_exercicios_ler on public.ficha_exercicios for select to authenticated
  using (user_id = (select auth.uid()));
create policy ficha_exercicios_criar on public.ficha_exercicios for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.fichas f where f.id = ficha_id and f.user_id = (select auth.uid())));
create policy ficha_exercicios_alterar on public.ficha_exercicios for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.fichas f where f.id = ficha_id and f.user_id = (select auth.uid())));
create policy ficha_exercicios_apagar on public.ficha_exercicios for delete to authenticated
  using (user_id = (select auth.uid()));

-- ficha_series: só o dono, e o exercício também tem que ser dele
create policy ficha_series_ler on public.ficha_series for select to authenticated
  using (user_id = (select auth.uid()));
create policy ficha_series_criar on public.ficha_series for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.ficha_exercicios e where e.id = ficha_exercicio_id and e.user_id = (select auth.uid())));
create policy ficha_series_alterar on public.ficha_series for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.ficha_exercicios e where e.id = ficha_exercicio_id and e.user_id = (select auth.uid())));
create policy ficha_series_apagar on public.ficha_series for delete to authenticated
  using (user_id = (select auth.uid()));

-- treinos: só o dono; a ficha (opcional) também tem que ser dele
create policy treinos_ler on public.treinos for select to authenticated
  using (user_id = (select auth.uid()));
create policy treinos_criar on public.treinos for insert to authenticated
  with check (user_id = (select auth.uid()) and (ficha_id is null or exists (
    select 1 from public.fichas f where f.id = ficha_id and f.user_id = (select auth.uid()))));
create policy treinos_alterar on public.treinos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (ficha_id is null or exists (
    select 1 from public.fichas f where f.id = ficha_id and f.user_id = (select auth.uid()))));
create policy treinos_apagar on public.treinos for delete to authenticated
  using (user_id = (select auth.uid()));

-- treino_series: só o dono, e o treino também tem que ser dele
create policy treino_series_ler on public.treino_series for select to authenticated
  using (user_id = (select auth.uid()));
create policy treino_series_criar on public.treino_series for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.treinos t where t.id = treino_id and t.user_id = (select auth.uid())));
create policy treino_series_alterar on public.treino_series for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.treinos t where t.id = treino_id and t.user_id = (select auth.uid())));
create policy treino_series_apagar on public.treino_series for delete to authenticated
  using (user_id = (select auth.uid()));
