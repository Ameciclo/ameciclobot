// google.ts service
// Serviços para interação com as APIs do Google: Drive, Sheets, Calendar, Docs, Slides e Forms.

import { google } from "googleapis";
import google_keys from "../credentials/google.json";
import firebaseCredentials from "../credentials/firebaseServiceKey.json";
import { toDays } from "../utils/utils";
import { updatePaymentRequest } from "./firebase";
import { CalendarConfig, PaymentRequest } from "../config/types";
import calendars from "../credentials/calendars.json";
import projectsSpreadsheet from "../credentials/projectsSpreadsheet.json";

const api_key = google_keys.api_key;
const credentials = firebaseCredentials;

// ------------------------------------------------------
// Autenticação
// ------------------------------------------------------
export function getJwt() {
  return new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive",
    ]
  );
}

// Reutilizamos o mesmo JWT para todas as chamadas.
const auth = getJwt();

// ------------------------------------------------------
// CLIENTES DAS APIS – Sheets, Drive, Calendar, etc.
// ------------------------------------------------------
export function getSheetsClient() {
  return google.sheets({ version: "v4", auth });
}

// ------------------------------------------------------
// Google Drive Functions
// ------------------------------------------------------

import { Readable } from "stream";

function bufferToStream(buffer: Buffer | ArrayBuffer): Readable {
  if (buffer instanceof ArrayBuffer) {
    // Converte ArrayBuffer para Buffer
    const uint8Array = new Uint8Array(buffer);
    return Readable.from(Buffer.from(uint8Array));
  }
  return Readable.from(buffer);
}

export async function uploadInvoice(
  fileBuffer: Buffer | ArrayBuffer,
  fileName: string,
  folderId: string
): Promise<string | null | undefined> {
  const drive = google.drive({ version: "v3", auth });

  try {
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: bufferToStream(fileBuffer),
      },
      fields: "id,webViewLink",
    });

    return uploadResponse.data.webViewLink;
  } catch (error) {
    console.error("Erro ao fazer upload do arquivo:", error);
    throw error;
  }
}

export async function uploadCSVToDrive(
  fileContent: string,
  fileName: string,
  folderId: string
): Promise<string> {
  try {
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: "text/csv",
      },
      media: {
        mimeType: "text/csv",
        body: fileContent,
      },
      fields: "id, webViewLink",
    });
    console.log("[uploadCSVToDrive] Arquivo enviado.");
    // Retorna o link para visualização (webViewLink)
    return response.data.webViewLink || "";
  } catch (error) {
    console.error("Erro ao enviar CSV para o Drive:", error);
    throw error;
  }
}

export async function listModelsFromFolder(
  folderId: string
): Promise<{ id: string; name: string }[]> {
  const drive = google.drive({ version: "v3", auth });
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.google-apps.form')`,
      fields: "files(id, name)",
    });
    const files = res.data.files || [];
    return files.map((file) => ({
      id: file.id!,
      name: file.name || "",
    }));
  } catch (error) {
    console.error("Erro ao listar modelos:", error);
    throw error;
  }
}

export async function getFileMetadata(
  fileId: string
): Promise<{ name: string }> {
  const drive = google.drive({ version: "v3", auth });
  try {
    const res = await drive.files.get({
      fileId,
      fields: "name",
    });
    return { name: res.data.name || "" };
  } catch (error) {
    console.error("Erro ao obter metadados do arquivo:", error);
    throw error;
  }
}

export async function copyFile(
  templateId: string,
  newTitle: string
): Promise<any> {
  const drive = google.drive({ version: "v3", auth });
  try {
    const res = await drive.files.copy({
      fileId: templateId,
      requestBody: { name: newTitle },
      fields: "id",
    });
    return res.data;
  } catch (error) {
    console.error("Erro ao copiar arquivo:", error);
    throw error;
  }
}

export async function moveDocumentToFolder(
  documentId: string,
  folderId: string
): Promise<any> {
  const drive = google.drive({ version: "v3", auth });
  try {
    // Obter os pais atuais do arquivo (normalmente "Meu Drive")
    const file = await drive.files.get({
      fileId: documentId,
      fields: "parents",
    });
    const previousParents = file.data.parents?.join(",") || "";
    // Atualiza os pais: adiciona a nova pasta e remove as anteriores
    const response = await drive.files.update({
      fileId: documentId,
      addParents: folderId,
      removeParents: previousParents,
      fields: "id, parents",
    });
    console.log("Documento movido para a pasta:", folderId);
    return response.data;
  } catch (error) {
    console.error("Erro ao mover documento:", error);
    throw error;
  }
}

// Cria uma nova planilha
export async function createSheet(title: string): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth });
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    console.log("Planilha criada.");
    return response.data;
  } catch (error) {
    console.error("Erro ao criar planilha:", error);
    throw error;
  }
}

// ------------------------------------------------------
// Google Sheets Functions
// ------------------------------------------------------

// Faz o append de uma linha na planilha informada (projectsSpreadsheet.id)
// A aba é indicada pelo campo "sheet" do account (matchedAccount)
export async function appendExtratoRow(
  spreadsheetId: string,
  sheetName: string,
  rowValues: any[]
): Promise<void> {
  try {
    const range = `${sheetName}!A:D`;
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowValues] },
    });
    console.log("[appendExtratoRow] Linha adicionada.");
  } catch (error) {
    console.error("Erro ao fazer append na planilha:", error);
    throw error;
  }
}

export async function appendExtratoData(
  spreadsheetId: string,
  sheetName: string,
  data: any[][]
): Promise<void> {
  const sheets = getSheetsClient();
  // Define o range onde os dados serão inseridos; "A:Z" supõe que os dados caibam entre as colunas A e Z.
  const range = `${sheetName}!A:Z`;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: data },
    });
    console.log("appendExtratoData - Dados detalhados adicionados.");
  } catch (error) {
    console.error("Erro ao fazer append dos dados detalhados:", error);
    throw error;
  }
}

// Retorna os dados da aba "RESUMO" de uma planilha informada
export async function getSummaryData(spreadsheetId: string): Promise<any[][]> {
  const sheets = getSheetsClient();
  const range = projectsSpreadsheet.summarySheet;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return res.data.values || [];
  } catch (error) {
    console.error("Erro ao obter dados do resumo:", error);
    throw error;
  }
}

// Obtém os itens de orçamento do projeto a partir da aba "ORÇAMENTO E DESPESAS"
export async function getProjectBudgetItems(
  spreadsheetId: string
): Promise<string[]> {
  const sheets = getSheetsClient();
  const range = projectsSpreadsheet.budgetsSheet;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const data = res.data.values || [];
    const budgetItems: string[] = [];
    // Ignora o cabeçalho (primeira linha)
    for (let i = 1; i < data.length; i++) {
      const cell = data[i][0];
      if (cell && cell !== cell.toUpperCase()) {
        budgetItems.push(cell);
      }
    }
    return budgetItems;
  } catch (error) {
    console.error("Erro ao obter itens de orçamento:", error);
    return [];
  }
}

export async function getProjectDetailsPendencias(
  spreadsheetId: string
): Promise<number> {
  try {
    const sheets = getSheetsClient();
    const detailsRange = projectsSpreadsheet.detailsSheet; // ex: "DETALHAMENTO DAS DESPESAS!A:Z"
    const detailsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: detailsRange,
    });
    const detailsData = detailsRes.data.values || [];
    let countMissing = 0;
    // Considera que a primeira linha é cabeçalho
    for (let i = 1; i < detailsData.length; i++) {
      const rowDetails = detailsData[i];
      const cell = rowDetails[10]; // coluna K (índice 10)
      if (!cell || !cell.toString().startsWith("http")) {
        countMissing++;
      }
    }
    return countMissing;
  } catch (err) {
    console.error(`[getProjectDetailsPendencias] Erro:`, err);
    throw err;
  }
}

// Extrai o ID de uma planilha a partir de uma URL
export function getIdFromUrl(url: string): string {
  if (url) {
    const match = url.match(/[-\w]{15,}/);
    return match ? match[0] : "";
  }
  return "";
}

export async function getSheetDetails(
  sheetId: string,
  tabName: string
): Promise<{ name: string; responsesTabGid: string; rowCount: number }> {
  const sheets = getSheetsClient();
  // Obtém título da planilha e lista de abas
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "properties.title,sheets(properties(sheetId,title))",
  });
  const overallTitle = spreadsheet.data.properties?.title || "Sem nome";
  let responsesTabGid = "";
  const sheetsList = spreadsheet.data.sheets;
  if (!sheetsList) {
    throw new Error("Nenhuma aba encontrada na planilha.");
  }
  // Procura a aba com o título informado
  for (const sheet of sheetsList) {
    const properties = sheet.properties;
    if (properties && properties.title === tabName) {
      responsesTabGid = String(properties.sheetId);
      break;
    }
  }
  if (!responsesTabGid) {
    throw new Error(`A aba "${tabName}" não foi encontrada na planilha.`);
  }
  // Conta o número de linhas preenchidas
  const range = `${tabName}!A:A`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  const rowCount = res.data.values ? res.data.values.length : 1;
  return { name: overallTitle, responsesTabGid, rowCount };
}

export async function appendSheetRowAsPromise(
  spreadsheetId: string,
  range: string,
  row: any[]
): Promise<string> {
  const sheets = getSheetsClient();
  try {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      key: api_key,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    const updatedRange = result.data.updates?.updatedRange || "";
    // console.log( "Linha adicionada com sucesso:", updatedRange );
    return updatedRange;
  } catch (error) {
    console.error("Erro ao adicionar linha na planilha:", error);
    console.error(
      "Detalhes do erro:",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );
    return "";
  }
}

export async function updateSpreadsheetCell(
  spreadsheetId: string,
  range: string,
  value: string
): Promise<void> {
  const sheets = getSheetsClient();
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[value]],
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar célula da planilha:", error);
    throw error;
  }
}

export async function findRowByRequestId(
  spreadsheetId: string,
  requestId: string
): Promise<number | null> {
  const sheets = getSheetsClient();
  const range = "DETALHAMENTO DAS DESPESAS!K:K";
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    const data = res.data.values || [];
    for (let i = 0; i < data.length; i++) {
      const cell = data[i][0];
      if (cell && cell.includes(requestId)) {
        return i + 1; // +1 porque as linhas começam em 1
      }
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar linha por ID:", error);
    return null;
  }
}

export async function updateSpreadsheet(request: PaymentRequest) {
  const range = "DETALHAMENTO DAS DESPESAS!A1:M";
  const date = toDays();
  let comments = "";
  if (request.transactionType === "Registrar Caixa Físico") {
    comments += `CAIXA FÍSICO ${request.project.account}\n`;
  }
  if (
    request.isRefund &&
    request.refundSupplier &&
    typeof request.refundSupplier !== "string"
  ) {
    comments += `REEMBOLSO À ${request.refundSupplier.nickname} (${request.refundSupplier.name})`;
  }
  const row = [
    request.paymentDate,
    request.budgetItem,
    "",
    request.supplier.name,
    request.description,
    "1",
    "unidade",
    request.value,
    request.value,
    "⚠️PREENCHER",
    `📂 ID da Solicitação: ${request.id}`,
    date,
    comments,
  ];
  const rowRange = await appendSheetRowAsPromise(
    request.project.spreadsheet_id!,
    range,
    row
  );
  const rowLink = `https://docs.google.com/spreadsheets/d/${request.project
    .spreadsheet_id!}/edit#gid=137441560&range=${rowRange.split("!")[1]}`;
  await updatePaymentRequest(request.id, {
    spreadsheetRange: rowRange,
    confirmed: true,
    rowLink: rowLink,
  });
  return rowLink;
}

// ------------------------------------------------------
// Google Calendar Functions
// ------------------------------------------------------
export async function createEventWithMetadata(
  calendarId: string,
  name: string,
  startDate: string,
  endDate: string,
  location = "",
  description = "",
  workgroup?: number
): Promise<any> {
  const calendar = google.calendar({ version: "v3", auth });
  const eventResource: any = {
    summary: name,
    location,
    description,
    start: {
      dateTime: startDate,
      timeZone: "America/Recife",
    },
    end: {
      dateTime: endDate,
      timeZone: "America/Recife",
    },
  };
  if (workgroup !== undefined) {
    eventResource.extendedProperties = {
      private: {
        workgroup: workgroup.toString(),
      },
    };
  }

  const event = {
    calendarId,
    resource: eventResource,
  };
  try {
    const response = await calendar.events.insert(event);
    console.log("createEventWithMetadata Evento criado");
    return response.data;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    throw error;
  }
}

export async function createEvent(
  calendarId: string,
  name: string,
  startDate: string,
  endDate: string,
  location = "",
  description = ""
): Promise<any> {
  const calendar = google.calendar({ version: "v3", auth });
  const event = {
    calendarId,
    resource: {
      summary: name,
      location,
      description,
      start: {
        dateTime: startDate,
        timeZone: "America/Recife",
      },
      end: {
        dateTime: endDate,
        timeZone: "America/Recife",
      },
    },
  };
  try {
    const response = await calendar.events.insert(event);
    console.log("createEvent Evento criado:");
    return response.data;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    throw error;
  }
}

export async function getEventsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  const calendar = google.calendar({ version: "v3", auth });
  const calendarConfigs = calendars as CalendarConfig[];
  const calendarIds = calendarConfigs.map((calendar) => calendar.id);
  let events: any[] = [];
  for (const calendarId of calendarIds) {
    try {
      const res = await calendar.events.list({
        calendarId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        fields:
          "items(id,summary,location,start,end,htmlLink,extendedProperties)",
      });
      if (res.data.items) {
        events = events.concat(res.data.items);
      }
    } catch (error) {
      console.error(
        `Erro ao listar eventos do calendário ${calendarId}:`,
        error
      );
    }
  }
  return events;
}

// ------------------------------------------------------
// Google Docs Functions
// ------------------------------------------------------
export async function createDocument(title: string): Promise<any> {
  const docs = google.docs({ version: "v1", auth });
  try {
    const response = await docs.documents.create({
      requestBody: { title },
    });
    console.log("Documento criado:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar documento:", error);
    throw error;
  }
}

// ------------------------------------------------------
// Google Slides Functions
// ------------------------------------------------------
export async function createPresentation(title: string): Promise<any> {
  const slides = google.slides({ version: "v1", auth });
  try {
    const response = await slides.presentations.create({
      requestBody: { title },
    });
    console.log("Apresentação criada:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar apresentação:", error);
    throw error;
  }
}

// ------------------------------------------------------
// Google Forms Functions
// ------------------------------------------------------
export async function createForm(title: string): Promise<any> {
  const drive = google.drive({ version: "v3", auth });
  try {
    const fileMetadata = {
      name: title,
      mimeType: "application/vnd.google-apps.form",
    };
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    console.log("createForm Formulário criado:");
    return response.data;
  } catch (error) {
    console.error("Erro ao criar formulário:", error);
    throw error;
  }
}
