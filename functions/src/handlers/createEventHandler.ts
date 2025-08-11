// createEventHandler.ts
import { createEventWithMetadata } from "../services/google";
import { Telegraf } from "telegraf";
import { CalendarEventData } from "../config/types";
import { updateCalendarEventData } from "../services/firebase";
import {
  buildEventButtons,
  buildEventMessage,
} from "../messages/eventMessages";

export async function sendEventMessage(
  bot: Telegraf,
  eventData: CalendarEventData
): Promise<void> {
  const { from, id, workgroup } = eventData;

  // Constrói a mensagem formatada utilizando a função centralizada
  const message = buildEventMessage(eventData);

  // Define o inline keyboard com os botões "Abrir evento" e "Eu vou"
  const inlineKeyboard = buildEventButtons(eventData);

  try {
    // Envia a mensagem para a conversa privada do usuário
    await bot.telegram.sendMessage(from.id, message, {
      parse_mode: "MarkdownV2",
    });

    // Envia a mensagem para o grupo de trabalho com o inline keyboard
    const groupMessage = await bot.telegram.sendMessage(workgroup, message, {
      parse_mode: "MarkdownV2",
      reply_markup: inlineKeyboard.reply_markup,
    });

    // Atualiza no Firebase o ID da mensagem enviada para o grupo
    await updateCalendarEventData(id, {
      groupMessageId: groupMessage.message_id,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem no Telegram:", error);
  }
}

export async function handleCreateEvent(
  event: any,
  bot: Telegraf
): Promise<void> {
  const eventData = event.data.val() as CalendarEventData;

  if (!eventData.calendarId) {
    console.error("calendarId ausente no evento:");
    return;
  }

  try {
    // Cria o evento com metadados, passando também o workgroup
    const createdEvent = await createEventWithMetadata(
      eventData.calendarId,
      eventData.name,
      eventData.startDate,
      eventData.endDate,
      eventData.location,
      eventData.description,
      eventData.workgroup
    );

    eventData.calendarEventId = createdEvent.id;
    eventData.htmlLink = createdEvent.htmlLink;

    updateCalendarEventData(eventData.id, eventData);
    await sendEventMessage(bot, eventData);
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error);
  }
}
