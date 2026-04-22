// Main exports
export { reconcileExtract as newReconcileExtract, reconcileExtractEntry } from "./reconciler";
export { classifyMovement, extractPayee } from "./classifier";
export * from "./types";

// Legacy interface compatibility
import { ExtractEntry as NewExtractEntry, ReconciliationResult } from "./types";
import { reconcileExtract as internalReconcileExtract } from "./reconciler";
import { PaymentRequest } from "../../config/types";

// Legacy ExtractEntry interface (from old reconciliation.ts)
export interface ExtractEntry {
  postDate: Date;
  amount: number;
  type: "D" | "C";
  narrative: string;
  originalData: any[];
}

// Convert legacy ExtractEntry to new format
function convertLegacyEntry(entry: ExtractEntry, sourceId: string = "bb_cc"): NewExtractEntry {
  return {
    ...entry,
    sourceId: (entry as any).sourceId || sourceId,
    accountFilter: (entry as any).accountFilter,
    historyCode: undefined,
    categoryCode: undefined,
    documentNumber: undefined,
    complement: undefined
  };
}

// Legacy reconcileExtract function for backward compatibility
export function reconcileExtract(
  extractEntries: ExtractEntry[],
  requests: PaymentRequest[]
): {
  results: ReconciliationResult[];
  summary: {
    ok: number;
    split: number;
    ambiguous: number;
    not_found: number;
  };
} {
  // Convert legacy entries to new format
  const newEntries = extractEntries.map(entry => convertLegacyEntry(entry));
  
  // Use new reconciliation system
  return internalReconcileExtract(newEntries, requests);
}
