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

// Inicializa o cliente do Google Sheets
function getSheetsClient() {
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
