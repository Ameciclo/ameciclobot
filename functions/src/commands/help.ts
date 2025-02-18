// src/commands/help.ts
import { Context, Telegraf } from "telegraf";
import {
  buildCommandsMessage,
  getCommandByName,
} from "../utils/commonMessages";

export function getHelpCommandName() {
  return "/ajuda";
}

export function getHelpCommandHelp() {
  return "Use o comando `/ajuda` para obter ajuda sobre os comandos disponíveis no bot.\n\nO bot retornará uma lista de comandos e instruções de uso.";
}

export function getHelpCommandDescription() {
  return "❓ Exibir lista de comandos e instruções.";
}

async function helpCommand(ctx: Context) {
  const header = `🤖 <b>@ameciclobot - Auxiliar Ameciclista</b> 🤝\n\nAqui está a lista de comandos disponíveis:`;
  const footer = `\n❓ Para obter ajuda específica, digite: <code>/ajuda [comando]</code>\n\n📩 Se tiver dúvidas, fale com <a href="https://t.me/ameciclo_info">@ameciclo_info</a>.`;
  const helpMessage = buildCommandsMessage(header, footer, "hideFromHelp");

  await ctx.reply(helpMessage, { parse_mode: "HTML" });
}

async function helpCommandSpecific(ctx: Context, command: string) {
  const commandHelpers = getCommandByName(command);
  if (commandHelpers) {
    const helpMessage = `�� <b>${commandHelpers.name}</b>\n\n${commandHelpers.description}\n\n${commandHelpers.helpText}`;
    await ctx.reply(helpMessage, { parse_mode: "HTML" });
  }
}
export function registerAjudaCommand(bot: Telegraf) {
  bot.command("ajuda", async (ctx: Context) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text || "";
      const args = text.split(" ").slice(1); // pega os argumentos após "/ajuda"

      if (args.length > 0) {
        await helpCommandSpecific(ctx, args[0]);
      } else {
        await helpCommand(ctx);
      }
    } else {
      await ctx.reply(
        "Não consegui processar sua mensagem. Por favor, tente novamente.",
        { parse_mode: "HTML" }
      );
    }
  });
}

export function registerHelpCommand(bot: Telegraf) {
  bot.help(async (ctx: Context) => {
    await helpCommand(ctx);
  });
}
