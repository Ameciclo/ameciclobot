// src/commands/atualizarProjetosCommand.ts
import { Context, Telegraf } from "telegraf";
import {
  getIdFromUrl,
  getProjectBudgetItems,
  getSummaryData,
} from "../../services/google";
import projectsSpreadsheet from "../../credentials/projectsSpreadsheet.json";
import workgroups from "../../credentials/workgroupsfolders.json";
import { sendProjectsToDB } from "../../services/firebase";

function registerAtualizarProjetosCommand(bot: Telegraf) {
  bot.command("atualizar_projetos", async (ctx: Context) => {
    try {
      console.log("[atualizar_projetos] Iniciando comando...");
      const currentChatId = ctx.chat?.id?.toString();
      console.log(`[atualizar_projetos] Chat ID atual: ${currentChatId}`);
      console.log(`[atualizar_projetos] Procurando workgroup: ${projectsSpreadsheet.workgroup}`);

      const financeiroGroup = workgroups.find(
        (group: any) => group.label === projectsSpreadsheet.workgroup
      );
      console.log(`[atualizar_projetos] Workgroups disponíveis:`, workgroups.map(g => g.label));

      if (!financeiroGroup) {
        console.log("[atualizar_projetos] Grupo Financeiro não configurado.");
        console.log(`[atualizar_projetos] Workgroup procurado: ${projectsSpreadsheet.workgroup}`);
        return ctx.reply("Workgroup Financeiro não configurado.");
      }

      console.log(`[atualizar_projetos] Grupo encontrado - ID: ${financeiroGroup.value}`);
      if (currentChatId !== financeiroGroup.value) {
        console.log(
          `[atualizar_projetos] Comando executado fora do grupo Financeiro. Atual: ${currentChatId}, Esperado: ${financeiroGroup.value}`
        );
        return ctx.reply(
          "Este comando só pode ser executado no grupo Financeiro."
        );
      }

      console.log("[atualizar_projetos] Grupo Financeiro confirmado.");
      console.log(`[atualizar_projetos] Buscando dados da planilha ID: ${projectsSpreadsheet.id}`);
      const summaryData = await getSummaryData(projectsSpreadsheet.id);
      console.log(`[atualizar_projetos] Dados do resumo obtidos. Total de linhas: ${summaryData.length}`);
      console.log(`[atualizar_projetos] Headers configurados:`, projectsSpreadsheet.headers);
      console.log(`[atualizar_projetos] Status de filtro: ${projectsSpreadsheet.projectFilterStatus}`);
      const headers = projectsSpreadsheet.headers;
      const projectsJson: { [key: string]: any } = {};

      for (let i = 0; i < summaryData.length; i++) {
        const row = summaryData[i];
        console.log(`[atualizar_projetos] Processando linha ${i + 1}:`, row);
        
        const id = getIdFromUrl(row[headers.id.col]);
        const status = row[headers.status.col];
        const name = row[headers.name.col];
        
        console.log(`[atualizar_projetos] Linha ${i + 1} - ID: ${id}, Status: ${status}, Nome: ${name}`);
        
        // Apenas projetos com status igual ao configurado serão enviados
        if (
          id &&
          status === projectsSpreadsheet.projectFilterStatus
        ) {
          console.log(`[atualizar_projetos] Projeto ${name} atende aos critérios. Buscando itens do orçamento...`);
          const budget_items = await getProjectBudgetItems(id);
          console.log(`[atualizar_projetos] Itens do orçamento obtidos para ${name}:`, budget_items?.length || 0, "itens");
          
          projectsJson[id] = {
            name: row[headers.name.col],
            responsible: row[headers.manager.col],
            account: row[headers.account.col],
            balance: row[headers.balance.col],
            folder_id: getIdFromUrl(row[headers.folder.col]),
            budget_items,
            spreadsheet_id: id,
          };
          console.log(
            `[atualizar_projetos] Projeto ${name} processado com sucesso.`
          );
        } else {
          console.log(`[atualizar_projetos] Projeto ${name} ignorado - ID: ${id}, Status: ${status}`);
        }
      }

      console.log(`[atualizar_projetos] Total de projetos processados: ${Object.keys(projectsJson).length}`);
      console.log(`[atualizar_projetos] Projetos a serem enviados:`, Object.keys(projectsJson));
      
      await sendProjectsToDB(projectsJson);
      console.log(
        "[atualizar_projetos] Projetos enviados para o DB com sucesso."
      );
      return ctx.reply(`Tudo certo! ${Object.keys(projectsJson).length} projetos atualizados com sucesso.`);
    } catch (error) {
      console.error(
        "[atualizar_projetos] Erro ao executar comando:",
        error
      );
      console.error("[atualizar_projetos] Stack trace:", error instanceof Error ? error.stack : 'N/A');
      return ctx.reply(`Erro ao atualizar projetos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  });
}

export const atualizarProjetosCommand = {
  register: registerAtualizarProjetosCommand,
  name: () => "/atualizar_projetos",
  help: () =>
    "Atualiza os projetos a partir da planilha principal e envia os dados atualizados para o Firebase.",
  description: () =>
    "Atualiza os projetos no Firebase usando os dados da planilha RESUMO e demais planilhas vinculadas.",
};
