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
- 0.1 (ambiente), 0.2 (repositório e este arquivo), 1.1 (tabelas) e 1.2 (teste de segurança) feitas em 23/10/2026. Próxima pela ordem: 2.1 (esqueleto do app e publicação), porque a 1.3 depende do endereço publicado.
