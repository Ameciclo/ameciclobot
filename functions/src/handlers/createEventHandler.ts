import { createEventWithMetadata } from "../services/google";
import { Telegraf } from "telegraf";
import { CalendarEventData } from "../config/types";
import { updateCalendarEventData } from "../services/firebase";

// Nomes dos calendários para exibição

const calendarNames: { [key: string]: string } = {
  "ameciclo@gmail.com": "Eventos Internos",
  "oj4bkgv1g6cmcbtsap4obgi9vc@group.calendar.google.com": "Eventos Externos",
  "k0gbrljrh0e4l2v8cuc05nsljc@group.calendar.google.com":
    "Divulgação de eventos externos",
  "an6nh96auj9n3jtj28qno1limg@group.calendar.google.com": "Organizacional",
};

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

  const start = new Date(startDate).toLocaleString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });

  const duration = getDuration(startDate, endDate);

  // Monte a mensagem
  const message = `\
Evento adicionado na agenda por ${from.first_name}!

${name}
🗓 Data: ${start} (${duration})
📍 Local: ${location}calendars
📫 Tipo: ${calendarNames[calendarId]}

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
    await bot.telegram.sendMessage(from.id, message);

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
  console.log("Dados recebidos para criação de evento:", eventData);

  if (!eventData.calendarId) {
    console.error("calendarId ausente no evento:", eventData);
    return;
  }

  try {
    // Agora, passe eventData.workgroup para criar o evento com metadados
    const createdEvent = await createEventWithMetadata(
      eventData.calendarId,
      eventData.name,
      eventData.startDate,
      eventData.endDate,
      eventData.location,
      eventData.description,
      eventData.workgroup // Aqui inserimos o metadado do grupo
    );

    eventData.calendarEventId = createdEvent.id;
    eventData.htmlLink = createdEvent.htmlLink;

    updateCalendarEventData(eventData.id, eventData);
    await sendEventMessage(bot, eventData);
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error);
  }
}
