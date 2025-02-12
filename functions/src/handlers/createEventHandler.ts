import { createEvent } from "../services/google";
import { Telegraf } from "telegraf";
import { CalendarEventData } from "../config/types";
import { updateCalendarEventGroupMessage } from "../services/firebase";

function getDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);

  let durationStr = "";
  if (diffHours > 0) {
    durationStr += `${diffHours}h`;
  }
  if (diffMinutes > 0) {
    durationStr += `${diffMinutes.toString().padStart(2, "0")}min`;
  }
  return durationStr;
}

export async function sendEventMessage(
  bot: Telegraf,
  eventData: CalendarEventData
): Promise<void> {
  const {
    from,
    name,
    startDate,
    endDate,
    location,
    description,
    workgroup,
    calendarId,
    id,
    htmlLink,
  } = eventData;

  const start = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date(startDate));
  const duration = getDuration(startDate, endDate);

  // Monte a mensagem
  const message = `\
Evento adicionado na agenda por ${from.first_name}!

${name}
🗓 Data: ${start} (${duration})
📍 Local: ${location}
📫 Tipo: ${calendarId}

🖌 Descrição: ${description}`;

  // Botões (Inline Keyboard):
  // 1) "Abrir evento" -> link para o evento no Google Calendar
  // 2) "Eu vou"       -> callback data com ID único do evento, para registrar a participação

  const inlineKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Abrir evento",
            url: htmlLink,
          },
          {
            text: "Eu vou",
            callback_data: `eu_vou_${id}`,
          },
        ],
      ],
    },
  };

  try {
    // Enviar para a conversa privada do usuário
    // O ID do usuário está em `from.id` (caso você tenha permissão para enviar PM)
    await bot.telegram.sendMessage(from.id, message, inlineKeyboard);

    const groupMessage = await bot.telegram.sendMessage(
      workgroup,
      message,
      inlineKeyboard
    );
    console.log(
      "Mensagem enviada para o grupo. ID da mensagem: ",
      groupMessage.message_id
    );

    // Salva no Firebase o ID da mensagem do grupo
    await updateCalendarEventGroupMessage(id, groupMessage.message_id);
  } catch (error) {
    console.error("Erro ao enviar mensagem no Telegram:", error);
  }
}

export async function handleCreateEvent(
  event: any,
  bot: Telegraf
): Promise<void> {
  const eventData = event.data.val() as CalendarEventData;

  // Log completo dos dados recebidos para verificar se estão corretos
  console.log("Dados recebidos para criação de evento:", eventData);

  // Verifica se o calendarId está presente
  if (!eventData.calendarId) {
    console.error("calendarId ausente no evento:", eventData);
    return; // ou trate esse caso conforme a sua lógica
  }

  try {
    const createdEvent = await createEvent(
      eventData.calendarId,
      eventData.name,
      eventData.startDate,
      eventData.endDate,
      eventData.location,
      eventData.description
    );
    console.log("Evento criado com sucesso no Google Calendar:", createdEvent);

    eventData.id = createdEvent.id;
    eventData.htmlLink = createdEvent.htmlLink;
    // Envia a mensagem no Telegram
    await sendEventMessage(bot, eventData);
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error);
  }
}
