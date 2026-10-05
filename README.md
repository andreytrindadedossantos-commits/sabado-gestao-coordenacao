

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


## V31 — PWA instalável no Android e iPhone/iPad
- Adicionado manifest PWA completo com ícones 192x192, 512x512 e maskable.
- Adicionado Apple Touch Icon 180x180 e metatags específicas para iOS.
- Adicionado service worker com estratégia network-first para evitar servir versões antigas quando há internet e permitir abertura básica offline.
- Adicionado botão “Instalar aplicativo” no cabeçalho.
- Android/Chrome: usa o prompt nativo quando disponível.
- iPhone/iPad: mostra instruções para Safari → Compartilhar → Adicionar à Tela de Início.
- Adicionado suporte a safe areas do iPhone quando executado em modo standalone.


## V32 — PWA oficial no dynv6
- Domínio oficial do aplicativo: https://evangelizacao.dynv6.net
- PWA configurada para iOS/iPadOS e Android.
- Manifesto usa o dynv6 como id, start_url e scope.
- O alias evangelizacao-juvenil.vercel.app redireciona para o domínio oficial.
- Ícones e service worker receberam versão v32 para evitar cache antigo.
- No iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início.
- No Android: botão Instalar aplicativo ou menu do Chrome → Instalar app.

## V33 — instalação PWA corrigida

- O evento nativo `beforeinstallprompt` agora é capturado antes do React iniciar, evitando perder o prompt de instalação no Chrome Android.
- O manifesto passou a usar `id`, `start_url` e `scope` relativos ao domínio.
- `site.webmanifest` e `sw.js` recebem Content-Type e cache corretos na Vercel.
- O botão usa ícone de celular em vez de ícone de download.
- A ajuda do Android avisa para não usar “Fazer download da página”, pois isso não instala a PWA.
- iPhone/iPad continuam usando Safari → Compartilhar → Adicionar à Tela de Início.
