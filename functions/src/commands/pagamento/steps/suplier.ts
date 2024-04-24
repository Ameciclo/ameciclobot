import { Scenes, Markup } from "telegraf";
import { fetchProjects } from "../database";

export const suplier = async (ctx: Scenes.WizardContext) => {
  if (!ctx.callbackQuery) {
    try {
      const projectsData = await fetchProjects();

      // Convertendo o objeto de projetos em um array
      const projects = Object.values(projectsData);

      if (projects.length === 0) {
        await ctx.reply("Nenhum projeto encontrado.");
        return ctx.wizard.next();
      }

      const buttons = projects.map((project: any) => Markup.button.callback(project.name, `selectProject#${project.spreadsheet_id}`));
      await ctx.reply("🗂 Escolha um Fornecedor:", Markup.inlineKeyboard(buttons, { columns: 1 }));

    } catch (err) {
      console.error(err);
      await ctx.reply("Erro ao carregar projetos.");
    }
  }
  return ctx.wizard.next();
};
