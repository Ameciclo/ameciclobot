import { Context, Telegraf, Markup } from "telegraf";
import { listModelsFromFolder } from "../services/google";
import { setTempData, getTempData } from "../services/firebase";
import { getPreviewTitle } from "../utils/utils";
import workgroups from "../credentials/workgroupsfolders.json";

const MODELOS_FOLDER_ID = "1xYWUMDsamike4q3_CrHAZNKNsq6gsUUb";
const MODELOS_FOLDER_URL = `https://drive.google.com/drive/folders/${MODELOS_FOLDER_ID}`;

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
    const models = await listModelsFromFolder(MODELOS_FOLDER_ID);
    if (!models || models.length === 0) {
      return ctx.reply("Nenhum modelo disponível.");
    }

    const tempId = Date.now().toString(36);
    await setTempData(tempId, {
      newTitle: title,
      parentFolderId: groupConfig.folderId,
      documentType: "Documento"
    }, 300);

    const buttons = [];
    for (const model of models) {
      try {
        buttons.push([{
          text: getPreviewTitle(model.name, title),
          callback_data: `modelo_${model.id}_${tempId}`,
        }]);
      } catch (error) {
        console.error(`Nome de modelo inválido: "${model.name}"`, error);
        return ctx.reply(
          `Há um arquivo na pasta de modelos com o nome fora do padrão: "${model.name}".\n\n` +
          `Renomeie o arquivo usando o formato:\n` +
          `Tipo de documento - AAAA.MM.DD - Descrição\n\n` +
          `Pasta de modelos: ${MODELOS_FOLDER_URL}`
        );
      }
    }

    return ctx.editMessageText(
      `Qual o modelo de documento você quer clonar?\nTítulo do documento: ${title}\n\n💡 **Adicionar novos modelos:**\nVocê pode adicionar novos modelos na pasta: [📁 Modelos Ameciclo](${MODELOS_FOLDER_URL})`,
      {
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        parse_mode: "Markdown"
      }
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
        // Usa a nova função handleFileCreation do comando novo_arquivo
        const { handleFileCreation } = await import("../commands/novo_arquivo");
        return await handleFileCreation(ctx, fileType, title);
      }
    } catch (error) {
      console.error("Erro ao processar callback novo_arquivo:", error);
      return ctx.reply("Ocorreu um erro ao processar a seleção. Tente novamente.");
    }
  });
}
