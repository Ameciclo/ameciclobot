import { Markup } from "telegraf";
import { MyContext } from "../../../types";

export const displayBudgets = async (ctx: MyContext) => {
    console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - displayBudgets` )
    try {
    const project = ctx.session!.pagamento?.project
    const budget_items = project!.budget_items
    const buttons = budget_items!.map((item: any) =>
      Markup.button.callback(
        item,
        `selectBudget#${item}`
      )
    );
    await ctx.reply(
      "🗂 Escolha uma rubrica:",
      Markup.inlineKeyboard(buttons, { columns: 1 })
    );
    return ctx.wizard.next();
  } catch (err) {
    console.error(err);
    await ctx.reply("Erro ao carregar projetos.");
    return ctx.scene.leave();
  }
};

export const handleBudgetSelection = async (ctx: MyContext) => {
    console.log(`/PAGAMENTO: ${ctx.wizard.cursor} - handleBudgetSelection` )
  try {
    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      const selection = ctx.callbackQuery.data.split("#")[1];
      await ctx.reply(`Rubrica selecionada: ID ${selection}`);
      ctx.session!.pagamento!.project!.budget_items = [selection];
      console.log(ctx.session!.pagamento);
      return ctx.wizard.next();
    } else {
      console.log("No callbackQuery found, something is wrong.");
      await ctx.reply("Nenhuma seleção detectada, tente novamente.");
      return ctx.scene.leave();
    }
  } catch (err) {
    console.error(err);
    await ctx.reply("Erro ao encontrar rubrica.");
    return ctx.scene.leave();
  }
};

export const budget = [displayBudgets, handleBudgetSelection];
