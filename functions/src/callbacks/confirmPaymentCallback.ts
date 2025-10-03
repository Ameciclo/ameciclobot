// confirmPayment.ts
import { Telegraf, Context, Markup } from "telegraf";
import {
  getRequestData,
  updatePaymentRequest,
  getCoordinators,
  getWorkgroupId,
} from "../services/firebase";
import { updateSpreadsheet } from "../services/google";
import {
  AmecicloUser,
  PaymentRequest,
  TelegramUserInfo,
} from "../config/types";

/**
 * Gera texto simples do pagamento sem MarkdownV2
 */
function buildPaymentText(
  request: PaymentRequest,
  title: string,
  signatures?: Record<number, TelegramUserInfo>
): string {
  const paymentMethod = request.supplier.payment_methods[0];
  const cleanValue = paymentMethod.value.toString().replace(/"/g, '');
  
  let paymentText = `Pagar com ${paymentMethod.type} ➡️ ${cleanValue}`;
  if (paymentMethod.type.toLowerCase() === 'pix') {
    paymentText = `Pagar com ${paymentMethod.type} ➡️ \`${cleanValue}\``;
  }
  
  let text = `${title}\n\n` +
    `👉 Solicitado por: ${request.from.first_name}\n` +
    `🆔 ID da Solicitação: \`${request.id}\`\n\n` +
    `🗂 Projeto: ${request.project.name}\n` +
    `📂 Item Orçamentário: ${request.budgetItem}\n` +
    `🗒 Descrição: ${request.description}\n\n` +
    `📈 Conta saída: ${request.project.account}\n\n` +
    `📉 FORNECEDOR\n` +
    `Empresa: ${request.supplier.nickname} (${request.supplier.name})\n` +
    `${paymentText}\n\n` +
    `💵 Valor: ${request.value}`;
    
  if (signatures) {
    const signedByText = buildSignedByText(signatures);
    text += `\n\n---\nAssinaturas:\n${signedByText}`;
  }
  
  return text;
}

/**
 * Extrai os dados do callback enviado pelo botão do Telegram.
 * Formato esperado: "confirm_{coordId}_{requestId}"
 */
function parseCallbackData(
  callbackData?: string
): { coordIdFromButton: number; requestId: string } | null {
  if (!callbackData) return null;
  const regex = /^confirm_(\d+)_(.+)$/;
  const match = callbackData.match(regex);
  if (!match) return null;
  const coordIdFromButton = parseInt(match[1], 10);
  const requestId = match[2];
  return { coordIdFromButton, requestId };
}

/**
 * Verifica se o usuário que clicou no botão é o coordenador autorizado.
 */
function isUserAuthorized(userId: number, coordIdFromButton: number): boolean {
  return userId === coordIdFromButton;
}

/**
 * Verifica se já existem duas assinaturas na solicitação.
 */
function hasTwoSignatures(
  signatures: Record<number, TelegramUserInfo> | undefined
): boolean {
  if (!signatures) return false;
  return Object.keys(signatures).length >= 2;
}

/**
 * Verifica se o usuário já assinou a solicitação
 */
function hasUserSigned(
  signatures: Record<number, TelegramUserInfo>,
  userId: number
): boolean {
  return signatures[userId] !== undefined;
}

/**
 * Apaga todas as mensagens do inbox dos coordenadores quando transação é aprovada
 */
async function deleteAllCoordinatorMessages(
  requestData: PaymentRequest,
  ctx: Context
): Promise<void> {
  if (requestData.coordinator_messages) {
    for (const [coordId, messageId] of Object.entries(
      requestData.coordinator_messages
    )) {
      try {
        await ctx.telegram.deleteMessage(parseInt(coordId), messageId);
      } catch (error: any) {
        if (
          error.description &&
          error.description.includes("message to delete not found")
        ) {
          console.log(`Mensagem do coordenador ${coordId} já foi apagada.`);
        } else {
          console.error(
            `Erro ao apagar mensagem do coordenador ${coordId}:`,
            error
          );
        }
      }
    }
  }
}

/**
 * Notifica o solicitante que o pagamento foi confirmado
 */
async function notifyPaymentRequester(
  requestData: PaymentRequest,
  ctx: Context
): Promise<void> {
  try {
    const message =
      `✅ Seu pagamento foi confirmado com sucesso!\n\n` +
      `💰 Tipo: ${requestData.transactionType}\n` +
      `💵 Valor: ${requestData.value}\n` +
      `🗂 Projeto: ${requestData.project.name}\n` +
      `📝 Descrição: ${requestData.description}`;

    await ctx.telegram.sendMessage(requestData.from.id, message);
    console.log(
      `Notificação enviada para o solicitante (ID: ${requestData.from.id})`
    );
  } catch (error: any) {
    console.error(`Erro ao notificar solicitante:`, error);
  }
}

/**
 * Atualiza a planilha do Google e a solicitação no Firebase.
 * Usada quando a segunda assinatura é adicionada.
 */
async function updateGoogleSheetAndRequest(
  requestData: PaymentRequest,
  requestId: string,
  signatures: Record<number, TelegramUserInfo>,
  ctx: Context
): Promise<boolean> {
  try {
    await updateSpreadsheet(requestData);

    // Apaga todas as mensagens do inbox dos coordenadores
    await deleteAllCoordinatorMessages(requestData, ctx);

    // Notifica o solicitante
    await notifyPaymentRequester(requestData, ctx);

    // Atualiza o status da solicitação para "confirmed" no Firebase
    await updatePaymentRequest(requestId, { status: "confirmed", signatures });

    // Atualiza a mensagem no grupo financeiro com o status final
    if (requestData.group_message_id) {
      try {
        const financeGroupId = await getWorkgroupId("Financeiro");
        const viewSpreadsheetButton = Markup.button.url(
          "📊 Planilha Financeira",
          `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
        );

        const comprovantesButton = Markup.button.url(
          "📁 Pasta de Comprovantes",
          `https://drive.google.com/drive/folders/${requestData.project.folder_id}`
        );

        const keyboard = Markup.inlineKeyboard([
          [viewSpreadsheetButton, comprovantesButton],
        ]);

        const messageText = buildPaymentText(
          requestData,
          "💸💸💸 Pagamento confirmado com sucesso. 💸💸💸",
          signatures
        );

        await ctx.telegram.editMessageText(
          financeGroupId,
          requestData.group_message_id,
          undefined,
          messageText,
          {
            ...keyboard,
            parse_mode: "Markdown"
          }
        );
      } catch (error: any) {
        if (
          error.description &&
          error.description.includes("message is not modified")
        ) {
          console.log("Mensagem não modificada, conteúdo idêntico.");
        } else if (
          error.description &&
          error.description.includes("message to edit not found")
        ) {
          console.log("Mensagem não encontrada, pode ter sido apagada.");
        } else {
          console.error("Erro ao atualizar mensagem final:", error);
        }
      }
    }

    console.log("Pagamento confirmado!");
    return true;
  } catch (error) {
    console.error("Erro ao atualizar a planilha e a solicitação:", error);
    return false;
  }
}

/**
 * Constrói os botões inline para os coordenadores.
 * Se um coordenador já assinou, seu botão vem com o prefixo "✅".
 */
function buildCoordinatorButtons(
  coordinators: AmecicloUser[],
  signatures: Record<number, TelegramUserInfo>,
  requestId: string
) {
  return coordinators.map((coordinator) => {
    const hasSigned = Object.values(signatures).some(
      (sig) => sig.id === coordinator.telegram_user.id
    );
    const buttonText = `${hasSigned ? "✅ " : ""}${
      coordinator.telegram_user.first_name
    }`;
    const callbackData = `confirm_${coordinator.telegram_user.id}_${requestId}`;
    return Markup.button.callback(buttonText, callbackData);
  });
}

/**
 * Constrói o texto que exibe quem já assinou a solicitação.
 */
function buildSignedByText(
  signatures: Record<number, TelegramUserInfo>
): string {
  return Object.values(signatures)
    .map((sig) => `✅ ${sig.first_name}`)
    .join("\n");
}

/**
 * Função principal que processa o callback de confirmação de pagamento.
 * Realiza a validação, atualização de assinaturas, integração com a planilha e edita a mensagem.
 */
export async function confirmPayment(ctx: Context): Promise<void> {
  try {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !("data" in callbackQuery)) {
      await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
      return;
    }

    const callbackData = callbackQuery.data as string;

    // Extrai coordId e requestId dos dados do callback
    const parsed = parseCallbackData(callbackData);
    if (!parsed) {
      await ctx.answerCbQuery("Dados do callback inválidos.");
      return;
    }
    const { coordIdFromButton, requestId } = parsed;

    // Verifica se o usuário que clicou está identificado e autorizado
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.answerCbQuery("Usuário não identificado.");
      return;
    }
    if (!isUserAuthorized(userId, coordIdFromButton)) {
      await ctx.answerCbQuery(
        "Você não está autorizado a confirmar este pagamento."
      );
      return;
    }

    // Busca os dados da solicitação de pagamento no Firebase
    const requestData: PaymentRequest | null = await getRequestData(requestId);
    if (!requestData) {
      await ctx.answerCbQuery("Solicitação não encontrada.");
      return;
    }
    if (requestData.status === "cancelled") {
      await ctx.answerCbQuery(
        "Esta solicitação foi cancelada e não pode ser confirmada."
      );
      return;
    }
    if (requestData.status === "confirmed") {
      await ctx.answerCbQuery("Este pagamento já foi confirmado.");
      return;
    }

    // Lê ou inicializa as assinaturas
    const signatures: Record<number, TelegramUserInfo> =
      requestData.signatures || {};

    // Verifica se o usuário já assinou (toggle de assinatura)
    if (hasUserSigned(signatures, userId)) {
      // Remove assinatura
      delete signatures[userId];
      await updatePaymentRequest(requestId, { signatures });
      await ctx.answerCbQuery("Sua assinatura foi removida.");
      
      // Atualiza a interface após remover assinatura
      if (requestData.group_message_id) {
        try {
          const financeGroupId = await getWorkgroupId("Financeiro");
          const coordinators = await getCoordinators();
          const coordinatorButtons = buildCoordinatorButtons(
            coordinators,
            signatures,
            requestId
          );
          const viewSpreadsheetButton = Markup.button.url(
            "📊 Ver Planilha",
            `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
          );
          const cancelButton = Markup.button.callback(
            "❌ CANCELAR",
            `cancel_payment_${requestData.id}`
          );

          const keyboard = Markup.inlineKeyboard([
            coordinatorButtons,
            [viewSpreadsheetButton, cancelButton],
          ]);

          const messageText = buildPaymentText(
            requestData,
            `💰💰💰 ${requestData.transactionType.toUpperCase()} 💰💰💰`,
            signatures
          );
          
          await ctx.telegram.editMessageText(
            financeGroupId,
            requestData.group_message_id,
            undefined,
            messageText,
            {
              ...keyboard,
              parse_mode: "Markdown"
            }
          );
        } catch (error: any) {
          console.error("Erro ao atualizar mensagem após remoção:", error);
        }
      }
      return;
    } else {
      // Se já houver duas assinaturas, não permite nova assinatura
      if (hasTwoSignatures(signatures)) {
        await ctx.answerCbQuery(
          "Não é possível assinar. Já existem duas assinaturas."
        );
        return;
      }

      // Mostra loading imediatamente
      await ctx.answerCbQuery("⏳ Processando assinatura...");

      // Atualiza botão para mostrar loading
      try {
        const coordinators = await getCoordinators();
        const loadingButtons = coordinators.map((coordinator) => {
          const isCurrentUser = coordinator.telegram_user.id === userId;
          const hasSigned = Object.values(signatures).some(
            (sig) => sig.id === coordinator.telegram_user.id
          );
          const buttonText = isCurrentUser
            ? "⏳ Processando..."
            : `${hasSigned ? "✅ " : ""}${
                coordinator.telegram_user.first_name
              }`;
          const callbackData = `confirm_${coordinator.telegram_user.id}_${requestId}`;
          return Markup.button.callback(buttonText, callbackData);
        });

        const viewSpreadsheetButton = Markup.button.url(
          "📊 Ver Planilha",
          `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
        );
        const cancelButton = Markup.button.callback(
          "❌ CANCELAR",
          `cancel_payment_${requestData.id}`
        );

        const loadingKeyboard = Markup.inlineKeyboard([
          loadingButtons,
          [viewSpreadsheetButton, cancelButton],
        ]);

        const messageText = buildPaymentText(
          requestData,
          `💰💰💰 ${requestData.transactionType.toUpperCase()} 💰💰💰`,
          signatures
        );
        await ctx.editMessageText(messageText, {
          ...loadingKeyboard,
          parse_mode: "Markdown"
        });
      } catch (error: any) {
        console.error("Erro ao mostrar loading:", error);
      }

      // Adiciona a assinatura usando o ID do usuário como chave
      signatures[userId] = ctx.from as TelegramUserInfo;

      // Apaga a mensagem privada do coordenador que acabou de assinar
      if (
        requestData.coordinator_messages &&
        requestData.coordinator_messages[userId]
      ) {
        try {
          await ctx.telegram.deleteMessage(
            userId,
            requestData.coordinator_messages[userId]
          );
        } catch (err: any) {
          if (
            err.description &&
            err.description.includes("message to delete not found")
          ) {
            console.log(
              `Mensagem do coordenador já foi apagada ou não existe mais.`
            );
          } else {
            console.error(
              `Erro ao apagar mensagem do coordenador que assinou.`,
              err
            );
          }
        }
      }

      await updatePaymentRequest(requestId, { signatures });

      if (Object.keys(signatures).length === 2) {
        // Imediatamente desabilita os botões para evitar cliques duplos
        if (requestData.group_message_id) {
          try {
            const financeGroupId = await getWorkgroupId("Financeiro");
            const processingText = buildPaymentText(
              requestData,
              `💰💰💰 ${requestData.transactionType.toUpperCase()} 💰💰💰`
            ) + "\n\n⏳ Processando pagamento...";

            await ctx.telegram.editMessageText(
              financeGroupId,
              requestData.group_message_id,
              undefined,
              processingText,
              { parse_mode: "Markdown" }
            );
          } catch (error: any) {
            console.error("Erro ao desabilitar botões:", error);
          }
        }
        await updateGoogleSheetAndRequest(
          requestData,
          requestId,
          signatures,
          ctx
        );
        return;
      }

      // Sempre atualiza a mensagem no grupo financeiro quando há mudança nas assinaturas
      if (requestData.group_message_id) {
        try {
          const financeGroupId = await getWorkgroupId("Financeiro");
          const coordinators = await getCoordinators();
          const coordinatorButtons = buildCoordinatorButtons(
            coordinators,
            signatures,
            requestId
          );
          const viewSpreadsheetButton = Markup.button.url(
            "📊 Ver Planilha",
            `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
          );
          const cancelButton = Markup.button.callback(
            "❌ CANCELAR",
            `cancel_payment_${requestData.id}`
          );

          const keyboard = Markup.inlineKeyboard([
            coordinatorButtons,
            [viewSpreadsheetButton, cancelButton],
          ]);

          const messageText = buildPaymentText(
            requestData,
            `💰💰💰 ${requestData.transactionType.toUpperCase()} 💰💰💰`,
            signatures
          );
          await ctx.telegram.editMessageText(
            financeGroupId,
            requestData.group_message_id,
            undefined,
            messageText,
            {
              ...keyboard,
              parse_mode: "Markdown"
            }
          );
        } catch (error: any) {
          if (
            error.description &&
            error.description.includes("message is not modified")
          ) {
            console.log("Mensagem do grupo não modificada, conteúdo idêntico.");
          } else if (
            error.description &&
            error.description.includes("message to edit not found")
          ) {
            console.log(
              "Mensagem do grupo não encontrada, pode ter sido apagada."
            );
          } else {
            console.error("Erro ao atualizar mensagem no grupo:", error);
          }
        }
      }
    }

    // A atualização da interface já foi feita acima no bloco de loading/atualização do grupo financeiro
  } catch (error) {
    console.error("Erro ao confirmar pagamento:", error);
    await ctx.reply(
      "Ocorreu um erro ao processar sua confirmação de pagamento."
    );
  }
}

/**
 * Registra o handler no bot para ações de callback que iniciam com "confirm_".
 */
export function registerConfirmPaymentCallback(bot: Telegraf): void {
  bot.action(/^confirm_(\d+)_(.+)$/, async (ctx) => {
    try {
      await confirmPayment(ctx);
    } catch (error) {
      console.error("Erro no handler de confirmação de pagamento:", error);
      await ctx.reply("Erro ao confirmar pagamento.");
    }
  });
}
