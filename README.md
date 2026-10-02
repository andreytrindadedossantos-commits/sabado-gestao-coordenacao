# SÁBADO – Gestão e Coordenação

Projeto preparado para GitHub + Vercel + Supabase.

## Publicar no GitHub
1. Crie um repositório chamado `sabado-gestao-coordenacao`.
2. Envie todos os arquivos deste ZIP para a raiz do repositório.

## Publicar na Vercel
1. Add New → Project.
2. Importe o repositório do GitHub.
3. Framework: Vite.
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Adicione as variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Use os valores do arquivo `.env.example`.
8. Clique em Deploy.

## Supabase
As tabelas do sistema já foram criadas no projeto `bjayvxgrrkketviiyqax`.
O arquivo `supabase/schema.sql` permite recriar a estrutura em outro projeto.

## Administrador
Depois de publicar, acesse `/admin`.
E-mail autorizado:
`andreytrindadedossantos@gmail.com`

No primeiro acesso, use a opção de criar acesso/senha.

## Observação
Esta versão usa Supabase diretamente para banco de dados e autenticação administrativa.
Notificações internas são suportadas. Push notifications do AppDeploy não são transportadas automaticamente para Vercel.


## Atualização visual e funcional
Esta versão restaura o painel com gráficos, formulários de alunos/mães/reuniões, alteração de escalas, controles de calendário e datas comemorativas, mantendo o Supabase como banco.


## V5
Layout ajustado para corresponder às telas de referência fornecidas: painel, alunos, mães, escalas, reuniões, chamada, histórico, aniversariantes, calendário, datas comemorativas e notificações.
