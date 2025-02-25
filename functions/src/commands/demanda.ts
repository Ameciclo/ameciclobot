import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../credentials/urls.json";

const MIN_TOPIC_SIZE = 5;

export function getName() {
  return "/demanda";
}

export function getHelp() {
  return (
    "Use o comando `/demanda` para registrar uma demanda. O formato esperado é:\n\n" +
    "`/demanda [data limite] [@destinatário(s)] [texto da demanda]`\n\n" +
    "Exemplo:\n`/demanda 22/09 @ameciclobot Fazer um bot pro Telegram`"
  );
}

export function getDescription() {
  return "📌 Registrar uma demanda com data limite.";
}

export function register(bot: Telegraf) {
  bot.command("demanda", async (ctx: Context) => {
    try {
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
        return ctx.reply(getHelp());
      }

      // Regex para validar o formato: [data] [arrobas] [texto]
      const demandRegex = /^(\d{2}\/\d{2})\s+((?:@\w+\s?)+)\s+(.+)$/;
      const match = demand.match(demandRegex);

      if (!match) {
        return ctx.reply(
          "Formato inválido! Use o formato:\n\n`/demanda [data limite] [@destinatário(s)] [texto da demanda]`\n\nExemplo:\n`/demanda 20/12/2023 @dvalenca @chatgpt Fazer um bot pro Telegram`",
          { parse_mode: "Markdown" }
        );
      }

      const [_, dueDate, recipients, text] = match;

      // Validação adicional: verificar número mínimo de palavras no texto da demanda
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
      return ctx.reply(
        "Ocorreu um erro ao registrar sua demanda. Tente novamente mais tarde."
      );
    }
  });
}

export const demandaCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};