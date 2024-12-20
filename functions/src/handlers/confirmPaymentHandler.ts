import { Context, Telegraf, Markup } from "telegraf";
import {
  getRequestData,
  updatePaymentRequest,
  getSubscribers,
} from "../services/firebase";
import { updateSpreadsheet } from "../services/google";

export function registerConfirmPaymentHandler(bot: Telegraf) {
  // Handler para confirmar pagamento
  bot.action(/^confirm_(\d+)$/, async (ctx: Context) => {
    console.log("CONFIRMAR PAGAMENTO!");
    try {
      const callbackQuery = ctx.callbackQuery;
      if (
        !callbackQuery ||
        !("data" in callbackQuery) ||
        typeof callbackQuery.data !== "string"
      ) {
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data;
      const coordIdFromButton = callbackData.split("_")[1];
      const userId = ctx.from?.id?.toString();

      if (userId !== coordIdFromButton) {
        await ctx.answerCbQuery(
          "Você não está autorizado a confirmar este pagamento.",
          { show_alert: true }
        );
        return;
      }

      const message = callbackQuery.message;
      if (!message || !("text" in message)) {
        console.error("Mensagem inválida ou sem texto.");
        return;
      }

      const messageText = message.text;
      const idMatch = messageText.match(/ID\s+da\s+Solicitação:\s+([^\s]+)/);
      if (!idMatch || idMatch.length < 2) {
        await ctx.answerCbQuery("ID do pagamento não encontrado.", {
          show_alert: true,
        });
        return;
      }

      const requestId = idMatch[1].trim();
      console.log(`Request ID: ${requestId}`);

      const requestData = await getRequestData(requestId);
      if (!requestData) {
        await ctx.answerCbQuery(
          "Solicitação não encontrada no banco de dados.",
          {
            show_alert: true,
          }
        );
        return;
      }

      if (requestData.status === "cancelled") {
        await ctx.answerCbQuery("Esta solicitação já foi cancelada.", {
          show_alert: true,
        });
        return;
      }

      const signatures = requestData.signatures || {};
      const userAlreadySignedSlot = Object.keys(signatures).find(
        (slot) => signatures[slot]?.id === userId
      );

      if (userAlreadySignedSlot) {
        // Remove a assinatura e atualiza apenas as signatures
        delete signatures[userAlreadySignedSlot];
        await updatePaymentRequest(requestId, { signatures });
        await ctx.answerCbQuery("Sua assinatura foi removida.");
      } else {
        const signatureCount = Object.keys(signatures).length;
        if (signatureCount >= 2) {
          await ctx.answerCbQuery(
            "Este pagamento já possui duas assinaturas.",
            {
              show_alert: true,
            }
          );
          return;
        }

        const newSlot = signatureCount === 0 ? 1 : 2;
        signatures[newSlot] = ctx.from;

        if (newSlot === 2) {
          const requestToSheet = {
            budgetItem: requestData.budgetItem,
            recipientInformation: {
              name: requestData.supplier?.name || "NOME_DESCONHECIDO",
            },
            description: requestData.description,
            value: requestData.value,
            id: requestId,
            spreadsheetId: requestData.project.spreadsheet_id,
          };

          try {
            await updateSpreadsheet(
              requestToSheet.spreadsheetId,
              requestToSheet
            );
            await updatePaymentRequest(requestId, {
              status: "confirmed",
              signatures,
            });
            await ctx.answerCbQuery("Pagamento confirmado com sucesso.");

            // Atualizar os botões após confirmação
            const viewSpreadsheetButton = Markup.button.url(
              "📊 Ver planilha",
              `https://docs.google.com/spreadsheets/d/${requestToSheet.spreadsheetId}`
            );

            const newMarkup = Markup.inlineKeyboard([[viewSpreadsheetButton]]);

            await ctx.editMessageReplyMarkup(newMarkup.reply_markup);
            return;
          } catch (err) {
            console.error("Erro ao atualizar planilha:", err);
            await ctx.answerCbQuery(
              "Falha ao registrar pagamento na planilha.",
              {
                show_alert: true,
              }
            );
            return;
          }
        } else {
          await updatePaymentRequest(requestId, { signatures });
          await ctx.answerCbQuery("Sua assinatura foi adicionada.");
        }
      }

      const subscribers = await getSubscribers();
      const coordinatorEntries = Object.values(subscribers).filter(
        (entry: any) => entry.role === "AMECICLO_COORDINATORS"
      );

      const coordinatorButtons = coordinatorEntries.map((coord: any) => {
        const signed = Object.values(signatures).some(
          (sig: any) => sig?.id === coord.telegram_user.id
        );
        const displayName = signed
          ? `✅ ${coord.telegram_user.first_name}`
          : coord.telegram_user.first_name;
        return signed
          ? Markup.button.callback(displayName, "noop") // Botão sem ação após assinatura
          : Markup.button.callback(
              displayName,
              `confirm_${coord.telegram_user.id}`
            );
      });

      const cancelButton = Markup.button.callback(
        "❌ CANCELAR",
        "cancel_payment"
      );

      const newMarkup = Markup.inlineKeyboard([
        [...coordinatorButtons],
        [cancelButton],
      ]);

      await ctx.editMessageReplyMarkup(newMarkup.reply_markup);
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      await ctx.reply(
        "Ocorreu um erro ao confirmar a solicitação de pagamento."
      );
    }
  });
}
