// /commands/planilha.ts
import { Context, Telegraf } from "telegraf";
import { createSheet, listFolders } from "../../services/google";
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

export function getName() {
  return "/planilha";
}

export function getHelp() {
  return "Use o comando `/planilha` para criar uma Google Sheet\\. O formato esperado é:\n`/planilha \\[título da planilha\\]`";
}

export function getDescription() {
  return "📊 Criar uma Google Sheet para planilhas.";
}

export function register(bot: Telegraf) {
  bot.command("planilha", async (ctx: Context) => {
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
          "O comando /planilha deve ser usado em um grupo de trabalho."
        );
      }
      if (!ctx.message || !("text" in ctx.message)) {
        return ctx.reply(
          "Este comando só pode ser utilizado com mensagens de texto."
        );
      }
      const messageText = ctx.message.text;
      const originalTitle = messageText.replace("/planilha@ameciclobot", "").replace("/planilha", "").trim();
      if (!originalTitle) {
        return ctx.reply(
          "Por favor, forneça um título para a planilha.\nExemplo: `/planilha Nome da Planilha`"
        );
      }

      const now = new Date();
      const formattedDate = `${now.getFullYear()}.${(
        "0" +
        (now.getMonth() + 1)
      ).slice(-2)}.${("0" + now.getDate()).slice(-2)}`;
      const fullTitle = `Planilha - ${formattedDate} - ${originalTitle}`;

      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        return ctx.reply(
          "Este grupo não possui uma pasta configurada para planilhas."
        );
      }

      const sheet = await createSheet(fullTitle);
      const sheetId = sheet.spreadsheetId || sheet.id;
      if (!sheetId) {
        return ctx.reply("Não foi possível obter o ID da planilha criada.");
      }

      const tempId = Date.now().toString(36);
      await setTempData(tempId, {
        documentId: sheetId,
        parentFolderId: groupConfig.folderId,
        documentType: "Planilha",
        documentTitle: fullTitle
      }, 300);

      let subfolders = await getCachedFolders(groupConfig.folderId);
      if (subfolders.length === 0) {
        subfolders = await listFolders(groupConfig.folderId);
        await setCachedFolders(groupConfig.folderId, subfolders);
      }

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      return ctx.reply(
        `Planilha "${fullTitle}" criada com sucesso!\nEscolha onde salvá-la:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error("Erro ao processar comando /planilha:", error);
      return ctx.reply(
        "Ocorreu um erro ao criar a planilha. Tente novamente mais tarde."
      );
    }
  });
}

export const planilhaCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
