import * as admin from "firebase-admin";
import { Context, Telegraf, Markup } from "telegraf";
import { updateSpreadsheet } from "../services/google";


export function registerConfirmPaymentHandler(bot: Telegraf) {
  // Registramos uma ação genérica para "confirm_*"
  bot.action(/^confirm_(\d+)$/, async (ctx: Context) => {

    console.log("CONFIRMAR PAGAMENTO!")
    const callbackQuery = ctx.callbackQuery;
    // Verifica se callbackQuery é do tipo esperado e contém `data`
    if (
      !callbackQuery ||
      !("data" in callbackQuery) ||
      typeof callbackQuery.data !== "string"
    ) {
      await ctx.answerCbQuery("Dados inválidos na ação.", { show_alert: true });
      return;
    }


    const callbackQueryValue = ctx.callbackQuery;

    // Verifica se callbackQuery é do tipo esperado e contém `data`
    if (
      !callbackQueryValue ||
      !("data" in callbackQueryValue) ||
      typeof callbackQueryValue.data !== "string"
    ) {
      await ctx.answerCbQuery("Dados inválidos na ação.", { show_alert: true });
      return;
    }

    const callbackData = callbackQueryValue.data; // Obtemos `data` diretamente

    const coordIdFromButton = callbackData.split("_")[1]; // ID do coordenador no botão
    const userId = ctx.from?.id?.toString();

    // Verifica se quem clicou é o mesmo do botão
    if (userId !== coordIdFromButton) {
      await ctx.answerCbQuery(
        "Você não está autorizado a confirmar este pagamento.",
        { show_alert: true }
      );
      return;
    }

    // Identificar o requestId. Assumiremos que o `message_id` da mensagem no contexto
    // é a mesma que temos registrada em `requests/{requestId}/group_message_id`.
    const groupMessageId = ctx.callbackQuery?.message?.message_id;
    if (!groupMessageId) {
      await ctx.answerCbQuery("Não foi possível identificar a solicitação.", {
        show_alert: true,
      });
      return;
    }

    // Encontrar o requestId a partir do group_message_id
    const requestsSnapshot = await admin
      .database()
      .ref("requests")
      .once("value");
    const requestsData = requestsSnapshot.val() || {};

    let requestId: string | null = null;
    let requestData: any = null;

    for (const key in requestsData) {
      if (requestsData[key].group_message_id === groupMessageId) {
        requestId = key;
        requestData = requestsData[key];
        break;
      }
    }

    if (!requestId || !requestData) {
      await ctx.answerCbQuery("Solicitação não encontrada no banco de dados.", {
        show_alert: true,
      });
      return;
    }

    // Verifica se já está cancelado ou confirmado
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

    // Verifica se o usuário já assinou
    let userAlreadySignedSlot: number | null = null;
    for (const slot in signatures) {
      if (signatures[slot].id == userId) {
        userAlreadySignedSlot = parseInt(slot, 10);
        break;
      }
    }

    if (userAlreadySignedSlot !== null) {
      // Usuário já assinou, clicou novamente -> remove assinatura (toggle off)
      delete signatures[userAlreadySignedSlot];
    } else {
      // Usuário não assinou ainda
      // Contar quantas assinaturas já existem
      const signatureCount = Object.keys(signatures).length;

      if (signatureCount >= 2) {
        // Já tem 2 assinaturas
        await ctx.answerCbQuery("Este pagamento já possui duas assinaturas.", {
          show_alert: true,
        });
        return;
      }

      // Adiciona nova assinatura no próximo slot livre (1 ou 2)
      const newSlot = signatureCount === 0 ? 1 : 2;
      signatures[newSlot] = ctx.from; // Armazena dados completos do usuário

      // Se for a segunda assinatura, após adicionar, chamamos a atualização da planilha
      if (newSlot === 2) {
        // Montar request para enviar à planilha
        const spreadsheetId = "YOUR_SPREADSHEET_ID"; // Ajuste conforme necessário
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
          await admin.database().ref(`requests/${requestId}`).update({
            status: "confirmed", // ou qualquer outro status que faça sentido
          });
        } catch (err) {
          console.error("Erro ao atualizar planilha:", err);
          await ctx.answerCbQuery("Falha ao registrar pagamento na planilha.", {
            show_alert: true,
          });
          return;
        }
      }
    }

    // Atualiza o Firebase com as novas signatures
    await admin.database().ref(`requests/${requestId}`).update({ signatures });

    // Atualizar os botões (inlineKeyboard) exibindo o ✅ para quem já assinou
    // Para manter a consistência, precisamos recriar a lista de coordenadores
    const snapshot = await admin.database().ref("subscribers").once("value");
    const data = snapshot.val() || {};
    const coordinatorEntries = Object.values(data).filter(
      (entry: any) => entry.role === "AMECICLO_COORDINATORS"
    ) as any[];

    const coordinatorIds = coordinatorEntries.map((coord) => ({
      id: coord.telegram_user.id.toString(),
      name: coord.telegram_user.username || coord.telegram_user.first_name,
    }));

    // Monta os botões, adicionando ✅ se o coordenador assinou
    const coordinatorButtons = coordinatorIds.map((coord) => {
      const signed = Object.values(signatures).some(
        (sig: any) => sig.id.toString() === coord.id
      );
      const displayName = signed ? `✅ ${coord.name}` : coord.name;
      return Markup.button.callback(displayName, `confirm_${coord.id}`);
    });

    const cancelButton = Markup.button.callback(
      "❌ CANCELAR",
      "cancel_payment"
    );

    const newMarkup = Markup.inlineKeyboard([
      coordinatorButtons,
      [cancelButton],
    ]);

    // Atualiza a mensagem atual com o novo teclado
    await ctx.editMessageReplyMarkup(newMarkup.reply_markup);
    await ctx.answerCbQuery();
  });
}
