// src/commands/start.ts
import { Context, Telegraf } from "telegraf";
import { commandsList } from "../utils/commands";
import { escapeMarkdownV2 } from "../utils/utils";

export function getStartCommandName() {
  return "/start";
}

export function getStartCommandHelp() {
  return "Use o comando `/start` para iniciar o bot e receber uma mensagem de boas-vindas\\.";
}

export function getStartCommandDescription() {
  return "🚀 Iniciar o bot.";
}

export function buildCommandsMessage(header: string, footer: string): string {
  let message = header + "\n\n";
  commandsList.forEach((cmd) => {
    message += `**${escapeMarkdownV2(cmd.name())}**: ${escapeMarkdownV2(
      cmd.description()
    )}\n`;
  });
  message += "\n" + footer;
  return message;
}

async function startCommand(ctx: Context) {
  // Header e footer fixos (já escritos em MarkdownV2)
  const header = `🎉 Olá, sou **@ameciclobot**\\! 🚴‍♀️🚴‍♂️

Auxiliar para demandas e registros da **Associação Metropolitana de Ciclistas do Recife**\\.

Aqui estão os comandos disponíveis:`;

  const footer = `
❓ Para obter ajuda específica, digite: \`/ajuda \\[comando\\]\`
📩 Se tiver dúvidas, fale com @ameciclo\\_info\\.
🚀 Bora começar? Digite um dos comandos acima para usar o bot\\!`;

  const startMessage = buildCommandsMessage(header, footer);
  console.log("Mensagem de start:", startMessage);
  await ctx.reply(startMessage, { parse_mode: "MarkdownV2" });
}

export function registerStartCommand(bot: Telegraf) {
  bot.start(async (ctx: Context) => {
    await startCommand(ctx);
  });
}

export function registerIniciarCommand(bot: Telegraf) {
  bot.command("iniciar", async (ctx: Context) => {
    await startCommand(ctx);
  });
}
