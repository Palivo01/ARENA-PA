# Atualização 6.0.1

Leia `ATUALIZACAO-6.0.1.txt`. Correção visual compatível com competições em andamento na 6.0.0. Não há SQL novo nem necessidade de sortear novamente. Publique o pacote completo e recarregue as páginas após o deploy.

# Atualização 6.0.0

Leia `ATUALIZACAO-6.0.0.txt`. A versão inclui todas as tabelas de 6 a 32 duplas. Se o SQL 005 da 5.3.0 já foi executado, não há SQL adicional. Se ainda usa 5.2.4, execute `supabase/005_v53_crossings.sql` antes de publicar. Sorteios e resultados existentes permanecem preservados.

As instruções abaixo são o histórico de instalação e atualização das versões anteriores.

# Atualização 5.3.0

Para atualizar uma instalação 5.2.4, siga `ATUALIZACAO-5.3.0.txt`: execute apenas o SQL 005, publique o pacote completo e atualize os aparelhos. Categorias antigas não recebem cruzamentos retroativos. A nova regra vale para novos sorteios.

O guia abaixo mantém as instruções de instalação da base e o histórico das funcionalidades. Após instalar 001, 003 e 004, instale também `supabase/005_v53_crossings.sql` antes de usar os arquivos 5.3.

# Revisão 5.2.1

Leia `ATUALIZACAO-5.2.1.txt`. Não há SQL adicional para quem já instalou 5.2.
Publique o conteúdo completo na raiz servida e confira v5.2.1 no rodapé.

# Atualização para 5.2.0

Se a 5.1 já está instalada e seu SQL 003 foi executado, aplique somente
`supabase/004_v52_portal.sql` como postgres antes de publicar o site.
O comando cria o catálogo dos eventos publicados e não refaz sorteios nem altera
resultados existentes. Se ainda estiver na base 5.0, execute primeiro
`supabase/003_v51_logos.sql` e depois 004. Para instalação nova, execute 001, 003 e 004.

Faça backup, feche os painéis antigos e publique todos os arquivos desta versão,
incluindo assets, vendor, viewport.js, print-bracket.js e portal.js.
A pasta supabase não precisa ir para a hospedagem. Consulte COMECE-AQUI.txt.

---

# Instalação da versão 5.0.1

**Se você já instalou a versão 5.0.0 e executou a migração, não precisa de outro SQL.** Publique os arquivos atualizados e siga `CONFIGURAR-EMAIL-SUPABASE.txt` para configurar as URLs e modelos de e-mail. O restante deste guia cobre a instalação inicial da V5.

Esta versão usa novas tabelas e funções no mesmo projeto Supabase. Execute a migração antes de publicar os arquivos do site. A configuração de conexão existente foi preservada em `config.js`.

## Preparar e migrar

1. Exporte o backup JSON no painel atual, guarde uma cópia do repositório anterior e confirme que os últimos resultados foram salvos.
2. Faça a instalação fora do horário de jogos. Interrompa os lançamentos e feche as abas antigas dos organizadores. Entre a migração e a publicação, a versão antiga perde acesso à tabela arquivada.
3. No Supabase, abra **Authentication > Users**. Confira se a conta administrativa é `roteirizze@outlook.com` e se o e-mail está confirmado. O SQL procura essa conta existente; ele não cria usuário nem senha. Se o endereço for diferente, ajuste somente a variável `owner_email` no final do SQL.
4. Abra **SQL Editor**, selecione a função **postgres**, cole e execute o conteúdo completo de `supabase/001_v5_multi_competicoes.sql`. O arquivo tem uma transação única. Se a conta administrativa não for encontrada, a execução falha sem aplicar essa transação. Corrija o endereço ou a confirmação da conta e execute o arquivo completo novamente.
5. Aguarde o sucesso da execução. Somente então copie o conteúdo desta pasta para a raiz do repositório GitHub e publique pela hospedagem que você já utiliza. Preserve `assets`, `vendor` e os scripts novos. Não há build ou dependências para instalar no site.
6. Depois que a hospedagem terminar de publicar, atualize as páginas em todos os aparelhos, entre por `admin.html` com a conta administrativa e abra a competição anterior. Confira quantidade de categorias, duplas, posições sorteadas e placares antes de retomar o uso.

A migração copia cada registro existente de `public.torneio_competitions` para `public.rt_competitions` com o mesmo conteúdo de competição e revisão, atribuído à conta administrativa. O sorteio não é executado novamente. A tabela anterior fica preservada como arquivo para o proprietário do banco, sem acesso das versões antigas do site. Executar o SQL novamente não sobrescreve competições já copiadas ou criadas na versão nova.

Na versão 5.2, o endereço público inicial lista os torneios publicados. A competição antiga de ID `principal` mantém seu link próprio. Cada competição também tem seu link próprio, disponível em **Copiar link público** ou **Copiar link**. Compartilhe o link público gerado pelo painel; o endereço administrativo exige autenticação e autorização.

## Convites e senhas

A página `auth.html` confirma o retorno do e-mail e permite criar a primeira senha do convite, recuperar uma senha ou alterar a senha da conta autenticada. Os retornos antigos em `index.html` e `admin.html` são encaminhados para ela. A configuração de URLs e dos modelos está em `CONFIGURAR-EMAIL-SUPABASE.txt`. Nenhuma senha é definida pelo administrador ao usar o fluxo de convite; a pessoa escolhe a própria senha depois de validar o link.

## Liberar outro organizador

1. No Supabase, crie ou convide a conta em **Authentication > Users**, usando o e-mail correto. Confirme a conta ou aguarde a confirmação do convite. Na criação manual, defina as credenciais de acordo com seu processo de acesso. Convites e recuperação precisam dos endereços de retorno do seu site permitidos na configuração de autenticação.
2. Entre no painel geral com o e-mail da Roteirizze e use **Organizadores > Autorizar organizador**, informando o mesmo e-mail.
3. O organizador entra por `admin.html` com as próprias credenciais e usa **Criar competição**. Ele só pode listar e gerenciar as competições que criou. A conta geral vê todas e pode suspender ou reativar o acesso de organizadores.

Somente a conta geral pode autorizar organizadores. O isolamento é aplicado no banco, além da interface. As contas anteriormente autorizadas na versão antiga precisam ser autorizadas no novo painel; a migração libera inicialmente a conta geral. Suspender um organizador bloqueia a administração, mas não remove suas competições nem encerra seus links públicos.

Não coloque chave secreta ou `service_role` nos arquivos do site. O arquivo `config.js` usa a chave pública já existente. Nomes de atletas de categorias sorteadas são exibidos no acompanhamento. Cadastros ainda sem sorteio são ocultados pela função de leitura pública.

## Operação durante o torneio

Os blocos continuam indicados para facilitar a leitura, mas qualquer jogo com as duas duplas definidas está liberado. Permanecem os controles de quadra ocupada e atleta simultaneamente em quadra. Use nomes consistentes entre categorias e diferencie homônimos.

Ao corrigir somente o placar e manter a mesma dupla vencedora, os demais resultados continuam válidos. Ao trocar a dupla vencedora, os resultados afetados ficam **Em revisão**, com o registro anterior preservado. Jogos independentes são mantidos. A revisão mostra o placar antigo e as duplas antigas; para registrar um resultado entre os participantes previstos agora, é necessário preencher o novo placar e confirmar as duplas. Se a partida já disputada envolveu outra dupla, é preciso decidir a correção esportiva antes de registrar o resultado. O sistema não transforma um jogo entre adversários diferentes em resultado válido automaticamente.

Resolva conflitos da origem para a frente. Ao restaurar um resultado anterior, os registros preservados que voltarem a corresponder às mesmas duplas voltam a valer automaticamente. Se uma correção afetar participantes de um jogo em quadra, o sistema pede que esse jogo seja reaberto antes. **Reabrir somente esta partida** remove apenas o registro escolhido; registros dependentes continuam preservados para conferência.

**Sortear novamente** segue sendo uma ação diferente: mantém os nomes e apaga o histórico da categoria para fazer outro sorteio, mediante a palavra SORTEAR. Use **Criar competição** para um novo evento; **Zerar competição** limpa apenas a competição aberta.

O estado do painel é automático: preparação até existir categoria sorteada; andamento enquanto houver jogos pendentes; finalizada quando todas as categorias terminarem. Uma competição antiga migrada aparece inicialmente em preparação ou andamento e tem seu estado recalculado ao próximo salvamento.

## Consumo e concorrência

O acompanhamento consulta uma revisão pequena a cada 10 segundos, baixando a competição completa apenas quando essa revisão muda. Depois de encerrado, o intervalo é de 60 segundos. Abas ocultas pausam as consultas. No painel de uma competição, a revisão é conferida a cada 5 segundos quando não há formulário sendo editado ou modal aberto. A lista de competições é atualizada ao abrir ou pelo botão **Atualizar lista**.

Isso reduz o tráfego de respostas repetidas, mas as consultas continuam consumindo recursos do projeto. O consumo real depende da quantidade de espectadores e alterações. Não há promessa de um número fixo de torneios suportados pelo plano.

Se duas pessoas tentarem salvar a mesma competição sobre revisões diferentes, o banco recusa a gravação desatualizada. Exporte a tentativa pendente se precisar guardá-la, recarregue os dados do servidor e confira antes de lançar novamente. Espere a indicação de salvamento antes de fechar o painel.

## Backups e verificação

O backup JSON continua usando o campo de formato `version: 3`; isso não é o número da versão do site. A versão 5 acrescenta o vínculo dos resultados com os IDs das duplas que jogaram. Essa informação permite detectar conflitos. Backups antigos válidos recebem esse vínculo ao carregar. Os backups e as importações se referem à competição aberta, sem substituir outras competições da lista.

Para inspecionar a instalação, execute o arquivo opcional `supabase/002_verificar_instalacao.sql` no SQL Editor como postgres. Ele só consulta o cadastro administrativo, metadados de competições e a igualdade entre a cópia atual e o arquivo anterior. Após novos salvamentos, é esperado que a cópia atual tenha revisão e conteúdo diferentes da tabela arquivada.

Os testes locais da entrega cobrem 98 casos JavaScript e 21 verificações PostgreSQL. Consulte COMECE-AQUI.txt para o escopo e as limitações da validação. Para repetir os testes JavaScript com Node.js:

```sh
node --test tests/*.test.js
```

A migração foi verificada em PostgreSQL local. A instalação no seu projeto Supabase ainda precisa ser executada e conferida por você. Não rode uma versão antiga do site após a migração. Se precisar voltar de versão, interrompa os lançamentos e exporte primeiro os dados atualizados de todas as competições; a tabela arquivada contém somente o estado anterior à migração.
