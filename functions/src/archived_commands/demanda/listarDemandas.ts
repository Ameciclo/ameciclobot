import { Context, Telegraf } from "telegraf";
import { admin } from "../../config/firebaseInit";
import { escapeMarkdownV2 } from "../../utils/utils";
import workgroups from "../../credentials/workgroupsfolders.json";



function registerListarDemandasCommand(bot: Telegraf) {
  bot.command("listar_demandas", async (ctx: Context): Promise<void> => {
    try {
      console.log("[listar_demandas] Comando /listar_demandas executado");
      console.log("[listar_demandas] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
      
      const chat = ctx.message?.chat;
      if (!chat) {
        await ctx.reply("Erro ao identificar o chat.");
        return;
      }

      // Identifica o workgroup atual
      const currentWorkgroup = workgroups.find(wg => wg.value === chat.id.toString());
      if (!currentWorkgroup) {
        await ctx.reply("Este comando só pode ser usado nos grupos de trabalho da Ameciclo.");
        return;
      }

      // Busca demandas do Firebase
      const demandasSnapshot = await admin.database().ref('demandas').once('value');
      const allDemandas = demandasSnapshot.val() || {};

      // Filtra demandas do workgroup atual
      const workgroupDemandas = Object.entries(allDemandas).filter(([_, data]: [string, any]) => 
        data.workgroup?.toLowerCase() === currentWorkgroup.label.toLowerCase() && 
        data.status === "pendente"
      );

      if (workgroupDemandas.length === 0) {
        const message = `🎉 *Parabéns\\!*\n\nNão há demandas pendentes para o grupo *${escapeMarkdownV2(currentWorkgroup.label)}*\\.`;
        
        await ctx.reply(message, {
          parse_mode: "MarkdownV2"
        });
        return;
      }

      // Monta mensagem com demandas
      let message = `📋 *DEMANDAS PENDENTES \\- ${escapeMarkdownV2(currentWorkgroup.label.toUpperCase())}*\n\n`;
      
      workgroupDemandas.forEach(([id, data]: [string, any], index) => {
        const demandadosText = data.demandados?.length > 0 
          ? data.demandados.join(", ")
          : "Não especificado";
        
        message += `*${index + 1}\\. ID: ${escapeMarkdownV2(id)}*\n`;
        message += `👤 *Solicitante:* ${escapeMarkdownV2(data.solicitante)}\n`;
        message += `👥 *Demandados:* ${escapeMarkdownV2(demandadosText)}\n`;
        message += `📅 *Prazo:* ${escapeMarkdownV2(data.dataLimite)}\n`;
        message += `📝 *Demanda:* ${escapeMarkdownV2(data.demanda)}\n\n`;
      });

      // Cria teclado com botões para resolver
      const buttons = workgroupDemandas.map(([id, _]) => ({
        text: `✅ ${id}`,
        callback_data: `resolve_demanda_${id}`
      }));

      // Organiza em linhas de até 3 botões
      const keyboard = [];
      for (let i = 0; i < buttons.length; i += 3) {
        keyboard.push(buttons.slice(i, i + 3));
      }

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: keyboard
        }
      });

      console.log(`[listar_demandas] Listadas ${workgroupDemandas.length} demandas para ${currentWorkgroup.label}`);

    } catch (error) {
      console.error("[listar_demandas] Erro:", error);
      await ctx.reply("Erro ao listar demandas. Tente novamente mais tarde.");
    }
  });
}

export const listarDemandasCommand = {
  register: registerListarDemandasCommand,
  name: () => "/listar_demandas",
  help: () =>
    "📋 *Listar Demandas*\n\n" +
    "Lista todas as demandas pendentes do workgroup atual\\.\n\n" +
    "*Como usar:*\n" +
    "`/listar_demandas`\n\n" +
    "💡 *Funcionalidades:*\n" +
    "• Mostra apenas demandas do seu workgroup\n" +
    "• Permite resolver demandas diretamente\n" +
    "• Atualiza automaticamente quando resolvidas",
  description: () => "📋 Listar demandas pendentes do workgroup.",
};