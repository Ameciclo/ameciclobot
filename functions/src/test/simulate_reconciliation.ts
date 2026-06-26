import * as fs from "fs";
import * as path from "path";
import { PaymentRequest } from "../config/types";
import { reconcileExtract } from "../services/reconciliation";
import { detectBankCSV } from "../services/reconciliation/bank_detector";
import { parseBBCSV } from "../services/reconciliation/parsers/bb_csv_parser";
import { parseCoraCSV } from "../services/reconciliation/parsers/cora_csv_parser";
import { parseCoraCreditCSV } from "../services/reconciliation/parsers/cora_credit_csv_parser";

type SimulationRow = {
  date: string;
  amount: number;
  type: "D" | "C";
  narrative: string;
  status: string;
  comment: string;
  project: string;
  requestId?: string | string[];
  evidence?: string;
};

function usage(): never {
  console.error(
    "Uso: npx ts-node src/test/simulate_reconciliation.ts <extrato.csv> <pagamentos.json> [nome_arquivo_origem]"
  );
  process.exit(1);
}

function toDateString(date: Date): string {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()),
  ].join("/");
}

function normalizeRequests(input: unknown): PaymentRequest[] {
  if (Array.isArray(input)) {
    return input as PaymentRequest[];
  }

  if (input && typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).map(([id, value]) => {
      const request = (value || {}) as Record<string, unknown>;
      return {
        id: String(request.id || id),
        ...request,
      } as PaymentRequest;
    });
  }

  return [];
}

function loadRequests(jsonPath: string): PaymentRequest[] {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(raw);
  return normalizeRequests(parsed).filter((request) => request.status === "confirmed");
}

function parseStatement(fileContent: string, sourceFileName?: string) {
  const detection = detectBankCSV(fileContent);

  if (detection.bank === "cora") {
    const isCredit = detection.statementType === "credit";
    const parser = isCredit ? parseCoraCreditCSV : parseCoraCSV;
    const sourceId = isCredit ? "cora_cd" : "cora_cc";
    return {
      ...parser(fileContent, sourceId),
      detectedBank: `cora/${detection.statementType || "current"}`,
    };
  }

  if (detection.bank === "bb") {
    return {
      ...parseBBCSV(fileContent, "bb_cc", sourceFileName),
      detectedBank: "bb/current",
    };
  }

  throw new Error("Nao foi possivel detectar o banco pelo CSV informado.");
}

function buildRows(statement: ReturnType<typeof parseStatement>, requests: PaymentRequest[]): {
  rows: SimulationRow[];
  summary: ReturnType<typeof reconcileExtract>["summary"];
} {
  const { results, summary } = reconcileExtract(statement.entries, requests);

  const rows = statement.entries.map((entry, index) => {
    const result = results[index];
    return {
      date: toDateString(entry.postDate),
      amount: entry.amount,
      type: entry.type,
      narrative: entry.narrative,
      status: result.status,
      comment: result.comment,
      project: result.project,
      requestId: result.requestId,
      evidence: result.evidence,
    };
  });

  return { rows, summary };
}

function printResults(
  statement: ReturnType<typeof parseStatement>,
  requests: PaymentRequest[],
  rows: SimulationRow[],
  summary: ReturnType<typeof reconcileExtract>["summary"]
) {
  console.log("=== SIMULACAO DE CONCILIACAO ===");
  console.log(`Banco detectado: ${statement.detectedBank}`);
  console.log(`Conta detectada: ${statement.account || "(nao identificada)"}`);
  console.log(`Competencia detectada: ${statement.month || "??"}/${statement.year || "????"}`);
  console.log(`Pagamentos confirmados carregados: ${requests.length}`);
  console.log("");
  console.log("Resumo:");
  console.log(
    `ok=${summary.ok} | split=${summary.split} | ambiguous=${summary.ambiguous} | not_found=${summary.not_found}`
  );
  console.log("");
  console.log("Lancamentos:");

  for (const row of rows) {
    console.log(
      JSON.stringify({
        date: row.date,
        amount: row.amount,
        type: row.type,
        status: row.status,
        narrative: row.narrative,
        comment: row.comment,
        project: row.project,
        requestId: row.requestId,
        evidence: row.evidence,
      })
    );
  }
}

function main() {
  const [, , csvPathArg, paymentsPathArg, sourceFileNameArg] = process.argv;
  if (!csvPathArg || !paymentsPathArg) {
    usage();
  }

  const csvPath = path.resolve(csvPathArg);
  const paymentsPath = path.resolve(paymentsPathArg);
  const sourceFileName = sourceFileNameArg || path.basename(csvPath);

  const fileContent = fs.readFileSync(csvPath, "utf8");
  const requests = loadRequests(paymentsPath);
  const statement = parseStatement(fileContent, sourceFileName);
  const { rows, summary } = buildRows(statement, requests);

  printResults(statement, requests, rows, summary);
}

main();
