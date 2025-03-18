// src/commands/help.ts
import { Context, Telegraf } from "telegraf";
import { commandsList } from "../utils/commands";
import { escapeMarkdownV2 } from "../utils/utils";

export function getHelpCommandName() {
  return "/ajuda";
}

export function getHelpCommandHelp() {
  return "Use o comando `/ajuda` para obter ajuda sobre os comandos disponíveis no bot e o bot retornará uma lista de comandos e instruções de uso.\n Outra opção é obter ajuda específica, digitando: `/ajuda [nome-do-comando]`";
}

export function getHelpCommandDescription() {
  return "❓ Obter ajuda dos comandos.";
}

function buildCommandsMessage(header: string, footer: string): string {
  let message = header + "\n\n";
  commandsList.forEach((cmd) => {
    message += `**${escapeMarkdownV2(cmd.name())}**: ${escapeMarkdownV2(
      cmd.description()
    )}\n${cmd.help()}\n\n`;
  });
  message += "\n" + footer;
  return message;
}

async function helpCommand(ctx: Context) {
  // Header e footer fixos (não escapados)
  const header = `🤖 **@ameciclobot: Auxiliar Ameciclista** 🤝\n\nAqui está a lista de comandos disponíveis:`;
  const footer = `❓ Para obter ajuda específica, digite: \`/ajuda \\[comando\\]\`\n\n📩 Se tiver dúvidas, fale com @ameciclo\\_info\\.`;
  const helpMessage = buildCommandsMessage(header, footer);
  console.log("Mensagem: " + helpMessage);
  await ctx.reply(helpMessage, { parse_mode: "MarkdownV2" });
}

function getCommandByName(name: string) {
  return commandsList.find((cmd) => cmd.name() === name);
}

async function helpCommandSpecific(ctx: Context, command: string) {
  const normalizedCommand = command.startsWith("/") ? command : `/${command}`;
  const commandHelpers = getCommandByName(normalizedCommand);
  if (commandHelpers) {
    const helpMessage = `🔍 **${escapeMarkdownV2(
      commandHelpers.name()
    )}**: ${escapeMarkdownV2(
      commandHelpers.description()
    )}\n${commandHelpers.help()}\n\n`;
    console.log("Mensagem Específica: " + helpMessage);
    await ctx.reply(helpMessage, { parse_mode: "MarkdownV2" });
  } else {
    await ctx.reply(
      "❌ Comando " +
        command +
        " não encontrado.\nUse `/ajuda` para ver a lista completa de comandos disponíveis.",
      { parse_mode: "MarkdownV2" }
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
        { parse_mode: "MarkdownV2" }
      );
    }
  });
}

export function registerHelpCommand(bot: Telegraf) {
  bot.help(async (ctx: Context) => {
    await helpCommand(ctx);
  });
}
