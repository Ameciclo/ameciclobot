export interface Project {
  account?: string;
  balance?: number;
  budget_items?: string[];
  name?: string;
  responsible?: string;
  spreadsheet_id?: string;
}

export interface Projects {
  [key: string]: Project;
}

export interface pagamento {
  project?: Project;
  budgetItem?: string;
}