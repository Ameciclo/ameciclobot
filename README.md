# 🚴 Ameciclo Bot

Bot do Telegram desenvolvido para automatizar e otimizar os processos internos da Ameciclo (Associação Metropolitana de Ciclistas do Recife). O bot integra múltiplos serviços Google, Azure AI e Firebase para oferecer uma solução completa de gestão organizacional através do Telegram.

## 🎯 Sobre a Ameciclo

A Ameciclo é uma organização da sociedade civil que promove o uso da bicicleta como meio de transporte sustentável no Grande Recife. Este bot foi desenvolvido para digitalizar e automatizar processos administrativos, financeiros e de comunicação da associação.

## 🚀 Funcionalidades Principais

O bot oferece **28 comandos ativos** organizados em categorias funcionais:

### 📄 Gestão de Documentos
- `/unir_pdfs` - Une múltiplos arquivos PDF em um único documento usando PDF-lib
- `/transcrever` - Transcreve áudios e vídeos para texto usando Azure Whisper AI
- `/documento` - Cria Google Docs automaticamente em pastas organizadas por grupo de trabalho
- `/arquivar_comprovante` - Arquiva comprovantes de pagamento no Google Drive com categorização automática
- `/arquivar_extrato_pdf` - Processa e arquiva extratos bancários em PDF com OCR
- `/apresentacao` - Cria Google Slides com templates organizacionais
- `/modelo` - Biblioteca de modelos de documentos com sistema de cópia inteligente

### 💰 Gestão Financeira
- `/processar_extrato_cc` - Processa extratos de conta corrente com reconciliação automática
- `/processar_extrato_fi` - Analisa extratos de fundos de investimento e gera relatórios
- `/processar_extrato` - Processamento geral de extratos bancários
- `/atualizar_pendencias` - Monitora e atualiza pendências financeiras em planilhas Google Sheets
- `/atualizar_projetos` - Monitoramento e atualização de status de projetos em tempo real
- **Sistema de Aprovação**: Workflow automatizado com notificações para coordenadores
- **Central Ameciclista**: Interface web para solicitações de pagamento

### 📅 Eventos e Comunicação
- `/evento` - Cria eventos no Google Calendar com IA para extração de dados de texto natural
- `/atribuir_evento` - Atribui eventos a grupos de trabalho específicos
- `/complementar_evento` - Adiciona informações complementares a eventos existentes
- `/comunicacao` - Ferramentas para comunicação interna e externa
- `/informe` - Sistema de criação e distribuição de informes organizacionais
- `/clipping` - Gestão de clipping de notícias e mídia
- **Agenda Automática**: Envio diário (16:20) e semanal (domingos) de agenda para grupos de trabalho

### 📊 Gestão Organizacional
- `/planilha` - Integração completa com Google Sheets para análise de dados
- `/registrar_planilha` - Sistema de registro e catalogação de planilhas organizacionais
- `/pauta` - Criação e gestão de pautas de reuniões com templates automáticos
- `/demanda` - Sistema de gestão de demandas internas com rastreamento
- `/encaminhamento` - Workflow de encaminhamentos internos com rastreamento
- `/pedido_de_informacao` - Sistema completo de gestão de pedidos de informação pública
- `/resumo` - Gera resumos executivos de atividades

### 🔧 Utilitários e Ferramentas
- `/formulario` - Cria Google Forms automaticamente com monitoramento de respostas
- `/enquete` - Cria enquetes interativas no Telegram
- `/qrcode` - Gera códigos QR para links e textos
- `/ajuda` - Sistema de ajuda contextual e lista de comandos
- `/versao` - Controle de versão e changelog do bot
- `/quem_sou_eu` - Perfil do usuário e permissões no sistema

## 🛠️ Stack Tecnológica

### Core
- **Node.js 22** - Runtime JavaScript com suporte às últimas funcionalidades
- **TypeScript 5.7** - Linguagem tipada para maior robustez e manutenibilidade
- **Telegraf.js 4.10** - Framework moderno para bots do Telegram
- **ESLint + Google Config** - Padronização de código

### Cloud & Serverless
- **Firebase Functions** - Computação serverless para escalabilidade automática
- **Firebase Admin SDK 13.0** - Gerenciamento de dados e autenticação
- **Firebase Realtime Database** - Banco de dados em tempo real para workflows
- **Google Cloud Run** - Hospedagem de funções serverless

### Integrações Google
- **Google Drive API** - Armazenamento e organização de arquivos
- **Google Sheets API** - Manipulação de planilhas e relatórios
- **Google Calendar API** - Gestão de eventos e agendas
- **Google Docs API** - Criação e edição de documentos
- **Google Slides API** - Apresentações automatizadas
- **Google Forms API** - Formulários dinâmicos
- **Google APIs Client 144.0** - Cliente unificado para APIs Google

### Integrações Azure AI
- **Azure OpenAI (GPT-3.5)** - Processamento de linguagem natural
- **Azure Whisper** - Transcrição de áudio e vídeo
- **Azure Cognitive Services** - Serviços de IA

### Bibliotecas Especializadas
- **PDF-lib 1.17** - Manipulação avançada de PDFs
- **pdf-parse 1.1** - Extração de texto de PDFs
- **csv-parse 5.6** - Processamento de arquivos CSV
- **cheerio 1.1** - Web scraping e parsing HTML
- **axios 1.8** - Cliente HTTP robusto
- **form-data 4.0** - Upload de arquivos multipart
- **qrcode 1.5** - Geração de códigos QR
- **dotenv 16.4** - Gerenciamento de variáveis de ambiente

## 🏗️ Arquitetura do Sistema

### Estrutura Modular
```
functions/src/
├── commands/          # Comandos do bot (25+ comandos)
├── callbacks/         # Handlers de callbacks inline
├── handlers/          # Handlers de eventos específicos
├── services/          # Integrações externas (Google, Azure, Firebase)
├── scheduler/         # Tarefas agendadas (cron jobs)
├── utils/             # Utilitários e helpers
├── config/            # Configurações e tipos
├── credentials/       # Configurações de APIs (não versionadas)
└── messages/          # Templates de mensagens
```

### Fluxos Principais

#### 1. Fluxo de Pagamentos
```
Usuário → Solicitação → Validação → Aprovação → Planilha → Arquivo
```

#### 2. Gestão de Eventos
```
Texto Natural → IA (GPT) → Extração de Dados → Google Calendar → Notificações
```

#### 3. Processamento de Documentos
```
Upload → Processamento → Categorização → Google Drive → Notificação
```

### Tarefas Agendadas (Schedulers)
- **Formulários**: Verifica respostas a cada 2 horas (checkForms)
- **Pagamentos**: Monitora pagamentos agendados (seg/qua/sex às 8h) (checkScheduledPayments)
- **Eventos**: Envia agenda diária (16:20) e semanal (domingos) (checkEvents)
- **Pedidos de Informação**: Verifica prazos diariamente (19h) (checkPedidosInformacao)
- **Eventos Próximos**: Notifica sobre eventos do dia seguinte (checkUpcomingEvents)

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js 22+
- Firebase CLI
- Conta Google Cloud com APIs habilitadas
- Conta Azure com serviços de IA
- Bot do Telegram criado via @BotFather

### 1. Clone e Instale
```bash
git clone <repository-url>
cd ameciclobot
cd functions
npm install
```

### 2. Configure Firebase
```bash
firebase login
firebase use --add
# Selecione seu projeto Firebase
```

### 3. Configure Variáveis de Ambiente
Crie o arquivo `.env` em `functions/`:
```env
# Telegram
BOT_TOKEN=seu_token_do_telegram_bot
DEV_BOT_TOKEN=token_do_bot_de_desenvolvimento

# Firebase
FB_BOTFUNCTION_URL=https://sua-funcao.cloudfunctions.net
API_KEY=sua_api_key_firebase
FB_PROJECT_ID=seu-projeto-firebase
FB_PRIVATE_KEY_ID=id_da_chave_privada
FB_CLIENT_EMAIL=email_do_service_account
FB_CLIENT_ID=id_do_cliente
FB_CLIENT_X509_CERT_URL=url_do_certificado
FB_CLIENT_SECRET=secret_do_cliente

# Desenvolvimento
DEV_MODE=false
```

### 4. Configure Credenciais
Crie os arquivos JSON em `functions/src/credentials/`:

#### `telegram.json`
```json
{
  "token": "seu_token_do_bot",
  "devToken": "token_de_desenvolvimento"
}
```

#### `google.json`
```json
{
  "type": "service_account",
  "project_id": "seu-projeto",
  "private_key_id": "id-da-chave",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "bot@projeto.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

#### `gpt35.json`
```json
{
  "endpoint": "https://seu-recurso.openai.azure.com/",
  "apiKey": "sua-chave-azure-openai"
}
```

#### `whisper.json`
```json
{
  "endpoint": "https://seu-whisper.cognitiveservices.azure.com/",
  "apiKey": "sua-chave-whisper"
}
```

#### `workgroupsfolders.json`
```json
[
  {
    "label": "Secretaria",
    "value": -123456789,
    "folderId": "id-da-pasta-drive"
  },
  {
    "label": "Financeiro",
    "value": -987654321,
    "folderId": "id-da-pasta-drive"
  }
]
```

#### `calendars.json`
```json
{
  "primary": "calendario@ameciclo.org",
  "events": "eventos@ameciclo.org"
}
```

## 🚀 Desenvolvimento

### Scripts disponíveis:

```bash
# Compilar TypeScript
npm run build

# Executar em modo de desenvolvimento
npm run serve

# Assistir mudanças (recompilação automática)
npm run watch

# Deploy para produção
npm run deploy

# Executar linter (ESLint)
npm run lint

# Ver logs do Firebase Functions
npm run logs

# Executar testes
npm test

# Testar pedidos de informação
npm run test:pedidos
```

### Estrutura do projeto:

```
ameciclobot/
├── functions/
│   ├── src/
│   │   ├── commands/          # 28 comandos do bot
│   │   ├── callbacks/         # 10 handlers de callbacks inline
│   │   ├── handlers/          # Handlers de eventos específicos
│   │   ├── services/          # Integrações (Google, Azure, Firebase)
│   │   ├── scheduler/         # 5 tarefas agendadas (cron jobs)
│   │   ├── utils/             # Utilitários e helpers
│   │   ├── config/            # Configurações e tipos
│   │   ├── credentials/       # Arquivos de credenciais (não versionados)
│   │   ├── messages/          # Templates de mensagens
│   │   ├── test/              # Testes unitários
│   │   ├── commands.ts        # Registro de comandos
│   │   └── index.ts           # Ponto de entrada principal
│   ├── lib/                   # Código TypeScript compilado
│   ├── .env                   # Variáveis de ambiente
│   ├── package.json           # Dependências e scripts
│   ├── tsconfig.json          # Configuração TypeScript
│   └── eslint.config.js       # Configuração ESLint
├── .github/workflows/         # CI/CD GitHub Actions
├── firebase.json              # Configuração Firebase
├── .firebaserc                # Projetos Firebase
└── README.md                  # Documentação

## 🔧 Configuração Detalhada

### 5. Configure Google Cloud APIs

1. **Acesse o Google Cloud Console**:
   - Crie um novo projeto ou use existente
   - Ative as seguintes APIs:
     - Google Drive API
     - Google Sheets API
     - Google Calendar API
     - Google Docs API
     - Google Slides API
     - Google Forms API

2. **Crie Service Account**:
   ```bash
   # Via gcloud CLI
   gcloud iam service-accounts create ameciclo-bot \
     --display-name="Ameciclo Bot Service Account"
   
   # Gere chave JSON
   gcloud iam service-accounts keys create google.json \
     --iam-account=ameciclo-bot@seu-projeto.iam.gserviceaccount.com
   ```

3. **Configure Domain-wide Delegation**:
   - No Google Admin Console
   - Adicione o Client ID do service account
   - Escopos necessários:
     ```
     https://www.googleapis.com/auth/drive
     https://www.googleapis.com/auth/spreadsheets
     https://www.googleapis.com/auth/calendar
     https://www.googleapis.com/auth/documents
     https://www.googleapis.com/auth/presentations
     https://www.googleapis.com/auth/forms
     ```

### 6. Configure Azure AI Services

1. **Azure OpenAI**:
   ```bash
   # Crie recurso via Azure CLI
   az cognitiveservices account create \
     --name ameciclo-openai \
     --resource-group ameciclo-rg \
     --kind OpenAI \
     --sku S0 \
     --location eastus
   
   # Deploy modelo GPT-3.5-turbo
   az cognitiveservices account deployment create \
     --name ameciclo-openai \
     --resource-group ameciclo-rg \
     --deployment-name gpt-35-turbo \
     --model-name gpt-35-turbo \
     --model-version "0613"
   ```

2. **Azure Speech Services (Whisper)**:
   ```bash
   az cognitiveservices account create \
     --name ameciclo-speech \
     --resource-group ameciclo-rg \
     --kind SpeechServices \
     --sku S0 \
     --location eastus
   ```

### 7. Configure Firebase

1. **Estrutura do Realtime Database**:
   ```json
   {
     "requests": {
       "request_id": {
         "status": "pending|confirmed|cancelled",
         "transactionType": "string",
         "project": { "name": "string", "id": "string" },
         "supplier": { "name": "string", "nickname": "string" },
         "value": "number",
         "paymentDate": "string",
         "createdAt": "timestamp"
       }
     },
     "calendar": {
       "event_id": {
         "title": "string",
         "date": "string",
         "workgroup": "string",
         "participants": ["user_ids"]
       }
     },
     "forms": {
       "form_id": {
         "sheetId": "string",
         "telegramGroupId": "number",
         "lastRow": "number",
         "responsesTabGid": "string",
         "formName": "string"
       }
     },
     "users": {
       "user_id": {
         "name": "string",
         "username": "string",
         "workgroup": "string",
         "permissions": ["array"]
       }
     },
     "informationRequests": {
       "request_id": {
         "title": "string",
         "entity": "string",
         "deadline": "string",
         "status": "pending|sent|received|expired"
       }
     }
   }
   ```

2. **Regras de Segurança**:
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null",
       "requests": {
         ".indexOn": ["status", "transactionType", "paymentDate"]
       },
       "calendar": {
         ".indexOn": ["date", "workgroup"]
       }
     }
   }
   ```

### 8. Deploy e Testes

1. **Deploy Inicial**:
   ```bash
   # Compile o projeto
   npm run build
   
   # Deploy para Firebase
   npm run deploy
   
   # Verifique os logs
   npm run logs
   ```

2. **Teste Local**:
   ```bash
   # Inicie emuladores Firebase
   npm run serve
   
   # Em outro terminal, teste comandos
   npm run test:pedidos
   ```

3. **Configuração do Webhook**:
   ```bash
   # Configure webhook do Telegram
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://sua-funcao.cloudfunctions.net/botFunction"}'
   ```

### 9. Configuração de Schedulers

Os schedulers são configurados automaticamente no deploy. Para ajustar horários:

```typescript
// Em functions/src/index.ts
export const scheduledCheckEvents = functions
  .region('us-central1')
  .pubsub
  .schedule('20 16 * * *') // Diário às 16:20
  .timeZone('America/Recife')
  .onRun(async (context) => {
    await checkEvents(bot);
  });
```

### 10. Monitoramento e Logs

1. **Firebase Console**: Monitore execuções e erros
2. **Google Cloud Logging**: Logs detalhados
3. **Telegram**: Notificações de erro em grupos administrativos

```bash
# Ver logs em tempo real
firebase functions:log --follow

# Filtrar logs por função
firebase functions:log --only functions:botFunction
```

## 📊 Estatísticas do Projeto Atual

- **Versão**: 3.0.0
- **28 Comandos** ativos implementados
- **10 Callbacks** para interações inline
- **5 Schedulers** para automações
- **6 Integrações** principais (Google APIs, Azure AI, Firebase)
- **2 Handlers** especializados
- **5 Serviços** externos
- **15+ Tipos de documentos** suportados
- **Múltiplos grupos** de trabalho gerenciados
- **Processamento em tempo real** de solicitações
- **Backup automático** e sincronização contínua

## 🔄 Recursos Avançados

### Inteligência Artificial
- **Processamento de Linguagem Natural**: Extração automática de dados de eventos a partir de texto livre usando GPT-3.5
- **Transcrição Automática**: Conversão de áudios e vídeos em texto usando Azure Whisper
- **Análise de Documentos**: Processamento inteligente de PDFs e extratos bancários com OCR
- **Geração de Conteúdo**: Criação automática de documentos, apresentações e formulários

### Automações
- **Reconciliação Bancária**: Matching automático entre extratos e planilhas financeiras
- **Notificações Inteligentes**: Alertas contextuais baseados em prazos, eventos e status
- **Backup Automático**: Sincronização contínua com Google Drive e Firebase
- **Relatórios Automáticos**: Geração de relatórios financeiros e de atividades
- **Agenda Inteligente**: Distribuição automática de eventos por grupos de trabalho

### Monitoramento e Segurança
- **Health Checks**: Verificação automática de APIs e serviços
- **Logs Estruturados**: Sistema completo de logging para debugging e auditoria
- **Métricas de Uso**: Acompanhamento de comandos mais utilizados e performance
- **Error Tracking**: Captura e notificação de erros em tempo real
- **Controle de Acesso**: Sistema de permissões por grupo e usuário
- **Auditoria Completa**: Log de todas as ações sensíveis com timestamp e usuário

## 📝 Guia de Uso

### Primeiros Passos

1. **Configuração Inicial**:
   - Adicione o bot aos grupos de trabalho da Ameciclo
   - Configure permissões de administrador
   - Execute `/start` para inicializar

2. **Comandos Básicos**:
   ```
   /help - Lista todos os comandos disponíveis
   /versao - Versão atual e changelog
   /quem_sou_eu - Suas informações e permissões
   ```

### Fluxos de Trabalho Principais

#### 💰 Solicitação de Pagamento
```
1. /pagamento
2. Preencha os dados solicitados
3. Aguarde aprovação dos coordenadores
4. Acompanhe o status na planilha
```

#### 📅 Criação de Evento
```
1. /evento Reunião da diretoria amanhã às 14h na sede
2. Bot extrai dados automaticamente
3. Confirme os detalhes
4. Evento criado no Google Calendar
```

#### 📄 Gestão de Documentos
```
1. /documento Ata da Reunião de Janeiro
2. Google Docs criado automaticamente
3. Arquivo movido para pasta do grupo
4. Link compartilhado no chat
```

### Grupos de Trabalho

O bot reconhece diferentes grupos de trabalho:
- **Secretaria** - Gestão geral e administrativa
- **Financeiro** - Controle financeiro e pagamentos
- **Projetos** - Gestão de projetos específicos
- **Comunicação** - Marketing e comunicação
- **Advocacy** - Ações de advocacy e políticas públicas

### Permissões e Segurança

- Comandos financeiros restritos a coordenadores
- Validação de grupos para comandos sensíveis
- Log completo de todas as ações
- Backup automático de dados importantes

## 🔄 Recursos Avançados

### Inteligência Artificial
- **Processamento de Linguagem Natural**: Extração automática de dados de eventos a partir de texto livre
- **Transcrição Automática**: Conversão de áudios e vídeos em texto usando Azure Whisper
- **Análise de Documentos**: Processamento inteligente de PDFs e extratos bancários

### Automações
- **Reconciliação Bancária**: Matching automático entre extratos e planilhas
- **Notificações Inteligentes**: Alertas contextuais baseados em prazos e eventos
- **Backup Automático**: Sincronização contínua com Google Drive
- **Relatórios Automáticos**: Geração de relatórios financeiros e de atividades

### Monitoramento
- **Health Checks**: Verificação automática de APIs e serviços
- **Logs Estruturados**: Sistema completo de logging para debugging
- **Métricas de Uso**: Acompanhamento de comandos mais utilizados
- **Error Tracking**: Captura e notificação de erros em tempo real



## 🤝 Contribuição e Desenvolvimento

### Como Contribuir

1. **Fork e Clone**:
   ```bash
   git clone https://github.com/seu-usuario/ameciclobot.git
   cd ameciclobot
   ```

2. **Configuração de Desenvolvimento**:
   ```bash
   cd functions
   npm install
   cp .env.example .env
   # Configure suas variáveis de ambiente
   ```

3. **Desenvolvimento**:
   ```bash
   npm run watch  # Compilação automática
   npm run serve  # Servidor local
   ```

4. **Testes**:
   ```bash
   npm run lint   # Verificação de código
   npm test       # Testes unitários
   ```

5. **Deploy**:
   ```bash
   npm run deploy # Deploy para produção
   ```

### Padrões de Código

- **TypeScript** obrigatório para type safety
- **ESLint** configurado com regras do Google
- **Prettier** para formatação consistente
- **Conventional Commits** para mensagens de commit
- **Documentação JSDoc** para funções públicas

### Estrutura de Comandos

Todos os comandos seguem o padrão:
```typescript
export const nomeCommand = {
  register: (bot: Telegraf) => void,
  name: () => string,
  description: () => string,
  help: () => string
};
```

## 📋 Roadmap e Melhorias

### Em Desenvolvimento
- [ ] Interface web para administração
- [ ] API REST para integrações externas
- [ ] Sistema de plugins para comandos customizados
- [ ] Dashboard de métricas e analytics
- [ ] Integração com WhatsApp Business

### Melhorias Planejadas
- [ ] Cache inteligente para melhor performance
- [ ] Sistema de backup incremental
- [ ] Notificações push personalizadas
- [ ] Integração com sistemas de terceiros
- [ ] Modo offline para comandos críticos

## 🔒 Segurança e Privacidade

- **Criptografia**: Todas as comunicações são criptografadas
- **Controle de Acesso**: Sistema de permissões por grupo e usuário
- **Auditoria**: Log completo de todas as ações sensíveis
- **Backup Seguro**: Dados armazenados com redundância
- **Compliance**: Adequação à LGPD e boas práticas de segurança

## 🆘 Suporte e Documentação

### Canais de Suporte
- **Issues GitHub**: Para bugs e solicitações de features
- **Documentação**: Wiki completa no repositório
- **Telegram**: Grupo de suporte técnico interno
- **Email**: Contato direto com a equipe de desenvolvimento

### Recursos Adicionais
- [📖 Wiki Completa](wiki/)
- [🐛 Relatório de Bugs](issues/)
- [💡 Solicitações de Features](issues/)
- [📊 Changelog Detalhado](CHANGELOG.md)
- [🔧 Guia de Desenvolvimento](CONTRIBUTING.md)

## 📄 Licença e Créditos

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

### Tecnologias Utilizadas
- [Telegraf.js](https://telegraf.js.org/) - Framework para bots Telegram
- [Firebase](https://firebase.google.com/) - Plataforma de desenvolvimento
- [Google APIs](https://developers.google.com/) - Integrações Google
- [Azure AI](https://azure.microsoft.com/ai/) - Serviços de IA
- [PDF-lib](https://pdf-lib.js.org/) - Manipulação de PDFs

## 🔒 Segurança e Compliance

- **Criptografia**: Todas as comunicações são criptografadas via HTTPS/TLS
- **Controle de Acesso**: Sistema de permissões granular por grupo e usuário
- **Auditoria**: Log completo de todas as ações sensíveis com rastreabilidade
- **Backup Seguro**: Dados armazenados com redundância no Firebase e Google Drive
- **Compliance**: Adequação à LGPD e boas práticas de segurança
- **Validação de Entrada**: Sanitização e validação de todos os inputs do usuário
- **Rate Limiting**: Proteção contra spam e uso abusivo

## 🌐 Integrações Externas

### APIs Google (6 integrações)
- **Google Drive**: Armazenamento e organização hierárquica de arquivos
- **Google Sheets**: Manipulação avançada de planilhas com fórmulas
- **Google Calendar**: Gestão completa de eventos com recorrência
- **Google Docs**: Criação e edição colaborativa de documentos
- **Google Slides**: Apresentações automatizadas com templates
- **Google Forms**: Formulários dinâmicos com monitoramento de respostas

### Azure AI Services (2 integrações)
- **Azure OpenAI GPT-3.5**: Processamento de linguagem natural avançado
- **Azure Whisper**: Transcrição de áudio/vídeo com alta precisão

### Firebase (3 serviços)
- **Firebase Functions**: Computação serverless escalável
- **Firebase Realtime Database**: Banco de dados em tempo real
- **Firebase Admin SDK**: Gerenciamento de autenticação e dados

## 📝 Documentação Adicional

- [ANALISE_MELHORIAS.md](ANALISE_MELHORIAS.md) - Análise detalhada de melhorias
- [PADRONIZACAO_COMANDOS.md](PADRONIZACAO_COMANDOS.md) - Padrões de desenvolvimento
- [PLANO_UNIFORMIZACAO_COMANDOS.md](PLANO_UNIFORMIZACAO_COMANDOS.md) - Plano de uniformização
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) - Pipeline CI/CD

## 🎆 Roadmap Futuro

### Em Desenvolvimento
- [ ] Interface web administrativa completa
- [ ] API REST pública para integrações externas
- [ ] Sistema de plugins para comandos customizados
- [ ] Dashboard de métricas e analytics em tempo real
- [ ] Integração com WhatsApp Business API

### Melhorias Planejadas
- [ ] Cache inteligente Redis para melhor performance
- [ ] Sistema de backup incremental automatizado
- [ ] Notificações push personalizadas por usuário
- [ ] Integração com sistemas ERP de terceiros
- [ ] Modo offline para comandos críticos
- [ ] Machine Learning para predição de demandas

---

**Versão atual:** 3.0.0 | **Última atualização:** Dezembro 2024

**Desenvolvido com ❤️ para a Ameciclo** - Promovendo a mobilidade sustentável no Grande Recife

*Este bot é uma ferramenta open-source desenvolvida para otimizar os processos internos da Ameciclo e pode ser adaptado para outras organizações da sociedade civil.*

### 📞 Suporte e Contato
- **Issues GitHub**: [Reportar bugs e solicitar features](https://github.com/ameciclo/ameciclobot/issues)
- **Telegram**: @ameciclo_info
- **Email**: contato@ameciclo.org
- **Site**: [ameciclo.org](https://ameciclo.org)

### 📜 Licença
Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.