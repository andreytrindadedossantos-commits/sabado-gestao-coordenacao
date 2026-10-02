

## V15 — espaçamento de textos
Padronizado o espaçamento entre nomes, categorias, rótulos e valores em todas as telas. Na chamada, os alunos aparecem no formato Nome - Turma; nas escalas, os campos aparecem no formato Rótulo - Valor.


## V16 — somente tema claro
O sistema agora usa exclusivamente o tema claro. O botão de alternar tema foi removido e o tema claro é forçado no carregamento.


## V18 — tema claro definitivo
O tema escuro foi removido do código e do CSS. Não existe mais botão de troca de tema; o sistema usa somente o tema claro.


## V19 — tema claro definitivo
O CSS foi reconstruído do zero para usar somente tema claro. Foram removidas regras acumuladas de tema escuro e padronizados todos os botões para evitar faixas brancas e problemas de contraste. O `index.html` também força `color-scheme: light` antes de o React iniciar.
