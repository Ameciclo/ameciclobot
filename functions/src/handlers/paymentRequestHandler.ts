import { Markup, Telegraf } from "telegraf";
import { PaymentRequest, Supplier } from "../config/types";
import {
  getCoordinatorsIds,
  updatePaymentRequestGroupMessage,
} from "../services/firebase";

async function createConfirmationButtons(spreadsheetId: string) {
  const coordinatorIds = await getCoordinatorsIds();
  // Cria os botões a partir da lista de coordenadores
  const coordinatorButtons = coordinatorIds.map((coord) =>
    Markup.button.callback(coord.name, `confirm_${coord.id}`)
  );

  // Atualizar os botões após confirmação
  const viewSpreadsheetButton = Markup.button.url(
    "📊 Ver planilha",
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
  );

  const cancelButton = Markup.button.callback("❌ CANCELAR", "cancel_payment");

  return Markup.inlineKeyboard([
    ...coordinatorButtons,
    viewSpreadsheetButton,
    cancelButton,
  ]);
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
  coordinatiors: {
    id: any;
    name: any;
  }[]
) {
  console.log("SOLICITAÇÃO DE PAGAMENTO CRIADA");
  const { requestId } = params;

  const messageToGroup = excerptFromRequest(request);
  console.log(groupChatId);
  console.log(coordinatiors);
  try {
    // Envia mensagem no grupo com botões de confirmação e cancelamento
    const confirmationMarkup = await createConfirmationButtons(
      request.project.spreadsheet_id || ""
    );
    const result = await bot.telegram.sendMessage(
      groupChatId,
      messageToGroup,
      confirmationMarkup
    );

    updatePaymentRequestGroupMessage(requestId, result.message_id);

    for (const coordinator of coordinatiors) {
      try {
        await bot.telegram.sendMessage(coordinator.id, messageToGroup);
      } catch (err) {
        console.error(
          `Erro ao enviar mensagem para coordenação (ID: ${coordinator}):`,
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
