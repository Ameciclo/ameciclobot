import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
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
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, // DD.MM.YYYY
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

// Utilitário para extrair data e texto da demanda de comunicação
function parseCommunicationDemand(input: string): {
  date: Date | null;
  text: string;
} {
  const words = input.trim().split(/\s+/);

  if (words.length === 0) {
    return { date: null, text: "" };
  }

  // Testa se a primeira palavra é uma data
  const possibleDate = parseDate(words[0]);

  if (possibleDate) {
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
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function registerDemandaCommand(bot: Telegraf) {
  bot.command("demanda", async (ctx: Context) => {
    try {
      console.log("Comando /demanda recebido");
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      // Verifica se a mensagem possui texto ou se está respondendo a uma mensagem com texto
      let demand: string | undefined;
      if (ctx.message && "text" in ctx.message) {
        demand =
          ctx.message.reply_to_message && "text" in ctx.message.reply_to_message
            ? ctx.message.reply_to_message.text
            : ctx.message.text.replace("/demanda", "").trim();
      }

      // Verificar se é uma demanda de comunicação
      if (demand && /^comunica[cç][aã]o/i.test(demand)) {
        return await handleCommunicationDemand(
          ctx,
          demand.replace(/^comunica[cç][aã]o\s*/i, ""),
          from,
          chat
        );
      }

      if (!from || !chat || !demand) {
        console.log("Dados incompletos:", {
          from: !!from,
          chat: !!chat,
          demand: !!demand,
        });
        return ctx.reply(demandaCommand.help(), {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📝 Ver demandas",
                  url: `https://docs.google.com/spreadsheets/d/${urls.demands.id}`,
                },
              ],
            ],
          },
        });
      }

      // Regex para validar o formato: [data opcional] [arrobas] [texto]
      // Formato 1: DD/MM @user texto
      // Formato 2: @user texto (sem data)
      const demandRegexWithDate = /^(\d{2}\/\d{2})\s+((?:@\w+\s?)+)\s+(.+)$/;
      const demandRegexWithoutDate = /^((?:@\w+\s?)+)\s+(.+)$/;

      let match = demand.match(demandRegexWithDate);
      let dueDate = "";
      let recipients = "";
      let text = "";

      console.log("Tentando validar com data:", { match: !!match, demand });

      if (match) {
        // Formato com data
        const [, matchedDueDate, matchedRecipients, matchedText] = match;
        dueDate = matchedDueDate;
        recipients = matchedRecipients;
        text = matchedText;
      } else {
        // Tentar formato sem data
        match = demand.match(demandRegexWithoutDate);
        console.log("Tentando validar sem data:", { match: !!match, demand });

        if (!match) {
          console.log("Formato inválido da demanda");
          return ctx.reply(
            "Formato inválido! Use o formato:\n`/demanda \\[data limite\\] \\[@destinatário(s)\\] \\[texto da demanda\\]`\nOu sem data:\n`/demanda \\[@destinatário(s)\\] \\[texto da demanda\\]`\nExemplo:\n`/demanda 20/12/2023 @dvalenca Fazer um bot pro Telegram`",
            { parse_mode: "Markdown" }
          );
        }

        // Formato sem data, usar data atual + 7 dias como padrão
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 7);
        dueDate = `${String(defaultDueDate.getDate()).padStart(
          2,
          "0"
        )}/${String(defaultDueDate.getMonth() + 1).padStart(2, "0")}`;
        const [, matchedRecipients, matchedText] = match;
        recipients = matchedRecipients;
        text = matchedText;
        console.log("Usando formato sem data:", { dueDate, recipients, text });
      }

      // Validação adicional: verificar número mínimo de palavras no texto da demanda
      console.log("Verificando tamanho do texto:", {
        text,
        palavras: text.split(" ").length,
      });
      if (text.split(" ").length < MIN_TOPIC_SIZE) {
        return ctx.reply(
          `${from.first_name}, a descrição da demanda precisa ter pelo menos ${MIN_TOPIC_SIZE} palavras. Descreva melhor e tente novamente.`
        );
      }

      // Prepara os dados para registro
      const date = new Date().toLocaleString();
      const group =
        chat.type === "group" || chat.type === "supergroup"
          ? chat.title
          : "Privado";
      const author = `${from.first_name} ${from.last_name || ""}`;

      // Salva na planilha usando o serviço do Google Sheets
      const success = await appendSheetRowAsPromise(
        urls.demands.id,
        urls.demands.range + urls.demands.offset,
        [date, group, author, dueDate, recipients, text]
      );

      if (success) {
        return ctx.reply(
          `Valeu, ${from.first_name}! Demanda registrada com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver demandas",
                    url: `https://docs.google.com/spreadsheets/d/${urls.demands.id}`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        return ctx.reply(
          "Houve um erro ao salvar a demanda. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("Erro ao processar comando /demanda:", error);
      // Mostrar detalhes do erro para depuração
      console.error(
        "Detalhes do erro:",
        JSON.stringify(error, Object.getOwnPropertyNames(error))
      );
      return ctx.reply(
        "Ocorreu um erro ao registrar sua demanda. Tente novamente mais tarde."
      );
    }
  });
}

// Função para lidar com demandas de comunicação
async function handleCommunicationDemand(
  ctx: Context,
  demandText: string,
  from: any,
  chat: any
) {
  try {
    console.log("[demanda->comunicacao] Processando demanda de comunicação");

    if (!demandText) {
      await ctx.reply(
        "📢 *Como usar o comando /demanda comunicacao*\n\n" +
          "Use o formato: `/demanda comunicacao [data opcional] [texto da demanda]`\n\n" +
          "*Exemplos:*\n" +
          "`/demanda comunicacao 22/09 Criar post para Instagram sobre mobilidade`\n" +
          "`/demanda comunicacao Criar post para Instagram sobre mobilidade`",
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
    const { date, text } = parseCommunicationDemand(demandText);

    console.log("[demanda->comunicacao] Dados parseados:", {
      originalText: demandText,
      parsedDate: date?.toISOString(),
      parsedText: text,
      wordCount: text.split(" ").length,
    });

    // Validar tamanho mínimo do texto
    if (text.split(" ").length < MIN_TOPIC_SIZE) {
      await ctx.reply(
        `❌ ${escapeMarkdownV2(
          from.first_name
        )}, a descrição da demanda precisa ter pelo menos ${MIN_TOPIC_SIZE} palavras\. Descreva melhor e tente novamente\.`,
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // Preparar dados para registro
    const currentDate = new Date().toLocaleString();
    const group =
      chat.type === "group" || chat.type === "supergroup"
        ? chat.title
        : "Privado";
    const author = `${from.first_name} ${from.last_name || ""}`.trim();
    const dueDate = date ? formatDateDDMM(date) : "";
    const recipients = "Grupo Comunicação";

    console.log("[demanda->comunicacao] Salvando na planilha:", {
      spreadsheetId: urls.communication.id,
      range: urls.communication.range + urls.communication.offset,
      data: [currentDate, group, author, dueDate, recipients, text],
    });

    // Salvar na planilha
    const success = await appendSheetRowAsPromise(
      urls.communication.id,
      urls.communication.range + urls.communication.offset,
      [currentDate, group, author, dueDate, recipients, text]
    );

    if (!success) {
      console.error("[demanda->comunicacao] Erro ao salvar na planilha");
      await ctx.reply(
        "❌ Houve um erro ao salvar a demanda\. Tente novamente mais tarde\.",
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // Encontrar grupo de Comunicação
    const comunicacaoGroup = workgroups.find(
      (group: any) => group.label === "Comunicação"
    );

    if (comunicacaoGroup) {
      try {
        const displayDate = dueDate || "Não definida";
        const messageText =
          `📢 *NOVA DEMANDA DE COMUNICAÇÃO*\n\n` +
          `*DATA LIMITE:* ${escapeMarkdownV2(displayDate)}\n\n` +
          `*SOLICITANTE:* ${escapeMarkdownV2(author)}\n\n` +
          `*DEMANDA:*\n${escapeMarkdownV2(text)}`;

        await ctx.telegram.sendMessage(comunicacaoGroup.value, messageText, {
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
        });

        console.log(
          "[demanda->comunicacao] Mensagem enviada para o grupo de Comunicação"
        );
      } catch (error) {
        console.error(
          "[demanda->comunicacao] Erro ao enviar mensagem para o grupo:",
          error
        );
      }
    } else {
      console.error(
        "[demanda->comunicacao] Grupo de Comunicação não encontrado"
      );
    }

    // Resposta de sucesso
    await ctx.reply(
      `✅ Valeu, ${escapeMarkdownV2(
        from.first_name
      )}\! Demanda de comunicação registrada com sucesso\!`,
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

    console.log("[demanda->comunicacao] Comando processado com sucesso");
  } catch (error) {
    console.error("[demanda->comunicacao] Erro no comando:", error);
    await ctx.reply(
      "❌ Ocorreu um erro ao registrar sua demanda de comunicação\. Tente novamente mais tarde\.",
      { parse_mode: "MarkdownV2" }
    );
  }
}

export const demandaCommand = {
  register: registerDemandaCommand,
  name: () => "/demanda",
  help: () =>
    "Use o comando `/demanda` para registrar uma demanda. Os formatos aceitos são:\n" +
    "1. Com data: `/demanda [data limite] [@destinatário(s)] [texto da demanda]`\n" +
    "2. Sem data: `/demanda [@destinatário(s)] [texto da demanda]`\n" +
    "3. Comunicação: `/demanda comunicacao [data opcional] [texto da demanda]`\n" +
    "Exemplos:\n`/demanda 22/09 @ameciclobot Fazer um bot pro Telegram`\n" +
    "`/demanda @ameciclobot Fazer um bot pro Telegram`\n" +
    "`/demanda comunicacao 15/12 Criar post sobre mobilidade`",
  description: () => "📌 Registrar uma demanda com data limite.",
};
