import { Markup } from "telegraf";
import { fetchProjects, fetchProjectById } from "../database";
import { MyContext } from "../../../types";
import { updatePaymentSummary } from "../aux";

export const displayProjects = async (ctx: MyContext) => {
  console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - displayProjects`);
  console.log(`${ctx.myProps}`)
  try {
    const projectsData = await fetchProjects();
    const projects = Object.values(projectsData);

    if (projects.length === 0) {
      await ctx.reply("Não encontramos nenhum projeto financiado.");
      return ctx.scene.leave();
    }

    const buttons = projects.map((project: any) =>
      Markup.button.callback(
        project.name,
        `selectProject#${project.spreadsheet_id}`
      )
    );
    await ctx.reply(
      "🗂 Escolha um projeto:",
      Markup.inlineKeyboard(buttons, { columns: 1 })
    );
    return ctx.wizard.next();
  } catch (err) {
    console.error(err);
    await ctx.reply("Erro ao carregar projetos.");
    return ctx.scene.leave();
  }
};

export const handleProjectSelection = async (ctx: MyContext) => {
  console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - handleProjectSelection`);
  try {
    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      const selection = ctx.callbackQuery.data.split("#")[1];
      const projectData = await fetchProjectById(selection);
      await ctx.reply(`Projeto selecionado: ID ${projectData.name}`);
      ctx.session!.pagamento!.project = projectData;
      updatePaymentSummary(ctx);
      console.log(ctx.session!.pagamento);
      return ctx.wizard.next();
    } else {
      console.log("No callbackQuery found, something is wrong.");
      await ctx.reply("Nenhuma seleção detectada, tente novamente.");
      return ctx.scene.leave();
    }
  } catch (err) {
    console.error(err);
    await ctx.reply("Erro ao encontrar projeto.");
    return ctx.scene.leave();
  }
};

export const project = [displayProjects, handleProjectSelection];
