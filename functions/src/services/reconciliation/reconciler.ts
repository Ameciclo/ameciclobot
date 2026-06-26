import { ExtractEntry, ClassifiedMovement, ReconciliationResult, ReconciliationConfig } from "./types";
import { PaymentRequest } from "../../config/types";
import { classifyMovement, extractPayee } from "./classifier";

const DEFAULT_CONFIG: ReconciliationConfig = {
  currencyTolerance: 0.01,
  dateWindowDays: 2,
  incomeWindowDays: 7
};

function getAccountFilter(entry: ExtractEntry): string {
  return entry.accountFilter || "";
}

function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMonetaryValue(value: string): number {
  if (!value) return 0;

  return parseFloat(
    value
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

function normalizeRequest(request: PaymentRequest): {
  id: string;
  date: Date;
  value: number;
  description: string;
  project: { name: string; account: string };
  supplierName: string;
} {
  const requestDateStr = String(request.paymentDate || request.date || "");
  let requestDate: Date;
  
  try {
    if (requestDateStr.includes("-") && requestDateStr.length === 10) {
      requestDate = new Date(requestDateStr + "T00:00:00");
    } else if (requestDateStr.includes(", ")) {
      const datePart = requestDateStr.split(", ")[0];
      const [d, m, y] = datePart.split("/");
      requestDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else if (requestDateStr.includes("/")) {
      const [d, m, y] = requestDateStr.split("/");
      requestDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else {
      requestDate = new Date(requestDateStr);
    }
  } catch {
    requestDate = new Date();
  }

  const supplierName = typeof request.supplier === 'object' 
    ? (request.supplier.nickname || request.supplier.name || "")
    : String(request.supplier || "");

  return {
    id: request.id || "",
    date: requestDate,
    value: parseMonetaryValue(request.value),
    description: request.description || "",
    project: {
      name: request.project?.name || "",
      account: request.project?.account || "",
    },
    supplierName: normalizeText(supplierName)
  };
}

function isDateMatch(entryDate: Date, requestDate: Date, windowDays: number): boolean {
  const daysDiff = Math.abs((entryDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff <= windowDays;
}

function isValueMatch(entryAmount: number, requestValue: number, tolerance: number): boolean {
  return Math.abs(entryAmount - requestValue) <= tolerance;
}

function tokenMatch(payee: string, supplierName: string): boolean {
  const payeeTokens = payee.split(/\s+/).filter(t => t.length > 2);
  const supplierTokens = supplierName.split(/\s+/).filter(t => t.length > 2);
  
  if (payeeTokens.length === 0) return false;
  
  return payeeTokens.every(token => 
    supplierTokens.some(sToken => sToken.includes(token) || token.includes(sToken))
  );
}

function reconcilePayment(
  entry: ExtractEntry, 
  requests: PaymentRequest[], 
  config: ReconciliationConfig
): ReconciliationResult {
  const accountFilter = getAccountFilter(entry);
  const confirmedRequests = requests
    .filter(r => r.status === "confirmed")
    .map(normalizeRequest)
    .filter(r => !accountFilter || r.project.account?.includes(accountFilter)); // Filter by account

  // Step 1: Exact value + exact date
  const exactCandidates = confirmedRequests.filter(req => 
    isValueMatch(entry.amount, req.value, config.currencyTolerance) &&
    isDateMatch(entry.postDate, req.date, 0)
  );

  if (exactCandidates.length === 1) {
    const match = exactCandidates[0];
    return {
      comment: match.description,
      project: match.project.name,
      requestId: match.id,
      confidence: 1.0,
      status: "ok",
      evidence: `Exact match: value=${entry.amount}, date=${entry.postDate.toLocaleDateString()}`
    };
  }

  // Step 2: Exact value + date window
  const windowCandidates = confirmedRequests.filter(req => 
    isValueMatch(entry.amount, req.value, config.currencyTolerance) &&
    isDateMatch(entry.postDate, req.date, config.dateWindowDays)
  );

  if (windowCandidates.length === 1) {
    const match = windowCandidates[0];
    return {
      comment: match.description,
      project: match.project.name,
      requestId: match.id,
      confidence: 0.95,
      status: "ok",
      evidence: `Window match: value=${entry.amount}, days=${Math.abs((entry.postDate.getTime() - match.date.getTime()) / (1000 * 60 * 60 * 24))}`
    };
  }

  // Step 3: Disambiguate by payee (deterministic)
  if (windowCandidates.length > 1) {
    const payee = extractPayee(entry);
    const payeeMatches = windowCandidates.filter(req => tokenMatch(payee, req.supplierName));
    
    if (payeeMatches.length === 1) {
      const match = payeeMatches[0];
      return {
        comment: match.description,
        project: match.project.name,
        requestId: match.id,
        confidence: 0.90,
        status: "ok",
        evidence: `Payee disambiguation: ${payee} -> ${match.supplierName}`
      };
    }
    
    // Still ambiguous
    const descriptions = windowCandidates.map(c => c.description).join(" | ");
    const ids = windowCandidates.map(c => c.id).join(", ");
    return {
      comment: `❓ ${descriptions}`,
      project: "",
      requestId: ids.split(", "),
      confidence: 0.0,
      status: "ambiguous",
      evidence: `Multiple candidates: ${windowCandidates.length} requests with same value/date`
    };
  }

  // Step 4: Not found
  const payee = extractPayee(entry);
  return {
    comment: payee.length > 3 ? `❓ ${payee}` : "❓ Não identificado",
    project: "",
    confidence: 0.0,
    status: "not_found",
    evidence: `No match found for value ${entry.amount}`
  };
}

function reconcileIncome(
  entry: ExtractEntry, 
  requests: PaymentRequest[], 
  config: ReconciliationConfig
): ReconciliationResult {
  // For now, use default classification from rules
  // TODO: Implement income reconciliation with donations/receipts
  
  if (entry.amount < 250) {
    return {
      comment: "REVISAR PROJETO",
      project: "Recursos Independentes 2025 (2o Semestre)",
      confidence: 0.7,
      status: "ok",
      evidence: "Small income entry (< R$ 250)"
    };
  }
  
  return {
    comment: "",
    project: "",
    confidence: 1.0,
    status: "ok",
    evidence: "Income entry - no reconciliation needed"
  };
}

export function reconcileExtractEntry(
  entry: ExtractEntry,
  requests: PaymentRequest[],
  config: ReconciliationConfig = DEFAULT_CONFIG
): ReconciliationResult {
  
  // Step A: Classify movement
  const classified = classifyMovement(entry);
  
  // If not payment or income, return classification result
  if (classified.kind !== "PAYMENT" && classified.kind !== "INCOME") {
    return {
      comment: classified.evidence.includes("->") ? 
        classified.evidence.split("->")[1].trim() : 
        classified.evidence,
      project: getProjectFromClassification(classified),
      confidence: classified.confidence,
      status: "ok",
      evidence: classified.evidence
    };
  }
  
  // Step B: Reconcile payments (outgoing)
  if (classified.kind === "PAYMENT" && entry.type === "D") {
    return reconcilePayment(entry, requests, config);
  }
  
  // Step C: Reconcile income (incoming)
  if (classified.kind === "INCOME" && entry.type === "C") {
    return reconcileIncome(entry, requests, config);
  }
  
  return {
    comment: "Unhandled classification",
    project: "",
    confidence: 0.0,
    status: "not_found",
    evidence: `Unhandled: ${classified.kind}/${entry.type}`
  };
}

function getProjectFromClassification(classified: ClassifiedMovement): string {
  switch (classified.kind) {
    case "BANK_FEE":
      return "";
    case "INVESTMENT_APPLY":
    case "INVESTMENT_REDEEM":
    case "INTERNAL_TRANSFER":
      return "Movimentação Bancária";
    default:
      return "";
  }
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
  const results = extractEntries.map(entry => 
    reconcileExtractEntry(entry, requests, config)
  );
  
  const summary = {
    ok: results.filter(r => r.status === "ok").length,
    split: results.filter(r => r.status === "split").length,
    ambiguous: results.filter(r => r.status === "ambiguous").length,
    not_found: results.filter(r => r.status === "not_found").length
  };
  
  return { results, summary };
}
