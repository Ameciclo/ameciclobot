import { Telegraf, Context } from "telegraf";
import { Markup } from "telegraf";
import { getEventById } from "../services/google";
import workgroups from "../credentials/workgroupsfolders.json";
import { escapeMarkdownV2 } from "../utils/utils";

export const atribuirEventoCommand = {
  register: (bot: Telegraf) => {
    bot.command("atribuir_evento", async (ctx: Context) => {
      console.log("[atribuir_evento] Comando /atribuir_evento executado");
      console.log("[atribuir_evento] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
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
        console.log("[atribuirEvento] Buscando evento com ID:", eventId);
        const event = await getEventById(eventId);
        console.log("[atribuirEvento] Evento retornado:", event ? JSON.stringify(event, null, 2) : "null");
        
        if (!event) {
          await ctx.reply("❌ Evento não encontrado com o ID fornecido.");
          return;
        }

        // Verificar se o evento foi cancelado
        if (event.status === 'cancelled') {
          await ctx.reply("❌ Este evento foi cancelado e não pode ser atribuído.");
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
        const buttons = workgroups.map((group: any) => {
          const callbackData = `asg|${group.value}|${eventId}`;
          console.log("[atribuirEvento] Criando botão:", group.label, "callback:", callbackData);
          console.log("[atribuirEvento] Tamanho do callback:", callbackData.length);
          
          if (callbackData.length > 64) {
            console.warn("[atribuirEvento] ⚠️ Callback muito longo!", callbackData.length, "caracteres");
          }
          
          return Markup.button.callback(
            `📋 ${group.label}`,
            callbackData
          );
        });
        
        console.log("[atribuirEvento] Total de botões criados:", buttons.length);
        console.log("[atribuirEvento] Todos os callbacks:", buttons.map((b: any) => (b as any).callback_data));
        
        const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });

        const eventTitle = event.summary || "Evento sem título";
        console.log("[atribuirEvento] Título do evento:", eventTitle);
        console.log("[atribuirEvento] event.summary:", event.summary);
        const message = `🎯 **Atribuindo evento a um grupo de trabalho**\n\n📝 **Evento:** ${escapeMarkdownV2(eventTitle)}\n\n👥 Selecione o grupo de trabalho:`;

        await ctx.reply(message, {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard.reply_markup
        });
        
        console.log(`[atribuir_evento] Interface de atribuição exibida para evento: "${eventTitle}"`);

      } catch (error) {
        console.error("[atribuir_evento] Erro ao buscar evento:", error);
        await ctx.reply("❌ Erro ao buscar o evento. Verifique se o ID está correto.");
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