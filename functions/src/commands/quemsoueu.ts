import { Context, Telegraf } from 'telegraf';

export function registerQuemSouEuCommand(bot: Telegraf) {
  bot.command('quemsoueu', (ctx: Context) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    ctx.reply(`User ID: ${userId}\nChat ID: ${chatId}`);
  });
}
