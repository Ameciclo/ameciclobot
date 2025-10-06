import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

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

      if (!from || !chat || !demand) {
        console.log("Dados incompletos:", {
          from: !!from,
          chat: !!chat,
          demand: !!demand,
        });
        return ctx.reply(demandaCommand.help(), {
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

export const demandaCommand = {
  register: registerDemandaCommand,
  name: () => "/demanda",
  help: () =>
    "Use o comando `/demanda` para registrar uma demanda\\. Os formatos aceitos são:\n" +
    "1\\. Com data: `/demanda \\[data limite\\] \\[@destinatário(s)\\] \\[texto da demanda\\]`\n" +
    "2\\. Sem data: `/demanda \\[@destinatário(s)\\] \\[texto da demanda\\]`\n" +
    "Exemplos:\n`/demanda 22/09 @ameciclobot Fazer um bot pro Telegram`\n" +
    "`/demanda @ameciclobot Fazer um bot pro Telegram`",
  description: () => "📌 Registrar uma demanda com data limite.",
};
