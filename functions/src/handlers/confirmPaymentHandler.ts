import { Context, Telegraf, Markup } from "telegraf";
import {
  getRequestData,
  updatePaymentRequest,
  getSubscribers,
  getCoordinatorsId,
} from "../services/firebase";
import { updateSpreadsheet } from "../services/google";

export function registerConfirmPaymentHandler(bot: Telegraf) {
  bot.action(/^confirm_(\d+)$/, async (ctx: Context) => {
    console.log("CONFIRMAR PAGAMENTO!");
    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !("data" in callbackQuery)) {
      await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
      return;
    }

    if (!callbackQuery || typeof callbackQuery.data !== "string") {
      await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
      return;
    }

    const callbackData = callbackQuery.data;
    const coordIdFromButton = callbackData.split("_")[1]; // ID do coordenador no botão
    const userId = ctx.from?.id?.toString();

    if (userId !== coordIdFromButton) {
      await ctx.answerCbQuery(
        "Você não está autorizado a confirmar este pagamento.",
        { show_alert: true }
      );
      return;
    }

    // Extrair o `requestId` do texto da mensagem
    const message = ctx.callbackQuery?.message;

    if (!message || !("text" in message)) {
      console.error("Mensagem inválida ou sem texto.");
      return;
    }

    const messageText = message.text;

    if (!messageText) {
      await ctx.answerCbQuery("Não foi possível encontrar o ID do pagamento.", {
        show_alert: true,
      });
      return;
    }

    const idMatch = messageText.match(/ID\s+da\s+Solicitação:\s+([^\s]+)/);
    if (!idMatch || idMatch.length < 2) {
      await ctx.answerCbQuery("ID do pagamento não encontrado.", {
        show_alert: true,
      });
      return;
    }

    const requestId = idMatch[1].trim();

    console.log(requestId);

    // Buscar dados no Firebase diretamente pelo `requestId`
    const requestData = await getRequestData(requestId);
    const asdad = await getCoordinatorsId();
    console.log(asdad)

    if (!requestData) {
      await ctx.answerCbQuery("Solicitação não encontrada no banco de dados.", {
        show_alert: true,
      });
      return;
    }

    // Verifica status do pagamento
    if (requestData.status === "cancelled") {
      await ctx.answerCbQuery("Esta solicitação já foi cancelada.", {
        show_alert: true,
      });
      return;
    }

    if (requestData.confirmed) {
      await ctx.answerCbQuery("Esta solicitação já foi confirmada.", {
        show_alert: true,
      });
      return;
    }

    // Recuperar signatures
    const signatures = requestData.signatures || {};

    let userAlreadySignedSlot: number | null = null;
    for (const slot in signatures) {
      if (signatures[slot]?.id === userId) {
        userAlreadySignedSlot = parseInt(slot, 10);
        break;
      }
    }

    if (userAlreadySignedSlot !== null) {
      delete signatures[userAlreadySignedSlot];
    } else {
      const signatureCount = Object.keys(signatures).length;
      if (signatureCount >= 2) {
        await ctx.answerCbQuery("Este pagamento já possui duas assinaturas.", {
          show_alert: true,
        });
        return;
      }

      const newSlot = signatureCount === 0 ? 1 : 2;
      signatures[newSlot] = ctx.from;

      if (newSlot === 2) {
        const spreadsheetId = "YOUR_SPREADSHEET_ID";
        const requestToSheet = {
          budgetItem: requestData.budgetItem,
          recipientInformation: {
            name: requestData.supplier?.name || "NOME_DESCONHECIDO",
          },
          description: requestData.description,
          value: requestData.value,
          id: requestId,
        };

        try {
          await updateSpreadsheet(spreadsheetId, requestToSheet);
          await updatePaymentRequest(requestId, { status: "confirmed" });
        } catch (err) {
          console.error("Erro ao atualizar planilha:", err);
          await ctx.answerCbQuery("Falha ao registrar pagamento na planilha.", {
            show_alert: true,
          });
          return;
        }
      }
    }

    await updatePaymentRequest(requestId, { signatures });

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
      return Markup.button.callback(
        displayName,
        `confirm_${coord.telegram_user.id}`
      );
    });

    const cancelButton = Markup.button.callback(
      "❌ CANCELAR",
      "cancel_payment"
    );
    const newMarkup = Markup.inlineKeyboard([
      coordinatorButtons,
      [cancelButton],
    ]);

    await ctx.editMessageReplyMarkup(newMarkup.reply_markup);
    await ctx.answerCbQuery();
  });
}
