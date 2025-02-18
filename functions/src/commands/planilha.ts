// /commands/planilha.ts
import { Context, Telegraf } from "telegraf";
import { createSheet, moveDocumentToFolder } from "../services/google";
import workgroups from "../config/workgroupsfolders.json";

export function getPlanilhaCommandName() {
  return "/planilha";
}

export function getPlanilhaCommandHelp() {
  return "Use o comando `/planilha` para criar uma Google Sheet. O formato esperado é:\n\n`/planilha [título da planilha]`";
}

export function getPlanilhaCommandDescription() {
  return "📊 Criar uma Google Sheet para planilhas.";
}

export function registerPlanilhaCommand(bot: Telegraf) {
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
      const originalTitle = messageText.replace("/planilha", "").trim();
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

      await moveDocumentToFolder(sheetId, groupConfig.folderId);

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      return ctx.reply(
        `Planilha criada com sucesso na pasta "${groupConfig.label}" do Grupo de Trabalho.\nTítulo: ${fullTitle}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 Abrir Planilha", url: sheetUrl }],
              [{ text: "📂 Abrir Pasta do Grupo", url: groupConfig.folderUrl }],
            ],
          },
        }
      );
    } catch (error) {
      console.error("Erro ao processar comando /planilha:", error);
      return ctx.reply(
        "Ocorreu um erro ao criar a planilha. Tente novamente mais tarde."
      );
    }
  });
}
