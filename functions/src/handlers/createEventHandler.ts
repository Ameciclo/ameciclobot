import { createEvent } from "../services/google";
import { CalendarEventData } from "../config/types";


export async function handleCreateEvent(event: any): Promise<void> {
  const eventData = event.data.val() as CalendarEventData;

  try {
    const createdEvent = await createEvent(
      eventData.calendarId,
      eventData.name,
      eventData.startDate,
      eventData.endDate,
      eventData.location,
      eventData.description
      // eventData.id
    );
    console.log("Evento criado com sucesso no Google Calendar:", createdEvent);
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error);
  }
}
