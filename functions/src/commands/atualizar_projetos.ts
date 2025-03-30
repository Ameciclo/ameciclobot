// commands/atualizarProjetosCommand.ts
import { Context, Telegraf } from "telegraf";
import {
  getIdFromUrl,
  getProjectBudgetItems,
  getSummaryData,
} from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import { sendProjectsToDB } from "../services/firebase";

export function getName() {
  return "/atualizar_projetos";
}

export function getHelp() {
  return "Atualiza os projetos a partir da planilha principal e envia os dados atualizados para o Firebase.";
}

export function getDescription() {
  return "Atualiza os projetos no Firebase usando os dados da planilha RESUMO e demais planilhas vinculadas.";
}

export function register(bot: Telegraf) {
  bot.command("atualizar_projetos", async (ctx: Context) => {
    try {
      const summaryData = await getSummaryData(projectsSpreadsheet.id);
      const headers = projectsSpreadsheet.headers;
      const projectsJson: { [key: string]: any } = {};
      for (const row of summaryData) {
        const id = getIdFromUrl(row[headers.id.col]);
        // Exemplo: somente projetos com status "Em andamento" serão enviados
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
            budget_items,
            spreadsheet_id: id,
          };
        }
      }
      sendProjectsToDB(projectsJson);
    } catch (error) {
      console.error("Erro ao enviar projetos para o DB:", error);
      throw error;
    }
  });
}

export const atualizarProjetosCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
