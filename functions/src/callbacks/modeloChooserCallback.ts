// src/callbacks/modeloCallbacks.ts
import { Context, Telegraf, Markup } from "telegraf";
import {
  copyFile,
  moveDocumentToFolder,
  getFileMetadata,
} from "../services/google";
import workgroups from "../config/workgroupsfolders.json";

// Função auxiliar para formatar data no formato AAAA.MM.DD
function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = ("0" + (date.getMonth() + 1)).slice(-2);
  const dd = ("0" + date.getDate()).slice(-2);
  return `${yyyy}.${mm}.${dd}`;
}

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
      let modelName = metadata.name || "";
      // Remove a tag "[modelo]" se existir e faz trim
      modelName = modelName.replace("[modelo]", "").trim();
      // Supomos que o nome do modelo tem o formato: "Tipo de documento - 2025.00.00 - Alguma coisa"
      const parts = modelName.split(" - ");
      if (parts.length < 3) {
        throw new Error("Formato de nome de modelo inválido.");
      }
      const type = parts[0]; // Exemplo: "Ata", "Requerimento", etc.
      const currentDate = formatDate(new Date());
      // Constrói o novo título: "Tipo de documento - YYYY.MM.DD - Título do documento"
      const newTitle = `${type} - ${currentDate} - ${finalTitleFromMsg}`;

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
