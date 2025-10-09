// src/commands/start.ts
import { Context, Telegraf } from "telegraf";
import { commandsList } from "../commands";
import { escapeMarkdownV2 } from "../utils/utils";
import { BOT_VERSION } from "../config/version";
import { addSubscriber, getUserData } from "../services/firebase";

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
  // Adicionar usuário aos subscribers se não existir
  if (ctx.from) {
    try {
      const existingUser = await getUserData(ctx.from.id);
      if (!existingUser) {
        await addSubscriber(ctx.from);
      }
    } catch (error) {
      console.error('Erro ao verificar/adicionar subscriber:', error);
    }
  }

  // Header e footer fixos (já escritos em MarkdownV2)
  const header = `🎉 Olá, sou **@ameciclobot**\\! 🚴‍♀️🚴‍

Auxiliar para demandas e registros da **Associação Metropolitana de Ciclistas do Recife**\\.

Versão: ${escapeMarkdownV2(BOT_VERSION)}

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

function registerIniciarCommand(bot: Telegraf) {
  bot.command("iniciar", async (ctx: Context) => {
    await startCommand(ctx);
  });
}

export const iniciarCommand = {
  register: registerIniciarCommand,
  name: () => "/iniciar",
  help: () => "Use o comando `/start` para iniciar o bot e receber uma mensagem de boas-vindas\\.",
  description: () => "🚀 Inicia o bot e exibe a lista de comandos disponíveis.",
};