// src/commands/processarExtratosCcCommand.ts
import { Context, Telegraf } from "telegraf";
import axiosInstance from "../../config/httpService";
import { parse } from "csv-parse/sync";
import getAccounts from "../../credentials/accounts.json"; // Array de contas
import projectsSpreadsheet from "../../credentials/projectsSpreadsheet.json"; // Contém { id, headers, statementsFolder, workgroup, ... }
import {
  appendExtratoRow,
  appendExtratoData,
  uploadCSVToDrive,
} from "../../services/google";
import { getMonthNamePortuguese } from "../../utils/utils";
import workgroups from "../../credentials/workgroupsfolders.json";
import iconv from "iconv-lite";

// ======= Funções Auxiliares para o CSV =========
function removeLeadingZeros(str: string): string {
  return str.replace(/^0+/, "");
}

function deleteRow(arr: any[][], rowIndex: number): any[][] {
  arr.splice(rowIndex - 1, 1);
  return arr;
}

function convertCSVtoStatementsData(csv: any[][]): any[][] {
  // Remove a primeira linha (cabeçalho) e a última linha (resumo/saldo)
  csv = deleteRow(csv, 1);
  csv = deleteRow(csv, csv.length);
  const data: any[][] = [];
  for (let i = 0; i < csv.length; i++) {
    const row = csv[i];
    const dateStr = row[3]; // Data no formato DDMMYYYY, ex: "31012025"
    const day = Number(dateStr.substring(0, 2));
    const month = Number(dateStr.substring(2, 4));
    const year = Number(dateStr.substring(4, 8));
    // Formata a data como "DD/MM/YYYY"
    const formattedDate =
      ("0" + day).slice(-2) + "/" + ("0" + month).slice(-2) + "/" + year;
    const value = Number(row[10]) / 100;
    let type = "Saída";
    const code = row[8];
    if (code === "855" || code === "791" || code === "848") {
      type = "Desinvestido";
    } else if (code === "345") {
      type = "Investido";
    } else if (code === "900") {
      type = "Entrada ERRO!";
    } else if (row[11] === "C") {
      type = "Entrada";
    }
    // Converte a info usando latin1 para utf8
    const info = row[8] + " " + row[9] + " " + row[12];
    data.push([formattedDate, value, type, info]);
  }
  return data;
}

/**
 * Processa o CSV de extrato e retorna:
 * - account: número da conta identificada (ex: "76.849-9")
 * - statements: array dos dados processados (detalhados)
 * - fileContent: o conteúdo original do CSV (já convertido para UTF-8)
 * - month: extraído da última linha (coluna 4) – mês com dois dígitos
 * - year: extraído da última linha (coluna 4) – ano com 4 dígitos
 * - matchedAccount: o objeto da conta encontrada
 */
async function processExtratoCsv(fileUrl: string): Promise<{
  account: string;
  statements: any[][];
  fileContent: string;
  month: string;
  year: string;
  matchedAccount: any;
}> {
  try {
    // Baixa o arquivo como arraybuffer e converte usando iconv
    const response = await axiosInstance.get(fileUrl, {
      responseType: "arraybuffer",
    });
    const fileBuffer = Buffer.from(response.data);
    const fileContent = iconv.decode(fileBuffer, "latin1");

    const csvData = parse(fileContent, {
      delimiter: ";",
      trim: true,
    });
    // Extrai a data do saldo (última linha do CSV)
    const originalCsv = csvData.slice();
    const lastRow = originalCsv[originalCsv.length - 1];
    const saldoDateStr: string = lastRow[3]; // Ex: "31012025"
    const monthStr = saldoDateStr.substring(2, 4); // Ex: "01"
    const yearStr = saldoDateStr.substring(4, 8); // Ex: "2025"

    const statementsData = convertCSVtoStatementsData(csvData);

    // Identifica a conta a partir do valor do segundo campo da primeira linha de dados
    if (csvData.length < 2) {
      throw new Error("CSV sem dados suficientes.");
    }
    const rawAccount = removeLeadingZeros(csvData[1][1]);

    // Filtra os accounts do tipo "Conta Corrente"
    const accounts = getAccounts.filter(
      (acc: any) => acc.type === "Conta Corrente"
    );
    let matchedAccount = accounts.find((acc: any) => {
      const cleanAccNumber = acc.number.replace(/[^\d]/g, "");
      const cleanResultAccount = rawAccount.replace(/[^\d]/g, "");
      return cleanResultAccount === cleanAccNumber;
    });
    if (!matchedAccount) {
      matchedAccount = {
        bank: "desconhecido",
        bank_number: "desconhecido",
        number: "desconhecido",
        type: "Conta Corrente",
        fulltext: "desconhecido",
        sheet: "desconhecido",
        input_file_type: "csv",
        folder_id: "desconhecido",
      };
    }
    console.log("Conta identificada:", matchedAccount.fulltext);
    return {
      account: matchedAccount.number,
      statements: statementsData,
      fileContent,
      month: monthStr,
      year: yearStr,
      matchedAccount,
    };
  } catch (error) {
    console.error("Erro ao processar extrato CSV:", error);
    throw error;
  }
}

// Gera o nome do arquivo para upload, conforme padrão:
// "Extrato - [year].[month] - [matchedAccount.fulltext].csv"
function generateExtratoFilename(
  account: any,
  month: string,
  year: string
): string {
  return `Extrato - ${year}.${month} - ${account.fulltext}.csv`;
}

// ======= Registro do Comando /processar_extrato_cc =======
function registerProcessarExtratosCcCommand(bot: Telegraf) {
  bot.command("processar_extrato_cc", async (ctx: Context) => {
    try {
      console.log("[processar_extrato_cc] Comando iniciado.");

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
          "Por favor, responda a uma mensagem que contenha o arquivo CSV."
        );
        return;
      }
      const document = msg.reply_to_message.document;
      if (!document.mime_type || !document.mime_type.includes("csv")) {
        await ctx.reply("O arquivo deve ser CSV.");
        return;
      }
      const fileId = document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      // Processa o CSV e extrai as informações necessárias, inclusive o mês e o ano do saldo
      const result = await processExtratoCsv(fileLink.href);
      console.log("[processar_extrato_cc] Extrato processado");

      const matchedAccount = result.matchedAccount;

      // Gerar o nome do arquivo para upload utilizando o mês e o ano extraídos do CSV
      const filename = generateExtratoFilename(
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
      console.log("[processar_extrato_cc] Arquivo CSV enviado");

      // Prepara a linha de resumo usando o mês e o ano extraídos do CSV
      const monthName = getMonthNamePortuguese(parseInt(result.month));
      const summaryRow = ["MÊS", monthName, result.year, uploadedFileLink];

      // Faz o append da linha de resumo na aba correta (definida em matchedAccount.sheet)
      await appendExtratoRow(
        projectsSpreadsheet.id,
        matchedAccount.sheet,
        summaryRow
      );
      console.log("[processar_extrato_cc] Linha de resumo adicionada na aba!");

      // Agora, faz o append dos dados detalhados (statements) na mesma aba
      if (result.statements && result.statements.length > 0) {
        await appendExtratoData(
          projectsSpreadsheet.id,
          matchedAccount.sheet,
          result.statements
        );
        console.log(
          "[processar_extrato_cc] Dados detalhados adicionados na aba"
        );
      } else {
        console.log(
          "[processar_extrato_cc] Nenhum dado detalhado para adicionar."
        );
      }

      await ctx.reply(
        `Extrato processado e enviado com sucesso para a conta ${matchedAccount.number}. Linha de resumo e dados detalhados adicionados na aba ${matchedAccount.sheet}.`
      );
      return;
    } catch (error) {
      console.error("[processar_extrato_cc] Erro:", error);
      await ctx.reply("Erro ao processar extrato de conta corrente.");
      return;
    }
  });
}

export const processarExtratosCcCommand = {
  register: registerProcessarExtratosCcCommand,
  name: () => "/processar_extrato_cc",
  help: () =>
    "Processa os extratos de conta corrente (CSV) e atualiza a planilha com um resumo e os dados detalhados.",
  description: () =>
    "Processa o arquivo CSV de extrato de conta corrente, identifica a conta (76 ou 90), extrai o mês e ano do saldo e utiliza essas informações para gerar o nome do arquivo, além de fazer o append da linha resumo e dos dados detalhados na aba indicada.",
};
