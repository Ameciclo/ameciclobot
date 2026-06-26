import { PaymentRequest } from "../config/types";

export interface ExtractEntry {
  postDate: Date;
  amount: number;
  type: "D" | "C";
  narrative: string;
  sourceId?: string;
  accountFilter?: string;
  originalData: any[];
}

export interface ReconciliationResult {
  comment: string;
  project: string;
  requestId?: string | string[];
  confidence: number;
  status: "ok" | "ambiguous" | "not_found" | "split";
  evidence?: string;
}

interface ReconciliationConfig {
  currencyTolerance: number;
  dateWindowDays: number;
  minScore: number;
  splitMaxItems: number;
  supplierSimilarityMin: number;
}

type NormalizedRequest = {
  id: string;
  date: Date;
  value: number;
  description: string;
  project: { name: string; account: string };
  supplierName: string;
};

const DEFAULT_CONFIG: ReconciliationConfig = {
  currencyTolerance: 0.01,
  dateWindowDays: 2,
  minScore: 0.72,
  splitMaxItems: 4,
  supplierSimilarityMin: 0.34,
};

const INTERNAL_TRANSFER_COUNTERPARTIES = [
  "AMECICLO",
  "ASSOCIACAO METROPOLITANA",
  "ASSOCIACAO M C G R AME",
  "ASSOC METROPOLITANA",
];

function getAccountFilter(entry: ExtractEntry): string {
  return entry.accountFilter || "";
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

function isBbRendeFacilNarrative(narrative: string): boolean {
  const normalizedNarrative = normalizeText(narrative);
  return (
    normalizedNarrative.includes("BB RENDE FACIL") ||
    /BB RENDE F\s*CIL/.test(normalizedNarrative) ||
    /BB RENDE F\w*CIL/.test(normalizedNarrative)
  );
}

function normalizeAccountNumber(value: string): string {
  return String(value || "").replace(/[^\d]/g, "");
}

function tokenizeForComparison(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !/^\d+$/.test(token));
}

function cleanPayeeName(text: string): string {
  const tokens = tokenizeForComparison(text);

  while (tokens.length > 0 && /^\d+$/.test(tokens[0])) {
    tokens.shift();
  }

  return tokens.join(" ").trim();
}

function parseMonetaryValue(value: string): number {
  if (!value) {
    return 0;
  }

  return parseFloat(
    String(value)
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

function getIndependentProjectName(date: Date): string {
  const semester = date.getMonth() < 6 ? "1o Semestre" : "2o Semestre";
  return `Recursos Independentes ${date.getFullYear()} (${semester})`;
}

function extractNarrativeDate(narrative: string, fallbackYear: number): Date | null {
  const match = narrative.match(/(?:^|\s)(\d{2})\/(\d{2})(?:\/(\d{4}))?(?:\s+\d{2}:\d{2})?/);
  if (!match) {
    return null;
  }

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw || fallbackYear);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getDate() !== day ||
    parsed.getMonth() !== month - 1 ||
    parsed.getFullYear() !== year
  ) {
    return null;
  }

  return parsed;
}

function getRelevantEntryDates(entry: ExtractEntry): Date[] {
  const dates = [entry.postDate];
  const narrativeDate = extractNarrativeDate(entry.narrative, entry.postDate.getFullYear());

  if (
    narrativeDate &&
    !dates.some((date) => date.getTime() === narrativeDate.getTime())
  ) {
    dates.push(narrativeDate);
  }

  return dates;
}

function getSmallestDateDiffInDays(entry: ExtractEntry, requestDate: Date): number {
  return Math.min(
    ...getRelevantEntryDates(entry).map((date) =>
      Math.abs((date.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24))
    )
  );
}

function isWithinDateWindow(entry: ExtractEntry, requestDate: Date, windowDays: number): boolean {
  return getSmallestDateDiffInDays(entry, requestDate) <= windowDays;
}

function isSameEntryMonth(entry: ExtractEntry, requestDate: Date): boolean {
  return getRelevantEntryDates(entry).some(
    (date) =>
      date.getFullYear() === requestDate.getFullYear() &&
      date.getMonth() === requestDate.getMonth()
  );
}

function extractPayee(narrative: string): string {
  const pixMatch = narrative.match(
    /Pix\s*-?\s*(?:Agendamento|Enviado|Recebido|Rejeitado).*?\d{2}\/\d{2}(?:\/\d{4})?(?:\s+\d{2}:\d{2})?\s+(.+)$/i
  );
  if (pixMatch?.[1]) {
    return cleanPayeeName(pixMatch[1]);
  }

  const automaticPixMatch = narrative.match(
    /Pix\s+Automatico\s+Recebido.*?\d{2}\/\d{2}(?:\/\d{4})?(?:\s+\d{2}:\d{2})?\s+(.+)$/i
  );
  if (automaticPixMatch?.[1]) {
    return cleanPayeeName(automaticPixMatch[1]);
  }

  const transferMatch = narrative.match(
    /Transfer[eê]ncia\s+enviada.*?\d{2}\/\d{2}(?:\/\d{4})?(?:\s+\d{2}:\d{2})?\s+(.+)$/i
  );
  if (transferMatch?.[1]) {
    return cleanPayeeName(transferMatch[1]);
  }

  const upperMatch = narrative.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9][A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇ .-]{3,})$/);
  if (upperMatch?.[1]) {
    return cleanPayeeName(upperMatch[1]);
  }

  return cleanPayeeName(narrative);
}

function jaccardSimilarity(leftText: string, rightText: string): number {
  const tokens1 = [...new Set(tokenizeForComparison(leftText))];
  const tokens2 = [...new Set(tokenizeForComparison(rightText))];

  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0;
  }

  const usedRightIndexes = new Set<number>();
  let matches = 0;

  for (const leftToken of tokens1) {
    const rightIndex = tokens2.findIndex((rightToken, index) => {
      if (usedRightIndexes.has(index)) {
        return false;
      }

      return (
        leftToken === rightToken ||
        leftToken.includes(rightToken) ||
        rightToken.includes(leftToken)
      );
    });

    if (rightIndex >= 0) {
      usedRightIndexes.add(rightIndex);
      matches++;
    }
  }

  const unionSize = tokens1.length + tokens2.length - matches;
  return unionSize === 0 ? 0 : matches / unionSize;
}

function isBankFee(narrative: string): boolean {
  const normalizedNarrative = normalizeText(narrative);
  return /(TARIFA|CESTA|PACOTE|IOF|JUROS|ESTORNO)/.test(normalizedNarrative);
}

function isInternalTransferNarrative(narrative: string): boolean {
  const normalizedNarrative = normalizeText(narrative);
  return INTERNAL_TRANSFER_COUNTERPARTIES.some((counterparty) =>
    normalizedNarrative.includes(counterparty)
  );
}

function getSpecialMovement(entry: ExtractEntry): ReconciliationResult | null {
  const normalizedNarrative = normalizeText(entry.narrative);

  if (isBbRendeFacilNarrative(normalizedNarrative)) {
    return {
      comment: "Movimentação Bancária",
      project: "Movimentação Bancária",
      confidence: 1.0,
      status: "ok",
      evidence: "Investimento ou resgate BB Rende Fácil",
    };
  }

  if (normalizedNarrative.includes("PIX ENVIO DEVOLVIDO")) {
    return {
      comment: "PIX DEVOLVIDO EXPLICAR",
      project: "Transferências erradas, devoluções bancárias e outras",
      confidence: 0.95,
      status: "ok",
      evidence: "PIX devolvido detectado",
    };
  }

  if (normalizedNarrative.includes("PIX AUTOMATICO RECEBIDO")) {
    return {
      comment: "Doação via PIX automático",
      project: getIndependentProjectName(entry.postDate),
      confidence: 0.95,
      status: "ok",
      evidence: "Recebimento automático via PIX",
    };
  }

  if (normalizedNarrative.includes("PIX REJEITADO")) {
    return {
      comment: "Pagamento PIX rejeitado",
      project: "Movimentação Bancária",
      confidence: 0.95,
      status: "ok",
      evidence: "PIX rejeitado ou estornado",
    };
  }

  if (normalizedNarrative.includes("CORA SCFI")) {
    return {
      comment: "Fatura cartão de crédito",
      project: "Movimentação Bancária",
      confidence: 1.0,
      status: "ok",
      evidence: "Pagamento de fatura Cora",
    };
  }

  if (isInternalTransferNarrative(normalizedNarrative)) {
    return {
      comment: "Remanejamento entre contas Ameciclo",
      project: "Movimentação Bancária",
      confidence: 0.95,
      status: "ok",
      evidence: "Transferência interna identificada",
    };
  }

  if (entry.type === "C" && entry.amount < 250) {
    return {
      comment: "REVISAR PROJETO",
      project: getIndependentProjectName(entry.postDate),
      confidence: 0.7,
      status: "ok",
      evidence: "Entrada pequena não identificada",
    };
  }

  return null;
}

function normalizeRequest(request: PaymentRequest): NormalizedRequest {
  const requestDateStr = String(request.paymentDate || request.date || "");
  let requestDate: Date;

  try {
    if (requestDateStr.includes("-") && requestDateStr.length === 10) {
      requestDate = new Date(`${requestDateStr}T00:00:00`);
    } else if (requestDateStr.includes(", ")) {
      const datePart = requestDateStr.split(", ")[0];
      const [day, month, year] = datePart.split("/");
      requestDate = new Date(Number(year), Number(month) - 1, Number(day));
    } else if (requestDateStr.includes("/")) {
      const [day, month, year] = requestDateStr.split("/");
      requestDate = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
      requestDate = new Date(requestDateStr);
    }
  } catch {
    requestDate = new Date();
  }

  const supplierName =
    typeof request.supplier === "object"
      ? request.supplier.nickname || request.supplier.name || ""
      : String(request.supplier || "");

  return {
    id: request.id || "",
    date: requestDate,
    value: parseMonetaryValue(String(request.value || "")),
    description: request.description || "",
    project: {
      name: request.project?.name || "",
      account: request.project?.account || "",
    },
    supplierName: cleanPayeeName(supplierName),
  };
}

function buildOkResult(
  match: NormalizedRequest,
  confidence: number,
  evidence: string
): ReconciliationResult {
  return {
    comment: match.description,
    project: match.project.name,
    requestId: match.id,
    confidence,
    status: "ok",
    evidence,
  };
}

function reconcilePaymentCandidates(
  entry: ExtractEntry,
  candidates: NormalizedRequest[],
  config: ReconciliationConfig,
  scopeLabel: string
): ReconciliationResult | null {
  if (candidates.length === 0) {
    return null;
  }

  const payee = extractPayee(entry.narrative);

  const directCandidates = candidates.filter((request) => {
    const valueDiff = Math.abs(request.value - entry.amount);
    return (
      valueDiff <= config.currencyTolerance &&
      isWithinDateWindow(entry, request.date, config.dateWindowDays)
    );
  });

  if (directCandidates.length === 1) {
    const match = directCandidates[0];
    const bestDateDiff = getSmallestDateDiffInDays(entry, match.date);
    return buildOkResult(
      match,
      0.92,
      `Match direto (${scopeLabel}): valor=${entry.amount}, diffData=${bestDateDiff.toFixed(0)}`
    );
  }

  if (directCandidates.length > 1) {
    let bestMatch = directCandidates[0];
    let bestScore = 0;

    for (const candidate of directCandidates) {
      const daysDiff = getSmallestDateDiffInDays(entry, candidate.date);
      const dateScore = Math.max(0, 1 - daysDiff / Math.max(config.dateWindowDays, 1));
      const nameScore = jaccardSimilarity(payee, candidate.supplierName);
      const totalScore = 0.55 + 0.25 * dateScore + 0.20 * nameScore;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = candidate;
      }
    }

    if (bestScore >= config.minScore) {
      return buildOkResult(
        bestMatch,
        bestScore,
        `Desempate por score (${scopeLabel}): ${bestScore.toFixed(2)}`
      );
    }

    const descriptions = directCandidates.map((candidate) => candidate.description).join(" | ");
    return {
      comment: `❓ ${descriptions}`,
      project: "",
      confidence: bestScore,
      status: "ambiguous",
      evidence: `Score insuficiente (${scopeLabel}): ${bestScore.toFixed(2)} < ${config.minScore}`,
    };
  }

  const sameMonthSupplierCandidates = candidates.filter((request) => {
    const valueDiff = Math.abs(request.value - entry.amount);
    const supplierScore = jaccardSimilarity(payee, request.supplierName);

    return (
      valueDiff <= config.currencyTolerance &&
      supplierScore >= Math.max(config.supplierSimilarityMin, 0.45) &&
      isSameEntryMonth(entry, request.date)
    );
  });

  if (sameMonthSupplierCandidates.length === 1) {
    const match = sameMonthSupplierCandidates[0];
    const supplierScore = jaccardSimilarity(payee, match.supplierName);
    return buildOkResult(
      match,
      0.8,
      `Match por mesmo mes + favorecido (${scopeLabel}): score=${supplierScore.toFixed(2)}`
    );
  }

  if (sameMonthSupplierCandidates.length > 1) {
    const sortedCandidates = [...sameMonthSupplierCandidates].sort((left, right) => {
      return (
        jaccardSimilarity(payee, right.supplierName) -
        jaccardSimilarity(payee, left.supplierName)
      );
    });
    const bestMatch = sortedCandidates[0];
    const bestScore = jaccardSimilarity(payee, bestMatch.supplierName);
    const secondScore =
      sortedCandidates.length > 1 ? jaccardSimilarity(payee, sortedCandidates[1].supplierName) : 0;

    if (bestScore >= 0.55 && bestScore - secondScore >= 0.15) {
      return buildOkResult(
        bestMatch,
        0.78,
        `Match por favorecido predominante (${scopeLabel}): score=${bestScore.toFixed(2)}`
      );
    }
  }

  const dateWindow = candidates.filter((request) =>
    isWithinDateWindow(entry, request.date, config.dateWindowDays)
  );

  const splitPool =
    payee.length > 3
      ? dateWindow.filter(
          (request) => jaccardSimilarity(payee, request.supplierName) >= config.supplierSimilarityMin
        )
      : dateWindow;

  for (let size = 2; size <= Math.min(config.splitMaxItems, splitPool.length); size++) {
    const combinations = getCombinations(splitPool, size);

    for (const combination of combinations) {
      const totalValue = combination.reduce((sum, request) => sum + request.value, 0);
      if (Math.abs(totalValue - entry.amount) > config.currencyTolerance) {
        continue;
      }

      const projects = [...new Set(combination.map((request) => request.project.name))];
      const descriptions = combination.map((request) => request.description);

      return {
        comment: `Pagamento agrupado de ${combination.length} itens: ${descriptions.join(" | ")}`,
        project: projects.length === 1 ? projects[0] : "Multiprojetos",
        requestId: combination.map((request) => request.id),
        confidence: 0.8,
        status: "split",
        evidence: `Split de ${combination.length} requests (${scopeLabel})`,
      };
    }
  }

  const supplierSplitPool =
    payee.length > 3
      ? candidates.filter((request) => {
          return (
            jaccardSimilarity(payee, request.supplierName) >= Math.max(config.supplierSimilarityMin, 0.45) &&
            getSmallestDateDiffInDays(entry, request.date) <= 35
          );
        })
      : [];

  for (
    let size = 2;
    size <= Math.min(config.splitMaxItems, supplierSplitPool.length);
    size++
  ) {
    const combinations = getCombinations(supplierSplitPool, size);

    for (const combination of combinations) {
      const totalValue = combination.reduce((sum, request) => sum + request.value, 0);
      if (Math.abs(totalValue - entry.amount) > config.currencyTolerance) {
        continue;
      }

      const projects = [...new Set(combination.map((request) => request.project.name))];
      const descriptions = combination.map((request) => request.description);

      return {
        comment: `Pagamento agrupado de ${combination.length} itens: ${descriptions.join(" | ")}`,
        project: projects.length === 1 ? projects[0] : "Multiprojetos",
        requestId: combination.map((request) => request.id),
        confidence: 0.78,
        status: "split",
        evidence: `Split por favorecido (${scopeLabel})`,
      };
    }
  }

  return null;
}

export function reconcileExtractEntry(
  entry: ExtractEntry,
  requests: PaymentRequest[],
  config: ReconciliationConfig = DEFAULT_CONFIG
): ReconciliationResult {
  const specialMovement = getSpecialMovement(entry);
  if (specialMovement) {
    return specialMovement;
  }

  if (isBankFee(entry.narrative)) {
    return {
      comment: "Taxa Bancária",
      project: "",
      confidence: 0.95,
      status: "ok",
      evidence: "Tarifa bancária detectada",
    };
  }

  if (entry.type !== "D") {
    return {
      comment: "",
      project: "",
      confidence: 1.0,
      status: "ok",
    };
  }

  const normalizedRequests = requests
    .filter((request) => request.status === "confirmed")
    .map(normalizeRequest);

  const accountFilter = normalizeAccountNumber(getAccountFilter(entry));
  const sameAccountRequests = accountFilter
    ? normalizedRequests.filter(
        (request) => normalizeAccountNumber(request.project.account) === accountFilter
      )
    : normalizedRequests;

  const primaryResult = reconcilePaymentCandidates(
    entry,
    sameAccountRequests,
    config,
    "mesma conta"
  );
  if (primaryResult) {
    return primaryResult;
  }

  const fallbackRequests = normalizedRequests.filter(
    (request) => !sameAccountRequests.some((candidate) => candidate.id === request.id)
  );
  const fallbackResult = reconcilePaymentCandidates(
    entry,
    fallbackRequests,
    config,
    "conta diferente"
  );
  if (fallbackResult && fallbackResult.status !== "ambiguous") {
    return {
      ...fallbackResult,
      evidence: fallbackResult.evidence
        ? `${fallbackResult.evidence} | fallback fora da conta`
        : "Fallback fora da conta",
    };
  }

  const payee = extractPayee(entry.narrative);
  return {
    comment: payee.length > 3 ? `❓ ${payee}` : "❓ Não identificado",
    project: "",
    confidence: 0.0,
    status: "not_found",
    evidence: `Nenhum match encontrado para valor ${entry.amount}`,
  };
}

function getCombinations<T>(items: T[], size: number): T[][] {
  if (size === 1) {
    return items.map((item) => [item]);
  }
  if (size === items.length) {
    return [items];
  }
  if (size > items.length) {
    return [];
  }

  const result: T[][] = [];
  for (let index = 0; index <= items.length - size; index++) {
    const head = items[index];
    const tailCombinations = getCombinations(items.slice(index + 1), size - 1);

    for (const combination of tailCombinations) {
      result.push([head, ...combination]);
    }
  }

  return result;
}

export function reconcileExtract(
  extractEntries: ExtractEntry[],
  requests: PaymentRequest[],
  config: ReconciliationConfig = DEFAULT_CONFIG
): {
  results: ReconciliationResult[];
  summary: {
    ok: number;
    split: number;
    ambiguous: number;
    not_found: number;
  };
} {
  const results = extractEntries.map((entry) => reconcileExtractEntry(entry, requests, config));

  const summary = {
    ok: results.filter((result) => result.status === "ok").length,
    split: results.filter((result) => result.status === "split").length,
    ambiguous: results.filter((result) => result.status === "ambiguous").length,
    not_found: results.filter((result) => result.status === "not_found").length,
  };

  return { results, summary };
}
