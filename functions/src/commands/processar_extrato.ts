// src/commands/processarExtrato.ts
import { reconcileExtract } from "../services/reconciliation";
import { parseBBCSV } from "../services/reconciliation/parsers/bb_csv_parser";
import { parseCoraCSV } from "../services/reconciliation/parsers/cora_csv_parser";
import { parseCoraCreditCSV } from "../services/reconciliation/parsers/cora_credit_csv_parser";
import { detectBankCSV } from "../services/reconciliation/bank_detector";
import axiosInstance from "../config/httpService";
import getAccounts from "../credentials/accounts.json";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import {
  appendExtratoRow,
  appendExtratoData,
  uploadCSVToDrive,
} from "../services/google";
import { getMonthNamePortuguese } from "../utils/utils";
import { decodeTextFile } from "../utils/decodeTextFile";
import workgroups from "../credentials/workgroupsfolders.json";
import { getAllRequests } from "../services/firebase";
import { PaymentRequest } from "../config/types";

import { Context, Markup, Telegraf } from "telegraf";

function formatSpreadsheetCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

const ACCOUNTING_SHEET_GIDS: Record<string, string> = {
  "EXTRATO CC 76": "684262481",
  "EXTRATO FI 76": "478565062",
  "EXTRATO CC 90": "410167064",
  "EXTRATO CC 106": "1954691645",
  "EXTRATO CC 131": "1183431137",
  "EXTRATO CD 2393": "183100216",
  "EXTRATO CC 2666": "1928472763",
};

function getAccountingSheetUrl(sheet?: string): string | null {
  if (!sheet) {
    return null;
  }

  const gid = ACCOUNTING_SHEET_GIDS[sheet];
  if (!gid) {
    return null;
  }

  return `https://docs.google.com/spreadsheets/d/${projectsSpreadsheet.id}/edit?gid=${gid}#gid=${gid}`;
}

async function convertCSVtoStatementsData(fileContent: string, sourceFileName?: string): Promise<any[]> {
  const data: any[] = [];
  const confirmedRequests = await getConfirmedPaymentRequests();
  
  // Parse CSV using new deterministic parser
  const { entries } = parseBBCSV(fileContent, "bb_cc", sourceFileName);
  
  // Execute deterministic reconciliation
  const { results, summary } = reconcileExtract(entries, confirmedRequests);
  
  console.log(`[RECONCILIATION] Resumo: ✅ ${summary.ok} ok | 🔗 ${summary.split} split | ⚠️ ${summary.ambiguous} ambíguo | ❓ ${summary.not_found} não encontrados`);
  
  // Convert results to spreadsheet format
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const result = results[i];
    
    const formattedDate = `${entry.postDate.getDate().toString().padStart(2, '0')}/${(entry.postDate.getMonth() + 1).toString().padStart(2, '0')}/${entry.postDate.getFullYear()}`;
    const formattedValue = `R$ ${entry.amount.toFixed(2).replace(".", ",")}`;
    let type = entry.type === "C" ? "Entrada" : "Saída";
    
    // Adjust type based on classification
    if (result.project === "Movimentação Bancária" && entry.narrative.includes("BB Rende Fácil")) {
      type = entry.type === "D" ? "Investido" : "Desinvestido";
    } else if (result.comment === "PIX DEVOLVIDO EXPLICAR") {
      type = entry.type === "C" ? "Entrada ERRO!" : "Saída ERRO!";
    } else if (result.comment === "ATENÇÃO, DETALHAR" && entry.narrative.toUpperCase().includes("AMECICL")) {
      type = entry.type === "C" ? "Entrada Remanejamento" : "Saída Remanejamento";
    }
    
    data.push([
      formattedDate,
      formattedValue,
      type,
      entry.narrative,
      result.comment,
      result.project
    ]);
  }
  
  return data;
}

async function processExtratoCsv(fileUrl: string, sourceFileName?: string) {
  const response = await axiosInstance.get(fileUrl, {
    responseType: "arraybuffer",
  });
  const fileBuffer = Buffer.from(response.data);
  const fileContent = decodeTextFile(fileBuffer);

  const detection = detectBankCSV(fileContent);

  if (detection.bank === "cora") {
    const confirmedRequests = await getConfirmedPaymentRequests();
    const isCreditStatement = detection.statementType === "credit";
    const parser = isCreditStatement ? parseCoraCreditCSV : parseCoraCSV;
    const sourceId = isCreditStatement ? "cora_cd" : "cora_cc";
    const accountType = isCreditStatement ? "Conta Crédito" : "Conta Corrente";
    const { entries, month: monthStr, year: yearStr, account: rawAccount } = parser(fileContent, sourceId);
    const { results, summary } = reconcileExtract(entries, confirmedRequests);

    console.log(`[RECONCILIATION] Resumo: ✅ ${summary.ok} ok | 🔗 ${summary.split} split | ⚠️ ${summary.ambiguous} ambíguo | ❓ ${summary.not_found} não encontrados`);

    const statementsData = entries.map((entry, i) => {
      const result = results[i];
      const formattedDate = `${entry.postDate.getDate().toString().padStart(2, "0")}/${(entry.postDate.getMonth() + 1).toString().padStart(2, "0")}/${entry.postDate.getFullYear()}`;
      const formattedValue = formatSpreadsheetCurrency(entry.amount);
      let type = entry.type === "C" ? "Entrada" : "Saída";

      if (!isCreditStatement && entry.narrative.includes("ASSOCIACAO M C G R - AME")) {
        type = entry.type === "D" ? "Investido" : "Desinvestido";
      } else if (!isCreditStatement && entry.narrative.includes("Cora SCFI")) {
        return [formattedDate, formattedValue, type, entry.narrative, "Fatura cartão de crédito", "Movimentação Bancária"];
      }

      return [
        formattedDate,
        formattedValue,
        type,
        entry.narrative,
        result.comment,
        result.project
      ];
    });

    const matchedAccount = getAccounts.find((acc: any) =>
      acc.bank === "Cora" &&
      acc.number === rawAccount &&
      acc.type === accountType &&
      acc.input_file_type === "csv"
    ) || {
      bank: "desconhecido",
      bank_number: "desconhecido",
      number: rawAccount,
      type: accountType,
      fulltext: `${accountType} (Cora) ${rawAccount}`,
      sheet: isCreditStatement ? "EXTRATO CC 2666" : "EXTRATO CD 2393",
      input_file_type: "csv",
      folder_id: "desconhecido",
    };

    return {
      account: matchedAccount.number,
      statements: statementsData,
      fileContent,
      month: monthStr,
      year: yearStr,
      matchedAccount,
    };
  }

  // Use new deterministic parser
  const { month: monthStr, year: yearStr, account: rawAccount } = parseBBCSV(fileContent, "bb_cc", sourceFileName);
  const statementsData = await convertCSVtoStatementsData(fileContent, sourceFileName);

  const accounts = getAccounts.filter(
    (acc: any) => acc.bank === "Banco do Brasil" && acc.type === "Conta Corrente"
  );
  let matchedAccount = accounts.find((acc: any) => {
    const cleanAccNumber = acc.number.replace(/[^\d]/g, "");
    const cleanResultAccount = rawAccount.replace(/[^\d]/g, "");
    return cleanResultAccount === cleanAccNumber && acc.input_file_type === "csv";
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

  return {
    account: matchedAccount.number,
    statements: statementsData,
    fileContent,
    month: monthStr,
    year: yearStr,
    matchedAccount,
  };
}

// ======= Funções para Fundo de Investimento (TXT) =======
async function processExtratoTxt(fileUrl: string) {
  const response = await axiosInstance.get(fileUrl, {
    responseType: "arraybuffer",
  });
  const buffer = Buffer.from(response.data);
  const fileContent = decodeTextFile(buffer);

  const lines = fileContent.split(/\r?\n/);

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

  return {
    account: matchedAccount.number,
    summary,
    reference,
    fileContent,
    month: refMonth,
    year: refYear,
    matchedAccount,
  };
}

function generateExtratoFilename(
  account: any,
  month: string,
  year: string,
  extension: string
): string {
  return `Extrato - ${year}.${month} - ${account.fulltext}.${extension}`;
}

function registerProcessarExtratoCommand(bot: Telegraf) {
  bot.command("processar_extrato", async (ctx: Context) => {
    try {
      console.log("[processar_extrato] Comando iniciado.");

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
          "Por favor, responda a uma mensagem que contenha o arquivo CSV ou TXT."
        );
        return;
      }

      const document = msg.reply_to_message.document;
      const fileId = document.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      // Detecta o tipo de arquivo pelo MIME type
      const isCSV = document.mime_type?.includes("csv");
      const isTXT = document.mime_type?.includes("plain");

      if (!isCSV && !isTXT) {
        await ctx.reply("O arquivo deve ser CSV (conta corrente) ou TXT (fundo de investimento).");
        return;
      }

      if (isCSV) {
        // Processa extrato de conta corrente
        const result = await processExtratoCsv(fileLink.href, document.file_name || "");
        console.log("[processar_extrato] Extrato CC processado");

        const filename = generateExtratoFilename(
          result.matchedAccount,
          result.month,
          result.year,
          "csv"
        );
        const uploadedFileLink = await uploadCSVToDrive(
          result.fileContent,
          filename,
          projectsSpreadsheet.statementsFolder
        );

        const monthName = getMonthNamePortuguese(parseInt(result.month));
        const summaryRow = ["MÊS", monthName, result.year, uploadedFileLink];

        await appendExtratoRow(
          projectsSpreadsheet.id,
          result.matchedAccount.sheet,
          summaryRow
        );

        if (result.statements && result.statements.length > 0) {
          await appendExtratoData(
            projectsSpreadsheet.id,
            result.matchedAccount.sheet,
            result.statements
          );
        }

        // Conta quantos pagamentos foram identificados
        const identifiedCount = result.statements.filter((stmt: any) => stmt[4] && stmt[4] !== "" && !stmt[4].startsWith("❓")).length;
        const ambiguousCount = result.statements.filter((stmt: any) => stmt[4] && stmt[4].startsWith("❓")).length;
        const totalCount = result.statements.length;
        const accountingSheetUrl = getAccountingSheetUrl(result.matchedAccount.sheet);
        
        await ctx.reply(
          `Extrato de conta corrente processado com sucesso para a conta ${result.matchedAccount.number}. ` +
          `Dados adicionados na aba ${result.matchedAccount.sheet}.\n\n` +
          `📊 Reconciliação: ✅ ${identifiedCount} identificados | ❓ ${ambiguousCount} pendentes | Total: ${totalCount} lançamentos`,
          accountingSheetUrl
            ? Markup.inlineKeyboard([
                [Markup.button.url("📊 Acompanhamento de gastos", accountingSheetUrl)],
              ])
            : undefined
        );
      } else {
        // Processa extrato de fundo de investimento
        const result = await processExtratoTxt(fileLink.href);
        console.log("[processar_extrato] Extrato FI processado");

        const filename = generateExtratoFilename(
          result.matchedAccount,
          result.month,
          result.year,
          "txt"
        );
        const uploadedFileLink = await uploadCSVToDrive(
          result.fileContent,
          filename,
          projectsSpreadsheet.statementsFolder
        );

        const summaryRow = [
          result.reference,
          ...result.summary,
          '=INDIRECT("R[0]C[-3]";FALSE) - INDIRECT("R[0]C[-2]";FALSE) - INDIRECT("R[0]C[-1]";FALSE)',
          '=SUM(INDIRECT("R[0]C[-7]";FALSE);INDIRECT("R[0]C[-6]";FALSE);-INDIRECT("R[0]C[-5]";FALSE);INDIRECT("R[0]C[-4]";FALSE);-INDIRECT("R[0]C[-3]";FALSE);-INDIRECT("R[0]C[-2]";FALSE))',
          uploadedFileLink,
        ];

        await appendExtratoRow(
          projectsSpreadsheet.id,
          result.matchedAccount.sheet,
          summaryRow
        );

        await ctx.reply(
          `Extrato de fundo de investimento processado com sucesso para a conta ${result.matchedAccount.number}. Linha de resumo adicionada na aba ${result.matchedAccount.sheet}.`
        );
      }
    } catch (error) {
      console.error("[processar_extrato] Erro:", error);
      await ctx.reply("Erro ao processar extrato.");
    }
  });
}

// Função para buscar requests confirmados
async function getConfirmedPaymentRequests(): Promise<PaymentRequest[]> {
  try {
    const allRequests = await getAllRequests();
    console.log("[DEBUG] Total requests encontrados:", Object.keys(allRequests || {}).length);
    
    const requestsArray = Object.values(allRequests).filter(
      (request: any) => request.status === "confirmed"
    ) as PaymentRequest[];
    
    console.log("[DEBUG] Requests confirmados:", requestsArray.length);
    
    return requestsArray;
  } catch (error) {
    console.error("Erro ao buscar requests confirmados:", error);
    return [];
  }
}

export const processarExtratoCommand = {
  register: registerProcessarExtratoCommand,
  name: () => "/processar_extrato",
  help: () =>
    "Processa extratos de conta corrente (CSV) ou fundo de investimento (TXT) automaticamente.",
  description: () =>
    "📊 Processa extratos automaticamente detectando o tipo de arquivo.",
};
