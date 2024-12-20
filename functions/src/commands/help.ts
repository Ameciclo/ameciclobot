import { Context, Telegraf } from "telegraf";
import { getPautaCommandHelp, getPautaCommandName } from "./pauta";
import { getClippingCommandName, getClippingCommandHelp } from "./clipping";
import { getDemandCommandName, getDemandCommandHelp } from "./demanda";
import {
  getReferralsCommandName,
  getReferralsCommandHelp,
} from "./encaminhamentos";
import { getInformeCommandName, getInformeCommandHelp } from "./informe";
import { getQuemSouEuCommandName, getQuemSouEuCommandHelp } from "./quemsoueu";

export function getHelpCommandName() {
  return "/ajuda";
}

export function getHelpCommandHelp() {
  return "Use o comando `/ajuda` para obter ajuda sobre os comandos disponíveis no bot.\n\nO bot retornará uma lista de comandos e instruções de uso.";
}

export function getHelpCommandDescription() {
  return "❓ Exibir lista de comandos e instruções.";
}

export function registerAjudaCommand(bot: Telegraf) {
  bot.command("ajuda", async (ctx: Context) => {
    await helpCommand(ctx);
  });
}

export function registerHelpCommand(bot: Telegraf) {
  bot.help(async (ctx: Context) => {
    await helpCommand(ctx);
  });
}

async function helpCommand(ctx: Context) {
  const helpMessage = `
  🤖 *@ameciclobot - Auxiliar Ameciclista* 🤝
  
  Aqui está a lista de comandos disponíveis:
  
  *${getPautaCommandName()}*:  
  ${getPautaCommandHelp()}
  
  *${getInformeCommandName()}*:  
  ${getInformeCommandHelp()}
  
  *${getClippingCommandName()}*:  
  ${getClippingCommandHelp()}
  
  *${getDemandCommandName()}*:  
  ${getDemandCommandHelp()}
  
  *${getReferralsCommandName()}*:  
  ${getReferralsCommandHelp()}
  
  *${getQuemSouEuCommandName()}*:  
  ${getQuemSouEuCommandHelp()}
  
  ❓ */help ou /ajuda*:  
  Exibe esta lista de comandos e suas explicações.
  
  Se tiver dúvidas, fale com a Ameciclo ou envie mensagem para @ameciclo_info.
      `;

  await ctx.reply(helpMessage, { parse_mode: "Markdown" });
}
