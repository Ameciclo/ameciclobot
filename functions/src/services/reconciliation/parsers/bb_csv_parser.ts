import { ExtractEntry } from "../types";
import { parse } from "csv-parse/sync";

type BBCSVLayout = "semicolon" | "quoted_comma";

function normalizeBBText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/�/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function detectBBLayout(fileContent: string): BBCSVLayout {
  const firstLine = fileContent.split(/\r?\n/)[0] || "";
  const normalizedHeader = normalizeBBText(firstLine).replace(/"/g, "");

  if (
    normalizedHeader.includes("DATA") &&
    normalizedHeader.includes("LANCAMENTO") &&
    normalizedHeader.includes("DETALHES") &&
    normalizedHeader.includes("VALOR") &&
    normalizedHeader.includes("TIPO LANCAMENTO")
  ) {
    return "quoted_comma";
  }

  return "semicolon";
}

function parseBBValue(value: string): number {
  const normalizedValue = String(value || "")
    .trim()
    .replace(/\s*[CD]\s*$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");

  return parseFloat(normalizedValue);
}

function formatBBAccount(rawAccount: string): string {
  const digits = rawAccount.replace(/[^\d]/g, "");

  if (digits.length < 2) {
    return rawAccount.trim();
  }

  const accountDigits = digits.slice(0, -1);
  const verifier = digits.slice(-1);
  const formattedAccountDigits = accountDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formattedAccountDigits}-${verifier}`;
}

function extractBBAccountFromRows(csvData: string[][]): string {
  for (const row of csvData.slice(0, 5)) {
    for (const cell of row) {
      const cellText = String(cell || "").trim();
      const accountMatch = cellText.match(/\b(\d{3}\.?\d{3}-\d|\d{6}-\d)\b/);
      if (accountMatch) {
        return accountMatch[1];
      }
    }
  }

  return "";
}

function extractBBAccountFromFilename(sourceFileName?: string): string {
  if (!sourceFileName) {
    return "";
  }

  const accountMatch = sourceFileName.match(/(\d{3}\.\d{3}-\d|\d{6}-\d)/);
  return accountMatch?.[1] || "";
}

function isBalanceRow(row: string[]): boolean {
  const historyText = normalizeBBText(String(row[1] || row[8] || "")).replace(/\s+/g, "");
  const rowText = normalizeBBText(row.join(" "));
  return (
    historyText === "SALDOANTERIOR" ||
    historyText === "SALDODODIA" ||
    historyText === "SALDO" ||
    rowText.includes("SALDO ANTERIOR") ||
    rowText.includes("SALDO DO DIA")
  );
}

function getQuotedCommaType(valueCell: string, typeCell: string): "D" | "C" {
  if (/\bC\b/i.test(String(valueCell || "").trim())) {
    return "C";
  }

  if (/\bD\b/i.test(String(valueCell || "").trim())) {
    return "D";
  }

  const normalizedType = normalizeBBText(typeCell);
  if (normalizedType.includes("ENTRADA") || normalizedType.includes("CREDITO")) {
    return "C";
  }

  return "D";
}

export function parseBBCSV(fileContent: string, sourceId: string, sourceFileName?: string): {
  entries: ExtractEntry[];
  month: string;
  year: string;
  account: string;
} {
  const layout = detectBBLayout(fileContent);
  const csvData = parse(fileContent, {
    delimiter: layout === "quoted_comma" ? "," : ";",
    trim: true,
    relax_quotes: true,
    skip_empty_lines: true,
  });

  if (csvData.length < 2) {
    throw new Error("CSV sem dados suficientes.");
  }

  const rawAccountFromRows = extractBBAccountFromRows(csvData);
  const rawAccountFromLegacyColumn =
    layout === "semicolon" ? String(csvData[1]?.[1] || "").replace(/^0+/, "") : "";
  const rawAccount =
    rawAccountFromRows || rawAccountFromLegacyColumn || extractBBAccountFromFilename(sourceFileName);
  const formattedAccount = formatBBAccount(rawAccount || extractBBAccountFromFilename(sourceFileName));
  
  let monthStr = "";
  let yearStr = "";

  const entries: ExtractEntry[] = [];

  if (layout === "quoted_comma") {
    for (let i = 1; i < csvData.length; i++) {
      const row = csvData[i];

      if (isBalanceRow(row)) {
        continue;
      }

      const dateStr = String(row[0] || "").trim();
      if (!dateStr || dateStr === "00/00/0000") {
        continue;
      }

      const [day, month, year] = dateStr.split("/");
      if (!day || !month || !year) {
        continue;
      }

      const amount = Math.abs(parseBBValue(String(row[4] || "")));
      if (!Number.isFinite(amount)) {
        continue;
      }

      const postDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      const type = getQuotedCommaType(String(row[4] || ""), String(row[5] || ""));
      const history = String(row[1] || "").trim();
      const details = String(row[2] || "").trim();
      const narrative = `${history} ${details}`.trim();

      entries.push({
        postDate,
        amount,
        type,
        narrative,
        accountFilter: formattedAccount,
        historyCode: history,
        categoryCode: undefined,
        documentNumber: String(row[3] || "").trim(),
        complement: details,
        sourceId,
        originalData: row,
      });
    }
  } else {
    for (let i = 1; i < csvData.length - 1; i++) {
      const row = csvData[i];
      
      if (isBalanceRow(row)) {
        continue;
      }
      
      const dateStr: string = row[3];
      if (!dateStr || dateStr === "00/00/0000") {
        continue;
      }

      const [day, month, year] = dateStr.split(".");
      if (!day || !month || !year) {
        continue;
      }

      const postDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      const amount = Math.abs(parseBBValue(row[10]));
      if (!Number.isFinite(amount)) {
        continue;
      }
      
      const type = row[11] as "D" | "C";
      const narrative = `${row[8]} ${row[9]} ${row[12]}`.trim();
      
      entries.push({
        postDate,
        amount,
        type,
        narrative,
        accountFilter: formattedAccount,
        historyCode: row[8],
        categoryCode: undefined,
        documentNumber: row[7],
        complement: row[12],
        sourceId,
        originalData: row
      });
    }
  }

  if (entries.length > 0) {
    const firstEntry = entries[0];
    monthStr = String(firstEntry.postDate.getMonth() + 1).padStart(2, "0");
    yearStr = String(firstEntry.postDate.getFullYear());
  }
  
  return {
    entries,
    month: monthStr,
    year: yearStr,
    account: formattedAccount || rawAccount
  };
}
