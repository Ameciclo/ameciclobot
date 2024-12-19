import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google"; // Supondo que você tenha um serviço para integração com Google Sheets
import urls from "../config/urls.json";

const MIN_TOPIC_SIZE = 5;

export function registerPautaCommand(bot: Telegraf) {
  bot.command("pauta", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;
      const text = JSON.stringify(ctx.message);

      if (!from || !chat || !text) {
        return ctx.reply("Ocorreu um erro ao processar sua mensagem.");
      }

      // Remove o comando do texto e verifica se há conteúdo
      const topic = text.replace("/pauta", "").trim();
      if (!topic) {
        return ctx.reply(
          `Para registrar a pauta, use:\n\n/pauta [texto da pauta com pelo menos ${MIN_TOPIC_SIZE} palavras].`
        );
      }

      // Validação: verifica se a pauta tem pelo menos MIN_TOPIC_SIZE palavras
      if (topic.split(" ").length < MIN_TOPIC_SIZE) {
        return ctx.reply(
          `${from.first_name}, menos de ${MIN_TOPIC_SIZE} palavras? Descreve um pouco mais o que você quer e tente novamente.`
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
        urls.topics.id,
        urls.topics.range + urls.topics.offset,
        [date, group, author, topic]
      );

      if (success) {
        return ctx.reply(
          `Valeu, ${from.first_name}! Registrado com sucesso! Veja na planilha:`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Ver pautas",
                    url: "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID",
                  },
                ],
              ],
            },
          }
        );
      } else {
        return ctx.reply(
          "Houve um erro ao salvar a pauta. Tente novamente mais tarde."
        );
      }
    } catch (error) {
      console.error("Erro ao processar comando /pauta:", error);
      return ctx.reply(
        "Ocorreu um erro ao registrar sua pauta. Tente novamente mais tarde."
      );
    }
  });
}
