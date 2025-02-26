// src/scheduler/checkEvents.ts
import workgroups from "../credentials/workgroupsfolders.json";
import { getEventsForPeriod } from "../services/google";
import { Telegraf } from "telegraf";

// Função auxiliar para formatar um único evento
function formatEvent(ev: any): string {
  const title = ev.summary || "Sem título";
  const location = ev.location || "Sem local";
  let date = "";
  let time = "";

  if (ev.start) {
    if (ev.start.dateTime) {
      const dt = new Date(ev.start.dateTime);
      date = dt.toLocaleDateString("pt-BR");
      time = dt.toLocaleTimeString("pt-BR");
    } else if (ev.start.date) {
      date = ev.start.date;
    }
  }

  const link = ev.htmlLink || "";

  return `*${title}*\n   📅 ${date}\n   ⏰ ${time}\n   📍 ${location}\n   🔗 [Abrir evento](${link})`;
}

// Função auxiliar para formatar a mensagem de agenda com todos os eventos
function formatEventsMessage(events: any[], header: string): string {
  let message = header + "\n\n";
  events.forEach((ev, idx) => {
    message += `*${idx + 1}.* ${formatEvent(ev)}\n\n`;
  });
  return message;
}

export const checkWorkgroupEvents = async (bot: Telegraf) => {
  console.log("Iniciando checkWorkgroupEvents...");
  try {
    const today = new Date();
    console.log("Data de hoje:", today.toISOString());
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    console.log("Dia da semana:", dayOfWeek);

    if (dayOfWeek === 0) {
      console.log(
        "Hoje é domingo. Preparando agenda semanal para o grupo Comunicação."
      );
      // Se hoje é domingo, envia a agenda da semana inteira para o grupo de Comunicação
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1); // Segunda
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Domingo
      console.log(
        "Período da agenda semanal:",
        startDate.toISOString(),
        "até",
        endDate.toISOString()
      );

      // Busca os eventos para o período (sem filtro de grupo)
      const events = await getEventsForPeriod(startDate, endDate);
      console.log("Eventos retornados para a semana:", events.length);

      if (events && events.length > 0) {
        const message = formatEventsMessage(events, "📅 *Agenda Semanal*");
        // Procura o grupo de Comunicação na configuração
        const commGroup = workgroups.find(
          (group: any) => group.label === "Comunicação"
        );
        if (commGroup) {
          console.log(
            "Enviando agenda semanal para o grupo Comunicação (ID:",
            commGroup.value,
            ")"
          );
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
      console.log(
        "Hoje não é domingo. Preparando agenda para amanhã para todos os grupos."
      );
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + 1); // Amanhã
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1); // Limite para um dia
      console.log(
        "Período para agenda de amanhã:",
        startDate.toISOString(),
        "até",
        endDate.toISOString()
      );

      // Itera sobre todos os grupos configurados
      for (const group of workgroups) {
        console.log(
          `Verificando eventos para o grupo ${group.label} (ID: ${group.value})`
        );
        try {
          const events = await getEventsForPeriod(
            startDate,
            endDate,
            group.value
          );
          console.log(
            `Eventos retornados para o grupo ${group.label}: ${events.length}`
          );
          if (events && events.length > 0) {
            const message = formatEventsMessage(
              events,
              "📅 *Agenda para amanhã*"
            );
            await bot.telegram.sendMessage(group.value, message, {
              parse_mode: "Markdown",
            });
            console.log(
              `Agenda de amanhã enviada para o grupo ${group.label} (${group.value}).`
            );
          } else {
            console.log(`Nenhum evento para amanhã no grupo ${group.label}.`);
          }
        } catch (groupError) {
          console.error(`Erro ao processar grupo ${group.label}:`, groupError);
        }
      }
    }
  } catch (error) {
    console.error("Erro geral em checkWorkgroupEvents:", error);
  }
};
