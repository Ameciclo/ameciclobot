// src/scheduler/checkUpcomingEvents.ts
import { getEventsForPeriod } from "../services/google";
import { admin } from "../config/firebaseInit";
import { Telegraf } from "telegraf";
import { escapeMarkdownV2 } from "../utils/utils";

// Função para buscar participantes de um evento
async function getEventParticipants(eventId: string): Promise<number[]> {
  try {
    const snapshot = await admin.database().ref(`calendar/${eventId}/participants`).once('value');
    const participants = snapshot.val() || {};
    return Object.keys(participants).map(id => parseInt(id));
  } catch (error) {
    console.error('Erro ao buscar participantes do evento:', error);
    return [];
  }
}

// Função para criar mensagem de notificação 30 minutos antes
function buildEventReminderMessage(event: any): string {
  const title = event.summary || "Evento";
  const location = event.location || "Local não informado";
  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Recife",
  });

  const tips = [
    "📸 Tire fotos ou prints do evento",
    "📝 Anote informações importantes, você fará um resumo depois",
    "👔 Se for em órgão público, verifique a obrigatoriedade de calças compridas",
    "🚴 Chegue cedo\\! É respeito ao próximo, e a bicicleta não te dá desculpa de trânsito"
  ];

  return `🔔 *Lembrete: Evento em 30 minutos\\!*\n\n` +
         `📅 *${escapeMarkdownV2(title)}*\n` +
         `🕐 *Horário:* ${escapeMarkdownV2(startTime)}\n` +
         `📍 *Local:* ${escapeMarkdownV2(location)}\n\n` +
         `💡 *Dicas importantes:*\n` +
         tips.map(tip => `• ${tip}`).join('\n');
}

// Função para buscar o ID do Firebase a partir do ID do Google Calendar
async function getFirebaseEventId(googleEventId: string): Promise<string | null> {
  try {
    const snapshot = await admin.database().ref('calendar').once('value');
    const events = snapshot.val() || {};
    
    for (const [firebaseId, eventData] of Object.entries(events)) {
      if ((eventData as any).calendarEventId === googleEventId || (eventData as any).googleEventId === googleEventId) {
        return firebaseId;
      }
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar ID do Firebase:', error);
    return null;
  }
}

// Função para verificar eventos que começam em 30 minutos
export const checkUpcomingEvents = async (bot: Telegraf, privateChatId?: number) => {
  console.log("Verificando eventos que começam em 30 minutos...");
  try {
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
    const in35Minutes = new Date(now.getTime() + 35 * 60 * 1000);

    // Busca eventos que começam entre 30 e 35 minutos
    const events = await getEventsForPeriod(in30Minutes, in35Minutes);
    console.log(`Encontrados ${events.length} eventos começando em ~30 minutos`);

    for (const event of events) {
      if (!event.id) continue;

      // Busca o ID do Firebase correspondente ao evento do Google Calendar
      const firebaseEventId = await getFirebaseEventId(event.id);
      if (!firebaseEventId) {
        console.log(`Evento ${event.summary} não encontrado no Firebase`);
        continue;
      }

      // Verifica se já foi notificado
      const notifiedSnapshot = await admin.database().ref(`calendar/${firebaseEventId}/notified`).once('value');
      if (notifiedSnapshot.exists()) {
        console.log(`Evento ${event.summary} já foi notificado`);
        continue;
      }

      // Busca participantes que marcaram "Eu vou"
      const participantIds = await getEventParticipants(firebaseEventId);
      console.log(`Evento ${event.summary}: ${participantIds.length} participantes`);

      if (participantIds.length === 0) continue;

      const message = buildEventReminderMessage(event);

      if (privateChatId) {
        // Enviar no chat privado
        const privateMessage = `🔔 **Evento Próximo:**\n\n${message}`;
        await bot.telegram.sendMessage(privateChatId, privateMessage, {
          parse_mode: "MarkdownV2",
        } as any);
        console.log(`Notificação do evento enviada no chat privado`);
      } else {
        // Envia notificação para cada participante (comportamento original)
        for (const userId of participantIds) {
          try {
            await bot.telegram.sendMessage(userId, message, {
              parse_mode: "MarkdownV2",
            } as any);
            console.log(`Notificação enviada para usuário ${userId}`);
          } catch (error) {
            console.error(`Erro ao enviar notificação para usuário ${userId}:`, error);
          }
        }
      }

      // Marca como notificado
      await admin.database().ref(`calendar/${firebaseEventId}/notified`).set(true);
      console.log(`Evento ${event.summary} marcado como notificado`);
    }
  } catch (error) {
    console.error("Erro ao verificar eventos próximos:", error);
  }
};