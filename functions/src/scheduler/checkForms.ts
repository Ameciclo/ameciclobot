// src/scheduler/checkForms.ts
import {
  getRegisteredForms,
  updateRegisteredFormLastRow,
} from "../services/firebase";
import { getSheetsClient } from "../services/google";
import { Telegraf } from "telegraf";
import { Markup } from "telegraf";

export const checkGoogleForms = async (bot: Telegraf) => {
  console.log("Iniciando verificação de planilhas...");
  try {
    const forms = await getRegisteredForms();
    if (!forms) {
      console.log("Nenhuma planilha registrada.");
      return;
    }
    // Para cada planilha registrada
    for (const formId in forms) {
      const { sheetId, telegramGroupId, lastRow, responsesTabGid, formName } =
        forms[formId];
      console.log(
        `Verificando planilha ${sheetId} para o grupo ${telegramGroupId} com lastRow=${lastRow}`
      );
      
      console.log("GID", responsesTabGid)

      // Usa o nome da aba salvo (responsesTabName) ou padrão
      const tabName = "Respostas ao formulário 1";
      // Monta o range para obter apenas a primeira coluna (coluna A)
      const range = `${tabName}!A${lastRow + 1}:A`;
      console.log(`Consultando range: ${range}`);

      const sheets = getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
      const responses = response.data.values || [];
      console.log(`Foram encontradas ${responses.length} novas respostas.`);

      if (responses.length > 0) {
        const newLastRow = lastRow + responses.length;
        await updateRegisteredFormLastRow(newLastRow, formId);

        let message = `📝 Novas respostas na planilha "${formName}":\n`;
        responses.forEach((row: string[], idx: number) => {
          message += `\nHorário da resposta: ${row[0]}\n`; // apenas a primeira coluna
        });

        // Cria um botão para ver a planilha completa
        const buttons = Markup.inlineKeyboard([
          [
            Markup.button.url(
              "Ver planilha",
              `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
            ),
          ],
        ]);

        await bot.telegram.sendMessage(telegramGroupId, message, {
          parse_mode: "HTML",
          reply_markup: buttons.reply_markup,
        });
        console.log(
          `Notificação enviada para o grupo ${telegramGroupId} para a planilha "${sheetId}".`
        );
      } else {
        console.log(
          `Nenhuma resposta nova encontrada para a planilha ${sheetId}.`
        );
      }
    }
  } catch (error) {
    console.error("Erro ao verificar planilhas:", error);
  }
};
