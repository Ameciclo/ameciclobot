// /commands/apresentacao.ts

import { Context, Telegraf } from "telegraf";
import { createPresentation, listFolders } from "../../services/google";
import { setTempData, getCachedFolders, setCachedFolders } from "../../services/firebase";
import workgroups from "../../credentials/workgroupsfolders.json";

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

export function getName() {
  return "/apresentacao";
}

export function getHelp() {
  return "Use o comando `/apresentacao` para criar uma Google Presentation\\. O formato esperado é:\n`/apresentacao \\[título da apresentação\\]`";
}

export function getDescription() {
  return "🎞️ Criar uma Google Presentation para apresentações.";
}

export function register(bot: Telegraf) {
  bot.command("apresentacao", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;
      if (!from || !chat) {
        return ctx.reply(
          "Não foi possível identificar as informações da mensagem."
        );
      }
      if (chat.type !== "group" && chat.type !== "supergroup") {
        return ctx.reply(
          "O comando /apresentacao deve ser usado em um grupo de trabalho."
        );
      }
      if (!ctx.message || !("text" in ctx.message)) {
        return ctx.reply(
          "Este comando só pode ser utilizado com mensagens de texto."
        );
      }
      const messageText = ctx.message.text;
      const originalTitle = messageText.replace("/apresentacao@ameciclobot", "").replace("/apresentacao", "").trim();
      if (!originalTitle) {
        return ctx.reply(
          "Por favor, forneça um título para a apresentação.\nExemplo: `/apresentacao Nome da Apresentação`"
        );
      }

      const now = new Date();
      const formattedDate = `${now.getFullYear()}.${(
        "0" +
        (now.getMonth() + 1)
      ).slice(-2)}.${("0" + now.getDate()).slice(-2)}`;
      const fullTitle = `Apresentação - ${formattedDate} - ${originalTitle}`;

      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        return ctx.reply(
          "Este grupo não possui uma pasta configurada para apresentações."
        );
      }

      const pres = await createPresentation(fullTitle);
      const presentationId = pres.presentationId || pres.id;
      if (!presentationId) {
        return ctx.reply("Não foi possível obter o ID da apresentação criada.");
      }

      const tempId = Date.now().toString(36);
      await setTempData(tempId, {
        documentId: presentationId,
        parentFolderId: groupConfig.folderId,
        documentType: "Apresentação",
        documentTitle: fullTitle
      }, 300);

      let subfolders = await getCachedFolders(groupConfig.folderId);
      if (subfolders.length === 0) {
        subfolders = await listFolders(groupConfig.folderId);
        await setCachedFolders(groupConfig.folderId, subfolders);
      }

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      return ctx.reply(
        `Apresentação "${fullTitle}" criada com sucesso!\nEscolha onde salvá-la:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error("Erro ao processar comando /apresentacao:", error);
      return ctx.reply(
        "Ocorreu um erro ao criar a apresentação. Tente novamente mais tarde."
      );
    }
  });
}

export const apresentacaoCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
