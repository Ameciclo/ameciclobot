import { Telegraf } from "telegraf";
import { commandsList } from "./commands";
import { iniciarCommand, registerStartCommand } from "./commands/start";
import { ajudaCommand, registerHelpCommand } from "./commands/help";
import { pagamentoCommand } from "./archived_commands/canceled/pagamento";

export function registerAllCommands(bot: Telegraf) {
  console.log(`Registrando comandos... Total no array: ${commandsList.length}`);
  console.log("Comandos no array:", commandsList.map(cmd => cmd.name()));

  // Comandos da lista principal
  commandsList.forEach((cmd, index) => {
    try {
      console.log(`[${index + 1}/${commandsList.length}] Registrando: ${cmd.name()}`);
      cmd.register(bot);
      console.log(`✅ ${cmd.name()} registrado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao registrar ${cmd.name()}:`, error);
    }
  });

  // Comandos especiais
  try {
    console.log("Registrando comandos especiais...");
    ajudaCommand.register(bot);
    registerHelpCommand(bot);
    iniciarCommand.register(bot);
    registerStartCommand(bot);
    pagamentoCommand.register(bot);
    console.log("✅ Comandos especiais registrados");
  } catch (error) {
    console.error("❌ Erro ao registrar comandos especiais:", error);
  }

  console.log(`🎯 Total: ${commandsList.length + 3} comandos registrados`);
}

export async function setTelegramCommands(bot: Telegraf) {
  try {
    console.log("Configurando comandos no Telegram...");

    const telegramCommands = commandsList.map((cmd) => ({
      command: cmd.name(),
      description: cmd.description(),
    }));

    telegramCommands.push({
      command: ajudaCommand.name(),
      description: ajudaCommand.description(),
    });
    telegramCommands.push({
      command: iniciarCommand.name(),
      description: iniciarCommand.description(),
    });

    await bot.telegram.setMyCommands(telegramCommands);
    console.log(`${telegramCommands.length} comandos configurados no Telegram`);
  } catch (error) {
    console.error("Erro ao configurar comandos no Telegram:", error);
    console.log("Bot continuará funcionando mesmo sem comandos configurados");
  }
}
