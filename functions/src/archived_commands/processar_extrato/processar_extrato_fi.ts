// src/commands/processarExtratoFiCommand.ts
import { Context, Telegraf } from "telegraf";
import axiosInstance from "../../config/httpService";
import getAccounts from "../../credentials/accounts.json"; // Array de contas
import projectsSpreadsheet from "../../credentials/projectsSpreadsheet.json"; // Contém { id, statementsFolder, workgroup, ... }
import { appendExtratoRow, uploadCSVToDrive } from "../../services/google";
import workgroups from "../../credentials/workgroupsfolders.json";
import iconv from "iconv-lite";

async function processExtratoTxt(fileUrl: string): Promise<{
  account: string;
  summary: string[]; // [saldoAnterior, aplicacoes, resgates, rendimentoBruto, impostoRenda, iof]
  reference: string; // ex: "FEVEREIRO/2025"
  fileContent: string;
  month: string; // ex: "02"
  year: string; // ex: "2025"
  matchedAccount: any;
}> {
  try {
    // Baixa o arquivo como arraybuffer e converte para UTF-8 usando iconv (origem latin1)
    const response = await axiosInstance.get(fileUrl, {
      responseType: "arraybuffer",
    });
    const buffer = Buffer.from(response.data);
    const fileContent = iconv.decode(buffer, "latin1");

    // Divide o conteúdo em linhas
    const lines = fileContent.split(/\r?\n/);

    // Extrai a conta: procura a linha que começa com "Conta:" e pega a primeira palavra após
    let accountRaw = "";
    for (const line of lines) {
      if (line.trim().startsWith("Conta:")) {
        const parts = line.split("Conta:");
        if (parts.length > 1) {
          accountRaw = parts[1].trim().split(/\s+/)[0];
          break;
        }
      }
    }
    if (!accountRaw) {
      throw new Error("Conta não encontrada no extrato.");
    }

    // Extrai a referência de mês/ano: procura a linha que contém "Mês/ano referência:"
    let reference = "";
    for (const line of lines) {
      if (line.includes("Mês/ano referência:")) {
        const parts = line.split("Mês/ano referência:");
        if (parts.length > 1) {
          reference = parts[1].trim();
          break;
        }
      }
    }
    if (!reference) {
      throw new Error("Referência de mês/ano não encontrada.");
    }
    //console.log("Referência extraída:", reference);
    // Supondo que o formato seja "FEVEREIRO/2025", extraímos o mês numérico:
    const [refMonthName, refYear] = reference.split("/");
    const meses: { [key: string]: string } = {
      JANEIRO: "01",
      FEVEREIRO: "02",
      MARÇO: "03",
      ABRIL: "04",
      MAIO: "05",
      JUNHO: "06",
      JULHO: "07",
      AGOSTO: "08",
      SETEMBRO: "09",
      OUTUBRO: "10",
      NOVEMBRO: "11",
      DEZEMBRO: "12",
    };
    const refMonth = meses[refMonthName.toUpperCase()] || "00";

    // Extrai os valores do resumo do mês
    let resumoIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().includes("RESUMO DO MÊS")) {
        resumoIndex = i;
        break;
      }
    }
    if (resumoIndex === -1) {
      throw new Error("Seção 'Resumo do mês' não encontrada.");
    }
    // A partir de resumoIndex+1, coleta 6 valores numéricos ignorando linhas sem números
    const summary: string[] = [];
    let i = resumoIndex + 1;
    while (summary.length < 6 && i < lines.length) {
      const line = lines[i].trim();
      const match = line.match(/([\d\.,]+)$/);
      if (match && match[1].trim() !== "") {
        summary.push(match[1].trim());
      }
      i++;
    }
    console.log("Valores do resumo extraídos:", summary);

    // Seleciona o account correspondente para Fundo de Investimento - Conta com input_file_type "txt"
    const accounts = getAccounts.filter(
      (acc: any) =>
        acc.type === "Fundo de Investimento - Conta" &&
        acc.input_file_type === "txt"
    );
    let matchedAccount = accounts.find((acc: any) => {
      const cleanAccNumber = acc.number.replace(/[^\d]/g, "");
      const cleanExtracted = accountRaw.replace(/[^\d]/g, "");
      return cleanExtracted === cleanAccNumber;
    });
    if (!matchedAccount) {
      matchedAccount = {
        bank: "desconhecido",
        bank_number: "desconhecido",
        number: "desconhecido",
        type: "Fundo de Investimento - Conta",
        fulltext: "desconhecido",
        sheet: "desconhecido",
        input_file_type: "txt",
        folder_id: "desconhecido",
      };
    }
    console.log("Conta FI identificada:", matchedAccount.fulltext);

    return {
      account: matchedAccount.number,
      summary, // array com 6 valores (evitando o elemento vazio)
      reference, // ex: "FEVEREIRO/2025"
      fileContent,
      month: refMonth,
      year: refYear,
      matchedAccount,
    };
  } catch (error) {
    console.error("Erro ao processar extrato TXT:", error);
    throw error;
  }
}

function generateExtratoFiFilename(
  account: any,
  month: string,
  year: string
): string {
  return `Extrato - ${year}.${month} - ${account.fulltext}.txt`;
}

function registerProcessarExtratoFiCommand(bot: Telegraf) {
  bot.command("processar_extrato_fi", async (ctx: Context) => {
    try {
      console.log("[processar_extrato_fi] Comando iniciado.");

      // Restrição: somente no grupo Financeiro
      const currentChatId = ctx.chat?.id?.toString();
      const financeiroGroup = workgroups.find(
        (group: any) => group.label === projectsSpreadsheet.workgroup
      );
      if (!financeiroGroup || currentChatId !== financeiroGroup.value) {
        await ctx.reply(
          "Este comando só pode ser executado no grupo Financeiro."
        );
        return;
      }

      const msg = ctx.message as any;
      if (!msg || !msg.reply_to_message || !msg.reply_to_message.document) {
        await ctx.reply(
          "Por favor, responda a uma mensagem que contenha o arquivo TXT."
        );
        return;
      }
      const document = msg.reply_to_message.document;
      if (!document.mime_type || !document.mime_type.includes("plain")) {
        await ctx.reply("O arquivo deve ser TXT.");
        return;
      }
      const fileId = document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      const result = await processExtratoTxt(fileLink.href);
      console.log( "[processar_extrato_fi] Extrato processado");

      const matchedAccount = result.matchedAccount;

      // Gerar o nome do arquivo para upload utilizando o mês e ano extraídos
      const filename = generateExtratoFiFilename(
        matchedAccount,
        result.month,
        result.year
      );
      // ID da pasta para upload (definida em projectsSpreadsheet.statementsFolder)
      const folderId = projectsSpreadsheet.statementsFolder;
      const uploadedFileLink = await uploadCSVToDrive(
        result.fileContent,
        filename,
        folderId
      );
      console.log("[processar_extrato_fi] Arquivo TXT enviado.");

      // Prepara a linha de resumo com as colunas:
      // MÊS/ANO, SALDO ANTERIOR, APLICAÇÕES (+), RESGATES (-), RENDIMENTO BRUTO (+), IMPOSTO DE RENDA (-), IOF (-)
      // Em seguida, adiciona as fórmulas e o link para o arquivo.
      const summaryRow = [
        result.reference,
        ...result.summary,
        '=INDIRECT("R[0]C[-3]";FALSE) - INDIRECT("R[0]C[-2]";FALSE) - INDIRECT("R[0]C[-1]";FALSE)',
        '=SUM(INDIRECT("R[0]C[-7]";FALSE);INDIRECT("R[0]C[-6]";FALSE);-INDIRECT("R[0]C[-5]";FALSE);INDIRECT("R[0]C[-4]";FALSE);-INDIRECT("R[0]C[-3]";FALSE);-INDIRECT("R[0]C[-2]";FALSE))',
        uploadedFileLink,
      ];

      // Faz o append da linha de resumo na aba correta (definida em matchedAccount.sheet) do spreadsheet (projectsSpreadsheet.id)
      await appendExtratoRow(
        projectsSpreadsheet.id,
        matchedAccount.sheet,
        summaryRow
      );
      console.log("[processar_extrato_fi] Linha de resumo adicionada na aba.");

      // Se necessário, também pode fazer o append dos dados detalhados, mas neste exemplo não iremos processá-los.

      await ctx.reply(
        `Extrato FI processado e enviado com sucesso para a conta ${matchedAccount.number}. Linha de resumo adicionada na aba ${matchedAccount.sheet}.`
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
  help: () =>
    "Processa os extratos do fundo de investimento (TXT) e atualiza a planilha com um resumo.",
  description: () =>
    "Processa o arquivo TXT de extrato do fundo de investimento, extrai as informações do resumo e utiliza para gerar o nome do arquivo, além de fazer o append da linha resumo na aba indicada.",
};
