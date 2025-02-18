import { Telegraf } from "telegraf";
import { getSheetsClient } from "../services/google";
import {
  getRegisteredForms,
  updateRegisteredFormLastRow,
} from "../services/firebase";

// Essa função será executada a cada 24 horas (você pode ajustar a cron expression conforme desejar)
export const checkGoogleForms = async (bot: Telegraf) => {
  try {
    const forms = await getRegisteredForms();
    if (!forms) {
      console.log("Nenhum formulário cadastrado.");
      return;
    }

    // Para cada formulário cadastrado
    for (const formId in forms) {
      const { sheetId, telegramGroupId, lastRow = 1, formName } = forms[formId];

      // Obtém o cliente do Google Sheets a partir do seu Google Service
      const sheets = getSheetsClient();

      // Supondo que os dados começam na linha lastRow+1 (linha 1 tem cabeçalho)
      const range = `A${lastRow + 1}:Z`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });
      const responses = response.data.values || [];

      if (responses.length > 0) {
        // Atualiza o marcador no Firebase
        const newLastRow = lastRow + responses.length;
        await updateRegisteredFormLastRow(newLastRow, formId);

        // Formata a mensagem (de forma semelhante ao seu handler de eventos)
        let message = `📝 Novas respostas para o formulário "${
          formName || formId
        }":\n`;
        responses.forEach((row: string[], idx: number) => {
          message += `\nResposta ${idx + 1}:\n`;
          row.forEach((cell: string, i: number) => {
            message += `Campo ${i + 1}: ${cell}\n`;
          });
        });

        // Envia a mensagem para o grupo do Telegram
        await bot.telegram.sendMessage(telegramGroupId, message);
        console.log(
          `Aviso enviado para o grupo ${telegramGroupId} para o formulário "${
            formName || formId
          }".`
        );
      }
    }
  } catch (error) {
    console.error("Erro ao verificar formulários:", error);
  }
};
