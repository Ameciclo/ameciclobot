import { parse } from "csv-parse/sync";

export interface BankDetectionResult {
  bank: 'bb' | 'cora' | 'unknown';
  confidence: number;
  delimiter: string;
  account?: string;
  statementType?: 'current' | 'credit';
}

export function detectBankCSV(fileContent: string): BankDetectionResult {
  // Tenta detectar pelo cabeçalho primeiro
  const firstLine = fileContent.split('\n')[0];
  
  // Cora crédito: cabeçalho da fatura/cartão
  if (firstLine.includes('Data,Nome no Cartão,Final do Cartão,Categoria,Descrição')) {
    return {
      bank: 'cora',
      confidence: 1.0,
      delimiter: ',',
      account: '5.697.526-5',
      statementType: 'credit'
    };
  }

  // Cora: cabeçalho específico com vírgulas
  if (firstLine.includes('Data,Transação,Tipo Transação,Identificação,Valor')) {
    return {
      bank: 'cora',
      confidence: 1.0,
      delimiter: ',',
      account: '5.697.526-5', // Conta Cora padrão
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
