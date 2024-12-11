import { Context, Telegraf } from 'telegraf';

export function registerTesteCommand(bot: Telegraf) {
  bot.command('teste', (ctx: Context) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    ctx.reply(`User ID: ${userId}\nChat ID: ${chatId}`);
  });
}
