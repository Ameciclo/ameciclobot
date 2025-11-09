import { Telegraf } from "telegraf";
import { getWeeklyReportData, formatReportMessage } from "../services/report-service";
import { getWorkgroupId } from "../services/firebase";

export const sendWeeklyReport = async (bot: Telegraf, privateChatId?: number) => {
  console.log("Iniciando envio do relatório semanal...");
  
  try {
    const reportData = await getWeeklyReportData();
    const { captacao, secretaria } = formatReportMessage(reportData);

    if (privateChatId) {
      // Enviar no chat privado
      await bot.telegram.sendMessage(privateChatId, `📊 **Relatório Captação:**\n\n${captacao}`, { parse_mode: "Markdown" });
      if (secretaria) {
        await bot.telegram.sendMessage(privateChatId, `📋 **Relatório Secretaria:**\n\n${secretaria}`, { parse_mode: "Markdown" });
      }
      console.log("Relatório enviado no chat privado");
    } else {
      // Enviar para os grupos (comportamento original)
      const captacaoGroupId = await getWorkgroupId("Captação");
      if (captacaoGroupId) {
        await bot.telegram.sendMessage(captacaoGroupId, captacao, { parse_mode: "Markdown" });
        console.log("Relatório enviado para Captação");
      }

      if (secretaria) {
        const secretariaGroupId = await getWorkgroupId("Secretaria");
        if (secretariaGroupId) {
          await bot.telegram.sendMessage(secretariaGroupId, secretaria, { parse_mode: "Markdown" });
          console.log("Relatório enviado para Secretaria");
        }
      }
    }

    console.log("Relatório semanal enviado com sucesso!");
    
  } catch (error) {
    console.error("Erro ao enviar relatório semanal:", error);
  }
};