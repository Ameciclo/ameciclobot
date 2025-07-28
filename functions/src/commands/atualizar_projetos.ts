// src/commands/atualizarProjetosCommand.ts
import { Context, Telegraf } from "telegraf";
import {
  getIdFromUrl,
  getProjectBudgetItems,
  getSummaryData,
} from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import workgroups from "../credentials/workgroupsfolders.json";
import { sendProjectsToDB } from "../services/firebase";

function registerAtualizarProjetosCommand(bot: Telegraf) {
  bot.command("atualizar_projetos", async (ctx: Context) => {
    try {
      console.log("[atualizar_projetos] Iniciando comando...");
      const currentChatId = ctx.chat?.id?.toString();

      const financeiroGroup = workgroups.find(
        (group: any) => group.label === projectsSpreadsheet.workgroup
      );

      if (!financeiroGroup) {
        console.log("[atualizar_projetos] Grupo Financeiro não configurado.");
        return ctx.reply("Workgroup Financeiro não configurado.");
      }

      if (currentChatId !== financeiroGroup.value) {
        console.log(
          "[atualizar_projetos] Comando executado fora do grupo Financeiro."
        );
        return ctx.reply(
          "Este comando só pode ser executado no grupo Financeiro."
        );
      }

      console.log("[atualizar_projetos] Grupo Financeiro confirmado.");
      const summaryData = await getSummaryData(projectsSpreadsheet.id);
      console.log("[atualizar_projetos] Dados do resumo obtidos.");
      const headers = projectsSpreadsheet.headers;
      const projectsJson: { [key: string]: any } = {};

      for (const row of summaryData) {
        const id = getIdFromUrl(row[headers.id.col]);
        // Apenas projetos com status igual ao configurado serão enviados
        if (
          id &&
          row[headers.status.col] === projectsSpreadsheet.projectFilterStatus
        ) {
          const budget_items = await getProjectBudgetItems(id);
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
            `[atualizar_projetos] Projeto ${row[headers.name.col]} processado.`
          );
        }
      }

      await sendProjectsToDB(projectsJson);
      console.log(
        "[atualizar_projetos] Projetos enviados para o DB com sucesso."
      );
      return ctx.reply("Tudo certo! Projetos atualizados com sucesso.");
    } catch (error) {
      console.error(
        "[atualizar_projetos] Erro ao enviar projetos para o DB:",
        error
      );
      return ctx.reply("Erro ao atualizar projetos.");
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
