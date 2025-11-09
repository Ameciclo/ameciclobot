// src/commands/processarExtrato.ts
import { Context, Telegraf } from "telegraf";
import axiosInstance from "../../config/httpService";
import { parse } from "csv-parse/sync";
import getAccounts from "../../credentials/accounts.json";
import projectsSpreadsheet from "../../credentials/projectsSpreadsheet.json";
import {
  appendExtratoRow,
  appendExtratoData,
  uploadCSVToDrive,
} from "../../services/google";
import { getMonthNamePortuguese } from "../../utils/utils";
import workgroups from "../../credentials/workgroupsfolders.json";
import iconv from "iconv-lite";
import { getAllRequests } from "../../services/firebase";
import { PaymentRequest } from "../../config/types";
import { reconcileExtract, ExtractEntry } from "../../services/reconciliation";

// ======= Funções para Conta Corrente (CSV) =======
function removeLeadingZeros(str: string): string {
  return str.replace(/^0+/, "");
}



async function convertCSVtoStatementsData(csvData: any[]): Promise<any[]> {
  const data: any[] = [];
  const confirmedRequests = await getConfirmedPaymentRequests();
  
  // Converte CSV para formato de entrada do reconciliador
  const extractEntries: ExtractEntry[] = [];
  
  // Pula primeira linha (cabeçalho) e última linha (saldo final)
  for (let i = 1; i < csvData.length - 1; i++) {
    const row = csvData[i];
    
    // Pula linha de saldo anterior
    if (row[9] && row[9].includes("Saldo Anterior")) {
      continue;
    }
    
    // Parse da data (formato DD.MM.YYYY)
    const dateStr: string = row[3];
    const [day, month, year] = dateStr.split(".");
    const postDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Parse do valor (formato com vírgula, já em centavos)
    const valueStr = row[10].replace(",", ".");
    const amount = parseFloat(valueStr);
    
    // Tipo baseado na coluna D/C
    const type = row[11] as "D" | "C";
    
    // Informação original do extrato
    const narrative = `${row[8]} ${row[9]} ${row[12]}`.trim();
    
    extractEntries.push({
      postDate,
      amount: Math.abs(amount),
      type,
      narrative,
      originalData: row
    });
  }
  
  // Executa reconciliação
  const { results, summary } = reconcileExtract(extractEntries, confirmedRequests);
  
  console.log(`[RECONCILIATION] Resumo: ✅ ${summary.ok} ok | 🔗 ${summary.split} split | ⚠️ ${summary.ambiguous} ambíguo | ❓ ${summary.not_found} não encontrados`);
  
  // Converte resultados para formato da planilha
  for (let i = 0; i < extractEntries.length; i++) {
    const entry = extractEntries[i];
    const result = results[i];
    
    const formattedDate = `${entry.postDate.getDate().toString().padStart(2, '0')}/${(entry.postDate.getMonth() + 1).toString().padStart(2, '0')}/${entry.postDate.getFullYear()}`;
    const formattedValue = `R$ ${entry.amount.toFixed(2).replace(".", ",")}`;
    let type = entry.type === "C" ? "Entrada" : "Saída";
    
    // Ajusta tipo para movimentações especiais
    if (result.comment === "Movimentação Bancária" && entry.narrative.includes("BB Rende Fácil")) {
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

async function processExtratoCsv(fileUrl: string) {
  const response = await axiosInstance.get(fileUrl, {
    responseType: "arraybuffer",
  });
  const fileBuffer = Buffer.from(response.data);
  const fileContent = iconv.decode(fileBuffer, "latin1");

  const csvData = parse(fileContent, {
    delimiter: ";",
    trim: true,
  });

  // Extrai mês e ano da primeira transação (não do saldo)
  let monthStr = "";
  let yearStr = "";
  
  for (let i = 1; i < csvData.length; i++) {
    const row = csvData[i];
    if (row[3] && !row[9]?.includes("Saldo Anterior")) {
      const dateStr = row[3];
      const [, month, year] = dateStr.split(".");
      monthStr = month;
      yearStr = year;
      break;
    }
  }

  const statementsData = await convertCSVtoStatementsData(csvData);

  if (csvData.length < 2) {
    throw new Error("CSV sem dados suficientes.");
  }
  const rawAccount = removeLeadingZeros(csvData[1][1]);

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
  const fileContent = iconv.decode(buffer, "latin1");

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
        const result = await processExtratoCsv(fileLink.href);
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
        
        await ctx.reply(
          `Extrato de conta corrente processado com sucesso para a conta ${result.matchedAccount.number}. ` +
          `Dados adicionados na aba ${result.matchedAccount.sheet}.\n\n` +
          `📊 Reconciliação: ✅ ${identifiedCount} identificados | ❓ ${ambiguousCount} pendentes | Total: ${totalCount} lançamentos`
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