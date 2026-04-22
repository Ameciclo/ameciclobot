import { ExtractEntry } from "../types";
import { parse } from "csv-parse/sync";

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

export function parseBBCSV(fileContent: string, sourceId: string): {
  entries: ExtractEntry[];
  month: string;
  year: string;
  account: string;
} {
  const csvData = parse(fileContent, {
    delimiter: ";",
    trim: true,
  });

  if (csvData.length < 2) {
    throw new Error("CSV sem dados suficientes.");
  }

  const rawAccount = csvData[1][1].replace(/^0+/, "");
  const formattedAccount = formatBBAccount(rawAccount);
  
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

  const entries: ExtractEntry[] = [];
  
  for (let i = 1; i < csvData.length - 1; i++) {
    const row = csvData[i];
    
    if (row[9] && row[9].includes("Saldo Anterior")) {
      continue;
    }
    
    const dateStr: string = row[3];
    const [day, month, year] = dateStr.split(".");
    const postDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const valueStr = row[10].replace(",", ".");
    const amount = Math.abs(parseFloat(valueStr));
    
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
  
  return {
    entries,
    month: monthStr,
    year: yearStr,
    account: rawAccount
  };
}
