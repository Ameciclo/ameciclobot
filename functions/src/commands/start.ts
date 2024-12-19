import { Context, Telegraf } from "telegraf";

export function registerStartCommand(bot: Telegraf) {
  bot.start((ctx: Context) => ctx.reply("Welcome"));
}
