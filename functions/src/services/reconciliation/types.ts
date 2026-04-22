export interface ExtractEntry {
  postDate: Date;
  amount: number;
  type: "D" | "C";
  narrative: string;
  accountFilter?: string;
  historyCode?: string;
  categoryCode?: string;
  documentNumber?: string;
  complement?: string;
  sourceId: string;
  originalData: any[];
}

export interface ClassifiedMovement {
  kind: "BANK_FEE" | "INTERNAL_TRANSFER" | "INVESTMENT_APPLY" | 
        "INVESTMENT_REDEEM" | "PAYMENT" | "INCOME" | "IGNORE";
  subtype?: string;
  confidence: 1.0;
  evidence: string;
}

export interface ReconciliationResult {
  comment: string;
  project: string;
  requestId?: string | string[];
  confidence: number;
  status: "ok" | "ambiguous" | "not_found" | "split";
  evidence?: string;
}

export interface ClassificationRule {
  when: {
    type?: "D" | "C";
    historyCode?: string;
    categoryCode?: string;
    narrativeIncludes?: string;
    narrativeRegex?: string;
  };
  then: {
    kind: ClassifiedMovement["kind"];
    subtype?: string;
    projectDefault?: string;
    commentDefault?: string;
  };
}

export interface SourceRules {
  sourceId: string;
  accountFilter?: string;
  classificationRules: ClassificationRule[];
  internalCounterparties: string[];
  payeeExtraction: {
    pixPattern?: string;
    fallbackPattern?: string;
  };
}

export interface ReconciliationConfig {
  currencyTolerance: number;
  dateWindowDays: number;
  incomeWindowDays: number;
}
