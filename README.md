# 🚴‍♂️ Ameciclo Bot

Bot do Telegram que auxilia a Ameciclo em processos internos como fluxo de pagamentos, gestão de eventos, processamento de documentos e muito mais.

## 🚀 Funcionalidades

### 📄 Documentos
- `/unir_pdfs` - Une múltiplos arquivos PDF em um único documento
- `/transcrever` - Transcreve áudios e vídeos para texto
- `/documento` - Gerencia documentos da associação
- `/arquivar_comprovante` - Arquiva comprovantes de pagamento
- `/arquivar_extrato_pdf` - Arquiva extratos em PDF

### 💰 Financeiro
- `/pagamento` - Gerencia fluxo de pagamentos
- `/processar_extrato_cc` - Processa extratos de conta corrente
- `/processar_extrato_fi` - Processa extratos de fundos de investimento
- `/atualizar_pendencias` - Atualiza pendências financeiras

### 📅 Eventos e Comunicação
- `/evento` - Gerencia eventos no calendário
- `/comunicacao` - Ferramentas de comunicação
- `/informe` - Cria e gerencia informes
- `/clipping` - Gerencia clipping de notícias

### 📊 Gestão
- `/planilha` - Trabalha com planilhas
- `/registrar_planilha` - Registra novas planilhas
- `/pauta` - Gerencia pautas de reuniões
- `/demanda` - Gerencia demandas internas
- `/atualizar_projetos` - Atualiza status de projetos

### 🔧 Utilitários
- `/formulario` - Cria e gerencia formulários
- `/modelo` - Acessa modelos de documentos
- `/pedido_de_informacao` - Gerencia pedidos de informação
- `/encaminhamento` - Sistema de encaminhamentos
- `/apresentacao` - Gerencia apresentações
- `/help` - Lista todos os comandos disponíveis
- `/versao` - Mostra versão atual do bot
- `/quem_sou_eu` - Informações do usuário

## 🛠️ Stack Tecnológica

- **Node.js 22** - Runtime JavaScript
- **TypeScript** - Linguagem de programação
- **Telegraf.js** - Framework para bots do Telegram
- **Firebase Functions** - Serverless computing
- **Firebase Admin** - SDK do Firebase
- **PDF-lib** - Manipulação de PDFs
- **Axios** - Cliente HTTP
- **Google APIs** - Integração com serviços Google

## 📦 Instalação

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

## 🔧 Configuração

### Variáveis de ambiente necessárias:

```env
BOT_TOKEN=seu_token_do_telegram
FIREBASE_PROJECT_ID=seu_projeto_firebase
# Adicione outras variáveis conforme necessário
```

### Configuração do Firebase:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative o Firestore Database
3. Configure as regras de segurança
4. Baixe o arquivo de credenciais do service account

## 📝 Como usar

1. Inicie uma conversa com o bot no Telegram
2. Use `/start` para começar
3. Use `/help` para ver todos os comandos disponíveis
4. Execute os comandos conforme sua necessidade

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento da Ameciclo ou abra uma issue no repositório.

---

**Versão atual:** 1.2.2

Desenvolvido com ❤️ para a Ameciclo