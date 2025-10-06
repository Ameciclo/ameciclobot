import { Telegraf } from "telegraf";
import { getEventById, updateEventWorkgroup } from "../services/google";
import workgroups from "../credentials/workgroupsfolders.json";
import { buildDailyAgendaMessage } from "../utils/eventMessages";
import { escapeMarkdownV2 } from "../utils/utils";

export function registerAssignWorkgroupCallback(bot: Telegraf) {
  console.log("[assignWorkgroup] Registrando callback asg|");
  
  bot.action(/^asg\|(-?\d+)\|(.+)$/, async (ctx) => {
    console.log("[assignWorkgroup] ========== CALLBACK INICIADO ==========");
    console.log("[assignWorkgroup] Callback recebido:", (ctx.callbackQuery as any)?.data);
    
    // Responde imediatamente para mostrar que o callback foi executado
    await ctx.answerCbQuery("🔄 Processando...");
    
    const match = (ctx as any).match as RegExpMatchArray;
    const groupId = match[1];
    const eventId = match[2];
    
    console.log("[assignWorkgroup] GroupId:", groupId, "EventId:", eventId);
    console.log("[assignWorkgroup] Match completo:", match);
    
    try {
      const group = workgroups.find(g => g.value.toString() === groupId);
      if (!group) {
        console.log("[assignWorkgroup] Grupo não encontrado:", groupId);
        console.log("[assignWorkgroup] Grupos disponíveis:", workgroups.map(g => ({ value: g.value, label: g.label })));
        await ctx.answerCbQuery("❌ Grupo não encontrado");
        return;
      }

      console.log("[assignWorkgroup] Grupo encontrado:", group);
      console.log("[assignWorkgroup] Atualizando evento...");
      
      const updateResult = await updateEventWorkgroup(eventId, groupId);
      console.log("[assignWorkgroup] Resultado da atualização:", updateResult);
      
      console.log("[assignWorkgroup] Buscando evento atualizado...");
      const event = await getEventById(eventId);
      console.log("[assignWorkgroup] Evento recuperado:", event ? { id: event.id, summary: event.summary, workgroup: event.extendedProperties?.private?.workgroup } : "null");
      
      if (event) {
        const eventTitle = event.summary || "Evento sem título";
        const successMessage = `✅ **Evento atribuído com sucesso\\!**\n\n📝 **Evento:** ${escapeMarkdownV2(eventTitle)}\n👥 **Grupo:** ${escapeMarkdownV2(group.label)}`;
        
        console.log("[assignWorkgroup] Editando mensagem com:", successMessage);
        try {
          await ctx.editMessageText(successMessage, {
            parse_mode: "MarkdownV2"
          });
          console.log("[assignWorkgroup] Mensagem editada com sucesso");
        } catch (editError) {
          console.error("[assignWorkgroup] Erro ao editar mensagem:", editError);
        }

        console.log("[assignWorkgroup] Enviando evento para o grupo:", group.value);
        try {
          const eventMessage = buildDailyAgendaMessage([event]);
          console.log("[assignWorkgroup] Mensagem do evento:", eventMessage);
          
          await ctx.telegram.sendMessage(group.value, eventMessage, {
            parse_mode: "MarkdownV2",
            link_preview_options: { is_disabled: true }
          });
          console.log("[assignWorkgroup] Evento enviado para o grupo com sucesso");
        } catch (sendError) {
          console.error("[assignWorkgroup] Erro ao enviar para o grupo:", sendError);
        }
      } else {
        console.log("[assignWorkgroup] Evento não encontrado após atualização");
      }

      try {
        await ctx.answerCbQuery(`✅ Evento atribuído ao ${group.label}`);
        console.log("[assignWorkgroup] Callback answer enviado");
      } catch (answerError) {
        console.error("[assignWorkgroup] Erro ao enviar callback answer:", answerError);
      }
      
      console.log("[assignWorkgroup] Callback concluído com sucesso");

    } catch (error) {
      console.error("[assignWorkgroup] Erro ao atribuir evento:", error);
      await ctx.answerCbQuery("❌ Erro ao atribuir evento");
    }
  });
}