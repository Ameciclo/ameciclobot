import { parse } from "csv-parse/sync";

export interface BankDetectionResult {
  bank: 'bb' | 'cora' | 'unknown';
  confidence: number;
  delimiter: string;
  account?: string;
  statementType?: 'current' | 'credit';
}

function normalizeHeader(line: string): string {
  return String(line || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/�/g, "")
    .replace(/"/g, "")
    .toLowerCase();
}

export function detectBankCSV(fileContent: string): BankDetectionResult {
  // Tenta detectar pelo cabeçalho primeiro
  const firstLine = fileContent.split('\n')[0];
  const normalizedFirstLine = normalizeHeader(firstLine);
  
  // Cora crédito: cabeçalho da fatura/cartão
  if (normalizedFirstLine.includes('data,nome no cartao,final do cartao,categoria,descricao')) {
    return {
      bank: 'cora',
      confidence: 1.0,
      delimiter: ',',
      account: '5.697.526-5',
      statementType: 'credit'
    };
  }

  // Cora: cabeçalho específico com vírgulas
  if (normalizedFirstLine.includes('data,transacao,tipo transacao,identificacao,valor')) {
    return {
      bank: 'cora',
      confidence: 1.0,
      delimiter: ',',
      account: '5.697.526-5', // Conta Cora padrão
      statementType: 'current'
    };
  }

  // BB: novo layout CSV com vírgulas e aspas
  if (
    normalizedFirstLine.includes('data,lancamento,detalhes') &&
    normalizedFirstLine.includes('valor,tipo lancamento')
  ) {
    return {
      bank: 'bb',
      confidence: 1.0,
      delimiter: ',',
      statementType: 'current'
    };
  }
  
  // BB: tenta parsear com ponto e vírgula
  try {
    const bbData = parse(fileContent, { delimiter: ';', trim: true });
    if (bbData.length >= 2) {
      // Verifica se tem estrutura típica do BB
      const secondRow = bbData[1];
      if (secondRow && secondRow.length >= 11) {
        // Verifica formato de data BB (dd.mm.yyyy)
        const dateField = secondRow[3];
        if (dateField && /^\d{2}\.\d{2}\.\d{4}$/.test(dateField)) {
          return {
            bank: 'bb',
            confidence: 0.9,
            delimiter: ';',
            account: secondRow[1]?.replace(/^0+/, "") || ""
          };
        }
      }
    }
  } catch (error) {
    // Não é BB
  }
  
  // Cora: tenta parsear com vírgula (sem cabeçalho específico)
  try {
    const coraData = parse(fileContent, { delimiter: ',', trim: true });
    if (coraData.length >= 2) {
      const firstDataRow = coraData[1];
      if (firstDataRow && firstDataRow.length >= 5) {
        // Verifica formato de data Cora (dd/mm/yyyy)
        const dateField = firstDataRow[0];
        if (dateField && /^\d{2}\/\d{2}\/\d{4}$/.test(dateField)) {
          return {
            bank: 'cora',
            confidence: 0.8,
            delimiter: ',',
            account: '5.697.526-5',
            statementType: 'current'
          };
        }
      }
    }
  } catch (error) {
    // Não é Cora
  }
  
  return {
    bank: 'unknown',
    confidence: 0.0,
    delimiter: ','
  };
}
