import axiosInstance from "../config/httpService";
import { parse } from "csv-parse/sync";

/**
 * Faz o download e processa um arquivo de extrato (CSV ou TXT) a partir da URL fornecida.
 * Implementa a lógica para identificar a conta, mês e ano, atualizar a planilha e fazer o upload do arquivo.
 */
export async function processExtratoFile(fileUrl: string): Promise<void> {
  try {
    // Usa a instância do axios para baixar o arquivo como texto
    const response = await axiosInstance.get(fileUrl, { responseType: "text" });
    const fileContent = response.data;

    if (fileContent.includes(";")) {
      // Trata como CSV
      const records = parse(fileContent, {
        delimiter: ";",
        trim: true,
      });
      console.log("CSV processado:", records);
      // Aqui você implementa:
      //  - Identificar a conta, mês e ano (a partir dos dados ou headers)
      //  - Atualizar os dados na planilha correta via API do Sheets
      //  - Fazer upload do arquivo para a pasta correta no Google Drive
    } else {
      // Trata como TXT ou outro formato, se necessário
      console.log("Arquivo TXT processado:", fileContent);
      // Implemente a lógica para TXT, se houver
    }
  } catch (error) {
    console.error("Erro ao processar extrato:", error);
    throw error;
  }
}
