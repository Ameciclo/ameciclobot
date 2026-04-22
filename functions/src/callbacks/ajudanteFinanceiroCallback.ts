import { Telegraf, Markup } from "telegraf";
import {
  getIdFromUrl,
  getProjectBudgetItems,
  getSummaryData,
  uploadInvoice,
  appendExtratoRow,
  appendExtratoData,
  uploadCSVToDrive,
} from "../services/google";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";
import getAccounts from "../credentials/accounts.json";
import { sendProjectsToDB, getRequestData, updatePaymentRequest, getAllRequests } from "../services/firebase";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PaymentRequest } from "../config/types";
import { formatDate, getMonthNamePortuguese } from "../utils/utils";
import { decodeTextFile } from "../utils/decodeTextFile";
import axiosInstance from "../config/httpService";
// @ts-ignore
import pdfParse from "pdf-parse";
import { reconcileExtract } from "../services/reconciliation";
import { parseBBCSV } from "../services/reconciliation/parsers/bb_csv_parser";
import { detectBankCSV } from "../services/reconciliation/bank_detector";
import { parseCoraCSV } from "../services/reconciliation/parsers/cora_csv_parser";
import { parseCoraCreditCSV } from "../services/reconciliation/parsers/cora_credit_csv_parser";

// Função para extrair dados da mensagem
function extractDataFromMessage(ctx: any) {
  console.log("[extractDataFromMessage] Iniciando extração de dados");
  console.log("[extractDataFromMessage] ctx.callbackQuery:", JSON.stringify(ctx.callbackQuery, null, 2));
  
  const messageText = ctx.callbackQuery?.message?.text;
  console.log("[extractDataFromMessage] messageText:", messageText);
  
  if (!messageText) {
    console.log("[extractDataFromMessage] Nenhum texto encontrado na mensagem");
    return { id: null, fileId: null };
  }
  
  // Extrai ID da transação
  const idMatch = messageText.match(/ID da transação:\s*([-\w]+)/);
  const id = idMatch ? idMatch[1] : null;
  console.log("[extractDataFromMessage] ID encontrado:", id);
  
  // Extrai File ID
  const fileIdMatch = messageText.match(/File ID:\s*([A-Za-z0-9_-]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] : null;
  console.log("[extractDataFromMessage] File ID encontrado:", fileId);
  
  return { id, fileId };
}

export function registerAjudanteFinanceiroCallback(bot: Telegraf) {
  // Callback para arquivar comprovante
  bot.action("arquivar_comprovante", async (ctx): Promise<void> => {
    console.log("[arquivar_comprovante] Callback acionado");
    await ctx.answerCbQuery();
    const { id, fileId } = extractDataFromMessage(ctx);
    
    if (!id || !fileId) {
      await ctx.editMessageText("❌ Dados não encontrados na mensagem.");
      return;
    }
    
    try {
      await ctx.editMessageText("🔄 Arquivando comprovante...");
      
      const requestData = await getRequestData(id);
      if (!requestData) {
        await ctx.editMessageText(`❌ Solicitação ${id} não encontrada.`);
        return;
      }
      
      if (requestData.status !== "confirmed") {
        await ctx.editMessageText("❌ Pagamento não confirmado.");
        return;
      }
      
      const folderId = requestData.project.folder_id;
      if (!folderId) {
        await ctx.editMessageText(`Projeto ${requestData.project.name} sem pasta configurada.`);
        return;
      }
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const fileBuffer = await response.arrayBuffer();
      
      const date = formatDate(new Date());
      const fileName = `${date} - ${requestData.project.name} - ${requestData.value} - ${requestData.supplier.nickname} - ${requestData.description.replace(/[\\/:*?"<>|]/g, "_").substring(0, 50)}`;
      
      const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
      if (!uploadResponse) {
        await ctx.editMessageText("❌ Erro no upload.");
        return;
      }
      
      await updatePaymentRequest(id, { receipt_url: uploadResponse });
      
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("Nota fiscal", `rt_${id}_nf`),
          Markup.button.callback("Cupom Fiscal", `rt_${id}_cf`),
          Markup.button.callback("Recibo", `rt_${id}_r`),
          Markup.button.callback("Outro", `rt_${id}_o`),
        ],
      ]);
      
      await ctx.editMessageText(
        `✅ Comprovante arquivado!\n\n📝 ${fileName}\n\n📄 Tipo de comprovante?`,
        keyboard
      );
    } catch (error) {
      console.error("[arquivar_comprovante] Erro:", error);
      await ctx.editMessageText("❌ Erro ao arquivar comprovante.");
    }
  });

  // Callback para recibo de ressarcimento
  bot.action("recibo_ressarcimento", async (ctx): Promise<void> => {
    console.log("[recibo_ressarcimento] Callback acionado");
    await ctx.answerCbQuery();
    const { id, fileId } = extractDataFromMessage(ctx);
    
    if (!id || !fileId) {
      await ctx.editMessageText("❌ Dados não encontrados na mensagem.");
      return;
    }
    
    try {
      await ctx.editMessageText("🔄 Gerando recibo...");
      
      const requestData = await getRequestData(id);
      if (!requestData) {
        await ctx.editMessageText(`❌ Transação ${id} não encontrada.`);
        return;
      }
      
      if (!requestData.isRefund) {
        await ctx.editMessageText("❌ Não é ressarcimento.");
        return;
      }
      
      const refundSupplier = typeof requestData.refundSupplier === 'string' ? null : requestData.refundSupplier;
      if (!refundSupplier?.name) {
        await ctx.editMessageText("❌ Dados do beneficiário não encontrados.");
        return;
      }
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      
      const reciboBytes = await generateReciboPage(requestData);
      const finalPdf = await PDFDocument.create();
      
      const reciboPdf = await PDFDocument.load(reciboBytes);
      const reciboPages = await finalPdf.copyPages(reciboPdf, reciboPdf.getPageIndices());
      reciboPages.forEach((page) => finalPdf.addPage(page));
      
      const notasPdf = await PDFDocument.load(pdfBuffer);
      const notasPages = await finalPdf.copyPages(notasPdf, notasPdf.getPageIndices());
      notasPages.forEach((page) => finalPdf.addPage(page));
      
      const finalPdfBytes = await finalPdf.save();
      const fileName = `Recibo_Ressarcimento_${id}_${Date.now()}.pdf`;
      
      await ctx.telegram.sendDocument(ctx.chat!.id, {
        source: Buffer.from(finalPdfBytes),
        filename: fileName,
      }, {
        caption: `✅ Recibo gerado!\n\n📋 ${id}\n👤 ${refundSupplier.name}\n💰 ${requestData.value}`,
      });
      
      await ctx.editMessageText("✅ Recibo gerado com sucesso!");
    } catch (error) {
      console.error("[recibo_ressarcimento] Erro:", error);
      await ctx.editMessageText("❌ Erro ao gerar recibo.");
    }
  });

  // Callback para processar extrato
  bot.action("processar_extrato", async (ctx): Promise<void> => {
    console.log("[processar_extrato] Callback acionado");
    await ctx.answerCbQuery();
    const { fileId } = extractDataFromMessage(ctx);
    
    if (!fileId) {
      await ctx.editMessageText("❌ File ID não encontrado.");
      return;
    }
    
    try {
      await ctx.editMessageText("🔄 Processando extrato...");
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const file = await ctx.telegram.getFile(fileId);
      
      const isCSV = file.file_path?.includes('.csv');
      const isTXT = file.file_path?.includes('.txt');
      
      if (!isCSV && !isTXT) {
        await ctx.editMessageText("❌ Arquivo deve ser CSV ou TXT.");
        return;
      }
      
      if (isCSV) {
        const result = await processExtratoCsv(fileLink.href, file.file_path || "");
        
        const filename = generateExtratoFilename(result.matchedAccount, result.month, result.year, "csv");
        const uploadedFileLink = await uploadCSVToDrive(result.fileContent, filename, projectsSpreadsheet.statementsFolder);
        
        const monthName = getMonthNamePortuguese(parseInt(result.month));
        const summaryRow = ["MÊS", monthName, result.year, uploadedFileLink];
        
        await appendExtratoRow(projectsSpreadsheet.id, result.matchedAccount.sheet, summaryRow);
        
        if (result.statements?.length > 0) {
          await appendExtratoData(projectsSpreadsheet.id, result.matchedAccount.sheet, result.statements);
        }
        
        const identifiedCount = result.statements.filter((stmt: any) => stmt[4] && stmt[4] !== "" && !stmt[4].startsWith("❓")).length;
        const totalCount = result.statements.length;
        
        await ctx.editMessageText(
          `✅ Extrato CC processado!\n\nConta: ${result.matchedAccount.number}\n✅ ${identifiedCount}/${totalCount} identificados`
        );
      } else {
        const result = await processExtratoTxt(fileLink.href);
        
        const filename = generateExtratoFilename(result.matchedAccount, result.month, result.year, "txt");
        const uploadedFileLink = await uploadCSVToDrive(result.fileContent, filename, projectsSpreadsheet.statementsFolder);
        
        const summaryRow = [
          result.reference,
          ...result.summary,
          '=INDIRECT("R[0]C[-3]";FALSE) - INDIRECT("R[0]C[-2]";FALSE) - INDIRECT("R[0]C[-1]";FALSE)',
          '=SUM(INDIRECT("R[0]C[-7]";FALSE);INDIRECT("R[0]C[-6]";FALSE);-INDIRECT("R[0]C[-5]";FALSE);INDIRECT("R[0]C[-4]";FALSE);-INDIRECT("R[0]C[-3]";FALSE);-INDIRECT("R[0]C[-2]";FALSE))',
          uploadedFileLink,
        ];
        
        await appendExtratoRow(projectsSpreadsheet.id, result.matchedAccount.sheet, summaryRow);
        
        await ctx.editMessageText(`✅ Extrato FI processado!\n\nConta: ${result.matchedAccount.number}`);
      }
    } catch (error) {
      console.error("[processar_extrato] Erro:", error);
      await ctx.editMessageText("❌ Erro ao processar extrato.");
    }
  });

  // Callback para atualizar pendências
  bot.action("atualizar_pendencias", async (ctx) => {
    await ctx.answerCbQuery();

    const keyboard = Markup.inlineKeyboard([
      [
        { text: "📋 Todos", callback_data: "pendencias_status_Todos" },
        {
          text: "✅ Finalizado",
          callback_data: "pendencias_status_Finalizado",
        },
      ],
      [
        {
          text: "🔄 Em andamento",
          callback_data: "pendencias_status_Em andamento",
        },
        {
          text: "⏸️ Não iniciado",
          callback_data: "pendencias_status_Não iniciado",
        },
      ],
      [
        {
          text: "💰 Finalizado com sobras",
          callback_data: "pendencias_status_Finalizado com sobras",
        },
      ],
      [
        {
          text: "📄 Listar Em Andamento",
          callback_data: "pendencias_list_projects",
        },
      ],
      [{ text: "❌ Cancelar", callback_data: "ajudante_cancel" }],
    ]);

    await ctx.editMessageText(
      "📋 *Atualizar Pendências de Projetos*\n\n" +
        "Selecione o status dos projetos que deseja verificar:\n\n" +
        "💡 *Dica:* Para verificar um projeto específico, use:\n" +
        "`/atualizar_pendencias nome_do_projeto`",
      { reply_markup: keyboard.reply_markup, parse_mode: "Markdown" }
    );
  });

  // Callback para atualizar projetos
  bot.action("atualizar_projetos", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      "🔄 *Atualizando Projetos...*\n\nProcessando...",
      { parse_mode: "Markdown" }
    );

    try {
      const summaryData = await getSummaryData(projectsSpreadsheet.id);
      const headers = projectsSpreadsheet.headers;
      const projectsJson: { [key: string]: any } = {};

      for (let i = 0; i < summaryData.length; i++) {
        const row = summaryData[i];
        const id = getIdFromUrl(row[headers.id.col]);
        const status = row[headers.status.col];
        
        if (id && status === projectsSpreadsheet.projectFilterStatus) {
          const budget_items = await getProjectBudgetItems(id);
          projectsJson[id] = {
            name: row[headers.name.col],
            responsible: row[headers.manager.col],
            account: row[headers.account.col],
            balance: row[headers.balance.col],
            folder_id: getIdFromUrl(row[headers.folder.col]),
            budget_items,
            spreadsheet_id: id,
          };
        }
      }

      await sendProjectsToDB(projectsJson);
      
      await ctx.editMessageText(
        `✅ *Projetos Atualizados!*\n\n${Object.keys(projectsJson).length} projetos atualizados com sucesso.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Erro ao atualizar projetos:", error);
      await ctx.editMessageText(
        "❌ Erro ao atualizar projetos. Tente novamente.",
        { parse_mode: "Markdown" }
      );
    }
  });

  // Callback para processar PDF inteligente
  bot.action("processar_pdf_inteligente", async (ctx): Promise<void> => {
    console.log("[processar_pdf_inteligente] Callback acionado");
    await ctx.answerCbQuery();
    const { fileId } = extractDataFromMessage(ctx);
    
    if (!fileId) {
      await ctx.editMessageText("❌ File ID não encontrado.");
      return;
    }
    
    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const fileBuffer = await response.arrayBuffer();
      
      const buffer = Buffer.from(fileBuffer);
      const data = await pdfParse(buffer);
      const { conta, mesAno, accountType } = extractInfoFromPDF(data.text);
      
      // Se conseguiu extrair tudo, arquiva automaticamente
      if (conta && mesAno) {
        await ctx.editMessageText("🔄 Dados detectados! Arquivando automaticamente...");
        
        const folderId = getFolderIdForAccount(conta, accountType);
        if (!folderId) {
          await ctx.editMessageText(`❌ Pasta não configurada para conta ${conta}.`);
          return;
        }
        
        const fileName = formatFileName(mesAno, accountType, conta);
        const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
        
        if (!uploadResponse) {
          await ctx.editMessageText("❌ Erro no upload.");
          return;
        }
        
        const tipoConta = getAccountTypeLabel(accountType);
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.url("📄 Ver Extrato", uploadResponse)],
          [Markup.button.url("📁 Pasta", `https://drive.google.com/drive/folders/${folderId}`)],
        ]);
        
        await ctx.editMessageText(
          `✅ Extrato arquivado automaticamente!\n\n📝 ${fileName}\n📊 ${tipoConta}\n🏦 ${conta}`,
          keyboard
        );
        return;
      }
      
      // Se não conseguiu extrair, mostra opções de mês/tipo
      const now = new Date();
      const months = [];
      
      for (let i = 0; i < 3; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        const monthYear = `${monthName}/${year}`;
        months.push({ monthYear, month: date.getMonth() + 1, year });
      }
      
      const keyboard = Markup.inlineKeyboard([
        ...months.map(m => [
          Markup.button.callback(`${m.monthYear} - FI`, `pdf_manual_${fileId}_${m.month}_${m.year}_fi`),
          Markup.button.callback(`${m.monthYear} - CC`, `pdf_manual_${fileId}_${m.month}_${m.year}_cc`),
          Markup.button.callback(`${m.monthYear} - CD`, `pdf_manual_${fileId}_${m.month}_${m.year}_cd`)
        ]),
        [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
      ]);
      
      await ctx.editMessageText(
        `⚠️ *Não foi possível detectar automaticamente*\n\n` +
        `Conta detectada: ${conta || 'Não identificada'}\n` +
        `Mês/Ano detectado: ${mesAno || 'Não identificado'}\n\n` +
        `Escolha o mês e tipo de conta:\n\n` +
        `• *FI* = Fundo de Investimento\n` +
        `• *CC* = Conta Corrente\n` +
        `• *CD* = Conta Crédito`,
        { ...keyboard, parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("[processar_pdf_inteligente] Erro:", error);
      await ctx.editMessageText("❌ Erro ao processar PDF.");
    }
  });

  // Callback para arquivar PDF manualmente
  bot.action(/^pdf_manual_([A-Za-z0-9_-]+)_(\d+)_(\d+)_(fi|cc|cd)$/, async (ctx): Promise<void> => {
    await ctx.answerCbQuery();
    
    const match = ctx.callbackQuery && 'data' in ctx.callbackQuery ? 
      ctx.callbackQuery.data.match(/^pdf_manual_([A-Za-z0-9_-]+)_(\d+)_(\d+)_(fi|cc|cd)$/) : null;
    
    if (!match) {
      await ctx.editMessageText("❌ Dados inválidos.");
      return;
    }
    
    const [, fileId, month, year, accountType] = match;
    
    try {
      await ctx.editMessageText("🔄 Arquivando PDF...");
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const fileBuffer = await response.arrayBuffer();
      
      // Gera nome do arquivo baseado na seleção
      const monthNames = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
                         'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
      const monthName = monthNames[parseInt(month) - 1];
      const mesAno = `${monthName}/${year}`;
      
      // Tenta detectar conta do PDF, senão usa padrão
      const buffer = Buffer.from(fileBuffer);
      const data = await pdfParse(buffer);
      const { conta } = extractInfoFromPDF(data.text);
      const accountNumber = conta || 'CONTA_NAO_IDENTIFICADA';
      
      const folderId = getFolderIdForAccount(accountNumber, accountType as "fi" | "cc" | "cd");
      if (!folderId) {
        await ctx.editMessageText(`❌ Pasta não configurada para ${getAccountTypeLabel(accountType as "fi" | "cc" | "cd")}.`);
        return;
      }
      
      const fileName = formatFileName(mesAno, accountType as "fi" | "cc" | "cd", accountNumber);
      const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
      
      if (!uploadResponse) {
        await ctx.editMessageText("❌ Erro no upload.");
        return;
      }
      
      const tipoConta = getAccountTypeLabel(accountType as "fi" | "cc" | "cd");
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url("📄 Ver Extrato", uploadResponse)],
        [Markup.button.url("📁 Pasta", `https://drive.google.com/drive/folders/${folderId}`)],
      ]);
      
      await ctx.editMessageText(
        `✅ Extrato arquivado!\n\n📝 ${fileName}\n📊 ${tipoConta}\n🏦 ${accountNumber}`,
        keyboard
      );
    } catch (error) {
      console.error("[pdf_manual] Erro:", error);
      await ctx.editMessageText("❌ Erro ao arquivar PDF.");
    }
  });

  // Callback para cancelar
  bot.action("ajudante_cancel", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("❌ Operação cancelada.", { parse_mode: "Markdown" });
  });
}

// Funções auxiliares
function formatCurrency(value: string): string {
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
    return num.toString();
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
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const { width, height } = page.getSize();
  
  page.drawText('RECIBO', {
    x: width / 2 - 40,
    y: height - 100,
    size: 20,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  const refundSupplier = typeof requestData.refundSupplier === 'string' ? null : requestData.refundSupplier;
  const supplierName = refundSupplier?.name || 'NOME_DO_BENEFICIÁRIO';
  const supplierCpf = refundSupplier?.id_number?.trim() || 'CPF_DO_BENEFICIÁRIO';
  const supplierAddress = refundSupplier?.address || 'ENDEREÇO_DO_BENEFICIÁRIO';
  const value = formatCurrency(requestData.value);
  const valueInWords = numberToWords(requestData.value);
  const description = requestData.description || 'DESCRIÇÃO_DO_RESSARCIMENTO';
  const projectName = requestData.project.name || 'NOME_DO_PROJETO';
  const currentDate = getCurrentDate();
  
  const reciboText = `Eu, ${supplierName}, inscrito no CPF sob o nº ${supplierCpf}, com domicílio na ${supplierAddress}, declaro que recebi da Associação Metropolitana de Ciclistas do Recife - Ameciclo, inscrita no CNPJ nº 19.297.825/0001-48, com sede na Rua da Aurora, nº 529, Loja 2, no bairro de Santo Amaro, na cidade do Recife - PE, CEP: 50.050-145, a quantia de ${value} (${valueInWords}), referente ao ressarcimento de ${description} para o projeto ${projectName}.\n\n\nO comprovante fiscal das compras estão anexados a este recibo.\n\n\n\nRecife, ${currentDate}.\n\n\n\n\n`;
  
  const lines = reciboText.split('\n');
  let yPosition = height - 150;
  
  for (const line of lines) {
    if (line.trim() === '') {
      yPosition -= 20;
      continue;
    }
    
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
  
  yPosition -= 60;
  page.drawLine({
    start: { x: 50, y: yPosition },
    end: { x: 300, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(supplierName, {
    x: 50,
    y: yPosition - 20,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  return await pdfDoc.save();
}

function extractInfoFromPDF(text: string): { conta: string | null; mesAno: string | null; accountType: "fi" | "cc" | "cd" } {
  const norm = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ");
  
  let conta = null;
  const contaMatch = norm.match(/Conta\s+([0-9.-]{5,})(?=[^\d-]|$)/i);
  if (contaMatch) conta = contaMatch[1];
  
  let mesAno = null;
  const mesAnoMatch = norm.match(/m[eê]s\/?ano\s+refer[eê]ncia\s*[:\-]?\s*([A-ZÇÃ]+\/\d{4}|\d{2}\/\d{4})/i);
  if (mesAnoMatch) mesAno = mesAnoMatch[1];
  
  const isFund = /extratos?\s*-\s*investimentos?\s+fundos?/i.test(norm);
  const isCredit = /(fatura|cart[aã]o de cr[eé]dito|nome no cart[aã]o|final do cart[aã]o)/i.test(norm);

  return { conta, mesAno, accountType: isFund ? "fi" : isCredit ? "cd" : "cc" };
}

function formatFileName(mesAno: string, accountType: "fi" | "cc" | "cd", conta: string): string {
  const [mesNome, ano] = mesAno.split("/");
  const tipoConta = getAccountTypeLabel(accountType);
  return `Extrato - ${ano}.${mesNome} - ${tipoConta} ${conta}.pdf`;
}

function getAccountTypeLabel(accountType: "fi" | "cc" | "cd"): string {
  if (accountType === "fi") return "Fundo de Investimento";
  if (accountType === "cd") return "Conta Crédito";
  return "Conta Corrente";
}

function getAccountConfigType(accountType: "fi" | "cc" | "cd"): string {
  if (accountType === "fi") return "Fundo de Investimento - Conta";
  if (accountType === "cd") return "Conta Crédito";
  return "Conta Corrente";
}

function getFolderIdForAccount(conta: string, accountType: "fi" | "cc" | "cd"): string | null {
  const tipoExtrato = getAccountConfigType(accountType);
  const matchedAccount = getAccounts.find((acc: any) => 
    acc.number === conta && acc.type === tipoExtrato && acc.input_file_type === "pdf"
  );
  return matchedAccount?.folder_id || null;
}

function formatSpreadsheetCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

const ACCOUNTING_SHEET_GIDS: Record<string, string> = {
  "EXTRATO CC 76": "684262481",
  "EXTRATO FI 76": "478565062",
  "EXTRATO CC 90": "410167064",
  "EXTRATO CC 106": "1954691645",
  "EXTRATO CC 131": "1183431137",
  "EXTRATO CD 2393": "183100216",
  "EXTRATO CC 2666": "1928472763",
};

function getAccountingSheetUrl(sheet?: string): string | null {
  if (!sheet) {
    return null;
  }

  const gid = ACCOUNTING_SHEET_GIDS[sheet];
  if (!gid) {
    return null;
  }

  return `https://docs.google.com/spreadsheets/d/${projectsSpreadsheet.id}/edit?gid=${gid}#gid=${gid}`;
}

async function processExtratoCsv(fileUrl: string, sourceFileName?: string) {
  const response = await axiosInstance.get(fileUrl, { responseType: "arraybuffer" });
  const fileBuffer = Buffer.from(response.data);
  const fileContent = decodeTextFile(fileBuffer);
  
  // Detecta automaticamente o tipo de banco
  const detection = detectBankCSV(fileContent);
  console.log(`[processExtratoCsv] Banco detectado: ${detection.bank} (confiança: ${detection.confidence})`);
  
  const confirmedRequests = await getAllRequests();
  const requestsArray = Object.values(confirmedRequests).filter((request: any) => request.status === "confirmed") as PaymentRequest[];
  
  let result;
  
  if (detection.bank === 'cora') {
    const isCreditStatement = detection.statementType === "credit";
    const parser = isCreditStatement ? parseCoraCreditCSV : parseCoraCSV;
    const sourceId = isCreditStatement ? "cora_cd" : "cora_cc";
    const accountType = isCreditStatement ? "Conta Crédito" : "Conta Corrente";

    // Processa CSV do Cora
    const { entries, month: monthStr, year: yearStr, account: rawAccount } = parser(fileContent, sourceId);
    const { results } = reconcileExtract(entries, requestsArray);
    
    const statements = entries.map((entry, i) => {
      const reconcileResult = results[i];
      const formattedDate = `${entry.postDate.getDate().toString().padStart(2, '0')}/${(entry.postDate.getMonth() + 1).toString().padStart(2, '0')}/${entry.postDate.getFullYear()}`;
      const formattedValue = formatSpreadsheetCurrency(entry.amount);
      let type = entry.type === "C" ? "Entrada" : "Saída";
      
      // Classificações específicas do Cora corrente
      if (!isCreditStatement && entry.narrative.includes("ASSOCIACAO M C G R - AME")) {
        type = entry.type === "D" ? "Investido" : "Desinvestido";
      } else if (!isCreditStatement && entry.narrative.includes("Cora SCFI")) {
        // Classifica faturas de cartão automaticamente
        return [formattedDate, formattedValue, type, entry.narrative, "Fatura cartão de crédito", "Movimentação Bancária"];
      }
      
      return [formattedDate, formattedValue, type, entry.narrative, reconcileResult.comment, reconcileResult.project];
    });
    
    const matchedAccount = getAccounts.find((acc: any) => 
      acc.bank === "Cora" &&
      acc.number === rawAccount &&
      acc.type === accountType &&
      acc.input_file_type === "csv"
    ) || {
      number: rawAccount, 
      sheet: isCreditStatement ? "EXTRATO CC 2666" : "EXTRATO CD 2393",
      fulltext: `${accountType} (Cora) ${rawAccount}`
    };
    
    result = { account: matchedAccount.number, statements, fileContent, month: monthStr, year: yearStr, matchedAccount };
  } else {
    // Processa CSV do BB (código original)
    const { entries, month: monthStr, year: yearStr, account: rawAccount } = parseBBCSV(fileContent, "bb_cc", sourceFileName);
    const { results } = reconcileExtract(entries, requestsArray);
    
    const statements = entries.map((entry, i) => {
      const reconcileResult = results[i];
      const formattedDate = `${entry.postDate.getDate().toString().padStart(2, '0')}/${(entry.postDate.getMonth() + 1).toString().padStart(2, '0')}/${entry.postDate.getFullYear()}`;
      const formattedValue = `R$ ${entry.amount.toFixed(2).replace(".", ",")}`;
      let type = entry.type === "C" ? "Entrada" : "Saída";
      
      if (reconcileResult.project === "Movimentação Bancária" && entry.narrative.includes("BB Rende Fácil")) {
        type = entry.type === "D" ? "Investido" : "Desinvestido";
      } else if (reconcileResult.comment === "PIX DEVOLVIDO EXPLICAR") {
        type = entry.type === "C" ? "Entrada ERRO!" : "Saída ERRO!";
      } else if (reconcileResult.comment === "ATENÇÃO, DETALHAR" && entry.narrative.toUpperCase().includes("AMECICL")) {
        type = entry.type === "C" ? "Entrada Remanejamento" : "Saída Remanejamento";
      }
      
      return [formattedDate, formattedValue, type, entry.narrative, reconcileResult.comment, reconcileResult.project];
    });
    
    const matchedAccount = getAccounts.find((acc: any) =>
      acc.bank === "Banco do Brasil" &&
      acc.number.replace(/[^\d]/g, "") === rawAccount.replace(/[^\d]/g, "") &&
      acc.type === "Conta Corrente" &&
      acc.input_file_type === "csv"
    ) || {
      number: rawAccount, sheet: "desconhecido"
    };
    
    result = { account: matchedAccount.number, statements, fileContent, month: monthStr, year: yearStr, matchedAccount };
  }
  
  return result;
}

async function processExtratoTxt(fileUrl: string) {
  const response = await axiosInstance.get(fileUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);
  const fileContent = decodeTextFile(buffer);
  const lines = fileContent.split(/\r?\n/);
  
  let accountRaw = "";
  let reference = "";
  
  for (const line of lines) {
    if (line.trim().startsWith("Conta:")) {
      accountRaw = line.split("Conta:")[1].trim().split(/\s+/)[0];
    }
    if (line.includes("Mês/ano referência:")) {
      reference = line.split("Mês/ano referência:")[1].trim();
    }
  }
  
  const [refMonthName, refYear] = reference.split("/");
  const meses: { [key: string]: string } = {
    JANEIRO: "01", FEVEREIRO: "02", MARÇO: "03", ABRIL: "04", MAIO: "05", JUNHO: "06",
    JULHO: "07", AGOSTO: "08", SETEMBRO: "09", OUTUBRO: "10", NOVEMBRO: "11", DEZEMBRO: "12"
  };
  const refMonth = meses[refMonthName.toUpperCase()] || "00";
  
  const summary: string[] = [];
  const resumoIndex = lines.findIndex(line => line.toUpperCase().includes("RESUMO DO MÊS"));
  if (resumoIndex !== -1) {
    for (let i = resumoIndex + 1; i < lines.length && summary.length < 6; i++) {
      const match = lines[i].match(/([\d\.,]+)$/);
      if (match) summary.push(match[1]);
    }
  }
  
  const matchedAccount = getAccounts.find((acc: any) => 
    acc.type === "Fundo de Investimento - Conta" && 
    acc.number.replace(/[^\d]/g, "") === accountRaw.replace(/[^\d]/g, "")
  ) || { number: accountRaw, sheet: "desconhecido", fulltext: "desconhecido" };
  
  return { account: matchedAccount.number, summary, reference, fileContent, month: refMonth, year: refYear, matchedAccount };
}

function generateExtratoFilename(account: any, month: string, year: string, extension: string): string {
  return `Extrato - ${year}.${month} - ${account.fulltext || account.number}.${extension}`;
}

// Funções exportadas para uso direto
export async function processExtratoCallback(ctx: any, fileId: string, sourceFileName?: string) {
  console.log("[processar_extrato] Processamento direto");
  
  try {
    await ctx.reply("🔄 Processando extrato...");
    
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const file = await ctx.telegram.getFile(fileId);
    
    const isCSV = file.file_path?.includes('.csv');
    const isTXT = file.file_path?.includes('.txt');
    
    if (!isCSV && !isTXT) {
      return ctx.reply("❌ Arquivo deve ser CSV ou TXT.");
    }
    
    if (isCSV) {
      const result = await processExtratoCsv(fileLink.href, sourceFileName || file.file_path || "");
      
      const filename = generateExtratoFilename(result.matchedAccount, result.month, result.year, "csv");
      const uploadedFileLink = await uploadCSVToDrive(result.fileContent, filename, projectsSpreadsheet.statementsFolder);
      
      const monthName = getMonthNamePortuguese(parseInt(result.month));
      const summaryRow = ["MÊS", monthName, result.year, uploadedFileLink];
      
      await appendExtratoRow(projectsSpreadsheet.id, result.matchedAccount.sheet, summaryRow);
      
      if (result.statements?.length > 0) {
        await appendExtratoData(projectsSpreadsheet.id, result.matchedAccount.sheet, result.statements);
      }
      
      const identifiedCount = result.statements.filter((stmt: any) => stmt[4] && stmt[4] !== "" && !stmt[4].startsWith("❓")).length;
      const totalCount = result.statements.length;
      const accountingSheetUrl = getAccountingSheetUrl(result.matchedAccount.sheet);
      
      await ctx.reply(
        `✅ Extrato CC processado!\n\nConta: ${result.matchedAccount.number}\n✅ ${identifiedCount}/${totalCount} identificados`,
        accountingSheetUrl
          ? Markup.inlineKeyboard([
              [Markup.button.url("📊 Acompanhamento de gastos", accountingSheetUrl)],
            ])
          : undefined
      );
    } else {
      const result = await processExtratoTxt(fileLink.href);
      
      const filename = generateExtratoFilename(result.matchedAccount, result.month, result.year, "txt");
      const uploadedFileLink = await uploadCSVToDrive(result.fileContent, filename, projectsSpreadsheet.statementsFolder);
      
      const summaryRow = [
        result.reference,
        ...result.summary,
        '=INDIRECT("R[0]C[-3]";FALSE) - INDIRECT("R[0]C[-2]";FALSE) - INDIRECT("R[0]C[-1]";FALSE)',
        '=SUM(INDIRECT("R[0]C[-7]";FALSE);INDIRECT("R[0]C[-6]";FALSE);-INDIRECT("R[0]C[-5]";FALSE);INDIRECT("R[0]C[-4]";FALSE);-INDIRECT("R[0]C[-3]";FALSE);-INDIRECT("R[0]C[-2]";FALSE))',
        uploadedFileLink,
      ];
      
      await appendExtratoRow(projectsSpreadsheet.id, result.matchedAccount.sheet, summaryRow);
      
      await ctx.reply(`✅ Extrato FI processado!\n\nConta: ${result.matchedAccount.number}`);
    }
  } catch (error) {
    console.error("[processar_extrato] Erro:", error);
    await ctx.reply("❌ Erro ao processar extrato.");
  }
}

export async function processPdfInteligenteCallback(ctx: any, fileId: string) {
  console.log("[processar_pdf_inteligente] Processamento direto");
  
  try {
    await ctx.reply("🔄 Analisando PDF...");
    
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    const fileBuffer = await response.arrayBuffer();
    
    const buffer = Buffer.from(fileBuffer);
    const data = await pdfParse(buffer);
    const { conta, mesAno, accountType } = extractInfoFromPDF(data.text);
    
    // Se conseguiu extrair tudo, arquiva automaticamente
    if (conta && mesAno) {
      await ctx.reply("🔄 Dados detectados! Arquivando automaticamente...");
      
      const folderId = getFolderIdForAccount(conta, accountType);
      if (!folderId) {
        return ctx.reply(`❌ Pasta não configurada para conta ${conta}.`);
      }
      
      const fileName = formatFileName(mesAno, accountType, conta);
      const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
      
      if (!uploadResponse) {
        return ctx.reply("❌ Erro no upload.");
      }
      
      const tipoConta = getAccountTypeLabel(accountType);
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url("📄 Ver Extrato", uploadResponse)],
        [Markup.button.url("📁 Pasta", `https://drive.google.com/drive/folders/${folderId}`)],
      ]);
      
      return ctx.reply(
        `✅ Extrato arquivado automaticamente!\n\n📝 ${fileName}\n📊 ${tipoConta}\n🏦 ${conta}`,
        keyboard
      );
    }
    
    // Se não conseguiu extrair, mostra opções de mês/tipo
    const now = new Date();
    const months = [];
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
      const year = date.getFullYear();
      const monthYear = `${monthName}/${year}`;
      months.push({ monthYear, month: date.getMonth() + 1, year });
    }
    
    const keyboard = Markup.inlineKeyboard([
      ...months.map(m => [
        Markup.button.callback(`${m.monthYear} - FI`, `pdf_manual_${fileId}_${m.month}_${m.year}_fi`),
        Markup.button.callback(`${m.monthYear} - CC`, `pdf_manual_${fileId}_${m.month}_${m.year}_cc`),
        Markup.button.callback(`${m.monthYear} - CD`, `pdf_manual_${fileId}_${m.month}_${m.year}_cd`)
      ]),
      [Markup.button.callback("❌ Cancelar", "ajudante_cancel")]
    ]);
    
    await ctx.reply(
      `⚠️ *Não foi possível detectar automaticamente*\n\n` +
      `Conta detectada: ${conta || 'Não identificada'}\n` +
      `Mês/Ano detectado: ${mesAno || 'Não identificado'}\n\n` +
      `Escolha o mês e tipo de conta:\n\n` +
      `• *FI* = Fundo de Investimento\n` +
      `• *CC* = Conta Corrente\n` +
      `• *CD* = Conta Crédito`,
      { ...keyboard, parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("[processar_pdf_inteligente] Erro:", error);
    await ctx.reply("❌ Erro ao processar PDF.");
  }
}
