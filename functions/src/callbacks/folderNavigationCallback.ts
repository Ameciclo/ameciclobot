import { Context, Telegraf } from "telegraf";
import { 
  FolderNode, 
  getOrCacheFolderLevel, 
  getWorkgroupConfig,
  forceUpdateFolderTree
} from "../services/folderService";
import { getTempData, setTempData } from "../services/firebase";
import { moveDocumentToFolder, uploadInvoice } from "../services/google";

interface BreadcrumbEntry {
  id: string;
  name: string;
}

export function createFolderNavigationKeyboard(
  node: FolderNode,
  tempId: string,
  showBack: boolean = false
): any[][] {
  const buttons = [];
  
  buttons.push([{
    text: `📁 Salvar em "${node.name}"`,
    callback_data: `sel_fld:${tempId}`
  }]);
  
  if (showBack) {
    buttons.push([{
      text: "⬅️ Voltar",
      callback_data: `nav_back:${tempId}`
    }]);
  }
  
  const children = Object.values(node.children || {})
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  for (let i = 0; i < children.length; i += 2) {
    const row = [];
    
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
  
  buttons.push([
    { text: "🔄 Atualizar Pastas", callback_data: `upd_fld:${tempId}` },
    { text: "📁 Ver Pasta", url: `https://drive.google.com/drive/folders/${node.id}` }
  ]);
  
  return buttons;
}

export function registerFolderNavigationCallbacks(bot: Telegraf) {
  
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
      const currentFolderId = tempData.currentFolderId;
      
      if (!currentFolderId) {
        await ctx.editMessageText("❌ Pasta atual não encontrada.");
        return;
      }

      const currentBreadcrumb: BreadcrumbEntry[] = tempData.breadcrumb || [];
      const currentFolderName = currentBreadcrumb.length > 0
        ? currentBreadcrumb[currentBreadcrumb.length - 1].name
        : getWorkgroupConfig(workgroupId)?.label || "Raiz";
      
      const currentLevel = await getOrCacheFolderLevel(workgroupId, currentFolderId, currentFolderName);
      if (!currentLevel) {
        await ctx.editMessageText("❌ Erro ao carregar pastas.");
        return;
      }
      
      const children = Object.values(currentLevel.children || {})
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
      if (childIndex >= children.length) {
        await ctx.editMessageText("❌ Pasta não encontrada.");
        return;
      }
      
      const selectedChild = children[childIndex];
      
      await ctx.editMessageText("🔄 Carregando...");
      
      const childLevel = await getOrCacheFolderLevel(workgroupId, selectedChild.id, selectedChild.name);
      if (!childLevel) {
        await ctx.editMessageText("❌ Erro ao carregar subpastas.");
        return;
      }
      
      const newBreadcrumb = [...currentBreadcrumb, { id: selectedChild.id, name: selectedChild.name }];
      
      await setTempData(tempId, {
        ...tempData,
        breadcrumb: newBreadcrumb,
        currentFolderId: selectedChild.id
      }, 300);
      
      const keyboard = createFolderNavigationKeyboard(childLevel, tempId, true);
      
      const rootName = getWorkgroupConfig(workgroupId)?.label || "Raiz";
      const breadcrumbStr = newBreadcrumb.map(b => b.name).join(' → ');
      const breadcrumb = breadcrumbStr ? ` → ${breadcrumbStr}` : '';
      const createCommand = `/criar_pasta ${selectedChild.id} [nome da pasta]`;
      
      await ctx.editMessageText(
        `Para criar pasta: <code>${createCommand}</code>\n\n📁 Navegando em: ${rootName}${breadcrumb}\nEscolha uma pasta:`,
        { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
      );
      
    } catch (error) {
      console.error("Erro na navegação de pastas:", error);
      await ctx.editMessageText("❌ Erro na navegação. Tente novamente.");
    }
  });

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
      const currentBreadcrumb: BreadcrumbEntry[] = tempData.breadcrumb || [];
      
      if (currentBreadcrumb.length === 0) {
        await ctx.editMessageText("❌ Já está na pasta raiz.");
        return;
      }
      
      const parentBreadcrumb = currentBreadcrumb.slice(0, -1);
      
      let parentFolderId: string;
      let parentFolderName: string;
      
      if (parentBreadcrumb.length === 0) {
        const groupConfig = getWorkgroupConfig(workgroupId);
        if (!groupConfig) {
          await ctx.editMessageText("❌ Grupo não configurado.");
          return;
        }
        parentFolderId = groupConfig.folderId;
        parentFolderName = groupConfig.label;
      } else {
        const parent = parentBreadcrumb[parentBreadcrumb.length - 1];
        parentFolderId = parent.id;
        parentFolderName = parent.name;
      }
      
      await ctx.editMessageText("🔄 Carregando...");
      
      const parentLevel = await getOrCacheFolderLevel(workgroupId, parentFolderId, parentFolderName);
      if (!parentLevel) {
        await ctx.editMessageText("❌ Erro ao carregar pasta anterior.");
        return;
      }
      
      await setTempData(tempId, {
        ...tempData,
        breadcrumb: parentBreadcrumb,
        currentFolderId: parentFolderId
      }, 300);
      
      const keyboard = createFolderNavigationKeyboard(parentLevel, tempId, parentBreadcrumb.length > 0);
      
      const rootName = getWorkgroupConfig(workgroupId)?.label || "Raiz";
      const breadcrumbStr = parentBreadcrumb.map(b => b.name).join(' → ');
      const breadcrumb = breadcrumbStr ? ` → ${breadcrumbStr}` : '';
      const createCommand = `/criar_pasta ${parentFolderId} [nome da pasta]`;
      
      await ctx.editMessageText(
        `Para criar pasta: <code>${createCommand}</code>\n\n📁 Navegando em: ${rootName}${breadcrumb}\nEscolha uma pasta:`,
        { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
      );
      
    } catch (error) {
      console.error("Erro ao voltar:", error);
      await ctx.editMessageText("❌ Erro na navegação. Tente novamente.");
    }
  });

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
      const groupConfig = getWorkgroupConfig(workgroupId);
      
      if (!groupConfig) {
        await ctx.editMessageText("❌ Grupo não configurado.");
        return;
      }
      
      console.log(`[upd_fld] Forçando atualização para workgroup ${workgroupId}`);
      await forceUpdateFolderTree(workgroupId);
      
      const rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label, true);
      if (!rootNode) {
        await ctx.editMessageText("❌ Erro ao carregar pastas atualizadas.");
        return;
      }
      
      await setTempData(tempId, {
        ...tempData,
        breadcrumb: [],
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

async function handleArchiveFile(ctx: Context, tempData: any, folderId: string): Promise<void> {
  try {
    const file = await ctx.telegram.getFile(tempData.fileId);
    if (!file.file_path) {
      await ctx.editMessageText("❌ Erro ao obter arquivo.");
      return;
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const fileBuffer = await response.arrayBuffer();

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
    
  } catch (error: any) {
    console.error("Erro ao arquivar:", error);
    if (error?.response?.description?.includes("file is too big")) {
      await ctx.editMessageText("❌ O arquivo excede o limite de 20MB do Telegram para download via bot.");
    } else {
      await ctx.editMessageText("❌ Erro no arquivamento. Tente novamente.");
    }
  }
}

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
