import { Context, Telegraf } from "telegraf";
import { appendSheetRowAsPromise } from "../services/google";

const SPREADSHEET_ID = "1-CbWV6tGo99gwN_NQja_GHAHUX3Q6IjkQAXvSp1pxpw";
const SHEET_NAME = "DENUNCIAS";

async function handleDenuncia(ctx: Context) {
  try {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("❌ Erro: mensagem inválida.");
      return;
    }

    const messageText = ctx.message.text;
    const denunciaText = messageText.replace("/denuncia", "").trim();

    if (!denunciaText) {
      await ctx.reply(
        "📝 Para fazer uma denúncia anônima, use:\n\n" +
        "`/denuncia [sua denúncia aqui]`\n\n" +
        "⚠️ **Importante**: Esta denúncia será completamente anônima. " +
        "Nem mesmo a equipe de TI conseguirá identificar quem enviou.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Armazena apenas o conteúdo e data - SEM user_id
    const currentDate = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Recife",
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const row = [currentDate, denunciaText];

    await appendSheetRowAsPromise(
      SPREADSHEET_ID,
      `${SHEET_NAME}!A:B`,
      row
    );

    await ctx.reply(
      "✅ **Denúncia registrada anonimamente**\n\n" +
      "Sua denúncia foi enviada e será analisada pela equipe responsável. " +
      "Nenhuma informação que possa identificá-lo foi armazenada.\n\n" +
      "🔒 **Privacidade garantida**: Nem mesmo a equipe de TI tem como " +
      "descobrir quem enviou esta denúncia.",
      { parse_mode: "Markdown" }
    );

    // Log genérico sem identificação
    console.log("[denuncia] Denúncia anônima registrada");

  } catch (error) {
    console.error("[denuncia] Erro ao processar denúncia:", error);
    await ctx.reply(
      "❌ Erro interno. Tente novamente em alguns minutos ou " +
      "entre em contato com @ameciclo_info."
    );
  }
}

function registerDenunciaCommand(bot: Telegraf) {
  bot.command("denuncia", handleDenuncia);
}

export const denunciaCommand = {
  register: registerDenunciaCommand,
  name: () => "/denuncia",
  description: () => "🔒 Registra uma denúncia de forma completamente anônima",
  help: () => 
    "Use `/denuncia [texto]` para registrar uma denúncia anônima\\. " +
    "Nenhuma informação que possa identificá\\-lo será armazenada\\."
};