// src/scheduler/checkEvents.ts
import workgroups from "../credentials/workgroupsfolders.json";
import { getEventsForPeriod } from "../services/google";
import { Telegraf } from "telegraf";
import {
  buildWeeklyAgendaMessage,
  buildDailyAgendaMessage,
} from "../messages/eventMessages";

export const checkEvents = async (bot: Telegraf) => {
  console.log("Iniciando checkWorkgroupEvents...");
  try {
    const today = new Date();
    console.log("Data de hoje:", today.toISOString());
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    console.log("Dia da semana:", dayOfWeek);

    if (dayOfWeek === 0) {
      // Agenda semanal
      console.log(
        "Hoje é domingo. Preparando agenda semanal para todos os grupos."
      );
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1); // Segunda-feira
      startDate.setHours(0, 0, 0, 0); // Início do dia: 00:00
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Até domingo da próxima semana
      endDate.setHours(23, 59, 59, 999); // Final do dia: 23:59
      console.log(
        "Período da agenda semanal:",
        startDate.toISOString(),
        "até",
        endDate.toISOString()
      );

      // Busca TODOS os eventos para o período
      const events = await getEventsForPeriod(startDate, endDate);
      console.log("Eventos retornados para a semana:", events.length);

      // Para cada grupo, filtra os eventos correspondentes
      for (const group of workgroups) {
        const filteredEvents = events.filter((ev) => {
          const props = ev.extendedProperties?.private;
          if (props && props.workgroup) {
            return props.workgroup === group.value.toString();
          } else {
            // Se não tiver workgroup designado, envia para "Secretaria"
            return group.label === "Secretaria";
          }
        });

        if (filteredEvents.length > 0) {
          const message = buildWeeklyAgendaMessage(filteredEvents);
          console.log(
            `Enviando agenda semanal para o grupo ${group.label} (ID: ${group.value}) com ${filteredEvents.length} eventos.`
          );
          await bot.telegram.sendMessage(group.value, message, {
            parse_mode: "MarkdownV2",
          });
        } else {
          console.log(`Nenhum evento para a semana no grupo ${group.label}.`);
        }
      }
    } else {
      // Agenda diária (amanhã)
      console.log(
        "Hoje não é domingo. Preparando agenda para amanhã para todos os grupos."
      );
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1); // Amanhã
      startDate.setHours(0, 0, 0, 0); // Início do dia: 00:00
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999); // Final do dia: 23:59
      console.log(
        "Período para agenda de amanhã:",
        startDate.toISOString(),
        "até",
        endDate.toISOString()
      );

      // Busca TODOS os eventos para o período
      const events = await getEventsForPeriod(startDate, endDate);
      console.log("Eventos retornados para amanhã:", events.length);

      // Para cada grupo, filtra os eventos correspondentes
      for (const group of workgroups) {
        const filteredEvents = events.filter((ev) => {
          const props = ev.extendedProperties?.private;
          if (props && props.workgroup) {
            return props.workgroup === group.value.toString();
          } else {
            // Se não tiver workgroup designado, envia para "Secretaria"
            return group.label === "Secretaria";
          }
        });

        if (filteredEvents.length > 0) {
          const message = buildDailyAgendaMessage(filteredEvents);
          console.log(
            `Enviando agenda de amanhã para o grupo ${group.label} (ID: ${group.value}) com ${filteredEvents.length} eventos.`
          );
          await bot.telegram.sendMessage(group.value, message, {
            parse_mode: "MarkdownV2",
          });
        } else {
          console.log(`Nenhum evento para amanhã no grupo ${group.label}.`);
        }
      }
    }
  } catch (error) {
    console.error("Erro geral em checkWorkgroupEvents:", error);
  }
};
