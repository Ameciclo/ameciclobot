// callbacks/assignWorkgroup.ts
import { Telegraf, Markup } from "telegraf";
import workgroups from "../credentials/workgroupsfolders.json";
import { getEventById, updateEventWorkgroup } from "../services/google";
import { buildDailyAgendaMessage } from "../messages/eventMessages";

export const registerAssignWorkgroupCallbacks = (bot: Telegraf) => {
  // Callback para quando clica em "Atribuir evento X"
  bot.action(/assign_event_(.+)/, async (ctx) => {
    try {
      const eventId = ctx.match[1];
      
      // Cria botões com os grupos de trabalho (exceto Secretaria)
      const workgroupButtons = workgroups
        .filter(g => g.label !== "Secretaria")
        .map(group => 
          Markup.button.callback(
            group.label,
            `set_workgroup_${group.value}_${eventId}`
          )
        );
      
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          ...workgroupButtons.map(btn => [btn]),
          [Markup.button.callback("❌ Cancelar", "cancel_assign")]
        ]
      });
      
      await ctx.answerCbQuery("Escolha o grupo de trabalho:");
    } catch (error) {
      console.error("Erro ao mostrar opções de workgroup:", error);
      await ctx.answerCbQuery("Erro ao carregar opções");
    }
  });

  // Callback para quando escolhe um workgroup específico
  bot.action(/set_workgroup_(\d+)_(.+)/, async (ctx) => {
    try {
      const workgroupId = ctx.match[1];
      const eventId = ctx.match[2];
      
      // Atualizar evento no Google Calendar
      const success = await updateEventWorkgroup(eventId, workgroupId);
      
      if (!success) {
        await ctx.answerCbQuery("Erro ao atribuir evento");
        return;
      }
      
      // Buscar dados do grupo e evento
      const targetGroup = workgroups.find(g => g.value.toString() === workgroupId);
      const event = await getEventById(eventId);
      
      if (targetGroup && event) {
        // Enviar evento para o grupo atribuído
        const message = buildDailyAgendaMessage([event]);
        const notificationMessage = `🔔 *Evento atribuído ao grupo:*\n\n${message}`;
        
        await bot.telegram.sendMessage(targetGroup.value, notificationMessage, {
          parse_mode: "MarkdownV2"
        });
        
        await ctx.answerCbQuery(`✅ Evento enviado para ${targetGroup.label}`);
        
        // Atualizar a mensagem original para mostrar que foi atribuído
        const eventTitle = event.summary || "Evento sem título";
        await ctx.editMessageText(
          `✅ *${eventTitle}* foi atribuído ao grupo **${targetGroup.label}**`,
          { parse_mode: "MarkdownV2" }
        );
      } else {
        await ctx.answerCbQuery("Erro ao encontrar dados do evento ou grupo");
      }
    } catch (error) {
      console.error("Erro ao atribuir workgroup:", error);
      await ctx.answerCbQuery("Erro ao atribuir evento");
    }
  });

  // Callback para cancelar atribuição
  bot.action("cancel_assign", async (ctx) => {
    try {
      await ctx.answerCbQuery("Atribuição cancelada");
      // Volta para a mensagem original (sem fazer nada)
      await ctx.editMessageReplyMarkup(undefined);
    } catch (error) {
      console.error("Erro ao cancelar atribuição:", error);
    }
  });
};