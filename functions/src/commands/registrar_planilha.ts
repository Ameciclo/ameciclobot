// src/commands/registrar_planilha.ts
import { Context, Telegraf, Markup } from "telegraf";
import { registerNewForm } from "../services/firebase";
import { getSheetDetails } from "../services/google";

export function getName() {
  return "/registrar_planilha";
}

export function getHelp() {
  return "Use o comando `/registrar\\_planilha` para registrar uma planilha de formulário a ser monitorada:\n`/registrar\\_planilha \\[url da planilha\\]`";
}

export function getDescription() {
  return "📊 Registrar uma planilha de formulário para monitoramento.";
}

export function register(bot: Telegraf) {
  bot.command("registrar_planilha", async (ctx: Context) => {
    if (!ctx.message || !("text" in ctx.message)) {
      return ctx.reply(
        "Este comando só pode ser usado com mensagens de texto."
      );
    }
    const args = ctx.message.text.split(" ").slice(1);
    if (args.length === 0) {
      return ctx.reply(
        "Por favor, forneça a URL da planilha.\nExemplo:\n/registrar_planilha https://docs.google.com/spreadsheets/d/PLANILHA_ID/edit"
      );
    }
    const sheetUrl = args[0];
    // Extrai o ID da planilha usando regex (/\/d\/([^/]+)/)
    const match = sheetUrl.match(/\/d\/([^/]+)/);
    if (!match) {
      return ctx.reply(
        "Não foi possível extrair o ID da planilha a partir da URL fornecida."
      );
    }
    const sheetId = match[1];
    const telegramGroupId = ctx.chat?.id;
    if (!telegramGroupId) {
      return ctx.reply("Não foi possível identificar o chat.");
    }
    try {
      // Obtem os detalhes da planilha na aba "Respostas ao formulário 1"
      const tabName = "Respostas ao formulário 1";
      const sheetDetails = await getSheetDetails(sheetId, tabName);
      // A quantidade de linhas já preenchidas na aba de respostas
      const lastRow = sheetDetails.rowCount; // valor retornado pela função getSheetDetails

      // Registra a planilha no Firebase (no nó "registeredForms")
      await registerNewForm({
        sheetId,
        telegramGroupId: telegramGroupId,
        lastRow,
        formName: sheetDetails.name,
        responsesTabGid: sheetDetails.responsesTabGid,
      });

      // Monta os botões inline:
      // - "Ver planilha" abre a planilha completa
      // - "Ver respostas" abre diretamente a aba "Respostas ao formulário 1" (usando o gid)
      const buttons = Markup.inlineKeyboard([
        [Markup.button.url("Ver planilha", sheetUrl)],
      ]);

      return ctx.reply(
        `Planilha registrada com sucesso!\nID: ${sheetId}\nNome: ${sheetDetails.name}\nÚltima linha registrada: ${lastRow}`,
        buttons
      );
    } catch (error) {
      console.error("Erro ao registrar planilha:", error);
      return ctx.reply("Ocorreu um erro ao registrar a planilha.");
    }
  });
}

export const registrarPlanilhaCommand = {
  register,
  name: getName,
  help: getHelp,
  description: getDescription,
};
