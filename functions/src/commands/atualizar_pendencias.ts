// commands/verificarPendenciasCommand.ts
import { Context, Telegraf } from "telegraf";
import { savePendingItems } from "../services/firebase";
import { getPendingItems } from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";

export function getName() {
  return "/verificar_pendencias";
}

export function getHelp() {
  return "Verifica pendências na planilha financeira e grava os dados no Firebase Realtime Database.";
}

export function getDescription() {
  return "Lê a planilha financeira, identifica os projetos com comprovantes faltantes e registra (link da planilha, nome do projeto e quantidade de pendências) no Firebase.";
}

export function register(bot: Telegraf) {
  bot.command("verificar_pendencias", async (ctx: Context) => {
    try {
      // getPendingItems deve ler as planilhas e retornar um array de objetos, ex:
      // [{ planilhaLink: string, nomeProjeto: string, quantidadePendencias: number }, ...]
      const pendencias = await getPendingItems(projectsSpreadsheet.id);

      // Salva os dados no Firebase Realtime Database
      await savePendingItems(pendencias);

      ctx.reply(
        "Pendências verificadas e registradas no Firebase com sucesso."
      );
    } catch (error) {
      console.error("Erro ao verificar pendências:", error);
      ctx.reply("Erro ao verificar pendências.");
    }
  });
}

export const verificarPendenciasCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
