// src/commands/eventCallback.ts
import { Context, Telegraf } from "telegraf";
import calendars from "../credentials/calendars.json";
import { admin } from "../config/firebaseInit";

/**
 * Gera um ID para o evento usando o startDate e 6 caracteres aleatórios.
 */
function generateEventId(startDate: string): string {
  const randomStr = Math.random().toString(36).substring(2, 8);
  const cleanDate = startDate.replace(/[^0-9]/g, "");
  return `${cleanDate}-${randomStr}`;
}

/**
 * Callback para adicionar um evento ao Firebase.
 * Responde ao callback_data que inicia com "add_event_".
 * Se for "add_event_skip", remove os botões e cancela.
 */
export function registerEventCallback(bot: Telegraf) {
  bot.action(/^add_event_(.+)$/, async (ctx: Context) => {
    try {
      console.log("Iniciando callback de evento...");

      const callbackQuery = ctx.callbackQuery;
      if (
        !callbackQuery ||
        !("data" in callbackQuery) ||
        typeof callbackQuery.data !== "string"
      ) {
      console.log("EVENT Callback query inválido.");
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data;

      if (callbackData === "add_event_skip") {
        console.log("Opção 'Não adicionar' selecionada.");
        await ctx.editMessageText("🚫 Ação de adição de evento cancelada! 📅❌");
        await ctx.answerCbQuery("Evento não adicionado.");
        return;
      }

      // Extrai o índice do calendário e ID temporário do callback_data (formato: add_event_{index}_{tempId})
      const parts = callbackData.split("_");
      const index = parseInt(parts[2], 10);
      const tempEventId = parts[3];
      console.log("Índice extraído:", index, "ID temporário:", tempEventId);

      if (isNaN(index) || index < 0 || index >= calendars.length) {
        console.log("Índice de calendário inválido. Calendars:", calendars);
        await ctx.answerCbQuery("Calendário inválido.", { show_alert: true });
        return;
      }

      if (!tempEventId) {
        await ctx.answerCbQuery("ID do evento não encontrado.", { show_alert: true });
        return;
      }

      const calendarId = calendars[index].id;
      console.log("calendarId selecionado:", calendarId);

      // Recupera os dados do evento do Firebase
      const tempEventRef = admin.database().ref(`temp_events/${tempEventId}`);
      const snapshot = await tempEventRef.once('value');
      const eventData = snapshot.val();
      
      if (!eventData) {
        await ctx.answerCbQuery("Dados do evento não encontrados.", { show_alert: true });
        return;
      }
      
      // Remove os dados temporários
      await tempEventRef.remove();

      // Atualiza os dados do evento
      eventData.calendarId = calendarId;
      eventData.from = {
        id: ctx.from?.id,
        first_name: ctx.from?.first_name || "Usuário",
        last_name: ctx.from?.last_name || "",
        username: ctx.from?.username || "",
      };
      eventData.workgroup = ctx.chat?.id;

      // Se não houver endDate, assume que o evento dura 1 hora
      if (!eventData.endDate && eventData.startDate) {
        const start = new Date(eventData.startDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        eventData.endDate = end.toISOString();
      }

      if (!eventData.startDate) {
        await ctx.answerCbQuery("Data de início do evento não encontrada.");
        return;
      }

      const eventId = generateEventId(eventData.startDate);
      eventData.id = eventId;

      // Salva o evento no Firebase no endpoint "calendar"
      await admin.database().ref(`calendar/${eventId}`).set(eventData);
      console.log("Evento salvo no Firebase com sucesso.");

      // Apenas confirma via callback query, a mensagem será enviada pelo handler
      await ctx.answerCbQuery("Evento adicionado com sucesso!");
      
      // Deleta a mensagem original
      await ctx.deleteMessage();
    } catch (err) {
      await ctx.answerCbQuery("Ocorreu um erro ao adicionar o evento.", {
        show_alert: true,
      });
    }
  });
}
