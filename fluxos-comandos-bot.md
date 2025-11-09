# Fluxos dos Comandos do Ameciclo Bot

## Comando: start
```mermaid
graph TD
    A[Usuario digita start] --> B[Bot exibe lista comandos]
    B --> C[Usuario ve comandos disponiveis]
```

## Comando: help
```mermaid
graph TD
    A[Usuario digita help] --> B{Tem parametro?}
    B -->|Nao| C[Bot mostra info usuario]
    B -->|Sim| D[Bot busca comando especifico]
    D --> E[Azure AI processa busca]
    E --> F[Bot retorna ajuda do comando]
```

## Comando: evento
```mermaid
graph TD
    A[Usuario digita evento] --> B{Tem ID evento?}
    B -->|Nao| C[Criar novo evento]
    B -->|Sim| D[Complementar evento existente]
    
    C --> E[Usuario fornece texto]
    E --> F[Azure AI extrai dados]
    F --> G[Salva temp no Firebase]
    G --> H[Bot mostra botoes calendario]
    H --> I[Usuario escolhe calendario]
    I --> J[Salva definitivo Firebase]
    J --> K[Trigger cria Google Calendar]
    
    D --> L{Usuario respondeu mensagem?}
    L -->|Texto| M[Atualiza descricao Google Calendar]
    L -->|Imagem| N[Upload Google Drive]
    N --> O[Anexa ao evento calendario]
    L -->|Nao| P[Bot mostra botoes grupos]
    P --> Q[Usuario escolhe grupo]
    Q --> R[Atualiza evento Firebase]
```

## Comando: ajudante_financeiro
```mermaid
graph TD
    A[Usuario digita ajudante_financeiro] --> B{Respondeu arquivo?}
    B -->|Nao| C[Bot mostra menu opcoes]
    C --> D[Usuario clica botao]
    D --> E[Executa acao escolhida]
    
    B -->|Sim| F{Tem ID no comando?}
    F -->|Sim| G[Bot mostra: Arquivar/Recibo]
    F -->|Nao| H[Bot mostra: Extrato/Processar]
    G --> I[Usuario escolhe acao]
    H --> J[Usuario escolhe acao]
    I --> K[Processa arquivo + ID]
    J --> L[Processa arquivo]
    K --> M[Salva Google Drive]
    L --> N[Atualiza Google Sheets]
```

## Comando: pedido_de_informacao
```mermaid
graph TD
    A[Usuario digita pedido_de_informacao] --> B{Parametro verificar?}
    B -->|Sim| C[Bot verifica protocolos]
    C --> D[Consulta site governo]
    D --> E[Atualiza status Firebase]
    E --> F[Bot retorna resultado]
    
    B -->|Nao| G[Usuario fornece protocolo/senha]
    G --> H[Bot extrai dados]
    H --> I[Salva protocolo Firebase]
    I --> J[Bot confirma registro]
```

## Comando: pauta
```mermaid
graph TD
    A[Usuario digita pauta] --> B{Tem texto?}
    B -->|Nao| C[Bot mostra ajuda + link]
    B -->|Sim| D{Texto tem 5+ palavras?}
    D -->|Nao| E[Bot pede mais detalhes]
    D -->|Sim| F[Salva Google Sheets]
    F --> G[Bot confirma + link planilha]
```

## Comando: clipping
```mermaid
graph TD
    A[Usuario digita clipping] --> B[Bot processa noticias]
    B --> C[Salva Google Drive]
    C --> D[Bot confirma processamento]
```

## Comando: enquete
```mermaid
graph TD
    A[Usuario digita enquete] --> B[Usuario fornece opcoes]
    B --> C[Bot cria poll Telegram]
    C --> D[Usuarios votam]
    D --> E[Resultados salvos Telegram]
```

## Comando: transcrever
```mermaid
graph TD
    A[Usuario envia audio] --> B[Usuario digita transcrever]
    B --> C[Bot envia para Whisper API]
    C --> D[Recebe transcricao]
    D --> E[Bot retorna texto]
```

## Fluxo: Pagamento (Automatico)
```mermaid
graph TD
    A[Novo request Firebase] --> B[Trigger sendPaymentRequest]
    B --> C[Bot envia para coordenadores]
    C --> D[Coordenadores recebem botoes]
    D --> E[Coordenador clica confirmar]
    E --> F{2 assinaturas?}
    F -->|Nao| G[Atualiza interface]
    F -->|Sim| H[Atualiza Google Sheets]
    H --> I[Notifica solicitante]
    I --> J[Apaga mensagens coordenadores]
```

## Schedulers Automaticos
```mermaid
graph TD
    A[checkGoogleForms - 2h] --> B[Verifica novos forms]
    B --> C[Processa respostas]
    
    D[checkScheduledPayments - Seg/Qua/Sex] --> E[Busca pagamentos agendados Firebase]
    E --> F[Envia notificacoes grupos]
    
    G[checkEvents - Diario 16:20] --> H{Domingo?}
    H -->|Sim| I[Agenda semanal grupos]
    H -->|Nao| J[Agenda diaria amanha]
    
    K[checkUpcomingEvents - 30min] --> L[Verifica eventos proximos]
    L --> M[Notifica participantes]
    
    N[checkPedidosInformacao - 19h] --> O[Consulta protocolos governo]
    O --> P[Atualiza status Firebase]
    
    Q[weeklyReport - Segunda 8h] --> R[Gera relatorio atividades]
    R --> S[Envia para grupos]
```

## Locais de Armazenamento

### Firebase Realtime Database
- `/requests/{id}` - Solicitacoes pagamento
- `/calendar/{id}` - Eventos temporarios
- `/temp_events/{id}` - Eventos em criacao
- `/protocols/{id}` - Protocolos LAI
- `/users/{id}` - Dados usuarios

### Google Drive
- Comprovantes pagamento
- Extratos bancarios
- Arquivos eventos
- Documentos gerados

### Google Sheets
- Planilhas financeiras
- Pautas reunioes
- Controle projetos
- Relatorios

### Google Calendar
- Eventos criados
- Agenda grupos trabalho