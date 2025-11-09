import { Context, Telegraf, Markup } from "telegraf";
import { createDocument, createPresentation, createForm, createSheet, listFolders, listModelsFromFolder } from "../services/google";
import { setTempData, getCachedFolders, setCachedFolders, getTempData } from "../services/firebase";
import { getPreviewTitle } from "../utils/utils";
import workgroups from "../credentials/workgroupsfolders.json";

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

async function handleFileCreation(ctx: Context, fileType: string, title: string) {
  const chat = ctx.callbackQuery?.message?.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
    return ctx.reply("Este comando deve ser usado em um grupo de trabalho.");
  }

  const groupConfig = workgroups.find(
    (group: any) => group.value === String(chat.id)
  );
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

    const tempId = Date.now().toString(36);
    await setTempData(tempId, {
      documentId,
      parentFolderId: groupConfig.folderId,
      documentType,
      documentTitle: fullTitle
    }, 300);

    let subfolders = await getCachedFolders(groupConfig.folderId);
    if (subfolders.length === 0) {
      subfolders = await listFolders(groupConfig.folderId);
      await setCachedFolders(groupConfig.folderId, subfolders);
    }

    const keyboard = createFolderKeyboard(subfolders, tempId);
    
    return ctx.editMessageText(
      `${documentType} "${fullTitle}" criado com sucesso!\nEscolha onde salvá-lo:`,
      { reply_markup: { inline_keyboard: keyboard } }
    );
  } catch (error) {
    console.error(`Erro ao criar ${fileType}:`, error);
    return ctx.reply(`Ocorreu um erro ao criar o ${fileType}. Tente novamente mais tarde.`);
  }
}

async function handleModeloSelection(ctx: Context, title: string) {
  const chat = ctx.callbackQuery?.message?.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
    return ctx.reply("Este comando deve ser usado em um grupo de trabalho.");
  }

  const groupConfig = workgroups.find(
    (group: any) => group.value === String(chat.id)
  );
  if (!groupConfig) {
    return ctx.reply("Este grupo não possui uma pasta configurada.");
  }

  try {
    const models = await listModelsFromFolder("1xYWUMDsamike4q3_CrHAZNKNsq6gsUUb");
    if (!models || models.length === 0) {
      return ctx.reply("Nenhum modelo disponível.");
    }

    const tempId = Date.now().toString(36);
    await setTempData(tempId, {
      newTitle: title,
      parentFolderId: groupConfig.folderId,
      documentType: "Documento"
    }, 300);

    const buttons = models.map((model) => {
      return [{
        text: getPreviewTitle(model.name, title),
        callback_data: `modelo_${model.id}_${tempId}`,
      }];
    });

    return ctx.editMessageText(
      `Qual o modelo de documento você quer clonar?\nTítulo do documento: ${title}`,
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Erro ao listar modelos:", error);
    return ctx.reply("Ocorreu um erro ao listar os modelos.");
  }
}

export function registerNovoArquivoCallback(bot: Telegraf) {
  bot.action(/^new_file:(.+):(.+)$/, async (ctx) => {
    const fileType = ctx.match[1];
    const messageId = ctx.match[2];

    await ctx.answerCbQuery();
    await ctx.editMessageText("⏳ Processando...");
    
    const chat = ctx.callbackQuery?.message?.chat;
    if (!chat) {
      return ctx.reply("Não foi possível identificar o chat.");
    }

    try {
      // Recupera o título do Firebase
      const titleData = await getTempData(`title_${chat.id}_${messageId}`);
      const title = titleData?.title;
      
      if (!title) {
        return ctx.reply("Não foi possível recuperar o título. Execute o comando novamente.");
      }

      if (fileType === "modelo") {
        return handleModeloSelection(ctx, title);
      } else {
        return handleFileCreation(ctx, fileType, title);
      }
    } catch (error) {
      console.error("Erro ao processar callback novo_arquivo:", error);
      return ctx.reply("Ocorreu um erro ao processar a seleção. Tente novamente.");
    }
  });
}