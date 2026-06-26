import { ExtractEntry } from "../types";
import { parse } from "csv-parse/sync";

function parseCurrencyValue(value: string): number {
  const cleanValue = value
    .replace(/"/g, "")
    .replace(/R\$/g, "")
    .trim();

  if (cleanValue.includes(",") && !cleanValue.includes(".")) {
    return parseFloat(cleanValue.replace(/\./g, "").replace(",", "."));
  }

  if (cleanValue.includes(",") && cleanValue.includes(".")) {
    if (cleanValue.lastIndexOf(",") > cleanValue.lastIndexOf(".")) {
      return parseFloat(cleanValue.replace(/\./g, "").replace(",", "."));
    }
    return parseFloat(cleanValue.replace(/,/g, ""));
  }

  return parseFloat(cleanValue);
}

export function parseCoraCreditCSV(fileContent: string, sourceId: string): {
  entries: ExtractEntry[];
  month: string;
  year: string;
  account: string;
} {
  const csvData = parse(fileContent, {
    delimiter: ",",
    trim: true,
    skip_empty_lines: true,
    from_line: 2
  });

  if (csvData.length < 1) {
    throw new Error("CSV de fatura Cora sem dados suficientes.");
  }

  const account = "5.697.526-5";

  let monthStr = "";
  let yearStr = "";

  for (const row of csvData) {
    if (row[0] && row[0].includes("/")) {
      const [, month, year] = row[0].split("/");
      monthStr = month.padStart(2, "0");
      yearStr = year;
      break;
    }
  }

  const entries: ExtractEntry[] = [];

  for (const row of csvData) {
    if (!row[0] || !row[0].includes("/")) continue;

    const [day, month, year] = row[0].split("/");
    const postDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const description = row[4] || "";
    const finalCard = row[2] || "";
    const category = row[3] || "";
    const totalValueColumn = [...row].reverse().find((value) => String(value || "").trim() !== "") || "0";
    const value = parseCurrencyValue(totalValueColumn);
    const amount = Math.abs(value);
    const type = value < 0 ? "C" : "D";

    entries.push({
      postDate,
      amount,
      type,
      narrative: description || category || (finalCard ? `Cartão ${finalCard}` : "Cartão de crédito"),
      historyCode: "CARD",
      categoryCode: category,
      documentNumber: finalCard,
      complement: row[5] || "",
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
