import { Context, Telegraf } from "telegraf";
import {
  getClippingCommandName,
  getClippingCommandDescription,
} from "./clipping";
import { getDemandCommandName, getDemandCommandDescription } from "./demanda";
import {
  getReferralsCommandName,
  getReferralsCommandDescription,
} from "./encaminhamentos";
import { getInformeCommandName, getInformeCommandDescription } from "./informe";
import { getPautaCommandName, getPautaCommandDescription } from "./pauta";
import {
  getQuemSouEuCommandName,
  getQuemSouEuCommandDescription,
} from "./quemsoueu";
import { escapeMarkdownV2 } from "../utils/utils";

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
  bot.start(async (ctx: Context) => {
    await startCommand(ctx);
  });
}

export function registerIniciarCommand(bot: Telegraf) {
  bot.command("iniciar", async (ctx: Context) => {
    await startCommand(ctx);
  });
}

async function startCommand(ctx: Context) {
  const startMessage = escapeMarkdownV2(`
🎉 Olá, sou *@ameciclobot*! 🚴‍♀️🚴‍♂️

Auxiliar para demandas e registros da *Ameciclo* – Associação Metropolitana de Ciclistas do Recife. Aqui estão os comandos disponíveis para facilitar a sua vida:

📝 *${getPautaCommandName()}* - ${getPautaCommandDescription()}

📢 *${getInformeCommandName()}* - ${getInformeCommandDescription()}

🔗 *${getClippingCommandName()}* - ${getClippingCommandDescription()}

📌 *${getDemandCommandName()}* - ${getDemandCommandDescription()}

🔄 *${getReferralsCommandName()}* - ${getReferralsCommandDescription()}

🤔 *${getQuemSouEuCommandName()}* - ${getQuemSouEuCommandDescription()}

📩 Se tiver dúvidas ou sugestões, registre-a *Ameciclo* em https://github.com/Ameciclo/ameciclobot ou fale com @ameciclo_info aqui no Telegram.

🚀 Bora começar? Digite um dos comandos acima para começar a usar!
    `);

  await ctx.reply(startMessage, { parse_mode: "Markdown" });
}
