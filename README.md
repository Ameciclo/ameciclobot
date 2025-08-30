# 🚴♂️ Ameciclo Bot

Bot do Telegram desenvolvido para automatizar e otimizar os processos internos da Ameciclo (Associação Metropolitana de Ciclistas do Grande Recife). O bot integra múltiplos serviços Google, Azure AI e Firebase para oferecer uma solução completa de gestão organizacional através do Telegram.

## 🎯 Sobre a Ameciclo

A Ameciclo é uma organização da sociedade civil que promove o uso da bicicleta como meio de transporte sustentável no Grande Recife. Este bot foi desenvolvido para digitalizar e automatizar processos administrativos, financeiros e de comunicação da associação.

## 🚀 Funcionalidades Principais

O bot oferece mais de 25 comandos organizados em categorias funcionais:

### 📄 Gestão de Documentos
- `/unir_pdfs` - Une múltiplos arquivos PDF em um único documento usando PDF-lib
- `/transcrever` - Transcreve áudios e vídeos para texto usando Azure Whisper AI
- `/documento` - Cria Google Docs automaticamente em pastas organizadas por grupo de trabalho
- `/arquivar_comprovante` - Arquiva comprovantes de pagamento no Google Drive com categorização automática
- `/arquivar_extrato_pdf` - Processa e arquiva extratos bancários em PDF com OCR

### 💰 Gestão Financeira
- `/pagamento` - Fluxo completo de solicitação de pagamentos com aprovação em múltiplas etapas
- `/processar_extrato_cc` - Processa extratos de conta corrente com reconciliação automática
- `/processar_extrato_fi` - Analisa extratos de fundos de investimento e gera relatórios
- `/atualizar_pendencias` - Monitora e atualiza pendências financeiras em planilhas Google Sheets
- **Sistema de Aprovação**: Workflow automatizado com notificações para coordenadores

### 📅 Eventos e Comunicação
- `/evento` - Cria eventos no Google Calendar com IA para extração de dados de texto natural
- `/comunicacao` - Ferramentas para comunicação interna e externa
- `/informe` - Sistema de criação e distribuição de informes organizacionais
- `/clipping` - Gestão de clipping de notícias e mídia
- **Agenda Automática**: Envio diário e semanal de agenda para grupos de trabalho

### 📊 Gestão Organizacional
- `/planilha` - Integração completa com Google Sheets para análise de dados
- `/registrar_planilha` - Sistema de registro e catalogação de planilhas organizacionais
- `/pauta` - Criação e gestão de pautas de reuniões com templates automáticos
- `/demanda` - Sistema de gestão de demandas internas com rastreamento
- `/atualizar_projetos` - Monitoramento e atualização de status de projetos em tempo real

### 🔧 Utilitários e Ferramentas
- `/formulario` - Cria Google Forms automaticamente com monitoramento de respostas
- `/modelo` - Biblioteca de modelos de documentos com sistema de cópia inteligente
- `/pedido_de_informacao` - Sistema completo de gestão de pedidos de informação pública
- `/encaminhamento` - Workflow de encaminhamentos internos com rastreamento
- `/apresentacao` - Cria Google Slides com templates organizacionais
- `/help` - Sistema de ajuda contextual e lista de comandos
- `/versao` - Controle de versão e changelog do bot
- `/quem_sou_eu` - Perfil do usuário e permissões no sistema

## 🛠️ Stack Tecnológica

### Core
- **Node.js 22** - Runtime JavaScript com suporte às últimas funcionalidades
- **TypeScript** - Linguagem tipada para maior robustez e manutenibilidade
- **Telegraf.js 4.10** - Framework moderno para bots do Telegram

### Cloud & Serverless
- **Firebase Functions** - Computação serverless para escalabilidade automática
- **Firebase Admin SDK** - Gerenciamento de dados e autenticação
- **Firebase Realtime Database** - Banco de dados em tempo real para workflows

### Integrações Google
- **Google Drive API** - Armazenamento e organização de arquivos
- **Google Sheets API** - Manipulação de planilhas e relatórios
- **Google Calendar API** - Gestão de eventos e agendas
- **Google Docs API** - Criação e edição de documentos
- **Google Slides API** - Apresentações automatizadas
- **Google Forms API** - Formulários dinâmicos

### Integrações Azure AI
- **Azure OpenAI (GPT-3.5)** - Processamento de linguagem natural
- **Azure Whisper** - Transcrição de áudio e vídeo

### Bibliotecas Especializadas
- **PDF-lib** - Manipulação avançada de PDFs
- **pdf-parse** - Extração de texto de PDFs
- **csv-parse** - Processamento de arquivos CSV
- **cheerio** - Web scraping e parsing HTML
- **axios** - Cliente HTTP robusto
- **form-data** - Upload de arquivos multipart

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
- **Formulários**: Verifica respostas a cada 2 horas
- **Pagamentos**: Monitora pagamentos agendados (seg/qua/sex às 8h)
- **Eventos**: Envia agenda diária (16:20) e semanal (domingos)
- **Pedidos de Informação**: Verifica prazos diariamente (19h)

## 📦 Instalação e Configuração

1. Clone o repositório:
```bash
git clone <repository-url>
cd ameciclobot
```

2. Instale as dependências:
```bash
cd functions
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. Configure o Firebase:
```bash
firebase login
firebase use --add
```

## 🚀 Desenvolvimento

### Scripts disponíveis:

```bash
# Compilar TypeScript
npm run build

# Executar em modo de desenvolvimento
npm run serve

# Assistir mudanças
npm run watch

# Deploy para produção
npm run deploy

# Executar linter
npm run lint

# Ver logs
npm run logs
```

### Estrutura do projeto:

```
functions/
├── src/
│   ├── commands/          # Comandos do bot
│   ├── callbacks/         # Handlers de callbacks
│   ├── handlers/          # Handlers gerais
│   ├── services/          # Serviços externos
│   ├── utils/             # Utilitários
│   ├── config/            # Configurações
│   └── index.ts           # Ponto de entrada
├── lib/                   # Código compilado
└── package.json
```

## 🔧 Configuração Detalhada

### Variáveis de Ambiente

```env
# Telegram
BOT_TOKEN=seu_token_do_telegram_bot

# Firebase
FIREBASE_PROJECT_ID=seu_projeto_firebase
FIREBASE_DATABASE_URL=https://seu-projeto.firebaseio.com

# Google APIs
GOOGLE_SERVICE_ACCOUNT_EMAIL=bot@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SUBJECT=email_para_impersonar@ameciclo.org

# Azure AI
AZURE_OPENAI_ENDPOINT=https://seu-recurso.openai.azure.com/
AZURE_OPENAI_API_KEY=sua_chave_azure
AZURE_WHISPER_ENDPOINT=https://seu-whisper.cognitiveservices.azure.com/
AZURE_WHISPER_API_KEY=sua_chave_whisper
```

### Configuração do Firebase

1. **Projeto Firebase**:
   - Crie projeto no [Firebase Console](https://console.firebase.google.com)
   - Ative Realtime Database e Firestore
   - Configure regras de segurança

2. **Service Account**:
   - Gere chave de service account
   - Configure permissões de administrador
   - Baixe arquivo JSON de credenciais

3. **Estrutura do Database**:
   ```json
   {
     "requests": {}, // Solicitações de pagamento
     "calendar": {}, // Eventos de calendário
     "forms": {},    // Formulários monitorados
     "users": {}     // Dados de usuários
   }
   ```

### Configuração Google APIs

1. **Google Cloud Console**:
   - Ative APIs: Drive, Sheets, Calendar, Docs, Slides, Forms
   - Configure OAuth 2.0 e Service Account
   - Configure domain-wide delegation

2. **Permissões Necessárias**:
   - Google Drive: Criar, editar, mover arquivos
   - Google Sheets: Ler, escrever, criar planilhas
   - Google Calendar: Criar, editar eventos
   - Google Docs/Slides: Criar, editar documentos

### Configuração Azure AI

1. **Azure OpenAI**:
   - Crie recurso Azure OpenAI
   - Deploy modelo GPT-3.5-turbo
   - Configure endpoint e chaves

2. **Azure Speech Services**:
   - Crie recurso Speech Services
   - Configure Whisper para transcrição
   - Obtenha chaves de API

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

## 📊 Estatísticas do Projeto

- **25+ Comandos** implementados
- **7 Integrações** principais (Google, Azure, Firebase)
- **4 Schedulers** para automações
- **15+ Tipos de documentos** suportados
- **Múltiplos grupos** de trabalho gerenciados
- **Processamento em tempo real** de solicitações

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

---

**Versão atual:** 1.2.2 | **Última atualização:** Dezembro 2024

**Desenvolvido com ❤️ para a Ameciclo** - Promovendo a mobilidade sustentável no Grande Recife

*Este bot é uma ferramenta open-source desenvolvida para otimizar os processos internos da Ameciclo e pode ser adaptado para outras organizações da sociedade civil.*