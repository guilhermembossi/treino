-- Tarefa 8.7: biblioteca pessoal de vídeos dos exercícios (link do YouTube guardado pelo nome do exercício).
-- `chave` = nome sem maiúsculas, acentos e espaços repetidos (o app calcula); o mesmo nome acha o mesmo vídeo.
-- Pessoal por enquanto (RLS só do dono). Para uma biblioteca curada compartilhada no white label, a ideia é
-- uma tabela à parte com a mesma `chave`, sem mexer nesta.
-- O banco também recusa link que não seja https do YouTube (o app já confere antes).
create table public.videos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome            text not null check (length(trim(nome)) between 1 and 100),
  chave           text not null check (length(chave) between 1 and 100),
  url             text not null check (length(url) <= 300
                    and url ~ '^https://((www|m)\.)?(youtube\.com|youtu\.be)/[^\s<>"'']*$'),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  excluido_em     timestamptz,
  sincronizado_em timestamptz not null default now()
);
create index videos_user_id_chave_idx on public.videos (user_id, chave);
create index videos_user_id_sincronizado_em_idx on public.videos (user_id, sincronizado_em);
create trigger sincronizacao before insert or update on public.videos
  for each row execute function public.ao_gravar_sincronizacao();

revoke all on public.videos from anon;
revoke truncate, references, trigger on public.videos from authenticated;
grant select, insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;

create policy videos_ler on public.videos for select to authenticated
  using (user_id = (select auth.uid()));
create policy videos_criar on public.videos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy videos_alterar on public.videos for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy videos_apagar on public.videos for delete to authenticated
  using (user_id = (select auth.uid()));
