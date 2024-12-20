import { Context, Telegraf } from "telegraf";

export function getStartCommandName() {
  return "/start";
}

export function getStartCommandHelp() {
  return "Use o comando `/start` para iniciar o bot e receber uma mensagem de boas-vindas.";
}

export function getStartCommandDescription() {
  return "🚀 Iniciar o bot.";
}

export function registerStartCommand(bot: Telegraf) {
  bot.start((ctx: Context) => ctx.reply("Olá!"));
}
