// src/scheduler/checkEvents.ts
import workgroups from "../credentials/workgroupsfolders.json";
import { getEventsForPeriod } from "../services/google"; // Função que você deverá implementar
import { Telegraf } from "telegraf";

// Função auxiliar para formatar mensagens de agenda
function formatEventsMessage(events: any[], header: string): string {
  let message = header + "\n\n";
  events.forEach((ev, idx) => {
    message += `*${idx + 1}.* ${ev.type} - ${ev.title}\n`;
    message += `   📅 ${ev.date}\n   ⏰ ${ev.time}\n   📍 ${ev.location}\n   🔗 [Abrir evento](${ev.link})\n\n`;
  });
  return message;
}

export const checkWorkgroupEvents = async (bot: Telegraf) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.

  if (dayOfWeek === 0) {
    // Se hoje é domingo, envia a agenda da semana inteira para o grupo de Comunicação
    // Definindo o período: de segunda a domingo da próxima semana
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1); // Segunda
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Domingo

    // Busca os eventos para o período (sem filtro de grupo, pois será para o grupo de Comunicação)
    const events = await getEventsForPeriod(startDate, endDate);
    if (events && events.length > 0) {
      const message = formatEventsMessage(events, "📅 *Agenda Semanal*");
      // Procura o grupo de Comunicação na configuração
      const commGroup = workgroups.find(
        (group: any) => group.label === "Comunicação"
      );
      if (commGroup) {
        await bot.telegram.sendMessage(commGroup.value, message, {
          parse_mode: "Markdown",
        });
        console.log("Agenda semanal enviada para o grupo Comunicação.");
      } else {
        console.error("Grupo Comunicação não encontrado na configuração.");
      }
    } else {
      console.log("Nenhum evento para a semana.");
    }
  } else {
    // Para os demais dias, envia os eventos do dia seguinte para cada grupo
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 1); // Amanhã
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1); // Limite para um dia

    // Itera sobre todos os grupos configurados
    for (const group of workgroups) {
      // Supondo que a função getEventsForPeriod pode receber um filtro por grupo
      const events = await getEventsForPeriod(startDate, endDate, group.value);
      if (events && events.length > 0) {
        const message = formatEventsMessage(events, "📅 *Agenda para amanhã*");
        await bot.telegram.sendMessage(group.value, message, {
          parse_mode: "Markdown",
        });
        console.log(
          `Agenda de amanhã enviada para o grupo ${group.label} (${group.value}).`
        );
      } else {
        console.log(`Nenhum evento para amanhã no grupo ${group.label}.`);
      }
    }
  }
};
