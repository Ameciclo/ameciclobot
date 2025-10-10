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
import axiosInstance from "../config/httpService";
import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
// @ts-ignore
import pdfParse from "pdf-parse";
import { reconcileExtract, ExtractEntry } from "../services/reconciliation";

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
  bot.action("arquivar_comprovante", async (ctx) => {
    console.log("[arquivar_comprovante] Callback acionado");
    console.log("[arquivar_comprovante] ctx.callbackQuery.data:", 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'N/A');
    await ctx.answerCbQuery();
    const { id, fileId } = extractDataFromMessage(ctx);
    console.log("[arquivar_comprovante] Dados extraídos - ID:", id, "FileID:", fileId);
    
    if (!id || !fileId) {
      return ctx.editMessageText("❌ Dados não encontrados na mensagem.");
    }
    
    try {
      await ctx.editMessageText("🔄 Arquivando comprovante...");
      
      const requestData = await getRequestData(id);
      if (!requestData) {
        return ctx.editMessageText(`❌ Solicitação ${id} não encontrada.`);
      }
      
      if (requestData.status !== "confirmed") {
        return ctx.editMessageText("❌ Pagamento não confirmado.");
      }
      
      const folderId = requestData.project.folder_id;
      if (!folderId) {
        return ctx.editMessageText(`Projeto ${requestData.project.name} sem pasta configurada.`);
      }
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const fileBuffer = await response.arrayBuffer();
      
      const date = formatDate(new Date());
      const fileName = `${date} - ${requestData.project.name} - ${requestData.value} - ${requestData.supplier.nickname} - ${requestData.description.replace(/[\\/:*?"<>|]/g, "_").substring(0, 50)}`;
      
      const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
      if (!uploadResponse) {
        return ctx.editMessageText("❌ Erro no upload.");
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
      console.error("[arquivar_comprovante] Stack:", error instanceof Error ? error.stack : 'N/A');
      await ctx.editMessageText("❌ Erro ao arquivar comprovante.");
    }
    return;
  });

  // Callback para recibo de ressarcimento
  bot.action("recibo_ressarcimento", async (ctx) => {
    console.log("[recibo_ressarcimento] Callback acionado");
    console.log("[recibo_ressarcimento] ctx.callbackQuery.data:", 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'N/A');
    await ctx.answerCbQuery();
    const { id, fileId } = extractDataFromMessage(ctx);
    console.log("[recibo_ressarcimento] Dados extraídos - ID:", id, "FileID:", fileId);
    
    if (!id || !fileId) {
      return ctx.editMessageText("❌ Dados não encontrados na mensagem.");
    }
    
    try {
      await ctx.editMessageText("🔄 Gerando recibo...");
      
      const requestData = await getRequestData(id);
      if (!requestData) {
        return ctx.editMessageText(`❌ Transação ${id} não encontrada.`);
      }
      
      if (!requestData.isRefund) {
        return ctx.editMessageText("❌ Não é ressarcimento.");
      }
      
      const refundSupplier = typeof requestData.refundSupplier === 'string' ? null : requestData.refundSupplier;
      if (!refundSupplier?.name) {
        return ctx.editMessageText("❌ Dados do beneficiário não encontrados.");
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
      console.error("[recibo_ressarcimento] Stack:", error instanceof Error ? error.stack : 'N/A');
      await ctx.editMessageText("❌ Erro ao gerar recibo.");
    }
    return;
  });

  // Callback para arquivar extrato PDF
  bot.action("arquivar_extrato", async (ctx) => {
    console.log("[arquivar_extrato] Callback acionado");
    console.log("[arquivar_extrato] ctx.callbackQuery.data:", 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'N/A');
    await ctx.answerCbQuery();
    const { fileId } = extractDataFromMessage(ctx);
    console.log("[arquivar_extrato] FileID extraído:", fileId);
    
    if (!fileId) {
      return ctx.editMessageText("❌ File ID não encontrado.");
    }
    
    try {
      await ctx.editMessageText("🔄 Processando PDF...");
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const response = await fetch(fileLink.href);
      const fileBuffer = await response.arrayBuffer();
      
      const buffer = Buffer.from(fileBuffer);
      const data = await pdfParse(buffer);
      const { conta, mesAno, isFund } = extractInfoFromPDF(data.text);
      
      if (!conta || !mesAno) {
        return ctx.editMessageText("❌ Não foi possível identificar conta/mês.");
      }
      
      const folderId = getFolderIdForAccount(conta, isFund);
      if (!folderId) {
        return ctx.editMessageText(`❌ Pasta não configurada para conta ${conta}.`);
      }
      
      const fileName = formatFileName(mesAno, isFund, conta);
      const uploadResponse = await uploadInvoice(fileBuffer as Buffer, fileName, folderId);
      
      if (!uploadResponse) {
        return ctx.editMessageText("❌ Erro no upload.");
      }
      
      const tipoConta = isFund ? "Fundo de Investimento" : "Conta Corrente";
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.url("📄 Ver Extrato", uploadResponse)],
        [Markup.button.url("📁 Pasta", `https://drive.google.com/drive/folders/${folderId}`)],
      ]);
      
      await ctx.editMessageText(
        `✅ Extrato arquivado!\n\n📝 ${fileName}\n📊 ${tipoConta}\n🏦 ${conta}`,
        keyboard
      );
    } catch (error) {
      console.error("[arquivar_extrato] Erro:", error);
      console.error("[arquivar_extrato] Stack:", error instanceof Error ? error.stack : 'N/A');
      await ctx.editMessageText("❌ Erro ao processar PDF.");
    }
    return;
  });

  // Callback para processar extrato
  bot.action("processar_extrato", async (ctx) => {
    console.log("[processar_extrato] Callback acionado");
    console.log("[processar_extrato] ctx.callbackQuery.data:", 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : 'N/A');
    await ctx.answerCbQuery();
    const { fileId } = extractDataFromMessage(ctx);
    console.log("[processar_extrato] FileID extraído:", fileId);
    
    if (!fileId) {
      return ctx.editMessageText("❌ File ID não encontrado.");
    }
    
    try {
      await ctx.editMessageText("🔄 Processando extrato...");
      
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const file = await ctx.telegram.getFile(fileId);
      
      const isCSV = file.file_path?.includes('.csv');
      const isTXT = file.file_path?.includes('.txt');
      
      if (!isCSV && !isTXT) {
        return ctx.editMessageText("❌ Arquivo deve ser CSV ou TXT.");
      }
      
      if (isCSV) {
        const result = await processExtratoCsv(fileLink.href);
        
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
      console.error("[processar_extrato] Stack:", error instanceof Error ? error.stack : 'N/A');
      await ctx.editMessageText("❌ Erro ao processar extrato.");
    }
    return;
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

  // Callback para cancelar
  bot.action("ajudante_cancel", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("❌ Operação cancelada.", { parse_mode: "Markdown" });
  });
}

// Funções auxiliares dos comandos originais
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
  const value = requestData.value;
  const description = requestData.description || 'DESCRIÇÃO_DO_RESSARCIMENTO';
  const projectName = requestData.project.name || 'NOME_DO_PROJETO';
  
  const reciboText = `Eu, ${supplierName}, declaro que recebi da Ameciclo a quantia de ${value}, referente ao ressarcimento de ${description} para o projeto ${projectName}.`;
  
  page.drawText(reciboText, {
    x: 50,
    y: height - 150,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
    maxWidth: width - 100,
  });
  
  return await pdfDoc.save();
}

function extractInfoFromPDF(text: string): { conta: string | null; mesAno: string | null; isFund: boolean } {
  const norm = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ");
  
  let conta = null;
  const contaMatch = norm.match(/Conta\s+([0-9.-]{5,})(?=[^\d-]|$)/i);
  if (contaMatch) conta = contaMatch[1];
  
  let mesAno = null;
  const mesAnoMatch = norm.match(/m[eê]s\/?ano\s+refer[eê]ncia\s*[:\-]?\s*([A-ZÇÃ]+\/\d{4}|\d{2}\/\d{4})/i);
  if (mesAnoMatch) mesAno = mesAnoMatch[1];
  
  const isFund = /extratos?\s*-\s*investimentos?\s+fundos?/i.test(norm);
  
  return { conta, mesAno, isFund };
}

function formatFileName(mesAno: string, isFund: boolean, conta: string): string {
  const [mesNome, ano] = mesAno.split("/");
  const tipoConta = isFund ? "Fundo de Investimento" : "Conta Corrente";
  return `Extrato - ${ano}.${mesNome} - ${tipoConta} ${conta}.pdf`;
}

function getFolderIdForAccount(conta: string, isFund: boolean): string | null {
  const tipoExtrato = isFund ? "Fundo de Investimento - Conta" : "Conta Corrente";
  const matchedAccount = getAccounts.find((acc: any) => 
    acc.number === conta && acc.type === tipoExtrato && acc.input_file_type === "pdf"
  );
  return matchedAccount?.folder_id || null;
}

async function processExtratoCsv(fileUrl: string) {
  const response = await axiosInstance.get(fileUrl, { responseType: "arraybuffer" });
  const fileBuffer = Buffer.from(response.data);
  const fileContent = iconv.decode(fileBuffer, "latin1");
  const csvData = parse(fileContent, { delimiter: ";", trim: true });
  
  const confirmedRequests = await getAllRequests();
  const requestsArray = Object.values(confirmedRequests).filter((request: any) => request.status === "confirmed") as PaymentRequest[];
  
  const extractEntries: ExtractEntry[] = [];
  for (let i = 1; i < csvData.length - 1; i++) {
    const row = csvData[i];
    if (row[9]?.includes("Saldo Anterior")) continue;
    
    const [day, month, year] = row[3].split(".");
    const postDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const amount = Math.abs(parseFloat(row[10].replace(",", ".")));
    const type = row[11] as "D" | "C";
    const narrative = `${row[8]} ${row[9]} ${row[12]}`.trim();
    
    extractEntries.push({ postDate, amount, type, narrative, originalData: row });
  }
  
  const { results } = reconcileExtract(extractEntries, requestsArray);
  
  const statements = extractEntries.map((entry, i) => {
    const result = results[i];
    const formattedDate = `${entry.postDate.getDate().toString().padStart(2, '0')}/${(entry.postDate.getMonth() + 1).toString().padStart(2, '0')}/${entry.postDate.getFullYear()}`;
    const formattedValue = `R$ ${entry.amount.toFixed(2).replace(".", ",")}`;
    const type = entry.type === "C" ? "Entrada" : "Saída";
    
    return [formattedDate, formattedValue, type, entry.narrative, result.comment, result.project];
  });
  
  const [, month, year] = csvData[1][3].split(".");
  const rawAccount = csvData[1][1].replace(/^0+/, "");
  const matchedAccount = getAccounts.find((acc: any) => acc.number.replace(/[^\d]/g, "") === rawAccount.replace(/[^\d]/g, "")) || {
    number: rawAccount, sheet: "desconhecido"
  };
  
  return { account: matchedAccount.number, statements, fileContent, month, year, matchedAccount };
}

async function processExtratoTxt(fileUrl: string) {
  const response = await axiosInstance.get(fileUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data);
  const fileContent = iconv.decode(buffer, "latin1");
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
