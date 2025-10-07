import { Context, Telegraf } from "telegraf";
import { getWeeklyReportData, formatReportMessage } from "../services/report-service";
import { getWorkgroupId } from "../services/firebase";

function registerRelatorioSemanalCommand(bot: Telegraf) {
  bot.command("relatorio_semanal", async (ctx: Context) => {
    try {
      console.log("[relatorio_semanal] Iniciando comando");
      await ctx.reply("🔄 Coletando dados do relatório semanal...");

      const reportData = await getWeeklyReportData();
      const { captacao, secretaria } = formatReportMessage(reportData);

      // Enviar para Captação
      const captacaoGroupId = await getWorkgroupId("Captação");
      if (captacaoGroupId) {
        await ctx.telegram.sendMessage(captacaoGroupId, captacao, { parse_mode: "Markdown" });
        console.log("[relatorio_semanal] Enviado para Captação");
      }

      // Enviar para Secretaria apenas se houver livros atrasados
      if (secretaria) {
        const secretariaGroupId = await getWorkgroupId("Secretaria");
        if (secretariaGroupId) {
          await ctx.telegram.sendMessage(secretariaGroupId, secretaria, { parse_mode: "Markdown" });
          console.log("[relatorio_semanal] Enviado para Secretaria");
        }
      }

      await ctx.reply("✅ Relatório semanal enviado com sucesso!");
      
    } catch (err) {
      console.error("[relatorio_semanal] Erro:", err);
      await ctx.reply(`❌ Erro ao gerar relatório semanal: ${err}`);
    }
  });
}

export const relatorioSemanalCommand = {
  register: registerRelatorioSemanalCommand,
  name: () => "/relatorio_semanal",
  help: () => "Gera e envia o relatório semanal para os grupos da Captação e Secretaria.",
  description: () => "📊 Relatório semanal automático."
};