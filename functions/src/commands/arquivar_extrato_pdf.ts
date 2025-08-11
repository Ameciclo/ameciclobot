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
    MARCO: "03",
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

// Função para "desgrudar" texto colado com números
function desgruda(text: string): string {
  return text
    .replace(/([0-9.-])([A-Za-zÁ-Ú])/g, '$1 $2')
    .replace(/([A-Za-zÁ-Ú])([0-9])/g, '$1 $2');
}

// Função para extrair informações do texto do PDF
function extractInfoFromPDF(text: string): {
  conta: string | null;
  mesAno: string | null;
  isFund: boolean;
} {
  // Normaliza o texto e remove acentos
  const norm = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
  
  // Aplica a função desgruda para separar números e letras
  const normFixed = desgruda(norm);
  
  console.log("[arquivar_extrato_pdf] Amostra do texto normalizado:", 
    normFixed.substring(0, 200) + "...");
  
  // Tenta várias expressões regulares para encontrar o número da conta
  let conta = null;
  const contaRegexes = [
    /Conta\s+([0-9.-]{5,})(?=[^\d-]|$)/i,
    /Conta\s*Corrente\s*([0-9.-]{5,})(?=[^\d-]|$)/i,
    /Conta\s*n[oº°]?\s*([0-9.-]{5,})(?=[^\d-]|$)/i
  ];
  
  for (const regex of contaRegexes) {
    const match = normFixed.match(regex);
    if (match && match[1]) {
      conta = match[1];
      console.log("[arquivar_extrato_pdf] Conta encontrada:", conta);
      break;
    }
  }
  
  // Busca o mês/ano de referência com múltiplos padrões
  let mesAno = null;
  const mesAnoRegexes = [
    /m[eê]s\/?ano\s+refer[eê]ncia\s*[:\-]?\s*([A-ZÇÃ]+\/\d{4}|\d{2}\/\d{4})/i,
    /periodo\s+do\s+extrato\s*[:\-]?\s*(\d{2})\s*\/\s*(\d{4})/i,
    /extrato\s+(?:de\s+)?(?:conta|investimento).*?(\d{2})\s*\/\s*(\d{4})/i,
    /data\s+(?:do\s+)?extrato\s*[:\-]?\s*(\d{2})\s*\/\s*(\d{4})/i
  ];
  
  for (const regex of mesAnoRegexes) {
    const match = normFixed.match(regex);
    if (match) {
      // Se tiver dois grupos capturados (mês e ano separados)
      if (match[2]) {
        mesAno = `${match[1]}/${match[2]}`;
      } else if (match[1]) {
        mesAno = match[1];
      }
      console.log("[arquivar_extrato_pdf] Mês/Ano encontrado com regex:", regex.toString());
      break;
    }
  }
  
  console.log("[arquivar_extrato_pdf] Mês/Ano encontrado:", mesAno);
  
  // Verifica se é um extrato de fundo de investimento
  const isFund =
    /extratos?\s*-\s*investimentos?\s+fundos?/i.test(normFixed) ||
    /\b(valor da cota|saldo cotas|rentabilidade)\b/i.test(normFixed);
  
  console.log("[arquivar_extrato_pdf] É fundo de investimento?", isFund);

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
  
  // Normaliza o número da conta para o formato padrão XX.XXX-X
  const contaFormatada = normalizarNumeroConta(conta);

  return `Extrato - ${dataFormatada} - ${tipoConta} ${contaFormatada}.pdf`;
}

// Função para normalizar números de conta para o formato XX.XXX-X
function normalizarNumeroConta(conta: string): string {
  // Remove todos os pontos, espaços e hífens
  const apenasNumeros = conta.replace(/[\s.\-]/g, "");
  
  // Se tiver 6 dígitos (2 + 3 + 1), formata como XX.XXX-X
  if (apenasNumeros.length === 6) {
    return `${apenasNumeros.substring(0, 2)}.${apenasNumeros.substring(2, 5)}-${apenasNumeros.substring(5)}`;
  }
  
  // Se tiver 5 dígitos (2 + 2 + 1), formata como XX.XX-X
  if (apenasNumeros.length === 5) {
    return `${apenasNumeros.substring(0, 2)}.${apenasNumeros.substring(2, 4)}-${apenasNumeros.substring(4)}`;
  }
  
  // Se já tiver hífen, preserva o formato original
  if (conta.includes("-")) {
    const partes = conta.split("-");
    const base = partes[0].replace(/[\s.]/g, "");
    const digito = partes[1].replace(/\s/g, "");
    
    // Insere o ponto na posição correta
    if (base.length === 5) {
      return `${base.substring(0, 2)}.${base.substring(2)}-${digito}`;
    }
    if (base.length === 4) {
      return `${base.substring(0, 2)}.${base.substring(2)}-${digito}`;
    }
  }
  
  // Se não conseguir formatar, retorna o original
  return conta;
}

// Função para obter o ID da pasta correta no Google Drive
function getFolderIdForAccount(conta: string, isFund: boolean): string | null {
  const contaNormalizada = normalizarNumeroConta(conta);
  const tipoExtrato = isFund
    ? "Fundo de Investimento - Conta"
    : "Conta Corrente";


  // Busca a conta no arquivo accounts.json com input_file_type "pdf"
  const matchedAccount = getAccounts.find((acc: any) => {
    const accNumberNormalizado = normalizarNumeroConta(acc.number);
    return (
      accNumberNormalizado === contaNormalizada &&
      acc.type === tipoExtrato &&
      acc.input_file_type === "pdf"
    );
  });

  if (matchedAccount) {
    console.log("[arquivar_extrato_pdf] Conta encontrada no accounts.json:", matchedAccount.number);
    if (matchedAccount.folder_id && matchedAccount.folder_id.trim() !== "") {
      return matchedAccount.folder_id;
    }
  } else {
    console.log("[arquivar_extrato_pdf] Conta não encontrada no accounts.json");
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
        
        console.log("[arquivar_extrato_pdf] Texto extraído do PDF (primeiros 100 caracteres):", 
          text.substring(0, 100).replace(/\n/g, " ") + "...");

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
        const contaFormatada = normalizarNumeroConta(conta);
        await ctx.telegram.editMessageText(
          chatId,
          statusMessage.message_id,
          undefined,
          `✅ Extrato arquivado com sucesso!\n\n📝 Nome do arquivo: ${fileName}\n📊 Tipo: ${tipoConta}\n🏦 Conta: ${contaFormatada}`,
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