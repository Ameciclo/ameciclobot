import { Context, Markup, Telegraf } from "telegraf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { getRequestData } from "../services/firebase";
import { PaymentRequest } from "../config/types";

interface ReciboSession {
  userId: number;
  pdfBuffer: Buffer;
  step: "waiting_transaction_id";
}

const sessions = new Map<number, ReciboSession>();

function formatCurrency(value: string): string {
  // Remove "R$" e espaços, converte para número e formata
  const numValue = parseFloat(value.replace(/[R$\s]/g, '').replace(',', '.'));
  return numValue.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
}

function numberToWords(value: string): string {
  const numValue = parseFloat(value.replace(/[R$\s]/g, '').replace(',', '.'));
  const reais = Math.floor(numValue);
  const centavos = Math.round((numValue - reais) * 100);
  
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  function convertNumber(num: number): string {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    if (num < 10) return unidades[num];
    if (num < 20) return especiais[num - 10];
    if (num < 100) {
      const dez = Math.floor(num / 10);
      const uni = num % 10;
      return `${dezenas[dez]}${uni > 0 ? ` e ${unidades[uni]}` : ''}`;
    }
    if (num < 1000) {
      const cen = Math.floor(num / 100);
      const resto = num % 100;
      return `${centenas[cen]}${resto > 0 ? ` e ${convertNumber(resto)}` : ''}`;
    }
    return num.toString(); // Para valores muito grandes
  }
  
  let resultado = '';
  
  if (reais === 0) {
    resultado = 'zero reais';
  } else {
    const reaisText = convertNumber(reais);
    resultado = `${reaisText} ${reais === 1 ? 'real' : 'reais'}`;
  }
  
  if (centavos > 0) {
    const centavosText = convertNumber(centavos);
    resultado += ` e ${centavosText} ${centavos === 1 ? 'centavo' : 'centavos'}`;
  }
  
  return resultado;
}

function getCurrentDate(): string {
  const now = new Date();
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  return `${day} de ${month} de ${year}`;
}

async function generateReciboPage(requestData: PaymentRequest): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const { width, height } = page.getSize();
  
  // Título "RECIBO"
  page.drawText('RECIBO', {
    x: width / 2 - 40,
    y: height - 100,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  // Corpo do recibo
  const refundSupplier = typeof requestData.refundSupplier === 'string' ? null : requestData.refundSupplier;
  const supplierName = refundSupplier?.name || 'NOME_DO_BENEFICIÁRIO';
  const supplierCpf = refundSupplier?.id_number?.trim() || 'CPF_DO_BENEFICIÁRIO';
  const supplierAddress = refundSupplier?.address || 'ENDEREÇO_DO_BENEFICIÁRIO';
  const value = formatCurrency(requestData.value);
  const valueInWords = numberToWords(requestData.value);
  const description = requestData.description || 'DESCRIÇÃO_DO_RESSARCIMENTO';
  const projectName = requestData.project.name || 'NOME_DO_PROJETO';
  const currentDate = getCurrentDate();
  
  const reciboText = `Eu, ${supplierName}, inscrito no CPF sob o nº ${supplierCpf}, com domicílio na ${supplierAddress}, declaro que recebi da Associação Metropolitana de Ciclistas do Recife - Ameciclo, inscrita no CNPJ nº 19.297.825/0001-48, com sede na Rua da Aurora, nº 529, Loja 2, no bairro de Santo Amaro, na cidade do Recife - PE, a quantia de ${value} (${valueInWords}), referente ao ressarcimento de ${description} para o projeto ${projectName}.


O comprovante fiscal das compras estão anexados a este recibo.



Recife, ${currentDate}.




`;
  
  // Quebrar o texto em linhas
  const lines = reciboText.split('\n');
  let yPosition = height - 150;
  
  for (const line of lines) {
    if (line.trim() === '') {
      yPosition -= 20;
      continue;
    }
    
    // Quebrar linhas longas
    const words = line.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = font.widthOfTextAtSize(testLine, 12);
      
      if (textWidth > width - 100) {
        if (currentLine) {
          page.drawText(currentLine, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
          yPosition -= 20;
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x: 50,
        y: yPosition,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    }
  }
  
  // Linha para assinatura
  yPosition -= 60;
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: 300, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  // Nome completo
  page.drawText('Nome Completo', {
    x: 50,
    y: yPosition - 20,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  return await pdfDoc.save();
}

export async function registerReciboDeRessarcimentoCommand(bot: Telegraf) {
  bot.command("recibo_de_ressarcimento", async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Verificar se é uma resposta a um documento PDF
    const replyToMessage = (ctx.message as any)?.reply_to_message;
    if (!replyToMessage || !('document' in replyToMessage)) {
      await ctx.reply("❌ Este comando deve ser usado em resposta a um PDF com as notas fiscais.");
      return;
    }

    const document = replyToMessage.document;
    if (!document.mime_type?.includes("pdf")) {
      await ctx.reply("❌ O arquivo deve ser um PDF.");
      return;
    }

    try {
      // Baixar o PDF
      const file = await ctx.telegram.getFile(document.file_id);
      if (!file.file_path) {
        await ctx.reply("❌ Erro ao obter o arquivo.");
        return;
      }

      const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
      const response = await fetch(fileUrl);
      const pdfBuffer = Buffer.from(await response.arrayBuffer());

      // Criar sessão
      sessions.set(userId, {
        userId,
        pdfBuffer,
        step: "waiting_transaction_id",
      });

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("❌ CANCELAR", `cancel_recibo_${userId}`)],
      ]);

      await ctx.reply(
        "📄 PDF das notas fiscais recebido!\n\n🆔 Agora envie o ID da transação de ressarcimento:",
        keyboard
      );
    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      await ctx.reply("❌ Erro ao processar o PDF. Tente novamente.");
    }
  });

  // Handler para cancelar
  bot.action(/^cancel_recibo_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    sessions.delete(userId);
    await ctx.editMessageText("❌ Operação cancelada.");
    await ctx.answerCbQuery();
  });

  // Handler para mensagens de texto (ID da transação)
  bot.on("text", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = sessions.get(userId);
    if (!session || session.step !== "waiting_transaction_id") return;

    const transactionId = ctx.message.text.trim();

    try {
      await ctx.reply("🔄 Buscando dados da transação...");

      // Buscar dados da transação no Firebase
      const requestData = await getRequestData(transactionId);
      
      if (!requestData) {
        await ctx.reply("❌ Transação não encontrada. Verifique o ID e tente novamente.");
        return;
      }

      // Verificar se é um ressarcimento
      if (!requestData.isRefund) {
        await ctx.reply("❌ Esta transação não é um ressarcimento.");
        return;
      }

      // Verificar se tem dados do beneficiário
      const refundSupplier = typeof requestData.refundSupplier === 'string' ? null : requestData.refundSupplier;
      if (!refundSupplier || !refundSupplier.name) {
        await ctx.reply("❌ Dados do beneficiário não encontrados na transação.");
        return;
      }

      // Verificar se tem endereço (se não tiver, avisar)
      if (!refundSupplier.address || refundSupplier.address.trim() === '') {
        await ctx.reply("⚠️ Atenção: Endereço do beneficiário não encontrado. O recibo será gerado com campo em branco.");
      }

      await ctx.reply("📝 Gerando recibo de ressarcimento...");

      // Gerar página do recibo
      const reciboBytes = await generateReciboPage(requestData);

      // Unir com o PDF original
      const finalPdf = await PDFDocument.create();
      
      // Adicionar página do recibo primeiro
      const reciboPdf = await PDFDocument.load(reciboBytes);
      const reciboPages = await finalPdf.copyPages(reciboPdf, reciboPdf.getPageIndices());
      reciboPages.forEach((page) => finalPdf.addPage(page));

      // Adicionar páginas das notas fiscais
      const notasPdf = await PDFDocument.load(session.pdfBuffer);
      const notasPages = await finalPdf.copyPages(notasPdf, notasPdf.getPageIndices());
      notasPages.forEach((page) => finalPdf.addPage(page));

      const finalPdfBytes = await finalPdf.save();
      const fileName = `Recibo_Ressarcimento_${transactionId}_${Date.now()}.pdf`;

      await ctx.replyWithDocument(
        {
          source: Buffer.from(finalPdfBytes),
          filename: fileName,
        },
        {
          caption: `✅ Recibo de ressarcimento gerado!\n\n📋 Transação: ${transactionId}\n👤 Beneficiário: ${refundSupplier?.name}\n💰 Valor: ${requestData.value}`,
        }
      );

      sessions.delete(userId);
    } catch (error) {
      console.error("Erro ao gerar recibo:", error);
      await ctx.reply("❌ Erro ao gerar o recibo. Tente novamente.");
    }
  });
}

export const reciboDeRessarcimentoCommand = {
  register: registerReciboDeRessarcimentoCommand,
  name: () => "/recibo_de_ressarcimento",
  help: () => "Gera recibo de ressarcimento anexado às notas fiscais.",
  description: () => "📄 Gera recibo de ressarcimento com notas fiscais anexadas.",
};