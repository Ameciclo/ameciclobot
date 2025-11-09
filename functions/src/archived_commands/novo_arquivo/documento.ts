import { Context, Telegraf } from "telegraf";
import { createDocument, listFolders } from "../../services/google";
import { setTempData, getCachedFolders, setCachedFolders } from "../../services/firebase";
// Importa a lista de grupos a partir do arquivo de configuração
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

// /commands/helpers.ts

function registerDocumentoCommand(bot: Telegraf) {
  bot.command("documento", async (ctx: Context) => {
    try {
      const from = ctx.message?.from;
      const chat = ctx.message?.chat;

      if (!from || !chat) {
        return ctx.reply(
          "Não foi possível identificar as informações da mensagem."
        );
      }

      // O comando deve ser usado em grupos de trabalho (group ou supergroup)
      if (chat.type !== "group" && chat.type !== "supergroup") {
        return ctx.reply(
          "O comando /documento deve ser usado em um grupo de trabalho."
        );
      }

      // Extrai o título original do documento (tudo o que vem após o comando)
      if (!ctx.message || !("text" in ctx.message)) {
        return ctx.reply(
          "Este comando só pode ser utilizado com mensagens de texto."
        );
      }

      const messageText = ctx.message.text || "";
      const originalTitle = messageText.replace("/documento@ameciclobot", "").replace("/documento", "").trim();
      if (!originalTitle) {
        return ctx.reply(
          "Por favor, forneça um título para o documento.\nExemplo: `/documento Nome do Documento`"
        );
      }

      // Formata a data atual no padrão AAAA.MM.DD
      const now = new Date();
      const formattedDate = `${now.getFullYear()}.${(
        "0" +
        (now.getMonth() + 1)
      ).slice(-2)}.${("0" + now.getDate()).slice(-2)}`;
      const fullTitle = `Documento - ${formattedDate} - ${originalTitle}`;

      // Procura a configuração do grupo a partir do chat.id comparando com o campo "value"
      const groupConfig = workgroups.find(
        (group: any) => group.value === String(chat.id)
      );
      if (!groupConfig) {
        return ctx.reply(
          "Este grupo não possui uma pasta configurada para documentos."
        );
      }

      // Cria o Google Docs com o título formatado
      const doc = await createDocument(fullTitle);
      const documentId = doc.documentId || doc.document_id || doc.id;
      if (!documentId) {
        return ctx.reply("Não foi possível obter o ID do documento criado.");
      }

      // Cria ID temporário curto
      const tempId = Date.now().toString(36);
      await setTempData(tempId, {
        documentId,
        parentFolderId: groupConfig.folderId,
        documentType: "Documento",
        documentTitle: fullTitle
      }, 300);

      // Busca pastas em cache ou do Google Drive
      let subfolders = await getCachedFolders(groupConfig.folderId);
      if (subfolders.length === 0) {
        subfolders = await listFolders(groupConfig.folderId);
        await setCachedFolders(groupConfig.folderId, subfolders);
      }

      const keyboard = createFolderKeyboard(subfolders, tempId);
      
      return ctx.reply(
        `Documento "${fullTitle}" criado com sucesso!\nEscolha onde salvá-lo:`,
        { reply_markup: { inline_keyboard: keyboard } }
      );
    } catch (error) {
      console.error("Erro ao processar comando /documento:", error);
      return ctx.reply(
        "Ocorreu um erro ao criar o documento. Tente novamente mais tarde."
      );
    }
  });
}

export const documentoCommand = {
  register: registerDocumentoCommand,
  name: () => "/documento",
  help: () => "Use o comando `/documento` para criar um Google Docs\\. O formato esperado é:\n`/documento \\[título do documento\\]`",
  description: () => "🗎 Criar um Google Docs para documentos.",
};
