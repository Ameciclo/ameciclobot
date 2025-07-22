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
        console.log("Callback query inválido:", callbackQuery);
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data;
      console.log("Callback data recebida:", callbackData);

      if (callbackData === "add_event_skip") {
        console.log("Opção 'Não adicionar' selecionada.");
        await ctx.editMessageText("🚫 Ação de adição de evento cancelada! 📅❌");
        await ctx.answerCbQuery("Evento não adicionado.");
        return;
      }

      // Extrai o índice do calendário do callback_data (formato: add_event_{index})
      const parts = callbackData.split("_");
      console.log("Parts do callback data:", parts);
      const index = parseInt(parts[2], 10);
      console.log("Índice extraído:", index);

      if (isNaN(index) || index < 0 || index >= calendars.length) {
        console.log("Índice de calendário inválido. Calendars:", calendars);
        await ctx.answerCbQuery("Calendário inválido.", { show_alert: true });
        return;
      }

      const calendarId = calendars[index].id;
      console.log("calendarId selecionado:", calendarId);

      // Extrai o JSON do evento a partir da mensagem original
      const messageText = ctx.text;
      console.log("Texto da mensagem original:", messageText);
      if (!messageText) {
        await ctx.answerCbQuery(
          "Não foi possível recuperar os dados do evento."
        );
        return;
      }

      // Supõe que o JSON esteja dentro de um bloco de código Markdown: ```json ... ```
      const jsonRegex = /(?:```json\s*)?({[\s\S]*})(?:\s*```)?/;
      const match = jsonRegex.exec(messageText);
      console.log("Resultado da busca pelo JSON:", match);
      if (!match) {
        await ctx.answerCbQuery("Dados do evento não encontrados na mensagem.");
        return;
      }

      let eventData;
      try {
        eventData = JSON.parse(match[1].trim());
        console.log("Evento parseado com sucesso:", eventData);
      } catch (parseErr) {
        console.error("Erro ao fazer parse do JSON do evento:", parseErr);
        await ctx.answerCbQuery("Erro ao interpretar os dados do evento.");
        return;
      }

      // Atualiza os dados do evento
      eventData.calendarId = calendarId;
      eventData.from = {
        id: ctx.from?.id,
        first_name: ctx.from?.first_name || "Usuário",
        last_name: ctx.from?.last_name || "",
        username: ctx.from?.username || "",
      };
      eventData.workgroup = ctx.chat?.id;
      console.log(
        "Dados do evento após atualização com usuário e workgroup:",
        eventData
      );

      // Se não houver endDate, assume que o evento dura 1 hora
      if (!eventData.endDate && eventData.startDate) {
        const start = new Date(eventData.startDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        eventData.endDate = end.toISOString();
        console.log(
          "endDate assumido (1 hora após startDate):",
          eventData.endDate
        );
      }

      if (!eventData.startDate) {
        await ctx.answerCbQuery("Data de início do evento não encontrada.");
        return;
      }

      const eventId = generateEventId(eventData.startDate);
      eventData.id = eventId;
      console.log("ID gerado para o evento:", eventId);
      console.log("Evento final a ser salvo:", eventData);

      // Salva o evento no Firebase no endpoint "calendar"
      await admin.database().ref(`calendar/${eventId}`).set(eventData);
      console.log("Evento salvo no Firebase com sucesso.");

      // Confirma a adição editando a mensagem original
      const successMessage = `Evento adicionado com sucesso ao calendário (${calendarId})!\nID do evento: ${eventId}`;
      console.log("Mensagem de sucesso que será enviada:", successMessage);
      await ctx.editMessageText(successMessage);
      await ctx.answerCbQuery("Evento adicionado com sucesso!");
    } catch (err) {
      console.error("Erro no callback de adicionar evento:", err);
      await ctx.answerCbQuery("Ocorreu um erro ao adicionar o evento.", {
        show_alert: true,
      });
    }
  });
}
