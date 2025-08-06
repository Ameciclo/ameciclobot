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
import { excerptFromRequest } from "../utils/utils"; // <-- novo import

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
 * Verifica se o usuário já assinou a solicitação, retornando o “slot” (1 ou 2)
 * onde sua assinatura está armazenada.
 */
function getUserSignatureSlot(
  signatures: Record<number, TelegramUserInfo>,
  userId: number
): number | undefined {
  for (const [slotStr, userInfo] of Object.entries(signatures)) {
    if (userInfo.id === userId) {
      return parseInt(slotStr, 10);
    }
  }
  return undefined;
}

/**
 * Apaga todas as mensagens do inbox dos coordenadores quando transação é aprovada
 */
async function deleteAllCoordinatorMessages(
  requestData: PaymentRequest,
  ctx: Context
): Promise<void> {
  if (requestData.coordinator_messages) {
    for (const [coordId, messageId] of Object.entries(requestData.coordinator_messages)) {
      try {
        await ctx.telegram.deleteMessage(parseInt(coordId), messageId);
      } catch (error: any) {
        if (error.description && error.description.includes("message to delete not found")) {
          console.log(`Mensagem do coordenador ${coordId} já foi apagada.`);
        } else {
          console.error(`Erro ao apagar mensagem do coordenador ${coordId}:`, error);
        }
      }
    }
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

    // Atualiza o status da solicitação para "confirmed" no Firebase
    await updatePaymentRequest(requestId, { status: "confirmed", signatures });
    // Botões extras: visualização da planilha e opção de cancelar a solicitação
    const viewSpreadsheetButton = Markup.button.url(
      "📊 Ver Planilha",
      `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
    );

    const keyboard = Markup.inlineKeyboard([viewSpreadsheetButton]);

    const baseText = excerptFromRequest(
      requestData,
      "💸💸💸 Pagamento confirmado com sucesso. 💸💸💸"
    );
    const signedByText = buildSignedByText(signatures);
    const messageText = `${baseText}\n\n---\nAssinaturas:\n${signedByText}`;
    try {
      await ctx.editMessageText(messageText, keyboard);
    } catch (error: any) {
      // Ignora o erro se a mensagem for idêntica ou não existir mais
      if (error.description && error.description.includes("message is not modified")) {
        console.log("Mensagem não modificada, conteúdo idêntico.");
      } else if (error.description && error.description.includes("message to edit not found")) {
        console.log("Mensagem não encontrada, pode ter sido apagada.");
      } else {
        throw error;
      }
    }

    console.log("Pagamento confirmado!");
    return true;
  } catch (error) {
    await ctx.answerCbQuery("Falha ao registrar pagamento na planilha.");
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

    // Lê ou inicializa as assinaturas
    const signatures: Record<number, TelegramUserInfo> =
      requestData.signatures || {};

    // Verifica se o usuário já assinou (toggle de assinatura)
    const userSignatureSlot = getUserSignatureSlot(signatures, userId);
    if (userSignatureSlot !== undefined) {
      // Remove assinatura
      delete signatures[userSignatureSlot];
      await updatePaymentRequest(requestId, { signatures });
      await ctx.answerCbQuery("Sua assinatura foi removida.");
    } else {
      // Se já houver duas assinaturas, não permite nova assinatura
      if (hasTwoSignatures(signatures)) {
        await ctx.answerCbQuery(
          "Não é possível assinar. Já existem duas assinaturas."
        );
        return;
      }
      // Define o novo slot: 1 se nenhum existe, ou 2 se já há uma assinatura
      const newSlot = Object.keys(signatures).length === 0 ? 1 : 2;
      signatures[newSlot] = ctx.from as TelegramUserInfo;

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
          if (err.description && err.description.includes("message to delete not found")) {
            console.log(`Mensagem do coordenador já foi apagada ou não existe mais.`);
          } else {
            console.error(
              `Erro ao apagar mensagem do coordenador que assinou.`,
              err
            );
          }
        }
      }

      await updatePaymentRequest(requestId, { signatures });
      await ctx.answerCbQuery("Sua assinatura foi adicionada.");

      if (newSlot === 2) {
        const updated = await updateGoogleSheetAndRequest(
          requestData,
          requestId,
          signatures,
          ctx
        );
        if (!updated) {
          return;
        }
      }

      // Atualiza a mensagem no grupo sempre que há mudança nas assinaturas
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

          const baseText = excerptFromRequest(
            requestData,
            `💰💰💰 ${requestData.transactionType.toUpperCase()} 💰💰💰`
          );
          const signedByText = buildSignedByText(signatures);
          const messageText = `${baseText}\n\n---\nAssinaturas:\n${signedByText}`;

          try {
            await ctx.telegram.editMessageText(
              financeGroupId,
              requestData.group_message_id,
              undefined,
              messageText,
              keyboard
            );
          } catch (error: any) {
            if (error.description && error.description.includes("message is not modified")) {
              console.log("Mensagem do grupo não modificada, conteúdo idêntico.");
            } else if (error.description && error.description.includes("message to edit not found")) {
              console.log("Mensagem do grupo não encontrada, pode ter sido apagada.");
            } else {
              throw error;
            }
          }
        } catch (err) {
          console.error("Erro ao atualizar mensagem no grupo:", err);
        }
      }
    }

    if (Object.keys(signatures).length !== 2) {
      // Monta a interface atualizada mantendo o trecho original da solicitação
      const coordinators: AmecicloUser[] = await getCoordinators();
      const coordinatorButtons = buildCoordinatorButtons(
        coordinators,
        signatures,
        requestId
      );

      // Botões extras: visualização da planilha e opção de cancelar a solicitação
      const viewSpreadsheetButton = Markup.button.url(
        "📊 Ver Planilha",
        `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
      );
      const cancelButton = Markup.button.callback(
        "❌ CANCELAR",
        // Inclui o request id no callback para que o handler de cancelamento possa usá-lo
        `cancel_payment_${requestData.id}`
      );

      const keyboard = Markup.inlineKeyboard([
        coordinatorButtons,
        [viewSpreadsheetButton, cancelButton],
      ]);

      const baseText = excerptFromRequest(
        requestData,
        `💰💰💰 ${requestData.transactionType.toUpperCase()} 💰💰💰`
      );
      const signedByText = buildSignedByText(signatures);
      const messageText = `${baseText}\n\n---\nAssinaturas:\n${signedByText}`;

      try {
        await ctx.editMessageText(messageText, keyboard);
      } catch (error: any) {
        // Ignora o erro se a mensagem for idêntica ou não existir mais
        if (error.description && error.description.includes("message is not modified")) {
          console.log("Mensagem não modificada, conteúdo idêntico.");
        } else if (error.description && error.description.includes("message to edit not found")) {
          console.log("Mensagem não encontrada, pode ter sido apagada.");
        } else {
          throw error;
        }
      }

      // Atualiza ou apaga as mensagens enviadas aos coordenadores
      if (requestData.coordinator_messages) {
        for (const coordinator of coordinators) {
          const coordId = coordinator.telegram_user.id;
          const messageId = requestData.coordinator_messages[coordId];

          if (!messageId) continue;

          // Verifica se o coordenador já assinou
          const hasSigned = Object.values(signatures).some(
            (sig) => sig.id === coordId
          );

          try {
            if (hasSigned) {
              // Se já assinou, apaga a mensagem do privado
              try {
                await ctx.telegram.deleteMessage(coordId, messageId);
              } catch (error: any) {
                // Ignora o erro específico de mensagem não encontrada
                if (error.description && error.description.includes("message to delete not found")) {
                  console.log(`Mensagem do coordenador ${coordId} já foi apagada ou não existe mais.`);
                } else {
                  console.error(`Erro ao apagar mensagem do coordenador ${coordId}:`, error);
                }
              }
            } else {
              // Se não assinou, atualiza a mensagem com botão
              const updatedMessage = `Assina lá!\n💰${requestData.transactionType}\n💵${requestData.value}\n🗂${requestData.project.name}`;

              // Cria o botão de confirmação para o coordenador
              const confirmButton = Markup.button.callback(
                "✅ Assinar",
                `confirm_${coordId}_${requestId}`
              );

              const keyboard = Markup.inlineKeyboard([[confirmButton]]);

              try {
                await ctx.telegram.editMessageText(
                  coordId,
                  messageId,
                  undefined,
                  updatedMessage,
                  keyboard
                );
              } catch (error: any) {
                // Ignora o erro se a mensagem for idêntica ou não existir mais
                if (error.description && error.description.includes("message is not modified")) {
                  console.log(`Mensagem para coordenador ${coordId} não modificada, conteúdo idêntico.`);
                } else if (error.description && error.description.includes("message to edit not found")) {
                  console.log(`Mensagem para coordenador ${coordId} não encontrada, pode ter sido apagada.`);
                } else {
                  throw error;
                }
              }
            }
          } catch (err) {
            console.error(
              `Erro ao processar mensagem para coordenador (ID: ${coordId}):`,
              err
            );
          }
        }
      }
    }
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
