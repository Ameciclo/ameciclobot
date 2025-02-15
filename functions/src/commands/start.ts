import { Context, Telegraf } from "telegraf";
import {
  getClippingCommandName,
  getClippingCommandDescription,
} from "./clipping";
import { getDemandaCommandName, getDemandaCommandDescription } from "./demanda";
import {
  getEncaminhamentoCommandName,
  getEncaminhamentoCommandDescription,
} from "./encaminhamentos";
import { getInformeCommandName, getInformeCommandDescription } from "./informe";
import { getPautaCommandName, getPautaCommandDescription } from "./pauta";
import {
  getQuemSouEuCommandName,
  getQuemSouEuCommandDescription,
} from "./quemsoueu";
import { getPedidoCommandDescription } from "./pedido_de_informacao";

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
  const startMessage = `
  🎉 Olá, sou <b>@ameciclobot</b>! 🚴‍♀️🚴‍♂️

Auxiliar para demandas e registros da <b>Ameciclo</b> – Associação Metropolitana de Ciclistas do Recife. Aqui estão os comandos disponíveis para facilitar a sua vida:

📝 <b>${getPautaCommandName()}</b> - ${getPautaCommandDescription()}
📢 <b>${getInformeCommandName()}</b> - ${getInformeCommandDescription()}
🔗 <b>${getClippingCommandName()}</b> - ${getClippingCommandDescription()}
📌 <b>${getDemandaCommandName()}</b> - ${getDemandaCommandDescription()}
🔄 <b>${getEncaminhamentoCommandName()}</b> - ${getEncaminhamentoCommandDescription()}
🔐 <b>${getPedidoCommandDescription()}</b> - ${getPedidoCommandDescription()}
🤔 <b>${getQuemSouEuCommandName()}</b> - ${getQuemSouEuCommandDescription()}

📩 Se tiver dúvidas ou sugestões, registre-a na Ameciclo em <a href="https://github.com/Ameciclo/ameciclobot">GitHub</a> ou fale com @ameciclo_info aqui no Telegram.

🚀 Bora começar? Digite um dos comandos acima para começar a usar!
`;

  await ctx.reply(startMessage, { parse_mode: "HTML" });
}
