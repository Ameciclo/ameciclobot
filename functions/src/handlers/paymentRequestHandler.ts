import * as admin from "firebase-admin";
import { Markup, Telegraf } from "telegraf";
import { PaymentRequest, Supplier } from "../config/types";

async function createConfirmationButtons(requestId: string) {
  // Busca todos os usuários no endpoint "subscribers"
  const snapshot = await admin.database().ref("subscribers").once("value");
  const data = snapshot.val() || {};

  // Filtra apenas os que possuem role: "AMECICLO_COORDINATORS"
  const coordinatorEntries = Object.values(data).filter(
    (entry: any) => entry.role === "AMECICLO_COORDINATORS"
  ) as any[];

  // Mapeia os coordenadores para obter {id, name}
  const coordinatorIds = coordinatorEntries.map((coord) => ({
    id: coord.telegram_user.id,
    name: coord.telegram_user.username || coord.telegram_user.first_name,
  }));

  // Cria os botões a partir da lista de coordenadores
  const coordinatorButtons = coordinatorIds.map((coord) =>
    Markup.button.callback(coord.name, `confirm_${coord.id}_${requestId}`)
  );

  const cancelButton = Markup.button.callback("❌ CANCELAR", "cancel_payment");

  return Markup.inlineKeyboard([coordinatorButtons, [cancelButton]]);
}

export function recipientToReadableLine(supplier: Supplier): string {
  return (
    `Empresa: ${supplier.nickname} (${supplier.name})\n` +
    `Pagar com ${supplier.payment_methods[0].type} ➡️ ${supplier.payment_methods[0].value}`
  );
}

export function excerptFromRequest(request: PaymentRequest): string {
  return (
    `💰💰💰 PAGAMENTO 💰💰💰\n` +
    `👉 ${request.from.first_name} solicitou um pagamento.\n\n` +
    `🗂 Projeto: ${request.project.name}\n` +
    `📂 Item Orçamentário: ${request.budgetItem}\n` +
    `🗒 Descrição: ${request.description}\n\n` +
    `📈 Conta saída: ${request.project.account}\n\n` +
    `📉 DADOS BANCÁRIOS\n` +
    `${recipientToReadableLine(request.supplier)}\n\n` +
    `💵 Valor: ${request.value}`
  );
}

interface SendPaymentRequestParams {
  requestId: string;
}

export async function sendPaymentRequestHandler(
  snapshot: admin.database.DataSnapshot,
  params: SendPaymentRequestParams,
  bot: Telegraf,
  groupChatId: string,
  coordinationIds: string[]
) {
  const request = snapshot.val() as PaymentRequest;
  const { requestId } = params;

  const messageToGroup = excerptFromRequest(request);

  try {
    // Envia mensagem no grupo
    const result = await bot.telegram.sendMessage(groupChatId, messageToGroup);

    // Armazena o ID da mensagem no Firebase
    await admin.database().ref(`requests/${requestId}`).update({
      group_message_id: result.message_id,
    });

    console.log(`Payment-request sent successfully: ${JSON.stringify(result)}`);

    // Cria os botões de confirmação/cancelamento a partir do Firebase
    const confirmationMarkup = await createConfirmationButtons(requestId);

    // Envia mensagem para cada membro da coordenação passada por parâmetro, com os botões
    for (const coordId of coordinationIds) {
      try {
        await bot.telegram.sendMessage(
          coordId,
          `Uma nova solicitação de pagamento foi criada:\n${messageToGroup}`,
          confirmationMarkup
        );
      } catch (err) {
        console.error(
          `Erro ao enviar mensagem para coordenação (ID: ${coordId}):`,
          err
        );
      }
    }

    return result;
  } catch (err) {
    console.error("Erro ao enviar mensagem para o grupo:", err);
    return err;
  }
}
