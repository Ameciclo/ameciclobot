import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { PaymentRequest } from "../config/types";
import { reconcileExtract } from "../services/reconciliation";
import { detectBankCSV } from "../services/reconciliation/bank_detector";
import { parseBBCSV } from "../services/reconciliation/parsers/bb_csv_parser";
import { parseCoraCSV } from "../services/reconciliation/parsers/cora_csv_parser";
import { parseCoraCreditCSV } from "../services/reconciliation/parsers/cora_credit_csv_parser";

type ParsedStatement = ReturnType<typeof parseStatement>;
type AutoResult = ReturnType<typeof reconcileExtract>["results"][number];

type PendingDecision =
  | { kind: "selected"; request: PaymentRequest }
  | { kind: "not_reconciled" }
  | { kind: "skipped" };

type PendingItem = {
  entryIndex: number;
  autoResult: AutoResult;
  decision?: PendingDecision;
};

type SuggestedRequest = {
  request: PaymentRequest;
  score: number;
  reasons: string[];
};

const BB_INVESTMENT_CODES = new Set(["351", "798", "855"]);
const INTERNAL_TRANSFER_COUNTERPARTIES = [
  "ASSOCIACAO METROPOLITANA",
  "ASSOC METROPOLITANA",
  "AMECICLO",
];

function usage(): never {
  console.error(
    "Uso: npx ts-node src/test/simulate_reconciliation_review_flow.ts <extrato.csv> <pagamentos.json> [nome_arquivo_origem]"
  );
  process.exit(1);
}

function normalizeText(text: string): string {
  return String(text || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value: string): number {
  return parseFloat(
    String(value || "")
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

function parseRequestDate(request: PaymentRequest): Date | null {
  const raw = String(request.paymentDate || request.date || "");
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00`);
  }

  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "--/--/----";
  }

  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getFullYear()),
  ].join("/");
}

function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function requestSupplierName(request: PaymentRequest): string {
  if (typeof request.supplier === "object") {
    return request.supplier.nickname || request.supplier.name || "";
  }

  return String(request.supplier || "");
}

function extractFavorecido(narrative: string): string {
  const pixMatch = narrative.match(
    /^\d+\s+Pix\s*-\s*(?:Agendamento|Enviado|Recebido)\s+\d{2}\/\d{2}\s+\d{2}:\d{2}\s+(.+)$/i
  );
  if (pixMatch?.[1]) {
    return normalizeText(pixMatch[1]);
  }

  const automaticPixMatch = narrative.match(
    /^\d+\s+Pix Automatico Recebido\s+\d{2}\/\d{2}\s+\d{2}:\d{2}\s+\S+\s+(.+)$/i
  );
  if (automaticPixMatch?.[1]) {
    return normalizeText(automaticPixMatch[1]);
  }

  const cleaned = narrative
    .replace(/^\d+\s+/, "")
    .replace(/\s+\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/i, " ");

  return normalizeText(cleaned);
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

function normalizeRequests(inputData: unknown): PaymentRequest[] {
  if (Array.isArray(inputData)) {
    return inputData as PaymentRequest[];
  }

  if (inputData && typeof inputData === "object") {
    return Object.entries(inputData as Record<string, unknown>).map(([id, value]) => {
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
  return normalizeRequests(JSON.parse(raw)).filter((request) => request.status === "confirmed");
}

function sameMonth(date: Date | null, statement: ParsedStatement): boolean {
  if (!date) {
    return false;
  }

  return (
    date.getFullYear() === Number(statement.year) &&
    date.getMonth() + 1 === Number(statement.month)
  );
}

function similarity(leftText: string, rightText: string): number {
  const left = new Set(normalizeText(leftText).split(/\s+/).filter((token) => token.length > 2));
  const right = new Set(normalizeText(rightText).split(/\s+/).filter((token) => token.length > 2));

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

function getCandidateRequests(statement: ParsedStatement, requests: PaymentRequest[]): PaymentRequest[] {
  return requests.filter((request) => request.project?.account === statement.account);
}

function scoreSuggestion(
  statement: ParsedStatement,
  entryIndex: number,
  request: PaymentRequest
): SuggestedRequest {
  const entry = statement.entries[entryIndex];
  const requestDate = parseRequestDate(request);
  const requestValue = parseMoney(String(request.value || "0"));
  const supplierName = requestSupplierName(request);
  const reasons: string[] = [];
  let score = 0;

  if (request.project?.account === statement.account) {
    score += 35;
    reasons.push("mesma conta");
  }

  if (sameMonth(requestDate, statement)) {
    score += 5;
    reasons.push("mesmo mes");
  }

  const valueDiff = Math.abs(entry.amount - requestValue);
  if (valueDiff === 0) {
    score += 35;
    reasons.push("mesmo valor");
  } else if (valueDiff <= 5) {
    score += 10;
    reasons.push(`valor proximo (${formatMoney(valueDiff)})`);
  } else if (valueDiff > Math.max(entry.amount * 0.2, 50)) {
    score -= 25;
  }

  let dayDiff: number | null = null;
  if (requestDate) {
    dayDiff = Math.abs(
      (entry.postDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dayDiff === 0) {
      score += 30;
      reasons.push("mesma data");
    } else if (dayDiff <= 3) {
      score += 20;
      reasons.push(`${dayDiff.toFixed(0)} dia(s)`);
    } else if (dayDiff <= 7) {
      score += 10;
      reasons.push(`${dayDiff.toFixed(0)} dias`);
    } else if (dayDiff <= 14) {
      score += 5;
      reasons.push(`${dayDiff.toFixed(0)} dias`);
    }
  }

  const supplierScore = similarity(entry.narrative, supplierName);
  if (supplierScore >= 0.6) {
    score += 25;
    reasons.push("favorecido muito parecido");
  } else if (supplierScore >= 0.3) {
    score += 12;
    reasons.push("favorecido parecido");
  }

  const plausible =
    valueDiff === 0 ||
    valueDiff <= 5 ||
    (supplierScore >= 0.3 && dayDiff !== null && dayDiff <= 45) ||
    (dayDiff !== null && dayDiff <= 2 && valueDiff <= 50);

  if (!plausible) {
    score = Math.min(score, 0);
  }

  return { request, score, reasons };
}

function getSuggestions(
  statement: ParsedStatement,
  requests: PaymentRequest[],
  entryIndex: number,
  limit = 5
): SuggestedRequest[] {
  return getCandidateRequests(statement, requests)
    .map((request) => scoreSuggestion(statement, entryIndex, request))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function isInvestmentOrRedeemMovement(entry: ParsedStatement["entries"][number]): boolean {
  const normalizedNarrative = normalizeText(entry.narrative);
  return (
    BB_INVESTMENT_CODES.has(String(entry.historyCode || "")) ||
    normalizedNarrative.includes("RENDE FACIL") ||
    normalizedNarrative.includes("RF CP EMPRESA AGIL")
  );
}

function isInternalTransfer(entry: ParsedStatement["entries"][number]): boolean {
  const favorecido = extractFavorecido(entry.narrative);
  const normalizedNarrative = normalizeText(entry.narrative);

  return INTERNAL_TRANSFER_COUNTERPARTIES.some(
    (counterparty) =>
      favorecido.includes(counterparty) || normalizedNarrative.includes(counterparty)
  );
}

function getPendingItems(statement: ParsedStatement, requests: PaymentRequest[]): PendingItem[] {
  const { results } = reconcileExtract(statement.entries, requests);
  return results
    .map((result, entryIndex) => ({ entryIndex, autoResult: result }))
    .filter((item) => {
      if (!(item.autoResult.status === "ambiguous" || item.autoResult.status === "not_found")) {
        return false;
      }

      const entry = statement.entries[item.entryIndex];

      if (isInvestmentOrRedeemMovement(entry)) {
        return false;
      }

      if (isInternalTransfer(entry)) {
        return false;
      }

      return true;
    });
}

function printHeader(statement: ParsedStatement, pendingItems: PendingItem[]) {
  console.log("");
  console.log("=== REVISAO DE PENDENCIAS ===");
  console.log(`Banco: ${statement.detectedBank}`);
  console.log(`Conta: ${statement.account}`);
  console.log(`Competencia: ${statement.month}/${statement.year}`);
  console.log(`Pendencias para revisar: ${pendingItems.length}`);
  console.log("");
}

function printPendingCard(
  position: number,
  total: number,
  statement: ParsedStatement,
  item: PendingItem,
  suggestions: SuggestedRequest[]
) {
  const entry = statement.entries[item.entryIndex];

  console.log("");
  console.log(`Pendencia ${position} de ${total}`);
  console.log(`Data: ${formatDate(entry.postDate)}`);
  console.log(`Valor: ${formatMoney(entry.amount)}`);
  console.log(`Favorecido: ${extractFavorecido(entry.narrative)}`);
  console.log(`Narrativa: ${entry.narrative}`);
  console.log(`Status automatico: ${item.autoResult.status}`);
  console.log("");

  if (suggestions.length === 0) {
    console.log("Sem sugestoes boas para este lancamento.");
  } else {
    console.log("Opcoes:");
    suggestions.forEach((suggestion, index) => {
      console.log(
        `${index + 1}. ${requestSupplierName(suggestion.request)} | ${formatMoney(parseMoney(String(suggestion.request.value || "0")))} | ${suggestion.request.project?.name || "(sem projeto)"}`
      );
      console.log(`   ${suggestion.request.description || "(sem descricao)"}`);
    });
  }

  console.log("");
  console.log("Acoes:");
  console.log("  numero = escolher opcao");
  console.log("  n = marcar como nao conciliado");
  console.log("  p = pular por enquanto");
  console.log("  q = encerrar revisao");
  console.log("");
}

function summarizeDecisions(pendingItems: PendingItem[]) {
  const counts = {
    selected: pendingItems.filter((item) => item.decision?.kind === "selected").length,
    notReconciled: pendingItems.filter((item) => item.decision?.kind === "not_reconciled").length,
    skipped: pendingItems.filter((item) => item.decision?.kind === "skipped").length,
    unresolved: pendingItems.filter((item) => !item.decision).length,
  };

  console.log("");
  console.log("=== RESULTADO DA REVISAO ===");
  console.log(
    `Escolhidos manualmente: ${counts.selected} | Nao conciliados: ${counts.notReconciled} | Pulados: ${counts.skipped} | Sem decisao: ${counts.unresolved}`
  );
  console.log("");
}

function exportReview(
  targetPath: string,
  statement: ParsedStatement,
  pendingItems: PendingItem[]
) {
  const exportData = pendingItems.map((item) => {
    const entry = statement.entries[item.entryIndex];

    return {
      entryIndex: item.entryIndex,
      date: formatDate(entry.postDate),
      amount: entry.amount,
      type: entry.type,
      narrative: entry.narrative,
      autoStatus: item.autoResult.status,
      autoComment: item.autoResult.comment,
      autoProject: item.autoResult.project,
      finalDecision:
        item.decision?.kind === "selected"
          ? {
              kind: "selected",
              comment: item.decision.request.description || "",
              project: item.decision.request.project?.name || "",
              requestId: item.decision.request.id,
            }
          : item.decision?.kind === "not_reconciled"
            ? { kind: "not_reconciled" }
            : item.decision?.kind === "skipped"
              ? { kind: "skipped" }
              : null,
    };
  });

  fs.writeFileSync(targetPath, JSON.stringify(exportData, null, 2));
  console.log(`Exportado para ${targetPath}`);
}

async function main() {
  const [, , csvPathArg, paymentsPathArg, sourceFileNameArg] = process.argv;
  if (!csvPathArg || !paymentsPathArg) {
    usage();
  }

  const csvPath = path.resolve(csvPathArg);
  const paymentsPath = path.resolve(paymentsPathArg);
  const sourceFileName = sourceFileNameArg || path.basename(csvPath);

  const statement = parseStatement(fs.readFileSync(csvPath, "utf8"), sourceFileName);
  const requests = loadRequests(paymentsPath);
  const pendingItems = getPendingItems(statement, requests);

  printHeader(statement, pendingItems);

  const rl = readline.createInterface({ input, output });

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    const suggestions = getSuggestions(statement, requests, item.entryIndex);
    printPendingCard(i + 1, pendingItems.length, statement, item, suggestions);

    while (true) {
      const answer = (await rl.question("revisao> ")).trim().toLowerCase();

      if (answer === "q") {
        summarizeDecisions(pendingItems);
        exportReview(
          path.resolve(process.cwd(), "reconciliation_review_flow_export.json"),
          statement,
          pendingItems
        );
        await rl.close();
        return;
      }

      if (answer === "n") {
        item.decision = { kind: "not_reconciled" };
        break;
      }

      if (answer === "p") {
        item.decision = { kind: "skipped" };
        break;
      }

      const option = Number(answer);
      if (Number.isInteger(option) && option >= 1 && option <= suggestions.length) {
        item.decision = {
          kind: "selected",
          request: suggestions[option - 1].request,
        };
        break;
      }

      console.log("Opcao invalida. Use um numero, `n`, `p` ou `q`.");
    }
  }

  summarizeDecisions(pendingItems);
  exportReview(
    path.resolve(process.cwd(), "reconciliation_review_flow_export.json"),
    statement,
    pendingItems
  );
  await rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
