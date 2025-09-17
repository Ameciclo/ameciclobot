import { Context, Telegraf } from "telegraf";
import { moveDocumentToFolder, listFolders } from "../services/google";
import { getTempData, getCachedFolders, setCachedFolders } from "../services/firebase";

export function registerFolderChooserCallback(bot: Telegraf) {
  bot.action(/^choose_folder:(.+)$/, async (ctx: Context) => {
    try {
      const tempId = (ctx as any).match![1];
      const data = await getTempData(tempId);
      if (!data) {
        return ctx.answerCbQuery("Dados expirados");
      }

      const { parentFolderId, documentType } = data;
      let subfolders = await getCachedFolders(parentFolderId);
      
      if (subfolders.length === 0) {
        subfolders = await listFolders(parentFolderId);
        await setCachedFolders(parentFolderId, subfolders);
      }

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      return ctx.editMessageText(
        `Escolha onde mover o ${documentType.toLowerCase()}:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error("Erro no callback de escolha de pasta:", error);
      return ctx.answerCbQuery("Erro ao listar pastas");
    }
  });

  bot.action(/^refresh_folders:(.+)$/, async (ctx: Context) => {
    try {
      const tempId = (ctx as any).match![1];
      const data = await getTempData(tempId);
      if (!data) {
        return ctx.answerCbQuery("Dados expirados");
      }

      const { parentFolderId, documentType } = data;
      const subfolders = await listFolders(parentFolderId);
      await setCachedFolders(parentFolderId, subfolders);

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      return ctx.editMessageText(
        `Escolha onde mover o ${documentType.toLowerCase()}:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error("Erro ao atualizar pastas:", error);
      return ctx.answerCbQuery("Erro ao atualizar pastas");
    }
  });

  bot.action(/^move_doc:(.+):(.+)$/, async (ctx: Context) => {
    try {
      const [, tempId, folderIndex] = (ctx as any).match!;
      const data = await getTempData(tempId);
      if (!data) {
        return ctx.answerCbQuery("Dados expirados");
      }

      const { documentId, parentFolderId, documentType, documentTitle } = data;
      let folderId = parentFolderId;
      let folderName = "Pasta Raiz";

      if (folderIndex !== "root") {
        const folders = await getCachedFolders(parentFolderId);
        if (folders && folders[parseInt(folderIndex)]) {
          folderId = folders[parseInt(folderIndex)].id;
          folderName = folders[parseInt(folderIndex)].name;
        }
      }
      
      await moveDocumentToFolder(documentId, folderId);
      
      const documentUrl = getDocumentUrl(documentType, documentId);
      const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
      
      return ctx.editMessageText(
        `${documentType} "${documentTitle}" movido para "${folderName}" com sucesso!`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: `📄 Abrir ${documentType}`, url: documentUrl }],
              [{ text: "📂 Abrir Pasta", url: folderUrl }]
            ]
          }
        }
      );
    } catch (error) {
      console.error("Erro ao mover documento:", error);
      return ctx.answerCbQuery("Erro ao mover documento");
    }
  });
}

function createFolderKeyboard(subfolders: any[], tempId: string) {
  const buttons = [
    [{ text: "📁 Pasta Raiz", callback_data: `move_doc:${tempId}:root` }]
  ];

  // Cria botões das pastas em duas colunas se necessário
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

  // Botão de atualizar pastas
  buttons.push([{ text: "🔄 Atualizar Pastas", callback_data: `refresh_folders:${tempId}` }]);

  return buttons;
}

function getDocumentUrl(documentType: string, documentId: string): string {
  const baseUrls = {
    "Documento": "https://docs.google.com/document/d/",
    "Planilha": "https://docs.google.com/spreadsheets/d/",
    "Formulário": "https://docs.google.com/forms/d/",
    "Apresentação": "https://docs.google.com/presentation/d/"
  };
  
  return `${baseUrls[documentType as keyof typeof baseUrls]}${documentId}/edit`;
}