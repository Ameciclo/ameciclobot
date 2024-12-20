import { Context, Telegraf } from "telegraf";

export function getHelpCommandName() {
  return "/ajuda";
}

export function getHelpCommandHelp() {
  return "Use o comando `/ajuda` para obter ajuda sobre os comandos disponíveis no bot.\n\nO bot retornará uma lista de comandos e instruções de uso.";
}

export function getHelpCommandDescription() {
  return "❓ Exibir lista de comandos e instruções.";
}

export function registerHelpCommand(bot: Telegraf) {
  bot.help((ctx: Context) => ctx.reply("Em construção"));
}
