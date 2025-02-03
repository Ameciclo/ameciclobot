import { PaymentRequest } from "../config/types";

export function excerptFromRequest(
  request: PaymentRequest,
  title?: string
): string {
  return (
    `${title ? title.trim() : "💰💰💰 SOLICITAÇÃO DE PAGAMENTO 💰💰💰"} \n\n` +
    `👉 Solicitado por:  ${request.from.first_name}\n` +
    `📂 ID da Solicitação: ${request.id}\n\n` +
    `🗂 Projeto: ${request.project.name}\n` +
    `📂 Item Orçamentário: ${request.budgetItem}\n` +
    `🗒 Descrição: ${request.description}\n\n` +
    `📈 Conta saída: ${request.project.account}\n\n` +
    `📉 DADOS BANCÁRIOS\n` +
    `Empresa: ${request.supplier.nickname} (${request.supplier.name})\n` +
    `Pagar com ${request.supplier.payment_methods[0].type} ➡️ ${request.supplier.payment_methods[0].value}\n\n` +
    `💵 Valor: ${request.value}`
  );
}

export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
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
