// src/paymentRequestHandler.ts

import * as admin from "firebase-admin";
import { Telegraf } from "telegraf";
import { PaymentRequest, RecipientInformation } from "../types";

const groupChatId = process.env.GROUP_CHAT_ID as string;
const coordinationIds = (process.env.COORDINATION_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0); // IDs da coordenação

export function recipientToReadableLine(
  recipient: RecipientInformation
): string {
  return (
    `Empresa: ${recipient.company}\n` +
    `Nome: ${recipient.name}\n` +
    `Banco: ${recipient.bank_code}\n` +
    `Agência: ${recipient.agency}\n` +
    `Conta: ${recipient.account}\n` +
    `CPF: ${recipient.id}`
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
    `${recipientToReadableLine(request.recipientInformation)}\n\n` +
    `💵 Valor: ${request.value}`
  );
}

interface SendPaymentRequestParams {
  requestId: string;
}

export async function sendPaymentRequestHandler(
  snapshot: admin.database.DataSnapshot,
  params: SendPaymentRequestParams,
  bot: Telegraf
) {
  const request = snapshot.val() as PaymentRequest;
  const { requestId } = params;

  const messageToGroup = excerptFromRequest(request);

  try {
    // Envia mensagem no grupo
    const result = await bot.telegram.sendMessage(groupChatId, messageToGroup);

    // Armazena o ID da mensagem no firebase
    await admin.database().ref(`requests/${requestId}`).update({
      group_message_id: result.message_id,
    });

    console.log(`Payment-request sent successfully: ${JSON.stringify(result)}`);

    // Envia mensagem para cada membro da coordenação
    for (const coordId of coordinationIds) {
      try {
        await bot.telegram.sendMessage(
          coordId,
          `Uma nova solicitação de pagamento foi criada:\n${messageToGroup}`
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
