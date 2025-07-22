import { Context, Markup, Telegraf } from "telegraf";
// @ts-ignore
import pdfParse from "pdf-parse";
import getAccounts from "../credentials/accounts.json";
import workgroups from "../credentials/workgroupsfolders.json";

// Função para converter mês por extenso para número
function convertMonthToNumber(month: string): string {
  const months: { [key: string]: string } = {
    JANEIRO: "01",
    FEVEREIRO: "02",
    MARÇO: "03",
    ABRIL: "04",
    MAIO: "05",
    JUNHO: "06",
    JULHO: "07",
    AGOSTO: "08",
    SETEMBRO: "09",
    OUTUBRO: "10",
    NOVEMBRO: "11",
    DEZEMBRO: "12",
    JAN: "01",
    FEV: "02",
    MAR: "03",
    ABR: "04",
    MAI: "05",
    JUN: "06",
    JUL: "07",
    AGO: "08",
    SET: "09",
    OUT: "10",
    NOV: "11",
    DEZ: "12",
  };

  return months[month.toUpperCase()] || "00";
}

// Função para extrair informações do texto do PDF
function extractInfoFromPDF(text: string): {
  conta: string | null;
  mesAno: string | null;
  isFund: boolean;
} {
  const norm = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
  const conta = norm.match(/Conta\s+([\d.-]{5,})/i)?.[1] ?? null;
  const mesAno =
    norm.match(
      /m[eê]s\/?ano\s+refer[êe]ncia\s*[:\-]?\s*([A-ZÇÃ]+\/\d{4}|\d{2}\/\d{4})/i
    )?.[1] ?? null;
  const isFund =
    /extratos?\s*-\s*investimentos?\s+fundos?/i.test(norm) ||
    /\b(valor da cota|saldo cotas|rentabilidade)\b/i.test(norm);

  return { conta, mesAno, isFund };
}

// Função para formatar o nome do arquivo
function formatFileName(
  mesAno: string,
  isFund: boolean,
  conta: string
): string {
  const [mesNome, ano] = mesAno.split("/");
  let mes = mesNome;
  // Se o mês estiver por extenso, converte para número
  if (isNaN(Number(mes))) {
    mes = convertMonthToNumber(mes);
  }

  // Padroniza para formato YYYY.MM
  const dataFormatada = `${ano}.${mes.padStart(2, "0")}`;
  const tipoConta = isFund ? "Fundo de Investimento" : "Conta Corrente";

  return `Extrato - ${dataFormatada} - ${tipoConta} ${conta}.pdf`;
}

// Função para obter o ID da pasta correta no Google Drive
function getFolderIdForAccount(conta: string, isFund: boolean): string | null {
  const contaFormatada = conta.replace(/\s+/g, "");
  const tipoExtrato = isFund
    ? "Fundo de Investimento - Conta"
    : "Conta Corrente";

  // Busca a conta no arquivo accounts.json com input_file_type "pdf"
  const matchedAccount = getAccounts.find((acc: any) => {
    return (
      acc.number === contaFormatada &&
      acc.type === tipoExtrato &&
      acc.input_file_type === "pdf"
    );
  });

  if (
    matchedAccount &&
    matchedAccount.folder_id &&
    matchedAccount.folder_id.trim() !== ""
  ) {
    return matchedAccount.folder_id;
  }

  return null;
}

export async function registerArquivarExtratoPdfCommand(bot: Telegraf) {
  bot.command("arquivar_extrato_pdf", async (ctx: Context) => {
    try {
      // Restrição: somente no grupo Financeiro
      const currentChatId = ctx.chat?.id?.toString();
      const financeiroGroup = workgroups.find(
        (group: any) => group.label === "Financeiro"
      );
      if (!financeiroGroup || currentChatId !== financeiroGroup.value) {
        await ctx.reply(
          "Este comando só pode ser executado no grupo Financeiro."
        );
        return;
      }

      // Verifica se é uma resposta a uma mensagem
      if (
        !ctx.message ||
        !("reply_to_message" in ctx.message) ||
        !ctx.message.reply_to_message
      ) {
        await ctx.reply(
          "Este comando deve ser usado como resposta a uma mensagem com um arquivo PDF."
        );
        return;
      }

      // Verifica se a mensagem respondida contém um documento
      const document =
        ctx.message.reply_to_message &&
        "document" in ctx.message.reply_to_message
          ? ctx.message.reply_to_message.document
          : undefined;

      if (!document) {
        await ctx.reply("Nenhum arquivo encontrado na mensagem respondida.");
        return;
      }

      // Verifica se o documento é um PDF
      if (!document.mime_type || document.mime_type !== "application/pdf") {
        await ctx.reply("O arquivo deve ser um PDF.");
        return;
      }

      // Obtém o arquivo do Telegram
      const fileId = document.file_id;
      const file = await ctx.telegram.getFile(fileId);

      if (!file.file_path) {
        await ctx.reply("Não foi possível obter o arquivo.");
        return;
      }

      // Obtém a URL do arquivo
      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      // Baixa o arquivo
      const response = await fetch(fileUrl);
      const fileBuffer = await response.arrayBuffer();

      // Processa o PDF para extrair texto
      const statusMessage = await ctx.reply("Processando o PDF...");
      const chatId = ctx.chat?.id;

      if (!chatId) {
        await ctx.reply("Erro: não foi possível identificar o chat.");
        return;
      }

      try {
        // Converte ArrayBuffer para Buffer para o pdf-parse
        const buffer = Buffer.from(fileBuffer);
        const data = await pdfParse(buffer);
        const text = data.text;

        // Extrai informações do texto
        const { conta, mesAno, isFund } = extractInfoFromPDF(text);

        if (!conta) {
          await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            "Não foi possível identificar o número da conta no extrato."
          );
          return;
        }

        if (!mesAno) {
          await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            "Não foi possível identificar o mês/ano de referência no extrato."
          );
          return;
        }

        // Formata o nome do arquivo
        const fileName = formatFileName(mesAno, isFund, conta);

        // Obtém o ID da pasta correta no Google Drive
        const folderId = getFolderIdForAccount(conta, isFund);

        if (!folderId) {
          await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            `Não foi encontrada uma pasta configurada para a conta ${conta}.`
          );
          return;
        }

        // Importa a função de upload do Google Drive
        const { uploadInvoice } = require("../services/google");

        // Faz o upload do arquivo para o Google Drive
        const uploadResponse = await uploadInvoice(
          fileBuffer,
          fileName,
          folderId
        );

        if (!uploadResponse) {
          await ctx.telegram.editMessageText(
            chatId,
            statusMessage.message_id,
            undefined,
            "Ocorreu um erro ao fazer o upload do arquivo. Por favor, tente novamente."
          );
          return;
        }

        // Cria os botões para os links
        const tipoConta = isFund ? "Fundo de Investimento" : "Conta Corrente";
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.url("📄 Ver Extrato", uploadResponse)],
          [
            Markup.button.url(
              "📁 Pasta de Extratos",
              `https://drive.google.com/drive/folders/${folderId}`
            ),
          ],
        ]);

        // Responde com o nome do arquivo e os botões
        await ctx.telegram.editMessageText(
          chatId,
          statusMessage.message_id,
          undefined,
          `✅ Extrato arquivado com sucesso!\n\n📝 Nome do arquivo: ${fileName}\n📊 Tipo: ${tipoConta}\n🏦 Conta: ${conta}`,
          keyboard
        );
      } catch (error) {
        console.error("Erro ao processar PDF:", error);
        await ctx.telegram.editMessageText(
          chatId,
          statusMessage.message_id,
          undefined,
          "Ocorreu um erro ao processar o PDF. Verifique se o arquivo é válido."
        );
      }
    } catch (error) {
      console.error("Erro ao arquivar extrato PDF:", error);
      await ctx.reply(
        "Ocorreu um erro ao processar o extrato. Por favor, tente novamente."
      );
    }
  });
}

export const arquivarExtratoPdfCommand = {
  register: registerArquivarExtratoPdfCommand,
  name: () => "/arquivar_extrato_pdf",
  help: () =>
    "Use o comando `/arquivar_extrato_pdf` como resposta a uma mensagem com um arquivo PDF de extrato bancário para arquivá-lo automaticamente no Google Drive.",
  description: () => "📊 Arquiva um extrato bancário em PDF no Google Drive.",
};
