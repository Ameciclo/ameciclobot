import { PaymentRequest } from "../config/types";

export function getPreviewTitle(
  name: string,
  finalTitleFromMsg: string
): string {
  const modelName = name.replace("[modelo]", "").trim();
  // Supomos que o nome do modelo tem o formato: "Tipo de documento - 2025.00.00 - Alguma coisa"
  const parts = modelName.split(" - ");
  if (parts.length < 3) {
    throw new Error("Formato de nome de modelo inválido.");
  }
  const type = parts[0]; // Exemplo: "Ata", "Requerimento", etc.
  const currentDate = formatDate(new Date());
  // Constrói o novo título: "Tipo de documento - YYYY.MM.DD - Título do documento"
  const newTitle = `${type} - ${currentDate} - ${finalTitleFromMsg}`;
  return newTitle;
}

// Função auxiliar para formatar data no formato AAAA.MM.DD
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = ("0" + (date.getMonth() + 1)).slice(-2);
  const dd = ("0" + date.getDate()).slice(-2);
  return `${yyyy}.${mm}.${dd}`;
}

export function excerptFromRequest(
  request: PaymentRequest,
  title?: string | undefined
): string {
  const paymentMethod = request.supplier.payment_methods[0];
  let supplierText = `Pagar com ${paymentMethod.type} ➡️ ${paymentMethod.value}\n\n`;
  
  // Se for PIX, adiciona a chave em formato clicável
  if (paymentMethod.type.toLowerCase() === 'pix') {
    supplierText = `Pagar com ${paymentMethod.type} ➡️ \`${paymentMethod.value}\`\n\n`;
  }
  if (
    request.isRefund &&
    request.refundSupplier &&
    typeof request.refundSupplier !== "string"
  ) {
    supplierText =
      `Devolução para: ${request.refundSupplier.nickname} (${request.refundSupplier.name})\n` +
      `${request.refundSupplier.payment_methods[0].type} ️ ${request.refundSupplier.payment_methods[0].value}\n\n`;
  }
  return (
    `${title ? title.trim() : "💰💰💰 SOLICITAÇÃO DE PAGAMENTO 💰💰💰"} \n\n` +
    `👉 Solicitado por:  ${request.from.first_name}\n` +
    `📂 ID da Solicitação: ${request.id}\n\n` +
    `🗂 Projeto: ${request.project.name}\n` +
    `📂 Item Orçamentário: ${request.budgetItem}\n` +
    `🗒 Descrição: ${request.description}\n\n` +
    `📈 Conta saída: ${request.project.account}\n\n` +
    `📉 FORNECEDOR\n` +
    `Empresa: ${request.supplier.nickname} (${request.supplier.name})\n` +
    `${supplierText}` +
    `💵 Valor: ${request.value}`
  );
}

export function escapeMarkdownV2(text: string): string {
  if (!text) return '';
  return text.toString().replace(/([_\*\[\]\(\)~`>#+\-=|{}\\.!])/g, "\\$1");
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+-=|{}.!])/g, "\\$1");
}

export const toDays = (): number => {
  const oneDay = 24 * 60 * 60 * 1000; // Milissegundos em um dia
  const firstDate = new Date(1899, 11, 31); // Data inicial
  const secondDate = new Date(); // Data atual

  // Subtração entre datas retorna diferença em milissegundos
  return Math.round(
    Math.abs((firstDate.getTime() - secondDate.getTime()) / oneDay)
  );
};


// Mapeia o número do mês para o nome em português
export function getMonthNamePortuguese(monthNumber: number): string {
  const meses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];
  return meses[monthNumber - 1] || "";
}