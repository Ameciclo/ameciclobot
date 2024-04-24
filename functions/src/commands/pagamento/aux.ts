import { MyContext } from "../../types";

export function displaySummary(ctx: MyContext) {
  let message = "Dados do Pagamento:\n";
  if (ctx.session!.pagamento?.project) {
    message += `Projeto: ${ctx.session!.pagamento.project.name}\n`;
  }
  if (ctx.session!.pagamento?.budgetItem) {
    message += `Rubrica: ${ctx.session!.pagamento.budgetItem}\n`;
  }
  return message;
}

export async function updatePaymentSummary(ctx: MyContext) {
  const summary = displaySummary(ctx);
  if (ctx.session!.summaryMessageId) {
    await ctx.telegram.editMessageText(
      ctx.chat!.id,
      ctx.session!.summaryMessageId,
      undefined,
      summary
    );
  } else {
    const sentMessage = await ctx.reply(summary);
    ctx.session!.summaryMessageId = sentMessage.message_id;
  }
}
