//import * as admin from "firebase-admin";
import { Context, Telegraf } from "telegraf";

export function registerCancelPaymentHandler(bot: Telegraf) {
  bot.action("cancel_payment", async (ctx: Context) => {
    console.log("CANCELAR PAGAMENTO!");
    try {
      const chatMessageId = ctx.callbackQuery?.message?.message_id

      if (!chatMessageId) {
        await ctx.reply("Não foi possível identificar a solicitação.");
        return;
      }

      await ctx.editMessageText("❌ Solicitação de pagamento cancelada.");

      console.log(`Pagamento ${chatMessageId} cancelado com sucesso.`);
    } catch (err) {
      console.error("Erro ao processar cancelamento de pagamento:", err);
      await ctx.reply("Ocorreu um erro ao cancelar a solicitação de pagamento.");
    }
  });
}
