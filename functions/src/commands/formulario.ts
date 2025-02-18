// /commands/formulario.ts
import { Context, Telegraf } from "telegraf";
import { createForm, moveDocumentToFolder } from "../services/google";
import workgroups from "../config/workgroupsfolders.json";

export function getName() {
  return "/formulario";
}

export function getHelp() {
  return "Use o comando `/formulario` para criar um Google Forms. O formato esperado é:\n\n`/formulario [título do formulário]`";
}

export function getDescription() {
  return "📝 Criar um Google Forms para formulários.";
}

export function register(bot: Telegraf) {
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
      const originalTitle = messageText.replace("/formulario", "").trim();
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

      await moveDocumentToFolder(formId, groupConfig.folderId);

      const formUrl = `https://docs.google.com/forms/d/${formId}/edit`;
      return ctx.reply(
        `Formulário criado com sucesso na pasta "${groupConfig.label}" do Grupo de Trabalho.\nTítulo: ${fullTitle}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📝 Abrir Formulário", url: formUrl }],
              [{ text: "📂 Abrir Pasta do Grupo", url: groupConfig.folderUrl }],
            ],
          },
        }
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
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
