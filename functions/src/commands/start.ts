// src/commands/start.ts
import { Context, Telegraf } from "telegraf";
import { commandsList } from "../commands";

export function getStartCommandName() {
  return "/start";
}

export function getStartCommandHelp() {
  return "Use o comando `/start` para iniciar o bot e receber uma mensagem de boas-vindas.";
}

export function getStartCommandDescription() {
  return "🚀 Iniciar o bot.";
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

async function startCommand(ctx: Context) {
  const header =
    `🎉 Olá, sou <b>@ameciclobot</b>! 🚴‍♀️🚴‍♂️\n\n` +
    `Auxiliar para demandas e registros da <b>Ameciclo</b> – Associação Metropolitana de Ciclistas do Recife.\n\n` +
    `Aqui estão os comandos disponíveis:`;
  const footer = `\n\n📩 Se tiver dúvidas ou sugestões, registre no <a href="https://github.com/Ameciclo/ameciclobot">GitHub</a> ou fale com <a href="https://t.me/ameciclo_info">@ameciclo_info</a>.\n\n🚀 Bora começar? Digite um dos comandos acima para usar o bot!`;
  // Aqui usamos o buildCommandsMessage com o filtro "hideFromStart"
  const startMessage = buildCommandsMessage(header, footer, "hideFromStart");
  await ctx.reply(startMessage, { parse_mode: "HTML" });
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
