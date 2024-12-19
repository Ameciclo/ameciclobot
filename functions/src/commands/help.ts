import { Context, Telegraf } from "telegraf";

export function registerHelpCommand(bot: Telegraf) {
  bot.help((ctx: Context) => ctx.reply("Send me a sticker"));
}
