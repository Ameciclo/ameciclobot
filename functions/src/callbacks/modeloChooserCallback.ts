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
  bot.action(/modelo_(.+?)_(.+)/, async (ctx: Context) => {
    try {
      // Cast para acessar ctx.match
      const match = (ctx as any).match;
      if (!match) {
        await ctx.answerCbQuery("Erro: Dados inválidos.");
        return;
      }
      const templateId = match[1];
      const newTitleProvided = decodeURIComponent(match[2]);
      // Obtém os metadados do modelo
      const metadata = await getFileMetadata(templateId);
      let modelName = metadata.name || "";
      // Remove a tag "[modelo]" se existir e faz trim
      modelName = modelName.replace("[modelo]", "").trim();
      // Divide pelo separador " - "
      const parts = modelName.split(" - ");
      if (parts.length < 3) {
        throw new Error("Formato de nome de modelo inválido.");
      }
      const type = parts[0]; // Tipo de documento
      const currentDate = formatDate(new Date());
      const newTitle = `${type} - ${currentDate} - ${newTitleProvided}`;

      const copied = await copyFile(templateId, newTitle);
      const documentId = copied.documentId || copied.id;
      if (!documentId) {
        throw new Error("Não foi possível obter o ID do documento criado.");
      }
      // Aqui você pode definir a pasta do grupo se necessário; neste exemplo, usamos um ID fixo
      await moveDocumentToFolder(documentId, "ID_DA_PASTA_DE_DESTINO"); // substitua pelo ID correto ou lógica para determinar a pasta

      // Procura a configuração do grupo a partir do chat.id
      const chat = ctx.message?.chat;
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
      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      await ctx.editMessageText("Documento criado com sucesso...", {
        reply_markup: Markup.inlineKeyboard([
          [{ text: "🗎 Abrir Documento", url: documentUrl }],
          [{ text: "📂 Abrir Pasta do Grupo", url: groupConfig.folderUrl }],
        ]).reply_markup,
      });

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Erro ao criar documento a partir do modelo:", error);
      await ctx.reply(
        "Ocorreu um erro ao criar o documento a partir do modelo."
      );
    }
    return; // Retorno explícito para garantir que todas as rotas retornem um valor.
  });
}
