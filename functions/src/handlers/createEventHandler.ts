import * as admin from "firebase-admin";
import { createEvent } from "../services/google";
import calendars from "../config/calendars.json";

interface CalendarEventData {
  agenda: string;
  data: string;
  descricao: string;
  duracao: string;
  from: any;
  hora: string;
  id: string;
  titulo: string;
}

// Função para encontrar o calendarId a partir do nome da agenda
function getCalendarIdByName(name: string): string | undefined {
  const calendar = calendars.find((c) => c.name === name);
  return calendar?.id;
}

export async function handleCreateEvent(event: any): Promise<void> {
  const eventData = event.data.val() as CalendarEventData;

  const calendarId = getCalendarIdByName(eventData.agenda);
  if (!calendarId) {
    console.error(
      `Calendário não encontrado para a agenda: ${eventData.agenda}`
    );
    return;
  }

  const [yearStr, monthStr, dayStr] = eventData.data.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const [hourStr, minuteStr] = eventData.hora.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const startDateTime = new Date(year, month - 1, day, hour, minute);
  const endDateTime = new Date(startDateTime.getTime());
  endDateTime.setHours(
    endDateTime.getHours() + parseInt(eventData.duracao, 10)
  );

  const startTimeISOString = startDateTime.toISOString();
  const endTimeISOString = endDateTime.toISOString();

  try {
    const createdEvent = await createEvent(
      calendarId,
      eventData.titulo,
      startTimeISOString,
      endTimeISOString,
      "",
      eventData.descricao
      // eventData.id
    );
    console.log("Evento criado com sucesso no Google Calendar:", createdEvent);

    await admin.database().ref(`calendar/${event.params.eventId}`).update({
      googleEventId: createdEvent.id,
      googleHtmlLink: createdEvent.htmlLink,
    });
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error);
  }
}
