// calendarActions.ts
import { Context, Telegraf, Markup } from "telegraf";
import {
  getCalendarEventData,
  updateCalendarEventData,
} from "../services/firebase";

export function registerCalendarHandler(bot: Telegraf) {
  bot.action(/^eu_vou_(.+)$/, async (ctx: Context) => {
    console.log("CONFIRMAR PRESENÇA NO EVENTO!");
    try {
      const callbackQuery = ctx.callbackQuery;
      if (
        !callbackQuery ||
        !("data" in callbackQuery) ||
        typeof callbackQuery.data !== "string"
      ) {
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data;
      const parts = callbackData.split("_");
      const eventId = parts[2];

      const message = callbackQuery.message;
      if (!message || !("text" in message)) {
        console.error("Mensagem inválida ou sem texto.");
        return;
      }

      // Obtém os dados do evento, que agora deve conter também htmlLink
      const eventData = await getCalendarEventData(eventId);
      if (!eventData) {
        await ctx.answerCbQuery("Evento não encontrado.", { show_alert: true });
        return;
      }

      const participants = eventData.participants || {};
      const userId = ctx.from?.id?.toString();
      if (!userId) {
        await ctx.answerCbQuery("Usuário não identificado.", {
          show_alert: true,
        });
        return;
      }

      // Verifica se o usuário já está na lista de participantes
      const userAlreadyIn = Object.values(participants).some(
        (p: any) => p.id === userId
      );

      if (userAlreadyIn) {
        const keyToRemove = Object.keys(participants).find(
          (key) => participants[key].id === userId
        );
        if (keyToRemove) {
          delete participants[keyToRemove];
        }
        await updateCalendarEventData(eventId, { participants });
        await ctx.answerCbQuery("Você retirou sua presença do evento.");
      } else {
        participants[userId] = {
          id: userId,
          first_name: ctx.from?.first_name || "Usuário",
        };
        await updateCalendarEventData(eventId, { participants });
        await ctx.answerCbQuery("Presença confirmada com sucesso!");
      }

      // Cria a lista atualizada de participantes
      const participantsList = Object.values(participants)
        .map((p: any) => `✅ ${p.first_name}`)
        .join("\n");

      // Extrai o header da mensagem original sem a seção de participantes (se existir)
      const messageText = message.text || "";
      const index = messageText.indexOf("**Participantes confirmados:**");
      const header =
        index !== -1 ? messageText.slice(0, index).trim() : messageText;

      const newText = `${header}\n\n**Participantes confirmados:**\n${participantsList}`;

      // Recria os botões: preserva "Abrir evento" e "Eu vou"
      const newMarkup = Markup.inlineKeyboard([
        [
          Markup.button.url("Abrir evento", eventData.htmlLink),
          Markup.button.callback("Eu vou", `eu_vou_${eventId}`),
        ],
      ]);

      await ctx.editMessageText(newText, {
        parse_mode: "Markdown",
        reply_markup: newMarkup.reply_markup,
      });
    } catch (err) {
      console.error("Erro ao confirmar presença no evento:", err);
      await ctx.reply("Ocorreu um erro ao processar seu pedido de presença.");
    }
  });
}
