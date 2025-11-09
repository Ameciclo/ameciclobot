// /commands/formulario.ts
import { Context, Telegraf } from "telegraf";
import { createForm, listFolders } from "../../services/google";
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

function registerFormularioCommand(bot: Telegraf) {
  bot.command("formulario", async (ctx: Context) => {
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
          "O comando /formulario deve ser usado em um grupo de trabalho."
        );
      }
      if (!ctx.message || !("text" in ctx.message)) {
        return ctx.reply(
          "Este comando só pode ser utilizado com mensagens de texto."
        );
      }
      const messageText = ctx.message.text;
      const originalTitle = messageText.replace("/formulario@ameciclobot", "").replace("/formulario", "").trim();
      if (!originalTitle) {
        return ctx.reply(
          "Por favor, forneça um título para o formulário.\nExemplo: `/formulario Nome do Formulário`"
        );
      }

      const now = new Date();
      const formattedDate = `${now.getFullYear()}.${(
        "0" +
        (now.getMonth() + 1)
      ).slice(-2)}.${("0" + now.getDate()).slice(-2)}`;
      const fullTitle = `Formulário - ${formattedDate} - ${originalTitle}`;

      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        return ctx.reply(
          "Este grupo não possui uma pasta configurada para formulários."
        );
      }

      const form = await createForm(fullTitle);
      const formId = form.id;
      if (!formId) {
        return ctx.reply("Não foi possível obter o ID do formulário criado.");
      }

      const tempId = Date.now().toString(36);
      await setTempData(tempId, {
        documentId: formId,
        parentFolderId: groupConfig.folderId,
        documentType: "Formulário",
        documentTitle: fullTitle
      }, 300);

      let subfolders = await getCachedFolders(groupConfig.folderId);
      if (subfolders.length === 0) {
        subfolders = await listFolders(groupConfig.folderId);
        await setCachedFolders(groupConfig.folderId, subfolders);
      }

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      return ctx.reply(
        `Formulário "${fullTitle}" criado com sucesso!\nEscolha onde salvá-lo:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error("Erro ao processar comando /formulario:", error);
      return ctx.reply(
        "Ocorreu um erro ao criar o formulário. Tente novamente mais tarde."
      );
    }
  });
}

export const formularioCommand = {
  register: registerFormularioCommand,
  name: () => "/formulario",
  help: () => "Use o comando `/formulario` para criar um Google Forms\\. O formato esperado é:\n`/formulario \\[título do formulário\\]`",
  description: () => "📝 Criar um Google Forms para formulários.",
};
