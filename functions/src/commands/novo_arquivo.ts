import { Context, Telegraf } from "telegraf";
import { setTempData } from "../services/firebase";
import { getOrCacheFolderLevel, forceUpdateFolderTree, getWorkgroupConfig } from "../services/folderService";
import { createFolderNavigationKeyboard } from "../callbacks/folderNavigationCallback";
import { createDocument, createPresentation, createForm, createSheet, uploadInvoice } from "../services/google";

// Função para sanitizar nome do arquivo
function sanitizeFileName(text: string, maxLength = 50): string {
  const sanitized = text
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\r?\n|\r/g, " ")
    .trim();

  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

// Função para gerar nome do arquivo no modo arquivar
function generateArchiveFileName(document: any, ctx: Context, customName?: string): string {
  const groupConfig = getWorkgroupConfig(String(ctx.chat?.id || 0));
  const groupName = groupConfig?.label || "Arquivo";
  
  const originalName = document.file_name || "arquivo";
  const extension = originalName.includes(".")
    ? originalName.substring(originalName.lastIndexOf("."))
    : "";
  
  const baseName = customName || originalName.replace(extension, "");
  const sanitizedName = sanitizeFileName(baseName);
  
  const date = new Date().toISOString().split("T")[0].replace(/-/g, ".");
  return `${groupName} - ${date} - ${sanitizedName}${extension}`;
}

// Função para quando não tem título
async function showNoTitleOptions(ctx: Context) {
  const buttons = [
    [{ text: "🔄 Atualizar Pastas", callback_data: "update_folders_notitle" }],
    [{ text: "❌ Cancelar", callback_data: "cancel_action" }]
  ];
  
  return ctx.reply(
    "Por favor, forneça um título para o arquivo.\nExemplo: `/novo_arquivo Nome do Arquivo`\n\nOu escolha uma opção:",
    { reply_markup: { inline_keyboard: buttons } }
  );
}

// Modo arquivar integrado
async function handleArquivarMode(ctx: Context) {
  if (!ctx.message || !("reply_to_message" in ctx.message) || !ctx.message.reply_to_message) {
    return ctx.reply("Este comando deve ser usado como resposta a uma mensagem com arquivo.");
  }

  const document = "document" in ctx.message.reply_to_message
    ? ctx.message.reply_to_message.document
    : undefined;

  if (!document) {
    return ctx.reply("Nenhum arquivo encontrado na mensagem respondida.");
  }

  // Verifica tamanho do arquivo (50MB)
  if (document.file_size && document.file_size > 52428800) {
    return ctx.reply("O arquivo deve ter no máximo 50MB.");
  }

  // Verifica se é grupo configurado
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return ctx.reply("Erro: não foi possível identificar o chat.");
  }

  const groupConfig = getWorkgroupConfig(chatId);
  if (!groupConfig) {
    return ctx.reply("Este grupo não está configurado para arquivamento.");
  }

  // Extrai nome customizado do comando
  const text = ctx.text || "";
  const customName = text.replace(/\/novo_arquivo(?:@\w+)?\s*/, "").trim();
  
  // Verifica se o primeiro token eh um folder ID para arquivamento direto
  const folderIdRegex = /^[a-zA-Z0-9_-]{25,}$/;
  const parts = customName ? customName.split(/\s+/) : [];
  const maybeFolderId = parts[0];
  
  if (maybeFolderId && folderIdRegex.test(maybeFolderId)) {
    const directFolderId = maybeFolderId;
    const directCustomName = parts.slice(1).join(' ').trim() || undefined;
    const fileName = generateArchiveFileName(document, ctx, directCustomName);
    
    const statusMsg = await ctx.reply("🔄 Arquivando diretamente...");
    
    try {
      const file = await ctx.telegram.getFile(document.file_id);
      if (!file.file_path) {
        await ctx.telegram.editMessageText(chatId, statusMsg.message_id, undefined, "❌ Erro ao obter arquivo.");
        return;
      }
      
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const fileBuffer = await response.arrayBuffer();
      
      const uploadResponse = await uploadInvoice(fileBuffer, fileName, directFolderId);
      
      if (!uploadResponse) {
        await ctx.telegram.editMessageText(chatId, statusMsg.message_id, undefined, "❌ Erro no upload. Tente novamente.");
        return;
      }
      
      await ctx.telegram.editMessageText(chatId, statusMsg.message_id, undefined,
        `✅ Arquivo arquivado com sucesso!\n\n📝 ${fileName}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📄 Ver Arquivo", url: uploadResponse }],
              [{ text: "📁 Abrir Pasta", url: `https://drive.google.com/drive/folders/${directFolderId}` }]
            ]
          }
        }
      );
    } catch (error: any) {
      console.error("Erro ao arquivar diretamente:", error);
      if (error?.response?.description?.includes("file is too big")) {
        await ctx.telegram.editMessageText(chatId, statusMsg.message_id, undefined, "❌ O arquivo excede o limite de 20MB do Telegram para download via bot.");
      } else {
        await ctx.telegram.editMessageText(chatId, statusMsg.message_id, undefined, "❌ Erro no arquivamento. Tente novamente.");
      }
    }
    
    return;
  }
  
  const fileName = generateArchiveFileName(document, ctx, customName);
  
  const workgroupId = String(chatId);
  
  let rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label);
  
  if (!rootNode) {
    await ctx.reply("🔄 Primeira vez! Carregando estrutura de pastas...");
    rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label, true);
    if (!rootNode) {
      return ctx.reply("❌ Erro ao carregar estrutura de pastas.");
    }
  }

  const tempId = Date.now().toString(36);
  await setTempData(tempId, {
    mode: 'archive',
    fileId: document.file_id,
    fileName: fileName,
    workgroupId: workgroupId,
    breadcrumb: [],
    currentFolderId: groupConfig.folderId
  }, 300);

  const keyboard = createFolderNavigationKeyboard(rootNode, tempId);
  
  const createCommand = `/criar_pasta ${groupConfig.folderId} [nome da pasta]`;
  
  return ctx.reply(
    `Para criar pasta: <code>${createCommand}</code>\n\n📁 Arquivar: ${fileName}\nEscolha a pasta:`,
    { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
  );
}

// Modo criar arquivo (original) - exportada para uso no callback
export async function handleFileCreation(ctx: Context, fileType: string, title: string) {
  const chat = ctx.callbackQuery?.message?.chat || ctx.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
    return ctx.reply("Este comando deve ser usado em um grupo de trabalho.");
  }

  const groupConfig = getWorkgroupConfig(chat.id);
  if (!groupConfig) {
    return ctx.reply("Este grupo não possui uma pasta configurada.");
  }

  const now = new Date();
  const formattedDate = `${now.getFullYear()}.${(
    "0" + (now.getMonth() + 1)
  ).slice(-2)}.${("0" + now.getDate()).slice(-2)}`;
  
  let fullTitle: string;
  let documentId: string;
  let documentType: string;

  try {
    switch (fileType) {
      case "documento":
        fullTitle = `Documento - ${formattedDate} - ${title}`;
        const doc = await createDocument(fullTitle);
        documentId = doc.documentId || doc.document_id || doc.id;
        documentType = "Documento";
        break;
      case "apresentacao":
        fullTitle = `Apresentação - ${formattedDate} - ${title}`;
        const pres = await createPresentation(fullTitle);
        documentId = pres.presentationId || pres.id;
        documentType = "Apresentação";
        break;
      case "formulario":
        fullTitle = `Formulário - ${formattedDate} - ${title}`;
        const form = await createForm(fullTitle);
        documentId = form.id;
        documentType = "Formulário";
        break;
      case "planilha":
        fullTitle = `Planilha - ${formattedDate} - ${title}`;
        const sheet = await createSheet(fullTitle);
        documentId = sheet.spreadsheetId || sheet.id;
        documentType = "Planilha";
        break;
      default:
        return ctx.reply("Tipo de arquivo não reconhecido.");
    }

    if (!documentId) {
      return ctx.reply(`Não foi possível obter o ID do ${documentType.toLowerCase()} criado.`);
    }

    // Carrega estrutura de pastas (raiz)
    const workgroupId = String(chat.id);
    let rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label);
    
    if (!rootNode) {
      await ctx.editMessageText("🔄 Carregando estrutura de pastas...");
      rootNode = await getOrCacheFolderLevel(workgroupId, groupConfig.folderId, groupConfig.label, true);
      
      if (!rootNode) {
        return ctx.editMessageText("❌ Erro ao carregar estrutura de pastas.");
      }
    }

    const tempId = Date.now().toString(36);
    await setTempData(tempId, {
      mode: 'create',
      documentId,
      documentType,
      documentTitle: fullTitle,
      workgroupId: workgroupId,
      breadcrumb: [],
      currentFolderId: groupConfig.folderId
    }, 300);

    const keyboard = createFolderNavigationKeyboard(rootNode, tempId);
    
    const createCommand = `/criar_pasta ${groupConfig.folderId} [nome da pasta]`;
    
    return ctx.editMessageText(
      `Para criar pasta: <code>${createCommand}</code>\n\n${documentType} "${fullTitle}" criado com sucesso!\nEscolha onde salvá-lo:`,
      { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error(`Erro ao criar ${fileType}:`, error);
    return ctx.reply(`Ocorreu um erro ao criar o ${fileType}. Tente novamente mais tarde.`);
  }
}

function registerNovoArquivoCommand(bot: Telegraf) {
  bot.command("novo_arquivo", async (ctx: Context) => {
    console.log("[novo_arquivo] Comando /novo_arquivo executado");
    console.log("[novo_arquivo] Mensagem original:", ctx.message && "text" in ctx.message ? ctx.message.text : "N/A");
    
    if (!ctx.message || !("text" in ctx.message)) {
      return ctx.reply("Este comando só pode ser utilizado com mensagens de texto.");
    }

    // Verifica se é resposta a arquivo (MODO ARQUIVAR)
    if (ctx.message.reply_to_message && "document" in ctx.message.reply_to_message) {
      console.log("[novo_arquivo] Modo arquivar detectado");
      return handleArquivarMode(ctx);
    }

    // MODO CRIAR ARQUIVO (original)
    const messageText = ctx.message.text;
    const title = messageText.replace("/novo_arquivo@ameciclobot", "").replace("/novo_arquivo", "").trim();
    
    if (!title) {
      return showNoTitleOptions(ctx);
    }

    const messageId = ctx.message.message_id;
    const chatId = ctx.message.chat.id;
    
    // Armazena o título temporariamente no Firebase
    await setTempData(`title_${chatId}_${messageId}`, { title }, 300);

    const buttons = [
      [{ text: "📄 Documento", callback_data: `new_file:documento:${messageId}` }],
      [{ text: "🎞️ Apresentação", callback_data: `new_file:apresentacao:${messageId}` }],
      [{ text: "📝 Formulário", callback_data: `new_file:formulario:${messageId}` }],
      [{ text: "📊 Planilha", callback_data: `new_file:planilha:${messageId}` }],
      [{ text: "📋 Modelo", callback_data: `new_file:modelo:${messageId}` }]
    ];

    console.log(`[novo_arquivo] Solicitação de criação de arquivo: "${title}"`);
    
    return ctx.reply(
      `Que tipo de arquivo você quer criar?\nTítulo: ${title}`,
      { reply_markup: { inline_keyboard: buttons } }
    );
  });

  // Callback para atualizar pastas quando não tem título
  bot.action("update_folders_notitle", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.editMessageText("🔄 Atualizando estrutura de pastas...");
      
      const chatId = ctx.chat?.id;
      if (!chatId) {
        await ctx.editMessageText("❌ Erro ao identificar o grupo.");
        return;
      }
      
      const groupConfig = getWorkgroupConfig(chatId);
      if (!groupConfig) {
        await ctx.editMessageText("❌ Este grupo não está configurado.");
        return;
      }
      
      await forceUpdateFolderTree(String(chatId));
      
      await ctx.editMessageText(
        `✅ Estrutura de pastas atualizada para ${groupConfig.label}!\n\nAgora use: \`/novo_arquivo [título]\` para criar um arquivo.`
      );
      
    } catch (error) {
      console.error("Erro ao atualizar pastas:", error);
      await ctx.editMessageText("❌ Erro na atualização. Tente novamente.");
    }
  });

  // Callback para cancelar
  bot.action("cancel_action", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("❌ Operação cancelada.");
  });
}

export const novoArquivoCommand = {
  register: registerNovoArquivoCommand,
  name: () => "/novo_arquivo",
  help: () => "Use o comando `/novo_arquivo` para criar diferentes tipos de arquivos ou arquivar documentos\\. \\n\\n**Criar arquivo:** `/novo_arquivo \\[título\\]`\\n**Arquivar:** Responda a um arquivo com `/novo_arquivo \\[nome opcional\\]`",
  description: () => "📁 Criar novos arquivos ou arquivar documentos com navegação hierárquica de pastas.",
};
