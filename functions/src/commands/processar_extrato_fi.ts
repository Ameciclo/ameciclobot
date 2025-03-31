// src/commands/processarExtratoFiCommand.ts
import { Context, Telegraf } from "telegraf";

// Função simulada para extrair dados do PDF via OCR ou PDF parsing
async function parseInvestmentsPDFToCSVData(
  fileUrl: string
): Promise<string[]> {
  // Aqui você deve implementar a lógica de extração utilizando uma biblioteca de OCR ou PDF parsing.
  // Por enquanto, retorna um array simulado.
  console.log("[processar_extrato_fi] Simulando extração de dados do PDF.");
  return [
    "  20427068",
    "  789623",
    "  182767",
    "  3888",
    "  0",
    "  178879",
    "  19816324",
  ];
}

// Função que processa o extrato do fundo de investimento
async function processExtratoFi(fileUrl: string): Promise<any[]> {
  try {
    // Extrai os dados do PDF
    const pdfData = await parseInvestmentsPDFToCSVData(fileUrl);
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // 0-indexado
    // Se o mês for 0 (janeiro), ajuste para dezembro do ano anterior
    if (month === 0) {
      month = 12;
      year = year - 1;
    }
    const headerDate = `01/${month.toString().padStart(2, "0")}/${year}`;
    let csvData: string[] = [headerDate];
    for (let i = 0; i < pdfData.length; i++) {
      let value = pdfData[i].trim();
      value = value.replace(".", "");
      csvData.push(value);
    }
    csvData.pop(); // remove o último elemento
    csvData.push(
      `=INDIRECT("R[0]C[-3]",FALSE) - INDIRECT("R[0]C[-2]",FALSE) - INDIRECT("R[0]C[-1]",FALSE)`
    );
    csvData.push(
      `=SUM(INDIRECT("R[0]C[-7]",FALSE);INDIRECT("R[0]C[-6]",FALSE);-INDIRECT("R[0]C[-5]",FALSE);INDIRECT("R[0]C[-4]",FALSE);-INDIRECT("R[0]C[-3]",FALSE);-INDIRECT("R[0]C[-2]",FALSE))`
    );
    csvData.push(fileUrl);
    return [csvData];
  } catch (error) {
    console.error("Erro ao processar extrato FI:", error);
    throw error;
  }
}

function registerProcessarExtratoFiCommand(bot: Telegraf) {
  bot.command("processar_extrato_fi", async (ctx: Context) => {
    try {
      console.log("[processar_extrato_fi] Comando iniciado.");
      const msg = ctx.message as any;
      if (!msg || !msg.reply_to_message || !msg.reply_to_message.document) {
        await ctx.reply(
          "Por favor, responda a uma mensagem que contenha o arquivo PDF."
        );
        return;
      }
      const document = msg.reply_to_message.document;
      if (!document.mime_type || !document.mime_type.includes("pdf")) {
        await ctx.reply("O arquivo deve ser PDF.");
        return;
      }
      const fileId = document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      console.log("[processar_extrato_fi] URL do arquivo:", fileLink.href);
      const processedData = await processExtratoFi(fileLink.href);
      console.log("[processar_extrato_fi] Dados processados:", processedData);
      await ctx.reply(
        "Extrato de fundo de investimento processado com sucesso."
      );
      return;
    } catch (error) {
      console.error("[processar_extrato_fi] Erro:", error);
      await ctx.reply("Erro ao processar extrato de fundo de investimento.");
      return;
    }
  });
}

export const processarExtratoFiCommand = {
  register: registerProcessarExtratoFiCommand,
  name: () => "/processar_extrato_fi",
  help: () => "Processa os extratos do fundo de investimento (PDF).",
  description: () =>
    "Processa o arquivo PDF de extrato do fundo de investimento, converte os dados para o formato necessário e prepara para o upload na planilha.",
};
