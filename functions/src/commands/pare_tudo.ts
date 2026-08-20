import { Context, Telegraf } from "telegraf";
import { admin } from "../config/firebaseInit";

async function setStopFlag(): Promise<void> {
  await admin.database().ref("stop_flags/global").set({
    stopped: true,
    stoppedAt: admin.database.ServerValue.TIMESTAMP,
  });
}

export async function isStopFlagSet(): Promise<boolean> {
  const snapshot = await admin.database().ref("stop_flags/global").once("value");
  const data = snapshot.val();
  if (!data?.stopped) return false;

  const stoppedAt = data.stoppedAt;
  if (!stoppedAt) return false;

  const elapsed = Date.now() - stoppedAt;
  if (elapsed > 5 * 60 * 1000) {
    await admin.database().ref("stop_flags/global").remove();
    return false;
  }

  return true;
}

export async function clearStopFlag(): Promise<void> {
  await admin.database().ref("stop_flags/global").remove();
}

function registerPareTudoCommand(bot: Telegraf): void {
  bot.command("pare_tudo", async (ctx: Context): Promise<void> => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) {
      await ctx.reply("Erro: nao foi possivel identificar usuario/chat.");
      return;
    }

    try {
      await setStopFlag();

      await ctx.reply(
        "Todas as operacoes de upload e arquivamento foram canceladas.\n\n"
        + "O flag expira em 5 minutos. Use /pare_tudo novamente se precisar."
      );
    } catch (error) {
      console.error("[pare_tudo] Erro:", error);
      await ctx.reply("Erro ao interromper operacoes.");
    }
  });
}

export const pareTudoCommand = {
  register: registerPareTudoCommand,
  name: () => "/pare_tudo",
  description: () => "Interrompe todas as operacoes de upload e arquivamento",
  help: () => "Comando de emergencia para cancelar operacoes de upload/arquivamento em andamento.",
};
