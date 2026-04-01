import { Context, Telegraf } from "telegraf";
import { clearFolderCache } from "../services/folderService";
import workgroups from "../credentials/workgroupsfolders.json";

function registerLimparCachePastasCommand(bot: Telegraf): void {
  bot.command("limpar_cache_pastas", async (ctx: Context): Promise<void> => {
    console.log("[limpar_cache_pastas] Comando executado");
    
    // Verifica se é um usuário autorizado (pode adicionar verificação de admin aqui)
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply("❌ Erro: não foi possível identificar o usuário.");
      return;
    }

    try {
      await ctx.reply("🔄 Limpando cache de pastas de todos os grupos...");
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const group of workgroups) {
        try {
          console.log(`[limpar_cache_pastas] Limpando cache para ${group.label}`);
          await clearFolderCache(group.value);
          successCount++;
        } catch (error) {
          console.error(`[limpar_cache_pastas] Erro em ${group.label}:`, error);
          errorCount++;
        }
      }
      
      await ctx.reply(
        `✅ Cache limpo!\n\n` +
        `📊 Grupos processados: ${successCount}\n` +
        `❌ Erros: ${errorCount}\n\n` +
        `💡 Use "Atualizar" nos menus de pastas para recarregar.`
      );
      
    } catch (error) {
      console.error("[limpar_cache_pastas] Erro geral:", error);
      await ctx.reply("❌ Erro ao limpar cache. Verifique os logs.");
    }
  });
}

// COMANDO OCULTO - não exporta description/help
export const limparCachePastasCommand = {
  register: registerLimparCachePastasCommand,
  name: () => "/limpar_cache_pastas",
  description: () => "Limpa cache de pastas (admin)",
  help: () => "Comando administrativo para limpar o cache de pastas de todos os grupos de trabalho."
};