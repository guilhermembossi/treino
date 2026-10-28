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
- **Sandbox primeiro (desde a 8.2, 27/10/2026):** toda mudança de código vai para a branch `sandbox` (publica em https://sandbox.treino-gb.pages.dev/) e toda migração vai primeiro para o schema `sandbox`. O Guilherme testa lá; só com o OK dele a `main` avança (`git merge --ff-only sandbox`) e a migração é repetida no `public`. Ver "Sandbox e produção".
- Ao fim de cada tarefa: atualizar este `CLAUDE.md`, o "Já feito" da `arquitetura.md` e o status no `tarefas.md`.
- Documentação do projeto só no Obsidian. Código só no Claude Code.
- Commits com o e-mail privado do GitHub (`346195156+guilhermembossi@users.noreply.github.com`, configurado só neste repositório).

## Stack
| Camada | Escolha |
|---|---|
| Tela | React + Vite + TypeScript, PWA |
| Dados no celular | IndexedDB, fila de sincronização (vale a alteração mais recente, `atualizado_em`) |
| Banco + login | Supabase `app-treino` (id `ptxlgdbbycqwidpyywam`, São Paulo `sa-east-1`, plano grátis), e-mail e senha. Produção no schema `public`, sandbox no schema `sandbox` |
| Hospedagem | Cloudflare Pages `treino-gb`: `main` → https://treino-gb.pages.dev/ (produção), `sandbox` → https://sandbox.treino-gb.pages.dev/ |
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
- Endereço desde a tarefa 8.1: https://treino-gb.pages.dev/ (ver "Endereço novo" abaixo). Até a 8.1 era o GitHub Pages.
- Versões fixas (`--save-exact`): React 19.3.1, Vite 8.3.5, plugin-react 6.1.2, TypeScript 5.9.3 (a 7.0 era nova demais), sharp 0.35.5 (só para os ícones).
- **Marca:** `src/config/marca.ts` tem nome, descrição, idioma, as duas paletas (claro/escuro) e o logo (`logoSvg`). O plugin `marcaNoApp` do `vite.config.ts` põe isso no `index.html` (`%NOME%` etc., variáveis CSS dos temas e o script que aplica o tema antes de desenhar) e gera o `manifest.webmanifest`. Ícones em `public/icones/` saem de `npm run icones` (`scripts/gerar_icones.mjs`, que o Node lê o `.ts` direto: no `marca.ts` só sintaxe que pode ser apagada, sem enum).
- CSS usa só as variáveis (`var(--primaria)` etc.); nenhuma cor escrita fora do `marca.ts`.
- **Tema** (`src/tema.ts`): sem escolha, segue o aparelho; o sol/lua (`aria-label` "Mudar para tema claro/escuro") guarda a escolha em `localStorage` `treino-tema` e pinta a barra de status (`theme-color`).
- **Navegação** pelo `#` do endereço (`#/`, `#/historico`, `#/fichas`): funciona no Pages sem configuração e o voltar do celular volta de aba. Telas em `src/telas/`.
- Testar local: `npm run build` e `npx vite preview --port 4173 --host 127.0.0.1` → http://127.0.0.1:4173/ (use 127.0.0.1, não localhost).
- Ainda sem service worker (tarefa 3.2).

## Login (tarefa 1.3, 23/10/2026)
- Supabase Auth com e-mail e senha, confirmação por e-mail obrigatória, senha mínima de 8, sem anônimo nem outros provedores.
- Site URL `https://treino-gb.pages.dev/` (desde a 8.1). Redirect URLs: `https://treino-gb.pages.dev/**` e `http://127.0.0.1:4173/**` (teste local). No app, mandar `emailRedirectTo`/`redirectTo` para o endereço atual dentro dessas.
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
- Testes: `npm test` (vitest + fake-indexeddb, `src/dados/dados.test.ts`, 10 casos com um servidor falso que segue as regras do Supabase). **O `npm run build` roda os testes**: publicação para se algum falhar. No banco: `testes/teste_sincronizacao.sql` (6 OK).
- No iPhone o app instalado tem IndexedDB próprio, separado do Safari.
- Classe com `private` no parâmetro do construtor não compila (`erasableSyntaxOnly`): declarar os campos.

## App abre sem internet (tarefa 3.2, 24/10/2026)
- Service worker: modelo em `sw/modelo.js`. O plugin `serviceWorker` do `vite.config.ts` (no fim do build) põe a lista de todos os arquivos do `dist`, a versão (hash deles) e o prefixo (`marca.id`), e grava `dist/sw.js`. **Não escrever as marcas com dois sublinhados em comentário do modelo** (o `replace` pega a primeira).
- Estratégia: instala baixando tudo (`<id>-telas-<versão>`) e assume na hora (`skipWaiting` + `clients.claim`); ativa apagando as versões antigas. Os pedidos do próprio app saem primeiro do celular (navegação → `index.html`); os do Supabase (outro endereço) passam direto.
- **Tela principal guardada como `./`, nunca `index.html`** (28/10/2026): o Cloudflare Pages redireciona `index.html` → `/` (308), e o navegador recusa abrir o app com uma resposta redirecionada (ERR_FAILED da 2ª abertura em diante; a 1ª funcionava). O `install` baixa arquivo por arquivo e tira a marca de redirecionada (`semRedirecionamento`). Aparelho que tinha a versão com defeito falha uma vez e depois abre. **Teste do service worker: sempre abrir várias vezes e sem internet** (Edge sem janela, perfil persistente).
- `ignoreVary: true` na busca do cache é obrigatório: o servidor responde com `Vary` e o script é pedido com cabeçalhos diferentes; sem isso, o app abre sem internet só com a tela em branco.
- `main.tsx` registra só no build (`import.meta.env.PROD`) e chama `reg.update()` ao abrir e ao voltar para o app (o iPhone quase não procura sozinho). **Versão nova aparece na abertura seguinte**, não na mesma.
- Sessão sem internet: com o acesso vencido (1 h), o `getSession` devolve "sem sessão" quando não consegue renovar. `useSessao` usa então a sessão guardada no aparelho (`sessaoGuardada`, chave `sb-<ref>-auth-token`), e o supabase-js renova sozinho quando a internet volta. Eventos sem sessão (que não são `SIGNED_OUT`) não tiram o usuário do app.
- O navegador interno do Claude não aceita service worker ("unknown error when fetching the script"). Para testar, usar o Edge sem janela com `playwright-core` (fora do projeto): abrir, `setOffline(true)`, recarregar.

## Fichas (tarefa 4.1, 24/10/2026)
- `telas/Fichas.tsx`: lista em `#/fichas` (ordem = sequência dos treinos; "Nova ficha" cria "Nova ficha" e abre o editor com o nome selecionado, avisando por `sessionStorage` `ficha-nova`) e editor em `#/fichas/<id>` (`telas/EditorFicha.tsx`). `abaDoEndereco` no `App.tsx` aceita `#/fichas/...`.
- Editor: nome; exercícios (nome, descanso em s, observação) e séries (reps mín/máx, carga alvo em kg com vírgula). Exercício novo = 90 s e 3 séries de 8–12 (`PADRAO`). "+ Série" copia a última. Mínimo > máximo: o outro acompanha (o banco recusaria). Excluir série renumera; excluir exercício/ficha pede confirmação.
- `componentes/Campos.tsx` (`CampoTexto`, `CampoNumero`): salvam 0,6 s depois de parar de digitar e ao sair; inválido/fora do limite volta ao último salvo; não sobrescreve o que está sendo digitado quando a sincronização traz mudança. Limites iguais aos do banco.
- `componentes/ListaOrdenavel.tsx` (dnd-kit 6.3.1/sortable 10.0.0, só `PointerSensor`): arrastar pela alça (`touch-action: none`). Teclado próprio: com a alça em foco, ↑ ↓ movem uma posição (o `KeyboardSensor` da biblioteca não movia cartões altos). `dados/ordem.ts` (`reordenar`, `renumerar`, `proximaOrdem`) devolve só o que mudou; grava com `dados.salvarVarios`.
- **Modo demonstração** (`src/demo.tsx`): só no `npm run dev`, endereço `http://127.0.0.1:5173/?demo` → app logado com usuário falso (`demo`) e servidor em memória (banco local `treino-dados-demo`). Não entra no build (conferir: `demo@exemplo` não aparece em `dist/assets`). `App.tsx` exporta `Casca` (o app logado) para isso.
- Testar no navegador interno: o painel sem foco não dispara foco/saída de campo; disparar `focusin`/`focusout` à mão. O arrasto do painel (`left_click_drag`) não move itens do dnd-kit; simular com `PointerEvent` (`pointerdown` na alça, vários `pointermove` no `document`, `pointerup`).

## Modelo Upper/Lower (tarefa 4.2, 24/10/2026)
- `src/dados/modelo.ts` (`MODELO_UPPER_LOWER`, `carregarModelo`): copiado da nota do Obsidian `Treino/Treino - Rascunho Upper Lower.md` (23/10/2026). Se a nota mudar, atualizar à mão aqui.
- Conversões: exercícios alternados viram dois, com "Alternar com…" na observação; "se não tiver", "cada perna", "até a falha" e o tempo da prancha vão para a observação (séries sem reps); descanso 150 s nos compostos e 90 s nos isolados; carga em branco; dia 5 fora.
- A tela de Fichas oferece o modelo **só quando não há nenhuma ficha** (cartão "Começar com um modelo"). Grava numa transação por tabela.
- Teste: `src/dados/modelo.test.ts` (4 fichas na ordem, 7/5/7/6 exercícios, séries e limites do banco).

## Começar treino (tarefa 5.1, 24/10/2026)
- Regras em `src/dados/treino.ts` (puras, testadas em `treino.test.ts`):
  - `proximaFicha`: a seguinte (por `ordem`, só `ativa`) à do último treino **finalizado**; sem treino ou ficha apagada → a primeira; volta ao começo.
  - `treinoAberto`: treino sem `fim` (o mais recente).
  - `tempoMedio`: média das 3 últimas vezes finalizadas da ficha.
  - `semana`: segunda a domingo no horário do aparelho, dias com treino finalizado.
  - `META_SEMANAL` = 5 ("3 de 5").
  - `cronometro` e `duracaoCurta`.
- Início (`telas/Inicio.tsx`): "Olá, <nome>"; cartão "Próximo treino" (exercícios e "cerca de X min"), **Começar treino**, **Trocar ficha** (botões com as fichas ativas; vale só para começar agora); com treino aberto, o cartão vira "Continuar treino"; faixa da semana. Sem fichas → "Criar fichas".
- Começar grava em `treinos` (`ficha_id`, `nome_ficha`, `inicio` do celular, `fim` null) e abre `#/treino` (`telas/Treino.tsx`; a aba Início fica marcada). O cronômetro conta a partir de `inicio` (certo mesmo com o app fechado).
- Tela do treino: ver "Marcar séries" (5.2). **Descartar treino** (confirmação, exclusão marcada) foi acrescentado para não deixar treino aberto enquanto não existe o Finalizar (5.4).

## Marcar séries (tarefa 5.2, 24/10/2026)
- `telas/Treino.tsx`: um cartão por exercício da ficha (nome, descanso, observação) e uma linha por série planejada: nº | − carga + | reps | alvo (cinza) | ✓. Topo com "x de y séries" e o cronômetro.
- `treino_series` liga ao exercício por **nome + nº da série** (`chaveSerie`); o registro só é criado na primeira mudança ou marcação. `feita_em` = marcada (null = desmarcada).
- Valores na tela: o registro, se existir; senão `valoresIniciais` = a última vez dessa ficha (`ultimaVez`: treino finalizado mais recente da ficha com série marcada, por nome + nº) ou o alvo (carga alvo e reps = **mínimo** da faixa).
- **Corrida campo × ✓** (sair do campo e marcar quase juntos): cada gravação manda só o que mudou, com o mesmo id (fixo por série, `ids` no `useRef`) e `dados.salvar(tabela, dados, iniciais)` (os `iniciais` só valem se o registro não existe). ±2,5 lê o valor salvo mais recente (`dados.obter`) antes de somar. Teste em `dados.test.ts`.
- Carga 0–1000 com vírgula; −2,5 não passa de 0. Botões com `touch-action: manipulation` (toque rápido não dá zoom).

## Timer de descanso (tarefa 5.3, 24/10/2026)
- `componentes/Descanso.tsx`: `useDescanso` (estado guardado no aparelho em `localStorage` `treino-descanso`, sobrevive a fechar o app) e `BarraDescanso` (faixa fixa logo acima da barra de baixo, com contagem grande, −15 s, +15 s e Pular).
- Regras puras em `dados/treino.ts`: `restanteDescanso`, `ajustarDescanso` (−15 não desce abaixo do que já passou; máx. 3600), `descansoReal`, `ultimaMarcada`.
- Começa no botão **Descansar** do exercício (descanso do exercício; sem valor, 90 s). **Termina** no Pular/Fechar ou ao marcar qualquer série. Passou do zero: conta o tempo extra ("+0:12") e o botão vira Fechar. O **descanso real** (do toque até o fim) vai para `descanso_seg` da última série marcada daquele exercício (se não houver, não salva).
- Aviso ao zerar (uma vez, `avisou`): `src/som.ts`, 3 bipes por Web Audio e `navigator.vibrate`. `prepararSom()` roda no toque em Descansar (o iPhone só libera áudio num toque) e põe `navigator.audioSession.type = 'transient'` (mistura com a música).
- **Limites do iPhone:** não vibra (o Safari não tem a API), não toca com a tela bloqueada nem, provavelmente, no modo silencioso.

## Finalizar e resumo (tarefa 5.4, 24/10/2026)
- **Finalizar** (topo da tela do treino, embaixo do cronômetro): confirmação que avisa quantas séries faltam; encerra o descanso; grava `fim` e `duracao_seg` (do celular) e abre `#/resumo/<id>` (`telas/ResumoTreino.tsx`; o `App.tsx` escolhe a tela pelo `hash`).
- Resumo (`resumoTreino` em `dados/treino.ts`): duração, séries marcadas de quantas a ficha tem, volume (soma de carga × reps das marcadas) e "Desde a última vez": por exercício, a maior carga; com a mesma carga, o total de reps (▲ verde / ▼ vermelho). Só exercícios que existiam da última vez. Primeira vez da ficha: frase própria.
- A "última vez" do resumo usa só treinos **anteriores** a ele (`inicio` menor), para um resumo antigo continuar certo.
- **Salvar e sair** só volta ao Início (já foi salvo no Finalizar). **Voltar ao treino** reabre (`fim` e `duracao_seg` = null), só se não houver outro treino aberto.
- Séries criadas e não marcadas ficam no banco com `feita_em` null (não contam em nada).

## Histórico (tarefa 6.1, 24/10/2026)
- `telas/Historico.tsx`: `#/historico` = calendário do mês (segunda a domingo, dias com treino finalizado em verde, hoje destacado, ‹ › para trocar de mês, sem avançar além do mês atual) + lista do mês ("Sáb 24/10 · Superior A · 13 min"). `#/historico/<id>` = detalhe: data, horário, duração, nº de séries, volume e uma tabela por exercício (série, carga, reps, descanso).
- Regras em `dados/historico.ts` (testes em `historico.test.ts`): `treinosDoMes`, `gradeDoMes`, `dataCurta`, `seriesPorExercicio` (só séries marcadas; exercícios na ordem da ficha, os que não estão mais nela depois, na ordem em que foram feitos).
- Só treinos **finalizados** aparecem. O mês escolhido fica guardado enquanto o app está aberto (`mesEscolhido`), para voltar do detalhe sem perder o mês.

## Endereço novo: Cloudflare Pages (tarefa 8.1, 27/10/2026)
- Projeto Cloudflare Pages `treino-gb` (conta do Guilherme), ligado ao GitHub pela integração do Cloudflare (acesso só ao repositório `treino`). Produção = branch `main`; publica sozinho a cada envio. Configuração no painel: framework None, build `npm run build`, saída `dist`, sem variáveis. Node 24 pelo `.node-version`.
- `treino.pages.dev` já era de outro site; o Guilherme escolheu `treino-gb`. O endereço fica em `marca.endereco` (`marca.ts`).
- `vite.config.ts`: `BASE` vem da variável de ambiente `BASE`, padrão `/` (raiz). No Git Bash, `BASE=/treino/` vira caminho do Windows: usar `MSYS_NO_PATHCONV=1`.
- **Endereço antigo** (`guilhermembossi.github.io/treino/`): `.github/workflows/publicar.yml` não publica mais o app; publica só o aviso gerado por `scripts/gerar_aviso.mjs` (pasta `aviso/`, fora do git): `index.html` e `404.html` com o endereço novo, e um `sw.js` que apaga as cópias guardadas e desliga o service worker do app antigo. Roda só quando mudam `marca.ts`, o script ou o workflow.
- O app instalado fica preso ao endereço: trocar de endereço = reinstalar no iPhone (dados voltam pela sincronização; antes, conferir "Sincronizado").

## Sandbox e produção (tarefa 8.2, 27/10/2026)
- O Supabase grátis dá **2 projetos por pessoa, somando todas as organizações**, e os 2 do Guilherme já estão em uso (`app-treino` e `controle-financeiro-mercado`). Por isso o sandbox é o **schema `sandbox`** dentro do `app-treino` (decisão do Guilherme, opção A), não um projeto à parte.
- Migração `20261028001418_sandbox`: cópia das migrações anteriores com `public.` → `sandbox.` (mesmas tabelas, RLS, políticas, gatilho próprio `sandbox.ao_gravar_sincronizacao`). Num schema novo o Supabase não dá permissões: usage e CRUD só para `authenticated` (e `service_role`); `anon` nada.
- O schema está em **Exposed schemas** (Data API) e `https://sandbox.treino-gb.pages.dev/**` nas Redirect URLs (feito pelo Guilherme no painel).
- Compartilhado entre os dois: login (`auth.users`, a mesma conta), configurações de e-mail e Auth. Separado: os dados de treino.
- **Migração nova:** primeiro `<versão>_<nome>` com `sandbox.` (aplicar só no schema sandbox), testar, e depois do OK a mesma com `public.`. Os dois schemas têm que continuar iguais (conferir tabelas, políticas e gatilhos nos dois).
- **App:** `vite.config.ts` decide o ambiente pela branch (`CF_PAGES_BRANCH`): `main` = produção; outra branch e o build no PC = sandbox (`AMBIENTE=producao|sandbox` força). Vai como `import.meta.env.VITE_AMBIENTE`; `config/supabase.ts` exporta `SANDBOX`, `ESQUEMA` e `VERSAO`; o cliente usa `db: { schema: ESQUEMA }`. O build de produção não leva o código do sandbox (a faixa some no build).
- No sandbox: faixa "SANDBOX · dados de teste" no topo e no login (`componentes/FaixaSandbox.tsx`, cor `--erro`) e banco local `treino-sandbox-dados-<user>`. Produção mantém `treino-dados-<user>`.
- Rodapé do Início: "versão <commit>" (`CF_PAGES_COMMIT_SHA`, 7 letras; "local" no PC), com " · sandbox" no sandbox. Serve para conferir qual versão está em cada endereço.
- Conferir o schema publicado: no JS de cada endereço, o valor passado em `db:{schema:…}` (`public` na produção, `sandbox` no sandbox).
- Testes: `teste_dois_usuarios.sql` e `teste_sincronizacao.sql` rodam também no sandbox trocando `public.` por `sandbox.`; `teste_visitante.ps1 -Esquema sandbox`. **Neste PC o Windows bloqueia `.ps1`** (a liberação foi negada em 27/10/2026): as mesmas 20 tentativas foram feitas com `curl` e os cabeçalhos `Accept-Profile`/`Content-Profile`.

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
- 0.1 (ambiente), 0.2 (repositório e este arquivo), 1.1 (tabelas), 1.2 (teste de segurança), 2.1 (esqueleto e publicação), 1.3 (login no painel) e 2.2 (telas de login) feitas em 23/10/2026. A 2.2 foi aprovada depois que o Guilherme criou a conta no celular. A 2.3 (instalado no iPhone, abre em tela cheia, login ok) foi feita em 23/10/2026. A 3.1 (dados no celular e sincronização) foi aprovada em 24/10/2026. A 3.2 (abrir sem internet) foi aprovada em 24/10/2026. A 4.1 (fichas) foi aprovada em 24/10/2026. A 4.2 (modelo Upper/Lower) foi aprovada em 24/10/2026. A 5.1 (começar treino) foi aprovada em 24/10/2026. A 5.2 (marcar séries) foi aprovada em 24/10/2026. A 5.3 (timer de descanso) foi aprovada em 24/10/2026. A 5.4 (finalizar e resumo) foi aprovada em 24/10/2026. A 6.1 (histórico) foi aprovada em 24/10/2026: **todas as tarefas de código da V1 feitas**. Em andamento: fase 7 (o Guilherme usa por uma semana e anota ajustes). Fase 8: a 8.1 (endereço novo `treino-gb.pages.dev`, app reinstalado no iPhone com os dados de volta) foi aprovada em 27/10/2026. A 8.2 (sandbox no schema `sandbox`, branch `sandbox`) foi feita em 27/10/2026 e espera o OK. Em 28/10/2026 foi corrigido o app que não abria da 2ª vez no Cloudflare (`7a59c40`). Os treinos de teste foram marcados como excluídos no Supabase em 24/10/2026; ficaram as 4 fichas do modelo.
- Apagar dado pelo SQL (a pedido do Guilherme): sempre exclusão marcada, `excluido_em = now()` **e** `atualizado_em = now()`, no pai e nos filhos. Assim a mudança chega ao celular e vence a versão local.
- No iPhone, o app instalado tem armazenamento próprio (login e `localStorage`/IndexedDB separados do Safari). Links de e-mail abrem no Safari.
