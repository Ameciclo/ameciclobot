// src/scheduler/checkEvents.ts
import workgroups from "../credentials/workgroupsfolders.json";
import { getEventsForPeriod } from "../services/google";
import { Telegraf } from "telegraf";
import {
  buildWeeklyAgendaMessage,
  buildDailyAgendaMessage,
  buildUnassignedEventsMessage,
} from "../utils/eventMessages";

export const checkEvents = async (bot: Telegraf, privateChatId?: number) => {
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
        const assignedEvents = events.filter((ev) => {
          const props = ev.extendedProperties?.private;
          return props && props.workgroup && props.workgroup === group.value.toString();
        });

        const unassignedEvents = events.filter((ev) => {
          const props = ev.extendedProperties?.private;
          return !props || !props.workgroup;
        });

        if (privateChatId) {
          // Enviar no chat privado
          if (assignedEvents.length > 0) {
            const message = `📅 **Agenda Semanal - ${group.label}:**\n\n${buildWeeklyAgendaMessage(assignedEvents)}`;
            await bot.telegram.sendMessage(privateChatId, message, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }
          if (group.label === "Secretaria" && unassignedEvents.length > 0) {
            const unassignedMessage = `🗓️ **Eventos Não Atribuídos:**\n\n${buildUnassignedEventsMessage(unassignedEvents)}`;
            await bot.telegram.sendMessage(privateChatId, unassignedMessage, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }
        } else {
          // Enviar para os grupos (comportamento original)
          if (assignedEvents.length > 0) {
            const message = buildWeeklyAgendaMessage(assignedEvents);
            console.log(
              `Enviando agenda semanal para o grupo ${group.label} (ID: ${group.value}) com ${assignedEvents.length} eventos.`
            );
            await bot.telegram.sendMessage(group.value, message, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }

          if (group.label === "Secretaria" && unassignedEvents.length > 0) {
            const unassignedMessage = buildUnassignedEventsMessage(unassignedEvents);
            console.log(
              `Enviando ${unassignedEvents.length} eventos não atribuídos para a Secretaria.`
            );
            await bot.telegram.sendMessage(group.value, unassignedMessage, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }
        }

        if (assignedEvents.length === 0 && (group.label !== "Secretaria" || unassignedEvents.length === 0)) {
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
        const assignedEvents = events.filter((ev) => {
          const props = ev.extendedProperties?.private;
          return props && props.workgroup && props.workgroup === group.value.toString();
        });

        const unassignedEvents = events.filter((ev) => {
          const props = ev.extendedProperties?.private;
          return !props || !props.workgroup;
        });

        if (privateChatId) {
          // Enviar no chat privado
          if (assignedEvents.length > 0) {
            const message = `📅 **Agenda Diária - ${group.label}:**\n\n${buildDailyAgendaMessage(assignedEvents)}`;
            await bot.telegram.sendMessage(privateChatId, message, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }
          if (group.label === "Secretaria" && unassignedEvents.length > 0) {
            const unassignedMessage = `🗓️ **Eventos Não Atribuídos:**\n\n${buildUnassignedEventsMessage(unassignedEvents)}`;
            await bot.telegram.sendMessage(privateChatId, unassignedMessage, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }
        } else {
          // Enviar para os grupos (comportamento original)
          if (assignedEvents.length > 0) {
            const message = buildDailyAgendaMessage(assignedEvents);
            console.log(
              `Enviando agenda de amanhã para o grupo ${group.label} (ID: ${group.value}) com ${assignedEvents.length} eventos.`
            );
            await bot.telegram.sendMessage(group.value, message, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }

          if (group.label === "Secretaria" && unassignedEvents.length > 0) {
            const unassignedMessage = buildUnassignedEventsMessage(unassignedEvents);
            console.log(
              `Enviando ${unassignedEvents.length} eventos não atribuídos para a Secretaria.`
            );
            await bot.telegram.sendMessage(group.value, unassignedMessage, {
              parse_mode: "MarkdownV2",
              disable_web_page_preview: true,
            } as any);
          }
        }

        if (assignedEvents.length === 0 && (group.label !== "Secretaria" || unassignedEvents.length === 0)) {
          console.log(`Nenhum evento para amanhã no grupo ${group.label}.`);
        }
      }
    }
  } catch (error) {
    console.error("Erro geral em checkWorkgroupEvents:", error);
  }
};