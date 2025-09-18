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
import { addAttendeeToEvent } from "../services/google";
import { admin } from "../config/firebaseInit";

async function getUserEmail(userId: number): Promise<string | null> {
  try {
    const snapshot = await admin.database().ref(`subscribers/${userId}`).once('value');
    const userData = snapshot.val();
    return userData?.ameciclo_register?.email || userData?.email || null;
  } catch (error) {
    console.error('Erro ao buscar email do usuário:', error);
    return null;
  }
}

export function registerEventParticipationCallback(bot: Telegraf) {
  // Callback para "Eu vou"
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

      // Atualiza as listas de participantes
      const participants = eventData.participants || {};
      const notGoing = eventData.notGoing || {};
      const userId = ctx.from?.id?.toString();
      if (!userId) {
        await ctx.answerCbQuery("Usuário não identificado.", {
          show_alert: true,
        });
        return;
      }

      // Remove da lista "não vou" se estiver lá
      if (notGoing[userId]) {
        delete notGoing[userId];
      }

      const userAlreadyIn = participants[userId];

      if (userAlreadyIn) {
        // Se o usuário já estava na lista, remove-o
        delete participants[userId];
        await updateCalendarEventData(eventId, { participants, notGoing });
        await ctx.answerCbQuery("Você retirou sua presença do evento.");
      } else {
        // Verifica se o usuário tem email cadastrado
        const userEmail = await getUserEmail(parseInt(userId));
        
        if (!userEmail) {
          await ctx.answerCbQuery(
            "❌ Você precisa cadastrar seu email primeiro. Use /quem_sou_eu seuemail@exemplo.com",
            { show_alert: true }
          );
          return;
        }

        // Adiciona o usuário à lista
        participants[userId] = {
          id: userId,
          first_name: ctx.from?.first_name || "Usuário",
          email: userEmail,
        };
        
        // Tenta adicionar como convidado no Google Calendar
        if (eventData.calendarId && eventData.calendarEventId) {
          const success = await addAttendeeToEvent(
            eventData.calendarId,
            eventData.calendarEventId,
            userEmail
          );
          
          if (success) {
            await updateCalendarEventData(eventId, { participants, notGoing });
            await ctx.answerCbQuery("✅ Presença confirmada! Convite enviado por email.");
          } else {
            await updateCalendarEventData(eventId, { participants, notGoing });
            await ctx.answerCbQuery("✅ Presença confirmada! (Erro ao enviar convite por email)");
          }
        } else {
          await updateCalendarEventData(eventId, { participants, notGoing });
          await ctx.answerCbQuery("✅ Presença confirmada com sucesso!");
        }
      }

      // Atualiza o eventData com as listas atualizadas
      eventData.participants = participants;
      eventData.notGoing = notGoing;

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

  // Callback para "Não vou"
  bot.action(/^nao_vou_(.+)$/, async (ctx: Context) => {
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

      const eventData = await getCalendarEventData(eventId);
      if (!eventData) {
        await ctx.answerCbQuery("Evento não encontrado.", { show_alert: true });
        return;
      }

      const participants = eventData.participants || {};
      const notGoing = eventData.notGoing || {};
      const userId = ctx.from?.id?.toString();
      if (!userId) {
        await ctx.answerCbQuery("Usuário não identificado.", {
          show_alert: true,
        });
        return;
      }

      // Remove da lista "eu vou" se estiver lá
      if (participants[userId]) {
        delete participants[userId];
      }

      const userAlreadyNotGoing = notGoing[userId];

      if (userAlreadyNotGoing) {
        // Remove da lista "não vou"
        delete notGoing[userId];
        await updateCalendarEventData(eventId, { participants, notGoing });
        await ctx.answerCbQuery("Você removeu sua indicação de ausência.");
      } else {
        // Adiciona à lista "não vou"
        notGoing[userId] = {
          id: userId,
          first_name: ctx.from?.first_name || "Usuário",
        };
        await updateCalendarEventData(eventId, { participants, notGoing });
        await ctx.answerCbQuery("❌ Ausência registrada.");
      }

      // Atualiza o eventData
      eventData.participants = participants;
      eventData.notGoing = notGoing;

      const newText = buildEventMessage(eventData);
      const inlineKeyboard = buildEventButtons(eventData);

      await ctx.editMessageText(newText, {
        parse_mode: "MarkdownV2",
        reply_markup: inlineKeyboard.reply_markup,
      });
    } catch (err) {
      console.error("Erro ao registrar ausência no evento:", err);
      await ctx.reply("Ocorreu um erro ao processar sua indicação de ausência.");
    }
  });
}
