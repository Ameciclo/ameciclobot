import { Context, Telegraf } from "telegraf";
import { 
  FolderNode, 
  getFolderTree, 
  updateFolderTree
} from "../services/folderService";
import { getTempData, setTempData } from "../services/firebase";
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
    callback_data: `sel_fld:${tempId}`
  }]);
  
  // Botão voltar (se não for raiz)
  if (currentPath) {
    buttons.push([{
      text: "⬅️ Voltar",
      callback_data: `nav_back:${tempId}`
    }]);
  }
  
  // Subpastas (2 por linha) - usando índices
  const children = Object.values(node.children || {});
  for (let i = 0; i < children.length; i += 2) {
    const row = [];
    
    // Só adiciona botão se a pasta tem filhos ou é navegável
    const child1 = children[i];
    if (child1) {
      row.push({
        text: `📂 ${child1.name.substring(0, 20)}`,
        callback_data: `nav_to:${tempId}:${i}`
      });
    }
    
    if (i + 1 < children.length) {
      const child2 = children[i + 1];
      if (child2) {
        row.push({
          text: `📂 ${child2.name.substring(0, 20)}`,
          callback_data: `nav_to:${tempId}:${i + 1}`
        });
      }
    }
    
    if (row.length > 0) {
      buttons.push(row);
    }
  }
  
  // Botão atualizar e ver pasta
  buttons.push([
    { text: "🔄 Atualizar Pastas", callback_data: `upd_fld:${tempId}` },
    { text: "📁 Ver Pasta", url: `https://drive.google.com/drive/folders/${node.id}` }
  ]);
  
  return buttons;
}

/**
 * Registra callbacks de navegação de pastas
 */
export function registerFolderNavigationCallbacks(bot: Telegraf) {
  
  // Navegação para subpasta por índice
  bot.action(/^nav_to:(.+):(\d+)$/, async (ctx) => {
    try {
      const tempId = ctx.match[1];
      const childIndex = parseInt(ctx.match[2]);
      
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
      
      // Navega para o nó atual baseado no path armazenado
      const currentPath = tempData.currentPath || [];
      let currentNode = rootNode;
      for (const pathPart of currentPath) {
        currentNode = currentNode.children?.[pathPart];
        if (!currentNode) {
          await ctx.editMessageText("❌ Pasta não encontrada.");
          return;
        }
      }
      
      // Obtém a pasta filha pelo índice
      const children = Object.values(currentNode.children || {});
      if (childIndex >= children.length) {
        await ctx.editMessageText("❌ Pasta não encontrada.");
        return;
      }
      
      const selectedChild = children[childIndex];
      const newPath = [...currentPath, Object.keys(currentNode.children || {})[childIndex]];
      
      // Atualiza o path no tempData
      await setTempData(tempId, {
        ...tempData,
        currentPath: newPath,
        currentFolderId: selectedChild.id
      }, 300);
      
      const keyboard = createFolderNavigationKeyboard(selectedChild, tempId, newPath.join('/'));
      
      // Constrói breadcrumb com nomes das pastas
      const breadcrumbNames = [];
      let tempNode = rootNode;
      for (const pathPart of newPath) {
        tempNode = tempNode.children?.[pathPart];
        if (tempNode) {
          breadcrumbNames.push(tempNode.name);
        }
      }
      const breadcrumb = breadcrumbNames.length > 0 ? ` → ${breadcrumbNames.join(' → ')}` : '';
      const createCommand = `/criar_pasta ${selectedChild.id} [nome da pasta]`;
      
      await ctx.editMessageText(
        `Para criar pasta: <code>${createCommand}</code>\n\n📁 Navegando em: ${rootNode.name}${breadcrumb}\nEscolha uma pasta:`,
        { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
      );
      
    } catch (error) {
      console.error("Erro na navegação de pastas:", error);
      await ctx.editMessageText("❌ Erro na navegação. Tente novamente.");
    }
  });

  // Voltar para pasta pai
  bot.action(/^nav_back:(.+)$/, async (ctx) => {
    try {
      const tempId = ctx.match[1];
      
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
      
      const currentPath = tempData.currentPath || [];
      const parentPath = currentPath.slice(0, -1);
      
      // Navega para o nó pai
      let parentNode = rootNode;
      for (const pathPart of parentPath) {
        parentNode = parentNode.children?.[pathPart];
      }
      
      // Atualiza o path no tempData
      await setTempData(tempId, {
        ...tempData,
        currentPath: parentPath,
        currentFolderId: parentNode.id
      }, 300);
      
      const keyboard = createFolderNavigationKeyboard(parentNode, tempId, parentPath.join('/'));
      
      // Constrói breadcrumb com nomes das pastas
      const breadcrumbNames = [];
      let tempNode = rootNode;
      for (const pathPart of parentPath) {
        tempNode = tempNode.children?.[pathPart];
        if (tempNode) {
          breadcrumbNames.push(tempNode.name);
        }
      }
      const breadcrumb = breadcrumbNames.length > 0 ? ` → ${breadcrumbNames.join(' → ')}` : '';
      const createCommand = `/criar_pasta ${parentNode.id} [nome da pasta]`;
      
      await ctx.editMessageText(
        `Para criar pasta: <code>${createCommand}</code>\n\n📁 Navegando em: ${rootNode.name}${breadcrumb}\nEscolha uma pasta:`,
        { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
      );
      
    } catch (error) {
      console.error("Erro ao voltar:", error);
      await ctx.editMessageText("❌ Erro na navegação. Tente novamente.");
    }
  });

  // Seleção final da pasta
  bot.action(/^sel_fld:(.+)$/, async (ctx) => {
    try {
      const tempId = ctx.match[1];
      
      await ctx.answerCbQuery();
      await ctx.editMessageText("🔄 Processando...");
      
      const tempData = await getTempData(tempId);
      if (!tempData) {
        await ctx.editMessageText("❌ Sessão expirada. Tente novamente.");
        return;
      }
      
      const folderId = tempData.currentFolderId || tempData.workgroupId;
      
      if (tempData.mode === 'archive') {
        await handleArchiveFile(ctx, tempData, folderId);
      } else {
        await handleMoveDocument(ctx, tempData, folderId);
      }
      
    } catch (error) {
      console.error("Erro ao selecionar pasta:", error);
      await ctx.editMessageText("❌ Erro ao processar. Tente novamente.");
    }
  });

  // Atualizar estrutura de pastas
  bot.action(/^upd_fld:(.+)$/, async (ctx) => {
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
      
      // Reset para pasta raiz
      await setTempData(tempId, {
        ...tempData,
        currentPath: [],
        currentFolderId: rootNode.id
      }, 300);
      
      const keyboard = createFolderNavigationKeyboard(rootNode, tempId);
      
      const createCommand = `/criar_pasta ${rootNode.id} [nome da pasta]`;
      
      await ctx.editMessageText(
        `Para criar pasta: <code>${createCommand}</code>\n\n✅ Pastas atualizadas!\n📁 Escolha uma pasta:`,
        { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
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