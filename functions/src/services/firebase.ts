import { admin } from "../index";

export async function getCoordinatorsId(): Promise<string[]> {
  try {
    const snapshot = await admin
      .database()
      .ref("/configuration/coordinators")
      .once("value");
    return snapshot.val() || [];
  } catch (err) {
    console.error("Erro ao buscar coordenadores:", err);
    return [];
  }
}

export async function getAllCoordinatorsIds() {
  // Busca todos os usuários no endpoint "subscribers"
  const snapshot = await admin.database().ref("subscribers").once("value");
  const data = snapshot.val() || {};

  // Filtra apenas os que possuem role: "AMECICLO_COORDINATORS"
  const coordinatorEntries = Object.values(data).filter(function (entry: any) {
    return entry.role === "AMECICLO_COORDINATORS";
  }) as any[];

  // Mapeia os coordenadores para obter {id, name}
  const coordinatorIds = coordinatorEntries.map(function (coord) {
    return {
      id: coord.telegram_user.id,
      name: coord.telegram_user.username || coord.telegram_user.first_name,
    };
  });
  return coordinatorIds;
}

export async function getFinancesGroupId(): Promise<string> {
  try {
    const snapshot = await admin
      .database()
      .ref("/configuration/financesgroup")
      .once("value");
    return snapshot.val() || "";
  } catch (err) {
    console.error("Erro ao buscar ID do grupo financeiro:", err);
    return "";
  }
}

export var updatePaymentRequest = async function (
  requestId: string,
  update: Object
) {
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
  requestId: string,
  groupMessage: number
) {
  // Armazena o ID da mensagem no Firebase
  await admin.database().ref(`requests/${requestId}`).update({
    group_message_id: groupMessage,
  });

  console.log(
    `Payment-request sent successfully: ${JSON.stringify(groupMessage)}`
  );
}

// Buscar dados de uma solicitação pelo `requestId`
export async function getRequestData(requestId: string): Promise<any> {
  try {
    const snapshot = await admin
      .database()
      .ref(`requests/${requestId}`)
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
  try {
    const snapshot = await admin.database().ref("subscribers").once("value");
    return snapshot.val() || [];
  } catch (err) {
    console.error("Erro ao buscar assinantes:", err);
    throw err;
  }
}
