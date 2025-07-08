# Plano de Uniformização dos Comandos - Ameciclo Bot

## 🎯 Objetivo
Padronizar e uniformizar os comandos do bot, focando em:
1. **Envio de mensagens consistente** (com/sem markdown)
2. **Validação robusta de entrada** (datas, formatos, etc.)
3. **Estrutura de código padronizada**

## 🔍 Problemas Identificados

### 1. **Envio de Mensagens Inconsistente**
- Alguns comandos usam `MarkdownV2`, outros não
- Escape de caracteres feito manualmente e inconsistente
- Mistura de `ctx.reply()` com diferentes configurações

### 2. **Validação de Entrada Frágil**
- Datas aceitas apenas em formato específico
- Falta validação de campos obrigatórios
- Tratamento de erro inconsistente

### 3. **Estrutura de Código Variada**
- Alguns comandos exportam funções separadas, outros objetos
- Padrões de nomenclatura diferentes
- Lógica de validação repetida

## 🛠️ Solução Proposta

### Fase 1: Criar Utilitários Base (1-2 dias)

#### 1.1 **MessageHelper** - Padronizar envio de mensagens
```typescript
// src/utils/messageHelper.ts
export class MessageHelper {
  static async sendSuccess(ctx: Context, message: string, options?: any) {
    return ctx.reply(`✅ ${message}`, { 
      parse_mode: 'MarkdownV2',
      ...options 
    });
  }
  
  static async sendError(ctx: Context, message: string) {
    return ctx.reply(`❌ ${this.escape(message)}`, { 
      parse_mode: 'MarkdownV2' 
    });
  }
  
  static async sendInfo(ctx: Context, message: string, buttons?: any) {
    return ctx.reply(this.escape(message), {
      parse_mode: 'MarkdownV2',
      reply_markup: buttons
    });
  }
  
  private static escape(text: string): string {
    return text.replace(/([_*[\]()~`>#+-=|{}.!\\])/g, '\\$1');
  }
}
```

#### 1.2 **InputValidator** - Validação robusta
```typescript
// src/utils/inputValidator.ts
export class InputValidator {
  static parseDate(input: string): Date | null {
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/ // DD.MM.YYYY
    ];
    
    for (const format of formats) {
      const match = input.match(format);
      if (match) {
        // Lógica para cada formato
        return this.createDate(match);
      }
    }
    
    // Tenta parsing natural
    const naturalDate = new Date(input);
    return isNaN(naturalDate.getTime()) ? null : naturalDate;
  }
  
  static validateRequired(value: string, fieldName: string): string {
    if (!value?.trim()) {
      throw new Error(`${fieldName} é obrigatório`);
    }
    return value.trim();
  }
  
  static validateNumber(value: string, fieldName: string): number {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) {
      throw new Error(`${fieldName} deve ser um número válido`);
    }
    return num;
  }
}
```

#### 1.3 **BaseCommand** - Estrutura padrão
```typescript
// src/commands/base/BaseCommand.ts
export abstract class BaseCommand {
  abstract name(): string;
  abstract description(): string;
  abstract help(): string;
  
  protected async validateGroup(ctx: Context, allowedGroups?: string[]): Promise<boolean> {
    const chatId = ctx.chat?.id?.toString();
    if (allowedGroups && !allowedGroups.includes(chatId)) {
      await MessageHelper.sendError(ctx, 'Comando não permitido neste grupo');
      return false;
    }
    return true;
  }
  
  protected extractText(ctx: Context, removeCommand = true): string {
    const msg = ctx.message as any;
    let text = '';
    
    if (msg?.reply_to_message?.text) {
      text = msg.reply_to_message.text;
    } else if (msg?.text) {
      text = msg.text;
      if (removeCommand) {
        text = text.replace(this.name(), '').trim();
      }
    }
    
    return text;
  }
  
  protected async handleError(ctx: Context, error: any): Promise<void> {
    console.error(`Erro no comando ${this.name()}:`, error);
    await MessageHelper.sendError(ctx, 
      error.message || 'Ocorreu um erro. Tente novamente.'
    );
  }
  
  abstract execute(ctx: Context): Promise<void>;
  
  register(bot: Telegraf): void {
    bot.command(this.name().replace('/', ''), async (ctx) => {
      try {
        await this.execute(ctx);
      } catch (error) {
        await this.handleError(ctx, error);
      }
    });
  }
}
```

### Fase 2: Refatorar Comandos Existentes (3-5 dias)

#### 2.1 **Exemplo: Comando Documento Refatorado**
```typescript
// src/commands/documento.ts
export class DocumentoCommand extends BaseCommand {
  name() { return '/documento'; }
  description() { return '🗎 Criar um Google Docs para documentos'; }
  help() { 
    return 'Use `/documento [título]` para criar um Google Docs\\. Exemplo: `/documento Ata da Reunião`'; 
  }
  
  async execute(ctx: Context): Promise<void> {
    // Validar se é grupo
    if (!await this.validateGroup(ctx)) return;
    
    // Extrair e validar título
    const title = this.extractText(ctx);
    const validatedTitle = InputValidator.validateRequired(title, 'Título do documento');
    
    // Buscar configuração do grupo
    const groupConfig = this.findGroupConfig(ctx.chat!.id);
    if (!groupConfig) {
      throw new Error('Este grupo não possui pasta configurada');
    }
    
    // Criar documento
    const fullTitle = this.formatTitle(validatedTitle);
    const doc = await createDocument(fullTitle);
    await moveDocumentToFolder(doc.documentId, groupConfig.folderId);
    
    // Enviar resposta
    await MessageHelper.sendSuccess(ctx, 
      `Documento criado: ${fullTitle}`, {
        reply_markup: this.createButtons(doc.documentId, groupConfig)
      }
    );
  }
  
  private formatTitle(title: string): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
    return `Documento - ${date} - ${title}`;
  }
}
```

#### 2.2 **Exemplo: Comando Evento Refatorado**
```typescript
// src/commands/evento.ts
export class EventoCommand extends BaseCommand {
  name() { return '/evento'; }
  description() { return '📅 Criar evento a partir de descrição'; }
  help() { 
    return 'Use `/evento [descrição]` ou responda a uma mensagem\\. Aceita datas em vários formatos: DD/MM/YYYY, YYYY\\-MM\\-DD, etc\\.'; 
  }
  
  async execute(ctx: Context): Promise<void> {
    const allowedGroups = workgroups.map(g => g.value);
    if (!await this.validateGroup(ctx, allowedGroups)) return;
    
    const eventText = this.extractText(ctx);
    InputValidator.validateRequired(eventText, 'Descrição do evento');
    
    // Processar com IA
    const eventData = await this.processEventWithAI(eventText);
    
    // Validar e ajustar datas
    eventData.startDate = this.validateAndFormatDate(eventData.startDate);
    eventData.endDate = this.validateAndFormatDate(eventData.endDate);
    
    // Enviar resposta
    const message = this.buildEventMessage(eventData);
    await MessageHelper.sendInfo(ctx, message, {
      inline_keyboard: this.createCalendarButtons()
    });
  }
  
  private validateAndFormatDate(dateStr: string): string {
    const date = InputValidator.parseDate(dateStr);
    if (!date) {
      throw new Error(`Data inválida: ${dateStr}`);
    }
    return date.toISOString();
  }
}
```

### Fase 3: Implementar Sistema de Comandos (2-3 dias)

#### 3.1 **CommandRegistry** - Auto-discovery
```typescript
// src/commands/CommandRegistry.ts
export class CommandRegistry {
  private commands: BaseCommand[] = [];
  
  register(command: BaseCommand): void {
    this.commands.push(command);
  }
  
  registerAll(bot: Telegraf): void {
    this.commands.forEach(cmd => cmd.register(bot));
    
    // Configurar comandos no Telegram
    const telegramCommands = this.commands.map(cmd => ({
      command: cmd.name().replace('/', ''),
      description: cmd.description()
    }));
    
    bot.telegram.setMyCommands(telegramCommands);
  }
  
  getCommands(): BaseCommand[] {
    return this.commands;
  }
  
  findCommand(name: string): BaseCommand | undefined {
    return this.commands.find(cmd => cmd.name() === name);
  }
}
```

#### 3.2 **Atualizar index.ts**
```typescript
// src/index.ts
import { CommandRegistry } from './commands/CommandRegistry';
import { DocumentoCommand } from './commands/documento';
import { EventoCommand } from './commands/evento';
// ... outros comandos

const registry = new CommandRegistry();

// Registrar todos os comandos
registry.register(new DocumentoCommand());
registry.register(new EventoCommand());
// ... outros comandos

// Registrar no bot
registry.registerAll(bot);
```

## 📋 Cronograma de Implementação

### **Semana 1**
- **Dia 1-2**: Criar utilitários base (MessageHelper, InputValidator, BaseCommand)
- **Dia 3-4**: Refatorar 3-4 comandos principais
- **Dia 5**: Testes e ajustes

### **Semana 2**
- **Dia 1-3**: Refatorar comandos restantes
- **Dia 4**: Implementar CommandRegistry
- **Dia 5**: Testes finais e documentação

## 🎯 Benefícios Esperados

### **Imediatos**
- ✅ Mensagens consistentes em todo o bot
- ✅ Validação robusta de datas e campos
- ✅ Tratamento de erro padronizado

### **Médio Prazo**
- ✅ Facilidade para adicionar novos comandos
- ✅ Manutenção simplificada
- ✅ Código mais legível e organizad

### **Longo Prazo**
- ✅ Base sólida para futuras funcionalidades
- ✅ Redução significativa de bugs
- ✅ Experiência do usuário melhorada

## 🔧 Comandos Prioritários para Refatoração

1. **documento** - Já tem boa estrutura, fácil de refatorar
2. **evento** - Problema de validação de data
3. **pagamento** - Crítico, muita validação necessária
4. **modelo** - Usado frequentemente
5. **formulario** - Validação complexa

## ✅ Checklist de Implementação

- [ ] Criar MessageHelper
- [ ] Criar InputValidator  
- [ ] Criar BaseCommand
- [ ] Refatorar comando documento
- [ ] Refatorar comando evento
- [ ] Refatorar comando pagamento
- [ ] Implementar CommandRegistry
- [ ] Atualizar index.ts
- [ ] Testar todos os comandos
- [ ] Documentar mudanças

---

**Próximo Passo**: Começar pela criação dos utilitários base, que serão a fundação para todos os comandos uniformizados.