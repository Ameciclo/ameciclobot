import { Telegraf } from "telegraf";
import { processProjectsByStatus, listProjectsInProgress, processProjectFromCallback } from "../commands/atualizar_pendencias";
import { getSummaryData, getIdFromUrl } from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";

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
      // Busca o nome do projeto pelo ID
      const summaryData = await getSummaryData(projectsSpreadsheet.id);
      const headers = projectsSpreadsheet.headers;
      
      let projectName = "";
      for (let rowIndex = 1; rowIndex < summaryData.length; rowIndex++) {
        const row = summaryData[rowIndex];
        const linkPlanilha = row[headers.id.col];
        if (linkPlanilha && getIdFromUrl(linkPlanilha) === projectId) {
          projectName = row[headers.name.col];
          break;
        }
      }
      
      if (projectName) {
        await ctx.editMessageText(`🔄 Verificando pendências do projeto: ${projectName}...`);
        await processProjectFromCallback(ctx, projectName);
      } else {
        await ctx.editMessageText("❌ Projeto não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao processar projeto selecionado:", error);
      await ctx.editMessageText("❌ Erro ao processar projeto.");
    }
  });

  bot.action("pendencias_cancel", async (ctx) => {
    await ctx.editMessageText("❌ Operação cancelada.");
  });
}