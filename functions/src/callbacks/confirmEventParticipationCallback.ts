// calendarActions.ts
import { Context, Telegraf } from "telegraf";
import {
  getCalendarEventData,
  updateCalendarEventData,
} from "../services/firebase";
import {
  buildEventButtons,
  buildEventMessage,
} from "../messages/eventMessages";

export function registerEventParticipationCallback(bot: Telegraf) {
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

      // Obtém o ID do evento a partir do callback_data (formato: eu_vou_{eventId})
      const callbackData = callbackQuery.data;
      const parts = callbackData.split("_");
      const eventId = parts[2];

      // Recupera os dados do evento (incluindo htmlLink e participantes)
      const eventData = await getCalendarEventData(eventId);
      if (!eventData) {
        await ctx.answerCbQuery("Evento não encontrado.", { show_alert: true });
        return;
      }

      // Atualiza a lista de participantes
      const participants = eventData.participants || {};
      const userId = ctx.from?.id?.toString();
      if (!userId) {
        await ctx.answerCbQuery("Usuário não identificado.", {
          show_alert: true,
        });
        return;
      }

      const userAlreadyIn = Object.values(participants).some(
        (p: any) => p.id === userId
      );

      if (userAlreadyIn) {
        // Se o usuário já estava na lista, remove-o
        const keyToRemove = Object.keys(participants).find(
          (key) => participants[key].id === userId
        );
        if (keyToRemove) {
          delete participants[keyToRemove];
        }
        await updateCalendarEventData(eventId, { participants });
        await ctx.answerCbQuery("Você retirou sua presença do evento.");
      } else {
        // Caso contrário, adiciona o usuário à lista
        participants[userId] = {
          id: userId,
          first_name: ctx.from?.first_name || "Usuário",
        };
        await updateCalendarEventData(eventId, { participants });
        await ctx.answerCbQuery("Presença confirmada com sucesso!");
      }

      // Atualiza o eventData com a lista de participantes atualizada
      eventData.participants = participants;

      const newText = buildEventMessage(eventData);
      const inlineKeyboard = buildEventButtons(eventData);

      // Edita a mensagem original com o novo texto formatado
      await ctx.editMessageText(newText, {
        parse_mode: "MarkdownV2",
        reply_markup: inlineKeyboard.reply_markup,
      });
    } catch (err) {
      console.error("Erro ao confirmar presença no evento:", err);
      await ctx.reply("Ocorreu um erro ao processar seu pedido de presença.");
    }
  });
}
