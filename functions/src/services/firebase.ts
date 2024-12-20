import * as admin from "firebase-admin";

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
  return new Promise((resolve, reject) => {
    admin
      .database()
      .ref(`requests/${requestId}`)
      .update(update)
      .then((snapshot) => {
        return resolve(snapshot);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
