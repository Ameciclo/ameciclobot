import { Markup, Telegraf } from "telegraf";
import { AmecicloUser, PaymentRequest } from "../config/types";
import { updatePaymentRequestGroupMessage } from "../services/firebase";

async function createPaymentConfirmationButtons(
  coordinators: AmecicloUser[],
  request: PaymentRequest
) {
  const coordinatorButtonsRows = coordinators.map((coord) => [
    Markup.button.callback(coord.name, `confirm_${coord.id}_${request.id}`),
  ]);

  const viewSpreadsheetButton = Markup.button.url(
    "📊 Ver planilha",
    `https://docs.google.com/spreadsheets/d/${request.project.spreadsheet_id}`
  );

  const cancelButton = Markup.button.callback("❌ CANCELAR", "cancel_payment");

  return Markup.inlineKeyboard([
    ...coordinatorButtonsRows,
    [viewSpreadsheetButton],
    [cancelButton],
  ]);
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
    `Empresa: ${request.supplier.nickname} (${request.supplier.name})\n` +
    `Pagar com ${request.supplier.payment_methods[0].type} ➡️ ${request.supplier.payment_methods[0].value}\n\n` +
    `💵 Valor: ${request.value}`
  );
}

export async function sendPaymentRequestHandler(
  bot: Telegraf,
  request: PaymentRequest,
  groupChatId: string,
  coordinators: AmecicloUser[]
) {
  console.log("SOLICITAÇÃO DE PAGAMENTO CRIADA");

  // Monta o texto que será enviado
  const messageToGroup = excerptFromRequest(request);
  console.log("Grupo financeiro:", groupChatId);
  console.log("Coordenadores:", coordinators);

  try {
    const confirmationMarkup = await createPaymentConfirmationButtons(
      coordinators,
      request
    );

    const result = await bot.telegram.sendMessage(
      groupChatId,
      messageToGroup,
      confirmationMarkup
    );

    await updatePaymentRequestGroupMessage(request, result.message_id);

    for (const coordinator of coordinators) {
      try {
        await bot.telegram.sendMessage(
          coordinator.telegram_user.id,
          messageToGroup
        );
      } catch (err) {
        console.error(
          `Erro ao enviar mensagem para coordenação (ID: ${coordinator.telegram_user.id}):`,
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
