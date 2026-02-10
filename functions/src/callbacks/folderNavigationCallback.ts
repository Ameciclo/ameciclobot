import { Context, Telegraf } from "telegraf";
import { 
  FolderNode, 
  getFolderTree, 
  updateFolderTree, 
  navigateToPath
} from "../services/folderService";
import { getTempData } from "../services/firebase";
import { moveDocumentToFolder, uploadInvoice } from "../services/google";

/**
 * Cria teclado de navegação hierárquica de pastas
 */
export function createFolderNavigationKeyboard(
  node: FolderNode,
  tempId: string,
  currentPath: string = ""
): any[][] {
  const buttons = [];
  
  // Botão "Selecionar esta pasta"
  buttons.push([{
    text: `📁 Salvar em "${node.name}"`,
    callback_data: `select_folder:${tempId}:${node.id}`
  }]);
  
  // Botão voltar (se não for raiz)
  if (currentPath) {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    buttons.push([{
      text: "⬅️ Voltar",
      callback_data: `nav_folder:${tempId}:${parentPath}`
    }]);
  }
  
  // Subpastas (2 por linha)
  const children = Object.values(node.children);
  for (let i = 0; i < children.length; i += 2) {
    const row = [];
    
    row.push({
      text: `📂 ${children[i].name.substring(0, 20)}`,
      callback_data: `nav_folder:${tempId}:${children[i].path}`
    });
    
    if (i + 1 < children.length) {
      row.push({
        text: `📂 ${children[i + 1].name.substring(0, 20)}`,
        callback_data: `nav_folder:${tempId}:${children[i + 1].path}`
      });
    }
    
    buttons.push(row);
  }
  
  // Botão atualizar
  buttons.push([{
    text: "🔄 Atualizar Pastas",
    callback_data: `refresh_folders:${tempId}`
  }]);
  
  return buttons;
}

/**
 * Registra callbacks de navegação de pastas
 */
export function registerFolderNavigationCallbacks(bot: Telegraf) {
  
  // Navegação entre pastas
  bot.action(/^nav_folder:(.+):(.*)$/, async (ctx) => {
    try {
      const tempId = ctx.match[1];
      const path = ctx.match[2] ? ctx.match[2].split('/').filter(p => p) : [];
      
      await ctx.answerCbQuery();
      
      const tempData = await getTempData(tempId);
      if (!tempData) {
        await ctx.editMessageText("❌ Sessão expirada. Tente novamente.");
        return;
      }
      
      const workgroupId = tempData.workgroupId || String(ctx.chat?.id);
      const rootNode = await getFolderTree(workgroupId);
      
      if (!rootNode) {
        await ctx.editMessageText("❌ Estrutura de pastas não encontrada.");
        return;
      }
      
      const currentNode = navigateToPath(rootNode, path);
      const keyboard = createFolderNavigationKeyboard(currentNode, tempId, path.join('/'));
      
      const breadcrumb = path.length > 0 ? ` > ${path.join(' > ')}` : '';
      
      await ctx.editMessageText(
        `📁 Navegando em: ${rootNode.name}${breadcrumb}\nEscolha uma pasta:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
      
    } catch (error) {
      console.error("Erro na navegação de pastas:", error);
      await ctx.editMessageText("❌ Erro na navegação. Tente novamente.");
    }
  });

  // Seleção final da pasta
  bot.action(/^select_folder:(.+):(.+)$/, async (ctx) => {
    try {
      const tempId = ctx.match[1];
      const folderId = ctx.match[2];
      
      await ctx.answerCbQuery();
      await ctx.editMessageText("🔄 Processando...");
      
      const tempData = await getTempData(tempId);
      if (!tempData) {
        await ctx.editMessageText("❌ Sessão expirada. Tente novamente.");
        return;
      }
      
      if (tempData.mode === 'archive') {
        // Modo arquivar
        await handleArchiveFile(ctx, tempData, folderId);
      } else {
        // Modo criar documento
        await handleMoveDocument(ctx, tempData, folderId);
      }
      
    } catch (error) {
      console.error("Erro ao selecionar pasta:", error);
      await ctx.editMessageText("❌ Erro ao processar. Tente novamente.");
    }
  });

  // Atualizar estrutura de pastas
  bot.action(/^refresh_folders:(.+)$/, async (ctx) => {
    try {
      const tempId = ctx.match[1];
      
      await ctx.answerCbQuery();
      await ctx.editMessageText("🔄 Atualizando estrutura de pastas...");
      
      const tempData = await getTempData(tempId);
      if (!tempData) {
        await ctx.editMessageText("❌ Sessão expirada. Tente novamente.");
        return;
      }
      
      const workgroupId = tempData.workgroupId || String(ctx.chat?.id);
      await updateFolderTree(workgroupId);
      
      const rootNode = await getFolderTree(workgroupId);
      if (!rootNode) {
        await ctx.editMessageText("❌ Erro ao carregar pastas atualizadas.");
        return;
      }
      
      const keyboard = createFolderNavigationKeyboard(rootNode, tempId);
      
      await ctx.editMessageText(
        "✅ Pastas atualizadas!\n📁 Escolha uma pasta:",
        { reply_markup: { inline_keyboard: keyboard } }
      );
      
    } catch (error) {
      console.error("Erro ao atualizar pastas:", error);
      await ctx.editMessageText("❌ Erro na atualização. Tente novamente.");
    }
  });
}

/**
 * Processa arquivamento de arquivo
 */
async function handleArchiveFile(ctx: Context, tempData: any, folderId: string): Promise<void> {
  try {
    // Obtém o arquivo do Telegram
    const file = await ctx.telegram.getFile(tempData.fileId);
    if (!file.file_path) {
      await ctx.editMessageText("❌ Erro ao obter arquivo.");
      return;
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const fileBuffer = await response.arrayBuffer();

    // Faz upload para Google Drive
    const uploadResponse = await uploadInvoice(
      fileBuffer,
      tempData.fileName,
      folderId
    );

    if (!uploadResponse) {
      await ctx.editMessageText("❌ Erro no upload. Tente novamente.");
      return;
    }

    await ctx.editMessageText(
      `✅ Arquivo arquivado com sucesso!\n\n📝 ${tempData.fileName}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📄 Ver Arquivo", url: uploadResponse }],
            [{ text: "📁 Abrir Pasta", url: `https://drive.google.com/drive/folders/${folderId}` }]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error("Erro ao arquivar:", error);
    await ctx.editMessageText("❌ Erro no arquivamento. Tente novamente.");
  }
}

/**
 * Processa movimentação de documento criado
 */
async function handleMoveDocument(ctx: Context, tempData: any, folderId: string) {
  try {
    await moveDocumentToFolder(tempData.documentId, folderId);
    
    const documentUrl = getDocumentUrl(tempData.documentType, tempData.documentId);
    
    await ctx.editMessageText(
      `✅ ${tempData.documentType} movido com sucesso!\n\n📝 ${tempData.documentTitle}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: `📄 Abrir ${tempData.documentType}`, url: documentUrl }],
            [{ text: "📁 Abrir Pasta", url: `https://drive.google.com/drive/folders/${folderId}` }]
          ]
        }
      }
    );
    
  } catch (error) {
    console.error("Erro ao mover documento:", error);
    await ctx.editMessageText("❌ Erro ao mover documento. Tente novamente.");
  }
}

/**
 * Gera URL do documento baseado no tipo
 */
function getDocumentUrl(documentType: string, documentId: string): string {
  switch (documentType.toLowerCase()) {
    case 'documento':
      return `https://docs.google.com/document/d/${documentId}/edit`;
    case 'apresentação':
      return `https://docs.google.com/presentation/d/${documentId}/edit`;
    case 'planilha':
      return `https://docs.google.com/spreadsheets/d/${documentId}/edit`;
    case 'formulário':
      return `https://docs.google.com/forms/d/${documentId}/edit`;
    default:
      return `https://drive.google.com/file/d/${documentId}/view`;
  }
}