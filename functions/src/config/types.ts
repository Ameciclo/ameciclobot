// src/types.ts

export interface AmecicloUser {
  id: number;
  name: string;
  role: string;
  telegram_user: TelegramUserInfo;
} 

export interface TelegramUserInfo {
  first_name: string;
  id: number;
  is_bot: boolean;
  language_code?: string;
  last_name?: string;
  username?: string;
  allows_write_to_pm?:boolean;
  photo_url?: string;
}

export interface CalendarEventData {
  id: string;
  calendarId: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  from: TelegramUserInfo;
  workgroup: number;
  htmlLink: string;
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

interface TypeValue {
  type: string;
  value: string;
}

export interface Supplier {
  address: string;
  contacts: TypeValue[];
  id: string;
  id_number: string; // CPF / CNPJ etc.
  name: string;
  nickname: string;
  payment_methods: TypeValue[]
  type: string; // Pessoa física ou juridica
}

export interface PaymentRequest {
  budgetItem: string;
  date: string;
  description: string;
  from: TelegramUserInfo;
  from_chat_id: number;
  id: string;
  invoice_url: string;
  project: ProjectInfo;
  supplier: Supplier;
  value: string;
  confirmed_by: TelegramUserInfo[] | undefined | [];
}
