import * as admin from "firebase-admin";
import { Context, Telegraf } from "telegraf";

export function registerCancelPaymentHandler(bot: Telegraf) {
  bot.action("cancel_payment", async (ctx: Context) => {
    try {
      const requestId = ctx.callbackQuery?.message?.message_id

      if (!requestId) {
        await ctx.reply("Não foi possível identificar a solicitação.");
        return;
      }

      // Atualiza o status no Firebase para "cancelled"
      await admin.database().ref(`requests/${requestId}`).update({
        status: "cancelled",
      });

      // Edita a mensagem original para indicar que foi cancelada
      await ctx.editMessageText("❌ Solicitação de pagamento cancelada.");

      console.log(`Pagamento ${requestId} cancelado com sucesso.`);
    } catch (err) {
      console.error("Erro ao processar cancelamento de pagamento:", err);
      await ctx.reply("Ocorreu um erro ao cancelar a solicitação de pagamento.");
    }
  });
}
