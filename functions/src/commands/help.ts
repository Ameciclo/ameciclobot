import { Context, Telegraf } from "telegraf";
import { getPautaCommandHelp, getPautaCommandName } from "./pauta";
import { getClippingCommandName, getClippingCommandHelp } from "./clipping";
import { getDemandaCommandName, getDemandaCommandHelp } from "./demanda";
import {
  getEncaminhamentoCommandName,
  getEncaminhamentoCommandHelp,
} from "./encaminhamentos";
import { getInformeCommandName, getInformeCommandHelp } from "./informe";
import { getQuemSouEuCommandName, getQuemSouEuCommandHelp } from "./quemsoueu";
import {
  getPedidoCommandDescription,
  getPedidoCommandName,
} from "./pedido_de_informacao";

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
  const helpMessage = `
🤖 <b>@ameciclobot - Auxiliar Ameciclista</b> 🤝

Aqui está a lista de comandos disponíveis:

📝 <b>${getPautaCommandName()}</b>:  
${getPautaCommandHelp()}

📢 <b>${getInformeCommandName()}</b>:  
${getInformeCommandHelp()}

🔗 <b>${getClippingCommandName()}</b>:  
${getClippingCommandHelp()}

📌 <b>${getDemandaCommandName()}</b>:  
${getDemandaCommandHelp()}

🔄 <b>${getEncaminhamentoCommandName()}</b>:  
${getEncaminhamentoCommandHelp()}

🔐 <b>${getPedidoCommandName()}</b>:  
${getPedidoCommandDescription()}

🤔 <b>${getQuemSouEuCommandName()}</b>:  
${getQuemSouEuCommandHelp()}

❓ <b>/help ou /ajuda</b>:  
Exibe esta lista de comandos e suas explicações.

📩 Se tiver dúvidas, fale com a Ameciclo ou envie mensagem para <a href="https://t.me/ameciclo_info">@ameciclo_info</a>.
`;

  await ctx.reply(helpMessage, { parse_mode: "HTML" });
}

async function helpCommandSpecific(ctx: Context, command: string) {
  const commandHelpMap: Record<string, () => string> = {
    pauta: getPautaCommandHelp,
    informe: getInformeCommandHelp,
    clipping: getClippingCommandHelp,
    demanda: getDemandaCommandHelp,
    encaminhamento: getEncaminhamentoCommandHelp,
    pedido_de_informacao: getPedidoCommandDescription,
    quem_sou_eu: getQuemSouEuCommandHelp,
  };

  const helpFunction = commandHelpMap[command.toLowerCase()];

  if (helpFunction) {
    const helpMessage = `
    🔍 Ajuda para o comando <b>${command}</b>:
    
    ${helpFunction()}
    
    📩 Se tiver dúvidas, fale com a Ameciclo ou envie mensagem para <a href="https://t.me/ameciclo_info">@ameciclo_info</a>.
    `;

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
    // Verifica se ctx.message existe e se contém 'text'
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text || "";
      const args = text.split(" ").slice(1); // Pega os argumentos após o comando "/ajuda"

      if (args.length > 0) {
        await helpCommandSpecific(ctx, args[0]);
      } else {
        await helpCommand(ctx);
      }
    } else {
      // Caso contrário, envia uma mensagem padrão
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
