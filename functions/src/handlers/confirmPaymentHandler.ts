import { Context, Telegraf, Markup } from "telegraf";
import {
  getRequestData,
  updatePaymentRequest,
  getCoordinators,
} from "../services/firebase";
import { updateSpreadsheet } from "../services/google";
import {
  AmecicloUser,
  PaymentRequest,
  TelegramUserInfo,
} from "../config/types";

export function registerConfirmPaymentHandler(bot: Telegraf) {
  // Capturamos 2 grupos: 1) user/coord ID e 2) requestId
  bot.action(/^confirm_(\d+)_(.+)$/, async (ctx: Context) => {
    console.log("CONFIRMAR PAGAMENTO!");
    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !("data" in callbackQuery)) {
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data as string; // ex: "confirm_12345_abcXYZ"
      console.log("callbackData:", callbackData);

      // Extraímos user/coord ID e requestId
      const match = callbackData.match(/^confirm_(\d+)_(.+)$/);
      if (!match) {
        await ctx.answerCbQuery("Callback data inválida.", {
          show_alert: true,
        });
        return;
      }

      const coordIdFromButton = parseInt(match[1]); // "12345" (exemplo)
      const requestId = match[2]; // "abcXYZ" (pode ser string grande)

      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.answerCbQuery("Usuário não identificado.", {
          show_alert: true,
        });
        return;
      }

      console.log("coordIdFromButton:", coordIdFromButton);
      console.log("userId:", userId);
      console.log("requestId extraído:", requestId);

      // Verifica se o user que clicou é o mesmo userId do coord
      if (userId !== coordIdFromButton) {
        await ctx.answerCbQuery(
          "Você não está autorizado a confirmar este pagamento.",
          { show_alert: true }
        );
        return;
      }

      // Agora não precisamos mais pegar ID do texto da mensagem
      const requestData = (await getRequestData(requestId)) as PaymentRequest;
      console.log("requestData:", requestData);

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
      const userAlreadySignedSlot =
        signatures[1]?.id === userId ? 1 : undefined;

      if (userAlreadySignedSlot) {
        // Togle: remove se já estava
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

        // Preenche a próxima assinatura
        const newSlot = signatureCount === 0 ? 1 : 2;
        signatures[newSlot] = ctx.from as TelegramUserInfo;

        if (newSlot === 2) {
          // Se for a 2ª, atualizar planilha
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

            const viewSpreadsheetButton = Markup.button.url(
              "📊 Ver planilha",
              `https://docs.google.com/spreadsheets/d/${requestToSheet.spreadsheetId}`
            );

            const signedByText = Object.values(signatures)
              .map((sig: any) => `✅ ${sig.first_name}`)
              .join("\n");

            // Edite a mensagem: note que agora não precisamos do "messageText"
            // Podemos exibir qualquer texto. Exemplo:
            const newText = `ID da Solicitação: ${requestId}\n\nAssinado por:\n${signedByText}`;

            const newMarkup = Markup.inlineKeyboard([[viewSpreadsheetButton]]);
            await ctx.editMessageText(newText, {
              reply_markup: newMarkup.reply_markup,
            });

            return;
          } catch (error) {
            console.error("Erro ao atualizar planilha:", error);
            await ctx.answerCbQuery(
              "Falha ao registrar pagamento na planilha.",
              {
                show_alert: true,
              }
            );
            return;
          }
        } else {
          // Se for a 1ª assinatura
          await updatePaymentRequest(requestId, { signatures });
          await ctx.answerCbQuery("Sua assinatura foi adicionada.");
        }
      }

      const coordinators = await getCoordinators();

      const coordinatorButtons = coordinators.map((coord: AmecicloUser) => {
        const signed = Object.values(signatures).some(
          (sig: any) => sig?.id === coord.telegram_user.id
        );
        const displayName = signed
          ? `✅ ${coord.telegram_user.first_name}`
          : coord.telegram_user.first_name;

        return signed
          ? Markup.button.callback(displayName, "noop")
          : Markup.button.callback(
              displayName,
              // Repare que passamos de novo o requestId no callback:
              `confirm_${coord.telegram_user.id}_${requestId}`
            );
      });

      const viewSpreadsheetButton = Markup.button.url(
        "📊 Ver planilha",
        `https://docs.google.com/spreadsheets/d/${
          requestData.project?.spreadsheet_id || ""
        }`
      );

      const cancelButton = Markup.button.callback(
        "❌ CANCELAR",
        "cancel_payment"
      );

      const newMarkup = Markup.inlineKeyboard([
        coordinatorButtons,
        [viewSpreadsheetButton],
        [cancelButton],
      ]);

      const signedByText = Object.values(signatures)
        .map((sig: any) => `✅ ${sig.first_name}`)
        .join("\n");

      // Mensagem final. Você pode ser livre para colocar o que quiser agora.
      const newText = `${ctx.text}\n\nAssinado por:\n${signedByText}`;

      await ctx.editMessageText(newText, {
        reply_markup: newMarkup.reply_markup,
      });
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      await ctx.reply(
        "Ocorreu um erro ao confirmar a solicitação de pagamento."
      );
    }
  });
}
