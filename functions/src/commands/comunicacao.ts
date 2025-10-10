import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google";
import { escapeMarkdownV2 } from "../utils/utils";
import urls from "../credentials/urls.json";
import workgroups from "../credentials/workgroupsfolders.json";

const MIN_TOPIC_SIZE = 5;

// Utilitário para validação de data flexível
function parseDate(input: string): Date | null {
  const formats = [
    /^(\d{1,2})\/(\d{1,2})$/, // DD/MM ou D/M
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{1,2})-(\d{1,2})$/, // DD-MM
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{1,2})\.(\d{1,2})$/, // DD.MM
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/ // DD.MM.YYYY
  ];
  
  const currentYear = new Date().getFullYear();
  
  for (const format of formats) {
    const match = input.match(format);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = match[3] ? parseInt(match[3]) : currentYear;
      
      // Validar se é uma data válida
      const date = new Date(year, month - 1, day);
      if (date.getDate() === day && date.getMonth() === month - 1) {
        return date;
      }
    }
  }
  
  return null;
}

// Utilitário para extrair data e texto da demanda
function parseDemand(input: string): { date: Date | null; text: string } {
  // Tenta encontrar uma data no início da string
  const words = input.trim().split(/\s+/);
  
  if (words.length === 0) {
    return { date: null, text: "" };
  }
  
  // Testa se a primeira palavra é uma data
  const possibleDate = parseDate(words[0]);
  
  if (possibleDate) {
    // Remove a primeira palavra (data) e pega o resto como texto
    const text = words.slice(1).join(" ");
    return { date: possibleDate, text };
  }
  
  // Se não encontrou data, usa data padrão (7 dias) e todo o texto
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  
  return { date: defaultDate, text: input.trim() };
}

// Utilitário para formatar data como DD/MM
function formatDateDDMM(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function registerComunicacaoCommand(bot: Telegraf) {
  bot.command("comunicacao", async (ctx: Context) => {
    try {
      console.log("[comunicacao] Comando /comunicacao executado");
      console.log("[comunicacao] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;
      
      if (!from || !chat) {
        console.log("[comunicacao] Dados incompletos");
        await ctx.reply("❌ Não foi possível identificar as informações da mensagem\\.", {
          parse_mode: "MarkdownV2"
        });
        return;
      }

      // Extrair texto da demanda (comando direto ou resposta)
      let demandText = "";
      let datePrefix = "";
      const msg = ctx.message as any;
      
      if (msg?.reply_to_message?.text) {
        // Usando em resposta a uma mensagem
        demandText = msg.reply_to_message.text;
        // Pegar data opcional do comando
        datePrefix = msg.text.replace("/comunicacao", "").trim();
        console.log("[comunicacao] Texto extraído de mensagem respondida", { datePrefix });
      } else if (msg?.text) {
        // Comando direto
        demandText = msg.text.replace("/comunicacao", "").trim();
        console.log("[comunicacao] Texto extraído do comando direto");
      }

      if (!demandText) {
        console.log("[comunicacao] Texto da demanda vazio");
        await ctx.reply(
          "📢 *Como usar o comando /comunicacao*\\n\\n" + comunicacaoCommand.help(),
          {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver demandas de comunicação",
                    url: `https://docs.google.com/spreadsheets/d/${urls.communication.id}`,
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      // Parsear data e texto
      let { date, text } = parseDemand(demandText);
      
      // Se foi usado em resposta e tem data no comando, usar essa data
      if (msg?.reply_to_message?.text && datePrefix) {
        const prefixDate = parseDate(datePrefix);
        if (prefixDate) {
          date = prefixDate;
          text = demandText; // Usar texto completo da mensagem respondida
        }
      }
      
      console.log("[comunicacao] Dados parseados:", { 
        originalText: demandText,
        parsedDate: date?.toISOString(),
        parsedText: text,
        wordCount: text.split(" ").length
      });

      // Validar tamanho mínimo do texto
      if (text.split(" ").length < MIN_TOPIC_SIZE) {
        await ctx.reply(
          `❌ ${escapeMarkdownV2(from.first_name)}, a descrição da demanda precisa ter pelo menos ${MIN_TOPIC_SIZE} palavras\\. Descreva melhor e tente novamente\\.`,
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      // Preparar dados para registro
      const currentDate = new Date().toLocaleString();
      const group = chat.type === "group" || chat.type === "supergroup" ? chat.title : "Privado";
      const author = `${from.first_name} ${from.last_name || ""}`.trim();
      const dueDate = date ? formatDateDDMM(date) : "";
      const recipients = "Grupo Comunicação";

      console.log("[comunicacao] Salvando na planilha:", {
        spreadsheetId: urls.communication.id,
        range: urls.communication.range + urls.communication.offset,
        data: [currentDate, group, author, dueDate, recipients, text]
      });

      // Salvar na planilha
      const success = await appendSheetRowAsPromise(
        urls.communication.id,
        urls.communication.range + urls.communication.offset,
        [currentDate, group, author, dueDate, recipients, text]
      );

      if (!success) {
        console.error("[comunicacao] Erro ao salvar na planilha");
        await ctx.reply(
          "❌ Houve um erro ao salvar a demanda\\. Tente novamente mais tarde\\.",
          { parse_mode: "MarkdownV2" }
        );
        return;
      }

      // Encontrar grupo de Comunicação
      const comunicacaoGroup = workgroups.find((group: any) => group.label === "Comunicação");
      
      if (comunicacaoGroup) {
        try {
          const displayDate = dueDate || "Não definida";
          const messageText = 
            `📢 *NOVA DEMANDA DE COMUNICAÇÃO*\\n\\n` +
            `*DATA LIMITE:* ${escapeMarkdownV2(displayDate)}\\n\\n` +
            `*SOLICITANTE:* ${escapeMarkdownV2(author)}\\n\\n` +
            `*DEMANDA:*\\n${escapeMarkdownV2(text)}`;

          await bot.telegram.sendMessage(
            comunicacaoGroup.value,
            messageText,
            {
              parse_mode: "MarkdownV2",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "📝 Ver planilha",
                      url: `https://docs.google.com/spreadsheets/d/${urls.communication.id}`,
                    },
                  ],
                ],
              },
            }
          );
          
          console.log("[comunicacao] Mensagem enviada para o grupo de Comunicação");
        } catch (error) {
          console.error("[comunicacao] Erro ao enviar mensagem para o grupo:", error);
        }
      } else {
        console.error("[comunicacao] Grupo de Comunicação não encontrado");
      }
      
      // Resposta de sucesso
      console.log(`[comunicacao] Demanda registrada com sucesso por ${from.first_name}: "${text}"`);
      await ctx.reply(
        `✅ Valeu, ${escapeMarkdownV2(from.first_name)}\\! Demanda de comunicação registrada com sucesso\\!`,
        {
          parse_mode: "MarkdownV2",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📝 Ver demandas de comunicação",
                  url: `https://docs.google.com/spreadsheets/d/${urls.communication.id}`,
                },
              ],
            ],
          },
        }
      );

      console.log("[comunicacao] Comando processado com sucesso");
      
    } catch (error) {
      console.error("[comunicacao] Erro no comando:", error);
      await ctx.reply(
        "❌ Ocorreu um erro ao registrar sua demanda de comunicação\\. Tente novamente mais tarde\\.",
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}

export const comunicacaoCommand = {
  register: registerComunicacaoCommand,
  name: () => "/comunicacao",
  help: () =>
    "Use o comando `/comunicacao` para registrar uma demanda para o grupo de Comunicação\\\\. Os formatos aceitos são:\\\\n" +
    "1\\\\. Com data: `/comunicacao [data] [texto da demanda]`\\\\n" +
    "2\\\\. Sem data: `/comunicacao [texto da demanda]`\\\\n" +
    "3\\\\. Em resposta: Responda uma mensagem com `/comunicacao [data opcional]`\\\\n" +
    "\\\\n*Formatos de data aceitos:*\\\\n" +
    "• `15/12` ou `15/12/2024`\\\\n" +
    "• `15-12` ou `15-12-2024`\\\\n" +
    "• `15.12` ou `15.12.2024`\\\\n" +
    "\\\\n*Exemplos:*\\\\n" +
    "`/comunicacao 22/09 Criar post para Instagram sobre mobilidade`\\\\n" +
    "`/comunicacao Criar post para Instagram sobre mobilidade`\\\\n" +
    "Ou responda uma mensagem com: `/comunicacao 15/12`",
  description: () => "📢 Registrar uma demanda para o grupo de Comunicação.",
};