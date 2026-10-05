

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
