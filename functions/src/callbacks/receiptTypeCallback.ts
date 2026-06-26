import { Context, Markup, Telegraf } from "telegraf";
import {
  getRequestData,
  updatePaymentRequest,
  getWorkgroupId,
} from "../services/firebase";
import { findRowByRequestId, updateSpreadsheetCell, uploadInvoice } from "../services/google";
import { formatDate } from "../utils/utils";

function sanitizeFileName(text: string, maxLength = 50): string {
  const sanitized = text
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();
  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

// Função para extrair dados da mensagem
function extractDataFromMessage(ctx: any) {
  const messageText = ctx.callbackQuery?.message?.text;
  
  if (!messageText) {
    return { id: null, fileId: null };
  }
  
  // Extrai ID da transação
  const idMatch = messageText.match(/ID da transação:\s*([-\w]+)/);
  const id = idMatch ? idMatch[1] : null;
  
  // Extrai File ID
  const fileIdMatch = messageText.match(/File ID:\s*([A-Za-z0-9_-]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] : null;
  
  return { id, fileId };
}

function buildTelegramMessageLink(chatId: string | number, messageId: number): string | null {
  const normalizedChatId = String(chatId);

  if (!normalizedChatId.startsWith("-100")) {
    return null;
  }

  return `https://t.me/c/${normalizedChatId.slice(4)}/${messageId}`;
}

export async function registerReceiptTypeCallback(
  bot: Telegraf
): Promise<void> {
  bot.action(/^rt_(.+)_(nf|cf|r|o)$/, async (ctx: Context) => {
    try {
      const callbackQuery = ctx.callbackQuery;
      if (!callbackQuery || !("data" in callbackQuery)) {
        await ctx.answerCbQuery("Ação inválida.", { show_alert: true });
        return;
      }

      const callbackData = callbackQuery.data as string;
      const match = callbackData.match(/^rt_(.+)_(nf|cf|r|o)$/);
      if (!match) {
        await ctx.answerCbQuery("Dados do callback inválidos.");
        return;
      }

      const requestId = match[1];
      const typeCode = match[2];
      const typeMap: Record<string, string> = {
        'nf': 'Nota fiscal',
        'cf': 'Cupom Fiscal', 
        'r': 'Recibo',
        'o': 'Outro'
      };
      const receiptType = typeMap[typeCode];

      // Extrai fileId da mensagem
      const { fileId } = extractDataFromMessage(ctx);
      if (!fileId) {
        await ctx.answerCbQuery("File ID não encontrado na mensagem.");
        return;
      }

      const requestData = await getRequestData(requestId);
      if (!requestData) {
        await ctx.answerCbQuery("Solicitação não encontrada.");
        return;
      }

      if (requestData.status !== "confirmed") {
        await ctx.answerCbQuery("Pagamento não confirmado.");
        return;
      }

      // Processa o arquivo se ainda não foi processado
      if (!requestData.receipt_url) {
        await ctx.editMessageText("🔄 Arquivando comprovante...");
        
        const folderId = requestData.project.folder_id;
        if (!folderId) {
          await ctx.answerCbQuery(`Projeto ${requestData.project.name} sem pasta configurada.`);
          return;
        }
        
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(fileLink.href);
        const fileBuffer = await response.arrayBuffer();
        
        const date = formatDate(new Date());
        const fileName = `${date} - ${requestData.project.name} - ${requestData.value} - ${requestData.supplier.nickname} - ${sanitizeFileName(requestData.description)}`;
        
        const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
        if (!uploadResponse) {
          await ctx.answerCbQuery("Erro no upload do arquivo.");
          return;
        }
        
        await updatePaymentRequest(requestId, { receipt_url: uploadResponse });
        requestData.receipt_url = uploadResponse;
      }

      const rowNumber = await findRowByRequestId(
        requestData.project.spreadsheet_id,
        requestId
      );

      if (rowNumber) {
        await updateSpreadsheetCell(
          requestData.project.spreadsheet_id,
          `DETALHAMENTO DAS DESPESAS!J${rowNumber}`,
          receiptType
        );

        if (requestData.receipt_url) {
          await updateSpreadsheetCell(
            requestData.project.spreadsheet_id,
            `DETALHAMENTO DAS DESPESAS!K${rowNumber}`,
            requestData.receipt_url
          );
        }
      }

      await updatePaymentRequest(requestId, {
        receipt_type: receiptType,
      });

      let paymentMessageUrl: string | null = null;
      if (requestData.group_message_id) {
        const financeGroupId = await getWorkgroupId("Financeiro");
        paymentMessageUrl = buildTelegramMessageLink(
          financeGroupId,
          requestData.group_message_id
        );
      }

      const keyboardRows = [
        [Markup.button.url("📄 Ver Comprovante", requestData.receipt_url)],
        [
          Markup.button.url(
            "📁 Pasta de Comprovantes",
            `https://drive.google.com/drive/folders/${requestData.project.folder_id}`
          ),
        ],
        [
          Markup.button.url(
            "📊 Planilha Financeira",
            `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
          ),
        ],
      ];

      if (paymentMessageUrl) {
        keyboardRows.push([
          Markup.button.url("💰 Ver pagamento", paymentMessageUrl),
        ]);
      }

      const keyboard = Markup.inlineKeyboard(keyboardRows);

      const fileName = `${formatDate(new Date())} - ${
        requestData.project.name
      } - ${requestData.value} - ${
        requestData.supplier.nickname
      } - ${sanitizeFileName(requestData.description)}`;

      await ctx.editMessageText(
        `✅ Comprovante arquivado com sucesso!\n\n🆔 ID do comprovante: ${requestId}\n\n📝 Nome do arquivo: ${fileName}\n\n📄 Tipo: ${receiptType}`,
        keyboard
      );

      if (requestData.group_message_id) {
        try {
          const financeGroupId = await getWorkgroupId("Financeiro");
          const groupKeyboard = Markup.inlineKeyboard([
            [Markup.button.url("📄 Ver Comprovante", requestData.receipt_url)],
            [
              Markup.button.url(
                "📁 Pasta de Comprovantes",
                `https://drive.google.com/drive/folders/${requestData.project.folder_id}`
              ),
            ],
            [
              Markup.button.url(
                "📊 Planilha Financeira",
                `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
              ),
            ],
          ]);

          await ctx.telegram.editMessageReplyMarkup(
            financeGroupId,
            requestData.group_message_id,
            undefined,
            groupKeyboard.reply_markup
          );
        } catch (error: any) {
          if (
            error.description &&
            error.description.includes("message to edit not found")
          ) {
            console.log(
              "Mensagem do grupo não encontrada, pode ter sido apagada."
            );
          } else {
            console.error("Erro ao atualizar mensagem do grupo:", error);
          }
        }
      }

      if (requestData.workgroup_messages) {
        try {
          for (const [chatId, messageId] of Object.entries(
            requestData.workgroup_messages
          )) {
            const workgroupKeyboard = Markup.inlineKeyboard([
              [Markup.button.url("📄 Ver Comprovante", requestData.receipt_url)],
              [
                Markup.button.url(
                  "📊 Ver planilha",
                  `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
                ),
              ],
            ]);

            await ctx.telegram.editMessageReplyMarkup(
              chatId,
              Number(messageId),
              undefined,
              workgroupKeyboard.reply_markup
            );
          }
        } catch (error: any) {
          console.error("Erro ao atualizar mensagem do grupo de trabalho:", error);
        }
      }

      await ctx.answerCbQuery(`Tipo de comprovante definido: ${receiptType}`);
    } catch (error) {
      console.error("Erro ao processar tipo de comprovante:", error);
      await ctx.answerCbQuery("Erro ao processar tipo de comprovante.");
    }
  });
}
