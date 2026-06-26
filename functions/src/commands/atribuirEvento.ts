import { Telegraf, Context } from "telegraf";
import { Markup } from "telegraf";
import { getEventById, updateEventWorkgroup } from "../services/google";
import workgroups from "../credentials/workgroupsfolders.json";
import { buildDailyAgendaMessage } from "../utils/eventMessages";
import { escapeMarkdownV2 } from "../utils/utils";

export const atribuirEventoCommand = {
  register: (bot: Telegraf) => {
    bot.command("atribuir_evento", async (ctx: Context) => {
      const args = ctx.message && 'text' in ctx.message ? ctx.message.text.split(" ").slice(1) : [];
      
      if (!args || args.length === 0) {
        await ctx.reply("❌ Por favor, forneça o ID do evento.\n\nUso: `/atribuir_evento <ID_DO_EVENTO>`", {
          parse_mode: "Markdown"
        });
        return;
      }

      const eventId = args[0];
      
      try {
        // Buscar o evento pelo ID
        const event = await getEventById(eventId);
        
        if (!event) {
          await ctx.reply("❌ Evento não encontrado com o ID fornecido.");
          return;
        }

        // Verificar se já está atribuído
        const currentWorkgroup = event.extendedProperties?.private?.workgroup;
        if (currentWorkgroup) {
          const group = workgroups.find((g: any) => g.value.toString() === currentWorkgroup);
          const groupName = group ? group.label : "Grupo desconhecido";
          await ctx.reply(`⚠️ Este evento já está atribuído ao grupo: **${groupName}**`, {
            parse_mode: "Markdown"
          });
          return;
        }

        // Criar teclado com grupos de trabalho
        const buttons = workgroups.map((group: any) =>
          Markup.button.callback(
            `📋 ${group.label}`,
            `assign_to_${group.value}_${eventId}`
          )
        );
        
        const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

        const eventTitle = event.summary || "Evento sem título";
        const message = `🎯 **Atribuindo evento a um grupo de trabalho**\n\n📝 **Evento:** ${escapeMarkdownV2(eventTitle)}\n\n👥 Selecione o grupo de trabalho:`;

        await ctx.reply(message, {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard.reply_markup
        });

      } catch (error) {
        console.error("Erro ao buscar evento:", error);
        await ctx.reply("❌ Erro ao buscar o evento. Verifique se o ID está correto.");
      }
    });

    // Handler para os callbacks de atribuição
    bot.action(/^assign_to_(\d+)_(.+)$/, async (ctx) => {
      const match = ctx.match;
      const groupId = match[1];
      const eventId = match[2];
      
      try {
        const group = workgroups.find((g: any) => g.value.toString() === groupId);
        if (!group) {
          await ctx.answerCbQuery("❌ Grupo não encontrado");
          return;
        }

        // Atualizar o evento com o grupo
        await updateEventWorkgroup(eventId, groupId);
        
        // Buscar o evento atualizado
        const event = await getEventById(eventId);
        
        if (event) {
          // Editar a mensagem original
          const eventTitle = event.summary || "Evento sem título";
          const successMessage = `✅ **Evento atribuído com sucesso\\!**\n\n📝 **Evento:** ${escapeMarkdownV2(eventTitle)}\n👥 **Grupo:** ${escapeMarkdownV2(group.label)}`;
          
          await ctx.editMessageText(successMessage, {
            parse_mode: "MarkdownV2"
          });

          // Enviar o evento para o grupo atribuído
          const eventMessage = buildDailyAgendaMessage([event]);
          await ctx.telegram.sendMessage(group.value, eventMessage, {
            parse_mode: "MarkdownV2",
            link_preview_options: { is_disabled: true }
          });
        }

        await ctx.answerCbQuery(`✅ Evento atribuído ao ${group.label}`);

      } catch (error) {
        console.error("Erro ao atribuir evento:", error);
        await ctx.answerCbQuery("❌ Erro ao atribuir evento");
      }
    });
  },

  name: () => "atribuir_evento",
  description: () => "Atribui um evento a um grupo de trabalho",
  help: () => `
🎯 *Atribuir Evento*

Atribui um evento específico a um grupo de trabalho.

*Uso:*
\`/atribuir_evento <ID_DO_EVENTO>\`

*Exemplo:*
\`/atribuir_evento abc123def456\`

O ID do evento pode ser encontrado nas mensagens de agenda enviadas pela Secretaria.
  `
};
