// cancelPayment.ts
import { Context, Telegraf } from "telegraf";
import { getRequestData, updatePaymentRequest, deleteGroupMessage } from "../services/firebase";
import { excerptFromRequest } from "../utils/utils";
import { PaymentRequest } from "../config/types";

export function registerCancelPaymentCallback(bot: Telegraf) {
  // O callback data agora é no formato "cancel_payment_{requestId}"
  bot.action(/^cancel_payment_(.+)$/, async (ctx: Context) => {
    console.log("CANCELAR PAGAMENTO!");
    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !("data" in callbackQuery)) {
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data as string;
      const requestId = callbackData.replace("cancel_payment_", "");

      const requestData: PaymentRequest | null = await getRequestData(
        requestId
      );
      if (!requestData) {
        await ctx.reply("Não foi possível identificar a solicitação.");
        return;
      }

      // Atualiza a solicitação para cancelada, se necessário (opcional)
      await updatePaymentRequest(requestId, { status: "cancelled" });

      // Apaga a mensagem do grupo de trabalho se existir
      await deleteGroupMessage(ctx, requestData);

      // Reconstrói o trecho original e acrescenta a nota de cancelamento
      const messageText = excerptFromRequest(
        requestData,
        "❌❌❌ Solicitação CANCELADA. ❌❌❌"
      );

      await ctx.editMessageText(messageText);
      console.log(`Pagamento ${requestId} cancelado com sucesso.`);
    } catch (err) {
      console.error("Erro ao processar cancelamento de pagamento:", err);
      await ctx.reply(
        "Ocorreu um erro ao cancelar a solicitação de pagamento."
      );
    }
  });
}
