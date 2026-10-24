# Treino (App Treino)

App web instalável (PWA) para registrar treinos de academia no iPhone: ficha do dia, séries com carga e reps, timer de descanso, finalizar e histórico. Funciona sem internet e sincroniza com o Supabase quando a conexão volta. Hoje só o Guilherme usa; no futuro, outras pessoas (white label).

## Documentação (ler antes de trabalhar)
Fica no Obsidian, não neste repositório: `C:\Users\Guilherme Bossi\OneDrive\Documents\Obsidian Vault\Projetos\App Treino\`
- `tarefas.md`: **fonte da verdade** do que fazer e em que ordem, com status.
- `arquitetura.md`: decisões, telas da V1, modelo de dados, segurança, offline, "Já feito".
- Prévia das telas: https://claude.ai/artifact/6mEaZwTA3UQNgzm376yWXh

## Como responder
- Português, direto e curto. O Guilherme não é programador: passos manuais sempre numerados e simples.

## Regras para todas as tarefas
- Uma tarefa por vez, respeitando as dependências. Ao terminar, mostrar o resultado do teste e **esperar o OK do Guilherme** antes da próxima.
- **🛑 Parada manual:** quando um passo precisar do Guilherme (login, clicar numa tela, testar no iPhone), parar, dar o passo a passo numerado e esperar ele confirmar.
- Repositório **público**: nenhuma chave secreta no código. No app só entram a URL do Supabase e a chave **publicável**. Nunca usar a chave `service_role` no app.
- **RLS em todas as tabelas**, sempre. Nenhuma tabela nova sem política `user_id = auth.uid()`; nas filhas, conferir que o pai também é do usuário.
- Ao fim de cada tarefa de banco: Security Advisor do Supabase sem alertas de segurança e teste de que um usuário deslogado e um segundo usuário não enxergam os dados.
  - **Exceção conhecida (23/10/2026, decisão do Guilherme):** "Leaked Password Protection Disabled" (recurso do plano Pro). Qualquer outro aviso tem que ser resolvido. Pendência antes de outras pessoas usarem: conferir a senha na base Pwned Passwords pelo app (ver "Antes de outras pessoas usarem" no `tarefas.md`).
- Nome, cores e logo só em `src/config/marca.ts` (white label), nunca espalhados no código.
- Textos da tela em português. Telas seguem a seção "Telas (V1)" da `arquitetura.md`.
- Ao fim de cada tarefa: atualizar este `CLAUDE.md`, o "Já feito" da `arquitetura.md` e o status no `tarefas.md`.
- Documentação do projeto só no Obsidian. Código só no Claude Code.
- Commits com o e-mail privado do GitHub (`346195156+guilhermembossi@users.noreply.github.com`, configurado só neste repositório).

## Stack
| Camada | Escolha |
|---|---|
| Tela | React + Vite + TypeScript, PWA |
| Dados no celular | IndexedDB, fila de sincronização (vale a alteração mais recente, `atualizado_em`) |
| Banco + login | Supabase `app-treino` (id `ptxlgdbbycqwidpyywam`, São Paulo `sa-east-1`, plano grátis), e-mail e senha |
| Hospedagem | GitHub Pages, publicação por GitHub Actions |
| Código | GitHub `guilhermembossi/treino` (público), pasta local `C:\projetos\app-treino` |

## Ambiente (tarefa 0.1, 23/10/2026)
- Node 24.22.0, npm 11.19.1, Git 2.56.0, GitHub CLI 2.103.1 (`C:\Program Files\GitHub CLI\gh.exe`; login `guilhermembossi`, HTTPS).
- Supabase pelo MCP do Claude Code (sem Supabase CLI).
- Pasta fora do OneDrive de propósito (dependências do npm).

## Banco (tarefa 1.1, 23/10/2026)
- Migrações em `supabase/migrations/<versão>_<nome>.sql`, com a mesma versão que aparece no histórico do Supabase. Mudança de banco sempre por migração nova (`apply_migration`), nunca editando uma já aplicada.
- Tabelas: `fichas`, `ficha_exercicios`, `ficha_series`, `treinos`, `treino_series`. Todas com `id` UUID (gerado no celular), `user_id` (padrão `auth.uid()`), `criado_em` e `atualizado_em`.
- `atualizado_em` é gravado pelo celular, sem gatilho, porque a sincronização decide pela alteração mais recente.
- `treinos` guarda `nome_ficha` e `treino_series` guarda `exercicio_nome`: o histórico não depende da ficha. Apagar a ficha deixa `treinos.ficha_id` vazio; apagar ficha ou exercício apaga os filhos.
- RLS: 4 políticas por tabela (ler, criar, alterar, apagar), só para `authenticated` e só do dono. Nas filhas, criar e alterar também exigem que o pai seja do usuário. O `anon` não tem nenhuma permissão nas tabelas.

## App (tarefa 2.1, 23/10/2026)
- Endereço: https://guilhermembossi.github.io/treino/ (GitHub Pages, `base` = `/treino/` no `vite.config.ts`).
- Publicação: `.github/workflows/publicar.yml` a cada envio para a `main` (ou "Run workflow"). Pages com origem "GitHub Actions".
- Versões fixas (`--save-exact`): React 19.3.1, Vite 8.3.5, plugin-react 6.1.2, TypeScript 5.9.3 (a 7.0 era nova demais), sharp 0.35.5 (só para os ícones).
- **Marca:** `src/config/marca.ts` tem nome, descrição, idioma, as duas paletas (claro/escuro) e o logo (`logoSvg`). O plugin `marcaNoApp` do `vite.config.ts` põe isso no `index.html` (`%NOME%` etc., variáveis CSS dos temas e o script que aplica o tema antes de desenhar) e gera o `manifest.webmanifest`. Ícones em `public/icones/` saem de `npm run icones` (`scripts/gerar_icones.mjs`, que o Node lê o `.ts` direto: no `marca.ts` só sintaxe que pode ser apagada, sem enum).
- CSS usa só as variáveis (`var(--primaria)` etc.); nenhuma cor escrita fora do `marca.ts`.
- **Tema** (`src/tema.ts`): sem escolha, segue o aparelho; o sol/lua (`aria-label` "Mudar para tema claro/escuro") guarda a escolha em `localStorage` `treino-tema` e pinta a barra de status (`theme-color`).
- **Navegação** pelo `#` do endereço (`#/`, `#/historico`, `#/fichas`): funciona no Pages sem configuração e o voltar do celular volta de aba. Telas em `src/telas/`.
- Testar local: `npm run build` e `npx vite preview --port 4173 --host 127.0.0.1` → http://127.0.0.1:4173/treino/ (use 127.0.0.1, não localhost).
- Ainda sem service worker (tarefa 3.2).

## Login (tarefa 1.3, 23/10/2026)
- Supabase Auth com e-mail e senha, confirmação por e-mail obrigatória, senha mínima de 8, sem anônimo nem outros provedores.
- Site URL `https://guilhermembossi.github.io/treino/`. Redirect URLs: `https://guilhermembossi.github.io/treino/**` e `http://127.0.0.1:4173/treino/**` (teste local). No app, mandar `emailRedirectTo`/`redirectTo` para o endereço atual dentro dessas.
- O que dá para conferir sem conta: `GET /auth/v1/settings` com a chave publicável (`external.email`, `disable_signup`, `mailer_autoconfirm`). Site URL e senha mínima só pelo painel ou criando conta.
- E-mail grátis do Supabase: só para os e-mails da equipe do projeto e com limite por hora. Para outras pessoas, configurar SMTP próprio. Os modelos de e-mail vêm em inglês.

## Telas de login (tarefa 2.2, 23/10/2026)
- `src/config/supabase.ts`: URL e chave **publicável** (`sb_publishable_…`). `src/supabase.ts`: o cliente (sessão no `localStorage`, renovação automática), `enderecoDoApp()` para os links dos e-mails e `mensagemDeErro` (código do Supabase → português).
- Fluxo **implicit** (padrão do supabase-js): o link do e-mail traz o token no `#` e funciona mesmo aberto em outro navegador. Não trocar para PKCE sem pensar: no iPhone, o Safari e o app instalado guardam dados separados.
- `erroDoLink` lê `#error=…` (link vencido etc.) **antes** do cliente limpar o endereço.
- `src/sessao.ts` (`useSessao`): sem sessão → `telas/Acesso.tsx` (Entrar, Criar conta, Esqueci a senha). O evento `PASSWORD_RECOVERY` abre "Nova senha".
- Criar conta grava o nome em `user_metadata.nome` (o "Olá, <nome>" usa o primeiro nome). E-mail já cadastrado: o Supabase não avisa (devolve sem `identities`); a tela mostra uma mensagem neutra.
- Senha mínima conferida **só no Supabase** (fonte única); a tela só mostra a dica.
- Sair: link no rodapé do Início (com o e-mail da conta).
- `componentes/Logo.tsx` e `componentes/BotaoTema.tsx` são usados no topo e no login.

## Dados no celular e sincronização (tarefa 3.1, 24/10/2026)
- **Tudo passa pela camada `src/dados/`; a tela nunca chama o Supabase direto para dados.** `useDados()` (salvar, excluir, listar, obter), `useLista(tabela)` (lista viva) e `useEstadoSync()`.
- `dados.ts` (classe `Dados`): IndexedDB (pacote `idb`), um banco por usuário (`treino-dados-<user_id>`), uma loja por tabela + `pendentes` (o que falta enviar) + `meta` (até quando baixou cada tabela).
  - `salvar` preenche `id` (`crypto.randomUUID`), `user_id`, `criado_em`, `atualizado_em` (relógio do celular) e marca pendente. `excluir` marca `excluido_em` no registro e nos filhos (`FILHOS` em `tipos.ts`); o app nunca apaga de verdade.
  - Sincronizar: envia por tabela na ordem de `TABELAS` (pais antes dos filhos) com upsert; tira da fila só o que não mudou durante o envio. Lote recusado → tenta um por um (um registro ruim não segura os outros; estado "erro"). Depois baixa por `sincronizado_em` > última vez − 2 min e aplica a mais recente.
  - Quando: ao abrir, 0,8 s depois de cada gravação, ao voltar a internet, ao voltar para o app e a cada minuto (`contexto.tsx`). Uma rodada por vez.
  - Sem `code` no erro do Supabase = sem rede (tenta depois, estado "offline").
- **Banco (migração `20261023235035_sincronizacao`):** `excluido_em` e `sincronizado_em` (hora do servidor, posta pelo gatilho `ao_gravar_sincronizacao`) nas 5 tabelas. O gatilho também ignora, sem erro, uma alteração com `atualizado_em` mais antigo que o gravado (a mais recente vale também no servidor). Função com `search_path` vazio e sem `execute` para os usuários.
- Indicador no topo (`componentes/IndicadorSync.tsx`): Sincronizado / N pendentes / Sincronizando / Sem internet / Erro; tocar força a sincronização.
- Fichas (`telas/Fichas.tsx`): versão simples (criar, renomear, excluir) só para testar a sincronização; a completa é a 4.1.
- Testes: `npm test` (vitest + fake-indexeddb, `src/dados/dados.test.ts`, 10 casos com um servidor falso que segue as regras do Supabase). **O `npm run build` roda os testes**: publicação para se algum falhar. No banco: `testes/teste_sincronizacao.sql` (6 OK).
- No iPhone o app instalado tem IndexedDB próprio, separado do Safari.
- Classe com `private` no parâmetro do construtor não compila (`erasableSyntaxOnly`): declarar os campos.

## App abre sem internet (tarefa 3.2, 24/10/2026)
- Service worker: modelo em `sw/modelo.js`. O plugin `serviceWorker` do `vite.config.ts` (no fim do build) põe a lista de todos os arquivos do `dist`, a versão (hash deles) e o prefixo (`marca.id`), e grava `dist/sw.js`. **Não escrever as marcas com dois sublinhados em comentário do modelo** (o `replace` pega a primeira).
- Estratégia: instala baixando tudo (`<id>-telas-<versão>`) e assume na hora (`skipWaiting` + `clients.claim`); ativa apagando as versões antigas. Os pedidos do próprio app saem primeiro do celular (navegação → `index.html`); os do Supabase (outro endereço) passam direto.
- `ignoreVary: true` na busca do cache é obrigatório: o servidor responde com `Vary` e o script é pedido com cabeçalhos diferentes; sem isso, o app abre sem internet só com a tela em branco.
- `main.tsx` registra só no build (`import.meta.env.PROD`) e chama `reg.update()` ao abrir e ao voltar para o app (o iPhone quase não procura sozinho). **Versão nova aparece na abertura seguinte**, não na mesma.
- Sessão sem internet: com o acesso vencido (1 h), o `getSession` devolve "sem sessão" quando não consegue renovar. `useSessao` usa então a sessão guardada no aparelho (`sessaoGuardada`, chave `sb-<ref>-auth-token`), e o supabase-js renova sozinho quando a internet volta. Eventos sem sessão (que não são `SIGNED_OUT`) não tiram o usuário do app.
- O navegador interno do Claude não aceita service worker ("unknown error when fetching the script"). Para testar, usar o Edge sem janela com `playwright-core` (fora do projeto): abrir, `setOffline(true)`, recarregar.

## Testes de segurança (tarefa 1.2, 23/10/2026)
Rodar depois de toda mudança de banco, junto com o Security Advisor (`get_advisors` security: tem que dar zero).
- `testes/teste_visitante.ps1`: o visitante tenta, pela API pública com a chave publicável, ler, criar, alterar e apagar nas 5 tabelas. Esperado: 20 de 20 recusados (HTTP 401). Rodar com `powershell -File testes\teste_visitante.ps1`. Tabela nova: incluir em `$novos`, com um corpo válido para ela.
- `testes/teste_dois_usuarios.sql`: cria 2 usuários sem senha dentro de uma transação e age como cada um (papel `authenticated` + `request.jwt.claims`, como a API faz). Termina com `raise exception` de propósito: o resultado vem na mensagem de erro e tudo é desfeito. Esperado: "31 OK, 0 FALHOU". Rodar pelo `execute_sql`. Tabela nova: incluir nas listas e nos testes de pai de outro usuário.
- Em PL/pgSQL, `text[] || 'literal'` dá erro de array: usar `|| text 'literal'`.

## Pontos de atenção
- Supabase grátis pausa após 7 dias sem uso.
- E-mail de confirmação do cadastro precisa apontar para o endereço do app (tarefa 1.3).
- No iPhone o timer não toca som com a tela bloqueada (limite do Safari).

## Status
- 0.1 (ambiente), 0.2 (repositório e este arquivo), 1.1 (tabelas), 1.2 (teste de segurança), 2.1 (esqueleto e publicação), 1.3 (login no painel) e 2.2 (telas de login) feitas em 23/10/2026. A 2.2 foi aprovada depois que o Guilherme criou a conta no celular. A 2.3 (instalado no iPhone, abre em tela cheia, login ok) foi feita em 23/10/2026. A 3.1 (dados no celular e sincronização) foi aprovada em 24/10/2026. A 3.2 (abrir sem internet) foi publicada em 24/10/2026 e espera o teste do Guilherme. Próxima: 4.1 (fichas).
- No iPhone, o app instalado tem armazenamento próprio (login e `localStorage`/IndexedDB separados do Safari). Links de e-mail abrem no Safari.
