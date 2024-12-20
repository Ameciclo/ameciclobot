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
