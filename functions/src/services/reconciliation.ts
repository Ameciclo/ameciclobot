// src/services/reconciliation.ts
import { PaymentRequest } from "../config/types";

export interface ExtractEntry {
  postDate: Date;
  amount: number;
  type: "D" | "C";
  narrative: string;
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

const DEFAULT_CONFIG: ReconciliationConfig = {
  currencyTolerance: 0.01,
  dateWindowDays: 2,
  minScore: 0.75,
  splitMaxItems: 4,
  supplierSimilarityMin: 0.34
};

// Normalização de texto
function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Converte valor monetário string para number
function parseMonetaryValue(value: string): number {
  return parseFloat(
    value
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

// Extrai favorecido do narrative do extrato
function extractPayee(narrative: string): string {
  // Regex primária para PIX
  const pixMatch = narrative.match(/Pix\s*-\s*(?:Enviado|Recebido).*?\d{2}[:/]\d{2}(?:\s+\d{2}:\d{2})?\s+(.+)$/i);
  if (pixMatch) {
    return normalizeText(pixMatch[1]);
  }

  // Fallback: último bloco em maiúsculas
  const upperMatch = narrative.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇ ]{3,})$/);
  if (upperMatch) {
    return normalizeText(upperMatch[1]);
  }

  return normalizeText(narrative);
}

// Calcula similaridade Jaccard entre dois textos
function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(normalizeText(text1).split(/\s+/));
  const tokens2 = new Set(normalizeText(text2).split(/\s+/));
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Verifica se é tarifa bancária
function isBankFee(narrative: string): boolean {
  return /(TARIFA|CESTA|PACOTE|IOF|JUROS|ESTORNO)/i.test(narrative);
}

// Verifica movimentações especiais por código
function getSpecialMovement(narrative: string, type: "D" | "C", amount: number): ReconciliationResult | null {
  // BB Rende Fácil - Investimento/Desinvestimento
  if (narrative.includes("BB Rende Fácil")) {
    if (type === "D") {
      return {
        comment: "Movimentação Bancária",
        project: "Movimentação Bancária",
        confidence: 1.0,
        status: "ok",
        evidence: "Investimento BB Rende Fácil"
      };
    } else {
      return {
        comment: "Movimentação Bancária",
        project: "Movimentação Bancária",
        confidence: 1.0,
        status: "ok",
        evidence: "Desinvestimento BB Rende Fácil"
      };
    }
  }

  // PIX Devolvido
  if (narrative.includes("Pix-Envio devolvido") || narrative.includes("Pix Automatico Recebido")) {
    return {
      comment: "PIX DEVOLVIDO EXPLICAR",
      project: "Transferências erradas, devoluções bancárias e outras",
      confidence: 0.9,
      status: "ok",
      evidence: "PIX devolvido detectado"
    };
  }

  // Movimentações com "Ameciclo"
  if (narrative.toUpperCase().includes("AMECICL")) {
    return {
      comment: "ATENÇÃO, DETALHAR",
      project: "Movimentação Bancária",
      confidence: 0.9,
      status: "ok",
      evidence: "Movimentação interna Ameciclo"
    };
  }

  // Entradas pequenas (< R$ 250) não identificadas
  if (type === "C" && amount < 250) {
    return {
      comment: "REVISAR PROJETO",
      project: "Recursos Independentes 2025 (2o Semestre)",
      confidence: 0.7,
      status: "ok",
      evidence: "Entrada pequena não identificada"
    };
  }

  return null;
}

// Normaliza request para reconciliação
function normalizeRequest(request: PaymentRequest): {
  id: string;
  date: Date;
  value: number;
  description: string;
  project: { name: string; account: string };
  supplierName: string;
} {
  const requestDateStr = request.paymentDate || request.date;
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
    project: request.project,
    supplierName: normalizeText(supplierName)
  };
}

// Algoritmo principal de reconciliação
export function reconcileExtractEntry(
  entry: ExtractEntry,
  requests: PaymentRequest[],
  config: ReconciliationConfig = DEFAULT_CONFIG
): ReconciliationResult {
  
  // Verifica movimentações especiais primeiro
  const specialMovement = getSpecialMovement(entry.narrative, entry.type, entry.amount);
  if (specialMovement) {
    return specialMovement;
  }

  // Verifica se é tarifa bancária
  if (isBankFee(entry.narrative)) {
    return {
      comment: "Taxa Bancária",
      project: "",
      confidence: 0.95,
      status: "ok"
    };
  }

  // Para entradas, só processa se não foi capturada acima
  if (entry.type !== "D") {
    return {
      comment: "",
      project: "",
      confidence: 1.0,
      status: "ok"
    };
  }

  // Filtra requests confirmados da mesma conta
  const confirmedRequests = requests
    .filter(r => r.status === "confirmed")
    .map(normalizeRequest)
    .filter(r => r.project.account.includes("76.849-9")); // Filtra pela conta do extrato

  // Extrai favorecido do extrato
  const payee = extractPayee(entry.narrative);

  // 1. Match direto (one-to-one)
  const directCandidates = confirmedRequests.filter(req => {
    const valueDiff = Math.abs(req.value - entry.amount);
    const daysDiff = Math.abs((entry.postDate.getTime() - req.date.getTime()) / (1000 * 60 * 60 * 24));
    
    return valueDiff <= config.currencyTolerance && daysDiff <= config.dateWindowDays;
  });

  if (directCandidates.length === 1) {
    const match = directCandidates[0];
    return {
      comment: match.description,
      project: match.project.name,
      requestId: match.id,
      confidence: 0.90,
      status: "ok",
      evidence: `Match direto: valor=${entry.amount}, data=${entry.postDate.toLocaleDateString()}`
    };
  }

  // 2. Desempate por score (se >1 candidato)
  if (directCandidates.length > 1) {
    let bestMatch = directCandidates[0];
    let bestScore = 0;

    for (const candidate of directCandidates) {
      const daysDiff = Math.abs((entry.postDate.getTime() - candidate.date.getTime()) / (1000 * 60 * 60 * 24));
      const valueScore = Math.abs(candidate.value - entry.amount) <= config.currencyTolerance ? 1 : 0;
      const dateScore = Math.max(0, 1 - daysDiff / config.dateWindowDays);
      const nameScore = jaccardSimilarity(payee, candidate.supplierName);
      
      const totalScore = 0.55 * valueScore + 0.25 * dateScore + 0.20 * nameScore;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = candidate;
      }
    }

    if (bestScore >= config.minScore) {
      return {
        comment: bestMatch.description,
        project: bestMatch.project.name,
        requestId: bestMatch.id,
        confidence: bestScore,
        status: "ok",
        evidence: `Desempate por score: ${bestScore.toFixed(2)}`
      };
    } else {
      const descriptions = directCandidates.map(c => c.description).join(" | ");
      return {
        comment: `❓ ${descriptions}`,
        project: "",
        confidence: bestScore,
        status: "ambiguous",
        evidence: `Score insuficiente: ${bestScore.toFixed(2)} < ${config.minScore}`
      };
    }
  }

  // 3. Split (um pagamento cobre N itens)
  const dateWindow = confirmedRequests.filter(req => {
    const daysDiff = Math.abs((entry.postDate.getTime() - req.date.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= config.dateWindowDays;
  });

  // Se há favorecido, filtra por similaridade
  const splitPool = payee.length > 3 
    ? dateWindow.filter(req => jaccardSimilarity(payee, req.supplierName) >= config.supplierSimilarityMin)
    : dateWindow;

  // Tenta combinações de 2 a splitMaxItems
  for (let size = 2; size <= Math.min(config.splitMaxItems, splitPool.length); size++) {
    const combinations = getCombinations(splitPool, size);
    
    for (const combo of combinations) {
      const totalValue = combo.reduce((sum, req) => sum + req.value, 0);
      
      if (Math.abs(totalValue - entry.amount) <= config.currencyTolerance) {
        const projects = [...new Set(combo.map(req => req.project.name))];
        const projectName = projects.length === 1 ? projects[0] : "Multiprojetos";
        const descriptions = combo.map(req => req.description);
        
        return {
          comment: `Pagamento agrupado de ${combo.length} itens: ${descriptions.join(" | ")}`,
          project: projectName,
          requestId: combo.map(req => req.id),
          confidence: 0.80,
          status: "split",
          evidence: `Split de ${combo.length} requests: ${totalValue.toFixed(2)}`
        };
      }
    }
  }

  // 4. Não encontrado
  return {
    comment: payee.length > 3 ? `❓ ${payee}` : "❓ Não identificado",
    project: "",
    confidence: 0.0,
    status: "not_found",
    evidence: `Nenhum match encontrado para valor ${entry.amount}`
  };
}

// Gera combinações de um array
function getCombinations<T>(arr: T[], size: number): T[][] {
  if (size === 1) return arr.map(item => [item]);
  if (size === arr.length) return [arr];
  if (size > arr.length) return [];
  
  const result: T[][] = [];
  
  for (let i = 0; i <= arr.length - size; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), size - 1);
    
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }
  
  return result;
}

// Processa extrato completo
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