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

type SuggestedRequest = {
  request: PaymentRequest;
  score: number;
  reasons: string[];
};

type ManualDecision =
  | { kind: "keep_auto" }
  | { kind: "manual_match"; requestId: string }
  | { kind: "manual_ignore"; note: string };

type ReviewItem = {
  index: number;
  autoResult: AutoResult;
  manualDecision?: ManualDecision;
};

function usage(): never {
  console.error(
    "Uso: npx ts-node src/test/simulate_reconciliation_ui.ts <extrato.csv> <pagamentos.json> [nome_arquivo_origem]"
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

  const slashMatch = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
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

function getStatementMonthKey(statement: ParsedStatement): string {
  return `${statement.year}-${statement.month}`;
}

function getRequestMonthKey(request: PaymentRequest): string {
  const date = parseRequestDate(request);
  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isSameMonth(date: Date | null, statement: ParsedStatement): boolean {
  if (!date) {
    return false;
  }

  return (
    date.getFullYear() === Number(statement.year) &&
    date.getMonth() + 1 === Number(statement.month)
  );
}

function supplierSimilarity(a: string, b: string): number {
  const left = new Set(normalizeText(a).split(/\s+/).filter((token) => token.length > 2));
  const right = new Set(normalizeText(b).split(/\s+/).filter((token) => token.length > 2));

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
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

  if (isSameMonth(requestDate, statement)) {
    score += 20;
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
      score += 25;
      reasons.push("mesma data");
    } else if (dayDiff <= 2) {
      score += 15;
      reasons.push(`${dayDiff.toFixed(0)} dia(s)`);
    } else if (dayDiff <= 7) {
      score += 5;
      reasons.push(`${dayDiff.toFixed(0)} dias`);
    }
  }

  const supplierScore = supplierSimilarity(entry.narrative, supplierName);
  if (supplierScore >= 0.6) {
    score += 25;
    reasons.push("favorecido muito parecido");
  } else if (supplierScore >= 0.3) {
    score += 12;
    reasons.push("favorecido parecido");
  }

  const hasStrongValue = valueDiff === 0 || valueDiff <= 5;
  const hasStrongSupplier = supplierScore >= 0.3;
  const hasStrongDate = dayDiff !== null && dayDiff <= 2;
  const isPlausible = hasStrongValue || (hasStrongSupplier && dayDiff !== null && dayDiff <= 14) || (hasStrongDate && valueDiff <= 50);

  if (!isPlausible) {
    score = Math.min(score, 0);
  }

  return { request, score, reasons };
}

function getCandidateRequests(statement: ParsedStatement, requests: PaymentRequest[]): PaymentRequest[] {
  const monthKey = getStatementMonthKey(statement);
  const sameAccountMonth = requests.filter(
    (request) =>
      request.project?.account === statement.account &&
      getRequestMonthKey(request) === monthKey
  );

  if (sameAccountMonth.length > 0) {
    return sameAccountMonth;
  }

  return requests.filter((request) => request.project?.account === statement.account);
}

function getSuggestions(
  statement: ParsedStatement,
  requests: PaymentRequest[],
  entryIndex: number,
  limit = 8
): SuggestedRequest[] {
  return getCandidateRequests(statement, requests)
    .map((request) => scoreSuggestion(statement, entryIndex, request))
    .filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function buildReviewState(statement: ParsedStatement, requests: PaymentRequest[]) {
  const reconciliation = reconcileExtract(statement.entries, requests);
  const reviewItems: ReviewItem[] = reconciliation.results.map((result, index) => ({
    index,
    autoResult: result,
  }));

  return { reconciliation, reviewItems };
}

function getVisibleStatus(item: ReviewItem): string {
  if (!item.manualDecision || item.manualDecision.kind === "keep_auto") {
    return item.autoResult.status;
  }

  if (item.manualDecision.kind === "manual_match") {
    return "manual_match";
  }

  return "manual_ignore";
}

function printHelp() {
  console.log("");
  console.log("Comandos:");
  console.log("  h                  ajuda");
  console.log("  s                  resumo");
  console.log("  ok                 listar conciliados automaticamente");
  console.log("  pend               listar pendentes/ambiguos");
  console.log("  v <indice>         ver detalhes de um lancamento");
  console.log("  m <indice> <cand>  conciliar manualmente com a sugestao");
  console.log("  i <indice>         marcar como ignorado/manual");
  console.log("  a <indice>         voltar ao resultado automatico");
  console.log("  e <arquivo.json>   exportar decisoes da simulacao");
  console.log("  q                  sair");
  console.log("");
}

function printSummary(
  statement: ParsedStatement,
  reviewItems: ReviewItem[],
  requests: PaymentRequest[]
) {
  const statusCount = reviewItems.reduce<Record<string, number>>((acc, item) => {
    const key = getVisibleStatus(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const candidatePool = getCandidateRequests(statement, requests).length;

  console.log("");
  console.log("=== RESUMO ===");
  console.log(`Banco: ${statement.detectedBank}`);
  console.log(`Conta: ${statement.account}`);
  console.log(`Competencia: ${statement.month}/${statement.year}`);
  console.log(`Lancamentos: ${statement.entries.length}`);
  console.log(`Requests candidatas da conta/mes: ${candidatePool}`);
  console.log(
    `Status: ok=${statusCount.ok || 0} | ambiguous=${statusCount.ambiguous || 0} | not_found=${statusCount.not_found || 0} | manual_match=${statusCount.manual_match || 0} | manual_ignore=${statusCount.manual_ignore || 0}`
  );
  console.log("");
}

function printEntryLine(statement: ParsedStatement, item: ReviewItem) {
  const entry = statement.entries[item.index];
  const visibleStatus = getVisibleStatus(item);
  const comment =
    item.manualDecision?.kind === "manual_match"
      ? `[manual] ${item.manualDecision.requestId}`
      : item.manualDecision?.kind === "manual_ignore"
        ? `[ignorado] ${item.manualDecision.note}`
        : item.autoResult.comment;

  console.log(
    `${String(item.index).padStart(2, "0")} | ${formatDate(entry.postDate)} | ${entry.type} | ${formatMoney(entry.amount).padStart(10)} | ${visibleStatus.padEnd(12)} | ${comment}`
  );
}

function listItems(
  statement: ParsedStatement,
  reviewItems: ReviewItem[],
  mode: "ok" | "pending"
) {
  console.log("");
  for (const item of reviewItems) {
    const visibleStatus = getVisibleStatus(item);
    const isPending =
      visibleStatus === "ambiguous" ||
      visibleStatus === "not_found" ||
      visibleStatus === "manual_ignore";

    if (mode === "ok" && !isPending) {
      printEntryLine(statement, item);
    }

    if (mode === "pending" && isPending) {
      printEntryLine(statement, item);
    }
  }
  console.log("");
}

function printEntryDetails(
  statement: ParsedStatement,
  requests: PaymentRequest[],
  reviewItems: ReviewItem[],
  index: number
) {
  const item = reviewItems[index];
  if (!item) {
    console.log(`Indice invalido: ${index}`);
    return;
  }

  const entry = statement.entries[index];
  const suggestions = getSuggestions(statement, requests, index);

  console.log("");
  console.log(`=== LANCAMENTO ${index} ===`);
  console.log(`Data: ${formatDate(entry.postDate)}`);
  console.log(`Valor: ${formatMoney(entry.amount)}`);
  console.log(`Tipo: ${entry.type}`);
  console.log(`Narrativa: ${entry.narrative}`);
  console.log(`Auto status: ${item.autoResult.status}`);
  console.log(`Auto comentario: ${item.autoResult.comment || "(vazio)"}`);
  console.log(`Auto projeto: ${item.autoResult.project || "(vazio)"}`);
  console.log(`Auto evidencia: ${item.autoResult.evidence || "(vazio)"}`);

  if (item.manualDecision) {
    console.log(`Decisao manual: ${JSON.stringify(item.manualDecision)}`);
  }

  console.log("");
  console.log("Sugestoes:");
  if (suggestions.length === 0) {
    console.log("  Nenhuma request sugerida para conta/mes.");
  } else {
    suggestions.forEach((suggestion, suggestionIndex) => {
      const request = suggestion.request;
      console.log(
        `  [${suggestionIndex}] score=${suggestion.score} | ${request.id} | ${formatDate(parseRequestDate(request))} | ${formatMoney(parseMoney(String(request.value || "0")))}`
      );
      console.log(
        `      fornecedor=${requestSupplierName(request)} | projeto=${request.project?.name || "(sem projeto)"}`
      );
      console.log(`      motivo=${suggestion.reasons.join(", ") || "sem sinal forte"}`);
      console.log(`      desc=${request.description || "(sem descricao)"}`);
    });
  }
  console.log("");
}

function exportReview(
  targetPath: string,
  statement: ParsedStatement,
  reviewItems: ReviewItem[],
  requests: PaymentRequest[]
) {
  const resolved = reviewItems.map((item) => {
    const entry = statement.entries[item.index];
    let chosenRequest: PaymentRequest | undefined;

    const manualDecision = item.manualDecision;
    if (manualDecision && manualDecision.kind === "manual_match") {
      chosenRequest = requests.find((request) => request.id === manualDecision.requestId);
    }

    return {
      index: item.index,
      date: formatDate(entry.postDate),
      amount: entry.amount,
      type: entry.type,
      narrative: entry.narrative,
      auto: item.autoResult,
      manualDecision: item.manualDecision || null,
      chosenRequest: chosenRequest
        ? {
            id: chosenRequest.id,
            paymentDate: chosenRequest.paymentDate || chosenRequest.date || "",
            value: chosenRequest.value,
            supplier: requestSupplierName(chosenRequest),
            description: chosenRequest.description,
            project: chosenRequest.project?.name || "",
          }
        : null,
    };
  });

  fs.writeFileSync(targetPath, JSON.stringify(resolved, null, 2));
  console.log(`Arquivo exportado: ${targetPath}`);
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
  const { reviewItems } = buildReviewState(statement, requests);

  const rl = readline.createInterface({ input, output });

  printSummary(statement, reviewItems, requests);
  printHelp();

  while (true) {
    const answer = (await rl.question("concil> ")).trim();
    if (!answer) {
      continue;
    }

    const [command, arg1, arg2] = answer.split(/\s+/);

    if (command === "q") {
      break;
    }

    if (command === "h") {
      printHelp();
      continue;
    }

    if (command === "s") {
      printSummary(statement, reviewItems, requests);
      continue;
    }

    if (command === "ok") {
      listItems(statement, reviewItems, "ok");
      continue;
    }

    if (command === "pend") {
      listItems(statement, reviewItems, "pending");
      continue;
    }

    if (command === "v") {
      const index = Number(arg1);
      printEntryDetails(statement, requests, reviewItems, index);
      continue;
    }

    if (command === "m") {
      const index = Number(arg1);
      const candidateIndex = Number(arg2);
      const item = reviewItems[index];
      if (!item) {
        console.log(`Indice invalido: ${arg1}`);
        continue;
      }

      const suggestions = getSuggestions(statement, requests, index);
      const selected = suggestions[candidateIndex];
      if (!selected) {
        console.log(`Sugestao invalida: ${arg2}`);
        continue;
      }

      item.manualDecision = {
        kind: "manual_match",
        requestId: selected.request.id,
      };
      console.log(`Lancamento ${index} conciliado manualmente com ${selected.request.id}`);
      continue;
    }

    if (command === "i") {
      const index = Number(arg1);
      const item = reviewItems[index];
      if (!item) {
        console.log(`Indice invalido: ${arg1}`);
        continue;
      }

      item.manualDecision = {
        kind: "manual_ignore",
        note: "marcado como pendencia manual",
      };
      console.log(`Lancamento ${index} marcado como pendencia manual.`);
      continue;
    }

    if (command === "a") {
      const index = Number(arg1);
      const item = reviewItems[index];
      if (!item) {
        console.log(`Indice invalido: ${arg1}`);
        continue;
      }

      item.manualDecision = { kind: "keep_auto" };
      console.log(`Lancamento ${index} voltou ao resultado automatico.`);
      continue;
    }

    if (command === "e") {
      const exportPath = arg1
        ? path.resolve(arg1)
        : path.resolve(process.cwd(), "reconciliation_review_export.json");
      exportReview(exportPath, statement, reviewItems, requests);
      continue;
    }

    console.log(`Comando desconhecido: ${command}`);
  }

  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
