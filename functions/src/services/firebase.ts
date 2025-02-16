import { admin } from "../config/firebaseInit";
import {
  AmecicloUser,
  PaymentRequest,
  TelegramUserInfo,
} from "../config/types";

export async function getCoordinators() {
  // Busca todos os usuários no endpoint "subscribers"
  const snapshot = await admin.database().ref("subscribers").once("value");
  const data = snapshot.val() || {};

  // Filtra apenas os que possuem role: "AMECICLO_COORDINATORS"
  const coordinatorEntries = Object.values(data).filter(function (entry: any) {
    return entry.role === "AMECICLO_COORDINATORS";
  }) as AmecicloUser[];
  return coordinatorEntries;
}

export async function getFinancesGroupId(): Promise<string> {
  try {
    const snapshot = await admin.database().ref("/workgroups/").once("value");
    const data = snapshot.val() || {};
    const group = process.env.DEV_MODE ? "DEVTEST" : "Financeiro";
    return data[group];
  } catch (err) {
    console.error("Erro ao buscar ID do grupo financeiro:", err);
    return "";
  }
}

export var updatePaymentRequest = async function (
  requestId: string,
  update: Object
) {
  console.log("updatePaymentRequest: ", requestId);
  return new Promise(function (resolve, reject) {
    admin
      .database()
      .ref(`requests/${requestId}`)
      .update(update)
      .then(function (snapshot) {
        return resolve(snapshot);
      })
      .catch(function (err) {
        reject(err);
      });
  });
};

export async function updatePaymentRequestGroupMessage(
  request: PaymentRequest,
  groupMessage: number
) {
  // Armazena o ID da mensagem no Firebase
  await admin.database().ref(`requests/${request.id}`).update({
    group_message_id: groupMessage,
  });

  console.log(
    `Payment-request sent successfully: ${JSON.stringify(groupMessage)}`
  );
}

export async function updatCalendarEvent(event: any, createdEvent: any) {
  await admin.database().ref(`calendar/${event.params.eventId}`).update({
    googleEventId: createdEvent.id,
    googleHtmlLink: createdEvent.htmlLink,
  });

  console.log(
    `Payment-request sent successfully: ${JSON.stringify(createdEvent)}`
  );
}

export async function updateCalendarEventGroupMessage(
  eventId: string,
  groupMessageId: number
) {
  // Armazena o ID da mensagem no nó do calendar/eventId
  await admin.database().ref(`calendar/${eventId}`).update({
    group_message_id: groupMessageId,
  });

  console.log(
    `Calendar event group message ID updated for event ${eventId}: ${groupMessageId}`
  );
}

// Exemplo de função para buscar dados de um evento específico
export async function getCalendarEventData(eventId: string) {
  const snapshot = await admin
    .database()
    .ref(`calendar/${eventId}`)
    .once("value");
  return snapshot.val();
}

// Exemplo de função para atualizar dados de um evento
export async function updateCalendarEventData(eventId: string, update: any) {
  await admin.database().ref(`calendar/${eventId}`).update(update);
  console.log(`Calendar event updated for event ${eventId}:`, update);
}

// Buscar dados de uma solicitação pelo `requestId`
export async function getRequestData(requestId: string): Promise<any> {
  try {
    const snapshot = await admin
      .database()
      .ref(`/requests/${requestId}`)
      .once("value");
    console.log("snapshot.exists():", snapshot.exists());
    console.log("snapshot.val():", snapshot.val());
    return snapshot.val() || null;
  } catch (err) {
    console.error(`Erro ao buscar dados da solicitação ${requestId}:`, err);
    throw err;
  }
}

// Buscar dados dos assinantes (subscribers)
export async function getSubscribers(): Promise<any[]> {
  console.log(`GETREQUESTDATA: subscribers`);
  try {
    const snapshot = await admin.database().ref("subscribers").once("value");
    return snapshot.val() || [];
  } catch (err) {
    console.error("Erro ao buscar assinantes:", err);
    throw err;
  }
}

export async function saveProtocolRecord(
  protocol: string,
  password: string,
  from: TelegramUserInfo,
  group: number
): Promise<boolean> {
  try {
    const protocolData = {
      protocol,
      password,
      from: from,
      group: group,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      date: new Date().toLocaleString(),
    };

    // Create a new reference with push() to generate unique ID
    const newProtocolRef = admin.database().ref("information_requests").push();
    await newProtocolRef.set(protocolData);

    return true;
  } catch (error) {
    console.error("Error saving protocol:", error);
    return false;
  }
}

// Optional: Function to get all protocols
export async function getProtocolRecords(): Promise<any[]> {
  try {
    const snapshot = await admin
      .database()
      .ref("information_requests")
      .once("value");
    return snapshot.val() ? Object.values(snapshot.val()) : [];
  } catch (error) {
    console.error("Error fetching protocols:", error);
    return [];
  }
}
