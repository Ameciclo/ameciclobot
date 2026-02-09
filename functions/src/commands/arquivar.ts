import { Context, Markup, Telegraf } from "telegraf";
import { uploadInvoice } from "../services/google";
import { setTempData, getTempData } from "../services/firebase";
import workgroups from "../credentials/workgroupsfolders.json";

// Função para sanitizar o nome do arquivo
function sanitizeFileName(text: string, maxLength = 50): string {
  const sanitized = text
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

// Função para obter nome do grupo
function getGroupName(chatId: number): string | null {
  const group = workgroups.find((g: any) => g.value === chatId);
  return group ? group.label : null;
}

// Função para obter folder ID do grupo
function getGroupFolderId(chatId: number): string | null {
  const group = workgroups.find((g: any) => g.value === chatId);
  return group ? group.folderId : null;
}

export async function registerArquivarCommand(bot: Telegraf) {
  bot.command("arquivar", async (ctx: Context) => {
    try {
      // Verifica se é um grupo
      if (ctx.chat?.type === "private") {
        await ctx.reply("Este comando só funciona em grupos.");
        return;
      }

      // Verifica se é resposta a mensagem com documento
      if (
        !ctx.message ||
        !("reply_to_message" in ctx.message) ||
        !ctx.message.reply_to_message
      ) {
        await ctx.reply(
          "Este comando deve ser usado como resposta a uma mensagem com um arquivo."
        );
        return;
      }

      const document =
        ctx.message.reply_to_message &&
        "document" in ctx.message.reply_to_message
          ? ctx.message.reply_to_message.document
          : undefined;

      if (!document) {
        await ctx.reply("Nenhum arquivo encontrado na mensagem respondida.");
        return;
      }

      // Verifica tamanho do arquivo (50MB = 52428800 bytes)
      if (document.file_size && document.file_size > 52428800) {
        await ctx.reply("O arquivo deve ter no máximo 50MB.");
        return;
      }

      // Verifica se o grupo está configurado
      const chatId = ctx.chat.id;
      const groupName = getGroupName(chatId);
      const folderId = getGroupFolderId(chatId);

      if (!groupName || !folderId) {
        await ctx.reply("Este grupo não está configurado para arquivamento.");
        return;
      }

      // Extrai nome customizado do comando
      const text = ctx.text || "";
      const customName = text.replace(/\/arquivar(?:@\w+)?\s*/, "").trim();

      // Prepara dados do arquivo
      const originalName = document.file_name || "arquivo";
      const extension = originalName.includes(".") 
        ? originalName.substring(originalName.lastIndexOf("."))
        : "";
      
      const baseName = customName || originalName.replace(extension, "");
      const sanitizedName = sanitizeFileName(baseName);
      
      const date = new Date().toISOString().split("T")[0].replace(/-/g, ".");
      const finalName = `${groupName} - ${date} - ${sanitizedName}${extension}`;

      // Armazena dados temporariamente
      const messageId = ctx.message.message_id;
      await setTempData(`archive_${chatId}_${messageId}`, {
        fileId: document.file_id,
        fileName: finalName,
        folderId: folderId
      }, 300);

      // Confirma o arquivamento
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("✅ Confirmar", `archive_confirm:${messageId}`)],
        [Markup.button.callback("❌ Cancelar", `archive_cancel:${messageId}`)]
      ]);

      await ctx.reply(
        `📁 Arquivar no grupo ${groupName}:\n\n📝 Nome: ${finalName}\n\nConfirmar?`,
        keyboard
      );

    } catch (error) {
      console.error("Erro no comando arquivar:", error);
      await ctx.reply("Ocorreu um erro. Tente novamente.");
    }
  });

  // Handler para confirmar arquivamento
  bot.action(/^archive_confirm:(\d+)$/, async (ctx) => {
    try {
      const messageId = ctx.match[1];
      const chatId = ctx.chat?.id;
      
      if (!chatId) return;

      const data = await getTempData(`archive_${chatId}_${messageId}`);
      if (!data) {
        await ctx.editMessageText("❌ Sessão expirada. Tente novamente.");
        return;
      }

      await ctx.editMessageText("🔄 Fazendo upload...");

      // Obtém o arquivo
      const file = await ctx.telegram.getFile(data.fileId);
      if (!file.file_path) {
        await ctx.editMessageText("❌ Erro ao obter arquivo.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const fileBuffer = await response.arrayBuffer();

      // Faz upload
      const uploadResponse = await uploadInvoice(
        fileBuffer,
        data.fileName,
        data.folderId
      );

      if (!uploadResponse) {
        await ctx.editMessageText("❌ Erro no upload. Tente novamente.");
        return;
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url("📄 Ver Arquivo", uploadResponse)],
        [Markup.button.url("📁 Abrir Pasta", `https://drive.google.com/drive/folders/${data.folderId}`)]
      ]);

      await ctx.editMessageText(
        `✅ Arquivo arquivado com sucesso!\n\n📝 ${data.fileName}`,
        keyboard
      );

    } catch (error) {
      console.error("Erro ao confirmar arquivamento:", error);
      await ctx.editMessageText("❌ Erro no upload. Tente novamente.");
    }
    
    await ctx.answerCbQuery();
  });

  // Handler para cancelar
  bot.action(/^archive_cancel:(\d+)$/, async (ctx) => {
    await ctx.editMessageText("❌ Arquivamento cancelado.");
    await ctx.answerCbQuery();
  });
}

export const arquivarCommand = {
  register: registerArquivarCommand,
  name: () => "/arquivar",
  help: () => "Use `/arquivar` como resposta a um arquivo para arquivá-lo no Google Drive do grupo. Opcionalmente use `/arquivar [novo nome]` para renomear.",
  description: () => "📁 Arquiva arquivos no Google Drive com nomenclatura padronizada.",
};