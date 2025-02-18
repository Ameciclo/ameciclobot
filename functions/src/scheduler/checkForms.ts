// src/scheduler/checkForms.ts
import {
  getRegisteredForms,
  updateRegisteredFormLastRow,
} from "../services/firebase";
import { getSheetsClient } from "../services/google";
import { Telegraf } from "telegraf";

export const checkGoogleForms = async (bot: Telegraf) => {
  try {
    const forms = await getRegisteredForms();
    if (!forms) {
      console.log("Nenhuma planilha registrada.");
      return;
    }
    // Para cada planilha registrada
    for (const formId in forms) {
      const { sheetId, telegramGroupId, lastRow, responsesTabGid } =
        forms[formId];
      // Define a aba a ser monitorada
      const tabName = responsesTabGid || "Respostas ao formulário 1";
      // Monta o range: a partir da linha lastRow+1, coluna A até Z
      const range = `${tabName}!A${lastRow + 1}:Z`;
      const sheets = getSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
      const responses = response.data.values || [];
      if (responses.length > 0) {
        const newLastRow = lastRow + responses.length;
        await updateRegisteredFormLastRow(newLastRow, formId);
        let message = `📝 Novas respostas na planilha "${sheetId}" (aba "${tabName}"): \n`;
        responses.forEach((row: string[], idx: number) => {
          message += `\nResposta ${idx + 1}:\n`;
          row.forEach((cell: string, i: number) => {
            message += `Campo ${i + 1}: ${cell}\n`;
          });
        });
        await bot.telegram.sendMessage(telegramGroupId, message);
        console.log(
          `Notificação enviada para o grupo ${telegramGroupId} para a planilha "${sheetId}".`
        );
      }
    }
  } catch (error) {
    console.error("Erro ao verificar planilhas:", error);
  }
};
