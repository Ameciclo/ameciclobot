import { ExtractEntry } from "../types";
import { parse } from "csv-parse/sync";

function parseCoraAmount(value: string): number {
  const cleanValue = value.replace(/"/g, "").trim();

  if (cleanValue.includes(",") && !cleanValue.includes(".")) {
    return parseFloat(cleanValue.replace(/\./g, "").replace(",", "."));
  }

  return parseFloat(cleanValue);
}

export function parseCoraCSV(fileContent: string, sourceId: string): {
  entries: ExtractEntry[];
  month: string;
  year: string;
  account: string;
} {
  const csvData = parse(fileContent, {
    delimiter: ",",
    trim: true,
    skip_empty_lines: true,
    from_line: 2 // Skip header
  });

  if (csvData.length < 1) {
    throw new Error("CSV sem dados suficientes.");
  }

  const account = "5.697.526-5";
  
  let monthStr = "";
  let yearStr = "";
  
  // Extract month/year from first valid entry
  for (const row of csvData) {
    if (row[0] && row[0].includes("/")) {
      const dateStr = row[0];
      const [, month, year] = dateStr.split("/");
      monthStr = month.padStart(2, "0");
      yearStr = year;
      break;
    }
  }

  const entries: ExtractEntry[] = [];
  
  for (const row of csvData) {
    if (!row[0] || !row[0].includes("/")) continue;
    
    const dateStr: string = row[0];
    const [day, month, year] = dateStr.split("/");
    const postDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const transactionType = row[1];
    const tipoTransacao = row[2]; // DÉBITO or CRÉDITO
    const identificacao = row[3];
    const valorStr = row[4];
    
    const parsedAmount = parseCoraAmount(valorStr);
    const amount = Math.abs(parsedAmount);
    const type = parsedAmount < 0 ? "D" : "C";
    
    entries.push({
      postDate,
      amount,
      type,
      narrative: identificacao,
      historyCode: transactionType,
      categoryCode: tipoTransacao,
      documentNumber: "",
      complement: "",
      accountFilter: account,
      sourceId,
      originalData: row
    });
  }
  
  return {
    entries,
    month: monthStr,
    year: yearStr,
    account
  };
}
