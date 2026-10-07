

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

## V43 — Login individual dos professores

Novo sistema de acesso:

- Cada professor entra com e-mail e senha próprios.
- O Super Administrador cadastra o professor com o e-mail correto.
- No primeiro acesso, o professor toca em **Primeiro acesso**, informa o e-mail cadastrado e cria a própria senha.
- A conta precisa confirmar o e-mail pelo Supabase.
- Professor inativo não consegue entrar.
- Existe recuperação de senha por e-mail.
- O professor identificado responde reuniões com o próprio nome, sem precisar selecionar manualmente.

### Permissões controladas pelo Super Administrador

Em **Professores e Acessos → Permissões**, é possível liberar ou bloquear:
- Painel;
- Alunos (visualizar / alterar);
- Mães (visualizar / alterar);
- Escalas (visualizar / alterar);
- Reuniões (visualizar / alterar);
- Chamada (visualizar / lançar);
- Histórico;
- Professores;
- Aniversariantes;
- Calendário (visualizar / alterar);
- Datas Comemorativas (visualizar / alterar).

A auditoria passa a identificar o professor autenticado pelo e-mail.

### Banco de dados

`supabase/professor_login_migration.sql` é uma migração aditiva segura e pode ser aplicada antes da publicação.
`supabase/professor_login_rls_after_publish.sql` endurece as políticas de banco e deve ser aplicado somente depois que a V43 estiver publicada, pois passa a exigir login.


## V44 — Login por nome de usuário + senha a cada 30 dias

O administrador não precisa mais cadastrar e-mail para cada professor.

Exemplo:
- Usuário: `Fernanda` → Primeiro acesso → Criar senha.
- Usuário: `Márcio` → Primeiro acesso → Criar senha.

Depois que a pessoa entra corretamente, o navegador mantém a sessão e o sistema somente volta a solicitar usuário e senha depois de **30 dias** (ou antes se a pessoa tocar em **Sair**, limpar os dados do navegador ou trocar de aparelho).

### Administração

Em **Usuários e Permissões**:
- cadastro com nome completo;
- usuário para login;
- telefone opcional;
- turma;
- status;
- permissões individuais;
- indicação “Aguardando primeiro acesso” / “Senha criada”;
- botão **Nova senha**, que apaga a senha anterior e libera a criação de uma nova senha no próximo acesso.

Os usuários antigos recebem automaticamente um login baseado no primeiro nome. Se houver dois primeiros nomes iguais, o segundo recebe um número, e o administrador pode alterar depois.


### Como a senha funciona na V44

A senha é armazenada apenas como **hash bcrypt** em uma área privada do banco (`private`), nunca em texto aberto. O primeiro acesso cria uma sessão aleatória válida por **30 dias**. O navegador envia essa sessão ao Supabase em cada requisição, permitindo também identificar o usuário na Auditoria.

O Super Administrador continua usando o acesso administrativo já existente.


## V45 — correção do usuário Andrey

Foi corrigida a identificação do usuário `Andrey`.

Na V44, o cadastro do usuário Andrey usava o mesmo e-mail do Super Administrador e a função de login o excluía da busca por segurança. Por isso, a criação da senha não era gravada e o login retornava “Usuário ou senha incorretos”.

A V45 permite que o mesmo cadastro tenha:
- acesso normal pelo usuário `Andrey`;
- acesso administrativo separado pelo botão **Acesso do Super Administrador**.

A correção correspondente também foi aplicada no banco Supabase.


## V46 — Permissões: botão Confirmar corrigido

- O modal de permissões agora tem rolagem própria.
- O título permanece visível no topo.
- O botão **Confirmar e salvar permissões** fica fixo na parte inferior do modal.
- Funciona em computador e celular, mesmo quando a lista de permissões é maior que a altura da tela.


## V47 — Andrey: Professor ou Administrador

- O texto **Super Administrador** foi trocado por **Administrador** na interface.
- Ao entrar com o usuário **Andrey** e a senha correta, o sistema mostra duas opções:
  - **Professor** — entra com as permissões normais do professor;
  - **Administrador** — entra com acesso completo ao sistema.
- Essa escolha aparece somente para o usuário `Andrey`.
- Os demais usuários entram normalmente como professores, sem ver essa tela.
- O botão separado de acesso administrativo na tela inicial agora aparece apenas como **Administrador**.
- O modo escolhido fica vinculado à sessão de 30 dias daquele aparelho.
- A correção necessária no Supabase já foi aplicada no projeto atual.


## V48 — Remoção do botão Administrador na tela inicial

- O botão **Administrador** foi removido da tela principal de login.
- O acesso administrativo continua disponível apenas após o usuário **Andrey** entrar com a senha correta e escolher entre **Professor** ou **Administrador**.
- Os demais usuários continuam vendo apenas as opções normais de login.


## V49 — Auditoria de professores e mães auxiliares

Corrigido o registro de auditoria para também gravar:
- cadastro, alteração e exclusão de professores/usuários;
- cadastro, alteração e exclusão de mães auxiliares.

A auditoria continua registrando alunos, escalas, chamadas, reuniões e eventos.

A correção já foi aplicada no Supabase. Registros criados antes desta correção não são gerados retroativamente; novas ações passam a aparecer normalmente.


## V50 — Primeiro acesso com senha de 6 dígitos

- Adicionada orientação clara na tela inicial sobre como criar a senha.
- No primeiro acesso, a nova senha deve possuir exatamente 6 dígitos numéricos.
- Após clicar em **Criar senha** e salvar com sucesso, o sistema volta automaticamente para a tela de login.
- O campo de usuário permanece preenchido e os campos de senha são limpos.
- O usuário então informa a senha criada e clica em **Entrar**.
- O acesso de 30 dias continua igual após o login.


## V51 — Senha com letras, números e caracteres especiais

- A senha não precisa mais ser somente numérica.
- Pode conter letras, números e caracteres especiais.
- Não é obrigatório misturar todos esses tipos.
- A única regra é possuir pelo menos **6 caracteres**.
- Após criar a senha, o sistema continua retornando automaticamente para a tela de login.


## V52 — Mostrar/Ocultar senha

- Adicionado ícone de olho na tela de login e na tela de criação de senha.
- Agora é possível visualizar a senha antes de entrar ou confirmar o primeiro acesso.


## V57 — PWA removido novamente

- Sistema voltou a funcionar somente pelo navegador.
- Removidos manifest, Service Worker e botões de instalação do PWA.
- Mantidas as funcionalidades da V52, incluindo mostrar/ocultar senha.
- Ao abrir esta versão, o sistema tenta remover automaticamente Service Workers e caches deixados pelas versões PWA anteriores.
- O acesso continua 100% online em `https://evangelizacao.dynv6.net/`.


## V58 — Verificação obrigatória em duas etapas

- Login passa a exigir **usuário + senha + código do aplicativo autenticador**.
- No primeiro login desta versão, o usuário configura o segundo fator por **QR Code** ou chave manual.
- Compatível com Google Authenticator, Microsoft Authenticator, Authy e outros aplicativos TOTP.
- Código numérico de 6 dígitos, renovado aproximadamente a cada 30 segundos.
- Após 5 senhas incorretas: bloqueio temporário de 15 minutos.
- Após 5 códigos TOTP incorretos: bloqueio temporário de 15 minutos.
- O Administrador pode usar **Redefinir 2 etapas** quando alguém perde ou troca o celular.
- O acesso administrativo antigo por e-mail foi removido do frontend para impedir um caminho que não passasse pelo segundo fator.
- Andrey continua escolhendo **Professor** ou **Administrador**, mas somente depois de validar senha e TOTP.
- A sessão validada continua com validade de 30 dias no aparelho.
- O PWA continua removido: sistema somente no navegador e 100% online.


## V59 — Botões compactos no celular

- Menu, tema, notificações e botão Sair menores no celular.
- Cabeçalho reduzido para 58px.
- Ícones menores e espaçamento reduzido.
- Relógio/data compactados para liberar mais espaço.
- Ajuste extra para telas até 390px, incluindo Redmi A3.
- Frontend alinhado com a regra de 2FA válida por 3 meses.


## V60 — 2FA realmente a cada 3 meses no mesmo navegador

A V59 ainda solicitava o código novamente após clicar em **Sair**, porque o botão encerrava a sessão usada também como referência da verificação.

A V60 separa duas coisas:

- **Sessão do sistema**: é encerrada normalmente ao clicar em **Sair**.
- **Dispositivo verificado em duas etapas**: permanece reconhecido por **3 meses**.

Assim, no mesmo navegador:
1. Usuário faz login e confirma o código TOTP.
2. O navegador fica confiável por 3 meses.
3. Se clicar em **Sair** e entrar novamente, informa apenas usuário e senha.
4. Ao completar 3 meses desde a última verificação TOTP, o código de 6 dígitos volta a ser obrigatório.
5. A validade não é renovada apenas por entrar/sair; somente uma nova confirmação TOTP inicia outro período de 3 meses.

O código também será solicitado antes dos 3 meses se:
- o usuário limpar os dados/cookies/armazenamento do navegador;
- usar outro navegador ou outro aparelho;
- o Administrador usar **Redefinir 2 etapas**;
- o Administrador liberar uma nova senha.

Sessões válidas das versões V58/V59 são migradas automaticamente para o novo reconhecimento de dispositivo ao abrir a V60.


## V61 — período da verificação configurável pelo Administrador

A tela **Configurações** agora possui a seção **Verificação em duas etapas**.

O Administrador pode escolher:
- quantidade;
- unidade em **Dias** ou **Meses**.

Exemplos:
- 7 dias;
- 30 dias;
- 1 mês;
- 3 meses;
- 6 meses;
- 12 meses.

Limites de segurança:
- 1 a 365 dias;
- 1 a 24 meses.

### Correção importante
Esta versão também corrige o comportamento que fazia o código ser solicitado novamente depois de clicar em **Sair**.

A sessão do sistema e o reconhecimento do navegador agora são independentes:
- **Sair** encerra somente a sessão.
- A autorização da verificação em duas etapas permanece no mesmo navegador até o período configurado vencer.
- O código também volta a ser solicitado se os dados do navegador forem apagados, se outro navegador/aparelho for usado ou se o Administrador redefinir a 2FA.

Quem já estiver com uma sessão válida ao publicar a V61 terá o navegador migrado automaticamente para o novo reconhecimento, quando possível.


## V62 — cada usuário escolhe o próprio período da 2FA

Foi adicionada a página **Minha Segurança**, disponível para todos os usuários autenticados.

Cada professor pode escolher individualmente:
- quantidade;
- unidade em **Dias** ou **Meses**.

Limites:
- 1 a 365 dias;
- 1 a 24 meses.

Exemplos:
- Ana: 30 dias;
- Fernanda: 3 meses;
- Camila: 6 meses;
- Andrey: 12 meses.

A configuração do Administrador em **Configurações** passa a funcionar como **padrão do sistema**. O usuário pode escolher seu próprio período ou clicar em **Usar padrão do sistema**.

Alterar o período de uma pessoa não altera o período dos demais usuários.

O botão **Sair** continua encerrando somente a sessão do sistema. O reconhecimento da verificação em duas etapas permanece no mesmo navegador até vencer o período individual configurado.
