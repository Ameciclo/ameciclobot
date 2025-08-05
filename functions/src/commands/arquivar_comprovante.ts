import { Context, Markup, Telegraf } from "telegraf";
import { getRequestData, updatePaymentRequest } from "../services/firebase";
import { uploadInvoice } from "../services/google";
import { formatDate } from "../utils/utils";

// Função para sanitizar o nome do arquivo
function sanitizeFileName(text: string, maxLength = 50): string {
  // Remove caracteres inválidos para nomes de arquivo
  const sanitized = text
    .replace(/[\\/:*?"<>|]/g, "_") // Substitui caracteres inválidos por underscore
    .replace(/\r?\n|\r/g, " ") // Substitui quebras de linha por espaços
    .trim();

  // Limita o tamanho
  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

export async function registerArquivarComprovanteCommand(bot: Telegraf) {
  // Usando hears para capturar o comando com ou sem o sufixo @botname
  bot.command("arquivar_comprovante", async (ctx: Context) => {
    try {
      // Verifica se é uma resposta a uma mensagem
      if (
        !ctx.message ||
        !("reply_to_message" in ctx.message) ||
        !ctx.message.reply_to_message
      ) {
        await ctx.reply(
          "Este comando deve ser usado como resposta a uma mensagem com um arquivo de comprovante."
        );
        return;
      }

      // Verifica se a mensagem possui texto ou se está respondendo a uma mensagem com texto
      const document =
        ctx.message.reply_to_message &&
        "document" in ctx.message.reply_to_message
          ? ctx.message.reply_to_message.document
          : undefined;

      if (!document) {
        await ctx.reply(
          "Nenhum arquivo ou imagem encontrado na mensagem respondida."
        );
        return;
      }

      // Extrai o ID da transação do comando
      const text = ctx.text || "";
      // Regex atualizado para capturar o ID mesmo com o sufixo @botname
      const match = text.match(
        /\/arquivar_comprovante(?:@\w+)?\s+([a-zA-Z0-9_-]+)/
      );

      if (!match || !match[1]) {
        await ctx.reply(
          "Formato incorreto. Use: /arquivar_comprovante [id da transação]"
        );
        return;
      }

      const requestId = match[1];

      // Busca os dados da solicitação no Firebase
      const requestData = await getRequestData(requestId);

      if (!requestData) {
        await ctx.reply(`Solicitação com ID ${requestId} não encontrada.`);
        return;
      }

      // Verifica se o projeto tem um folderId configurado
      const folderId = requestData.project.folder_id;
      if (!folderId) {
        await ctx.reply(
          `O projeto ${requestData.project.name} não tem uma pasta configurada no Google Drive.`
        );
        return;
      }

      // Obtém o arquivo do Telegram
      const fileId = document.file_id;
      const file = await ctx.telegram.getFile(fileId);

      if (!file.file_path) {
        await ctx.reply("Não foi possível obter o arquivo.");
        return;
      }

      // Obtém a URL do arquivo
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      // Baixa o arquivo
      const response = await fetch(fileUrl);
      const fileBuffer = (await response.arrayBuffer()) as Buffer;

      // Prepara o nome do arquivo
      const date = formatDate(new Date());
      const fileName = `${date} - ${requestData.project.name} - ${
        requestData.value
      } - ${requestData.supplier.nickname} - ${sanitizeFileName(
        requestData.description
      )}`;

      const uploadResponse = await uploadInvoice(
        fileBuffer,
        fileName,
        folderId
      );

      if (uploadResponse === null || uploadResponse === undefined) {
        await ctx.reply(
          "Ocorreu um erro ao fazer o upload do arquivo. Por favor, tente novamente."
        );
        return;
      }

      // Atualiza a solicitação com o link do comprovante
      await updatePaymentRequest(requestId, {
        receipt_url: uploadResponse,
      });

      // Cria os botões para os links e seleção de tipo
      const keyboard = Markup.inlineKeyboard([
        // [Markup.button.url("📄 Ver Comprovante", uploadResponse)],
        // [
        //   Markup.button.url(
        //     "📁 Pasta de Comprovantes",
        //     `https://drive.google.com/drive/folders/${folderId}`
        //   ),
        // ],
        // [
        //   Markup.button.url(
        //     "📊 Planilha Financeira",
        //     `https://docs.google.com/spreadsheets/d/${requestData.project.spreadsheet_id}`
        //   ),
        // ],
        [
          Markup.button.callback("Nota fiscal", `rt_${requestId}_nf`),
          Markup.button.callback("Cupom Fiscal", `rt_${requestId}_cf`),
          Markup.button.callback("Recibo", `rt_${requestId}_r`),
          Markup.button.callback("Outro", `rt_${requestId}_o`),
        ],
      ]);

      // Responde com o nome do arquivo e os botões
      await ctx.reply(
        `✅ Comprovante arquivado com sucesso!\n\n📝 Nome do arquivo: ${fileName}\n\n📄 Qual o tipo de comprovante?`,
        keyboard
      );
    } catch (error) {
      console.error("Erro ao arquivar comprovante:", error);
      await ctx.reply(
        "Ocorreu um erro ao processar o comprovante. Por favor, tente novamente."
      );
    }
  });
}

export const arquivarComprovanteCommand = {
  register: registerArquivarComprovanteCommand,
  name: () => "/arquivar_comprovante",
  help: () =>
    "Use o comando `/arquivar_comprovante [id da transação]` como resposta a uma mensagem com um arquivo de comprovante para arquivá-lo no Google Drive.",
  description: () => "📎 Arquiva um comprovante de pagamento no Google Drive.",
};
