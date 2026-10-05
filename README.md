

## V15 — espaçamento de textos
Padronizado o espaçamento entre nomes, categorias, rótulos e valores em todas as telas. Na chamada, os alunos aparecem no formato Nome - Turma; nas escalas, os campos aparecem no formato Rótulo - Valor.


## V16 — somente tema claro
O sistema agora usa exclusivamente o tema claro. O botão de alternar tema foi removido e o tema claro é forçado no carregamento.


## V18 — tema claro definitivo
O tema escuro foi removido do código e do CSS. Não existe mais botão de troca de tema; o sistema usa somente o tema claro.


## V19 — tema claro definitivo
O CSS foi reconstruído do zero para usar somente tema claro. Foram removidas regras acumuladas de tema escuro e padronizados todos os botões para evitar faixas brancas e problemas de contraste. O `index.html` também força `color-scheme: light` antes de o React iniciar.


## V20 — tema claro forçado
O App.tsx atual não possui tema escuro nem botão de troca de tema. Esta versão força o tema claro também no main.tsx, index.html e CSS, inclusive neutralizando uma classe `dark` antiga que possa permanecer no navegador.


## V21 — botão de tema
Adicionado botão para alternar entre tema claro e tema cinza escuro. O tema fica salvo no navegador. Os textos secundários usam vermelho nos dois temas.


## V22 — textos secundários
Os textos secundários deixaram de usar vermelho. No tema claro usam cinza azulado #66788F e no tema cinza escuro usam cinza azulado claro #AEB9C7. O vermelho permanece apenas em ações de exclusão/perigo.


## V23 — textos secundários brancos
No tema cinza escuro, todos os textos secundários agora ficam brancos. No tema claro, os textos secundários permanecem em cinza neutro para manter legibilidade. Vermelho fica restrito a ações de exclusão/perigo.


## V24 — favicon reforçado
Adicionadas referências explícitas para favicon.ico, favicon.png, favicon.svg, apple-touch-icon e site.webmanifest, todas com versão ?v=24 para contornar cache do navegador. O título da aba permanece 'Evangelização Infanto Juvenil – Gestão e Coordenação'.


## V25 — Escalas corrigidas novamente
Reforçado o layout da tela Escalas: formulário fechado por padrão, botão Adicionar escala no topo, espaçamento entre rótulo, hífen e valor, botão Alterar sem faixa branca e melhor adaptação no celular. O favicon e os temas das versões anteriores foram preservados.


## V26 — cores adaptadas ao tema
Os botões de Alterar, Responder, Marcar festa e ações semelhantes agora mudam de cor conforme o tema. No claro usam azul suave; no cinza escuro usam cinza grafite com texto branco. Os botões de exclusão também foram ajustados para combinar com cada tema sem faixa branca.


## V27 — botões do tema cinza corrigidos
Reforçados os seletores dos botões para impedir que o navegador aplique fundo branco nativo. No tema escuro, Marcar festa, Alterar, Responder, notificações e demais ações secundárias ficam cinza grafite com texto branco. No tema claro, continuam em azul suave.


## V28 — Reuniões no celular
Ajustada somente a tela Reuniões no mobile. O campo de horário deixou de usar o seletor nativo do Android (que estava abrindo uma janela grande e cortando a lateral da tela) e passou a usar um campo HH:MM com teclado numérico. O formulário e os cards de reuniões também foram limitados à largura da tela no celular. As demais telas não foram alteradas.


## V29 — correção de build
Corrigido um erro da V28: a alteração do campo de horário havia atingido também telas de Calendário e Datas Comemorativas, causando erro de compilação. Agora a mudança para HH:MM fica somente na tela de Reuniões, como solicitado.


## V30 — ajuste mobile em Calendário e Datas Comemorativas
- Removido o seletor nativo de horário também das telas Calendário e Datas Comemorativas no celular.
- Agora esses campos usam entrada manual no formato HH:MM, evitando o corte na tela de confirmação do Android.
- Incluída validação de horário nas duas telas.

## V37 — somente navegador

PWA removida. O sistema volta a funcionar somente pelo navegador, como antes.
- Sem botão de instalar aplicativo.
- Sem service worker.
- Sem manifesto PWA.
- Sem funcionamento offline.
- Mantidos os ajustes mobile de Reuniões, Calendário e Datas Comemorativas.
- O acesso continua por https://evangelizacao.dynv6.net

## V38 — Registro de Auditoria

Foi adicionada uma tela exclusiva do administrador chamada **Auditoria**.

O banco registra automaticamente quando houver:
- cadastro, alteração ou exclusão de aluno;
- cadastro, alteração ou exclusão de escala;
- registro ou exclusão de chamada;
- cadastro, alteração ou exclusão de reunião;
- cadastro, alteração ou exclusão de evento/data comemorativa.

Cada registro contém ação, tipo, item, usuário, e-mail, data/hora e os dados antes/depois da alteração.

Observação: como o sistema ainda permite algumas operações sem login individual de professor, essas ações aparecem como **Usuário sem login**. Quando cada professor possuir login próprio, o e-mail/nome autenticado será identificado automaticamente.

## V39 — Super Administrador e Auditoria

Foi liberado um acesso mais direto ao Super Administrador.

- Quando não estiver autenticado, o menu lateral mostra **Acesso Super Administrador**.
- Ao entrar com o e-mail de Super Administrador, o menu libera **Auditoria**, **Configurações** e **Administração**.
- Após o login administrativo, o sistema abre diretamente a tela **Auditoria**.
- A sessão administrativa é acompanhada em tempo real pelo Supabase Auth, sem exigir recarregar a página para liberar o menu.

E-mail de Super Administrador configurado no sistema:
`andreytrindadedossantos@gmail.com`

## V40 — correção de confirmação de e-mail

O cadastro do Super Administrador agora informa explicitamente ao Supabase o retorno correto:
`https://evangelizacao.dynv6.net/admin`

Também foi adicionado o botão **Reenviar confirmação**.

IMPORTANTE — Supabase:
Em Authentication → URL Configuration, configure:
- Site URL: `https://evangelizacao.dynv6.net`
- Redirect URLs: `https://evangelizacao.dynv6.net/**`

Se o Site URL continuar como `http://localhost:3000`, e-mails antigos podem continuar redirecionando para localhost.
Depois de alterar, gere/reenvie um NOVO e-mail de confirmação.

## V41 — Escalas automáticas

A tela **Escalas** agora possui o botão **Gerar automaticamente**, disponível para o Super Administrador.

Funcionamento:
- escolhe o mês;
- encontra todos os sábados do mês;
- ignora sábados que já possuem escala;
- usa somente professores ativos;
- professores do grupo **Adolescentes** entram no rodízio de adolescentes;
- professores do grupo **Menores** entram no rodízio de menores;
- professores do grupo **Geral** podem atuar nas duas turmas;
- prioriza quem participou menos vezes nas escalas existentes;
- evita colocar o mesmo professor nas duas turmas no mesmo sábado, quando houver alternativa;
- faz rodízio entre as mães ativas para auxílio na limpeza;
- gera uma prévia editável antes de gravar;
- o assunto padrão pode ser definido antes da geração e também alterado por sábado;
- ao confirmar, grava todas as escalas de uma vez no Supabase;
- a auditoria registra as escalas criadas automaticamente.

As escalas automáticas recebem internamente a identificação:
`Gerada automaticamente pelo sistema`.

## V42 — botão de escala automática no celular

- O botão **Gerar automaticamente** agora fica sempre visível na tela de Escalas, inclusive no celular.
- No mobile, os botões ficam um abaixo do outro e ocupam 100% da largura.
- A geração automática continua protegida para o Super Administrador.
- Se o celular ainda não estiver autenticado como Super Administrador, tocar em **Gerar automaticamente** direciona para `/admin`.
