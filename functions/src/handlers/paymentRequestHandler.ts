// src/paymentRequestHandler.ts

import * as admin from "firebase-admin";
import { Telegraf } from "telegraf";
import { PaymentRequest } from "../types";
import { RecipientInformation } from "../types";

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

const groupChatId = process.env.GROUP_CHAT_ID as string; // Defina no seu .env

export async function sendPaymentRequestHandler(
  snapshot: any,
  context: any,
  bot: Telegraf
) {
  const request = snapshot.val() as PaymentRequest;
  const requestId = context.params.requestId as string;

  const messageToGroup = excerptFromRequest(request);

  try {
    const result = await bot.telegram.sendMessage(
      groupChatId,
      messageToGroup,
    );
    // Caso não tenha menu, usar: await bot.telegram.sendMessage(groupChatId, messageToGroup);

    await admin.database().ref(`requests/${requestId}`).update({
      group_message_id: result.message_id,
    });

    console.log(`Payment-request sent successfully: ${JSON.stringify(result)}`);
    return result;
  } catch (err) {
    console.error("Erro ao enviar mensagem para o grupo:", err);
    return err;
  }
}
