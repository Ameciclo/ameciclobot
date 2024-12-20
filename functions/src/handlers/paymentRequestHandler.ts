import { Markup, Telegraf } from "telegraf";
import { PaymentRequest, Supplier } from "../config/types";
import {
  getAllCoordinatorsIds,
  updatePaymentRequestGroupMessage,
} from "../services/firebase";

async function createConfirmationButtons() {
  const coordinatorIds = await getAllCoordinatorsIds();
  // Cria os botões a partir da lista de coordenadores
  const coordinatorButtons = coordinatorIds.map((coord) =>
    Markup.button.callback(coord.name, `confirm_${coord.id}`)
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
    `💰💰💰 SOLICITAÇÃO DE PAGAMENTO 💰💰💰\n\n` +
    `👉 Solicitado por:  ${request.from.first_name}\n` +
    `📂 ID da Solicitação: ${request.id}\n\n` +
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
  request: PaymentRequest,
  params: SendPaymentRequestParams,
  bot: Telegraf,
  groupChatId: string,
  coordinationIds: string[]
) {
  console.log("SOLICITAÇÃO DE PAGAMENTO CRIADA");
  const { requestId } = params;

  const messageToGroup = excerptFromRequest(request);

  try {
    // Envia mensagem no grupo
    const result = await bot.telegram.sendMessage(groupChatId, messageToGroup);

    updatePaymentRequestGroupMessage(requestId, result.message_id);

    // Cria os botões de confirmação/cancelamento a partir do Firebase
    const confirmationMarkup = await createConfirmationButtons();

    // Envia mensagem para cada membro da coordenação passada por parâmetro, com os botões
    for (const coordId of coordinationIds) {
      try {
        await bot.telegram.sendMessage(
          coordId,
          `${messageToGroup}`,
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
