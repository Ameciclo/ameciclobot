import { Context, Telegraf } from "telegraf";

function registerStopAllCommand(bot: Telegraf): void {
  bot.command("stop_all", async (ctx: Context): Promise<void> => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    
    if (!userId || !chatId) {
      await ctx.reply("❌ Erro: não foi possível identificar usuário/chat.");
      return;
    }

    try {
      // Limpa cache de execuções do criar_pasta
      const { executionCache } = await import("./criar_pasta");
      if (executionCache) {
        const clearedCount = executionCache.size;
        executionCache.clear();
        
        await ctx.reply(
          `🛑 **Execuções interrompidas!**\n\n` +
          `✅ ${clearedCount} operações canceladas\n` +
          `🔄 Cache limpo\n\n` +
          `Você pode tentar executar os comandos novamente.`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply("✅ Nenhuma execução em andamento encontrada.");
      }
    } catch (error) {
      console.error("[stop_all] Erro:", error);
      await ctx.reply("❌ Erro ao interromper execuções.");
    }
  });
}

export const stopAllCommand = {
  register: registerStopAllCommand,
  name: () => "/stop_all",
  description: () => "Interrompe execuções em andamento",
  help: () => "Comando para cancelar operações em andamento e limpar cache de execuções."
};