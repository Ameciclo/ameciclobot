// src/commands/help.ts
import { Context, Telegraf } from "telegraf";
import { commandsList } from "../commands";
import { escapeMarkdownV2 } from "../utils/utils";
import { BOT_VERSION } from "../config/version";
import { getUserData } from "../services/firebase";
import { sendChatCompletion } from "../services/azure";

async function buildUserInfoMessage(ctx: Context): Promise<string> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  
  let message = `🤖 **Ameciclo Bot v${escapeMarkdownV2(BOT_VERSION)}**\n\n`;
  
  if (ctx.chat?.type !== 'private') {
    message += `💬 **Grupo:** ${escapeMarkdownV2((ctx.chat as any)?.title || 'N/A')}\n`;
    message += `🆔 **Chat ID:** ${chatId}\n\n`;
  }
  
  if (userId) {
    const userData = await getUserData(userId);
    message += `👤 **Suas informações:**\n`;
    message += `🆔 **User ID:** ${userId}\n`;
    message += `👋 **Nome:** ${escapeMarkdownV2(ctx.from?.first_name || 'N/A')}`;
    
    if (ctx.from?.last_name) {
      message += ` ${escapeMarkdownV2(ctx.from.last_name)}`;
    }
    
    if (ctx.from?.username) {
      message += `\n📱 **Username:** @${escapeMarkdownV2(ctx.from.username)}`;
    }
    
    if (userData?.ameciclo_register?.email) {
      message += `\n📧 **Email:** ${escapeMarkdownV2(userData.ameciclo_register.email)}`;
    } else {
      message += `\n📧 **Email:** Não cadastrado`;
    }
    
    if (userData?.role) {
      message += `\n🎭 **Função:** ${escapeMarkdownV2(userData.role)}`;
    }
  }
  
  message += `\n\n💡 **Como usar:**\n`;
  message += `• Digite \`/help\` para ver estas informações\n`;
  message += `• Digite \`/help [comando]\` para ajuda específica\n`;
  message += `• Digite \`/help [descrição]\` para encontrar comandos\n\n`;
  message += `📩 Dúvidas? Fale com @ameciclo\\_info`;
  
  return message;
}

async function helpCommand(ctx: Context) {
  const helpMessage = await buildUserInfoMessage(ctx);
  await ctx.reply(helpMessage, { parse_mode: "MarkdownV2" });
}

function getCommandByName(name: string) {
  return commandsList.find((cmd) => cmd.name() === name);
}

async function helpCommandSpecific(ctx: Context, query: string) {
  const normalizedCommand = query.startsWith("/") ? query : `/${query}`;
  let commandHelpers = getCommandByName(normalizedCommand);
  
  if (!commandHelpers) {
    try {
      const commandsInfo = commandsList.map(cmd => 
        `${cmd.name()}: ${cmd.description()} - ${cmd.help()}`
      ).join('\n');
      
      const prompt = `Baseado na lista de comandos abaixo, encontre o comando mais adequado para a consulta "${query}".

Comandos disponíveis:
${commandsInfo}

Retorne APENAS o nome do comando (ex: /evento) ou "NENHUM" se não encontrar correspondência.`;
      
      const response = await sendChatCompletion([
        {
          role: "system",
          content: "Você é um assistente que ajuda a encontrar comandos baseado em descrições. Retorne apenas o nome do comando ou NENHUM."
        },
        { role: "user", content: prompt }
      ]);
      
      const suggestedCommand = response.choices?.[0]?.message?.content?.trim();
      if (suggestedCommand && suggestedCommand !== "NENHUM") {
        commandHelpers = getCommandByName(suggestedCommand);
      }
    } catch (error) {
      console.error("[help] Erro na busca por IA:", error);
    }
  }
  
  if (commandHelpers) {
    const helpMessage = `🔍 **${escapeMarkdownV2(commandHelpers.name())}**\n\n` +
      `📝 ${escapeMarkdownV2(commandHelpers.description())}\n\n` +
      `${commandHelpers.help()}`;
    await ctx.reply(helpMessage, { parse_mode: "MarkdownV2" });
  } else {
    await ctx.reply(
      `❌ Comando ou funcionalidade "${escapeMarkdownV2(query)}" não encontrado\\.\n\n` +
      `💡 Use \`/help\` para ver suas informações e como usar o bot\\.`,
      { parse_mode: "MarkdownV2" }
    );
  }
}

function register(bot: Telegraf) {
  bot.command(["help", "ajuda"], async (ctx: Context) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text || "";
      const args = text.split(" ").slice(1);
      if (args.length > 0) {
        const query = args.join(" ");
        await helpCommandSpecific(ctx, query);
      } else {
        await helpCommand(ctx);
      }
    } else {
      await ctx.reply(
        "Não consegui processar sua mensagem\\. Tente novamente\\.",
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

export const ajudaCommand = {
  register,
  name: () => "/help",
  help: () =>
    "Use \`/help\` para ver suas informações, versão do bot e local\\. Use \`/help [comando]\` para ajuda específica ou \`/help [descrição]\` para encontrar comandos\\.",
  description: () => "❓ Informações do usuário e ajuda.",
};
