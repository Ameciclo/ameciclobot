// src/callbacks/modeloCallbacks.ts
import { Context, Telegraf } from "telegraf";
import {
  copyFile,
  getFileMetadata,
  listFolders
} from "../services/google";
import { getTempData, setTempData, getCachedFolders, setCachedFolders } from "../services/firebase";
import { getPreviewTitle } from "../utils/utils";

function createFolderKeyboard(subfolders: any[], tempId: string) {
  const buttons = [
    [{ text: "📁 Pasta Raiz", callback_data: `move_doc:${tempId}:root` }]
  ];

  for (let i = 0; i < subfolders.length; i += 2) {
    const row = [];
    
    row.push({
      text: `📂 ${subfolders[i].name.substring(0, 20)}`,
      callback_data: `move_doc:${tempId}:${i}`
    });
    
    if (i + 1 < subfolders.length) {
      row.push({
        text: `📂 ${subfolders[i + 1].name.substring(0, 20)}`,
        callback_data: `move_doc:${tempId}:${i + 1}`
      });
    }
    
    buttons.push(row);
  }

  buttons.push([{ text: "🔄 Atualizar Pastas", callback_data: `refresh_folders:${tempId}` }]);
  return buttons;
}

export function registerModeloUseCallback(bot: Telegraf) {
  bot.action(/modelo_(.+)_(.+)/, async (ctx: Context) => {
    try {
      const match = (ctx as any).match;
      if (!match) {
        await ctx.answerCbQuery("Erro: Dados inválidos.");
        return;
      }
      const [, templateId, tempId] = match;
      
      const data = await getTempData(tempId);
      if (!data) {
        return ctx.answerCbQuery("Dados expirados");
      }

      const { newTitle, parentFolderId } = data;

      // Obtém os metadados do modelo
      const metadata = await getFileMetadata(templateId);
      const fullTitle = getPreviewTitle(metadata.name || "", newTitle);

      // Copia o arquivo modelo
      const copied = await copyFile(templateId, fullTitle);
      const documentId = copied.documentId || copied.id;
      if (!documentId) {
        throw new Error("Não foi possível obter o ID do documento criado.");
      }

      // Atualiza dados temporários com informações do documento criado
      await setTempData(tempId, {
        documentId,
        parentFolderId,
        documentType: "Documento",
        documentTitle: fullTitle
      }, 300);

      // Busca pastas em cache ou do Google Drive
      let subfolders = await getCachedFolders(parentFolderId);
      if (subfolders.length === 0) {
        subfolders = await listFolders(parentFolderId);
        await setCachedFolders(parentFolderId, subfolders);
      }

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      await ctx.editMessageText(
        `Documento "${fullTitle}" criado com sucesso!\nEscolha onde salvá-lo:`,
        { reply_markup: { inline_keyboard: keyboard } }
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

  // Callback para modelos antigos sem tempId (compatibilidade)
  bot.action(/^modelo_([^_]+)$/, async (ctx: Context) => {
    await ctx.answerCbQuery("Por favor, execute o comando /modelo novamente para usar a nova versão.");
  });
}
