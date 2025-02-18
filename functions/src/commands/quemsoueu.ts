import { Context, Telegraf } from 'telegraf';

export function getName() {
  return "/quem_sou_eu";
}

export function getHelp() {
  return "Use o comando `/quem_sou_eu` para obter informações sobre você no bot.\n\nEste comando mostrará seu nome de usuário e identificador.";
}

export function getDescription() {
  return "🤔 Descubra seu Telegram Id.";
}

export function register(bot: Telegraf) {
  bot.command('quem_sou_eu', (ctx: Context) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    ctx.reply(`User ID: ${userId}\nChat ID: ${chatId}`);
  });
}

export const quemSouEuCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
