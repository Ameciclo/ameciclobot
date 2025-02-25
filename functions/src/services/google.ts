import { google } from "googleapis";
import google_keys from "../credentials/google.json";
import firebaseCredentials from "../credentials/firebaseServiceKey.json";
import google_keysDEV from "../credentials/dev/google.json";
import firebaseCredentialsDEV from "../credentials/dev/firebaseServiceKey.json";
import { toDays } from "../utils/utils";
import { updatePaymentRequest } from "./firebase";
import { PaymentRequest } from "../config/types";

const api_key = process.env.DEV_MODE
  ? google_keysDEV.api_key
  : google_keys.api_key;
const credentials = process.env.DEV_MODE
  ? firebaseCredentialsDEV
  : firebaseCredentials;
// Autenticação com o Google
function getJwt() {
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

export async function listModelsFromFolder(
  folderId: string
): Promise<{ id: string; name: string }[]> {
  const drive = google.drive({ version: "v3", auth: getJwt() });
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.google-apps.form')`,
      fields: "files(id, name)",
    });
    // Garante que name seja uma string (substituindo null por vazio)
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
  const drive = google.drive({ version: "v3", auth: getJwt() });
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
  const drive = google.drive({ version: "v3", auth: getJwt() });
  try {
    const res = await drive.files.copy({
      fileId: templateId,
      requestBody: { name: newTitle },
      fields: "id", // Apenas o id é retornado
    });
    return res.data;
  } catch (error) {
    console.error("Erro ao copiar arquivo:", error);
    throw error;
  }
}

export async function getSheetDetails(
  sheetId: string,
  tabName: string
): Promise<{ name: string; responsesTabGid: string; rowCount: number }> {
  const sheets = getSheetsClient();

  // Obter informações gerais da planilha (título e lista de abas)
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
  // Procura a aba com o título exato fornecido
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

  // Obter a quantidade de linhas preenchidas na aba "Respostas ao formulário 1"
  const range = `${tabName}!A:A`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });
  const rowCount = res.data.values ? res.data.values.length : 1;

  return { name: overallTitle, responsesTabGid, rowCount };
}

// Inicializa o cliente do Google Sheets
export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getJwt() });
}

// Adicionar uma linha em uma planilha
export async function appendSheetRowAsPromise(
  spreadsheetId: string,
  range: string,
  row: any[]
): Promise<string> {
  const sheets = getSheetsClient();

  try {
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: range,
      key: api_key,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });

    console.log(
      "Linha adicionada com sucesso:",
      result.data.updates?.updatedRange
    );
    return result.data.updates?.updatedRange || "";
  } catch (error) {
    console.error("Erro ao adicionar linha na planilha:", error);
    throw error;
  }
}

export async function createEventWithMetadata(
  calendarId: string,
  name: string,
  startDate: string,
  endDate: string,
  location = "",
  description = "",
  workgroup?: number
): Promise<any> {
  const calendar = google.calendar({ version: "v3", auth: getJwt() });

  // Cria o recurso do evento com propriedades básicas
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

  // Se workgroup for fornecido, adiciona extendedProperties
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
    console.log("Evento criado:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    throw error;
  }
}

// Criar um evento no Google Calendar
export async function createEvent(
  calendarId: string,
  name: string,
  startDate: string,
  endDate: string,
  location = "",
  description = ""
  //tag = ""
): Promise<any> {
  const calendar = google.calendar({ version: "v3", auth: getJwt() });

  const event = {
    calendarId,
    resource: {
      summary: name,
      location,
      description,
      //id: tag,
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
    console.log("Evento criado:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    throw error;
  }
}

export async function createDocument(title: string): Promise<any> {
  const docs = google.docs({ version: "v1", auth: getJwt() });

  const document = {
    requestBody: {
      title,
    },
  };

  try {
    const response = await docs.documents.create(document);
    console.log("Documento criado:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar documento:", error);
    throw error;
  }
}

// Cria uma nova planilha
export async function createSheet(title: string): Promise<any> {
  const sheets = google.sheets({ version: "v4", auth: getJwt() });
  try {
    const response = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    console.log("Planilha criada:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar planilha:", error);
    throw error;
  }
}

// Cria uma nova apresentação
export async function createPresentation(title: string): Promise<any> {
  const slides = google.slides({ version: "v1", auth: getJwt() });
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

// Cria um novo formulário usando a API do Drive
export async function createForm(title: string): Promise<any> {
  const drive = google.drive({ version: "v3", auth: getJwt() });
  try {
    const fileMetadata = {
      name: title,
      mimeType: "application/vnd.google-apps.form",
    };
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });
    console.log("Formulário criado:", response.data);
    return response.data;
  } catch (error) {
    console.error("Erro ao criar formulário:", error);
    throw error;
  }
}

export async function moveDocumentToFolder(
  documentId: string,
  folderId: string
): Promise<any> {
  const drive = google.drive({ version: "v3", auth: getJwt() });

  // Obtém os pais atuais do arquivo (normalmente "My Drive")
  const file = await drive.files.get({
    fileId: documentId,
    fields: "parents",
  });
  const previousParents = file.data.parents?.join(",") || "";

  // Atualiza os pais do arquivo, adicionando o novo e removendo os anteriores
  const response = await drive.files.update({
    fileId: documentId,
    addParents: folderId,
    removeParents: previousParents,
    fields: "id, parents",
  });
  console.log("Documento movido para a pasta:", folderId);
  return response.data;
}

export async function updateSpreadsheet(request: PaymentRequest) {
  var range = "DETALHAMENTO DAS DESPESAS!A1:M";
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
  var row = [
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
    "⚠️PREENCHER",
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

export async function getEventsForPeriod(
  startDate: Date,
  endDate: Date,
  workgroup?: string | number
): Promise<any[]> {
  const calendar = google.calendar({ version: "v3", auth: getJwt() });
  // Lista dos calendários que você deseja consultar.
  const calendarIds = [
    "ameciclo@gmail.com",
    "oj4bkgv1g6cmcbtsap4obgi9vc@group.calendar.google.com",
    "k0gbrljrh0e4l2v8cuc05nsljc@group.calendar.google.com",
    "an6nh96auj9n3jtj28qno1limg@group.calendar.google.com",
  ];

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

  // Se o parâmetro workgroup for fornecido, filtra os eventos
  if (workgroup !== undefined) {
    const workgroupStr = workgroup.toString();
    events = events.filter((ev) => {
      const props = ev.extendedProperties?.private;
      return props && props.workgroup === workgroupStr;
    });
  }

  return events;
}
