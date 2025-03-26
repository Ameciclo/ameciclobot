// src/commands/help.ts
import { Context, Telegraf } from "telegraf";
import { commandsList } from "../commands";

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

export function buildCommandsMessage(
  header: string,
  footer: string,
  hideFromFlag: "hideFromStart" | "hideFromHelp" = "hideFromHelp"
): string {
  let message = header + "\n\n";
  commandsList.forEach((cmd) => {
    if (hideFromFlag === "hideFromHelp") {
      message += `<b>${cmd.name}</b>:\n${cmd.help}\n\n`;
    } else {
      message += `<b>${cmd.name}</b> - ${cmd.description}\n`;
    }
  });
  message += "\n" + footer;
  return message;
}

export function getCommandByName(name: string) {
  return commandsList.find((cmd) => cmd.name() === name);
}

async function helpCommandSpecific(ctx: Context, command: string) {
  const normalizedCommand = command.startsWith("/") ? command : `/${command}`;
  const commandHelpers = getCommandByName(normalizedCommand);
  if (commandHelpers) {
    const helpMessage = `🔍 <b>${commandHelpers.name()}</b>\n\n${commandHelpers.description()}\n\n${commandHelpers.help()}`;
    await ctx.reply(helpMessage, { parse_mode: "HTML" });
  } else {
    await ctx.reply(
      `❌ Comando "${command}" não encontrado.\n\nUse /ajuda para ver a lista completa de comandos disponíveis.`,
      { parse_mode: "HTML" }
    );
  }
}

export function registerAjudaCommand(bot: Telegraf) {
  bot.command("ajuda", async (ctx: Context) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text || "";
      const args = text.split(" ").slice(1);
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
