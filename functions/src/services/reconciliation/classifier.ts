import { ExtractEntry, ClassifiedMovement, SourceRules, ClassificationRule } from "./types";
import * as fs from "fs";
import * as path from "path";

const rulesCache = new Map<string, SourceRules>();

function loadRules(sourceId: string): SourceRules {
  if (rulesCache.has(sourceId)) {
    return rulesCache.get(sourceId)!;
  }

  const rulesPath = path.join(__dirname, "rules", `${sourceId}.json`);
  
  if (!fs.existsSync(rulesPath)) {
    throw new Error(`Rules not found for source: ${sourceId}`);
  }

  const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8")) as SourceRules;
  rulesCache.set(sourceId, rules);
  return rules;
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

function matchesRule(entry: ExtractEntry, rule: ClassificationRule): boolean {
  const { when } = rule;
  
  if (when.type && entry.type !== when.type) {
    return false;
  }
  
  if (when.historyCode && entry.historyCode !== when.historyCode) {
    return false;
  }
  
  if (when.categoryCode && entry.categoryCode !== when.categoryCode) {
    return false;
  }
  
  if (when.narrativeIncludes) {
    const normalized = normalizeText(entry.narrative);
    const pattern = normalizeText(when.narrativeIncludes);
    if (!normalized.includes(pattern)) {
      return false;
    }
  }
  
  if (when.narrativeRegex) {
    const regex = new RegExp(when.narrativeRegex, "i");
    if (!regex.test(entry.narrative)) {
      return false;
    }
  }
  
  return true;
}

export function classifyMovement(entry: ExtractEntry): ClassifiedMovement {
  const rules = loadRules(entry.sourceId);
  
  for (const rule of rules.classificationRules) {
    if (matchesRule(entry, rule)) {
      const evidence = `Rule matched: ${JSON.stringify(rule.when)} -> ${rule.then.kind}${rule.then.subtype ? `/${rule.then.subtype}` : ""}`;
      
      return {
        kind: rule.then.kind,
        subtype: rule.then.subtype,
        confidence: 1.0,
        evidence
      };
    }
  }
  
  throw new Error(`No classification rule matched for entry: ${entry.narrative}`);
}

export function extractPayee(entry: ExtractEntry): string {
  const rules = loadRules(entry.sourceId);
  const { payeeExtraction } = rules;
  
  if (payeeExtraction.pixPattern) {
    const pixMatch = entry.narrative.match(new RegExp(payeeExtraction.pixPattern, "i"));
    if (pixMatch && pixMatch[1]) {
      return normalizeText(pixMatch[1]);
    }
  }
  
  if (payeeExtraction.fallbackPattern) {
    const fallbackMatch = entry.narrative.match(new RegExp(payeeExtraction.fallbackPattern));
    if (fallbackMatch && fallbackMatch[1]) {
      return normalizeText(fallbackMatch[1]);
    }
  }
  
  return normalizeText(entry.narrative);
}