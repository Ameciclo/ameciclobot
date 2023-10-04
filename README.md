# Ameciclo Bot [em progresso]
Bot que auxilia a associação em vários processos internos, como fluxo de pagamento, inserção de eventos no calendário, entre outros. 

## Stack
- Telegraf.js
- Typescript
- Firebase Function
- 

## Setup
...


# TODO

## GERAIS
- adicionar automaticamente as novas funções do bot ao subir ele ao firebase
- usar barra alguma coisa e fazer algo, genérico
- admin-ids.js: Pegar administrado@s do grupo no telegram para dar poderes de edição (somente no GT)
- boas vindas tem que ter a alternativa caso a pessoa não tenha o @
- /demadas - Registra demandas gerais para serem feitas
- /comunicacao - Registra demandas da comunicacao
- /informe - Registra informes para a Reunião Ordinária
- /clipping - Registra matérias da Ameciclo

## GRUPOS DE TRABALHO
- listar pasta do GT e dos projetos deste
- dois grupos de telegram compartilharem mesmas funções de um mesmo GT (já que tem grupos criados temporariamente)
- /enviarparapasta - e a pessoa responde um arquivo e vai pra pasta do GT

## DOCUMENTOS
- criar documentos, planilhas, formulários e apresentações no google

## EVENTOS
- solicitar informações de eventos
- eu vou para eventos
- adicionar e remover localizações padrões
- botão "terminou agora"

## PAGAMENTOS
- subir notas e recibos
- lembrar de inserir notas
- coordenadores de GTs fazerem as solicitações
- cadastrar forncedores

## AJUDA
- listar comandos existentes na AJUDA
- /subdominio - Criar um subdominio https://www.namecheap.com/support/api/methods/domains-dns/set-hosts/

## AMECICLOBOT

Objetivos:
 - Gerenciamento da Ameciclo
 - Possibilitar a transparência

Base de dados:
 - Pessoas associadas
 - Grupos de trabalho
 - Projetos
 - Patrimônio
 - Mensagens
 - Transações
 - Documentos
 - Inscritos para informações
 - Subdomínios

 Funções:
 - /pagamento 
 -- Solicitar pagamentos de projetos
 -- Pode ser feita por qualquer pessoa que seja Administradora de um GT
 -- Pede os comprovantes e dá acesso à planilha 
 -- Essa planilha é retornado ao Grupo Financeiro e ao Grupo de Trabalho daquele projeto 

 - /evento 
 -- Criação de eventos na Agenda da Ameciclo 
 -- Notificação para pessoas inscritar
 -- Notificação do GT 
 -- Botão "Eu vou" engajamento
 -- Pede a foto e descrição do evento para as pessoas participantes
 -- Registra essas modificações na agenda
 -- Gera o Boletim informativo mensal 
 -- Confirma pessoas presentes
 -- Lembra uma hora antes as pessoas do "Eu vou" para o registro

 - /documento
 -- Cria documentos na pasta do Gt respectivo
 -- Escolhe-se o tipo de documento que se cria
 -- Gera um nome adequado
 -- Retorna o link do documentos
 -- Faz a distribuição dos poderes de compartilhamento

 - /clipping
 -- Registra as participações na imprensa
 -- Tenta advinhar de que mídia veio
 -- Tenta baixar e arquivar as participações
 -- Calcula o valor de cada imprensa como se fosse um valor da propaganda
 -- Se não descobrir, perguntar 

 - /detalhes -->  /pasta /drive /ata /arquivos 
 -- Pega os links das pastas do GT 
 -- Pega os projetos daquele GT para entregar funções novas 
 -- Mostra link de subgrupos
 -- Guarda link de subgrupos 
 -- Detalhes do grupo em texto junto com Admins 

 - /biblioteca 
 -- faz a gestão de entrada de saída de livros, além de renovações
 -- lembrete de devolução
 -- insere novos livros
 -- atualiza cadastro (telefone)
 -- só autoriza para pessoa associada 

 - /projeto
 -- Lista projetos 
 -- Adiciona projetos 
 -- Anexa projetos a GTs
 -- Gera pastas de projetos com toda a parafernalha de documentos dentro 

 - /encaminhamento
 -- Registra encaminhamento
 -- Registra quem são as pessoas responsáveis e a datas para acontecer 
 -- Lembra as pessoas de executarem e conferem se foram executadas
 -- Mostra no grupo as que foram e não foram cumpridas

 - /mensagem
 -- Manda mensagem para os GTs
 -- Seleciona GTs para que a mensagem chegue
 
 - /links
 -- Lista links úteis
 -- Gera links e subdomínios

 - /increver
 -- Inscreve a pessoa para a agenda da Ameciclo 
 -- Oferece atualização de documentação 

 - /pauta
 -- regista as pautas para próxima ordinária 

 - /transparencia
 -- Mostra as contas daquele mês da Ameciclo
 -- Mostra saldo dos projetos do GT 
 -- mostra pastas onde tem docs financeiros
 -- Mostra o boletim mensal

 - /atualiza
 -- Atualiza lista de GTs
 -- Atualiza pessoas na Admin 
 -- Atualiza pessoas que entram e saem dos GTs e registra 
 -- Atualiza fornecedores ???

 - /salvar
 -- Salva documentos no drive do GT 
 -- Salva documentos no drive da Ameciclo 
 -- Se for foto, colocar em pasta específica

@ameciclobot Portal de Dados 

Base de dados:
 - Pessoas associadas
 -- Todas informações que tem no formulário de inscrição

 - Grupos de trabalho
 -- Nome do grupo
 -- descrição
 -- Link 
 -- Subgrupos
 --- Nome 
 --- Link
 -- Admins 
 -- Participantes
 -- Ex-participantes
 -- Projetos 
 -- Pasta no drive 
 -- Pasta de atas 
 -- Tag de agenda 

 - Projetos
 -- Pasta de projeto 
 -- Planilha financeira
 -- 

 - Patrimônio
 -- Biblioteca 
 --- Lista de livros 
 --- Controle de retirada

 - Mensagens
 - Transações
 - Documentos
 - Inscritos para informações

 - Subdomínios
 -- Nome
 -- URL 


# BOT FUNCTIONS
/inciar
/lembrete       liga ou desliga o envio de lembretes diários
/paraGT         envia mensagem para outro GT
/links          lista links úteis
/projetos       lista projetos importantes
/evento         cria eventos na agenda 
/pagamento      solicita o pagamento
/documento      solicita o pagamento

* Colocar o botão fechar
* Melhorar o texto inicial

/lembrete

* Criar a possibilidade do uso de comando
* Criar a possibilidade de lembre semanal

/paraGT

* Criar a possibilidade de enviar para outro GT (admin-only?)

/links

* Colocar o voltar para o menu
* Colocar o fechar menu

/projetos

* Colocar o voltar para o menu
* Colocar o fechar menu

/evento

* 

/pagamento

*

/documento

* Criar função


FUNÇÕES FORA DO MENU 

* Inserir no menu

/pinf

* trocar para /pai
* formato /pai protocolo senha
* formato responder mensagem 
* perguntar qual o órgão

/pauta

/demanda

/comunicacao

/informe

/encaminhamento

/clipping

FUNÇÕES PROATIVAS

/evento

- Eu vou
Possibilitar o convite personalizado para lembrar uma hora antes do evento
Possibilitar o registro das pessoas na agenda

- Fim de evento
Pedir resumo para pessoas que formam
Pedir fotografia representativa
Pedir qualquer outro registro
Pedir encaminhamentos de reuniões

- Boletim informativo
Criar o boletim a partir das informações colocadas nos eventos

/clipping + /evento 

- Resumo de atividades
Criar o resumo de atividades, com engajamento, quantidade de pessoas, perfil

/pagamento

Solicitar recibos
Solicitar extratos
Fazer resumo financeiro

/encaminhamento

Perguntar se os encaminhamentos já foram realizados
