import { admin } from "../config/firebaseInit";

export async function getThisMonthEventIds(): Promise<string[]> {
  try {
    const snapshot = await admin.database().ref("calendar").once("value");
    const events = snapshot.val() || {};
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const thisMonthEventIds: string[] = [];
    
    Object.keys(events).forEach(eventId => {
      const event = events[eventId];
      if (event.startDate) {
        const eventDate = new Date(event.startDate);
        if (eventDate >= startOfMonth && eventDate <= endOfMonth) {
          thisMonthEventIds.push(eventId);
        }
      }
    });
    
    return thisMonthEventIds;
  } catch (error) {
    console.error("Erro ao buscar eventos do mês:", error);
    return [];
  }
}