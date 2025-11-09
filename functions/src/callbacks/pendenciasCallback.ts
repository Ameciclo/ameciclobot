import { Telegraf } from "telegraf";
import { processProjectsByStatus, listProjectsInProgress, processProjectById } from "../archived_commands/ajudante_financeiro/atualizar_pendencias";

export function registerPendenciasCallbacks(bot: Telegraf) {
  // Callback para processar a seleção de status
  bot.action(/^pendencias_status_(.+)$/, async (ctx) => {
    const status = ctx.match[1];
    
    if (status === "Todos") {
      // Para "Todos", processa todos os status possíveis
      await ctx.editMessageText("🔄 Processando todos os projetos...");
      const allStatuses = ["Em andamento", "Finalizado", "Não iniciado", "Finalizado com sobras"];
      
      for (const projectStatus of allStatuses) {
        await processProjectsByStatus(ctx, projectStatus);
      }
    } else {
      await ctx.editMessageText(`🔄 Processando projetos com status: ${status}...`);
      await processProjectsByStatus(ctx, status);
    }
  });

  bot.action("pendencias_list_projects", async (ctx) => {
    await ctx.editMessageText("🔄 Carregando projetos em andamento...");
    await listProjectsInProgress(ctx);
  });

  // Callback para processar projeto específico selecionado da lista
  bot.action(/^pendencias_proj_(.+)$/, async (ctx) => {
    const projectId = ctx.match[1];
    
    try {
      await ctx.editMessageText(`🔄 Verificando pendências do projeto...`);
      await processProjectById(ctx, projectId);
    } catch (error) {
      console.error("Erro ao processar projeto selecionado:", error);
      await ctx.editMessageText("❌ Erro ao processar projeto.");
    }
  });

  bot.action("pendencias_cancel", async (ctx) => {
    await ctx.editMessageText("❌ Operação cancelada.");
  });
}