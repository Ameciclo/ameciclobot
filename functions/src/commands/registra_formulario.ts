// src/commands/registrar_formulario.ts
import { Context, Telegraf } from "telegraf";
import { registerNewForm } from "../services/firebase";

export function registerRegistrarFormularioCommand(bot: Telegraf) {
  bot.command("registrar_formulario", async (ctx: Context) => {
    if (!ctx.message || !("text" in ctx.message)) {
      return ctx.reply(
        "Este comando só pode ser usado com mensagens de texto."
      );
    }
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length === 0) {
      return ctx.reply(
        "Por favor, forneça a URL do formulário.\nExemplo:\n/registrar_formulario https://docs.google.com/forms/d/e/FORM_ID/viewform"
      );
    }
    const formUrl = args[0];
    // Extrai o ID do formulário usando uma regex
    const match = formUrl.match(/\/d\/e\/([^/]+)/);
    if (!match) {
      return ctx.reply(
        "Não foi possível extrair o ID do formulário a partir da URL fornecida."
      );
    }
    const formId = match[1];
    // Define o grupo do Telegram para notificações com base no chat onde o comando foi executado
    const telegramGroupId = ctx.chat?.id;
    if (!telegramGroupId) {
      return ctx.reply("Não foi possível identificar o chat.");
    }
    try {
      registerNewForm({ sheetId: formId, telegramGroupId, lastRow: 2 });
      return ctx.reply(`Formulário registrado com sucesso! ID: ${formId}`);
    } catch (error) {
      console.error("Erro ao registrar formulário:", error);
      return ctx.reply("Ocorreu um erro ao registrar o formulário.");
    }
  });
}
