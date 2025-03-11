// messages/eventMessages.ts
import { escapeMarkdownV2 } from "../utils/utils";
import { CalendarEventData, TelegramUserInfo } from "../config/types";
import calendars from "../credentials/calendars.json";

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

function getStartDate(startDate: string) {
  return new Date(startDate).toLocaleString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });
}

function getCalendarById(calendarId: string) {
  return calendars.find((c) => c.id === calendarId);
}

function getCalendarNameById(calendarId: string) {
  const calendar = getCalendarById(calendarId);
  return calendar ? calendar.name : "Unknown";
}

function buildParticipantsList(participants: {
  [key: number]: TelegramUserInfo;
}): string {
  return Object.values(participants)
    .map((p: any) => `✅ ${p.first_name}`)
    .join("\n");
}

export function buildEventMessage(data: CalendarEventData): string {
  const duration = getDuration(data.startDate, data.endDate);
  const startDate = getStartDate(data.startDate);
  const calendarType = getCalendarNameById(data.calendarId);

  const messageParts = [
    `Evento adicionado na agenda por ${escapeMarkdownV2(
      data.from.first_name + "!"
    )}`,
    `${escapeMarkdownV2(data.name)}`,
    `🗓 Data: ${escapeMarkdownV2(startDate)} \\(${escapeMarkdownV2(
      duration
    )}\\)`,
    `📍 Local: ${escapeMarkdownV2(data.location)}`,
    `📫 Tipo: ${escapeMarkdownV2(calendarType)}`,
    ``,
    `🖌 Descrição: ${escapeMarkdownV2(data.description)};`,
  ];

  let message = messageParts.join("\n");
  if (data.participants) {
    const participantsList = buildParticipantsList(data.participants);
    message += `\n\nParticipantes confirmados:\n${participantsList}`;
  }
  return message;
}

export function buildEventButtons(eventData: CalendarEventData) {
  const { id, htmlLink } = eventData;
  const inlineKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📅 Abrir evento", url: htmlLink },
          { text: "🎟️ Eu vou", callback_data: `eu_vou_${id}` },
        ],
      ],
    },
  };
  return inlineKeyboard;
}
