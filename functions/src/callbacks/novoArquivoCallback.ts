import { Context, Telegraf, Markup } from "telegraf";
import { listModelsFromFolder } from "../services/google";
import { setTempData, getTempData } from "../services/firebase";
import { getPreviewTitle } from "../utils/utils";
import workgroups from "../credentials/workgroupsfolders.json";

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