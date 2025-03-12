// src/callbacks/modeloCallbacks.ts
import { Context, Telegraf, Markup } from "telegraf";
import {
  copyFile,
  moveDocumentToFolder,
  getFileMetadata,
} from "../services/google";
import workgroups from "../credentials/workgroupsfolders.json";
import { getPreviewTitle } from "../utils/utils";

export function registerModeloUseCallback(bot: Telegraf) {
  bot.action(/modelo_(.+)/, async (ctx: Context) => {
    try {
      // A callback_data é do formato: "modelo_<templateId>"
      const match = (ctx as any).match;
      if (!match) {
        await ctx.answerCbQuery("Erro: Dados inválidos.");
        return;
      }
      const templateId = match[1];
      const message = ctx.callbackQuery?.message;
      if (!message || !("text" in message)) {
        await ctx.reply(
          "Não foi possível recuperar o texto da mensagem original."
        );
        return;
      }
      const originalMessage = message.text;
      const titleMatch = originalMessage.match(/Título do documento:\s*(.+)/);
      if (!titleMatch) {
        await ctx.reply(
          "Não foi possível extrair o título do documento da mensagem."
        );
        return;
      }
      const finalTitleFromMsg = titleMatch[1].trim(); // Ex: "2025.02.19 - Relatório Mensal"

      // Obtém os metadados do modelo
      const metadata = await getFileMetadata(templateId);

      const newTitle = getPreviewTitle(metadata.name || "", finalTitleFromMsg);

      // Copia o arquivo modelo com o novo título
      const copied = await copyFile(templateId, newTitle);
      const documentId = copied.documentId || copied.id;
      if (!documentId) {
        throw new Error("Não foi possível obter o ID do documento criado.");
      }

      // Determina a pasta do grupo a partir do chat.id
      const chat = ctx.callbackQuery?.message?.chat;
      if (!chat) {
        await ctx.reply(
          "Não foi possível identificar as informações da mensagem."
        );
        return;
      }
      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        await ctx.reply("Não foi possível identificar o grupo de Trabalho.");
        return;
      }
      await moveDocumentToFolder(documentId, groupConfig.folderId);

      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      await ctx.editMessageText(
        `Documento clonado com sucesso com o título:\n${newTitle}`,
        {
          reply_markup: Markup.inlineKeyboard([
            [{ text: "🗎 Abrir Documento", url: documentUrl }],
            [{ text: "📂 Abrir Pasta do Grupo", url: groupConfig.folderUrl }],
          ]).reply_markup,
        }
      );
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Erro ao criar documento a partir do modelo:", error);
      await ctx.reply(
        "Ocorreu um erro ao criar o documento a partir do modelo."
      );
    }
    return;
  });
}
