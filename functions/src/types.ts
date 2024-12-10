// src/types.ts

export interface FromUser {
    first_name: string;
    id: number;
    is_bot: boolean;
    language_code?: string;
    last_name?: string;
    username?: string;
  }
  
  export interface ProjectInfo {
    account: string;
    balance: number;
    budget_items: string[];
    id: string;
    name: string;
    responsible: string;
    spreadsheet_id?: string;
  }
  
  export interface RecipientInformation {
    account: string;
    agency: string;
    bank_code: string;
    bank_name: string;
    company: string;
    id: string; // CPF / CNPJ etc.
    name: string;
  }
  
  export interface PaymentRequest {
    budgetItem: string;
    date: number;
    description: string;
    from: FromUser;
    from_chat_id: number;
    id: string;
    invoice_url: string;
    project: ProjectInfo;
    recipientInformation: RecipientInformation;
    recipientName: string;
    value: string;
  }
  