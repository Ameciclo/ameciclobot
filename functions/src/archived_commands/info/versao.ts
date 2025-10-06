// src/commands/versao.ts
import { Context, Telegraf } from "telegraf";
import { BOT_VERSION } from "../../config/version";
import { escapeMarkdownV2 } from "../../utils/utils";

function registerVersaoCommand(bot: Telegraf) {
  bot.command("versao", async (ctx: Context) => {
    console.log("[versao] COMANDO EXECUTADO!");
    await ctx.reply(`🤖 Ameciclo Bot\nVersão atual: ${escapeMarkdownV2(BOT_VERSION)}`, { parse_mode: "MarkdownV2" });
  });
}

export const versaoCommand = {
  name: () => "/versao",
  help: () => "Use o comando `/versao` para verificar a versão atual do bot\\.",
  description: () => "📊 Verificar a versão atual do bot.",
  register: registerVersaoCommand,
};
