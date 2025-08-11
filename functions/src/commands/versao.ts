// src/commands/versao.ts
import { Context, Telegraf } from "telegraf";
import { BOT_VERSION } from "../config/version";

function registerVersaoCommand(bot: Telegraf) {
  bot.command("versao", async (ctx: Context) => {
    await ctx.reply(`🤖 Ameciclo Bot\nVersão atual: ${BOT_VERSION}`);
  });
}

export const versaoCommand = {
  name: () => "/versao",
  help: () => "Use o comando `/versao` para verificar a versão atual do bot\\.",
  description: () => "📊 Verificar a versão atual do bot.",
  register: registerVersaoCommand,
};
