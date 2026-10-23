# Treino

App web para registrar treinos de academia no celular: ficha do dia, carga e repetições por série, timer de descanso e histórico. Funciona sem internet e pode ser instalado na tela de início do iPhone.

**Em construção.**

## Tecnologia
- React + Vite + TypeScript (app web instalável)
- Supabase (banco e login), com RLS: cada usuário só vê os próprios dados
- GitHub Pages (hospedagem)

## Segurança
Este repositório é público. Ele não contém chaves secretas: o app usa só a URL do Supabase e a chave publicável, feita para ficar exposta. A proteção dos dados está nas políticas de acesso (RLS) do banco.
