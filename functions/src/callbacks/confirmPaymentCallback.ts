// confirmPayment.ts
import { Telegraf, Context, Markup } from "telegraf";
import {
  getRequestData,
  updatePaymentRequest,
  getCoordinators,
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
    await ctx.editMessageText(messageText, keyboard);

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
    console.log("callbackData:", callbackData);

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
      } else {
        await updatePaymentRequest(requestId, { signatures });
        await ctx.answerCbQuery("Sua assinatura foi adicionada.");
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

      await ctx.editMessageText(messageText, keyboard);
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
export function registerConfirmPaymentHandler(bot: Telegraf): void {
  bot.action(/^confirm_(\d+)_(.+)$/, async (ctx) => {
    try {
      await confirmPayment(ctx);
    } catch (error) {
      console.error("Erro no handler de confirmação de pagamento:", error);
      await ctx.reply("Erro ao confirmar pagamento.");
    }
  });
}
