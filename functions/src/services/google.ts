import { google } from "googleapis";
import google_keys from "../credentials/google.json";
import credentials from "../credentials/firebaseServiceKey.json";
import { toDays } from "../utils/utils";
import { updatePaymentRequest } from "./firebase";

const api_key = google_keys.api_key;
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
  row: string[]
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
  description = "",
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

// Criar um documento no Google Docs
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

export async function updateSpreadsheet(
  spreadsheetId: any,
  request: {
    budgetItem: any;
    recipientInformation: { name: string };
    description: any;
    value: any;
    id: any;
  }
) {
  var range = "DETALHAMENTO DAS DESPESAS!A1:M";
  const date = toDays();

  var row = [
    date,
    request.budgetItem,
    "",
    request.recipientInformation.name.toUpperCase(),
    request.description,
    "1",
    "unidade",
    request.value,
    request.value,
    "⚠️PREENCHER",
    "⚠️PREENCHER",
    date,
  ];
  const rowRange = await appendSheetRowAsPromise(
    spreadsheetId,
    range,
    row
  );
  const rowLink = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=137441560&range=${
    rowRange.split("!")[1]
  }`;

  await updatePaymentRequest(request.id, {
    spreadsheetRange: rowRange,
    confirmed: true,
    rowLink: rowLink,
  });
  return rowLink;
}
